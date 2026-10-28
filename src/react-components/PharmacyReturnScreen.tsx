import React, { useState, useEffect, useMemo, useRef } from 'react';
import './PharmacyReturnScreen.css';
import { apiFetch } from './utils/api';

// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────
export interface LookupItem {
  Id: number;
  Text: string;
  Code?: string;
  [key: string]: any;
}

export interface PatientReturnDetailRow {
  Id?: number;
  _sourceIndex?: number;
  PatientBillDetailId?: number;
  PatientBillId?: number;
  ServiceId?: number;
  ItemMasterId?: number;
  ItemCode?: string;
  ServiceName?: string;
  ItemName?: string;
  GenericName?: string;
  RST?: string;
  Quantity?: number;
  SoldQuantity?: number;
  ReturnedQuantity?: number;
  ReturnQuantity?: number | string;
  BatchId?: string;
  ExpiryDate?: string;
  Rate?: number;
  GSTPercentage?: number;
  GSTAmount?: number;
  DiscountData?: number | string;
  DiscountAmount?: number;
  UnitDiscountAmount?: number;
  NetAmount?: number;
  IsNarcotic?: boolean;
  IsPrescribed?: boolean;
  Status?: number;
  [key: string]: any;
}

export interface PharmacyReturnScreenProps {
  reactProps?: {
    item?: any;
    currentfilter?: any;
    currentcontext?: any;
    selectedPatient?: any;
    encounter?: any;
    patientReturnDetails?: PatientReturnDetailRow[];
    lookup?: {
      PaymentType?: LookupItem[];
      Bank?: LookupItem[];
      CardType?: LookupItem[];
      DiscountMode?: LookupItem[];
      UserStores?: LookupItem[];
      PrivateDueApprover?: LookupItem[];
      Guarantor?: LookupItem[];
      [key: string]: any;
    };
    privileges?: {
      canSave?: boolean;
      canSaveApprove?: boolean;
      canPrint?: boolean;
      [key: string]: any;
    };
    flags?: {
      canShowSaveBtn?: boolean;
      canShowSaveapproveBtn?: boolean;
      canShowClearBtn?: boolean;
      canShowCancelBtn?: boolean;
      hidePrintBtn?: boolean;
      isApproved?: boolean;
      isSaving?: boolean;
      context?: string;
      [key: string]: any;
    };
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const PharmacyReturnScreen: React.FC<PharmacyReturnScreenProps> = ({ reactProps, onAction }) => {
  // Safe extracts from reactProps
  const item = reactProps?.item || {};
  const currentfilter = reactProps?.currentfilter || {};
  const currentcontext = reactProps?.currentcontext || {};
  const selectedPatient = reactProps?.selectedPatient || {};
  const rawDetails = reactProps?.patientReturnDetails || [];
  const lookup = reactProps?.lookup || {};
  const flags = reactProps?.flags || {};

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Local state for Quick Bill search
  const [quickBillNo, setQuickBillNo] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [localReturnDetails, setLocalReturnDetails] = useState<PatientReturnDetailRow[]>(() =>
    (rawDetails || []).map((item, idx) => ({ ...item, _sourceIndex: idx }))
  );

  // Sync incoming details into local state with explicit _sourceIndex so each row in multi-item invoices is independently addressable
  useEffect(() => {
    setLocalReturnDetails(
      (rawDetails || []).map((item, idx) => ({
        ...item,
        _sourceIndex: idx,
      }))
    );
  }, [rawDetails]);

  // Format currency helper
  const fmtCur = (val: number | string | undefined | null) => {
    const num = Number(val);
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toFixed(2)}`;
  };

  // Format Date helper
  const fmtDate = (d: string | Date | undefined | null) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(d);
    }
  };

  // Effective Patient Info
  const patientName = useMemo(() => {
    const title = selectedPatient.Title?.Description || item.Title || '';
    const name = selectedPatient.FirstName || selectedPatient.PatientName || item.PatientName || '-';
    return [title, name].filter(Boolean).join(' ').trim();
  }, [selectedPatient, item]);

  const uhid = selectedPatient.MRN || item.PatientMRN || item.MRN || '-';
  const ageGender = useMemo(() => {
    const age = selectedPatient.Age ? `${selectedPatient.Age} Yrs` : '';
    const gender = selectedPatient.Gender?.Description || (selectedPatient.GenderId === 1 ? 'Male' : selectedPatient.GenderId === 2 ? 'Female' : '');
    return [age, gender].filter(Boolean).join(' / ') || '-';
  }, [selectedPatient]);

  const mobile = selectedPatient.Mobile || item.MobileNo || item.Mobile || '-';
  const doctorName = currentfilter.DoctorName || item.DoctorName || '-';

  // Filtered return items (if user types in table filter search bar)
  const displayItems = useMemo(() => {
    if (!filterQuery) return localReturnDetails;
    const q = filterQuery.toLowerCase();
    return localReturnDetails.filter(
      (r) =>
        (r.ServiceName || r.ItemName || '').toLowerCase().includes(q) ||
        (r.ItemCode || '').toLowerCase().includes(q) ||
        (r.GenericName || '').toLowerCase().includes(q) ||
        (r.BatchId || '').toLowerCase().includes(q)
    );
  }, [localReturnDetails, filterQuery]);

  // Handle Return Qty change for an individual row
  const handleQtyChange = (row: PatientReturnDetailRow, newQtyStr: string) => {
    const soldQty = Number(row.Quantity ?? row.SoldQuantity ?? 0);
    const returnedQty = Number(row.ReturnedQuantity ?? 0);
    const maxAvailable = Math.max(0, soldQty - returnedQty);

    let val = parseInt(newQtyStr, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > maxAvailable) {
      val = maxAvailable;
    }

    // Determine the exact source index in the bill's item array
    let targetIndex = typeof row._sourceIndex === 'number' ? row._sourceIndex : -1;
    if (targetIndex < 0 || targetIndex >= rawDetails.length) {
      targetIndex = rawDetails.findIndex(
        (r) =>
          (r.PatientBillDetailId && row.PatientBillDetailId && r.PatientBillDetailId === row.PatientBillDetailId) ||
          (r.BatchId && row.BatchId && r.ItemMasterId === row.ItemMasterId && r.BatchId === row.BatchId) ||
          r === row
      );
    }
    if (targetIndex < 0) targetIndex = 0;

    // Update locally for zero input lag across all items
    setLocalReturnDetails((prev) =>
      prev.map((r, i) => (i === targetIndex ? { ...r, ReturnQuantity: val } : r))
    );

    dispatch('returnQtyChange', {
      index: targetIndex,
      patientBillDetailId: row.PatientBillDetailId,
      item: row,
      quantity: val,
    });
  };

  // Set maximum returnable qty for a row
  const handleSetMaxQty = (row: PatientReturnDetailRow) => {
    const soldQty = Number(row.Quantity ?? row.SoldQuantity ?? 0);
    const returnedQty = Number(row.ReturnedQuantity ?? 0);
    const maxAvailable = Math.max(0, soldQty - returnedQty);
    handleQtyChange(row, String(maxAvailable));
  };

  // Quick Bill Search submit (on Enter or click)
  const handleQuickBillSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBillNo || !quickBillNo.trim()) return;
    dispatch('quickBillSearch', { billNumber: quickBillNo.trim() });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F7 - Clear / New
      if (e.key === 'F7') {
        e.preventDefault();
        dispatch('clear');
      }
      // F8 - Find Bill
      if (e.key === 'F8') {
        e.preventDefault();
        dispatch('findBill');
      }
      // F9 - Find Return Bills
      if (e.key === 'F9') {
        e.preventDefault();
        dispatch('findReturn');
      }
      // F4 / Alt+A - Save & Approve
      if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        dispatch('saveAndApprove');
      }
      // F2 / Alt+S - Save Draft
      if (e.key === 'F2' || (e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        dispatch('saveDraft');
      }
      // Alt+P - Print
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        dispatch('print');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate live return summary for the top badge
  const totalReturnItemsCount = useMemo(() => {
    return localReturnDetails.filter((r) => Number(r.ReturnQuantity) > 0).length;
  }, [localReturnDetails]);

  const activePaymentTypeId = currentcontext.PaymentTypeId || 1;

  return (
    <div className="pharmacy-return-wrapper">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BRANDING & TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div className="return-card return-header-bar">
        <div className="return-title-group">
          <div className="return-icon-badge" title="Pharmacy Return">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
          <div>
            <h1 className="return-title">Pharmacy Return & Refund POS</h1>
            <p className="return-subtitle">
              Return sold medicine batches, auto-reverse billing, and issue patient refund vouchers.
            </p>
          </div>
        </div>

        <div className="return-action-toolbar">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => dispatch('clear')}
            title="Refresh / New Return (F7)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>🔄 Refresh (F7)</span>
          </button>
          <button
            type="button"
            className="toolbar-btn primary"
            onClick={() => dispatch('findBill')}
            title="Search Sales Bill to Return (F8)"
          >
            🔍 Find Sales Bill (F8)
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => dispatch('findReturn')}
            title="Search Previous Returns (F9)"
          >
            📋 Return History (F9)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. RAPID BILL BARCODE SCANNER & QUICK SEARCH
      ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleQuickBillSearch} className="quick-bill-bar">
        <div className="quick-bill-input-wrapper">
          <span className="quick-bill-icon">⚡</span>
          <input
            type="text"
            className="quick-bill-input"
            placeholder="Scan Bill Barcode or Type Bill No (Press Enter to load)..."
            value={quickBillNo}
            onChange={(e) => setQuickBillNo(e.target.value)}
          />
        </div>
        <button type="submit" className="toolbar-btn primary" style={{ height: '40px' }}>
          Load Bill
        </button>
        {item.BillNumber && (
          <span className="badge-pill success" style={{ padding: '6px 12px', fontSize: '13px' }}>
            ✓ Active Bill: <strong>{item.BillNumber}</strong>
          </span>
        )}
      </form>

      {/* ─────────────────────────────────────────────────────────────
          3. RETURN STATUS RIBBON (WHEN RETURN NUMBER EXISTS)
      ───────────────────────────────────────────────────────────── */}
      {item.ReturnNumber && (
        <div className={`return-status-ribbon ${item.PatientReturnStatusId === 3 ? 'approved' : item.PatientReturnStatusId === 2 ? 'cancelled' : ''}`}>
          <div className="ribbon-meta">
            <span>
              Return #: <strong>{item.ReturnNumber}</strong>
            </span>
            <span>
              Date: <strong>{fmtDate(item.ReturnDateTime || item.BillDateTime)}</strong>
            </span>
            {item.EncounterId && (
              <span>
                Encounter: <strong>{item.EncounterId}</strong>
              </span>
            )}
          </div>
          <div>
            Status: <span className="badge-pill warning" style={{ fontWeight: 700 }}>{item.RefundStatus || 'In Progress'}</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PATIENT & BILL CONTEXT CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="return-info-grid">
        {/* Patient Details */}
        <div className="return-card">
          <div className="info-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Patient Demographic Context
          </div>
          <div className="info-card-body">
            <div className="info-field-group">
              <span className="info-label">Patient Name</span>
              <span className="info-value highlight">{patientName}</span>
            </div>
            <div className="info-field-group">
              <span className="info-label">UHID / MRN</span>
              <span className="info-value">{uhid}</span>
            </div>
            <div className="info-field-group">
              <span className="info-label">Age / Sex</span>
              <span className="info-value">{ageGender}</span>
            </div>
            <div className="info-field-group">
              <span className="info-label">Mobile Number</span>
              <span className="info-value">{mobile}</span>
            </div>
          </div>
        </div>

        {/* Bill & Doctor Details */}
        <div className="return-card">
          <div className="info-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h0M2 9.5h20" />
            </svg>
            Original Bill & Refund Session
          </div>
          <div className="info-card-body">
            <div className="info-field-group">
              <span className="info-label">Original Sales Bill #</span>
              <span className="info-value highlight">{item.BillNumber || 'None Loaded'}</span>
            </div>
            <div className="info-field-group">
              <span className="info-label">Original Bill Date</span>
              <span className="info-value">{fmtDate(item.BillDateTime)}</span>
            </div>
            <div className="info-field-group">
              <span className="info-label">Prescribing Doctor</span>
              <span className="info-value">{doctorName}</span>
            </div>
            <div className="info-field-group">
              <span className="info-label">Return Created By</span>
              <span className="info-value">{item.ReturnBy || 'Current Cashier'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. RETURN ITEMS TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="return-card table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                userSelect: 'none',
                color: '#3730a3',
                background: '#e0e7ff',
                padding: '6px 12px',
                borderRadius: '6px',
              }}
            >
              <input
                type="checkbox"
                checked={!!item.ReturnAll}
                onChange={(e) => dispatch('returnAllToggle', { value: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Select All / Return All Items</span>
            </label>

            {totalReturnItemsCount > 0 && (
              <span className="badge-pill success">
                {totalReturnItemsCount} Item(s) Selected for Return
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Filter items in table..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="settlement-input"
              style={{ height: '32px', width: '220px', fontSize: '12px' }}
            />
          </div>
        </div>

        {displayItems.length === 0 ? (
          <div className="empty-table-state">
            <div className="empty-icon">📦</div>
            <h3 className="empty-title">No Billed Medicines Loaded</h3>
            <p className="empty-desc">
              Please click "Find Sales Bill (F8)" to select a previous sale, or scan the bill barcode using the quick search bar above.
            </p>
            <button
              type="button"
              className="toolbar-btn primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => dispatch('findBill')}
            >
              🔍 Open Sales Bill Lookup (F8)
            </button>
          </div>
        ) : (
          <table className="return-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th>Medicine Name & Code</th>
                <th>Generic Name</th>
                <th>Rack/Location</th>
                <th>Batch #</th>
                <th>Expiry</th>
                <th style={{ textAlign: 'center' }}>Sold Qty</th>
                <th style={{ textAlign: 'center' }}>Prev Returned</th>
                <th style={{ textAlign: 'center' }}>Avail Qty</th>
                <th style={{ textAlign: 'center', minWidth: '130px' }}>Return Qty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>GST %</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Refund Net (₹)</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((row, idx) => {
                const soldQty = Number(row.Quantity ?? row.SoldQuantity ?? 0);
                const returnedQty = Number(row.ReturnedQuantity ?? 0);
                const availQty = Math.max(0, soldQty - returnedQty);
                const returnQty = Number(row.ReturnQuantity ?? 0);
                const hasReturn = returnQty > 0;

                return (
                  <tr key={`ret-row-${row.Id || idx}-${idx}`} className={hasReturn ? 'has-return' : ''}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                      {idx + 1}
                    </td>

                    {/* Name & Code */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {row.ServiceName || row.ItemName || 'Unnamed Medicine'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {row.ItemCode || ''}
                      </div>
                    </td>

                    {/* Generic */}
                    <td>
                      <span style={{ color: '#475569' }}>{row.GenericName || '-'}</span>
                    </td>

                    {/* Rack */}
                    <td>
                      <span className="badge-pill neutral">{row.RST || '-'}</span>
                    </td>

                    {/* Batch */}
                    <td>
                      <span className="badge-pill info" style={{ fontWeight: 700 }}>
                        {row.BatchId || 'Default'}
                      </span>
                    </td>

                    {/* Expiry */}
                    <td>
                      <span style={{ fontSize: '11px', color: '#475569' }}>
                        {fmtDate(row.ExpiryDate)}
                      </span>
                    </td>

                    {/* Sold Qty */}
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{soldQty}</td>

                    {/* Prev Returned */}
                    <td style={{ textAlign: 'center', color: '#dc2626' }}>
                      {returnedQty > 0 ? returnedQty : '-'}
                    </td>

                    {/* Available */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                      {availQty}
                    </td>

                    {/* Return Qty Input + Quick Max */}
                    <td>
                      <div className="qty-cell-wrapper">
                        <input
                          type="number"
                          min="0"
                          max={availQty}
                          disabled={availQty <= 0 || flags.isApproved}
                          className={`return-qty-input ${hasReturn ? 'active-return' : ''}`}
                          value={row.ReturnQuantity !== undefined && row.ReturnQuantity !== null ? row.ReturnQuantity : 0}
                          onChange={(e) => handleQtyChange(row, e.target.value)}
                          onFocus={(e) => e.target.select()}
                        />
                        {availQty > 0 && !flags.isApproved && (
                          <button
                            type="button"
                            className="max-qty-btn"
                            title="Return all available quantity"
                            onClick={() => handleSetMaxQty(row)}
                          >
                            Max
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Rate */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCur(row.Rate)}</td>

                    {/* GST % */}
                    <td style={{ textAlign: 'right' }}>
                      {row.GSTPercentage != null ? `${row.GSTPercentage}%` : '-'}
                    </td>

                    {/* Discount */}
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>
                      {fmtCur(row.DiscountAmount || 0)}
                    </td>

                    {/* Refund Net */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {fmtCur(row.NetAmount || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. SETTLEMENT & REFUND MODE PANEL
      ───────────────────────────────────────────────────────────── */}
      <div className="settlement-grid">
        {/* Left: Payment Method & Conditional Inputs */}
        <div className="return-card">
          <div className="info-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Refund Disbursement Mode & Details
          </div>

          <div className="settlement-fields">
            {/* Payment Type */}
            <div className="settlement-control-group">
              <label className="settlement-label">Refund Mode</label>
              <select
                className="settlement-select"
                value={activePaymentTypeId}
                onChange={(e) => dispatch('paymentTypeChange', { id: parseInt(e.target.value, 10) })}
              >
                {(lookup.PaymentType || [
                  { Id: 1, Text: 'Cash' },
                  { Id: 2, Text: 'Cheque' },
                  { Id: 3, Text: 'Demand Draft' },
                  { Id: 4, Text: 'Wire Transfer / NEFT' },
                  { Id: 5, Text: 'Credit Card' },
                  { Id: 6, Text: 'Debit Card' },
                  { Id: 7, Text: 'Credit / Due Refund' },
                  { Id: 8, Text: 'UPI / Wallet' },
                ]).map((pt) => (
                  <option key={`pt-${pt.Id}`} value={pt.Id}>
                    {pt.Text}
                  </option>
                ))}
              </select>
            </div>

            {/* Refund Receipt Amount */}
            <div className="settlement-control-group">
              <label className="settlement-label">Disbursement Amount</label>
              <input
                type="number"
                step="0.01"
                className="settlement-input"
                style={{ fontWeight: 700, fontSize: '15px', color: '#047857' }}
                value={currentcontext.ReceiptAmt !== undefined ? currentcontext.ReceiptAmt : currentcontext.TotNetAmount || 0}
                onChange={(e) => dispatch('receiptAmtChange', { amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Bank (if Card, Cheque, DD, Wire) */}
            {[2, 3, 4, 5, 6].includes(activePaymentTypeId) && (
              <div className="settlement-control-group">
                <label className="settlement-label">Bank Name</label>
                <select
                  className="settlement-select"
                  value={item.BankId || -1}
                  onChange={(e) => dispatch('bankChange', { id: parseInt(e.target.value, 10) })}
                >
                  <option value="-1">-- Select Bank --</option>
                  {(lookup.Bank || []).map((b) => (
                    <option key={`bank-${b.Id}`} value={b.Id}>
                      {b.Text}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cheque No & Cheque Date */}
            {activePaymentTypeId === 2 && (
              <>
                <div className="settlement-control-group">
                  <label className="settlement-label">Cheque Number</label>
                  <input
                    type="text"
                    className="settlement-input"
                    value={item.ChequeNo || ''}
                    placeholder="Enter Cheque #"
                    onChange={(e) => dispatch('chequeNoChange', { value: e.target.value })}
                  />
                </div>
                <div className="settlement-control-group">
                  <label className="settlement-label">Cheque Date</label>
                  <input
                    type="date"
                    className="settlement-input"
                    value={item.ChequeDate ? new Date(item.ChequeDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => dispatch('chequeDateChange', { value: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* DD Number & DD Date */}
            {activePaymentTypeId === 3 && (
              <>
                <div className="settlement-control-group">
                  <label className="settlement-label">DD Number</label>
                  <input
                    type="text"
                    className="settlement-input"
                    value={item.DDNumber || ''}
                    placeholder="Enter DD #"
                    onChange={(e) => dispatch('ddNumberChange', { value: e.target.value })}
                  />
                </div>
                <div className="settlement-control-group">
                  <label className="settlement-label">DD Date</label>
                  <input
                    type="date"
                    className="settlement-input"
                    value={item.DDDate ? new Date(item.DDDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => dispatch('ddDateChange', { value: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Card Authorize Number & Card Type */}
            {(activePaymentTypeId === 5 || activePaymentTypeId === 6) && (
              <>
                <div className="settlement-control-group">
                  <label className="settlement-label">Card Authorization #</label>
                  <input
                    type="text"
                    className="settlement-input"
                    maxLength={8}
                    value={item.AuthorizeNumber || ''}
                    placeholder="Auth Code"
                    onChange={(e) => dispatch('authCodeChange', { value: e.target.value })}
                  />
                </div>
                <div className="settlement-control-group">
                  <label className="settlement-label">Card Type</label>
                  <select
                    className="settlement-select"
                    value={item.CardTypeId || -1}
                    onChange={(e) => dispatch('cardTypeChange', { id: parseInt(e.target.value, 10) })}
                  >
                    <option value="-1">-- Select Card Type --</option>
                    {(lookup.CardType || []).map((ct) => (
                      <option key={`ct-${ct.Id}`} value={ct.Id}>
                        {ct.Text}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Wire Transfer ID & Date */}
            {activePaymentTypeId === 4 && (
              <>
                <div className="settlement-control-group">
                  <label className="settlement-label">Transfer Reference #</label>
                  <input
                    type="text"
                    className="settlement-input"
                    value={item.WireTransferId || ''}
                    placeholder="UTR / Ref Number"
                    onChange={(e) => dispatch('wireTransferIdChange', { value: e.target.value })}
                  />
                </div>
                <div className="settlement-control-group">
                  <label className="settlement-label">Transfer Date</label>
                  <input
                    type="date"
                    className="settlement-input"
                    value={item.WireTransferDate ? new Date(item.WireTransferDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => dispatch('wireTransferDateChange', { value: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Credit Approver (if balance/credit) */}
            {(currentcontext.TotBalanceAmt > 0 || activePaymentTypeId === 7) && (
              <div className="settlement-control-group">
                <label className="settlement-label">Credit Approver</label>
                <select
                  className="settlement-select"
                  value={item.PrivateDueId || -1}
                  onChange={(e) => dispatch('creditApproverChange', { id: parseInt(e.target.value, 10) })}
                >
                  <option value="-1">-- Select Approver --</option>
                  {(lookup.PrivateDueApprover || []).map((a) => (
                    <option key={`appr-${a.Id}`} value={a.Id}>
                      {a.Text}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right: Financial Summary Widget */}
        <div className="summary-widget">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Refund Calculation
            </span>
            <span className="badge-pill info" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
              {item.BillNumber ? `Bill: ${item.BillNumber}` : 'Draft'}
            </span>
          </div>

          <div className="summary-row">
            <span>Gross Return Value</span>
            <span style={{ fontWeight: 600 }}>{fmtCur(item.GrossAmount || 0)}</span>
          </div>

          <div className="summary-row">
            <span>Discount Reversal</span>
            <span style={{ color: '#fca5a5' }}>- {fmtCur(item.TotDiscAmount || 0)}</span>
          </div>

          <div className="summary-row divider" />

          <div className="summary-row total">
            <span>Net Refund Payable</span>
            <span className="total-amount">{fmtCur(currentcontext.TotNetAmount || 0)}</span>
          </div>

          <div className="summary-row">
            <span>Already Refunded on Bill</span>
            <span>{fmtCur(currentcontext.RefundedAmount || 0)}</span>
          </div>

          <div className="summary-row">
            <span>Remaining to be Refunded</span>
            <span>{fmtCur(currentcontext.ToBeRefundAmount || 0)}</span>
          </div>

          {currentcontext.TotBalanceAmt > 0 && (
            <div className="summary-row" style={{ color: '#fbbf24', fontWeight: 700 }}>
              <span>Outstanding Due Balance</span>
              <span>{fmtCur(currentcontext.TotBalanceAmt || 0)}</span>
            </div>
          )}

          {/* Direct Action Buttons inside Refund Calculation Widget */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {flags.canShowSaveapproveBtn !== false && (
              <button
                type="button"
                className="footer-btn approve"
                style={{ width: '100%', justifyContent: 'center', height: '42px', fontSize: '13.5px' }}
                onClick={() => dispatch('saveAndApprove')}
              >
                ✓ Save & Approve Return (F4)
              </button>
            )}
            {flags.canShowSaveBtn !== false && (
              <button
                type="button"
                className="footer-btn draft"
                style={{ width: '100%', justifyContent: 'center', height: '36px', fontSize: '12.5px' }}
                onClick={() => dispatch('saveDraft')}
              >
                💾 Save Draft (F2)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. SCREEN BOTTOM ACTION BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="return-card return-screen-bottom-bar">
        <div className="footer-left">
          <button
            type="button"
            className="footer-btn draft"
            onClick={() => dispatch('backtoList')}
            title="Back to Dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>← Back</span>
          </button>

          {item.ReturnNumber && (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Return No: <strong>{item.ReturnNumber}</strong>
            </span>
          )}
        </div>

        <div className="footer-right">
          {/* DM Print / Print buttons when bill approved */}
          {!flags.hidePrintBtn && (
            <>
              <button
                type="button"
                className="footer-btn print"
                onClick={() => dispatch('printRefund')}
              >
                🖨️ Refund Print
              </button>
              <button
                type="button"
                className="footer-btn print"
                onClick={() => dispatch('saleAndReturnPrint')}
              >
                🖨️ Sales & Return Print
              </button>
              <button
                type="button"
                className="footer-btn print"
                onClick={() => dispatch('dmPrint')}
              >
                🖨️ DM Print
              </button>
            </>
          )}

          {/* Save Draft */}
          {flags.canShowSaveBtn !== false && (
            <button
              type="button"
              className="footer-btn draft"
              onClick={() => dispatch('saveDraft')}
            >
              💾 Save Draft (F2)
            </button>
          )}

          {/* Save & Approve */}
          {flags.canShowSaveapproveBtn !== false && (
            <button
              type="button"
              className="footer-btn approve"
              onClick={() => dispatch('saveAndApprove')}
            >
              ✓ Save & Approve Return (F4)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default PharmacyReturnScreen;
