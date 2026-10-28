import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface IpClearenceItem {
  Id: number;
  IPClearenceDate?: string;
  PatientMrn?: string;
  PatientName?: string;
  VisitNo?: string;
  Comments?: string;
  DoctorName?: string;
  IsBackToSameBed?: boolean;
  DepartmentId?: number;
  Department?: {
    Id?: number;
    DepartmentName?: string;
  };
  IPClearenceStatusId?: number;
  IPClearenceStatus?: {
    Id?: number;
    Description?: string;
  };
  Encounter?: {
    Id?: number;
    AdmissionStatus?: {
      Id?: number;
      Description?: string;
    };
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
  PatientId?: number;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string };
  };
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface IpClearenceListScreenProps {
  reactProps?: {
    items?: IpClearenceItem[];
    lookup?: {
      Department?: LookupOption[];
      IPClearenceStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      PatientName?: string;
      patientnamemrn?: string;
      DepartmentId?: number | string;
      IPClearenceDate?: string;
      IPClearenceStatusId?: number | string;
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

export const IpClearenceListScreen: React.FC<IpClearenceListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<IpClearenceItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deptList, setDeptList] = useState<LookupOption[]>([]);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.PatientName || reactProps?.currentfilter?.patientnamemrn || ''
  );
  const [selectedDeptId, setSelectedDeptId] = useState<number | string>(
    reactProps?.currentfilter?.DepartmentId || -1
  );
  const [dateFilter, setDateFilter] = useState<string>(() => {
    if (reactProps?.currentfilter?.IPClearenceDate) return reactProps.currentfilter.IPClearenceDate;
    return new Date().toISOString().split('T')[0];
  });
  const [selectedStatusId, setSelectedStatusId] = useState<number | string>(
    reactProps?.currentfilter?.IPClearenceStatusId || 'all'
  );

  // Clearance Modal
  const [clearanceModalItem, setClearanceModalItem] = useState<IpClearenceItem | null>(null);
  const [modalComments, setModalComments] = useState<string>('');
  const [isSavingClearance, setIsSavingClearance] = useState<boolean>(false);
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const items: IpClearenceItem[] = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems: number = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage: number = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize: number = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  const departments: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.Department) {
      return reactProps.lookup.Department;
    }
    return deptList;
  }, [isHybrid, reactProps?.lookup?.Department, deptList]);

  const statuses: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.IPClearenceStatus) {
      return reactProps.lookup.IPClearenceStatus;
    }
    return statusList;
  }, [isHybrid, reactProps?.lookup?.IPClearenceStatus, statusList]);

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
        { Key: 'IPClearenceStatus' },
        {
          Key: 'Department',
          Request: {
            Params: [{ Key: 14, Value: [-1, facilityId] }],
          },
        },
      ]);
      if (res) {
        if (res.IPClearenceStatus) setStatusList(res.IPClearenceStatus);
        if (res.Department) setDeptList(res.Department);
      }
    } catch (err) {
      console.warn('Failed to load IP clearance lookups:', err);
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
        if (dateFilter) {
          fromDate = `${dateFilter} 00:00:00`;
          toDate = `${dateFilter} 23:59:59`;
        }

        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm || null },
            { Key: 2, Value: selectedDeptId !== -1 ? selectedDeptId : null },
            { Key: 4, Value: fromDate },
            { Key: 5, Value: toDate },
            { Key: 6, Value: selectedStatusId !== 'all' ? selectedStatusId : null },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/IPClearence/GetIPClearences', inputData);
        if (res && res.Data) {
          setStandaloneItems(res.Data);
          setStandaloneTotal(res.PageContext?.TotalRecords || res.Data.length);
        } else {
          setStandaloneItems([]);
          setStandaloneTotal(0);
        }
      } catch (err) {
        console.error('Failed to load IP Clearance items:', err);
        setStandaloneItems([]);
        setStandaloneTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, searchTerm, selectedDeptId, dateFilter, selectedStatusId]
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
      if (reactProps.currentfilter.DepartmentId !== undefined) {
        setSelectedDeptId(reactProps.currentfilter.DepartmentId);
      }
      if (reactProps.currentfilter.IPClearenceDate !== undefined) {
        setDateFilter(reactProps.currentfilter.IPClearenceDate || '');
      }
      if (reactProps.currentfilter.IPClearenceStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.IPClearenceStatusId);
      }
    }
  }, [reactProps?.currentfilter]);

  const handleSearch = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: searchTerm });
      dispatch('search');
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleDeptChange = (val: number | string) => {
    setSelectedDeptId(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'DepartmentId', value: val });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handleStatusChange = (val: number | string) => {
    setSelectedStatusId(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'IPClearenceStatusId', value: val });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchTerm('');
    setSelectedDeptId(-1);
    setDateFilter(today);
    setSelectedStatusId('all');

    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: '' });
      dispatch('filterChange', { field: 'DepartmentId', value: -1 });
      dispatch('filterChange', { field: 'IPClearenceDate', value: today });
      dispatch('filterChange', { field: 'IPClearenceStatusId', value: null });
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

  // Open Clearance Modal
  const handleOpenClearance = (item: IpClearenceItem) => {
    if (isHybrid) {
      dispatch('view', { entity: item });
    } else {
      setClearanceModalItem(item);
      setModalComments(item.Comments || '');
    }
  };

  // Save Clearance
  const handleSaveClearance = async () => {
    if (!clearanceModalItem) return;
    setIsSavingClearance(true);
    try {
      const payload = {
        ...clearanceModalItem,
        Comments: modalComments,
        IPClearenceStatusId: 2, // Cleared
      };

      await apiFetch<any>('IPManagement/IPClearence/UpdateIPClearence', { Data: payload });
      setNotificationMsg({
        type: 'success',
        text: `Clearance for ${clearanceModalItem.PatientName} updated successfully!`,
      });
      setClearanceModalItem(null);
      fetchItems(standalonePage, standalonePageSize);
    } catch (err) {
      console.error('Failed to update clearance:', err);
      setNotificationMsg({
        type: 'error',
        text: 'Failed to update clearance status.',
      });
    } finally {
      setIsSavingClearance(false);
      setTimeout(() => setNotificationMsg(null), 5000);
    }
  };

  const formatDateTime = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // KPIs
  const kpis = useMemo(() => {
    let pending = 0;
    let cleared = 0;
    items.forEach((item) => {
      const statusText = item.IPClearenceStatus?.Description?.toLowerCase() || '';
      if (statusText.includes('pending') || item.IPClearenceStatusId === 1) pending++;
      else if (statusText.includes('clear') || item.IPClearenceStatusId === 2) cleared++;
    });
    return {
      total: totalItems,
      pending,
      cleared,
    };
  }, [items, totalItems]);

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

      {/* ── Page Header ── */}
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
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            <i className="fa fa-id-badge" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.02em' }}>
                Inpatient Department Clearance
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: radii.full,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                }}
              >
                Discharge Clearance
              </span>
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Track multidisciplinary departmental clearances (Nursing, Clinical, Pharmacy, Billing) before physical discharge
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (isHybrid) dispatch('search');
            else fetchItems(standalonePage, standalonePageSize);
          }}
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

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
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
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Total Clearances</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-list-alt" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e40af', marginTop: 6 }}>
            {kpis.total}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Inpatient clearance requests
          </div>
        </div>

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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>Pending Department Sign-off</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-hourglass-half" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 6 }}>
            {kpis.pending}
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
            Awaiting clearance approval
          </div>
        </div>

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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Cleared & Approved</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-check-circle" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#166534', marginTop: 6 }}>
            {kpis.cleared}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Ready for physical check-out
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
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
          {/* Patient Name / MRN */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Patient Name / MRN
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search Patient Name / MRN..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  fontSize: 13,
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="-1">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.Id} value={d.Id}>
                  {d.Text || d.DepartmentName}
                </option>
              ))}
            </select>
          </div>

          {/* Clearance Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Clearance Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (isHybrid) {
                  dispatch('filterChange', { field: 'IPClearenceDate', value: e.target.value });
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
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Clearance Status
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              {statuses.map((s: any) => (
                <option key={s.Id} value={s.Id}>
                  {s.Text || s.Description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: '8px 16px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              fontSize: 13,
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
            <span>Search</span>
          </button>
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
                  letterSpacing: '0.03em',
                }}
              >
                <th style={{ padding: '14px 16px', width: 50, textAlign: 'center' }}>#</th>
                <th style={{ padding: '14px 16px' }}>Date</th>
                <th style={{ padding: '14px 16px' }}>UHID</th>
                <th style={{ padding: '14px 16px' }}>Patient Name</th>
                <th style={{ padding: '14px 16px' }}>Ward / Room / Bed</th>
                <th style={{ padding: '14px 16px' }}>Visit No</th>
                <th style={{ padding: '14px 16px' }}>Department</th>
                <th style={{ padding: '14px 16px' }}>Admission Status</th>
                <th style={{ padding: '14px 16px' }}>Clearance Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-circle-o-notch fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Loading Clearance Records...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-clipboard fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      No Inpatient Clearance Records
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      No patients currently pending departmental clearance for the selected criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const wardDetails =
                    [item.WardMaster?.WardName, item.WardRoomMaster?.RoomNo, item.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / ') || 'General Ward';

                  return (
                    <tr
                      key={item.Id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                      }}
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: colors.textMuted, fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>{formatDateTime(item.IPClearenceDate)}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {item.PatientMrn || item.Patient?.MRN || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div
                          onClick={() => {
                            if (isHybrid) dispatch('view', { entity: item });
                            else if (item.PatientId) setProfileModalPatientId(item.PatientId);
                          }}
                          style={{ fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}
                        >
                          {item.PatientName || 'Patient'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: radii.sm, backgroundColor: '#f1f5f9', color: '#334155', fontSize: 12, fontWeight: 600 }}>
                          <i className="fa fa-bed" style={{ color: '#0284c7' }} />
                          <span>{wardDetails}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.VisitNo || '—'}</span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{item.Department?.DepartmentName || '—'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                          {item.Encounter?.AdmissionStatus?.Description || 'Discharge Advised'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            backgroundColor: item.IPClearenceStatusId === 2 ? '#f0fdf4' : '#fffbeb',
                            color: item.IPClearenceStatusId === 2 ? '#166534' : '#b45309',
                            border: `1px solid ${item.IPClearenceStatusId === 2 ? '#bbf7d0' : '#fde68a'}`,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {item.IPClearenceStatus?.Description || 'Pending'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenClearance(item)}
                          title="Review & Update Clearance"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: radii.md,
                            border: 'none',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <i className="fa fa-pencil" />
                          <span>Clearance</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Showing <strong>{items.length}</strong> of <strong>{totalItems}</strong> clearance records
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Standalone Clearance Modal ── */}
      {clearanceModalItem && (
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
          onClick={() => !isSavingClearance && setClearanceModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.xl,
              boxShadow: shadows.xl,
              maxWidth: 580,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa fa-id-badge" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Inpatient Department Clearance</h3>
              </div>
              <button onClick={() => setClearanceModalItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <i className="fa fa-times" />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: radii.md, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Patient Name</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{clearanceModalItem.PatientName}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Visit No</span>
                  <div style={{ fontWeight: 700, color: '#0284c7', marginTop: 2 }}>{clearanceModalItem.VisitNo}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Ward / Room / Bed</span>
                  <div style={{ fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {[clearanceModalItem.WardMaster?.WardName, clearanceModalItem.WardRoomMaster?.RoomNo, clearanceModalItem.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / ')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Attending Doctor</span>
                  <div style={{ fontWeight: 600, color: '#334155', marginTop: 2 }}>{clearanceModalItem.DoctorName || '—'}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                  Clearance Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={modalComments}
                  onChange={(e) => setModalComments(e.target.value)}
                  placeholder="Enter clearance sign-off remarks, medication reconciliation, return of equipment..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 13,
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setClearanceModalItem(null)}
                style={{ padding: '8px 16px', borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClearance}
                disabled={isSavingClearance}
                style={{
                  padding: '8px 20px',
                  borderRadius: radii.md,
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isSavingClearance ? 'wait' : 'pointer',
                }}
              >
                {isSavingClearance ? 'Saving...' : 'Authorize Clearance'}
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
            <PatientProfileModal patientId={profileModalPatientId} onClose={() => setProfileModalPatientId(null)} />
          </div>
        </div>
      )}
    </div>
  );
};
