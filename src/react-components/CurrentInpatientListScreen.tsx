import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

interface LookupItem {
  Id: number;
  Text: string;
}

interface NamedRef {
  Description?: string;
  [key: string]: any;
}

interface PersonRef {
  MRN?: string;
  Title?: NamedRef;
  FirstName?: string;
  LastName?: string;
  Age?: number | string;
  Gender?: NamedRef;
  [key: string]: any;
}

export interface CurrentInpatientEntity {
  Id: number;
  VisitIdentifier?: string;
  AdmissionDate?: string;
  Patient?: PersonRef;
  PatientId?: number;
  Doctor?: PersonRef;
  DoctorId?: number;
  WardMaster?: { WardName?: string };
  WardRoomMaster?: { RoomNo?: string };
  WardRoomBedMaster?: { BedNo?: string };
  WardId?: number;
  RoomId?: number;
  BedId?: number;
  Guarantor?: { GuarantorName?: string };
  GuarantorId?: number;
  ReferralName?: string;
  Department?: { DepartmentName?: string };
  DepartmentId?: number;
  NoOfDays?: number;
  DischargeorderstatusId?: number;
  PatientCertificate?: { CertificateStatus?: NamedRef };
  AdmissionStatusId?: number;
  [key: string]: any;
}

interface CurrentFilter {
  facilityid?: number;
  WardId?: number;
  WardTypeId?: number;
  DoctorId?: number;
  admissionstatusid?: number | string;
  GuarantorId?: number;
  patientnamemrn?: string;
  PatientNameMRN?: string;
  [key: string]: any;
}

interface Pager {
  totalItems?: number;
  currentPage?: number;
  pageSize?: number;
  startIndex?: number;
}

export interface CurrentInpatientListScreenProps {
  reactProps?: {
    items?: CurrentInpatientEntity[];
    lookup?: {
      Ward?: LookupItem[];
      Guarantor?: LookupItem[];
      Doctor?: LookupItem[];
      Department?: LookupItem[];
      [key: string]: any;
    };
    currentfilter?: CurrentFilter;
    context?: string;
    pager?: Pager;
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const CurrentInpatientListScreen: React.FC<CurrentInpatientListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && Array.isArray(reactProps.items) && reactProps.items.length >= 0 && reactProps.pager);

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<CurrentInpatientEntity[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [standaloneLookups, setStandaloneLookups] = useState<{
    Ward: LookupItem[];
    Guarantor: LookupItem[];
    Doctor: LookupItem[];
    Department: LookupItem[];
  }>({
    Ward: [],
    Guarantor: [],
    Doctor: [],
    Department: [],
  });

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.PatientNameMRN || reactProps?.currentfilter?.patientnamemrn || ''
  );
  const [selectedWard, setSelectedWard] = useState<number | string>(
    reactProps?.currentfilter?.WardTypeId ?? reactProps?.currentfilter?.WardId ?? -1
  );
  const [selectedGuarantor, setSelectedGuarantor] = useState<number | string>(
    reactProps?.currentfilter?.GuarantorId ?? -1
  );
  const [selectedDoctor, setSelectedDoctor] = useState<number | string>(
    reactProps?.currentfilter?.DoctorId ?? -1
  );
  const [stayLengthFilter, setStayLengthFilter] = useState<'all' | 'today' | 'short' | 'mid' | 'long'>('all');

  // Selected Patient Details Modal State
  const [selectedPatientModal, setSelectedPatientModal] = useState<CurrentInpatientEntity | null>(null);

  // Sync props from hybrid
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientNameMRN !== undefined) {
        setSearchTerm(reactProps.currentfilter.PatientNameMRN);
      }
      if (reactProps.currentfilter.WardTypeId !== undefined || reactProps.currentfilter.WardId !== undefined) {
        setSelectedWard(reactProps.currentfilter.WardTypeId ?? reactProps.currentfilter.WardId ?? -1);
      }
      if (reactProps.currentfilter.GuarantorId !== undefined) {
        setSelectedGuarantor(reactProps.currentfilter.GuarantorId);
      }
      if (reactProps.currentfilter.DoctorId !== undefined) {
        setSelectedDoctor(reactProps.currentfilter.DoctorId);
      }
    }
  }, [reactProps?.currentfilter]);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) onAction(action, payload);
  };

  // Fetch Lookups in standalone mode
  const fetchStandaloneLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [
        { Key: 'Ward' },
        { Key: 'Guarantor' },
        { Key: 'Doctor' },
        { Key: 'Department' },
      ]);
      if (res && typeof res === 'object') {
        setStandaloneLookups({
          Ward: Array.isArray(res.Ward) ? res.Ward : [],
          Guarantor: Array.isArray(res.Guarantor) ? res.Guarantor : [],
          Doctor: Array.isArray(res.Doctor) ? res.Doctor : [],
          Department: Array.isArray(res.Department) ? res.Department : [],
        });
      }
    } catch (e) {
      console.warn('Failed to fetch standalone lookups for current inpatients', e);
    }
  }, []);

  // Fetch Inpatients list in standalone mode
  const fetchStandaloneList = useCallback(
    async (page: number = 1, pageSize: number = 25) => {
      setIsLoading(true);
      try {
        const facilityId = sessionHelper.getFacilityId() || 1;
        const inputData = {
          Params: [
            { Key: 1, Value: facilityId },
            { Key: 2, Value: selectedWard === -1 ? null : Number(selectedWard) },
            { Key: 3, Value: 2 }, // Admitted
            { Key: 5, Value: selectedDoctor === -1 ? null : Number(selectedDoctor) },
            { Key: 11, Value: searchTerm || '' },
            { Key: 19, Value: selectedGuarantor === -1 ? null : Number(selectedGuarantor) },
            { Key: 15, Value: 2 }, // Inpatient EncounterTypeId
            { Key: 26, Value: true },
          ],
          PageContext: {
            PageSize: pageSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('Visit/Visit/GetMinEncounters', inputData);
        if (res) {
          const rawItems = res.Data || [];
          // Calculate length of stay if missing
          const processed = rawItems.map((item: any) => {
            if (item.AdmissionDate && (item.NoOfDays === undefined || item.NoOfDays === '')) {
              const adm = new Date(item.AdmissionDate);
              const now = new Date();
              const diffMs = now.getTime() - adm.getTime();
              item.NoOfDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            }
            return item;
          });

          setStandaloneItems(processed);
          setStandaloneTotal(res.PageContext?.TotalRecords || rawItems.length);
          setStandalonePage(page);
          setStandalonePageSize(pageSize);
        }
      } catch (err) {
        console.error('Failed to fetch current inpatients:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedWard, selectedDoctor, selectedGuarantor, searchTerm]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchStandaloneLookups();
      fetchStandaloneList(1, 25);
    }
  }, [isHybrid, fetchStandaloneLookups, fetchStandaloneList]);

  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientNameMRN', value: searchTerm });
      dispatch('search');
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleWardFilterChange = (wardId: any) => {
    setSelectedWard(wardId);
    if (isHybrid) {
      dispatch('filterChange', { field: 'WardTypeId', value: Number(wardId) });
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleGuarantorFilterChange = (guarantorId: any) => {
    setSelectedGuarantor(guarantorId);
    if (isHybrid) {
      dispatch('filterChange', { field: 'GuarantorId', value: Number(guarantorId) });
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedWard(-1);
    setSelectedGuarantor(-1);
    setSelectedDoctor(-1);
    setStayLengthFilter('all');

    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientNameMRN', value: '' });
      dispatch('filterChange', { field: 'WardTypeId', value: -1 });
      dispatch('filterChange', { field: 'GuarantorId', value: -1 });
      dispatch('search');
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('pageChange', { page });
    } else {
      fetchStandaloneList(page, standalonePageSize);
    }
  };

  const rawItems = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  const wardsList = isHybrid
    ? reactProps?.lookup?.Ward || []
    : standaloneLookups.Ward;

  const guarantorsList = isHybrid
    ? reactProps?.lookup?.Guarantor || []
    : standaloneLookups.Guarantor;

  const context = reactProps?.context || '';
  const showBackButton = context === 'frontoffice' || context === 'billing' || context === 'nursing' || context === 'surgery' || context === 'qm';

  // Apply Stay Length filter locally if active
  const filteredItems = useMemo(() => {
    if (stayLengthFilter === 'all') return rawItems;
    return rawItems.filter((item) => {
      const days = Number(item.NoOfDays) || 0;
      if (stayLengthFilter === 'today') return days === 0;
      if (stayLengthFilter === 'short') return days > 0 && days <= 3;
      if (stayLengthFilter === 'mid') return days > 3 && days <= 7;
      if (stayLengthFilter === 'long') return days > 7;
      return true;
    });
  }, [rawItems, stayLengthFilter]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    let admittedToday = 0;
    let longStay = 0;
    let dischargeAdvised = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    rawItems.forEach((item) => {
      if (item.AdmissionDate && item.AdmissionDate.startsWith(todayStr)) {
        admittedToday++;
      }
      const days = Number(item.NoOfDays) || 0;
      if (days > 7) {
        longStay++;
      }
      if (item.DischargeorderstatusId && Number(item.DischargeorderstatusId) > 0) {
        dischargeAdvised++;
      }
    });

    return {
      total: totalItems || rawItems.length,
      admittedToday,
      longStay,
      dischargeAdvised,
    };
  }, [rawItems, totalItems]);

  const formatDate = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert('No active in-patient records to export.');
      return;
    }

    const headers = ['#', 'Admission Date', 'Visit No', 'UHID / MRN', 'Patient Name', 'Age', 'Gender', 'Ward / Room / Bed', 'Consultant Doctor', 'Payer / Insurance', 'Days Stayed', 'Discharge Order Status'];
    const rows = filteredItems.map((item, idx) => {
      const p = item.Patient || {};
      const pName = `${p.Title?.Description || ''} ${p.FirstName || ''} ${p.LastName || ''}`.trim();
      const loc = [item.WardMaster?.WardName, item.WardRoomMaster?.RoomNo, item.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / ');
      const doc = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim();

      return [
        idx + 1,
        item.AdmissionDate || '',
        item.VisitIdentifier || '',
        p.MRN || '',
        `"${pName.replace(/"/g, '""')}"`,
        p.Age || '',
        p.Gender?.Description || '',
        `"${loc.replace(/"/g, '""')}"`,
        `"${doc.replace(/"/g, '""')}"`,
        `"${(item.Guarantor?.GuarantorName || 'Self / Cash').replace(/"/g, '""')}"`,
        item.NoOfDays || 0,
        item.DischargeorderstatusId ? 'Discharge Advised' : 'Active Stay',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `active_inpatients_census_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        color: colors.textMain,
        padding: '20px 24px',
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          padding: '18px 24px',
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.md,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
            }}
          >
            <i className="fa fa-procedures" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textMain, letterSpacing: '-0.01em' }}>
                Active In-Patients (Live Census)
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: radii.full,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                }}
              >
                {totalItems} Admitted
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Hospital In-Patient Ward Census • Active Occupancy, Assigned Beds & Length of Stay
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (isHybrid) dispatch('addNew');
              else window.location.hash = '#/app/admissiontab/0/admission';
            }}
            title="Admit New In-Patient"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
          >
            <i className="fa fa-plus" />
            <span>New Admission</span>
          </button>

          <button
            onClick={() => (window.location.hash = '#/app/bedmanagement')}
            title="View Visual Ward & Bed Matrix"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
            }}
          >
            <i className="fa fa-th" style={{ color: '#2563eb' }} />
            <span>Bed Matrix</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Export Census to CSV Spreadsheet"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
            }}
          >
            <i className="fa fa-download" style={{ color: '#16a34a' }} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              if (isHybrid) dispatch('search');
              else fetchStandaloneList(currentPage, pageSize);
            }}
            title="Refresh Inpatients List"
            style={{
              width: 38,
              height: 38,
              borderRadius: radii.md,
              backgroundColor: '#ffffff',
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: shadows.sm,
            }}
          >
            <i className={`fa fa-refresh ${isLoading ? 'fa-spin' : ''}`} />
          </button>

          {showBackButton && (
            <button
              onClick={() => dispatch('backtoList')}
              title="Return to Dashboard"
              style={{
                width: 38,
                height: 38,
                borderRadius: radii.md,
                backgroundColor: '#f1f5f9',
                border: `1px solid ${colors.border}`,
                color: colors.textMain,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-home" />
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        {/* Total Active Census */}
        <div
          onClick={() => setStayLengthFilter('all')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: stayLengthFilter === 'all' ? '1.5px solid #0284c7' : `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Total In-Patients</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-users" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.textMain, marginTop: 6 }}>
            {kpiStats.total}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Currently occupied hospital beds
          </div>
        </div>

        {/* Admitted Today */}
        <div
          onClick={() => setStayLengthFilter('today')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: stayLengthFilter === 'today' ? '1.5px solid #16a34a' : `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Admitted Today</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-sign-in" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 6 }}>
            {kpiStats.admittedToday}
          </div>
          <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>
            New admissions recorded today
          </div>
        </div>

        {/* Long Stay Patients (> 7 Days) */}
        <div
          onClick={() => setStayLengthFilter('long')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: stayLengthFilter === 'long' ? '1.5px solid #f59e0b' : `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>Long Stay (&gt; 7 Days)</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-hourglass-half" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 6 }}>
            {kpiStats.longStay}
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
            Inpatients with &gt; 7 days length of stay
          </div>
        </div>

        {/* Discharge Advised */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>Discharge Advised</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-stethoscope" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginTop: 6 }}>
            {kpiStats.dischargeAdvised}
          </div>
          <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>
            Awaiting clearance / discharge summary
          </div>
        </div>
      </div>

      {/* ── Search & Filter Suite ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          padding: '16px 20px',
          marginBottom: spacing.md,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing.md,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient Search */}
          <div style={{ minWidth: 240, gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Search In-Patient / UHID / IP#
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder="Type Patient Name, MRN or IP No..."
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 36px 0 12px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    if (isHybrid) {
                      dispatch('filterChange', { field: 'PatientNameMRN', value: '' });
                      dispatch('search');
                    } else {
                      fetchStandaloneList(1, standalonePageSize);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: 30,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: colors.textMuted,
                  }}
                >
                  <i className="fa fa-times" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSearchSubmit}
                style={{
                  position: 'absolute',
                  right: 8,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#0284c7',
                  fontSize: 14,
                }}
              >
                <i className="fa fa-search" />
              </button>
            </div>
          </div>

          {/* Ward Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Ward / Department
            </label>
            <select
              value={selectedWard}
              onChange={(e) => handleWardFilterChange(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Wards</option>
              {wardsList.map((w) => (
                <option key={w.Id} value={w.Id}>
                  {w.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Insurance / Guarantor Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Payer / Insurance
            </label>
            <select
              value={selectedGuarantor}
              onChange={(e) => handleGuarantorFilterChange(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Payers</option>
              {guarantorsList.map((g) => (
                <option key={g.Id} value={g.Id}>
                  {g.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              onClick={handleResetFilters}
              title="Reset all filters to default"
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#f8fafc',
                color: colors.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-refresh" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Length of Stay Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginRight: 4 }}>Length of Stay:</span>
          {[
            { id: 'all', label: 'All Stays' },
            { id: 'today', label: 'Admitted Today (0d)' },
            { id: 'short', label: '1–3 Days' },
            { id: 'mid', label: '4–7 Days' },
            { id: 'long', label: '> 7 Days' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStayLengthFilter(chip.id as any)}
              style={{
                padding: '3px 10px',
                fontSize: 12,
                borderRadius: radii.full,
                border: `1px solid ${stayLengthFilter === chip.id ? '#0284c7' : colors.border}`,
                backgroundColor: stayLengthFilter === chip.id ? '#0284c7' : '#ffffff',
                color: stayLengthFilter === chip.id ? '#ffffff' : colors.textMain,
                fontWeight: stayLengthFilter === chip.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── In-Patient Census Table Card ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
          marginBottom: spacing.md,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: `1px solid ${colors.border}`,
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '14px 16px', width: 45 }}>#</th>
                <th style={{ padding: '14px 16px' }}>Admission Date</th>
                <th style={{ padding: '14px 16px' }}>IP / Visit No</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>Ward & Bed Location</th>
                <th style={{ padding: '14px 16px' }}>Consultant Doctor</th>
                <th style={{ padding: '14px 16px' }}>Payer / Referral</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Days Stayed</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '56px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: radii.full,
                        backgroundColor: '#f1f5f9',
                        color: '#94a3b8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        marginBottom: 12,
                      }}
                    >
                      <i className="fa fa-procedures" />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                      No In-Patients Found
                    </div>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                      No admitted patients match your current ward, search or stay length filters.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  const patient = item.Patient || {};
                  const fullName = `${patient.Title?.Description || ''} ${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || '—';
                  const wardName = item.WardMaster?.WardName || '';
                  const roomNo = item.WardRoomMaster?.RoomNo || '';
                  const bedNo = item.WardRoomBedMaster?.BedNo || '';
                  const bedLocation = [wardName, roomNo, bedNo].filter(Boolean).join(' / ') || 'Unassigned Bed';
                  const doctorName = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim() || '—';
                  const daysStay = Number(item.NoOfDays) || 0;

                  // Initials
                  const initials = fullName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0].toUpperCase())
                    .join('') || 'IP';

                  return (
                    <tr
                      key={item.Id || index}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* S.No */}
                      <td style={{ padding: '14px 16px', color: colors.textMuted, fontWeight: 500 }}>
                        {sNo}
                      </td>

                      {/* Admission Date & Time */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: colors.textMain }}>
                          <i className="fa fa-calendar-o" style={{ color: '#64748b', fontSize: 12 }} />
                          <span>{formatDate(item.AdmissionDate)}</span>
                        </div>
                      </td>

                      {/* Visit / IP No */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: '#f1f5f9',
                            fontWeight: 700,
                            color: '#0f172a',
                            fontSize: 12,
                          }}
                        >
                          {item.VisitIdentifier || '—'}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.full,
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div
                              onClick={() => {
                                if (isHybrid) dispatch('patientinfo', { entity: item });
                                else setSelectedPatientModal(item);
                              }}
                              style={{
                                fontWeight: 700,
                                color: '#0284c7',
                                cursor: 'pointer',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {fullName}
                            </div>
                            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                              <strong>MRN:</strong> {patient.MRN || '—'} &bull; {patient.Age ? `${patient.Age}Y` : ''} {patient.Gender?.Description ? `/${patient.Gender.Description}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ward & Bed Location */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: radii.sm, backgroundColor: '#eff6ff', color: '#1e40af', fontSize: 12, fontWeight: 700 }}>
                          <i className="fa fa-bed" />
                          <span>{bedLocation}</span>
                        </div>
                      </td>

                      {/* Consultant Doctor */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>
                          {doctorName}
                        </div>
                        {item.Department?.DepartmentName && (
                          <div style={{ fontSize: 11, color: colors.textMuted }}>
                            {item.Department.DepartmentName}
                          </div>
                        )}
                      </td>

                      {/* Payer / Referral */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {item.Guarantor?.GuarantorName || 'Self / Cash'}
                        </div>
                        {item.ReferralName && (
                          <div style={{ fontSize: 11, color: colors.textMuted }}>
                            Ref: {item.ReferralName}
                          </div>
                        )}
                      </td>

                      {/* Days Stayed */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: radii.full,
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: daysStay > 7 ? '#fef2f2' : daysStay > 3 ? '#fffbeb' : '#f0fdf4',
                            color: daysStay > 7 ? '#b91c1c' : daysStay > 3 ? '#b45309' : '#15803d',
                            border: `1px solid ${daysStay > 7 ? '#fecaca' : daysStay > 3 ? '#fde68a' : '#bbf7d0'}`,
                          }}
                        >
                          {daysStay} {daysStay === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* View Summary Modal */}
                          <button
                            onClick={() => setSelectedPatientModal(item)}
                            title="View In-Patient Stay Summary"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="fa fa-eye" />
                          </button>

                          {/* Quick Bed Transfer */}
                          <button
                            onClick={() => (window.location.hash = '#/app/bedtransfer')}
                            title="Initiate Bed Relocation"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#7c3aed',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="fa fa-exchange" />
                          </button>

                          {/* Patient Profile */}
                          <button
                            onClick={() => {
                              if (isHybrid) dispatch('patientinfo', { entity: item });
                              else setSelectedPatientModal(item);
                            }}
                            title="View Patient Master Profile"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#16a34a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="fa fa-user-circle-o" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#ffffff',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Showing <strong>{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> active in-patients
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Patient Profile & Details Modal ── */}
      {selectedPatientModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setSelectedPatientModal(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 900 }}>
            <PatientProfileModal
              patientId={selectedPatientModal.PatientId || selectedPatientModal.Patient?.Id}
              initialData={{
                ...selectedPatientModal,
                PatientName: `${selectedPatientModal.Patient?.Title?.Description || ''} ${selectedPatientModal.Patient?.FirstName || ''} ${selectedPatientModal.Patient?.LastName || ''}`.trim(),
                MRN: selectedPatientModal.Patient?.MRN,
                Age: selectedPatientModal.Patient?.Age,
                Gender: selectedPatientModal.Patient?.Gender?.Description,
                DoctorName: `${selectedPatientModal.Doctor?.Title?.Description || ''} ${selectedPatientModal.Doctor?.FirstName || ''} ${selectedPatientModal.Doctor?.LastName || ''}`.trim(),
                Department: selectedPatientModal.Department?.DepartmentName,
                WardName: [selectedPatientModal.WardMaster?.WardName, selectedPatientModal.WardRoomMaster?.RoomNo, selectedPatientModal.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / '),
                GuarantorName: selectedPatientModal.Guarantor?.GuarantorName,
              }}
              onClose={() => setSelectedPatientModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
