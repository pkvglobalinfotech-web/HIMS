import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './PharmacyPreviousBillsModal.css';

export interface PharmacyPreviousBillsModalProps {
  reactProps?: {
    title?: string;
    subtitle?: string;
    isOutstanding?: boolean;
    totalOutstanding?: number;
    modeldata?: {
      PatientName?: string;
      FromDate?: string;
      ToDate?: string;
      PatientBillStatusId?: number;
      StoreMasterId?: number;
      BillNumber?: string;
      IsOutStanding?: boolean;
      PharmacySaleTypeId?: number;
      MRN?: string;
    };
    lookup?: {
      PatientBillStatus?: Array<{ Id: number; Text?: string; Description?: string }>;
      UserStores?: Array<{ Id: number; Text?: string; Description?: string; StoreName?: string }>;
      PharmacySaleType?: Array<{ Id: number; Text?: string; Description?: string }>;
    };
    gridData?: any[];
    totalBillAmount?: number;
    pagerObj?: {
      totalItems?: number;
      currentPage?: number;
      startIndex?: number;
      pageSize?: number;
    };
    context?: string;
    isLoading?: boolean;
  };
  onAction?: (actionName: string, payload?: any) => void;
  onClose?: () => void;
  onSelect?: (item: any) => void;
}

const fmtCur = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val as any) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatDateOnly = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDateTime = (val?: string | null): string => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mon}-${yyyy} ${hh}:${min}`;
  } catch {
    return String(val);
  }
};

export const PharmacyPreviousBillsModal: React.FC<PharmacyPreviousBillsModalProps> = ({
  reactProps,
  onAction,
  onClose,
  onSelect,
}) => {
  const modeldata = reactProps?.modeldata || {};
  const lookup = reactProps?.lookup || {};
  const gridData = reactProps?.gridData || [];
  const totalBillAmount = reactProps?.totalBillAmount || 0;
  const pagerObj = reactProps?.pagerObj || { totalItems: gridData.length, currentPage: 1, pageSize: 25 };
  const isLoading = Boolean(reactProps?.isLoading);

  const isOutstanding = Boolean(
    reactProps?.isOutstanding ||
    reactProps?.context === 'outstanding' ||
    modeldata.IsOutStanding ||
    (reactProps?.title && reactProps.title.toLowerCase().includes('outstanding'))
  );

  const modalTitle = reactProps?.title || (isOutstanding ? 'Pharmacy Outstanding Bills' : 'Previous Bills');
  const modalSubtitle = reactProps?.subtitle || (isOutstanding
    ? 'Search and collect historical pharmacy unpaid sales & credit due balances'
    : 'Search and select historical pharmacy outpatient sales & credit bills'
  );
  const totalOutstanding = reactProps?.totalOutstanding || 0;

  // Local Form state synced from props
  const [patientName, setPatientName] = useState<string>(modeldata.PatientName || '');
  const [fromDate, setFromDate] = useState<string>(() => {
    if (modeldata.FromDate) {
      const d = new Date(modeldata.FromDate);
      if (!isNaN(d.getTime())) return formatDateOnly(d);
    }
    return formatDateOnly(new Date());
  });
  const [toDate, setToDate] = useState<string>(() => {
    if (modeldata.ToDate) {
      const d = new Date(modeldata.ToDate);
      if (!isNaN(d.getTime())) return formatDateOnly(d);
    }
    return formatDateOnly(new Date());
  });
  const [statusId, setStatusId] = useState<number>(modeldata.PatientBillStatusId ?? 3);
  const [storeId, setStoreId] = useState<number>(modeldata.StoreMasterId ?? 0);
  const [saleTypeId, setSaleTypeId] = useState<number>(modeldata.PharmacySaleTypeId ?? 1);
  const [billNumber, setBillNumber] = useState<string>(modeldata.BillNumber || '');
  const [activePreset, setActivePreset] = useState<string>('today');

  // Sync incoming props
  useEffect(() => {
    const incomingPatientName = modeldata.PatientName || '';
    if (incomingPatientName !== patientName) {
      setPatientName(incomingPatientName);
    }
    const incomingBillNumber = modeldata.BillNumber || '';
    if (incomingBillNumber !== billNumber) {
      setBillNumber(incomingBillNumber);
    }
    const incomingStatusId = modeldata.PatientBillStatusId !== undefined && modeldata.PatientBillStatusId !== null
      ? modeldata.PatientBillStatusId
      : 3;
    if (incomingStatusId !== statusId) {
      setStatusId(incomingStatusId);
    }
    const incomingStoreId = modeldata.StoreMasterId !== undefined && modeldata.StoreMasterId !== null
      ? modeldata.StoreMasterId
      : 0;
    if (incomingStoreId !== storeId) {
      setStoreId(incomingStoreId);
    }
    const incomingSaleTypeId = modeldata.PharmacySaleTypeId !== undefined && modeldata.PharmacySaleTypeId !== null
      ? modeldata.PharmacySaleTypeId
      : 1;
    if (incomingSaleTypeId !== saleTypeId) {
      setSaleTypeId(incomingSaleTypeId);
    }
  }, [modeldata.PatientName, modeldata.BillNumber, modeldata.PatientBillStatusId, modeldata.StoreMasterId, modeldata.PharmacySaleTypeId]);

  const dispatch = useCallback(
    (actionName: string, payload?: any) => {
      if (typeof onAction === 'function') {
        onAction(actionName, payload);
      }
    },
    [onAction]
  );

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      dispatch('close');
    }
  };

  const handleFetch = (override?: { from?: string; to?: string; pName?: string; bNum?: string; sTypeId?: number }) => {
    dispatch('setFilters', {
      PatientName: override?.pName !== undefined ? override.pName : patientName,
      FromDate: override?.from !== undefined ? override.from : fromDate,
      ToDate: override?.to !== undefined ? override.to : toDate,
      PatientBillStatusId: statusId,
      StoreMasterId: storeId,
      BillNumber: override?.bNum !== undefined ? override.bNum : billNumber,
      PharmacySaleTypeId: override?.sTypeId !== undefined ? override.sTypeId : saleTypeId,
      IsOutStanding: isOutstanding,
    });
    dispatch('fetch');
  };

  const handleReset = () => {
    const today = formatDateOnly(new Date());
    setPatientName('');
    setBillNumber('');
    setFromDate(today);
    setToDate(today);
    setStatusId(3);
    setSaleTypeId(1);
    setActivePreset('today');
    dispatch('reset');
  };

  const handlePreset = (preset: 'today' | 'yesterday' | '7days' | 'month' | 'all') => {
    setActivePreset(preset);
    const now = new Date();
    let f = '';
    let t = '';

    if (preset === 'today') {
      f = formatDateOnly(now);
      t = formatDateOnly(now);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      f = formatDateOnly(y);
      t = formatDateOnly(y);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      f = formatDateOnly(past);
      t = formatDateOnly(now);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      f = formatDateOnly(firstDay);
      t = formatDateOnly(now);
    } else if (preset === 'all') {
      f = '';
      t = '';
    }

    setFromDate(f);
    setToDate(t);
    handleFetch({ from: f, to: t });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFetch();
    }
  };

  const handleSelectBill = (item: any) => {
    if (typeof onSelect === 'function') {
      onSelect(item);
    } else {
      dispatch('select', { item });
    }
  };

  // Find store name
  const currentStoreName = useMemo(() => {
    const stores = lookup.UserStores || [];
    const matched = stores.find((s) => s.Id === storeId);
    return matched ? matched.Text || matched.Description || matched.StoreName : 'CENTRAL STORE';
  }, [lookup.UserStores, storeId]);

  // Compute total due in active grid as fallback
  const totalDueInGrid = useMemo(() => {
    return gridData.reduce((sum, r) => sum + (parseFloat(r.OutStandingAmount) || 0), 0);
  }, [gridData]);

  // Pagination helpers
  const totalItems = pagerObj.totalItems ?? gridData.length;
  const pageSize = pagerObj.pageSize || 25;
  const currentPage = pagerObj.currentPage || 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="prev-bills-modal-container">
      {/* ─────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-bills-header">
        <div className="prev-bills-header-left">
          <div className="prev-bills-header-icon">{isOutstanding ? '💰' : '🧾'}</div>
          <div>
            <h3 className="prev-bills-header-title">{modalTitle}</h3>
            <div className="prev-bills-header-subtitle">{modalSubtitle}</div>
          </div>
        </div>

        <div className="prev-bills-header-right">
          <div className="prev-bills-store-badge">
            <span>🏥</span>
            <span>{currentStoreName}</span>
          </div>

          <button
            type="button"
            className="prev-bills-close-btn"
            title="Close (Esc)"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FILTERS SECTION
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-bills-filters-card">
        {/* Quick Date Presets */}
        <div className="prev-bills-quick-presets">
          <span className="prev-bills-preset-label">Quick Dates:</span>
          <button
            type="button"
            className={`prev-bills-preset-btn ${activePreset === 'today' ? 'active' : ''}`}
            onClick={() => handlePreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`prev-bills-preset-btn ${activePreset === 'yesterday' ? 'active' : ''}`}
            onClick={() => handlePreset('yesterday')}
          >
            Yesterday
          </button>
          <button
            type="button"
            className={`prev-bills-preset-btn ${activePreset === '7days' ? 'active' : ''}`}
            onClick={() => handlePreset('7days')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`prev-bills-preset-btn ${activePreset === 'month' ? 'active' : ''}`}
            onClick={() => handlePreset('month')}
          >
            This Month
          </button>
          <button
            type="button"
            className={`prev-bills-preset-btn ${activePreset === 'all' ? 'active' : ''}`}
            onClick={() => handlePreset('all')}
          >
            All Dates
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="prev-bills-filters-grid">
          {/* From Date */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">From Date</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">📅</span>
              <input
                type="date"
                className="prev-bills-input"
                value={fromDate || ''}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset('custom');
                  dispatch('updateFilter', { field: 'FromDate', value: e.target.value });
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">To Date</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">📅</span>
              <input
                type="date"
                className="prev-bills-input"
                value={toDate || ''}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset('custom');
                  dispatch('updateFilter', { field: 'ToDate', value: e.target.value });
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* My Store */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">My Store</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">🏪</span>
              <select
                className="prev-bills-select"
                value={storeId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStoreId(val);
                  dispatch('updateFilter', { field: 'StoreMasterId', value: val });
                }}
              >
                {(lookup.UserStores || []).map((s, idx) => (
                  <option key={`store-${s.Id}-${idx}`} value={s.Id}>
                    {s.Text || s.Description || s.StoreName || `Store #${s.Id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Patient Type */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">Patient Type</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">🏷️</span>
              <select
                className="prev-bills-select"
                value={saleTypeId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSaleTypeId(val);
                  dispatch('updateFilter', { field: 'PharmacySaleTypeId', value: val });
                }}
              >
                {Array.isArray(lookup.PharmacySaleType) && lookup.PharmacySaleType.length > 0 ? (
                  lookup.PharmacySaleType.map((pt, idx) => (
                    <option key={`saleType-${pt.Id}-${idx}`} value={pt.Id}>
                      {pt.Text || pt.Description || `Type #${pt.Id}`}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Out-Patient</option>
                    <option value={2}>In-Patient</option>
                    <option value={3}>A&E (Emergency)</option>
                    <option value={4}>Direct Sale</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">Status</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">🔘</span>
              <select
                className="prev-bills-select"
                value={statusId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStatusId(val);
                  dispatch('updateFilter', { field: 'PatientBillStatusId', value: val });
                }}
              >
                <option value={-1}>All Statuses</option>
                {(lookup.PatientBillStatus || []).map((st, idx) => (
                  <option key={`status-${st.Id}-${idx}`} value={st.Id}>
                    {st.Text || st.Description || `Status #${st.Id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Patient Name / UHID */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">Patient Name / UHID</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">👤</span>
              <input
                type="text"
                className="prev-bills-input"
                placeholder="Search name or UHID..."
                value={patientName || ''}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  dispatch('updateFilter', { field: 'PatientName', value: e.target.value });
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Bill No */}
          <div className="prev-bills-filter-group">
            <label className="prev-bills-filter-label">Bill No</label>
            <div className="prev-bills-input-wrap">
              <span className="prev-bills-input-icon">🏷️</span>
              <input
                id="BillNumber"
                type="text"
                className="prev-bills-input"
                placeholder="e.g. PHCR24-25/10106..."
                value={billNumber || ''}
                onChange={(e) => {
                  setBillNumber(e.target.value);
                  dispatch('updateFilter', { field: 'BillNumber', value: e.target.value });
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="prev-bills-filter-actions">
            <button
              type="button"
              className="prev-bills-fetch-btn"
              onClick={() => handleFetch()}
              disabled={isLoading}
            >
              <span>{isLoading ? '⏳' : '🔍'}</span>
              <span>{isLoading ? 'Searching...' : 'Fetch'}</span>
            </button>
            <button
              type="button"
              className="prev-bills-reset-btn"
              title="Reset Filters"
              onClick={handleReset}
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TABLE CONTENT
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-bills-table-container">
        {isLoading ? (
          <div className="prev-bills-loading-state">
            <div className="prev-bills-spinner" />
            <div style={{ fontWeight: 600 }}>Fetching bills...</div>
          </div>
        ) : gridData.length === 0 ? (
          <div className="prev-bills-empty-state">
            <div className="prev-bills-empty-icon">📭</div>
            <div className="prev-bills-empty-title">
              {isOutstanding ? 'No Outstanding Bills Found' : 'No Previous Bills Found'}
            </div>
            <div className="prev-bills-empty-desc">
              {isOutstanding
                ? 'No unpaid bills or pending dues match the selected filters.'
                : 'Try adjusting the date range, status, or search keywords to locate historical sales.'}
            </div>
          </div>
        ) : (
          <table className="prev-bills-table">
            <thead>
              <tr>
                <th style={{ width: '90px', textAlign: 'center' }}>Select</th>
                <th>UHID / MRN</th>
                <th>Bill No</th>
                <th>Patient Name</th>
                <th>Bill Date & Time</th>
                <th>Cons. Doctor</th>
                <th style={{ textAlign: 'right' }}>Due Amount</th>
                <th style={{ textAlign: 'right' }}>Paid Amount</th>
                <th style={{ textAlign: 'right' }}>Bill Amount</th>
                <th>Billed By</th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row: any, idx: number) => {
                const patName =
                  row.PharmacySaleTypeId === 4
                    ? row.PatientName || 'Walk-in Patient'
                    : [row.Patient?.Title?.Description, row.Patient?.FirstName, row.Patient?.LastName]
                        .filter(Boolean)
                        .join(' ') || row.PatientName || '-';

                const billedByName = [
                  row.CreatedUser?.Title?.Description,
                  row.CreatedUser?.FirstName,
                  row.CreatedUser?.LastName,
                ]
                  .filter(Boolean)
                  .join(' ') || row.CreatedName || '-';

                const consDoctor = row.User
                  ? [row.User.Title?.Description, row.User.FirstName, row.User.LastName].filter(Boolean).join(' ')
                  : (row.ConsDoctor || row.DoctorName || row.Doctor || '-');

                const dueAmt = row.OutStandingAmount || 0;
                const paidAmt = row.PaidAmount || 0;
                const billAmt = row.BillAmount || 0;
                const mrn = row.Patient?.MRN || row.MRN || '-';

                return (
                  <tr key={`bill-${row.Id || idx}-${idx}`}>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="prev-bills-select-btn"
                        title="Select and load this bill into pharmacy sales"
                        onClick={() => handleSelectBill(row)}
                      >
                        <span>✓</span>
                        <span>Select</span>
                      </button>
                    </td>

                    <td>
                      <span className="prev-bills-uhid-badge">{mrn}</span>
                    </td>

                    <td>
                      <span className="prev-bills-billno-link">{row.BillNumber || '-'}</span>
                    </td>

                    <td>
                      <div className="prev-bills-patient-cell">
                        <div className="prev-bills-patient-avatar">
                          {patName.charAt(0).toUpperCase()}
                        </div>
                        <span className="prev-bills-patient-name">{patName}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: '#475569' }}>
                        {formatDisplayDateTime(row.BillDateTime)}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                        {consDoctor}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span className={`prev-bills-due-badge ${dueAmt > 0 ? 'has-due' : 'no-due'}`}>
                        {fmtCur(dueAmt)}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span className="prev-bills-paid-amount">{fmtCur(paidAmt)}</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span className="prev-bills-total-amount">{fmtCur(billAmt)}</span>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: '#475569' }}>{billedByName}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER / SUMMARY & PAGINATION
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-bills-footer">
        <div className="prev-bills-footer-left">
          <div className="prev-bills-records-count">
            Showing <strong>{gridData.length}</strong> of <strong>{totalItems}</strong> records
          </div>

          {isOutstanding ? (
            <div className="prev-bills-total-pill due">
              <span className="prev-bills-total-label">Total Due:</span>
              <span className="prev-bills-total-val">
                {fmtCur(totalOutstanding > 0 ? totalOutstanding : totalDueInGrid)}
              </span>
            </div>
          ) : (
            <div className="prev-bills-total-pill">
              <span className="prev-bills-total-label">Total Bill Amount:</span>
              <span className="prev-bills-total-val">{fmtCur(totalBillAmount)}</span>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="prev-bills-pagination">
            <button
              type="button"
              className="prev-bills-page-btn"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => dispatch('changePage', { page: 1 })}
              title="First Page"
            >
              «
            </button>
            <button
              type="button"
              className="prev-bills-page-btn"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => dispatch('changePage', { page: currentPage - 1 })}
              title="Previous Page"
            >
              ‹
            </button>

            <span className="prev-bills-page-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="prev-bills-page-btn"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => dispatch('changePage', { page: currentPage + 1 })}
              title="Next Page"
            >
              ›
            </button>
            <button
              type="button"
              className="prev-bills-page-btn"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => dispatch('changePage', { page: totalPages })}
              title="Last Page"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyPreviousBillsModal;
