import React, { useState, useEffect, useMemo } from 'react';
import './PharmacyPreviousReturnsModal.css';

export interface PharmacyPreviousReturnsModalProps {
  reactProps?: {
    title?: string;
    subtitle?: string;
    modeldata?: {
      PatientName?: string;
      FromDate?: string;
      ToDate?: string;
      ReturnNumber?: string;
      PatientReturnStatusId?: number;
      ReturnPriorityId?: number;
      MRN?: string;
      MobileNo?: string;
    };
    lookup?: {
      PatientReturnStatus?: Array<{ Id: number; Text?: string; Description?: string }>;
      ReturnPriority?: Array<{ Id: number; Text?: string; Description?: string }>;
    };
    gridData?: any[];
    totalReturnAmount?: number;
    pagerObj?: {
      totalItems?: number;
      currentPage?: number;
      startIndex?: number;
      pageSize?: number;
    };
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

export const PharmacyPreviousReturnsModal: React.FC<PharmacyPreviousReturnsModalProps> = ({
  reactProps,
  onAction,
  onClose,
  onSelect,
}) => {
  const modeldata = reactProps?.modeldata || {};
  const lookup = reactProps?.lookup || {};
  const gridData = reactProps?.gridData || [];
  const totalReturnAmount = reactProps?.totalReturnAmount || 0;
  const pagerObj = reactProps?.pagerObj || { totalItems: gridData.length, currentPage: 1, pageSize: 25 };
  const isLoading = Boolean(reactProps?.isLoading);

  const modalTitle = reactProps?.title || 'Previous Returns';
  const modalSubtitle = reactProps?.subtitle || 'Search and select historical pharmacy return vouchers and refund notes';

  // Form state
  const [patientName, setPatientName] = useState<string>(modeldata.PatientName || '');
  const [returnNumber, setReturnNumber] = useState<string>(modeldata.ReturnNumber || '');
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
  const [statusId, setStatusId] = useState<number>(modeldata.PatientReturnStatusId ?? -1);
  const [activePreset, setActivePreset] = useState<string>('today');

  // Sync incoming props
  useEffect(() => {
    if (modeldata.PatientName !== undefined && modeldata.PatientName !== patientName) {
      setPatientName(modeldata.PatientName || '');
    }
    if (modeldata.ReturnNumber !== undefined && modeldata.ReturnNumber !== returnNumber) {
      setReturnNumber(modeldata.ReturnNumber || '');
    }
    if (modeldata.PatientReturnStatusId !== undefined && modeldata.PatientReturnStatusId !== statusId) {
      setStatusId(modeldata.PatientReturnStatusId ?? -1);
    }
  }, [modeldata.PatientName, modeldata.ReturnNumber, modeldata.PatientReturnStatusId]);

  const dispatch = (action: string, payload?: any) => {
    if (typeof onAction === 'function') {
      onAction(action, payload);
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      dispatch('close');
    }
  };

  const handleFetch = (overrideFilters?: { from?: string; to?: string; patient?: string; retNo?: string; status?: number }) => {
    const filters = {
      PatientName: overrideFilters?.patient !== undefined ? overrideFilters.patient : patientName,
      ReturnNumber: overrideFilters?.retNo !== undefined ? overrideFilters.retNo : returnNumber,
      FromDate: overrideFilters?.from !== undefined ? overrideFilters.from : fromDate,
      ToDate: overrideFilters?.to !== undefined ? overrideFilters.to : toDate,
      PatientReturnStatusId: overrideFilters?.status !== undefined ? overrideFilters.status : statusId,
    };
    dispatch('setFilters', filters);
    dispatch('fetch');
  };

  const handleReset = () => {
    const todayStr = formatDateOnly(new Date());
    setPatientName('');
    setReturnNumber('');
    setFromDate(todayStr);
    setToDate(todayStr);
    setStatusId(-1);
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

  // Keyboard shortcut: Escape to close, Enter to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectReturn = (item: any) => {
    if (typeof onSelect === 'function') {
      onSelect(item);
    } else {
      dispatch('select', { item });
    }
  };

  // Pagination helpers
  const totalItems = pagerObj.totalItems ?? gridData.length;
  const pageSize = pagerObj.pageSize || 25;
  const currentPage = pagerObj.currentPage || 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Compute live total amount from grid if server total is 0
  const computedTotalAmount = useMemo(() => {
    if (totalReturnAmount > 0) return totalReturnAmount;
    return gridData.reduce((sum, item) => sum + (parseFloat(item.ReturnAmount) || 0), 0);
  }, [totalReturnAmount, gridData]);

  return (
    <div className="prev-returns-modal-container">
      {/* ─────────────────────────────────────────────────────────────
          1. MODAL HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-returns-header">
        <div className="prev-returns-header-left">
          <div className="prev-returns-header-icon" title="Pharmacy Return Records">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
          <div>
            <h3 className="prev-returns-header-title">{modalTitle}</h3>
            <div className="prev-returns-header-subtitle">{modalSubtitle}</div>
          </div>
        </div>

        <div className="prev-returns-header-right">
          <div className="prev-returns-badge">
            <span>📦</span>
            <span>Return History Archive</span>
          </div>

          <button
            type="button"
            className="prev-returns-close-btn"
            title="Close Modal (Esc)"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTERS & SEARCH
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-returns-filters-card">
        {/* Quick Date Presets */}
        <div className="prev-returns-quick-presets">
          <span className="prev-returns-preset-label">Quick Dates:</span>
          <button
            type="button"
            className={`prev-returns-preset-btn ${activePreset === 'today' ? 'active' : ''}`}
            onClick={() => handlePreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`prev-returns-preset-btn ${activePreset === 'yesterday' ? 'active' : ''}`}
            onClick={() => handlePreset('yesterday')}
          >
            Yesterday
          </button>
          <button
            type="button"
            className={`prev-returns-preset-btn ${activePreset === '7days' ? 'active' : ''}`}
            onClick={() => handlePreset('7days')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`prev-returns-preset-btn ${activePreset === 'month' ? 'active' : ''}`}
            onClick={() => handlePreset('month')}
          >
            This Month
          </button>
          <button
            type="button"
            className={`prev-returns-preset-btn ${activePreset === 'all' ? 'active' : ''}`}
            onClick={() => handlePreset('all')}
          >
            All Dates
          </button>
        </div>

        {/* Filters Grid */}
        <div className="prev-returns-filters-grid">
          {/* Patient Name / UHID */}
          <div className="prev-returns-filter-group">
            <label className="prev-returns-filter-label">Patient Name / UHID</label>
            <div className="prev-returns-input-wrap">
              <span className="prev-returns-input-icon">👤</span>
              <input
                type="text"
                className="prev-returns-input"
                placeholder="Name / UHID..."
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
          </div>

          {/* From Date */}
          <div className="prev-returns-filter-group">
            <label className="prev-returns-filter-label">From Date</label>
            <div className="prev-returns-input-wrap">
              <span className="prev-returns-input-icon">📅</span>
              <input
                type="date"
                className="prev-returns-input"
                value={fromDate || ''}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset('custom');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="prev-returns-filter-group">
            <label className="prev-returns-filter-label">To Date</label>
            <div className="prev-returns-input-wrap">
              <span className="prev-returns-input-icon">📅</span>
              <input
                type="date"
                className="prev-returns-input"
                value={toDate || ''}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset('custom');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
          </div>

          {/* Return Number */}
          <div className="prev-returns-filter-group">
            <label className="prev-returns-filter-label">Return No</label>
            <div className="prev-returns-input-wrap">
              <span className="prev-returns-input-icon">#</span>
              <input
                type="text"
                className="prev-returns-input"
                placeholder="Return No..."
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="prev-returns-actions-group">
            <button
              type="button"
              className="prev-returns-btn primary"
              onClick={() => handleFetch()}
              disabled={isLoading}
              title="Search Previous Returns (Enter)"
            >
              {isLoading ? '⏳ Loading...' : '🔍 Fetch'}
            </button>
            <button
              type="button"
              className="prev-returns-btn secondary"
              onClick={handleReset}
              title="Reset Filters"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DATA TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-returns-table-wrapper">
        <table className="prev-returns-table">
          <thead>
            <tr>
              <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
              <th style={{ width: '120px' }}>UHID / MRN</th>
              <th style={{ width: '130px' }}>Return No</th>
              <th>Patient Name</th>
              <th style={{ width: '150px' }}>Return Date</th>
              <th style={{ width: '110px' }}>Status</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Refunded Amt</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Refund Amt</th>
              <th style={{ width: '150px' }}>Billed By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`loading-${idx}`} className="prev-returns-loading-row">
                  <td colSpan={9}>
                    <div className="skeleton-shimmer" />
                  </td>
                </tr>
              ))
            ) : gridData.length > 0 ? (
              gridData.map((row, idx) => {
                const patientMRN = row.PatientMRN || row.MRN || row.Patient?.MRN || '-';
                const patientFullName = row.PatientName || (row.Patient ? `${row.Patient.Title?.Description || ''} ${row.Patient.FirstName || ''} ${row.Patient.LastName || ''}`.trim() : '-');
                const statusName = row.PatientReturnStatus?.Description || row.RefundStatus || (row.PatientReturnStatusId === 3 ? 'Approved' : 'Draft');
                const statusCls = statusName.toLowerCase().includes('approve')
                  ? 'approved'
                  : statusName.toLowerCase().includes('cancel')
                  ? 'cancelled'
                  : 'draft';
                const createdBy = row.CreatedUser
                  ? `${row.CreatedUser.Title?.Description || ''} ${row.CreatedUser.FirstName || ''} ${row.CreatedUser.LastName || ''}`.trim()
                  : row.CreatedName || '-';

                return (
                  <tr
                    key={row.Id || idx}
                    className="prev-returns-row"
                    onClick={() => handleSelectReturn(row)}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="return-select-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectReturn(row);
                        }}
                      >
                        ✓ Select
                      </button>
                    </td>
                    <td>
                      <span className="return-mrn-badge">{patientMRN}</span>
                    </td>
                    <td>
                      <span className="return-no-badge">
                        {row.ReturnNumber || `#${row.Id}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{patientFullName}</td>
                    <td style={{ color: '#475569' }}>
                      {formatDisplayDateTime(row.ReturnDateTime)}
                    </td>
                    <td>
                      <span className={`return-status-chip ${statusCls}`}>
                        ● {statusName}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="refunded-amount-val">
                      {fmtCur(row.RefundedAmount || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="return-amount-val">
                      {fmtCur(row.ReturnAmount || 0)}
                    </td>
                    <td style={{ color: '#64748b' }}>{createdBy}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9}>
                  <div className="prev-returns-empty-state">
                    <div className="prev-returns-empty-icon">📋</div>
                    <h4 className="prev-returns-empty-title">No Previous Returns Found</h4>
                    <p className="prev-returns-empty-desc">
                      No return vouchers match the selected search criteria. Try expanding your date range or searching by patient UHID or return number.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER (PAGINATION & TOTAL AMOUNT)
      ───────────────────────────────────────────────────────────── */}
      <div className="prev-returns-footer">
        <div className="prev-returns-footer-info">
          <span>
            Showing <strong>{gridData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> -{' '}
            <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
            <strong>{totalItems}</strong> returns
          </span>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="prev-returns-pagination">
              <button
                type="button"
                className="prev-returns-page-btn"
                disabled={currentPage <= 1}
                onClick={() => dispatch('changePage', { page: 1 })}
                title="First Page"
              >
                «
              </button>
              <button
                type="button"
                className="prev-returns-page-btn"
                disabled={currentPage <= 1}
                onClick={() => dispatch('changePage', { page: currentPage - 1 })}
                title="Previous Page"
              >
                ‹
              </button>

              <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 8px', color: '#475569' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="prev-returns-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => dispatch('changePage', { page: currentPage + 1 })}
                title="Next Page"
              >
                ›
              </button>
              <button
                type="button"
                className="prev-returns-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => dispatch('changePage', { page: totalPages })}
                title="Last Page"
              >
                »
              </button>
            </div>
          )}
        </div>

        {/* Total Return Amount Highlight */}
        <div className="prev-returns-total-box">
          <span className="prev-returns-total-label">Total Return Amount:</span>
          <span className="prev-returns-total-val">{fmtCur(computedTotalAmount)}</span>
        </div>
      </div>
    </div>
  );
};

export default PharmacyPreviousReturnsModal;
