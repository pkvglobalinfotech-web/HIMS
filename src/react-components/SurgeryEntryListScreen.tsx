import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface SurgeryEntryItem {
  Id: number;
  SurgeryStartedate?: string;
  SurgeryEndDate?: string;
  SurgeryIdentifier?: string;
  OTIdentifier?: string;
  PatientId?: number;
  EncounterId?: number;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string };
  };
  WardMaster?: { WardName?: string };
  WardRoomMaster?: { RoomNo?: string };
  WardRoomBedMaster?: { BedNo?: string };
  ChiefSurgeon?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  Anaesthesist?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  SurgeryRoomMaster?: { Name?: string };
  SurgeryEntryStatusId?: number;
  SurgeryEntryStatus?: {
    Id?: number;
    Description?: string;
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

export interface SurgeryEntryListScreenProps {
  reactProps?: {
    items?: SurgeryEntryItem[];
    lookup?: {
      Doctor?: LookupOption[];
      SurgeryRoom?: LookupOption[];
      SurgeryEntryStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      PatientNameMRN?: string;
      ChiefSurgeonId?: number | string;
      SurgeryRoomId?: number | string;
      SurgeryEntryStatusId?: any;
      otregisteredon?: string;
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

export const SurgeryEntryListScreen: React.FC<SurgeryEntryListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone state
  const [standaloneItems, setStandaloneItems] = useState<SurgeryEntryItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [doctorList, setDoctorList] = useState<LookupOption[]>([]);
  const [roomList, setRoomList] = useState<LookupOption[]>([]);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.PatientNameMRN || ''
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>(
    reactProps?.currentfilter?.ChiefSurgeonId ?? -1
  );
  const [selectedRoomId, setSelectedRoomId] = useState<number | string>(
    reactProps?.currentfilter?.SurgeryRoomId ?? -1
  );
  const [selectedStatusId, setSelectedStatusId] = useState<number | string>(
    reactProps?.currentfilter?.SurgeryEntryStatusId ?? 1
  );
  const [surgeryDateFilter, setSurgeryDateFilter] = useState<string>(() => {
    if (reactProps?.currentfilter?.otregisteredon) {
      const d = reactProps.currentfilter.otregisteredon;
      return typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  // Modals
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Sync hybrid filters
  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientNameMRN !== undefined) {
        setSearchTerm(reactProps.currentfilter.PatientNameMRN);
      }
      if (reactProps.currentfilter.ChiefSurgeonId !== undefined) {
        setSelectedDoctorId(reactProps.currentfilter.ChiefSurgeonId);
      }
      if (reactProps.currentfilter.SurgeryRoomId !== undefined) {
        setSelectedRoomId(reactProps.currentfilter.SurgeryRoomId);
      }
      if (reactProps.currentfilter.SurgeryEntryStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.SurgeryEntryStatusId);
      }
      if (reactProps.currentfilter.otregisteredon) {
        const d = reactProps.currentfilter.otregisteredon;
        setSurgeryDateFilter(typeof d === 'string' ? d.split('T')[0] : surgeryDateFilter);
      }
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Standalone lookup fetch
  const fetchLookups = useCallback(async () => {
    try {
      const facilityId = sessionHelper.getFacilityId() || 1;
      const res = await apiFetch<any>('General/Options/getoptions', [
        {
          Key: 'Doctor',
          Request: { Params: [{ Key: 2, Value: [-1, facilityId] }] },
        },
        { Key: 'SurgeryRoom' },
        { Key: 'SurgeryEntryStatus' },
      ]);
      if (res) {
        if (res.Doctor) setDoctorList(res.Doctor);
        if (res.SurgeryRoom) setRoomList(res.SurgeryRoom);
        if (res.SurgeryEntryStatus) setStatusList(res.SurgeryEntryStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch lookups in SurgeryEntryListScreen:', err);
    }
  }, []);

  // Standalone item fetch
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        const fromDate = surgeryDateFilter ? `${surgeryDateFilter} 00:00:00` : null;
        const toDate = surgeryDateFilter ? `${surgeryDateFilter} 23:59:59` : null;

        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm || null },
            { Key: 3, Value: selectedStatusId === -1 ? null : selectedStatusId },
            { Key: 5, Value: selectedDoctorId === -1 ? null : selectedDoctorId },
            { Key: 11, Value: selectedRoomId === -1 ? null : selectedRoomId },
            { Key: 16, Value: fromDate },
            { Key: 17, Value: toDate },
            { Key: 19, Value: false },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('OtManagement/SurgeryEntry/GetSurgeryEntrys', inputData);
        if (res) {
          setStandaloneItems(res.Data || []);
          setStandaloneTotal(res.PageContext?.TotalRecords || 0);
        }
      } catch (err) {
        console.error('Failed to fetch surgery entries:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, searchTerm, selectedDoctorId, selectedRoomId, selectedStatusId, surgeryDateFilter]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchItems(standalonePage, standalonePageSize);
    }
  }, [isHybrid, fetchLookups, fetchItems, standalonePage, standalonePageSize]);

  // Derived effective data
  const rawItems = isHybrid ? reactProps?.items || [] : standaloneItems;
  const doctors = isHybrid ? reactProps?.lookup?.Doctor || [] : doctorList;
  const rooms = isHybrid ? reactProps?.lookup?.SurgeryRoom || [] : roomList;
  const statuses = isHybrid ? reactProps?.lookup?.SurgeryEntryStatus || [] : statusList;
  const totalItems = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  // Stats calculation
  const stats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    let inProgress = 0;
    rawItems.forEach((item) => {
      const sId = item.SurgeryEntryStatusId;
      if (sId === 1) scheduled++;
      else if (sId === 2) inProgress++;
      else if (sId === 3) completed++;
    });
    return {
      total: totalItems,
      pageCount: rawItems.length,
      scheduled,
      inProgress,
      completed,
    };
  }, [rawItems, totalItems]);

  const handleSearchCommit = () => {
    if (isHybrid) {
      dispatch('updateFilter', { PatientNameMRN: searchTerm });
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleDoctorChange = (val: number | string) => {
    setSelectedDoctorId(val);
    if (isHybrid) {
      dispatch('updateFilter', { ChiefSurgeonId: val });
    } else {
      setStandalonePage(1);
    }
  };

  const handleRoomChange = (val: number | string) => {
    setSelectedRoomId(val);
    if (isHybrid) {
      dispatch('updateFilter', { SurgeryRoomId: val });
    } else {
      setStandalonePage(1);
    }
  };

  const handleStatusChange = (val: number | string) => {
    setSelectedStatusId(val);
    if (isHybrid) {
      dispatch('updateFilter', { SurgeryEntryStatusId: val });
    } else {
      setStandalonePage(1);
    }
  };

  const handleDateChange = (dateVal: string) => {
    setSurgeryDateFilter(dateVal);
    if (isHybrid) {
      dispatch('updateFilter', { otregisteredon: dateVal });
    } else {
      setStandalonePage(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('changePage', page);
    } else {
      setStandalonePage(page);
      fetchItems(page, standalonePageSize);
    }
  };

  const handleAddNew = () => {
    if (isHybrid) {
      dispatch('addNew');
    } else {
      window.location.hash = '#/app/surgerymanagement/surgeryentryform/';
    }
  };

  const handleGoDashboard = () => {
    if (isHybrid) {
      dispatch('backtoList');
    } else {
      window.location.hash = '#/app/surgerydashboard/';
    }
  };

  const handleExecuteDelete = async (id: number) => {
    if (isHybrid) {
      dispatch('delete', { Id: id });
    } else {
      try {
        await apiFetch<any>('OtManagement/SurgeryEntry/DeleteSurgeryEntry', { Id: id });
        setDeleteConfirmId(null);
        fetchItems(standalonePage, standalonePageSize);
      } catch (err) {
        console.error('Failed to delete surgery entry:', err);
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (statusDesc?: string, statusId?: number) => {
    const sId = statusId || 1;
    let bg = '#ecfdf5';
    let text = '#059669';
    let border = '#a7f3d0';

    if (sId === 1) {
      bg = '#fffbeb';
      text = '#d97706';
      border = '#fde68a';
    } else if (sId === 2) {
      bg = '#e0f2fe';
      text = '#0284c7';
      border = '#bae6fd';
    } else if (sId === 4) {
      bg = '#fee2e2';
      text = '#dc2626';
      border = '#fecaca';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 8px',
          borderRadius: radii.full,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.bold,
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: text,
          }}
        />
        {statusDesc || (sId === 1 ? 'Scheduled' : sId === 2 ? 'In-Progress' : sId === 3 ? 'Completed' : 'Cancelled')}
      </span>
    );
  };

  return (
    <div
      style={{
        padding: spacing.xl,
        backgroundColor: colors.background,
        minHeight: '100vh',
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginBottom: spacing.lg,
          backgroundColor: colors.surface,
          padding: `${spacing.lg} ${spacing.xl}`,
          borderRadius: radii.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: radii.lg,
              backgroundColor: `${colors.primary}15`,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            <i className="fas fa-stethoscope" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              >
                Surgery Entry Register
              </h2>
              <span
                style={{
                  backgroundColor: '#8b5cf618',
                  color: '#7c3aed',
                  padding: '3px 10px',
                  borderRadius: radii.full,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  border: '1px solid #8b5cf630',
                }}
              >
                OT Operations
              </span>
            </div>
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
              }}
            >
              Document, review, and track clinical surgical records, intra-operative details, and theatre logs
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={handleGoDashboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              color: colors.textPrimary,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.medium,
              fontSize: typography.fontSize.sm,
            }}
          >
            <i className="fas fa-home" /> Dashboard
          </button>

          <button
            onClick={handleAddNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: radii.md,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.sm,
              boxShadow: shadows.xs,
            }}
          >
            <i className="fa fa-plus" /> New Surgery Entry
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#3b82f618',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-notes-medical" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Total Surgeries
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
              {totalItems}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#f59e0b18',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-clock" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Scheduled
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#d97706' }}>
              {stats.scheduled}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#0284c718',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-user-md" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              In-Progress
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#0284c7' }}>
              {stats.inProgress}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#10b98118',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-check-circle" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Completed
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#059669' }}>
              {stats.completed}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          borderRadius: radii.xl,
          boxShadow: shadows.xs,
          border: `1px solid ${colors.border}`,
          marginBottom: spacing.lg,
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 200px', minWidth: '180px', position: 'relative' }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textSecondary,
              fontSize: '14px',
            }}
          />
          <input
            type="text"
            placeholder="Search Name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchCommit()}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md} ${spacing.sm} 36px`,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              outline: 'none',
              backgroundColor: colors.background,
            }}
          />
        </div>

        {/* Date Filter */}
        <div style={{ flex: '1 1 150px', minWidth: '140px' }}>
          <input
            type="date"
            value={surgeryDateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          />
        </div>

        {/* Surgeon Filter */}
        <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
          <select
            value={selectedDoctorId}
            onChange={(e) => handleDoctorChange(Number(e.target.value) || e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          >
            <option value={-1}>All Chief Surgeons</option>
            {doctors.map((d) => (
              <option key={d.Id} value={d.Id}>
                {d.Text || d.Description || `Dr. ${d.Id}`}
              </option>
            ))}
          </select>
        </div>

        {/* OT Room Filter */}
        <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
          <select
            value={selectedRoomId}
            onChange={(e) => handleRoomChange(Number(e.target.value) || e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          >
            <option value={-1}>All OT Rooms</option>
            {rooms.map((r) => (
              <option key={r.Id} value={r.Id}>
                {r.Text || r.Name || `Room ${r.Id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
          <select
            value={selectedStatusId}
            onChange={(e) => handleStatusChange(Number(e.target.value) || e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          >
            <option value={-1}>All Statuses</option>
            {statuses.map((s) => (
              <option key={s.Id} value={s.Id}>
                {s.Text || s.Description}
              </option>
            ))}
          </select>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleSearchCommit}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: '#fff',
            borderRadius: radii.md,
            border: 'none',
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <i className="fas fa-filter" /> Filter
        </button>
      </div>

      {/* Main Grid Table */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
          marginBottom: spacing.lg,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: typography.fontSize.sm,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.background,
                  borderBottom: `2px solid ${colors.border}`,
                  color: colors.textSecondary,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                <th style={{ padding: `${spacing.md} ${spacing.lg}` }}>Surgery Date & Time</th>
                <th style={{ padding: spacing.md }}>OT Number</th>
                <th style={{ padding: spacing.md }}>Patient Details</th>
                <th style={{ padding: spacing.md }}>Location (Ward/Bed)</th>
                <th style={{ padding: spacing.md }}>OT Room</th>
                <th style={{ padding: spacing.md }}>Chief Surgeon</th>
                <th style={{ padding: spacing.md }}>Anaesthetist</th>
                <th style={{ padding: spacing.md }}>Status</th>
                <th style={{ padding: `${spacing.md} ${spacing.lg}`, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: spacing['2xl'], color: colors.textSecondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: spacing.sm }} />
                    Loading surgery records...
                  </td>
                </tr>
              ) : rawItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: spacing['2xl'] }}>
                    <div style={{ fontSize: '36px', color: colors.textSecondary, marginBottom: spacing.sm }}>
                      <i className="fas fa-procedures" />
                    </div>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                      No Surgery Entries Found
                    </div>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
                      Try adjusting the date, surgeon, or search criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                rawItems.map((item, idx) => {
                  const patient = item.Patient || {};
                  const title = patient.Title?.Description ? `${patient.Title.Description} ` : '';
                  const fullName = `${title}${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || 'Unknown Patient';

                  return (
                    <tr
                      key={item.Id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s ease',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : `${colors.background}40`,
                      }}
                    >
                      {/* Date & Time */}
                      <td style={{ padding: `${spacing.md} ${spacing.lg}` }}>
                        <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>
                          {formatDate(item.SurgeryStartedate)}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                          {formatTime(item.SurgeryStartedate)}
                          {item.SurgeryEndDate ? ` - ${formatTime(item.SurgeryEndDate)}` : ''}
                        </div>
                      </td>

                      {/* OT Identifier */}
                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: `${colors.primary}12`,
                            color: colors.primary,
                            fontWeight: typography.fontWeight.medium,
                            fontSize: typography.fontSize.xs,
                          }}
                        >
                          {item.SurgeryIdentifier || item.OTIdentifier || `OT-${item.Id}`}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: spacing.md }}>
                        <button
                          onClick={() => {
                            if (item.Patient?.Id) {
                              if (isHybrid) dispatch('patientinfo', item);
                              else setProfileModalPatientId(item.Patient.Id);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: colors.primary,
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.sm,
                          }}
                        >
                          {fullName}
                        </button>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: '2px' }}>
                          MRN: <strong>{patient.MRN || '—'}</strong> | {patient.Age ? `${patient.Age}Y` : '—'} | {patient.Gender?.Description || '—'}
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: spacing.md }}>
                        <div style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>
                          {item.WardMaster?.WardName || '—'}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                          {item.WardRoomMaster?.RoomNo ? `Room ${item.WardRoomMaster.RoomNo}` : ''}
                          {item.WardRoomBedMaster?.BedNo ? ` / Bed ${item.WardRoomBedMaster.BedNo}` : ''}
                        </div>
                      </td>

                      {/* OT Room */}
                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: radii.md,
                            backgroundColor: '#f3e8ff',
                            color: '#7e22ce',
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.xs,
                          }}
                        >
                          <i className="fas fa-door-open" /> {item.SurgeryRoomMaster?.Name || 'General OT'}
                        </span>
                      </td>

                      {/* Chief Surgeon */}
                      <td style={{ padding: spacing.md }}>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                          {item.ChiefSurgeon?.FirstName
                            ? `${item.ChiefSurgeon.Title?.Description || 'Dr.'} ${item.ChiefSurgeon.FirstName} ${item.ChiefSurgeon.LastName || ''}`
                            : '—'}
                        </div>
                      </td>

                      {/* Anaesthetist */}
                      <td style={{ padding: spacing.md }}>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                          {item.Anaesthesist?.FirstName
                            ? `${item.Anaesthesist.Title?.Description || 'Dr.'} ${item.Anaesthesist.FirstName} ${item.Anaesthesist.LastName || ''}`
                            : '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: spacing.md }}>
                        {getStatusBadge(item.SurgeryEntryStatus?.Description, item.SurgeryEntryStatusId)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: `${spacing.md} ${spacing.lg}`, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: spacing.xs }}>
                          <button
                            onClick={() => {
                              if (isHybrid) dispatch('view', item);
                              else window.location.hash = `#/app/surgerymanagement/surgeryentryform/?id=${item.Id}&eid=${item.EncounterId}&pid=${item.PatientId}`;
                            }}
                            title="Edit Surgery Record"
                            style={{
                              padding: '5px 8px',
                              backgroundColor: `${colors.primary}12`,
                              color: colors.primary,
                              border: 'none',
                              borderRadius: radii.sm,
                              cursor: 'pointer',
                              fontSize: typography.fontSize.xs,
                            }}
                          >
                            <i className="fas fa-edit" />
                          </button>

                          {(item.SurgeryEntryStatusId === 2 || item.SurgeryEntryStatusId === 3) && (
                            <button
                              onClick={() => {
                                if (isHybrid) dispatch('summary', item);
                                else window.location.hash = `#/surgeryentry/sugerypatientrecords?id=${item.Id}&pid=${item.PatientId}&eid=${item.EncounterId}`;
                              }}
                              title="Surgery Patient Summary"
                              style={{
                                padding: '5px 8px',
                                backgroundColor: '#0284c718',
                                color: '#0284c7',
                                border: 'none',
                                borderRadius: radii.sm,
                                cursor: 'pointer',
                                fontSize: typography.fontSize.xs,
                              }}
                            >
                              <i className="fas fa-file-medical-alt" />
                            </button>
                          )}

                          {item.SurgeryEntryStatusId === 1 && (
                            <button
                              onClick={() => {
                                if (isHybrid) dispatch('delete', item);
                                else setDeleteConfirmId(item.Id);
                              }}
                              title="Delete Entry"
                              style={{
                                padding: '5px 8px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: radii.sm,
                                cursor: 'pointer',
                                fontSize: typography.fontSize.xs,
                              }}
                            >
                              <i className="fas fa-trash-alt" />
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

        {/* Pagination Bar */}
        <div
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.background,
          }}
        >
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            Showing {rawItems.length} of {totalItems} total surgery records
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: spacing.md,
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
              maxWidth: '440px',
              width: '100%',
              boxShadow: shadows.xl,
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>
              Confirm Delete Surgery Entry
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
              Are you sure you want to delete this surgery entry? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteDelete(deleteConfirmId)}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Profile Modal */}
      {profileModalPatientId && (
        <PatientProfileModal
          patientId={profileModalPatientId}
          onClose={() => setProfileModalPatientId(null)}
        />
      )}
    </div>
  );
};
