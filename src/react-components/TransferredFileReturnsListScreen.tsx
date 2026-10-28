import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface TransferredFileReturnRow {
  id: number;
  requestDateDisplay?: string;
  requestTimeDisplay?: string;
  visitNo?: string;
  patientName?: string;
  patientId?: number;
  mrn?: string;
  requestUserTitle?: string;
  requestUserFirstName?: string;
  requestUserLastName?: string;
  approveUserTitle?: string;
  approveUserFirstName?: string;
  approveUserLastName?: string;
  doctorName?: string;
  statusDescription?: string;
  statusId?: number;
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface TransferredFileReturnsListScreenProps {
  reactProps?: {
    headers?: string[];
    rows?: TransferredFileReturnRow[];
    items?: any[];
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
  onAction?: (actionType: string, payload?: any) => void;
}

export const TransferredFileReturnsListScreen: React.FC<TransferredFileReturnsListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<any[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filters
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
  const [selectedStatusId, setSelectedStatusId] = useState<any>(
    reactProps?.currentfilter?.MRDIPFileStatusId ?? [5, 7]
  );

  // Modals
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);

  // Normalized rows
  const displayRows: TransferredFileReturnRow[] = useMemo(() => {
    if (reactProps?.rows && reactProps.rows.length > 0) {
      return reactProps.rows;
    }
    // Standalone normalization
    return standaloneItems.map((item) => {
      const d = item.RequestDate ? new Date(item.RequestDate) : null;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateDisplay = d ? `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}` : '—';
      const timeDisplay = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';

      const p = item.Patient;
      const pName = `${p?.Title?.Description || ''} ${p?.FirstName || ''} ${p?.LastName || ''}`.trim() || item.PatientName || 'Patient';

      return {
        id: item.Id,
        requestDateDisplay: dateDisplay,
        requestTimeDisplay: timeDisplay,
        visitNo: item.VisitNo || item.VisitIdentifier,
        patientName: pName,
        patientId: item.PatientId || p?.Id,
        mrn: p?.MRN || item.PatientMrn,
        requestUserTitle: item.RequestUser?.Title?.Description || '',
        requestUserFirstName: item.RequestUser?.FirstName || '',
        requestUserLastName: item.RequestUser?.LastName || '',
        approveUserTitle: item.ApproveUser?.Title?.Description || '',
        approveUserFirstName: item.ApproveUser?.FirstName || '',
        approveUserLastName: item.ApproveUser?.LastName || '',
        doctorName: item.DoctorName || `${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim(),
        statusDescription: item.MRDIPFileStatus?.Description || 'Transferred',
        statusId: item.MRDIPFileStatusId || item.StatusId || 5,
      };
    });
  }, [reactProps?.rows, standaloneItems]);

  const totalItems: number = isHybrid
    ? reactProps?.pager?.totalItems || displayRows.length
    : standaloneTotal;
  const currentPage: number = isHybrid
    ? reactProps?.pager?.currentPage || 1
    : standalonePage;
  const pageSize: number = isHybrid
    ? reactProps?.pager?.pageSize || 25
    : standalonePageSize;

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
      console.warn('Failed to load MRD File status options:', err);
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
            { Key: 6, Value: Array.isArray(selectedStatusId) ? selectedStatusId : [selectedStatusId] },
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
        console.error('Failed to load Transferred File Returns:', err);
        setStandaloneItems([]);
        setStandaloneTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, searchTerm, visitNoFilter, requestDateFilter, selectedStatusId]
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

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('pageChange', { page });
    } else {
      setStandalonePage(page);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    let flagged = 0;
    let completed = 0;
    displayRows.forEach((r) => {
      if (r.statusId === 7) flagged++;
      if (r.statusId === 8) completed++;
    });
    return {
      total: totalItems,
      flagged,
      completed,
    };
  }, [displayRows, totalItems]);

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
            <i className="fa fa-reply-all" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.02em' }}>
                Transferred File Returns
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
                MRD Inpatient Archives
              </span>
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Track physical inpatient record files currently in department circulation and record returns back to MRD
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

      {/* ── KPI Summary Cards ── */}
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
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Total In Circulation</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-folder-open" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e40af', marginTop: 6 }}>
            {kpis.total}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Files transferred to clinical units
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>Flagged / Delayed Returns</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-clock-o" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b91c1c', marginTop: 6 }}>
            {kpis.flagged}
          </div>
          <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>
            Pending overdue department return
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Returned to MRD</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-check-circle" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#166534', marginTop: 6 }}>
            {kpis.completed}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            Archived back in records library
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
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

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Requisition Date
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

          {/* Action Button */}
          <div>
            <button
              type="button"
              onClick={handleSearch}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px 20px',
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
              <span>Search Records</span>
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
                <th style={{ padding: '14px 16px' }}>Date & Time</th>
                <th style={{ padding: '14px 16px' }}>Visit No</th>
                <th style={{ padding: '14px 16px' }}>Patient Name</th>
                <th style={{ padding: '14px 16px' }}>Requested By</th>
                <th style={{ padding: '14px 16px' }}>Approved By</th>
                <th style={{ padding: '14px 16px' }}>Attending Doctor</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-circle-o-notch fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: 10 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Loading Transferred Files...</div>
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-files-o fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                      No Transferred Records Found
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      All borrowed physical files have been accounted for or no records matched the filters.
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) => {
                  const isOverdue = row.statusId === 7;
                  const reqUser = [row.requestUserTitle, row.requestUserFirstName, row.requestUserLastName].filter(Boolean).join(' ') || '—';
                  const appUser = [row.approveUserTitle, row.approveUserFirstName, row.approveUserLastName].filter(Boolean).join(' ') || '—';

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: isOverdue ? '#fef2f2' : idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: colors.textMuted, fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>{row.requestDateDisplay}</div>
                        {row.requestTimeDisplay && (
                          <div style={{ fontSize: 11, color: colors.textMuted }}>{row.requestTimeDisplay}</div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {row.visitNo || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div
                          onClick={() => {
                            if (isHybrid) dispatch('cellAction', { key: 'patient', id: row.id });
                            else if (row.patientId) setProfileModalPatientId(row.patientId);
                          }}
                          style={{ fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}
                        >
                          {row.patientName}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{reqUser}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{appUser}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{row.doctorName || '—'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {isOverdue ? (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: radii.full,
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} />
                            {row.statusDescription || 'Overdue Return'}
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: radii.full,
                              backgroundColor: row.statusId === 8 ? '#f0fdf4' : '#eff6ff',
                              color: row.statusId === 8 ? '#166534' : '#1d4ed8',
                              border: `1px solid ${row.statusId === 8 ? '#bbf7d0' : '#bfdbfe'}`,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {row.statusDescription || 'Transferred'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onAction) onAction('fileReturn', { id: row.id });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: radii.md,
                            border: 'none',
                            backgroundColor: row.statusId === 8 ? '#64748b' : '#0284c7',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                          }}
                        >
                          <i className={`fa ${row.statusId === 8 ? 'fa-eye' : 'fa-reply'}`} />
                          <span>{row.statusId === 8 ? 'View' : 'File Return'}</span>
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
            Showing <strong>{displayRows.length}</strong> of <strong>{totalItems}</strong> records
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

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
