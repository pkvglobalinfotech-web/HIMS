import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';

export interface LookupOption {
  Id: number;
  Text: string;
  Description?: string;
  Code?: string;
}

export interface PatientEntity {
  Id?: number;
  MRN?: string;
  FirstName?: string;
  LastName?: string;
  Age?: number | string;
  Gender?: { Description?: string };
  Title?: { Description?: string };
  PhotoPath?: string;
}

export interface AdmissionItem {
  Id: number;
  PatientId: number;
  AdmissionDate: string;
  VisitIdentifier: string;
  AdmissionStatusId?: number;
  AdmissionStatus?: { Description?: string };
  IsBillLock?: boolean | number;
  Patient?: PatientEntity;
  WardMaster?: { WardName?: string };
  WardRoomMaster?: { RoomNo?: string };
  WardRoomBedMaster?: { BedNo?: string };
  Doctor?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  Guarantor?: { GuarantorName?: string };
  Department?: { DepartmentName?: string };
  AttenderPhone?: string;
  [key: string]: any;
}

export interface AdmissionListScreenProps {
  reactProps?: {
    items?: AdmissionItem[];
    totalItems?: number;
    currentPage?: number;
    pageSize?: number;
    currentfilter?: {
      patientnamemrn?: string;
      admissiondate?: string;
      WardId?: number | string;
      GuarantorId?: number | string;
      DoctorId?: number | string;
      GuarantorTypeId?: number | string;
      admissionstatusid?: number | string;
      Context?: string;
    };
    lookup?: {
      Ward?: LookupOption[];
      Guarantor?: LookupOption[];
      Doctor?: LookupOption[];
      GuarantorType?: LookupOption[];
      AdmissionStatus?: LookupOption[];
    };
    context?: string;
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const AdmissionListScreen: React.FC<AdmissionListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && Array.isArray(reactProps.items));

  // Standalone States
  const [standaloneItems, setStandaloneItems] = useState<AdmissionItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [standaloneLookups, setStandaloneLookups] = useState<{
    Ward: LookupOption[];
    Guarantor: LookupOption[];
    Doctor: LookupOption[];
    GuarantorType: LookupOption[];
    AdmissionStatus: LookupOption[];
  }>({
    Ward: [],
    Guarantor: [],
    Doctor: [],
    GuarantorType: [],
    AdmissionStatus: [],
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.patientnamemrn || ''
  );
  const [admissionDate, setAdmissionDate] = useState<string>(
    reactProps?.currentfilter?.admissiondate
      ? new Date(reactProps.currentfilter.admissiondate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [selectedWard, setSelectedWard] = useState<number | string>(
    reactProps?.currentfilter?.WardId ?? -1
  );
  const [selectedGuarantor, setSelectedGuarantor] = useState<number | string>(
    reactProps?.currentfilter?.GuarantorId ?? -1
  );
  const [selectedDoctor, setSelectedDoctor] = useState<number | string>(
    reactProps?.currentfilter?.DoctorId ?? -1
  );
  const [selectedGuarantorType, setSelectedGuarantorType] = useState<number | string>(
    reactProps?.currentfilter?.GuarantorTypeId ?? -1
  );
  const [selectedStatus, setSelectedStatus] = useState<number | string>(
    reactProps?.currentfilter?.admissionstatusid ?? 2
  );

  // Modal State for Process Flow
  const [showProcessFlow, setShowProcessFlow] = useState<boolean>(false);

  // Keep local filter state synced with incoming reactProps
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.patientnamemrn !== undefined) {
        setSearchTerm(reactProps.currentfilter.patientnamemrn || '');
      }
      if (reactProps.currentfilter.WardId !== undefined) {
        setSelectedWard(reactProps.currentfilter.WardId);
      }
      if (reactProps.currentfilter.GuarantorId !== undefined) {
        setSelectedGuarantor(reactProps.currentfilter.GuarantorId);
      }
      if (reactProps.currentfilter.DoctorId !== undefined) {
        setSelectedDoctor(reactProps.currentfilter.DoctorId);
      }
      if (reactProps.currentfilter.GuarantorTypeId !== undefined) {
        setSelectedGuarantorType(reactProps.currentfilter.GuarantorTypeId);
      }
      if (reactProps.currentfilter.admissionstatusid !== undefined) {
        setSelectedStatus(reactProps.currentfilter.admissionstatusid);
      }
      if (reactProps.currentfilter.admissiondate) {
        try {
          const d = new Date(reactProps.currentfilter.admissiondate);
          if (!isNaN(d.getTime())) {
            setAdmissionDate(d.toISOString().split('T')[0]);
          }
        } catch {
          // ignore
        }
      }
    }
  }, [reactProps?.currentfilter]);

  // Standalone fetch
  const fetchStandaloneLookups = useCallback(async () => {
    try {
      const facilityId = sessionHelper.getFacilityId() || 1;
      const res = await apiFetch<any>('General/Options/getoptions', [
        { Key: 'Facility' },
        { Key: 'AdmissionStatus' },
        { Key: 'Ward', Request: { Params: [{ Key: 2, Value: facilityId }] } },
        { Key: 'Doctor', Request: { Params: [{ Key: 2, Value: [-1, facilityId] }] } },
        { Key: 'Guarantor', Request: { Params: [{ Key: 7, Value: [-1, facilityId] }] } },
        { Key: 'GuarantorType' },
        { Key: 'Department' },
      ]);
      if (res) {
        setStandaloneLookups({
          Ward: res.Ward || [],
          Guarantor: res.Guarantor || [],
          Doctor: res.Doctor || [],
          GuarantorType: res.GuarantorType || [],
          AdmissionStatus: res.AdmissionStatus || [],
        });
      }
    } catch (e) {
      console.warn('Failed to fetch standalone lookups for admissions:', e);
    }
  }, []);

  const fetchStandaloneList = useCallback(
    async (page: number = 1, pageSize: number = 25) => {
      setIsLoading(true);
      try {
        const facilityId = sessionHelper.getFacilityId() || 1;
        const From = admissionDate ? `${admissionDate} 00:00:00` : null;
        const To = admissionDate ? `${admissionDate} 23:59:59` : null;

        const inputData = {
          Params: [
            { Key: 1, Value: facilityId },
            { Key: 2, Value: Number(selectedWard) },
            { Key: 3, Value: Number(selectedStatus) },
            { Key: 5, Value: Number(selectedDoctor) },
            { Key: 11, Value: searchTerm || '' },
            { Key: 15, Value: 2 }, // Inpatient
            { Key: 17, Value: From },
            { Key: 18, Value: To },
            { Key: 19, Value: Number(selectedGuarantor) },
            { Key: 23, Value: Number(selectedGuarantorType) },
          ],
          PageContext: {
            PageSize: pageSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('Visit/Visit/GetEncounters', inputData);
        if (res) {
          setStandaloneItems(res.Data || []);
          setStandaloneTotal(res.PageContext?.TotalRecords || 0);
          setStandalonePage(page);
          setStandalonePageSize(pageSize);
        }
      } catch (err) {
        console.error('Failed to fetch standalone admissions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      admissionDate,
      selectedWard,
      selectedStatus,
      selectedDoctor,
      searchTerm,
      selectedGuarantor,
      selectedGuarantorType,
    ]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchStandaloneLookups();
      fetchStandaloneList(1, 25);
    }
  }, [isHybrid, fetchStandaloneLookups, fetchStandaloneList]);

  // Dispatch action to AngularJS or local handler
  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'patientnamemrn', value: searchTerm });
      dispatch('search');
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    if (field === 'patientnamemrn') setSearchTerm(value);
    if (field === 'admissiondate') setAdmissionDate(value);
    if (field === 'WardId') setSelectedWard(value);
    if (field === 'GuarantorId') setSelectedGuarantor(value);
    if (field === 'DoctorId') setSelectedDoctor(value);
    if (field === 'GuarantorTypeId') setSelectedGuarantorType(value);
    if (field === 'admissionstatusid') setSelectedStatus(value);

    if (isHybrid) {
      dispatch('filterChangeAndSearch', { field, value });
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchTerm('');
    setAdmissionDate(today);
    setSelectedWard(-1);
    setSelectedGuarantor(-1);
    setSelectedDoctor(-1);
    setSelectedGuarantorType(-1);
    setSelectedStatus(2);

    if (isHybrid) {
      dispatch('resetFilters');
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

  const items = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems = isHybrid ? reactProps?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pageSize || 25 : standalonePageSize;

  const lookups = isHybrid
    ? {
        Ward: reactProps?.lookup?.Ward || [],
        Guarantor: reactProps?.lookup?.Guarantor || [],
        Doctor: reactProps?.lookup?.Doctor || [],
        GuarantorType: reactProps?.lookup?.GuarantorType || [],
        AdmissionStatus: reactProps?.lookup?.AdmissionStatus || [],
      }
    : standaloneLookups;

  const context = reactProps?.context || reactProps?.currentfilter?.Context || '';

  // Helpers
  const formatDate = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const formatTime = (val?: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getStatusTone = (statusId?: number) => {
    switch (statusId) {
      case 1: // Draft / New
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 2: // Admitted
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 3: // Discharge Advice
      case 4: // Clinical Discharge
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 5: // Discharged
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      case 6: // Cancelled
        return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
      default:
        return { bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
    }
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        color: colors.textMain,
        padding: '16px 20px',
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          padding: '16px 20px',
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
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-hospital-o" aria-hidden="true" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: colors.textMain,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                In-Patient Admissions
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: radii.full,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {totalItems} Total Records
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Hospital IP Management • Active Admissions, Ward Allocations & Bed Transfers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          {/* Process Flow Manual Button */}
          <button
            onClick={() => {
              if (isHybrid) {
                dispatch('showProcessFlow');
              } else {
                setShowProcessFlow(true);
              }
            }}
            title="View Admissions Process Flow Guide"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa fa-info-circle" style={{ color: '#0284c7' }} />
            <span>Process Flow</span>
          </button>

          {/* Add New Admission Button */}
          <button
            onClick={() => {
              if (isHybrid) {
                dispatch('addNew');
              } else {
                window.location.hash = '#/app/admissiontab/0/admission';
              }
            }}
            title="Register New In-Patient Admission"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              transition: 'background-color 0.15s ease',
            }}
          >
            <i className="fa fa-plus" />
            <span>New Admission</span>
          </button>

          {/* Home / Back to Dashboard button */}
          {(context === 'frontoffice' || context === 'billing') && (
            <button
              onClick={() => dispatch('backToList')}
              title="Return to Dashboard"
              style={{
                width: 36,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.md,
                backgroundColor: '#f1f5f9',
                color: colors.textMain,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
              }}
            >
              <i className="fa fa-home" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filters Card ── */}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing.md,
            alignItems: 'flex-end',
          }}
        >
          {/* Search Box */}
          <div style={{ minWidth: 200, gridColumn: 'span 2' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Search Patient / UHID / IP# / Phone
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
                placeholder="Enter Name, MRN, IP No or Mobile..."
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 36px 0 12px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  color: colors.textMain,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={handleSearchSubmit}
                title="Search"
                style={{
                  position: 'absolute',
                  right: 4,
                  width: 28,
                  height: 28,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fa fa-search" />
              </button>
            </div>
          </div>

          {/* Admission Date */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Admission Date
            </label>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => handleFilterChange('admissiondate', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                color: colors.textMain,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Ward Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Ward / Nursing Unit
            </label>
            <select
              value={selectedWard}
              onChange={(e) => handleFilterChange('WardId', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                color: colors.textMain,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Wards</option>
              {lookups.Ward.map((w) => (
                <option key={w.Id} value={w.Id}>
                  {w.Text || w.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Attending Doctor
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => handleFilterChange('DoctorId', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                color: colors.textMain,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Doctors</option>
              {lookups.Doctor.map((d) => (
                <option key={d.Id} value={d.Id}>
                  {d.Text || d.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Guarantor Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Guarantor / TPA
            </label>
            <select
              value={selectedGuarantor}
              onChange={(e) => handleFilterChange('GuarantorId', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                color: colors.textMain,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Guarantors</option>
              {lookups.Guarantor.map((g) => (
                <option key={g.Id} value={g.Id}>
                  {g.Text || g.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Admission Status Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Admission Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange('admissionstatusid', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                color: colors.textMain,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Statuses</option>
              {lookups.AdmissionStatus.map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.Text || s.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              onClick={handleResetFilters}
              title="Reset Filters to Default"
              style={{
                width: '100%',
                height: 36,
                padding: '0 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#f8fafc',
                color: colors.textMuted,
                fontSize: 13,
                fontWeight: 500,
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
      </div>

      {/* ── Table Card ── */}
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
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '12px 14px', width: 45 }}>#</th>
                <th style={{ padding: '12px 14px' }}>Date of Adm</th>
                <th style={{ padding: '12px 14px' }}>IP Number</th>
                <th style={{ padding: '12px 14px' }}>Patient Details</th>
                <th style={{ padding: '12px 14px' }}>Room / Bed</th>
                <th style={{ padding: '12px 14px' }}>Doctor</th>
                <th style={{ padding: '12px 14px' }}>Guarantor</th>
                <th style={{ padding: '12px 14px' }}>Department</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: '48px 16px',
                      textAlign: 'center',
                      color: colors.textMuted,
                    }}
                  >
                    <i
                      className="fa fa-bed"
                      style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12, display: 'block' }}
                    />
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textMain }}>
                      No Admissions Found
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Try adjusting the date, ward, or search filter criteria above.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  const patient = item.Patient || {};
                  const title = patient.Title?.Description ? `${patient.Title.Description} ` : '';
                  const fullName = `${title}${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || '—';
                  const doctorTitle = item.Doctor?.Title?.Description ? `${item.Doctor.Title.Description} ` : '';
                  const doctorName = `${doctorTitle}${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim() || '—';
                  const wardName = item.WardMaster?.WardName || '';
                  const roomNo = item.WardRoomMaster?.RoomNo || '';
                  const bedNo = item.WardRoomBedMaster?.BedNo || '';
                  const roomBedText = [wardName, roomNo, bedNo].filter(Boolean).join(' / ') || '—';

                  const statusTone = getStatusTone(item.AdmissionStatusId);
                  const isBillLock = Boolean(item.IsBillLock && item.AdmissionStatusId !== 5 && item.AdmissionStatusId !== 6);

                  return (
                    <tr
                      key={item.Id || index}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: isBillLock ? '#fffdf7' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isBillLock ? '#fef3c7' : '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isBillLock ? '#fffdf7' : 'transparent';
                      }}
                    >
                      {/* S.No */}
                      <td style={{ padding: '12px 14px', color: colors.textMuted }}>{sNo}</td>

                      {/* Admission Date & Time */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>
                          {formatDate(item.AdmissionDate)}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          {formatTime(item.AdmissionDate)}
                        </div>
                      </td>

                      {/* IP Number */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 600,
                            fontSize: 12,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {item.VisitIdentifier || '—'}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => dispatch('patientinfo', item)}
                          title="View Patient Profile Details"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            color: '#0284c7',
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          {fullName}
                        </button>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          MRN: <strong>{patient.MRN || '—'}</strong>
                          {patient.Age ? ` • ${patient.Age} yrs` : ''}
                          {patient.Gender?.Description ? ` • ${patient.Gender.Description}` : ''}
                        </div>
                      </td>

                      {/* Room & Bed */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: colors.textMain }}>{roomBedText}</div>
                      </td>

                      {/* Doctor */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: colors.textMain }}>{doctorName}</div>
                      </td>

                      {/* Guarantor */}
                      <td style={{ padding: '12px 14px', color: colors.textMuted }}>
                        {item.Guarantor?.GuarantorName || 'Self / Cash'}
                      </td>

                      {/* Department */}
                      <td style={{ padding: '12px 14px', color: colors.textMuted }}>
                        {item.Department?.DepartmentName || '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: statusTone.bg,
                            color: statusTone.color,
                            border: `1px solid ${statusTone.border}`,
                          }}
                        >
                          {item.AdmissionStatus?.Description || 'Active'}
                        </span>
                        {isBillLock && (
                          <span
                            title="Bill Locked"
                            style={{
                              marginLeft: 4,
                              color: '#d97706',
                              fontSize: 12,
                            }}
                          >
                            <i className="fa fa-lock" />
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* Edit / View */}
                          <button
                            onClick={() => dispatch('edit', item)}
                            title="View / Edit Admission Record"
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
                              fontSize: 13,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <i className="fa fa-pencil" />
                          </button>

                          {/* Bed Transfer Request */}
                          {(item.AdmissionStatusId === 2 || item.AdmissionStatusId === 3 || item.AdmissionStatusId === 4) && (
                            <button
                              onClick={() => dispatch('request', item)}
                              title="Request Bed Transfer"
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
                                fontSize: 13,
                              }}
                            >
                              <i className="fa fa-exchange" />
                            </button>
                          )}

                          {/* Patient Profile */}
                          <button
                            onClick={() => dispatch('profile', item)}
                            title="Patient Registration Profile"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#059669',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                            }}
                          >
                            <i className="fa fa-user-circle" />
                          </button>

                          {/* Delete (only if status is Draft / New) */}
                          {item.AdmissionStatusId === 1 && (
                            <button
                              onClick={() => dispatch('delete', item)}
                              title="Delete Admission Record"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: radii.sm,
                                border: `1px solid ${colors.border}`,
                                backgroundColor: '#ffffff',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                              }}
                            >
                              <i className="fa fa-trash-o" />
                            </button>
                          )}
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
            padding: '12px 18px',
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
            Showing{' '}
            <strong>
              {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            of <strong>{totalItems}</strong> admissions
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Process Flow Modal ── */}
      {showProcessFlow && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setShowProcessFlow(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.lg,
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: shadows.lg,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                Inpatient Admission Process Flow
              </h3>
              <button
                onClick={() => setShowProcessFlow(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: colors.textMuted,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', textAlign: 'center' }}>
              <img
                src="mock/usermanual/admissions/admissions.jpg"
                alt="Admissions Process Flow"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
