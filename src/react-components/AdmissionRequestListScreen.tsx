import React, { useState, useEffect, useCallback } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';

export interface AdmissionRequestItem {
  Id: number;
  RequestIdentifier?: string;
  RequestedNo?: string;
  RequestDate?: string;
  CreatedAt?: string;
  AdmissionRequestTypeId?: number;
  AdmissionRequestType?: { Description?: string };
  AdmissionStatusId?: number;
  AdmissionStatus?: { Description?: string };
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Age?: number | string;
    Gender?: { Description?: string };
    Title?: { Description?: string };
  };
  Doctor?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  WardMaster?: { WardName?: string };
  WardRoomBedMaster?: { BedNo?: string };
  [key: string]: any;
}

export interface AdmissionRequestListScreenProps {
  reactProps?: {
    items?: AdmissionRequestItem[];
    totalItems?: number;
    currentPage?: number;
    pageSize?: number;
    currentfilter?: {
      RequestedNo?: string;
      FromDate?: string;
      ToDate?: string;
      admissionstatusid?: number | string;
      AdmissionRequestTypeId?: number | string;
    };
    lookup?: {
      AdmissionStatus?: Array<{ Id: number; Text: string }>;
      AdmissionRequestType?: Array<{ Id: number; Text: string }>;
    };
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const AdmissionRequestListScreen: React.FC<AdmissionRequestListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && Array.isArray(reactProps.items));

  // Standalone state
  const [standaloneItems, setStandaloneItems] = useState<AdmissionRequestItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter state
  const [requestedNo, setRequestedNo] = useState<string>(
    reactProps?.currentfilter?.RequestedNo || ''
  );
  const [fromDate, setFromDate] = useState<string>(
    reactProps?.currentfilter?.FromDate
      ? new Date(reactProps.currentfilter.FromDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(
    reactProps?.currentfilter?.ToDate
      ? new Date(reactProps.currentfilter.ToDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [selectedStatus, setSelectedStatus] = useState<number | string>(
    reactProps?.currentfilter?.admissionstatusid ?? 2
  );
  const [selectedType, setSelectedType] = useState<number | string>(
    reactProps?.currentfilter?.AdmissionRequestTypeId ?? -1
  );

  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.RequestedNo !== undefined) {
        setRequestedNo(reactProps.currentfilter.RequestedNo);
      }
      if (reactProps.currentfilter.admissionstatusid !== undefined) {
        setSelectedStatus(reactProps.currentfilter.admissionstatusid);
      }
      if (reactProps.currentfilter.AdmissionRequestTypeId !== undefined) {
        setSelectedType(reactProps.currentfilter.AdmissionRequestTypeId);
      }
      if (reactProps.currentfilter.FromDate) {
        try {
          const d = new Date(reactProps.currentfilter.FromDate);
          if (!isNaN(d.getTime())) setFromDate(d.toISOString().split('T')[0]);
        } catch {}
      }
      if (reactProps.currentfilter.ToDate) {
        try {
          const d = new Date(reactProps.currentfilter.ToDate);
          if (!isNaN(d.getTime())) setToDate(d.toISOString().split('T')[0]);
        } catch {}
      }
    }
  }, [reactProps?.currentfilter]);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) onAction(action, payload);
  };

  const fetchStandaloneList = useCallback(
    async (page: number = 1, pageSize: number = 25) => {
      setIsLoading(true);
      try {
        const From = fromDate ? `${fromDate} 00:00:00` : null;
        const To = toDate ? `${toDate} 23:59:59` : null;

        const inputData = {
          Params: [
            { Key: 16, Value: From },
            { Key: 17, Value: To },
            { Key: 13, Value: requestedNo || null },
            { Key: 2, Value: Number(selectedStatus) },
            { Key: 8, Value: Number(selectedType) },
          ],
          PageContext: {
            PageSize: pageSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/admissionrequest/GetAdmissionRequests', inputData);
        if (res) {
          setStandaloneItems(res.Data || []);
          setStandaloneTotal(res.PageContext?.TotalRecords || 0);
          setStandalonePage(page);
          setStandalonePageSize(pageSize);
        }
      } catch (err) {
        console.error('Failed to fetch standalone admission requests:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [fromDate, toDate, requestedNo, selectedStatus, selectedType]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchStandaloneList(1, 25);
    }
  }, [isHybrid, fetchStandaloneList]);

  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'RequestedNo', value: requestedNo });
      dispatch('search');
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    if (field === 'RequestedNo') setRequestedNo(value);
    if (field === 'FromDate') setFromDate(value);
    if (field === 'ToDate') setToDate(value);
    if (field === 'admissionstatusid') setSelectedStatus(value);
    if (field === 'AdmissionRequestTypeId') setSelectedType(value);

    if (isHybrid) {
      dispatch('filterChangeAndSearch', { field, value });
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setRequestedNo('');
    setFromDate(today);
    setToDate(today);
    setSelectedStatus(2);
    setSelectedType(-1);

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

  const formatDate = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const getStatusTone = (statusId?: number) => {
    switch (statusId) {
      case 1:
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 2:
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 3:
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
      {/* ── Top Header ── */}
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
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-pencil-square-o" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textMain }}>
                Admission Requests
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
                {totalItems} Requests
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Hospital IP Management • Inpatient Booking & Admission Orders
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <button
            onClick={() => dispatch('doctorDashboard')}
            title="Doctor Dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
            }}
          >
            <i className="fa fa-user-md" style={{ color: '#0284c7' }} />
            <span>Doctor Dashboard</span>
          </button>

          <button
            onClick={() => dispatch('addNew')}
            title="Create New Admission Request"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
            }}
          >
            <i className="fa fa-plus" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
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
          {/* Requested No Search */}
          <div style={{ minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
              Request Number
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={requestedNo}
                onChange={(e) => setRequestedNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder="Enter Request #"
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 32px 0 10px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleSearchSubmit}
                style={{
                  position: 'absolute',
                  right: 4,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#0284c7',
                }}
              >
                <i className="fa fa-search" />
              </button>
            </div>
          </div>

          {/* From Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFilterChange('FromDate', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* To Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleFilterChange('ToDate', e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
              Request Status
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
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="-1">All Statuses</option>
              <option value="1">Pending</option>
              <option value="2">Approved / Admitted</option>
              <option value="3">Cancelled</option>
            </select>
          </div>

          {/* Reset */}
          <div>
            <button
              onClick={handleResetFilters}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
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
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Request #</th>
                <th style={{ padding: '12px 14px' }}>Patient Details</th>
                <th style={{ padding: '12px 14px' }}>Requested Ward / Bed</th>
                <th style={{ padding: '12px 14px' }}>Doctor</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <i className="fa fa-inbox" style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12, display: 'block' }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textMain }}>No Admission Requests Found</div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  const patient = item.Patient || {};
                  const fullName = `${patient.Title?.Description || ''} ${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || '—';
                  const doctorName = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim() || '—';
                  const statusTone = getStatusTone(item.AdmissionStatusId);

                  return (
                    <tr
                      key={item.Id || index}
                      style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', color: colors.textMuted }}>{sNo}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {formatDate(item.RequestDate || item.CreatedAt)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: '#f1f5f9',
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {item.RequestedNo || item.RequestIdentifier || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0284c7' }}>{fullName}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          MRN: <strong>{patient.MRN || '—'}</strong>
                          {patient.Age ? ` • ${patient.Age} yrs` : ''}
                          {patient.Gender?.Description ? ` • ${patient.Gender.Description}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {[item.WardMaster?.WardName, item.WardRoomBedMaster?.BedNo].filter(Boolean).join(' / ') || 'General Ward'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>{doctorName}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: statusTone.bg,
                            color: statusTone.color,
                            border: `1px solid ${statusTone.border}`,
                          }}
                        >
                          {item.AdmissionStatus?.Description || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => dispatch('edit', item)}
                            title="Edit Request"
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
                            <i className="fa fa-pencil" />
                          </button>
                          <button
                            onClick={() => dispatch('delete', item)}
                            title="Delete Request"
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
                            }}
                          >
                            <i className="fa fa-trash-o" />
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
            Showing <strong>{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> requests
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};
