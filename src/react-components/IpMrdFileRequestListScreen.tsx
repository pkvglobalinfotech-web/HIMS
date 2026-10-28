import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface MrdFileRequestItem {
  Id: number;
  ReturnDate?: string;
  AdmissionDate?: string;
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
  WardMaster?: { WardName?: string };
  WardRoomMaster?: { RoomNo?: string };
  WardRoomBedMaster?: { BedNo?: string };
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

export interface IpMrdFileRequestListScreenProps {
  reactProps?: {
    items?: MrdFileRequestItem[];
    lookup?: {
      MRDIPFileStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      PatientName?: string;
      VisitNo?: string;
      RequestDate?: string;
      MRDIPFileStatusId?: number | string | number[];
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

export const IpMrdFileRequestListScreen: React.FC<IpMrdFileRequestListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<MrdFileRequestItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filters
  const [patientSearch, setPatientSearch] = useState<string>(
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
    Array.isArray(reactProps?.currentfilter?.MRDIPFileStatusId)
      ? 'all'
      : reactProps?.currentfilter?.MRDIPFileStatusId ?? 'all'
  );

  // Modals
  const [requestModalItem, setRequestModalItem] = useState<MrdFileRequestItem | null>(null);
  const [requestReason, setRequestReason] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const items: MrdFileRequestItem[] = isHybrid ? reactProps?.items || [] : standaloneItems;
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

  // Standalone Lookup Fetch
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [{ Key: 'MRDIPFileStatus' }]);
      if (res && res.MRDIPFileStatus) {
        setStatusList(res.MRDIPFileStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch MRD File Request lookups:', err);
    }
  }, []);

  // Standalone Item Fetch
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      if (!patientSearch && !visitNoFilter) {
        // In legacy, patient search is required before querying
        setStandaloneItems([]);
        setStandaloneTotal(0);
        return;
      }
      setIsLoading(true);
      try {
        let fromDate: string | null = null;
        let toDate: string | null = null;
        if (requestDateFilter) {
          fromDate = `${requestDateFilter} 00:00:00`;
          toDate = `${requestDateFilter} 23:59:59`;
        }

        const statusParam = selectedStatusId === 'all' ? [2, 3] : [Number(selectedStatusId)];

        const inputData = {
          Params: [
            { Key: 1, Value: patientSearch || null },
            { Key: 2, Value: visitNoFilter || null },
            { Key: 6, Value: statusParam },
            { Key: 9, Value: fromDate },
            { Key: 10, Value: toDate },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/MRDFiles/GetMRDFiless', inputData);
        if (res && res.Data) {
          setStandaloneItems(res.Data);
          setStandaloneTotal(res.PageContext?.TotalRecords || res.Data.length);
        } else {
          setStandaloneItems([]);
          setStandaloneTotal(0);
        }
      } catch (err) {
        console.error('Failed to load MRD File Requests:', err);
        setStandaloneItems([]);
        setStandaloneTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, patientSearch, visitNoFilter, requestDateFilter, selectedStatusId]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      if (patientSearch || visitNoFilter) {
        fetchItems(standalonePage, standalonePageSize);
      }
    }
  }, [isHybrid, fetchLookups, fetchItems, standalonePage, standalonePageSize, patientSearch, visitNoFilter]);

  // Sync hybrid props
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientName !== undefined) {
        setPatientSearch(reactProps.currentfilter.PatientName || '');
      }
      if (reactProps.currentfilter.VisitNo !== undefined) {
        setVisitNoFilter(reactProps.currentfilter.VisitNo || '');
      }
      if (reactProps.currentfilter.RequestDate !== undefined) {
        setRequestDateFilter(reactProps.currentfilter.RequestDate || '');
      }
    }
  }, [reactProps?.currentfilter]);

  const handleSearch = () => {
    if (!patientSearch && !visitNoFilter) {
      setNotificationMsg({
        type: 'error',
        text: 'Please enter a Patient Name, MRN, or Visit No to search for files.',
      });
      setTimeout(() => setNotificationMsg(null), 4000);
      return;
    }
    if (isHybrid) {
      dispatch('filterChange', { field: 'PatientName', value: patientSearch });
      dispatch('search');
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatusId(val);
    const paramVal = val === 'all' ? [2, 3] : Number(val);
    if (isHybrid) {
      dispatch('filterChange', { field: 'MRDIPFileStatusId', value: paramVal });
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

  // Submit File Request
  const handleSubmitRequest = async () => {
    if (!requestModalItem) return;
    setIsSubmittingRequest(true);

    if (isHybrid) {
      dispatch('filerequest', { entity: requestModalItem });
      setRequestModalItem(null);
      setIsSubmittingRequest(false);
      return;
    }

    try {
      const currentUserId = sessionHelper.getCurrentUserId();
      const payload = {
        MRDIpFileId: requestModalItem.Id,
        EncounterId: requestModalItem.EncounterId || requestModalItem.Id,
        PatientId: requestModalItem.PatientId,
        RequestBy: currentUserId > 0 ? currentUserId : 1,
        RequestDate: new Date().toISOString(),
        Reason: requestReason || 'Clinical review / department request',
        MRDIPFileStatusId: 3, // Status: Requested
      };

      await apiFetch<any>('IPManagement/IPFileRequest/AddIPFileRequest', { Data: payload });
      setNotificationMsg({
        type: 'success',
        text: `File request for Visit ${requestModalItem.VisitNo || requestModalItem.VisitIdentifier} submitted successfully!`,
      });
      setRequestModalItem(null);
      setRequestReason('');
      fetchItems(standalonePage, standalonePageSize);
    } catch (err) {
      console.error('Failed to submit file request:', err);
      setNotificationMsg({
        type: 'error',
        text: 'Failed to submit file request. Please check permissions.',
      });
    } finally {
      setIsSubmittingRequest(false);
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
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            <i className="fa fa-file-text-o" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.02em' }}>
                IP Medical File Request
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
                MRD Archives
              </span>
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Search archived in-patient physical record files and place requisition requests for ward review
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
          {/* Patient Name / MRN */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Patient Name / MRN <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Patient Name / UHID..."
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
              Discharge / Return Date
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
              MRD File Status
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
              <option value="all">Received & Requested</option>
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
              backgroundColor: '#0284c7',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            <i className="fa fa-search" />
            <span>Search Files</span>
          </button>
        </div>
      </div>

      {/* ── Records Table ── */}
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
                <th style={{ padding: '14px 16px' }}>Return Date</th>
                <th style={{ padding: '14px 16px' }}>Visit No</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>Doctor Name</th>
                <th style={{ padding: '14px 16px' }}>File Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-circle-o-notch fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Searching MRD Archives...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-search fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      {patientSearch || visitNoFilter ? 'No Matching Patient Files Found' : 'Enter a Patient Name or MRN to Search'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      Search by patient demographics or IP visit identifier to requisition archived files.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const p = item.Patient;
                  const fullName = `${p?.Title?.Description || ''} ${p?.FirstName || ''} ${p?.LastName || ''}`.trim() || 'Patient';
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
                        <div style={{ fontWeight: 600, color: colors.textMain }}>{formatDateTime(item.ReturnDate)}</div>
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
                          <strong>MRN:</strong> {p?.MRN || '—'} &bull; {p?.Age ? `${p.Age}Y` : ''} {p?.Gender?.Description ? `/${p.Gender.Description}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{item.DoctorName || 'Attending Physician'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {item.MRDIPFileStatus?.Description || 'Received at MRD'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setRequestModalItem(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: radii.md,
                            border: 'none',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <i className="fa fa-hand-paper-o" />
                          <span>File Request</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
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
            Showing <strong>{items.length}</strong> of <strong>{totalItems}</strong> file records
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Request Modal ── */}
      {requestModalItem && (
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
          onClick={() => !isSubmittingRequest && setRequestModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.xl,
              boxShadow: shadows.xl,
              maxWidth: 500,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa fa-file-text-o" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Requisition MRD File</h3>
              </div>
              <button onClick={() => setRequestModalItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <i className="fa fa-times" />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: radii.md, border: `1px solid ${colors.border}`, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {requestModalItem.Patient?.Title?.Description} {requestModalItem.Patient?.FirstName} {requestModalItem.Patient?.LastName}
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  UHID: {requestModalItem.Patient?.MRN} &bull; Visit: {requestModalItem.VisitNo}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                  Reason for File Request <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Readmission review, Medico-legal verification, Insurance claim audit..."
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
                onClick={() => setRequestModalItem(null)}
                style={{ padding: '8px 16px', borderRadius: radii.md, border: `1px solid ${colors.border}`, backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmittingRequest}
                style={{
                  padding: '8px 20px',
                  borderRadius: radii.md,
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isSubmittingRequest ? 'wait' : 'pointer',
                }}
              >
                {isSubmittingRequest ? 'Submitting...' : 'Submit Requisition'}
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
