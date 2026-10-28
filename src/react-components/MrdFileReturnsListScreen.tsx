import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface MrdEncounterItem {
  Id: number;
  AdmissionDate?: string;
  DischargeDate?: string;
  VisitIdentifier?: string;
  PatientId: number;
  EncounterTypeId?: number;
  DoctorId?: number;
  DoctorName?: string;
  IsIncompleteMRD?: boolean;
  DischargeorderstatusId?: number;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string; Id?: number };
    PhotoPath?: string;
  };
  Doctor?: {
    Id?: number;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
  };
  Department?: {
    Id?: number;
    DepartmentName?: string;
  };
  WardMaster?: {
    Id?: number;
    WardName?: string;
  };
  WardRoomMaster?: {
    Id?: number;
    RoomNo?: string;
  };
  WardRoomBedMaster?: {
    Id?: number;
    BedNo?: string;
  };
  Guarantor?: {
    Id?: number;
    GuarantorName?: string;
  };
  AdmissionStatus?: {
    Id?: number;
    Description?: string;
  };
  ReturnedUser?: {
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
  };
  ReturnDate?: string;
  MRDIpFileId?: number;
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  Name?: string;
  [key: string]: any;
}

export interface MrdFileReturnsListScreenProps {
  reactProps?: {
    items?: MrdEncounterItem[];
    lookup?: {
      Doctor?: LookupOption[];
      AdmissionStatus?: LookupOption[];
      Ward?: LookupOption[];
      Department?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      DOD?: string;
      PatientName?: string;
      VisitNo?: string;
      DoctorId?: number | string;
      admissionstatusid?: number | string;
      [key: string]: any;
    };
    pager?: {
      totalItems: number;
      currentPage: number;
      pageSize: number;
    };
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const MrdFileReturnsListScreen: React.FC<MrdFileReturnsListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<MrdEncounterItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [doctorList, setDoctorList] = useState<LookupOption[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.PatientName || ''
  );
  const [visitNoFilter, setVisitNoFilter] = useState<string>(
    reactProps?.currentfilter?.VisitNo || ''
  );
  const [dodFilter, setDodFilter] = useState<string>(() => {
    if (reactProps?.currentfilter?.DOD) return reactProps.currentfilter.DOD;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>(
    reactProps?.currentfilter?.DoctorId ?? -1
  );
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState<boolean>(false);
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'all' | 'custom'>('today');

  // Modals & Action States
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [profileModalData, setProfileModalData] = useState<any>(null);
  const [sendMrdModalItem, setSendMrdModalItem] = useState<MrdEncounterItem | null>(null);
  const [isSendingMrd, setIsSendingMrd] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Effective items & pager
  const items: MrdEncounterItem[] = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems: number = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage: number = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize: number = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  const doctors: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.Doctor) {
      return reactProps.lookup.Doctor;
    }
    return doctorList;
  }, [isHybrid, reactProps?.lookup?.Doctor, doctorList]);

  // Dispatch helper
  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Standalone: Fetch Lookups
  const fetchLookups = useCallback(async () => {
    try {
      const facilityId = sessionHelper.getCurrentFacilityId();
      const res = await apiFetch<any>('General/Options/getoptions', [
        { Key: 'AdmissionStatus' },
        { Key: 'Ward' },
        {
          Key: 'Doctor',
          Request: {
            Params: [{ Key: 2, Value: [-1, facilityId] }],
          },
        },
      ]);
      if (res && res.Doctor) {
        setDoctorList(res.Doctor);
      }
    } catch (err) {
      console.warn('Failed to fetch MRD lookups in standalone mode:', err);
    }
  }, []);

  // Standalone: Fetch Grid Items
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        let fromDate: string | null = null;
        let toDate: string | null = null;

        if (dodFilter && !searchTerm && !visitNoFilter) {
          fromDate = `${dodFilter} 00:00:00`;
          toDate = `${dodFilter} 23:59:59`;
        }

        const inputData = {
          Params: [
            { Key: 13, Value: visitNoFilter || null },
            { Key: 3, Value: 6 }, // Discharged / Financial Discharge
            { Key: 11, Value: searchTerm || null },
            { Key: 28, Value: fromDate },
            { Key: 29, Value: toDate },
            { Key: 15, Value: 2 }, // EncounterTypeId = 2 (Inpatient)
            { Key: 61, Value: false },
            { Key: 7, Value: selectedDoctorId !== -1 ? selectedDoctorId : null },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('Visit/Visit/GetEncounters', inputData);
        if (res && res.Data) {
          setStandaloneItems(res.Data);
          setStandaloneTotal(res.PageContext?.TotalRecords || res.Data.length);
        } else {
          setStandaloneItems([]);
          setStandaloneTotal(0);
        }
      } catch (err) {
        console.error('Failed to load MRD File Returns encounters:', err);
        setStandaloneItems([]);
        setStandaloneTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, dodFilter, searchTerm, visitNoFilter, selectedDoctorId]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchItems(standalonePage, standalonePageSize);
    }
  }, [isHybrid, fetchLookups, fetchItems, standalonePage, standalonePageSize]);

  // Sync hybrid props
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientName !== undefined) {
        setSearchTerm(reactProps.currentfilter.PatientName || '');
      }
      if (reactProps.currentfilter.VisitNo !== undefined) {
        setVisitNoFilter(reactProps.currentfilter.VisitNo || '');
      }
      if (reactProps.currentfilter.DOD !== undefined) {
        setDodFilter(reactProps.currentfilter.DOD || '');
      }
      if (reactProps.currentfilter.DoctorId !== undefined) {
        setSelectedDoctorId(reactProps.currentfilter.DoctorId);
      }
    }
  }, [reactProps?.currentfilter]);

  // Filter handlers
  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: searchTerm });
      dispatch('search');
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleVisitNoChange = (val: string) => {
    setVisitNoFilter(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'VisitNo', value: val });
    }
  };

  const handleDoctorChange = (val: number | string) => {
    setSelectedDoctorId(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'DoctorId', value: val });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handleDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'all') => {
    setDatePreset(preset);
    const today = new Date();
    let target = '';

    if (preset === 'today') {
      target = today.toISOString().split('T')[0];
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      target = y.toISOString().split('T')[0];
    } else if (preset === 'all') {
      target = '';
    } else if (preset === 'week') {
      target = today.toISOString().split('T')[0];
    }

    setDodFilter(target);
    if (isHybrid) {
      dispatch('filterChange', { field: 'DOD', value: target });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchTerm('');
    setVisitNoFilter('');
    setDodFilter(today);
    setSelectedDoctorId(-1);
    setFilterIncompleteOnly(false);
    setDatePreset('today');

    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: '' });
      dispatch('filterChange', { field: 'VisitNo', value: '' });
      dispatch('filterChange', { field: 'DOD', value: today });
      dispatch('filterChange', { field: 'DoctorId', value: -1 });
      dispatch('search');
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('pageChange', { page });
    } else {
      setStandalonePage(page);
    }
  };

  // Filtered Items (Client-side toggle for Incomplete MRD)
  const displayItems = useMemo(() => {
    if (!filterIncompleteOnly) return items;
    return items.filter((item) => Boolean(item.IsIncompleteMRD));
  }, [items, filterIncompleteOnly]);

  // KPI Counts
  const kpiStats = useMemo(() => {
    let incomplete = 0;
    let corporate = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    let dischargedToday = 0;

    items.forEach((item) => {
      if (item.IsIncompleteMRD) incomplete++;
      if (item.Guarantor?.GuarantorName && item.Guarantor.GuarantorName.toLowerCase() !== 'self / cash') {
        corporate++;
      }
      if (item.DischargeDate && item.DischargeDate.startsWith(todayStr)) {
        dischargedToday++;
      }
    });

    return {
      total: totalItems,
      incomplete,
      corporate,
      dischargedToday,
    };
  }, [items, totalItems]);

  // Execute Send to MRD
  const handleConfirmSendToMrd = async () => {
    if (!sendMrdModalItem) return;
    setIsSendingMrd(true);

    if (isHybrid) {
      // Dispatch to hybrid controller
      dispatch('return', { entity: sendMrdModalItem });
      setSendMrdModalItem(null);
      setIsSendingMrd(false);
      return;
    }

    try {
      const currentUserId = sessionHelper.getCurrentUserId();
      const payloadData = {
        EncounterId: sendMrdModalItem.Id,
        PatientId: sendMrdModalItem.PatientId,
        TypeId: sendMrdModalItem.EncounterTypeId || 2,
        DoctorId: sendMrdModalItem.DoctorId,
        AdmissionDate: sendMrdModalItem.AdmissionDate,
        DischargeDate: sendMrdModalItem.DischargeDate,
        VisitNo: sendMrdModalItem.VisitIdentifier,
        PatientMrn: sendMrdModalItem.Patient?.MRN || sendMrdModalItem.PatientMrn,
        MRDIPFileStatusId: 1, // Status 1: Return to MRD
        ReturnBy: currentUserId > 0 ? currentUserId : 1,
        ReturnDate: new Date().toISOString(),
      };

      const res = await apiFetch<any>('IPManagement/MRDFiles/AddMRDFiles', {
        Data: payloadData,
      });

      setNotificationMsg({
        type: 'success',
        text: `Patient file (${sendMrdModalItem.VisitIdentifier}) has been successfully dispatched to the MRD!`,
      });
      setSendMrdModalItem(null);
      fetchItems(standalonePage, standalonePageSize);
    } catch (err) {
      console.error('Failed to send file to MRD:', err);
      setNotificationMsg({
        type: 'error',
        text: 'Failed to dispatch file to MRD. Please check system permissions.',
      });
    } finally {
      setIsSendingMrd(false);
      setTimeout(() => setNotificationMsg(null), 5000);
    }
  };

  // Open Patient Profile Modal
  const handleOpenPatientProfile = (item: MrdEncounterItem) => {
    if (isHybrid) {
      dispatch('patientinfo', { entity: item });
    } else {
      const p = item.Patient;
      const fullName = `${p?.Title?.Description || ''} ${p?.FirstName || ''} ${p?.LastName || ''}`.trim() || 'Patient Record';
      setProfileModalData({
        ...item,
        PatientName: fullName,
        MRN: p?.MRN,
        Age: p?.Age,
        Gender: p?.Gender?.Description,
        DoctorName: `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim(),
        Department: item.Department?.DepartmentName,
        WardName: [item.WardMaster?.WardName, item.WardRoomMaster?.RoomNo, item.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / '),
        GuarantorName: item.Guarantor?.GuarantorName,
      });
      setProfileModalPatientId(item.PatientId || p?.Id || 0);
    }
  };

  // Helpers
  const formatDateTime = (val?: string) => {
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
    if (!items || items.length === 0) return;
    const headers = [
      'S.No',
      'Admission Date',
      'Visit No',
      'Patient ID (MRN)',
      'Patient Name',
      'Age/Gender',
      'Ward/Bed',
      'Attending Doctor',
      'Department',
      'Payer Name',
      'Discharge Status',
      'Incomplete MRD',
    ];

    const rows = items.map((item, idx) => {
      const p = item.Patient;
      const fullName = `${p?.Title?.Description || ''} ${p?.FirstName || ''} ${p?.LastName || ''}`.trim();
      const wardBed = [item.WardMaster?.WardName, item.WardRoomMaster?.RoomNo, item.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / ');
      const doc = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim();

      return [
        idx + 1,
        `"${formatDateTime(item.AdmissionDate)}"`,
        `"${item.VisitIdentifier || ''}"`,
        `"${p?.MRN || ''}"`,
        `"${fullName}"`,
        `"${p?.Age || ''} / ${p?.Gender?.Description || ''}"`,
        `"${wardBed}"`,
        `"${doc}"`,
        `"${item.Department?.DepartmentName || ''}"`,
        `"${item.Guarantor?.GuarantorName || 'Self / Cash'}"`,
        `"${item.AdmissionStatus?.Description || 'Discharged'}"`,
        `"${item.IsIncompleteMRD ? 'YES' : 'NO'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MRD_File_Returns_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        backgroundColor: colors.background,
        minHeight: '100%',
        padding: '20px 24px 40px 24px',
        color: colors.textMain,
      }}
    >
      {/* ── Notification Banner ── */}
      {notificationMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderRadius: radii.md,
            backgroundColor: notificationMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${notificationMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: notificationMsg.type === 'success' ? '#166534' : '#991b1b',
            marginBottom: 16,
            boxShadow: shadows.sm,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
            <i className={`fa ${notificationMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            <span>{notificationMsg.text}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <i className="fa fa-times" />
          </button>
        </div>
      )}

      {/* ── Top Header Section ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.lg,
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
            }}
          >
            <i className="fa fa-archive" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: colors.textMain,
                  letterSpacing: '-0.02em',
                }}
              >
                Send to MRD (Medical Record Department)
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: radii.full,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                }}
              >
                Inpatient File Dispatch
              </span>
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Track discharged patient physical record charts and dispatch completed case files to MRD
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleExportCSV}
            title="Export Records to CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: shadows.sm,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <i className="fa fa-download" style={{ color: '#0284c7' }} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              if (isHybrid) dispatch('search');
              else fetchItems(standalonePage, standalonePageSize);
            }}
            title="Refresh List"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: shadows.sm,
            }}
          >
            <i className={`fa fa-refresh ${isLoading ? 'fa-spin' : ''}`} style={{ color: '#64748b' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Total Awaiting Dispatch */}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Ready to Send</span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.full,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-files-o" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e40af', marginTop: 6 }}>
            {kpiStats.total}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Discharged inpatient records
          </div>
        </div>

        {/* Flagged Incomplete MRD */}
        <div
          onClick={() => setFilterIncompleteOnly(!filterIncompleteOnly)}
          style={{
            backgroundColor: filterIncompleteOnly ? '#fffbeb' : '#ffffff',
            borderRadius: radii.lg,
            border: `1px solid ${filterIncompleteOnly ? '#f59e0b' : colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>
              Flagged Incomplete MRD {filterIncompleteOnly ? '(Filtered)' : ''}
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.full,
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-exclamation-triangle" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 6 }}>
            {kpiStats.incomplete}
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
            Click to toggle incomplete files only
          </div>
        </div>

        {/* Discharged Today */}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Discharged Today</span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.full,
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-calendar-check-o" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#166534', marginTop: 6 }}>
            {kpiStats.dischargedToday}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Pending file compilation
          </div>
        </div>

        {/* Corporate / TPA Insured */}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Corporate / Insured</span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: radii.full,
                backgroundColor: '#faf5ff',
                color: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-shield" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6b21a8', marginTop: 6 }}>
            {kpiStats.corporate}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Claims review files
          </div>
        </div>
      </div>

      {/* ── Filters & Search Section ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          padding: '18px 20px',
          marginBottom: 20,
          boxShadow: shadows.sm,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient Name / MRN Search */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Patient Name / MRN
            </label>
            <div style={{ position: 'relative' }}>
              <i
                className="fa fa-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
                placeholder="Search Patient Name / MRN..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  fontSize: 13,
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: '#ffffff',
                  color: colors.textMain,
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
                      dispatch('filterChange', { field: 'PatientName', value: '' });
                      dispatch('search');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fa fa-times" />
                </button>
              )}
            </div>
          </div>

          {/* Visit No / IP Identifier */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Visit No / IP Number
            </label>
            <div style={{ position: 'relative' }}>
              <i
                className="fa fa-hospital-o"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              />
              <input
                type="text"
                value={visitNoFilter}
                onChange={(e) => handleVisitNoChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
                placeholder="e.g. IP24-25/..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  fontSize: 13,
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: '#ffffff',
                  color: colors.textMain,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Date of Discharge (DOD) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>
                Discharge Date (DOD)
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                <span
                  onClick={() => handleDatePreset('today')}
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: radii.sm,
                    cursor: 'pointer',
                    fontWeight: 700,
                    backgroundColor: datePreset === 'today' ? '#0284c7' : '#f1f5f9',
                    color: datePreset === 'today' ? '#ffffff' : '#64748b',
                  }}
                >
                  Today
                </span>
                <span
                  onClick={() => handleDatePreset('all')}
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: radii.sm,
                    cursor: 'pointer',
                    fontWeight: 700,
                    backgroundColor: datePreset === 'all' ? '#0284c7' : '#f1f5f9',
                    color: datePreset === 'all' ? '#ffffff' : '#64748b',
                  }}
                >
                  All
                </span>
              </div>
            </div>
            <input
              type="date"
              value={dodFilter}
              onChange={(e) => {
                setDodFilter(e.target.value);
                setDatePreset('custom');
                if (isHybrid) {
                  dispatch('filterChange', { field: 'DOD', value: e.target.value });
                  dispatch('search');
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                color: colors.textMain,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Attending Doctor */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Attending Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => handleDoctorChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                color: colors.textMain,
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="-1">All Doctors</option>
              {doctors.map((doc: any) => {
                const docId = doc.Id || doc.DoctorId;
                const docName =
                  doc.Name ||
                  doc.DoctorName ||
                  doc.Text ||
                  `${doc.Title?.Description || ''} ${doc.FirstName || ''} ${doc.LastName || ''}`.trim();
                return (
                  <option key={docId} value={docId}>
                    {docName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid #f1f5f9`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Toggle Flagged MRD button */}
            <button
              type="button"
              onClick={() => setFilterIncompleteOnly(!filterIncompleteOnly)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: radii.md,
                border: `1px solid ${filterIncompleteOnly ? '#f59e0b' : colors.border}`,
                backgroundColor: filterIncompleteOnly ? '#fef3c7' : '#ffffff',
                color: filterIncompleteOnly ? '#92400e' : colors.textMain,
                cursor: 'pointer',
              }}
            >
              <i className="fa fa-filter" />
              <span>{filterIncompleteOnly ? 'Showing: Incomplete MRD Only' : 'Filter Incomplete MRD'}</span>
              {kpiStats.incomplete > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: radii.full,
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {kpiStats.incomplete}
                </span>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <i className="fa fa-undo" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleSearchSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: radii.md,
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              <i className="fa fa-search" />
              <span>Search Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MRD File Returns Table Card ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
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
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <th style={{ padding: '14px 16px', width: 50, textAlign: 'center' }}>#</th>
                <th style={{ padding: '14px 16px' }}>Admission / Discharge</th>
                <th style={{ padding: '14px 16px' }}>Visit No</th>
                <th style={{ padding: '14px 16px' }}>Patient ID</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>Ward / Bed Location</th>
                <th style={{ padding: '14px 16px' }}>Attending Doctor</th>
                <th style={{ padding: '14px 16px' }}>Payer / Guarantor</th>
                <th style={{ padding: '14px 16px' }}>MRD Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-circle-o-notch fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Loading MRD File Records...</div>
                  </td>
                </tr>
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-folder-open-o fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      No MRD File Returns Found
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      All discharged patient case records for this period have already been dispatched to MRD.
                    </div>
                  </td>
                </tr>
              ) : (
                displayItems.map((item, index) => {
                  const p = item.Patient;
                  const fullName = `${p?.Title?.Description || ''} ${p?.FirstName || ''} ${p?.LastName || ''}`.trim() || 'Patient';
                  const initials = fullName
                    .replace(/^(Mr|Mrs|Ms|Master|Dr|Prof)\.?\s+/i, '')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0].toUpperCase())
                    .join('') || 'PT';

                  const wardDetails =
                    [item.WardMaster?.WardName, item.WardRoomMaster?.RoomNo, item.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / ') || 'General Ward';

                  const docName = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim() || 'Consultant';

                  const isIncomplete = Boolean(item.IsIncompleteMRD);

                  return (
                    <tr
                      key={item.Id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: isIncomplete ? '#fffbeb' : index % 2 === 0 ? '#ffffff' : '#fcfcfd',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = isIncomplete ? '#fffbeb' : index % 2 === 0 ? '#ffffff' : '#fcfcfd')
                      }
                    >
                      {/* Serial Index */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: colors.textMuted, fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* Admission & Discharge Timestamps */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>
                          {formatDateTime(item.AdmissionDate)}
                        </div>
                        {item.DischargeDate && (
                          <div style={{ fontSize: 11, color: '#166534', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa fa-sign-out" />
                            <span>DOD: {formatDateTime(item.DischargeDate)}</span>
                          </div>
                        )}
                      </td>

                      {/* Visit No / IP Identifier */}
                      <td style={{ padding: '14px 16px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: 12,
                          }}
                        >
                          <i className="fa fa-hospital-o" />
                          <span>{item.VisitIdentifier || '—'}</span>
                        </div>
                      </td>

                      {/* Patient ID (MRN) */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0284c7',
                            fontSize: 12,
                          }}
                        >
                          {p?.MRN || '—'}
                        </span>
                      </td>

                      {/* Patient Details & Avatar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.full,
                              backgroundColor: isIncomplete ? '#fef3c7' : '#e0f2fe',
                              color: isIncomplete ? '#b45309' : '#0369a1',
                              fontWeight: 700,
                              fontSize: 11,
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
                              onClick={() => handleOpenPatientProfile(item)}
                              title="Click to view Patient Profile"
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
                              {p?.Age ? `${p.Age} Y` : ''} {p?.Gender?.Description ? `/ ${p.Gender.Description}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ward & Bed Location */}
                      <td style={{ padding: '14px 16px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <i className="fa fa-bed" style={{ color: '#0284c7' }} />
                          <span>{wardDetails}</span>
                        </div>
                      </td>

                      {/* Attending Doctor & Department */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>{docName}</div>
                        {item.Department?.DepartmentName && (
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                            {item.Department.DepartmentName}
                          </div>
                        )}
                      </td>

                      {/* Payer / Guarantor */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {item.Guarantor?.GuarantorName || 'Self / Cash'}
                        </div>
                      </td>

                      {/* MRD Status / Incomplete Alert */}
                      <td style={{ padding: '14px 16px' }}>
                        {isIncomplete ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: radii.full,
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                            title="Documentation flagged as incomplete before MRD archiving"
                          >
                            <i className="fa fa-exclamation-triangle" />
                            <span>Incomplete MRD</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: radii.full,
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <i className="fa fa-check" />
                            <span>{item.AdmissionStatus?.Description || 'Discharged'}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* Send to MRD Button */}
                          <button
                            type="button"
                            onClick={() => setSendMrdModalItem(item)}
                            title="Dispatch patient record file to MRD"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '6px 12px',
                              borderRadius: radii.md,
                              border: 'none',
                              backgroundColor: '#1e40af',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(30, 64, 175, 0.25)',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e40af')}
                          >
                            <i className="fa fa-share-square-o" />
                            <span>Send to MRD</span>
                          </button>

                          {/* Quick Profile View */}
                          <button
                            type="button"
                            onClick={() => handleOpenPatientProfile(item)}
                            title="View Patient Record Profile"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.md,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="fa fa-id-card-o" />
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
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Showing <strong>{displayItems.length}</strong> of <strong>{totalItems}</strong> MRD file records
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Send To MRD Confirmation Modal ── */}
      {sendMrdModalItem && (
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
          onClick={() => !isSendingMrd && setSendMrdModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.xl,
              boxShadow: shadows.xl,
              maxWidth: 540,
              width: '100%',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radii.md,
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}
                >
                  <i className="fa fa-archive" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                    Confirm Send to MRD
                  </h3>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>
                    Physical Inpatient Record File Transfer
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendMrdModalItem(null)}
                disabled={isSendingMrd}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: colors.textMuted,
                  cursor: 'pointer',
                }}
              >
                <i className="fa fa-times" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {sendMrdModalItem.Patient?.Title?.Description} {sendMrdModalItem.Patient?.FirstName} {sendMrdModalItem.Patient?.LastName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                  <span>
                    <strong>MRN:</strong> {sendMrdModalItem.Patient?.MRN || '—'}
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong>Visit:</strong> {sendMrdModalItem.VisitIdentifier}
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong>Age/Gender:</strong> {sendMrdModalItem.Patient?.Age}Y/{sendMrdModalItem.Patient?.Gender?.Description}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#334155', lineHeight: '1.6', marginBottom: 14 }}>
                Are you sure you want to dispatch this patient’s physical record chart to the{' '}
                <strong>Medical Record Department (MRD)</strong>?
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: radii.md,
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: 12,
                }}
              >
                <i className="fa fa-info-circle" style={{ marginRight: 6 }} />
                <span>
                  The file status will be marked as <strong>'Return to MRD'</strong> with timestamp and logged under your user ID.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
              }}
            >
              <button
                type="button"
                onClick={() => setSendMrdModalItem(null)}
                disabled={isSendingMrd}
                style={{
                  padding: '8px 16px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: '#ffffff',
                  color: colors.textMain,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSendToMrd}
                disabled={isSendingMrd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 20px',
                  borderRadius: radii.md,
                  border: 'none',
                  backgroundColor: '#1e40af',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSendingMrd ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(30, 64, 175, 0.25)',
                }}
              >
                {isSendingMrd ? (
                  <>
                    <i className="fa fa-circle-o-notch fa-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <i className="fa fa-paper-plane" />
                    <span>Confirm & Send to MRD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone Patient Profile Modal ── */}
      {profileModalPatientId !== null && (
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
          onClick={() => setProfileModalPatientId(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 900 }}>
            <PatientProfileModal
              patientId={profileModalPatientId}
              initialData={profileModalData}
              onClose={() => setProfileModalPatientId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
