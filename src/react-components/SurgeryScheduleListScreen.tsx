import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface SurgeryScheduleItem {
  Id: number;
  OTScheduledOn?: string;
  StartTime?: string;
  EndTime?: string;
  SurgeryName?: string;
  PatientId?: number;
  EncouterId?: number;
  EncounterId?: number;
  Encounter?: {
    VisitIdentifier?: string;
    [key: string]: any;
  };
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string };
    [key: string]: any;
  };
  Doctor?: {
    Id?: number;
    DoctorId?: number;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Speciality?: string;
    [key: string]: any;
  };
  SurgeryRoomMaster?: {
    Id?: number;
    Name?: string;
    Code?: string;
    [key: string]: any;
  };
  Diagnosis?: {
    DiagnosisName?: string;
    Code?: string;
    [key: string]: any;
  };
  Priority?: {
    Id?: number;
    Description?: string;
    [key: string]: any;
  };
  PriorityId?: number;
  OTScheduleStatusId?: number;
  OTScheduleStatus?: {
    Id?: number;
    Description?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  Name?: string;
  [key: string]: any;
}

export interface SurgeryScheduleListScreenProps {
  reactProps?: {
    items?: SurgeryScheduleItem[];
    lookup?: {
      Doctor?: LookupOption[];
      SurgeryRoom?: LookupOption[];
      OTScheduleStatus?: LookupOption[];
      SurgeryType?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      FacilityId?: number;
      OTScheduleStatusId?: any;
      OTRoomId?: number | string;
      DoctorId?: number | string;
      patientnamemrn?: string;
      SurgeryName?: string;
      FromDate?: string;
      ToDate?: string;
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

export const SurgeryScheduleListScreen: React.FC<SurgeryScheduleListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone state
  const [standaloneItems, setStandaloneItems] = useState<SurgeryScheduleItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [doctorList, setDoctorList] = useState<LookupOption[]>([]);
  const [roomList, setRoomList] = useState<LookupOption[]>([]);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.patientnamemrn || ''
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>(
    reactProps?.currentfilter?.DoctorId ?? -1
  );
  const [selectedRoomId, setSelectedRoomId] = useState<number | string>(
    reactProps?.currentfilter?.OTRoomId ?? -1
  );
  const [selectedStatusId, setSelectedStatusId] = useState<any>(
    reactProps?.currentfilter?.OTScheduleStatusId ?? 'all'
  );

  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(
    reactProps?.currentfilter?.FromDate
      ? reactProps.currentfilter.FromDate.split('T')[0]
      : getTodayISO()
  );
  const [toDate, setToDate] = useState<string>(
    reactProps?.currentfilter?.ToDate
      ? reactProps.currentfilter.ToDate.split('T')[0]
      : getTodayISO()
  );

  // Patient Profile Modal
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState<boolean>(false);

  // Cancel Confirmation Modal
  const [cancelScheduleItem, setCancelScheduleItem] = useState<SurgeryScheduleItem | null>(null);

  // Sync from reactProps in hybrid mode
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.patientnamemrn !== undefined) {
        setSearchTerm(reactProps.currentfilter.patientnamemrn || '');
      }
      if (reactProps.currentfilter.DoctorId !== undefined) {
        setSelectedDoctorId(reactProps.currentfilter.DoctorId ?? -1);
      }
      if (reactProps.currentfilter.OTRoomId !== undefined) {
        setSelectedRoomId(reactProps.currentfilter.OTRoomId ?? -1);
      }
      if (reactProps.currentfilter.OTScheduleStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.OTScheduleStatusId ?? 'all');
      }
      if (reactProps.currentfilter.FromDate) {
        setFromDate(reactProps.currentfilter.FromDate.split('T')[0]);
      }
      if (reactProps.currentfilter.ToDate) {
        setToDate(reactProps.currentfilter.ToDate.split('T')[0]);
      }
    }
  }, [reactProps?.currentfilter]);

  // Standalone: fetch lookups
  const fetchLookups = useCallback(async () => {
    if (isHybrid) return;
    try {
      const facilityId = sessionHelper.getCurrentFacilityId();
      const res = await apiFetch<any>('General/Options/getoptions', {
        method: 'POST',
        data: [
          { Key: 'OTScheduleStatus' },
          { Key: 'SurgeryType' },
          { Key: 'SurgeryRoom' },
          {
            Key: 'Doctor',
            Request: {
              Params: [
                { Key: 3, Value: 2 },
                { Key: 5, Value: 2 },
                { Key: 12, Value: true },
                { Key: 2, Value: [-1, facilityId] },
              ],
            },
          },
        ],
      });
      if (res?.data || res) {
        const data = res.data || res;
        if (data.Doctor) setDoctorList(data.Doctor);
        if (data.SurgeryRoom) setRoomList(data.SurgeryRoom);
        if (data.OTScheduleStatus) setStatusList(data.OTScheduleStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch standalone lookups for SurgeryScheduleListScreen:', err);
    }
  }, [isHybrid]);

  // Standalone: fetch grid data
  const fetchStandaloneList = useCallback(
    async (page: number = 1, pageSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        const fromFormatted = fromDate ? `${fromDate} 00:00:00` : null;
        const toFormatted = toDate ? `${toDate} 23:59:59` : null;
        const statusVal = selectedStatusId === 'all' ? -1 : selectedStatusId;

        const payload = {
          Params: [
            { Key: 17, Value: selectedRoomId === -1 ? -1 : selectedRoomId },
            { Key: 2, Value: statusVal },
            { Key: 7, Value: selectedDoctorId === -1 ? -1 : selectedDoctorId },
            { Key: 5, Value: searchTerm || null },
            { Key: 8, Value: null },
            { Key: 10, Value: fromFormatted },
            { Key: 11, Value: toFormatted },
            { Key: 18, Value: false },
          ],
          PageContext: {
            PageSize: pageSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('OtManagement/OtSchedule/GetOtSchedules', {
          method: 'POST',
          data: payload,
        });

        const list = res?.Data || res?.data?.Data || [];
        const total = res?.PageContext?.TotalRecords || res?.data?.PageContext?.TotalRecords || 0;
        setStandaloneItems(list);
        setStandaloneTotal(total);
        setStandalonePage(page);
        setStandalonePageSize(pageSize);
      } catch (err) {
        console.error('Failed to fetch standalone surgery schedule list:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, fromDate, toDate, selectedStatusId, selectedRoomId, selectedDoctorId, searchTerm]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchStandaloneList(1, 25);
    }
  }, [isHybrid, fetchLookups, fetchStandaloneList]);

  // Derived effective data
  const items: SurgeryScheduleItem[] = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems: number = isHybrid
    ? reactProps?.pager?.totalItems || 0
    : standaloneTotal;
  const currentPage: number = isHybrid
    ? reactProps?.pager?.currentPage || 1
    : standalonePage;
  const pageSize: number = isHybrid
    ? reactProps?.pager?.pageSize || 25
    : standalonePageSize;

  const doctors: LookupOption[] = isHybrid
    ? reactProps?.lookup?.Doctor || []
    : doctorList;
  const rooms: LookupOption[] = isHybrid
    ? reactProps?.lookup?.SurgeryRoom || []
    : roomList;
  const statuses: LookupOption[] = isHybrid
    ? reactProps?.lookup?.OTScheduleStatus || []
    : statusList;

  // KPI Calculations
  const kpiStats = useMemo(() => {
    let scheduled = 0;
    let draft = 0;
    let cancelled = 0;
    let other = 0;

    items.forEach((it) => {
      const sid = it.OTScheduleStatusId;
      const desc = (it.OTScheduleStatus?.Description || '').toLowerCase();
      if (sid === 2 || desc.includes('sched')) {
        scheduled++;
      } else if (sid === 1 || desc.includes('draft')) {
        draft++;
      } else if (sid === 3 || desc.includes('cancel')) {
        cancelled++;
      } else {
        other++;
      }
    });

    return {
      total: totalItems || items.length,
      scheduled,
      draft,
      cancelled,
    };
  }, [items, totalItems]);

  // Trigger search / filters
  const applyFilters = () => {
    const statusVal = selectedStatusId === 'all' ? -1 : selectedStatusId;
    if (isHybrid && onAction) {
      onAction('updateFilter', {
        patientnamemrn: searchTerm,
        DoctorId: selectedDoctorId,
        OTRoomId: selectedRoomId,
        OTScheduleStatusId: statusVal,
        FromDate: fromDate,
        ToDate: toDate,
      });
    } else {
      fetchStandaloneList(1, pageSize);
    }
  };

  const handleResetFilters = () => {
    const today = getTodayISO();
    setSearchTerm('');
    setSelectedDoctorId(-1);
    setSelectedRoomId(-1);
    setSelectedStatusId('all');
    setFromDate(today);
    setToDate(today);

    if (isHybrid && onAction) {
      onAction('updateFilter', {
        patientnamemrn: '',
        DoctorId: -1,
        OTRoomId: -1,
        OTScheduleStatusId: -1,
        FromDate: today,
        ToDate: today,
      });
    } else {
      setTimeout(() => fetchStandaloneList(1, pageSize), 0);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isHybrid && onAction) {
      onAction('changePage', newPage);
    } else {
      fetchStandaloneList(newPage, pageSize);
    }
  };

  // Actions
  const handleAddNew = () => {
    if (isHybrid && onAction) {
      onAction('addNew');
    } else {
      window.location.hash = '#/appsurgerymanagement/surgeryscheduleform';
    }
  };

  const handleGoCalendar = () => {
    window.location.hash = '#/app/surgeryschedulecalendar';
  };

  const handleBackToDashboard = () => {
    if (isHybrid && onAction) {
      onAction('backtoList');
    } else {
      window.location.hash = '#/app/surgerydashboard/';
    }
  };

  const handlePrint = () => {
    if (isHybrid && onAction) {
      onAction('print');
    } else {
      window.print();
    }
  };

  const handleEdit = (item: SurgeryScheduleItem) => {
    if (isHybrid && onAction) {
      onAction('view', item);
    } else {
      window.location.hash = `#/appsurgerymanagement/surgeryscheduleform?id=${item.Id}&pid=${item.PatientId || ''}&eid=${item.EncouterId || item.EncounterId || ''}`;
    }
  };

  const handleOpenCancelModal = (item: SurgeryScheduleItem) => {
    setCancelScheduleItem(item);
  };

  const handleConfirmCancel = () => {
    if (!cancelScheduleItem) return;
    if (isHybrid && onAction) {
      onAction('cancel', cancelScheduleItem);
    } else {
      alert(`Schedule #${cancelScheduleItem.Id} cancelled.`);
    }
    setCancelScheduleItem(null);
  };

  const handleOpenPatientProfile = (patientId?: number) => {
    if (patientId) {
      setSelectedPatientId(patientId);
      setIsPatientModalOpen(true);
    }
  };

  // Helper formatting
  const formatDateBadge = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeSpan = (start?: string, end?: string) => {
    if (!start && !end) return '';
    return `${start || '--:--'} - ${end || '--:--'}`;
  };

  const getStatusBadgeStyle = (statusId?: number, desc?: string) => {
    const text = (desc || '').toLowerCase();
    if (statusId === 2 || text.includes('sched')) {
      return {
        bg: '#ecfdf5',
        color: '#059669',
        border: '#a7f3d0',
        label: desc || 'Scheduled',
        icon: 'fa-check-circle',
      };
    }
    if (statusId === 1 || text.includes('draft')) {
      return {
        bg: '#eff6ff',
        color: '#2563eb',
        border: '#bfdbfe',
        label: desc || 'Draft',
        icon: 'fa-pencil-square-o',
      };
    }
    if (statusId === 3 || text.includes('cancel')) {
      return {
        bg: '#fef2f2',
        color: '#dc2626',
        border: '#fecaca',
        label: desc || 'Cancelled',
        icon: 'fa-times-circle',
      };
    }
    if (text.includes('confirm')) {
      return {
        bg: '#f5f3ff',
        color: '#7c3aed',
        border: '#ddd6fe',
        label: desc || 'Confirmed',
        icon: 'fa-check-square-o',
      };
    }
    return {
      bg: '#f8fafc',
      color: '#475569',
      border: '#e2e8f0',
      label: desc || 'Pending',
      icon: 'fa-clock-o',
    };
  };

  const getPriorityBadgeStyle = (priorityId?: number, desc?: string) => {
    const text = (desc || '').toLowerCase();
    if (priorityId === 1 || text.includes('high') || text.includes('emerg')) {
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5', label: desc || 'High Priority' };
    }
    if (priorityId === 2 || text.includes('med') || text.includes('urg')) {
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: desc || 'Medium' };
    }
    return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: desc || 'Routine' };
  };

  return (
    <div
      style={{
        padding: spacing.xl,
        backgroundColor: colors.background,
        minHeight: '100vh',
        fontFamily: typography.fontFamily,
        color: colors.textPrimary,
      }}
    >
      {/* ─── Top Header & Primary Actions ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.xl,
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              backgroundColor: '#eff6ff',
              borderRadius: radii.full,
              marginBottom: 8,
              border: '1px solid #bfdbfe',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: '#1d4ed8',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              Operating Theatre Management • Schedule Registry
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
              }}
            >
              <i className="fa fa-calendar-check-o" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: typography.fontWeight.bold,
                  margin: 0,
                  color: colors.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                Surgery Schedules
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  margin: '4px 0 0 0',
                }}
              >
                Comprehensive OT booking workstation, clinical team allocations, and surgical list monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Group */}
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBackToDashboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: shadows.sm,
            }}
          >
            <i className="fa fa-th-large" style={{ color: '#64748b' }} />
            Dashboard
          </button>

          <button
            type="button"
            onClick={handleGoCalendar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: radii.md,
              border: '1px solid #bfdbfe',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: 13,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa fa-calendar" />
            Calendar View
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: shadows.sm,
            }}
          >
            <i className="fa fa-print" style={{ color: '#475569' }} />
            Print Schedule
          </button>

          <button
            type="button"
            onClick={handleAddNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: radii.md,
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa fa-plus" />
            + Schedule Surgery
          </button>
        </div>
      </div>

      {/* ─── KPI Metric Cards ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        {/* Total Bookings */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: '20px 24px',
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: typography.fontWeight.semibold, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total OT Bookings
            </div>
            <div style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: '#0f172a', marginTop: 4 }}>
              {kpiStats.total}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Across all operating theatres
            </div>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-list-alt" />
          </div>
        </div>

        {/* Scheduled / Confirmed */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: '20px 24px',
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: typography.fontWeight.semibold, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Scheduled Active
            </div>
            <div style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: '#059669', marginTop: 4 }}>
              {kpiStats.scheduled}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Ready for surgical execution
            </div>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-check-circle-o" />
          </div>
        </div>

        {/* Draft / Pending */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: '20px 24px',
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: typography.fontWeight.semibold, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Draft / In-Preparation
            </div>
            <div style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: '#d97706', marginTop: 4 }}>
              {kpiStats.draft}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Awaiting PAC or team assignment
            </div>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-pencil-square-o" />
          </div>
        </div>

        {/* Cancelled / Rescheduled */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: '20px 24px',
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: typography.fontWeight.semibold, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Cancelled / Archived
            </div>
            <div style={{ fontSize: 28, fontWeight: typography.fontWeight.bold, color: '#dc2626', marginTop: 4 }}>
              {kpiStats.cancelled}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Released theatre slots
            </div>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-times-circle-o" />
          </div>
        </div>
      </div>

      {/* ─── Modern Filter & Search Bar ──────────────────────────────────── */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: '20px 24px',
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.xl,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-filter" style={{ color: '#2563eb', fontSize: 15 }} />
            <span style={{ fontSize: 14, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
              Search & Filter Criteria
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 12.5,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <i className="fa fa-refresh" /> Reset Filters
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient Search */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
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
                  fontSize: 13,
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters();
                }}
                placeholder="Search patient name or MRN..."
                style={{
                  width: '100%',
                  height: 38,
                  padding: '6px 32px 6px 34px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setTimeout(applyFilters, 0);
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* From Date */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '6px 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* To Date */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '6px 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* Surgeon Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Surgeon / Specialist
            </label>
            <select
              value={selectedDoctorId ?? -1}
              onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
              style={{
                width: '100%',
                height: 38,
                padding: '6px 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value={-1}>All Surgeons</option>
              {doctors.map((doc) => (
                <option key={doc.Id} value={doc.Id}>
                  {doc.Text || doc.Description || `${doc.FirstName || ''} ${doc.LastName || ''}`}
                </option>
              ))}
            </select>
          </div>

          {/* OT Room Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Surgery Room / OT
            </label>
            <select
              value={selectedRoomId ?? -1}
              onChange={(e) => setSelectedRoomId(Number(e.target.value))}
              style={{
                width: '100%',
                height: 38,
                padding: '6px 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value={-1}>All OT Rooms</option>
              {rooms.map((rm) => (
                <option key={rm.Id} value={rm.Id}>
                  {rm.Text || rm.Name || rm.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: typography.fontWeight.semibold,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Schedule Status
            </label>
            <select
              value={selectedStatusId ?? 'all'}
              onChange={(e) => setSelectedStatusId(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '6px 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="all">All Statuses</option>
              {statuses.map((st) => (
                <option key={st.Id} value={st.Id}>
                  {st.Text || st.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Apply Button */}
          <div>
            <button
              type="button"
              onClick={applyFilters}
              style={{
                width: '100%',
                height: 38,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: radii.md,
                fontWeight: typography.fontWeight.semibold,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              <i className="fa fa-search" /> Filter Records
            </button>
          </div>
        </div>
      </div>

      {/* ─── Surgery Schedules Data Table ─────────────────────────────────── */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
          marginBottom: spacing.xl,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: `2px solid ${colors.border}`,
                }}
              >
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569', width: 50 }}>
                  #
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Schedule Date & Time
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Visit Identifier
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Patient Information
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Operating Theatre
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Chief Surgeon
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Diagnosis / Note
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Priority
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontWeight: typography.fontWeight.bold, color: '#475569', textAlign: 'center' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                    <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: 12 }} />
                    <div>Loading surgery schedules...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 56, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 32, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: 28, color: '#cbd5e1' }}>
                      <i className="fa fa-calendar-times-o" />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: typography.fontWeight.semibold, color: '#475569', marginBottom: 4 }}>
                      No Surgery Schedules Found
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 440, margin: '0 auto 20px auto' }}>
                      No operating theatre schedules match the selected filters. Try broadening your date range or click below to schedule a new surgery.
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNew}
                      style={{
                        padding: '8px 20px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: radii.md,
                        fontSize: 13,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'pointer',
                      }}
                    >
                      + Schedule New Surgery
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const statusStyle = getStatusBadgeStyle(item.OTScheduleStatusId, item.OTScheduleStatus?.Description);
                  const priorityStyle = getPriorityBadgeStyle(item.PriorityId, item.Priority?.Description);
                  const p = item.Patient;
                  const patientFullName = p
                    ? `${p.Title?.Description ? p.Title.Description + ' ' : ''}${p.FirstName || ''} ${p.LastName || ''}`.trim()
                    : '-';
                  const doc = item.Doctor;
                  const doctorFullName = doc
                    ? `${doc.Title?.Description ? doc.Title.Description + ' ' : ''}${doc.FirstName || ''} ${doc.LastName || ''}`.trim()
                    : '-';
                  const timeRange = formatTimeSpan(item.StartTime, item.EndTime);

                  return (
                    <tr
                      key={item.Id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfe',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfdfe')}
                    >
                      {/* S.No */}
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: typography.fontWeight.medium }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Schedule Date & Time */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontWeight: typography.fontWeight.semibold, color: '#0f172a' }}>
                            <i className="fa fa-calendar-o" style={{ marginRight: 6, color: '#3b82f6' }} />
                            {formatDateBadge(item.OTScheduledOn)}
                          </span>
                          {timeRange && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: radii.sm,
                                fontSize: 11.5,
                                color: '#475569',
                                width: 'fit-content',
                              }}
                            >
                              <i className="fa fa-clock-o" style={{ color: '#2563eb' }} /> {timeRange}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Visit Identifier */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: radii.sm,
                            fontSize: 12,
                            fontWeight: typography.fontWeight.semibold,
                            color: '#1d4ed8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {item.Encounter?.VisitIdentifier || item.EncouterId || '-'}
                        </span>
                      </td>

                      {/* Patient Information */}
                      <td style={{ padding: '14px 16px' }}>
                        {p ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                backgroundColor: '#dbeafe',
                                color: '#1d4ed8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: typography.fontWeight.bold,
                                fontSize: 13,
                                flexShrink: 0,
                              }}
                            >
                              {(p.FirstName?.[0] || 'P').toUpperCase()}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenPatientProfile(p.Id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: '#1d4ed8',
                                  fontWeight: typography.fontWeight.bold,
                                  fontSize: 13,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                {patientFullName}
                              </button>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, fontSize: 11.5, color: '#64748b' }}>
                                <span>MRN: <strong style={{ color: '#0f172a' }}>{p.MRN || '-'}</strong></span>
                                <span>•</span>
                                <span>{p.Age ? `${p.Age}y` : '-'} / {p.Gender?.Description || '-'}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Operating Theatre */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: radii.md,
                            fontSize: 12.5,
                            fontWeight: typography.fontWeight.semibold,
                            color: '#334155',
                          }}
                        >
                          <i className="fa fa-hospital-o" style={{ color: '#3b82f6' }} />
                          {item.SurgeryRoomMaster?.Name || 'General OT'}
                        </span>
                      </td>

                      {/* Chief Surgeon */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 8px',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: radii.sm,
                              fontSize: 12.5,
                              fontWeight: typography.fontWeight.semibold,
                              color: '#166534',
                            }}
                          >
                            <i className="fa fa-user-md" />
                            {doctorFullName}
                          </span>
                        </div>
                      </td>

                      {/* Diagnosis / Notes */}
                      <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                        <div style={{ fontSize: 12.5, color: '#0f172a', fontWeight: typography.fontWeight.medium }}>
                          {item.Diagnosis?.DiagnosisName || item.SurgeryName || '-'}
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            fontSize: 11.5,
                            fontWeight: typography.fontWeight.semibold,
                            backgroundColor: priorityStyle.bg,
                            color: priorityStyle.color,
                            border: `1px solid ${priorityStyle.border}`,
                          }}
                        >
                          {priorityStyle.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: radii.full,
                            fontSize: 11.5,
                            fontWeight: typography.fontWeight.semibold,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          <i className={`fa ${statusStyle.icon}`} />
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            title="Edit / View Surgery Schedule"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.sm,
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <i className="fa fa-pencil" />
                          </button>

                          {item.OTScheduleStatusId === 1 && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(item)}
                              title="Cancel Schedule Slot"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: radii.sm,
                                border: '1px solid #fecaca',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <i className="fa fa-times" />
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

        {/* ─── Pagination Footer ────────────────────────────────────────── */}
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
          <div style={{ fontSize: 13, color: colors.textSecondary }}>
            Showing{' '}
            <strong style={{ color: colors.textPrimary }}>
              {items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong style={{ color: colors.textPrimary }}>
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            of <strong style={{ color: colors.textPrimary }}>{totalItems}</strong> schedules
          </div>

          <Pagination
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ─── Cancel Confirmation Modal ────────────────────────────────────── */}
      {cancelScheduleItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.lg,
              width: '90%',
              maxWidth: 440,
              padding: 24,
              boxShadow: shadows.xl,
              border: '1px solid #cbd5e1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <i className="fa fa-exclamation-triangle" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: typography.fontWeight.bold, color: '#0f172a' }}>
                  Cancel Surgery Schedule
                </h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Schedule #{cancelScheduleItem.Id}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to cancel the scheduled surgery for{' '}
              <strong style={{ color: '#0f172a' }}>
                {cancelScheduleItem.Patient?.FirstName} {cancelScheduleItem.Patient?.LastName}
              </strong>
              ? This will release the allocated theatre slot.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelScheduleItem(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                }}
              >
                Keep Schedule
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                style={{
                  padding: '8px 18px',
                  borderRadius: radii.md,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="fa fa-times" /> Cancel Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Patient Profile Modal ────────────────────────────────────────── */}
      {isPatientModalOpen && selectedPatientId && (
        <PatientProfileModal
          isOpen={isPatientModalOpen}
          patientId={selectedPatientId}
          onClose={() => {
            setIsPatientModalOpen(false);
            setSelectedPatientId(null);
          }}
        />
      )}
    </div>
  );
};
