import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface MrdFileApprovalItem {
  Id: number;
  RequestDate?: string;
  ApprovedDate?: string;
  VisitNo?: string;
  PatientId: number;
  DoctorId?: number;
  DoctorName?: string;
  MRDIPFileStatusId?: number;
  MRDIPFileStatus?: {
    Id?: number;
    Description?: string;
  };
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string; Id?: number };
  };
  RequestUser?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  ApproveUser?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  Reason?: string;
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface IpMrdFileRequestApproveListScreenProps {
  reactProps?: {
    items?: MrdFileApprovalItem[];
    lookup?: {
      MRDIPFileStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      PatientName?: string;
      VisitNo?: string;
      RequestDate?: string;
      MRDIPFileStatusId?: number | string;
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

export const IpMrdFileRequestApproveListScreen: React.FC<IpMrdFileRequestApproveListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<MrdFileApprovalItem[]>([]);
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
    if (reactProps?.currentfilter?.RequestDate) return reactProps.currentfilter.RequestDate;
    return new Date().toISOString().split('T')[0];
  });
  const [selectedStatusId, setSelectedStatusId] = useState<number | string>(
    reactProps?.currentfilter?.MRDIPFileStatusId ?? 3
  );

  // Approval Modal State
  const [approvalModalItem, setApprovalModalItem] = useState<MrdFileApprovalItem | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const items: MrdFileApprovalItem[] = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems: number = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage: number = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize: number = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  const statuses: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.MRDIPFileStatus) {
      return reactProps.lookup.MRDIPFileStatus;
    }
    return statusList;
  }, [isHybrid, reactProps?.lookup?.MRDIPFileStatus, statusList]);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Standalone: Fetch Lookups
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [{ Key: 'MRDIPFileStatus' }]);
      if (res && res.MRDIPFileStatus) {
        setStatusList(res.MRDIPFileStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch lookups in approval screen:', err);
    }
  }, []);

  // Standalone: Fetch Items
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        let fromDate: string | null = null;
        let toDate: string | null = null;
        if (requestDateFilter && !searchTerm && !visitNoFilter) {
          fromDate = `${requestDateFilter} 00:00:00`;
          toDate = `${requestDateFilter} 23:59:59`;
        }

        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm || null },
            { Key: 2, Value: visitNoFilter || null },
            { Key: 6, Value: selectedStatusId !== 'all' ? selectedStatusId : null },
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
        console.error('Failed to load MRD file request approvals:', err);
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

  // Sync hybrid props
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientName !== undefined) {
        setSearchTerm(reactProps.currentfilter.PatientName || '');
      }
      if (reactProps.currentfilter.VisitNo !== undefined) {
        setVisitNoFilter(reactProps.currentfilter.VisitNo || '');
      }
      if (reactProps.currentfilter.RequestDate !== undefined) {
        setRequestDateFilter(reactProps.currentfilter.RequestDate || '');
      }
      if (reactProps.currentfilter.MRDIPFileStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.MRDIPFileStatusId);
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

  const handleStatusChange = (val: string) => {
    setSelectedStatusId(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'MRDIPFileStatusId', value: val });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('pageChange', { page });
    } else {
      setStandalonePage(page);
    }
  };

  // Confirm Approval Action
  const handleConfirmApproval = async () => {
    if (!approvalModalItem) return;
    setIsApproving(true);

    if (isHybrid) {
      dispatch('filerequest', { entity: approvalModalItem });
      setApprovalModalItem(null);
      setIsApproving(false);
      return;
    }

    try {
      const currentUserId = sessionHelper.getCurrentUserId();
      const payload = {
        Id: approvalModalItem.Id,
        ApproveBy: currentUserId > 0 ? currentUserId : 1,
        ApprovedDate: new Date().toISOString(),
        MRDIPFileStatusId: 4, // Status: Transferred / Approved
      };

      await apiFetch<any>('IPManagement/IPFileRequest/UpdateIPFileRequest', { Data: payload });
      setNotificationMsg({
        type: 'success',
        text: `File requisition for ${approvalModalItem.VisitNo} approved successfully!`,
      });
      setApprovalModalItem(null);
      fetchItems(standalonePage, standalonePageSize);
    } catch (err) {
      console.error('Failed to approve file request:', err);
      setNotificationMsg({
        type: 'error',
        text: 'Failed to approve file request. Please check permissions.',
      });
    } finally {
      setIsApproving(false);
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
              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
            }}
          >
            <i className="fa fa-check-square-o" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.02em' }}>
                IP File Request Approval
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: radii.full,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                }}
              >
                MRD Approvals
              </span>
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Authorize and release archived in-patient physical record files to requesting departments
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

      {/* ── Filter Bar ── */}
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
          {/* Patient Search */}
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
                placeholder="Search Name or MRN..."
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

          {/* Visit No */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Visit No / IP Number
            </label>
            <input
              type="text"
              value={visitNoFilter}
              onChange={(e) => {
                setVisitNoFilter(e.target.value);
                if (isHybrid) dispatch('filterChange', { field: 'VisitNo', value: e.target.value });
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. IP24-25/..."
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Request Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Request Date
            </label>
            <input
              type="date"
              value={requestDateFilter}
              onChange={(e) => {
                setRequestDateFilter(e.target.value);
                if (isHybrid) {
                  dispatch('filterChange', { field: 'RequestDate', value: e.target.value });
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

          {/* Status Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Approval Status
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
                  {s.Description || s.Text}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
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
              backgroundColor: '#16a34a',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
            }}
          >
            <i className="fa fa-search" />
            <span>Search Requests</span>
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
                <th style={{ padding: '14px 16px' }}>Request Date</th>
                <th style={{ padding: '14px 16px' }}>Visit No</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>Requested By</th>
                <th style={{ padding: '14px 16px' }}>Doctor Name</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-circle-o-notch fa-spin fa-2x" style={{ color: '#16a34a', marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Loading File Requisitions...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-check-circle-o fa-3x" style={{ color: '#86efac', marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      No Pending File Approvals
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      All requested medical record files have been authorized or no matching records were found.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const p = item.Patient;
                  const fullName = `${p?.Title?.Description || ''} ${p?.FirstName || ''} ${p?.LastName || ''}`.trim() || 'Patient';
                  const reqUser = `${item.RequestUser?.Title?.Description || ''} ${item.RequestUser?.FirstName || ''} ${item.RequestUser?.LastName || ''}`.trim() || 'Department Staff';

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
                        <div style={{ fontWeight: 600, color: colors.textMain }}>{formatDateTime(item.RequestDate)}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {item.VisitNo || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div
                          onClick={() => {
                            if (isHybrid) dispatch('patientinfo', { entity: item });
                            else setProfileModalPatientId(item.PatientId || p?.Id || 0);
                          }}
                          style={{ fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}
                        >
                          {fullName}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                          <strong>UHID:</strong> {p?.MRN || '—'} &bull; {p?.Age ? `${p.Age}Y` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{reqUser}</div>
                        {item.Reason && (
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                            Reason: {item.Reason}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{item.DoctorName || 'Attending Physician'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            backgroundColor: item.MRDIPFileStatusId === 3 ? '#fffbeb' : '#eff6ff',
                            color: item.MRDIPFileStatusId === 3 ? '#b45309' : '#1d4ed8',
                            border: `1px solid ${item.MRDIPFileStatusId === 3 ? '#fde68a' : '#bfdbfe'}`,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {item.MRDIPFileStatus?.Description || 'Requested'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setApprovalModalItem(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 14px',
                            borderRadius: radii.md,
                            border: 'none',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          <i className="fa fa-check" />
                          <span>Approve Requisition</span>
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
            Showing <strong>{items.length}</strong> of <strong>{totalItems}</strong> requisition requests
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Approval Modal ── */}
      {approvalModalItem && (
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
          onClick={() => !isApproving && setApprovalModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.xl,
              boxShadow: shadows.xl,
              maxWidth: 520,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa fa-check-square-o" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Authorize MRD File Release</h3>
              </div>
              <button onClick={() => setApprovalModalItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <i className="fa fa-times" />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: radii.md, border: `1px solid ${colors.border}`, marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {approvalModalItem.Patient?.Title?.Description} {approvalModalItem.Patient?.FirstName} {approvalModalItem.Patient?.LastName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                  <span>UHID: {approvalModalItem.Patient?.MRN || '—'}</span>
                  <span>&bull;</span>
                  <span>Visit: {approvalModalItem.VisitNo}</span>
                </div>
                {approvalModalItem.Reason && (
                  <div style={{ fontSize: 12, color: '#334155', marginTop: 6, fontStyle: 'italic' }}>
                    "<strong>Requisition Reason:</strong> {approvalModalItem.Reason}"
                  </div>
                )}
              </div>

              <div style={{ fontSize: 13, color: '#334155', lineHeight: '1.5' }}>
                Do you approve this file request? Authorizing will mark the physical file as <strong>Transferred / In Transit</strong> to the requesting unit.
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setApprovalModalItem(null)}
                style={{ padding: '8px 16px', borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isApproving}
                style={{
                  padding: '8px 20px',
                  borderRadius: radii.md,
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isApproving ? 'wait' : 'pointer',
                }}
              >
                {isApproving ? 'Authorizing...' : 'Authorize & Release'}
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
