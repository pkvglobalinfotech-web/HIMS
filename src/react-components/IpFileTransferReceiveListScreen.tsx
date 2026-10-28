import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface IpFileTransferReceiveItem {
  Id: number;
  RequestDate?: string;
  VisitNo?: string;
  PatientName?: string;
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
  RequestUser?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  DoctorName?: string;
  MRDIPFileStatusId?: number;
  MRDIPFileStatus?: {
    Id?: number;
    Description?: string;
  };
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface IpFileTransferReceiveListScreenProps {
  reactProps?: {
    items?: IpFileTransferReceiveItem[];
    rows?: any[];
    headers?: string[];
    lookup?: {
      MRDIPFileStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      PatientName?: string;
      VisitNo?: string;
      RequestDate?: string;
      MRDIPFileStatusId?: any;
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

export const IpFileTransferReceiveListScreen: React.FC<IpFileTransferReceiveListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone States
  const [standaloneItems, setStandaloneItems] = useState<IpFileTransferReceiveItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.PatientName || ''
  );
  const [visitNoFilter, setVisitNoFilter] = useState<string>(
    reactProps?.currentfilter?.VisitNo || ''
  );
  const [requestDateFilter, setRequestDateFilter] = useState<string>(() => {
    if (reactProps?.currentfilter?.RequestDate) {
      const d = reactProps.currentfilter.RequestDate;
      return typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [selectedStatusId, setSelectedStatusId] = useState<any>(
    reactProps?.currentfilter?.MRDIPFileStatusId ?? [4, 5]
  );

  // Modals
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [receiveModalItem, setReceiveModalItem] = useState<IpFileTransferReceiveItem | null>(null);
  const [receiveRemarks, setReceiveRemarks] = useState<string>('');

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Sync props when hybrid
  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientName !== undefined) {
        setSearchTerm(reactProps.currentfilter.PatientName);
      }
      if (reactProps.currentfilter.VisitNo !== undefined) {
        setVisitNoFilter(reactProps.currentfilter.VisitNo);
      }
      if (reactProps.currentfilter.RequestDate) {
        const d = reactProps.currentfilter.RequestDate;
        setRequestDateFilter(typeof d === 'string' ? d.split('T')[0] : requestDateFilter);
      }
      if (reactProps.currentfilter.MRDIPFileStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.MRDIPFileStatusId);
      }
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Standalone lookup fetch
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [{ Key: 'MRDIPFileStatus' }]);
      if (res && res.MRDIPFileStatus) {
        setStatusList(res.MRDIPFileStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch lookups in IpFileTransferReceiveListScreen:', err);
    }
  }, []);

  // Standalone items fetch
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        const fromDate = requestDateFilter ? `${requestDateFilter} 00:00:00` : null;
        const toDate = requestDateFilter ? `${requestDateFilter} 23:59:59` : null;

        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm || null },
            { Key: 2, Value: visitNoFilter || null },
            { Key: 6, Value: selectedStatusId },
            { Key: 9, Value: fromDate },
            { Key: 10, Value: toDate },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/IPFileRequest/GetIPFileRequests', inputData);
        if (res && res.Data) {
          setStandaloneItems(res.Data);
          setStandaloneTotal(res.PageContext?.TotalRecords || res.Data.length);
        } else {
          setStandaloneItems([]);
          setStandaloneTotal(0);
        }
      } catch (err) {
        console.error('Error fetching file transfer requests:', err);
        setStandaloneItems([]);
        setStandaloneTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, searchTerm, visitNoFilter, selectedStatusId, requestDateFilter]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchItems(standalonePage, standalonePageSize);
    }
  }, [isHybrid, fetchLookups, fetchItems, standalonePage, standalonePageSize]);

  // Computed data
  const rawItems: any[] = useMemo(() => {
    if (isHybrid) {
      if (reactProps?.items && reactProps.items.length > 0) {
        return reactProps.items;
      }
      if (reactProps?.rows && reactProps.rows.length > 0) {
        return reactProps.rows.map((r) => ({
          Id: r.id,
          RequestDate: r.requestDateDisplay ? `${r.requestDateDisplay} ${r.requestTimeDisplay || ''}` : '',
          VisitNo: r.visitNo,
          PatientName: r.patientName,
          PatientId: r.patientId,
          DoctorName: r.doctorName,
          MRDIPFileStatus: { Description: r.statusDescription },
          MRDIPFileStatusId: r.statusId,
          RequestUser: {
            Title: { Description: r.requestUserTitle },
            FirstName: r.requestUserFirstName,
            LastName: r.requestUserLastName,
          },
        }));
      }
      return [];
    }
    return standaloneItems;
  }, [isHybrid, reactProps?.items, reactProps?.rows, standaloneItems]);

  const totalCount = isHybrid
    ? reactProps?.pager?.totalItems ?? rawItems.length
    : standaloneTotal;
  const currentPage = isHybrid
    ? reactProps?.pager?.currentPage ?? 1
    : standalonePage;
  const pageSize = isHybrid
    ? reactProps?.pager?.pageSize ?? 25
    : standalonePageSize;

  // KPI Statistics
  const stats = useMemo(() => {
    let pending = 0;
    let received = 0;
    rawItems.forEach((item) => {
      const sId = item.MRDIPFileStatusId || item.MRDIPFileStatus?.Id;
      if (sId === 4) pending++;
      else if (sId === 5) received++;
    });
    return {
      total: totalCount,
      pending,
      received,
    };
  }, [rawItems, totalCount]);

  // Lookup options
  const statuses: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.MRDIPFileStatus) {
      return reactProps.lookup.MRDIPFileStatus;
    }
    return statusList;
  }, [isHybrid, reactProps?.lookup?.MRDIPFileStatus, statusList]);

  // Actions
  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: searchTerm });
      dispatch('filterChange', { field: 'VisitNo', value: visitNoFilter });
      dispatch('filterChange', { field: 'RequestDate', value: requestDateFilter });
      dispatch('search');
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleStatusChange = (val: any) => {
    setSelectedStatusId(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'MRDIPFileStatusId', value: val });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchTerm('');
    setVisitNoFilter('');
    setRequestDateFilter(today);
    setSelectedStatusId([4, 5]);

    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: '' });
      dispatch('filterChange', { field: 'VisitNo', value: '' });
      dispatch('filterChange', { field: 'RequestDate', value: today });
      dispatch('filterChange', { field: 'MRDIPFileStatusId', value: [4, 5] });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isHybrid) {
      dispatch('pageChange', { page: newPage });
    } else {
      setStandalonePage(newPage);
    }
  };

  const openReceiveModal = (item: IpFileTransferReceiveItem) => {
    setReceiveModalItem(item);
    setReceiveRemarks('');
  };

  const handleConfirmReceive = () => {
    if (!receiveModalItem) return;
    if (isHybrid) {
      dispatch('receive', { id: receiveModalItem.Id, remarks: receiveRemarks, entity: receiveModalItem });
    } else {
      alert(`File for visit ${receiveModalItem.VisitNo} acknowledged as received.`);
      fetchItems(standalonePage, standalonePageSize);
    }
    setReceiveModalItem(null);
  };

  const getStatusBadge = (statusDesc?: string, statusId?: number) => {
    const desc = statusDesc || (statusId === 4 ? 'Transferred to Ward' : statusId === 5 ? 'Received in Ward' : 'Pending');
    const isTransferred = statusId === 4 || desc.toLowerCase().includes('transfer');
    const isReceived = statusId === 5 || desc.toLowerCase().includes('receiv');

    const bg = isTransferred ? '#eff6ff' : isReceived ? '#ecfdf5' : '#f8fafc';
    const color = isTransferred ? '#1d4ed8' : isReceived ? '#047857' : '#475569';
    const border = isTransferred ? '#bfdbfe' : isReceived ? '#a7f3d0' : '#cbd5e1';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: radii.full,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
        {desc}
      </span>
    );
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        backgroundColor: colors.background,
        minHeight: '100%',
        padding: spacing.lg,
        boxSizing: 'border-box',
        color: colors.textMain,
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
          backgroundColor: '#ffffff',
          padding: `${spacing.md} ${spacing.lg}`,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.md,
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-folder-open" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textMain }}>
                IP File Transfer Receive
              </h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: radii.sm,
                }}
              >
                Inflow Acknowledgment
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Inpatient physical case record inflow, ward receipt sign-off, and circulation tracking
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <button
            onClick={() => handleSearchSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <i className="fa fa-sync-alt" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>
              Total Inbound Files
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.textMain, marginTop: 4 }}>
              {stats.total}
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>Files dispatched to ward</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fa fa-file-alt" />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: radii.lg,
            border: `1px solid #bfdbfe`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1d4ed8' }}>
              Pending Ward Receipt
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af', marginTop: 4 }}>
              {stats.pending}
            </div>
            <span style={{ fontSize: 12, color: '#3b82f6' }}>Awaiting nursing verification</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fa fa-truck-loading" />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: radii.lg,
            border: `1px solid #bbf7d0`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#15803d' }}>
              Received / In Ward
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#166534', marginTop: 4 }}>
              {stats.received}
            </div>
            <span style={{ fontSize: 12, color: '#22c55e' }}>Physical file in circulation</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fa fa-check-double" />
          </div>
        </div>
      </div>

      {/* ── Modern Filter Bar ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: spacing.md,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: spacing.md,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient Search */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Patient Name / MRN
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search patient or UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  fontSize: 13,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  boxSizing: 'border-box',
                  outline: 'none',
                  color: colors.textMain,
                }}
              />
              <i
                className="fa fa-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 11,
                  color: '#94a3b8',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Visit No */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              IP / Visit No
            </label>
            <input
              type="text"
              placeholder="e.g. IP2600123"
              value={visitNoFilter}
              onChange={(e) => setVisitNoFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxSizing: 'border-box',
                outline: 'none',
                color: colors.textMain,
              }}
            />
          </div>

          {/* Request Date */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Dispatch Date
            </label>
            <input
              type="date"
              value={requestDateFilter}
              onChange={(e) => setRequestDateFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxSizing: 'border-box',
                outline: 'none',
                color: colors.textMain,
              }}
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Transfer Status
            </label>
            <select
              value={Array.isArray(selectedStatusId) ? 'all' : selectedStatusId}
              onChange={(e) => {
                const v = e.target.value === 'all' ? [4, 5] : Number(e.target.value);
                handleStatusChange(v);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                outline: 'none',
                color: colors.textMain,
              }}
            >
              <option value="all">All Inflow Statuses (Transferred / Received)</option>
              {statuses.map((opt) => (
                <option key={opt.Id} value={opt.Id}>
                  {opt.Text || opt.Description || `Status #${opt.Id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={handleSearchSubmit}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: radii.md,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-filter" />
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              style={{
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Table Records Container ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
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
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: `1px solid ${colors.border}`,
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '14px 16px', width: 60, textAlign: 'center' }}>S.No</th>
                <th style={{ padding: '14px 16px' }}>Dispatch Date & Time</th>
                <th style={{ padding: '14px 16px' }}>IP / Visit No</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>Requested By</th>
                <th style={{ padding: '14px 16px' }}>Doctor Name</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: 130 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: colors.textMuted }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <i className="fa fa-spinner fa-spin" style={{ fontSize: 20, color: colors.primary }} />
                      <span>Loading inbound file transfers...</span>
                    </div>
                  </td>
                </tr>
              ) : rawItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: colors.textMuted }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: colors.textSecondary }}>
                      No IP file transfer requests found
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                      Adjust filters or verify with MRD dispatch officers.
                    </p>
                  </td>
                </tr>
              ) : (
                rawItems.map((item, idx) => {
                  const patient = item.Patient;
                  const patientId = item.PatientId || patient?.Id;
                  const pTitle = patient?.Title?.Description ? `${patient.Title.Description} ` : '';
                  const pName = item.PatientName || `${pTitle}${patient?.FirstName || ''} ${patient?.LastName || ''}`.trim() || '—';
                  const mrn = patient?.MRN || '—';
                  const reqUser = item.RequestUser
                    ? `${item.RequestUser.Title?.Description || ''} ${item.RequestUser.FirstName || ''} ${item.RequestUser.LastName || ''}`.trim()
                    : '—';

                  const isAlreadyReceived = item.MRDIPFileStatusId === 5;

                  return (
                    <tr
                      key={item.Id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa')
                      }
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>
                          {item.RequestDate ? item.RequestDate.split(' ')[0] : '—'}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          {item.RequestDate && item.RequestDate.includes(' ')
                            ? item.RequestDate.split(' ')[1]
                            : ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: '#0369a1',
                            backgroundColor: '#f0f9ff',
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            border: '1px solid #bae6fd',
                          }}
                        >
                          {item.VisitNo || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (patientId) {
                                setProfileModalPatientId(patientId);
                                if (isHybrid) dispatch('patientinfo', { entity: item });
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              fontWeight: 600,
                              color: '#0284c7',
                              cursor: patientId ? 'pointer' : 'default',
                              textAlign: 'left',
                              textDecoration: 'underline',
                              fontSize: 13,
                            }}
                          >
                            {pName}
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          UHID: {mrn} {patient?.Age ? `• ${patient.Age} yrs` : ''} {patient?.Gender?.Description ? `• ${patient.Gender.Description}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: colors.textMain }}>{reqUser}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: colors.textSecondary }}>{item.DoctorName || '—'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(item.MRDIPFileStatus?.Description, item.MRDIPFileStatusId)}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isAlreadyReceived ? (
                          <button
                            disabled
                            style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: '#f1f5f9',
                              color: '#94a3b8',
                              border: '1px solid #cbd5e1',
                              borderRadius: radii.md,
                              cursor: 'not-allowed',
                            }}
                          >
                            Received
                          </button>
                        ) : (
                          <button
                            onClick={() => openReceiveModal(item)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: radii.md,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
                            }}
                          >
                            <i className="fa fa-inbox" />
                            Receive
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Built-in Pagination Bar ── */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Showing {rawItems.length} of {totalCount} files
          </div>
          <Pagination
            totalItems={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Modal: Receive Acknowledgment ── */}
      {receiveModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: spacing.md,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.xl,
              width: '100%',
              maxWidth: 500,
              boxShadow: shadows.lg,
              border: `1px solid ${colors.border}`,
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.md,
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className="fa fa-folder-open" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                  Confirm File Receipt
                </h3>
              </div>
              <button
                onClick={() => setReceiveModalItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div
                style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: radii.md,
                  padding: 14,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 6 }}>
                  <span style={{ color: colors.textMuted }}>Visit No:</span>
                  <strong style={{ color: '#0369a1' }}>{receiveModalItem.VisitNo || '—'}</strong>

                  <span style={{ color: colors.textMuted }}>Patient:</span>
                  <strong>{receiveModalItem.PatientName || '—'}</strong>

                  <span style={{ color: colors.textMuted }}>Requested By:</span>
                  <span>
                    {receiveModalItem.RequestUser
                      ? `${receiveModalItem.RequestUser.FirstName || ''} ${receiveModalItem.RequestUser.LastName || ''}`
                      : '—'}
                  </span>

                  <span style={{ color: colors.textMuted }}>Doctor:</span>
                  <span>{receiveModalItem.DoctorName || '—'}</span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  Ward Receipt Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter any file intake observations or notes..."
                  value={receiveRemarks}
                  onChange={(e) => setReceiveRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 13,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
                <button
                  onClick={() => setReceiveModalItem(null)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReceive}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: radii.md,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  <i className="fa fa-check" />
                  Acknowledge & Receive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Patient Profile ── */}
      {profileModalPatientId && (
        <PatientProfileModal
          patientId={profileModalPatientId}
          onClose={() => setProfileModalPatientId(null)}
        />
      )}
    </div>
  );
};
