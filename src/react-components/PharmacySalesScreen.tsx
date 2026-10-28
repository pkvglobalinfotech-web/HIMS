import React, { useState, useEffect, useMemo, useRef } from 'react';
import { colors, spacing, typography, radii, shadows, transitions } from '../components/ui/tokens';
import { Button } from './Button';

import { apiFetch } from './utils/api';
import './PharmacySalesScreen.css';

// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────
export interface LookupItem {
  Id: number;
  Text: string;
  Code?: string;
  [key: string]: any;
}

export interface PatientBillDetailRow {
  Id?: number;
  SNo?: number;
  ItemStoreMapId?: number;
  ItemMasterId?: number;
  ItemCode?: string;
  ItemName?: string;
  GenericName?: string;
  IsPrescribed?: boolean;
  IsNarcotic?: boolean;
  RST?: string;
  TotalQuantity?: number;
  IsFallUnderMinQty?: boolean;
  BatchQuantity?: number;
  Quantity?: number | string;
  BatchId?: string;
  Batch?: boolean;
  ExpiryDate?: string;
  ExpiryStop?: boolean;
  ExpiryAlert?: boolean;
  ExpiryProceed?: boolean;
  MrPrice?: number;
  Rate?: number;
  GSTPercentage?: number;
  Amount?: number;
  DiscountAmount?: number;
  DiscountModeId?: number;
  NetAmount?: number;
  Status?: number;
  SelectedItem?: any;
  [key: string]: any;
}

export interface SelectedPatientShape {
  Id?: number;
  FirstName?: string;
  LastName?: string;
  MRN?: string;
  PatientMrn?: string;
  PatientName?: string;
  Age?: number | string;
  Gender?: { Description?: string } | string;
  GenderId?: number;
  Title?: { Description?: string } | string;
  Mobile?: string;
  OutStandingAmount?: number;
  AmountPaid?: number;
  AmountAdjusted?: number;
  [key: string]: any;
}

export interface PaymentInfoRow {
  ReceiptNumber?: string;
  ReceiptDateTime?: string;
  AmountPaid?: number;
  PaymentType?: string;
  ReceiptType?: string;
  [key: string]: any;
}

export interface PharmacySalesScreenProps {
  reactProps?: {
    item?: any;
    currentfilter?: any;
    currentcontext?: any;
    selectedPatient?: SelectedPatientShape;
    encounter?: any;
    patientBillDetails?: PatientBillDetailRow[];
    paymentInfoDetails?: PaymentInfoRow[];
    patientPaymentDetails?: any[];
    lookup?: {
      EncounterType?: LookupItem[];
      Doctor?: LookupItem[];
      UserStores?: LookupItem[];
      Guarantor?: LookupItem[];
      DiscountMode?: LookupItem[];
      PatientType?: LookupItem[];
      GuarantorType?: LookupItem[];
      PaymentType?: LookupItem[];
      Bank?: LookupItem[];
      DiscountApprover?: LookupItem[];
      PrivateDueApprover?: LookupItem[];
      [key: string]: any;
    };
    privileges?: {
      canSave?: boolean;
      canSaveApprove?: boolean;
      canDelete?: boolean;
      canDiscount?: boolean;
      canAddnewbutton?: boolean;
      canAddToCredit_Button?: boolean;
      [key: string]: boolean | undefined;
    };
    flags?: {
      isSaving?: boolean;
      isApproved?: boolean;
      canShowSaveBtn?: boolean;
      canShowSaveapproveBtn?: boolean;
      canShowClearBtn?: boolean;
      canShowCancelBtn?: boolean;
      canShowAddCredit?: boolean;
      hidePrintBtn?: boolean;
      isMomentPay?: boolean;
      isUPIPay?: boolean;
      context?: string;
      enableRoundOff?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
  onAction?: (actionName: string, payload?: any) => void;
  [key: string]: any;
}

// Currency Formatter
const fmtCur = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '₹0.00';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Date Display Formatter
const fmtDate = (d?: string | Date | null): string => {
  if (!d) return '-';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

// Payment Split Line (OP Billing Style Multiple Payment Support)
export interface PaymentSplitLine {
  id: number;
  receiptId?: number;
  paymentTypeId: number;
  amount: number;
  bankId?: number;
  cardTypeId?: number;
  terminalNoId?: number;
  chequeNo?: string;
  chequeDate?: string;
  upiRefNumber?: string;
  cardNumber?: string;
  authorizeNumber?: string;
}

// Reusable two-position discount toggle: % (Percentage) on the left, ₹ (Rupees) on the right (OP Billing Style)
export const DiscountToggle: React.FC<{
  mode: number; // 2 = %, 1 = ₹
  onChange: (mode: number) => void;
  disabled?: boolean;
}> = ({ mode, onChange, disabled }) => {
  const isPercent = mode === 2 || mode === undefined || mode === null;
  const isRupees = mode === 1;

  return (
    <div
      className="discount-toggle-container"
      style={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <button
        type="button"
        title="Percentage (%)"
        onClick={(e) => {
          e.stopPropagation();
          onChange(2);
        }}
        className={`discount-toggle-btn ${isPercent ? 'active' : ''}`}
      >
        %
      </button>
      <button
        type="button"
        title="Rupees (₹)"
        onClick={(e) => {
          e.stopPropagation();
          onChange(1);
        }}
        className={`discount-toggle-btn ${isRupees ? 'active' : ''}`}
      >
        ₹
      </button>
    </div>
  );
};

export const PharmacySalesScreen: React.FC<PharmacySalesScreenProps> = ({ reactProps, onAction }) => {
  // ─────────────────────────────────────────────────────────────
  // LOCAL OR PROXIED STATE
  // ─────────────────────────────────────────────────────────────
  const item = reactProps?.item || {};
  const currentfilter = reactProps?.currentfilter || {};
  const currentcontext = reactProps?.currentcontext || {};
  const selectedPatient = reactProps?.selectedPatient || {};
  const encounter = reactProps?.encounter || {};
  const rawDetails = reactProps?.patientBillDetails || [];
  const patientBillDetails = useMemo(() => {
    return rawDetails.filter((r) => r.Status !== 2);
  }, [rawDetails]);
  const paymentInfoDetails = reactProps?.paymentInfoDetails || [];
  const lookup = reactProps?.lookup || {};
  const privileges = reactProps?.privileges || {};

  const isExistingBill = Boolean((currentcontext.id && Number(currentcontext.id) > 0) || (item.Id && Number(item.Id) > 0));
  const isExistingDueBill = isExistingBill && (
    Number(currentcontext.TotDueAmt || 0) > 0 ||
    Number(currentcontext.TotBalanceAmt || 0) > 0 ||
    Number(item.TotalDueAmount || 0) > 0
  );
  const isBillCancelled = Boolean(
    isExistingBill && (item.PatientBillStatusId === 2 || currentcontext.PharmacyBillStatusId === 2)
  );
  const rawFlags = reactProps?.flags || {};
  const isBillApproved = Boolean(
    isExistingBill &&
    !isExistingDueBill &&
    (item.PatientBillStatusId === 3 || currentcontext.PharmacyBillStatusId === 3 || rawFlags.isApproved)
  );
  const isBillLocked = isBillApproved || isBillCancelled;

  const flags = {
    ...rawFlags,
    isApproved: isBillLocked,
    canShowSaveBtn: (!isExistingBill || item.PatientBillStatusId <= 1) && !isBillLocked && rawFlags.canShowSaveBtn !== false,
    canShowSaveapproveBtn: !isBillLocked && (rawFlags.canShowSaveapproveBtn !== false || !isExistingBill || isExistingDueBill),
    canDelete: rawFlags.canDelete !== false,
    canShowAddCredit: rawFlags.canShowAddCredit !== false,
    isUPIPay: Boolean(rawFlags.isUPIPay),
  };


  // Patient Quick Search state
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [highlightedPatientIdx, setHighlightedPatientIdx] = useState<number>(0);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const patientInputRef = useRef<HTMLInputElement>(null);
  const [optimisticPatient, setOptimisticPatient] = useState<any>(null);

  // Medicine / Barcode Quick Search state
  const [medQuery, setMedQuery] = useState('');
  const [medSuggestions, setMedSuggestions] = useState<any[]>([]);
  const [isSearchingMed, setIsSearchingMed] = useState(false);
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [highlightedMedIdx, setHighlightedMedIdx] = useState<number>(0);
  const medSearchRef = useRef<HTMLDivElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);
  const pendingQtyFocusIndexRef = useRef<number | null>(null);
  const shouldFocusQtyRef = useRef<boolean>(false);

  // Focus Helpers for rapid POS billing workflow
  const focusMedSearch = () => {
    setTimeout(() => {
      if (medInputRef.current) {
        medInputRef.current.focus();
        medInputRef.current.select();
      } else {
        const el = document.getElementById('rapidMedSearchInput') as HTMLInputElement;
        el?.focus();
        el?.select();
      }
      setMedQuery('');
      setShowMedDropdown(false);
    }, 60);
  };

  const focusQtyInput = (idx: number) => {
    setTimeout(() => {
      const el = document.getElementById(`table-qty-input-${idx}`) as HTMLInputElement;
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  };

  // Local fallback lookup if operating standalone
  const [localLookup, setLocalLookup] = useState<any>({});

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MULTIPLE PAYMENT SPLITS STATE & SYNCHRONIZATION (OP BILLING)
  // ─────────────────────────────────────────────────────────────
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitLine[]>([
    {
      id: 1,
      receiptId: 0,
      paymentTypeId: currentcontext.PaymentTypeId || item.PaymentTypeId || 1,
      amount: parseFloat(currentcontext.ReceiptAmt) || 0,
      bankId: item.BankId,
      chequeNo: item.ChequeNo || '',
      upiRefNumber: item.UPIRefNumber || '',
      authorizeNumber: item.AuthorizeNumber || '',
    }
  ]);
  const userEditedSplitRef = useRef<boolean>(false);

  // Synchronize paymentSplits when reactProps.patientPaymentDetails arrives
  useEffect(() => {
    if (Array.isArray(reactProps?.patientPaymentDetails) && reactProps.patientPaymentDetails.length > 0) {
      setPaymentSplits(reactProps.patientPaymentDetails.map((p: any, idx: number) => ({
        id: idx + 1,
        receiptId: (p.Id && p.ReceiptNumber) ? p.Id : 0,
        paymentTypeId: p.PaymentTypeId || 1,
        amount: parseFloat(p.AmountPaid) || 0,
        bankId: p.BankId,
        cardTypeId: p.CardTypeId,
        terminalNoId: p.TerminalNoId,
        chequeNo: p.ChequeNo || '',
        chequeDate: p.ChequeDate,
        upiRefNumber: p.UPIRefNumber || '',
        cardNumber: p.CardNumber || '',
        authorizeNumber: p.AuthorizedCode || p.AuthorizeNumber || '',
      })));
    }
  }, [reactProps?.patientPaymentDetails]);

  // Keep single payment split amount aligned with bill net amount if not manually customized
  const totalBillNetAmount = parseFloat(currentcontext.TotNetAmount) || 0;

  // Total previously collected/paid through existing receipts
  const previouslyPaidAmount = useMemo(() => {
    // Only existing bills have previous payments
    if (!isExistingBill || (currentcontext.id === 0 || !currentcontext.id) || (item.PatientBillStatusId && item.PatientBillStatusId <= 1)) {
      return 0;
    }

    if (Array.isArray(paymentInfoDetails) && paymentInfoDetails.length > 0) {
      const sum = paymentInfoDetails.reduce((acc, pay) => acc + (parseFloat(String(pay.AmountPaid)) || 0), 0);
      if (sum > 0) return parseFloat(sum.toFixed(2));
    }
    const ctxPaid = parseFloat(String(currentcontext.PaidAmt)) || 0;
    if (ctxPaid > 0) return ctxPaid;

    const itemPaid = parseFloat(String(item.PaidAmount)) || 0;
    if (itemPaid > 0) return itemPaid;

    if (item.PatientBillStatusId === 3 && (item.OutStandingAmount === 0 || currentcontext.TotDueAmt === 0 || currentcontext.TotBalanceAmt === 0)) {
      return totalBillNetAmount;
    }

    return 0;
  }, [isExistingBill, currentcontext.id, item.PatientBillStatusId, paymentInfoDetails, currentcontext.PaidAmt, currentcontext.TotDueAmt, currentcontext.TotBalanceAmt, item.PaidAmount, totalBillNetAmount]);

  const previousNetRef = useRef<number>(totalBillNetAmount);

  useEffect(() => {
    if (!flags.isApproved && !isExistingBill && previouslyPaidAmount === 0 && paymentSplits.length === 1 && !item.IsMultiplePayment) {
      const currentSplitAmt = paymentSplits[0]?.amount || 0;
      // Auto-update if split amount matched the previous bill net (or is 0) so changes to medicines/discounts update the receipt amount automatically
      if (!userEditedSplitRef.current || currentSplitAmt === 0 || currentSplitAmt === previousNetRef.current) {
        if (totalBillNetAmount >= 0 && currentSplitAmt !== totalBillNetAmount) {
          const updatedSplits: PaymentSplitLine[] = [
            {
              ...paymentSplits[0],
              amount: totalBillNetAmount,
            },
          ];
          setPaymentSplits(updatedSplits);
          syncSplitsToBridge(updatedSplits, false);
        }
      }
      previousNetRef.current = totalBillNetAmount;
    }
  }, [totalBillNetAmount, flags.isApproved, isExistingBill, previouslyPaidAmount, item.IsMultiplePayment]);

  const totalCollectedFromSplits = useMemo(() => {
    return parseFloat(paymentSplits.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0).toFixed(2));
  }, [paymentSplits]);

  const remainingBillBalance = Math.max(0, parseFloat((totalBillNetAmount - previouslyPaidAmount).toFixed(2)));
  const maxAllowedReceiptAmount = useMemo(() => {
    if (isExistingBill && previouslyPaidAmount > 0) {
      return remainingBillBalance;
    }
    return Math.max(0, totalBillNetAmount);
  }, [isExistingBill, previouslyPaidAmount, remainingBillBalance, totalBillNetAmount]);

  const totalPaidAcrossAll = parseFloat((previouslyPaidAmount + totalCollectedFromSplits).toFixed(2));
  const outstandingDueAmount = Math.max(0, parseFloat((totalBillNetAmount - totalPaidAcrossAll).toFixed(2)));
  const isPaymentSplitExceeded = maxAllowedReceiptAmount > 0 && totalCollectedFromSplits > (maxAllowedReceiptAmount + 0.05);

  // Clamp receipt amount so it never exceeds net amount when net amount changes (e.g. discount added)
  useEffect(() => {
    if (maxAllowedReceiptAmount >= 0 && totalCollectedFromSplits > (maxAllowedReceiptAmount + 0.05)) {
      if (paymentSplits.length === 1) {
        const nextSplits: PaymentSplitLine[] = [
          {
            ...paymentSplits[0],
            amount: maxAllowedReceiptAmount,
          },
        ];
        setPaymentSplits(nextSplits);
        syncSplitsToBridge(nextSplits, false);
      }
    }
  }, [maxAllowedReceiptAmount, totalCollectedFromSplits]);

  // Reactive listener: when new medicine is added to patientBillDetails, jump directly to its Quantity input!
  useEffect(() => {
    if (shouldFocusQtyRef.current) {
      let idxToFocus = pendingQtyFocusIndexRef.current;
      if (idxToFocus === null || idxToFocus < 0 || idxToFocus >= patientBillDetails.length) {
        idxToFocus = Math.max(0, patientBillDetails.length - 1);
      }
      const targetRow = patientBillDetails[idxToFocus];
      if (targetRow && (targetRow.ItemName || (targetRow.ItemMasterId && targetRow.ItemMasterId > 0))) {
        shouldFocusQtyRef.current = false;
        pendingQtyFocusIndexRef.current = null;
        focusQtyInput(idxToFocus);
      }
    }
  }, [patientBillDetails]);

  // Initial load autofocus: focus Patient Search if new bill and no patient selected
  useEffect(() => {
    if (!flags.isApproved && !isBillLocked && !item.PatientId && !optimisticPatient) {
      setTimeout(() => {
        patientInputRef.current?.focus();
      }, 150);
    }
  }, []);

  // Bill is fully settled/collected (all net payable has been paid via receipts)
  const isFullyCollected = useMemo(() => {
    if (totalBillNetAmount <= 0) return false;

    // A brand new bill being created is NEVER "already fully collected" - the user is here to create and collect it!
    if (!isExistingBill || (currentcontext.id === 0 || !currentcontext.id) || (item.PatientBillStatusId && item.PatientBillStatusId <= 1)) {
      return false;
    }

    // 1. Historical or prior receipts cover the total net amount
    if (previouslyPaidAmount > 0 && previouslyPaidAmount >= (totalBillNetAmount - 0.05)) {
      return true;
    }

    // 2. Bill is locked or approved and outstanding balance due is zero
    if ((flags.isApproved || isBillLocked || item.PatientBillStatusId === 3 || item.IsPaidFully === 1) && outstandingDueAmount <= 0) {
      return true;
    }

    // 3. Bill had historical receipts and remaining balance before current edit is zero
    if (previouslyPaidAmount > 0 && remainingBillBalance <= 0) {
      return true;
    }

    return false;
  }, [isExistingBill, currentcontext.id, item.PatientBillStatusId, totalBillNetAmount, previouslyPaidAmount, flags.isApproved, isBillLocked, item.IsPaidFully, outstandingDueAmount, remainingBillBalance]);

  // Computed Change to Return (OP Billing Tender Cash Return Calculation)
  const computedReturnAmount = useMemo(() => {
    const tender = Number(currentcontext.TenderAmount) || 0;
    const net = Number(currentcontext.TotNetAmount) || 0;
    const collected = totalCollectedFromSplits > 0 ? totalCollectedFromSplits : (Number(currentcontext.ReceiptAmt) || 0);
    const target = net > 0 ? net : collected;
    if (tender > 0 && tender > target) {
      return tender - target;
    }
    return Number(currentcontext.ReturnAmount) || 0;
  }, [currentcontext.TenderAmount, currentcontext.TotNetAmount, totalCollectedFromSplits, currentcontext.ReceiptAmt, currentcontext.ReturnAmount]);

  const syncSplitsToBridge = (splits: PaymentSplitLine[], isMulti: boolean) => {
    const newTotal = parseFloat(splits.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0).toFixed(2));

    dispatch('syncPaymentLines', {
      isMultiplePayment: isMulti,
      payments: splits.map((s) => ({
        Id: s.receiptId || 0,
        PaymentTypeId: s.paymentTypeId,
        AmountPaid: s.amount,
        BankId: s.bankId,
        CardTypeId: s.cardTypeId,
        TerminalNoId: s.terminalNoId,
        ChequeNo: s.chequeNo,
        ChequeDate: s.chequeDate,
        UPIRefNumber: s.upiRefNumber,
        AuthorizedCode: s.authorizeNumber,
        CardNumber: s.cardNumber,
      })),
    });
    dispatch('receiptAmtChange', { value: newTotal });
  };

  const handleSplitAmountChange = (splitIdx: number, val: number | string) => {
    userEditedSplitRef.current = true;
    if (val === '') {
      const nextSplits = paymentSplits.map((p, i) => (i === splitIdx ? { ...p, amount: '' as any } : p));
      setPaymentSplits(nextSplits);
      syncSplitsToBridge(nextSplits, nextSplits.length > 1 || Boolean(item.IsMultiplePayment));
      return;
    }

    const rawNum = typeof val === 'number' ? val : (parseFloat(val) || 0);
    let numVal = Math.max(0, rawNum);

    // Enforce that receipt amount cannot exceed net payable amount
    if (maxAllowedReceiptAmount > 0) {
      if (paymentSplits.length <= 1) {
        if (numVal > maxAllowedReceiptAmount) {
          numVal = maxAllowedReceiptAmount;
        }
      } else {
        const otherSplitsSum = paymentSplits.reduce(
          (acc, p, i) => (i !== splitIdx ? acc + (parseFloat(String(p.amount)) || 0) : acc),
          0
        );
        const maxForThis = Math.max(0, parseFloat((maxAllowedReceiptAmount - otherSplitsSum).toFixed(2)));
        if (numVal > maxForThis) {
          numVal = maxForThis;
        }
      }
    }

    const nextSplits = paymentSplits.map((p, i) => (i === splitIdx ? { ...p, amount: numVal } : p));
    setPaymentSplits(nextSplits);

    const isMulti = nextSplits.length > 1 || Boolean(item.IsMultiplePayment);
    syncSplitsToBridge(nextSplits, isMulti);
  };

  const validateReceiptAmount = (): boolean => {
    const totalCollected = parseFloat(
      paymentSplits.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0).toFixed(2)
    );
    if (maxAllowedReceiptAmount > 0 && totalCollected > (maxAllowedReceiptAmount + 0.05)) {
      alert(`Receipt amount (${fmtCur(totalCollected)}) cannot exceed Net Payable Amount (${fmtCur(maxAllowedReceiptAmount)}).`);
      return false;
    }
    return true;
  };

  const handleTriggerSaveDraft = () => {
    if (!validateReceiptAmount()) return;
    dispatch('saveDraft');
  };

  const handleTriggerSaveAndApprove = () => {
    if (!validateReceiptAmount()) return;
    if (outstandingDueAmount > 0 && (!item.PrivateDueId || item.PrivateDueId <= 0)) {
      const el = document.getElementById('creditapprover');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    dispatch('saveAndApprove');
  };

  const handleSplitTypeChange = (splitIdx: number, typeId: number) => {
    const nextSplits = paymentSplits.map((p, i) => (i === splitIdx ? { ...p, paymentTypeId: typeId } : p));
    setPaymentSplits(nextSplits);
    if (splitIdx === 0) {
      dispatch('paymentTypeChange', { id: typeId });
    }
    const isMulti = nextSplits.length > 1 || Boolean(item.IsMultiplePayment);
    syncSplitsToBridge(nextSplits, isMulti);
  };

  const handleSplitFieldChange = (splitIdx: number, field: string, val: any) => {
    const nextSplits = paymentSplits.map((p, i) => (i === splitIdx ? { ...p, [field]: val } : p));
    setPaymentSplits(nextSplits);
    if (splitIdx === 0) {
      if (field === 'upiRefNumber') dispatch('fieldChange', { UPIRefNumber: val });
      if (field === 'bankId') dispatch('fieldChange', { BankId: val });
      if (field === 'chequeNo') dispatch('fieldChange', { ChequeNo: val });
      if (field === 'authorizeNumber') dispatch('fieldChange', { AuthorizeNumber: val });
    }
    const isMulti = nextSplits.length > 1 || Boolean(item.IsMultiplePayment);
    syncSplitsToBridge(nextSplits, isMulti);
  };

  const handleAddPaymentSplit = () => {
    userEditedSplitRef.current = true;
    if (paymentSplits.length >= 6) return;

    const usedTypes = new Set(paymentSplits.map((p) => p.paymentTypeId));
    let defaultType = 11; // UPI / QR Code
    if (usedTypes.has(11)) defaultType = 1; // Cash
    if (usedTypes.has(1) && usedTypes.has(11)) defaultType = 5; // Credit Card

    // New split defaults to 0 amount so unpaid balance stays as Outstanding Due unless explicitly allocated
    const newSplit: PaymentSplitLine = {
      id: Date.now(),
      receiptId: 0,
      paymentTypeId: defaultType,
      amount: 0,
    };
    const nextSplits = [...paymentSplits, newSplit];
    setPaymentSplits(nextSplits);
    dispatch('fieldChange', { IsMultiplePayment: true });
    syncSplitsToBridge(nextSplits, true);
  };

  const handleRemovePaymentSplit = (splitIdx: number) => {
    userEditedSplitRef.current = true;
    if (paymentSplits.length <= 1) return;
    const nextSplits = paymentSplits.filter((_, i) => i !== splitIdx);
    const isMulti = nextSplits.length > 1;
    setPaymentSplits(nextSplits);
    dispatch('fieldChange', { IsMultiplePayment: isMulti });
    syncSplitsToBridge(nextSplits, isMulti);
  };

  const handleToggleMultiplePayment = (enabled: boolean) => {
    userEditedSplitRef.current = true;
    dispatch('fieldChange', { IsMultiplePayment: enabled });

    if (enabled && paymentSplits.length === 1) {
      // Do NOT auto-absorb the entire unpaid balance into UPI!
      // If user paid partial cash (e.g., 50 or 100), the remainder is DUE unless user explicitly pays it.
      const newSplit: PaymentSplitLine = {
        id: Date.now(),
        receiptId: 0,
        paymentTypeId: paymentSplits[0].paymentTypeId === 1 ? 11 : 1, // alternate mode
        amount: 0,
      };
      const nextSplits = [...paymentSplits, newSplit];
      setPaymentSplits(nextSplits);
      syncSplitsToBridge(nextSplits, true);
    } else if (!enabled && paymentSplits.length > 1) {
      // Retain the actual user-entered payment of the primary split
      const firstSplit: PaymentSplitLine = {
        ...paymentSplits[0],
        amount: paymentSplits[0].amount || 0,
      };
      const nextSplits = [firstSplit];
      setPaymentSplits(nextSplits);
      syncSplitsToBridge(nextSplits, false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
      if (medSearchRef.current && !medSearchRef.current.contains(e.target as Node)) {
        setShowMedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts (F2, F4, F7, F8, Alt+S, Alt+A, Alt+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleTriggerSaveDraft();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleTriggerSaveAndApprove();
      } else if (e.key === 'F7') {
        e.preventDefault();
        dispatch('clear');
      } else if (e.key === 'F8') {
        e.preventDefault();
        dispatch('findBill');
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleTriggerSaveDraft();
      } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleTriggerSaveAndApprove();
      } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        dispatch('print');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, maxAllowedReceiptAmount, paymentSplits, outstandingDueAmount, item.PrivateDueId]);

  // Load fallback lookup only if running standalone without parent AngularJS controller
  useEffect(() => {
    // If running inside AngularJS controller or lookups already provided, skip
    if (onAction || (lookup && Object.keys(lookup).length > 0)) {
      return;
    }

    if (!lookup.EncounterType || lookup.EncounterType.length === 0) {
      apiFetch('General/Options/getoptions', [
        { Key: 'EncounterType' },
        { Key: 'PaymentType' },
        { Key: 'Bank' },
        { Key: 'DiscountMode' },
        { Key: 'PatientType' },
        { Key: 'GuarantorType' }
      ])
        .then((res: any) => {
          if (res) setLocalLookup(res.Data || res);
        })
        .catch(() => {});
    }
  }, [lookup, onAction]);

  const activeLookup = { ...localLookup, ...lookup };

  // Auto-sync persistent dispensing store if newly loaded for new sales
  useEffect(() => {
    try {
      const savedStoreId = Number(localStorage.getItem('SELECTED_PHARMACY_STORE_ID'));
      if (savedStoreId > 0 && activeLookup.UserStores && activeLookup.UserStores.length > 0) {
        if ((!currentcontext.id || currentcontext.id === 0) && currentfilter.StoreMasterId !== savedStoreId) {
          const storeObj = activeLookup.UserStores.find((s: LookupItem) => s.Id === savedStoreId);
          if (storeObj) {
            dispatch('storeChange', { id: savedStoreId, store: storeObj });
          }
        }
      }
    } catch (_) {}
  }, [activeLookup.UserStores, currentcontext.id, currentfilter.StoreMasterId, dispatch]);

  // Patient live search
  const handlePatientSearchChange = (val: string) => {
    setPatientQuery(val);
    const trimmed = val ? val.trim() : '';
    if (!trimmed || trimmed.length < 2) {
      setPatientSuggestions([]);
      setShowPatientDropdown(false);
      return;
    }
    setIsSearchingPatient(true);

    // Call GetMinPatientSearch with Key: 1 (searches Name, Mobile, MRN, UHID)
    apiFetch('registration/Patient/GetMinPatientSearch', {
      Params: [
        { Key: 1, Value: trimmed },
        { Key: 7, Value: 2 },
        { Key: 37, Value: 2 }
      ],
      PageContext: { PageSize: 15, PageNumber: 1 }
    })
      .then((res: any) => {
        const list = res?.Data || res?.data || (Array.isArray(res) ? res : []);
        setPatientSuggestions(list);
        setHighlightedPatientIdx(0);
        setShowPatientDropdown(true);
      })
      .catch(() => {
        // Resilient fallback to GetPatients
        apiFetch('registration/patient/GetPatients', {
          Params: [{ Key: 1, Value: trimmed }],
          PageContext: { PageSize: 15, PageNumber: 1 }
        })
          .then((res2: any) => {
            const list2 = res2?.Data || res2?.data || (Array.isArray(res2) ? res2 : []);
            setPatientSuggestions(list2);
            setHighlightedPatientIdx(0);
            setShowPatientDropdown(true);
          })
          .catch((err) => {
            console.error('Failed to search patients', err);
            setPatientSuggestions([]);
            setHighlightedPatientIdx(0);
          });
      })
      .finally(() => setIsSearchingPatient(false));
  };

  const handleSelectPatient = (pat: any) => {
    setShowPatientDropdown(false);
    setPatientQuery('');
    setOptimisticPatient(pat);
    dispatch('patientSelect', pat);

    // Flow Step 1: Once patient name is selected, focus moves directly to drug search option!
    focusMedSearch();
  };

  const handleClearPatient = () => {
    setOptimisticPatient(null);
    setPatientQuery('');
    setPatientSuggestions([]);
    setShowPatientDropdown(false);
    dispatch('clear');
    setTimeout(() => {
      patientInputRef.current?.focus();
    }, 60);
  };

  const handlePatientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedPatientIdx((prev) => (patientSuggestions.length > 0 ? (prev < patientSuggestions.length - 1 ? prev + 1 : 0) : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedPatientIdx((prev) => (patientSuggestions.length > 0 ? (prev > 0 ? prev - 1 : patientSuggestions.length - 1) : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (patientSuggestions.length > 0) {
        const selIdx = highlightedPatientIdx >= 0 && highlightedPatientIdx < patientSuggestions.length ? highlightedPatientIdx : 0;
        handleSelectPatient(patientSuggestions[selIdx]);
      }
    } else if (e.key === 'Escape') {
      setShowPatientDropdown(false);
    }
  };

  // Get store configuration for expiry stop days (based on active store)
  const getStoreExpiryPriorStopDays = (): number => {
    if (currentfilter && typeof currentfilter.ExpiryPriorStopDays === 'number' && currentfilter.ExpiryPriorStopDays > 0) {
      return currentfilter.ExpiryPriorStopDays;
    }
    const storeId = currentfilter.StoreMasterId || activeLookup.UserStores?.[0]?.Id;
    const store = activeLookup.UserStores?.find((s: any) => s.Id == storeId);
    return store?.StoreMaster?.ExpiryPriorStopDays || 0;
  };

  // Calculate days remaining until expiry date
  const getExpiryDays = (expiryDateStr: string | null | undefined): number => {
    if (!expiryDateStr) return 0;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const curDate = new Date(todayStr);
      const futureStr = typeof expiryDateStr === 'string' ? expiryDateStr.slice(0, 10) : new Date(expiryDateStr).toISOString().slice(0, 10);
      const expDate = new Date(futureStr);
      return Math.round((expDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Check if a batch item is sellable (Quantity > 0 and not expired based on storemaster configuration)
  const isBatchSellable = (batch: any, stopDays: number): boolean => {
    const qty = Number(batch.Quantity);
    if (isNaN(qty) || qty <= 0) return false;
    if (batch.ExpiryDate) {
      const expDays = getExpiryDays(batch.ExpiryDate);
      if (expDays <= stopDays) return false;
    }
    return true;
  };

  // Helper to accurately calculate total available stock for an item based on storemaster configuration
  const calculateItemStock = (itemObj: any): number => {
    const stopDays = getStoreExpiryPriorStopDays();
    const stockItem = itemObj.StockItem || itemObj.ItemMaster?.StockItem;
    const serials = stockItem?.StockSerialItems || itemObj.StockSerialItems || itemObj.BatchDetails;

    if (Array.isArray(serials) && serials.length > 0) {
      let sum = 0;
      for (const s of serials) {
        if (isBatchSellable(s, stopDays)) {
          sum += (Number(s.Quantity) || 0);
        }
      }
      return sum;
    }

    // Direct StockSerialItem
    if (itemObj.BatchId || itemObj.StockItemId) {
      if (isBatchSellable(itemObj, stopDays)) {
        return Number(itemObj.Quantity) || 0;
      }
      return 0;
    }

    return Number(itemObj.StockInHand || 0);
  };

  // Medicine / Barcode live search
  const handleMedSearchChange = (val: string) => {
    setMedQuery(val);
    const trimmed = val ? val.trim() : '';
    if (!trimmed || trimmed.length < 2) {
      setMedSuggestions([]);
      setShowMedDropdown(false);
      return;
    }
    setIsSearchingMed(true);
    const storeId = currentfilter.StoreMasterId || activeLookup.UserStores?.[0]?.Id || 0;
    const isGeneric = !!item.IsGenericSearch;
    const todayDate = new Date().toISOString().slice(0, 10);

    const storeItemParams: any[] = [
      { Key: 1, Value: storeId },
      { Key: 12, Value: todayDate },
      { Key: 13, Value: 1 },
      { Key: 15, Value: 1 },
      { Key: 22, Value: false }
    ];
    if (isGeneric) {
      storeItemParams.push({ Key: 21, Value: trimmed });
    } else {
      storeItemParams.push({ Key: 3, Value: trimmed });
    }

    // 1. Primary search: pharmacy store catalog
    apiFetch('pharmacy/itemmaster/GetPharmacyStoreItems', {
      Params: storeItemParams,
      PageContext: { PageSize: 25, PageNumber: 1 }
    })
      .then((res: any) => {
        const list = res?.Data || res?.data || (Array.isArray(res) ? res : []);
        if (list && list.length > 0) {
          const processed = list.map((m: any) => {
            const stock = calculateItemStock(m);
            const mrp = m.MrPrice || m.ItemMaster?.MrPrice || m.Rate || m.Mrp || 0;
            return {
              ...m,
              StockInHand: stock,
              TotalQuantity: stock,
              MrPrice: mrp
            };
          });
          // Sort items with highest sellable stock first (as in legacy sort_by_stock)
          processed.sort((a: any, b: any) => (b.StockInHand || 0) - (a.StockInHand || 0));
          setMedSuggestions(processed);
          setHighlightedMedIdx(0);
          setShowMedDropdown(true);
        } else {
          fallbackStockSerialSearch(trimmed, storeId);
        }
      })
      .catch(() => {
        fallbackStockSerialSearch(trimmed, storeId);
      })
      .finally(() => setIsSearchingMed(false));
  };

  const fallbackStockSerialSearch = (query: string, storeId: number) => {
    const todayDate = new Date().toISOString().slice(0, 10);
    const storeTypeId = currentfilter.StoreTypeId || 0;
    const params: any[] = [
      { Key: 2, Value: storeId },
      { Key: 18, Value: todayDate }, // CurrentExpiry > todayDate
      { Key: 20, Value: 0 },         // Quantity > 0
      { Key: 21, Value: query }
    ];
    if (storeTypeId > 0) {
      params.push({ Key: 17, Value: storeTypeId });
    }

    apiFetch('pharmacy/stockserialitem/GetStockSerialItems', {
      Params: params,
      PageContext: { PageSize: 25, PageNumber: 1 }
    })
      .then((res: any) => {
        const list = res?.Data || res?.data || (Array.isArray(res) ? res : []);
        const processed = list.map((m: any) => {
          const stock = calculateItemStock(m);
          const mrp = m.MrPrice || m.ItemMaster?.MrPrice || m.Rate || m.Mrp || 0;
          return {
            ...m,
            StockInHand: stock,
            TotalQuantity: stock,
            MrPrice: mrp
          };
        });
        processed.sort((a: any, b: any) => (b.StockInHand || 0) - (a.StockInHand || 0));
        setMedSuggestions(processed);
        setHighlightedMedIdx(0);
        setShowMedDropdown(true);
      })
      .catch((err) => {
        console.error('Failed to search medicines', err);
        setMedSuggestions([]);
        setHighlightedMedIdx(0);
      });
  };

  const handleMedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedMedIdx((prev) => (medSuggestions.length > 0 ? (prev < medSuggestions.length - 1 ? prev + 1 : 0) : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedMedIdx((prev) => (medSuggestions.length > 0 ? (prev > 0 ? prev - 1 : medSuggestions.length - 1) : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (medSuggestions.length > 0) {
        const selIdx = highlightedMedIdx >= 0 && highlightedMedIdx < medSuggestions.length ? highlightedMedIdx : 0;
        handleSelectMedicine(medSuggestions[selIdx]);
      }
    } else if (e.key === 'Escape') {
      setShowMedDropdown(false);
    }
  };

  const handleSelectMedicine = (med: any) => {
    setShowMedDropdown(false);
    setMedQuery('');

    // Determine target index where the new medicine will land
    let targetIdx = patientBillDetails.findIndex(
      (r) => !r.ItemName && (!r.ItemMasterId || r.ItemMasterId <= 0)
    );
    if (targetIdx === -1) {
      targetIdx = patientBillDetails.length;
    }

    pendingQtyFocusIndexRef.current = targetIdx;
    shouldFocusQtyRef.current = true;

    dispatch('barcodeItemSelect', { item: med });

    // Flow Step 2: Once drug is selected, focus immediately moves to Qty enter option!
    focusQtyInput(targetIdx);
  };

  // Effective Patient (merges reactProps, item, and optimistic selection)
  const effectivePatient = useMemo(() => {
    if (selectedPatient && (selectedPatient.Id || selectedPatient.FirstName || selectedPatient.MRN)) {
      return selectedPatient;
    }
    if (item && (item.PatientId || item.FirstName || item.PatientName || item.PatientMrn)) {
      return item;
    }
    return optimisticPatient || {};
  }, [selectedPatient, item, optimisticPatient]);

  const patientDisplayName = useMemo(() => {
    const title = item.Title || (typeof effectivePatient.Title === 'object' ? effectivePatient.Title?.Description : effectivePatient.Title) || '';
    const first = item.FirstName || effectivePatient.FirstName || item.PatientName || effectivePatient.Name || '';
    const last = item.LastName || effectivePatient.LastName || '';
    if (!first && !last) return '';
    return [title, first, last].filter(Boolean).join(' ').trim();
  }, [item, effectivePatient]);

  const patientUhid = useMemo(() => {
    return item.PatientMrn || effectivePatient.MRN || effectivePatient.PatientMrn || item.MRN || '';
  }, [item, effectivePatient]);

  const patientAgeSex = useMemo(() => {
    const age = item.Age || effectivePatient.Age || '';
    const gender = item.Gender || (typeof effectivePatient.Gender === 'object' ? effectivePatient.Gender?.Description : effectivePatient.Gender) || (effectivePatient.GenderId === 1 ? 'Male' : effectivePatient.GenderId === 2 ? 'Female' : '');
    return [age ? `${age} Yrs` : '', gender].filter(Boolean).join(' / ');
  }, [item, effectivePatient]);

  const patientMobile = useMemo(() => {
    return item.Mobile || effectivePatient.Mobile || effectivePatient.PhoneNumber || '-';
  }, [item, effectivePatient]);

  return (
    <div className="pharmacy-sales-wrapper">
      {/* ─────────────────────────────────────────────────────────────
          TOP BRANDING & QUICK ACTION TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div className="pharmacy-card pharmacy-header-bar">
        <div className="pharmacy-title-group">
          <div className="pharmacy-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
          </div>
          <div>
            <h1 className="pharmacy-title">Pharmacy Medicine Sales</h1>
            <p className="pharmacy-subtitle">Outpatient Pharmacy Workstation & Point-of-Sale (POS)</p>
          </div>
        </div>

        <div className="pharmacy-action-toolbar">
          <button
            type="button"
            className="toolbar-btn primary"
            title="Register New Patient"
            onClick={() => dispatch('addnewpatient')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <span>+ New Patient</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            title="Add New / Clear Sale (F7)"
            onClick={() => dispatch('clear')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New (F7)</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            title="Find Previous Bills (F8)"
            onClick={() => {
              dispatch('findBill');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Previous Bills (F8)</span>
          </button>

          <button
            type="button"
            className="toolbar-btn badge-btn"
            title="Outstanding Dues"
            onClick={() => dispatch('outstandingBill')}
          >
            <span style={{ fontWeight: 800 }}>D</span>
            <span>Outstanding</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            title="Back to Dashboard"
            onClick={() => dispatch('backtoList')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE BILL RIBBON (IF BILL EXISTS)
      ───────────────────────────────────────────────────────────── */}
      {item.BillNumber && (
        <div className="bill-ribbon">
          <div className="bill-ribbon-item">
            <span>Bill No:</span>
            <strong>{item.BillNumber}</strong>
          </div>
          <div className="bill-ribbon-item">
            <span>Date & Time:</span>
            <strong>{fmtDate(item.BillDateTime)}</strong>
          </div>
          {encounter.VisitIdentifier && (
            <div className="bill-ribbon-item">
              <span>Encounter:</span>
              <strong>{encounter.VisitIdentifier}</strong>
            </div>
          )}
          <div className="bill-ribbon-item">
            <span>Status:</span>
            <span className={`badge-pill ${item.PatientBillStatusId === 3 ? 'success' : 'warning'}`}>
              {item.PatientBillStatus || (item.PatientBillStatusId === 3 ? 'Approved' : 'Draft')}
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PATIENT SELECTION & VISIT CONFIGURATION CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="pharmacy-card">
        <div className="header-fields-grid">
          {/* Patient Search & Active Chip */}
          <div className="field-group" style={{ gridColumn: 'span 2' }}>
            <label className="field-label">Patient Lookup / Search UHID</label>
            {patientDisplayName ? (
              <div className="patient-chip">
                <div className="patient-chip-left">
                  <div className="patient-avatar">
                    {patientDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="patient-name-title">{patientDisplayName}</div>
                    <div className="patient-meta">
                      UHID: <strong>{patientUhid || 'N/A'}</strong> &bull; {patientAgeSex || 'N/A'} &bull; Mob: {patientMobile}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Patient Comments"
                    onClick={() => dispatch('patcmnts')}
                  >
                    💬 Notes
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    title="Change Patient"
                    onClick={handleClearPatient}
                  >
                    ✕ Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="patient-search-box" ref={patientSearchRef}>
                <input
                  ref={patientInputRef}
                  id="patientSearchInput"
                  type="text"
                  className="field-input"
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="Type Patient Name, Mobile No, or UHID (Press Enter)..."
                  value={patientQuery}
                  onChange={(e) => handlePatientSearchChange(e.target.value)}
                  onKeyDown={handlePatientKeyDown}
                  onFocus={() => {
                    if (patientSuggestions.length > 0) setShowPatientDropdown(true);
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '10px',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}
                >
                  {isSearchingPatient ? '⏳' : '🔍'}
                </span>

                {showPatientDropdown && patientSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {patientSuggestions.map((p, pIdx) => {
                      const pTitle = typeof p.Title === 'object' ? p.Title?.Description : p.Title || '';
                      const pGender = typeof p.Gender === 'object' ? p.Gender?.Description : (p.Gender || (p.GenderId === 1 ? 'M' : p.GenderId === 2 ? 'F' : ''));
                      const pName = [pTitle, p.FirstName, p.LastName].filter(Boolean).join(' ') || p.Name || 'Unknown Patient';
                      const pAge = p.Age ? `${p.Age} Y` : '';
                      const pAgeSex = [pAge, pGender].filter(Boolean).join(' / ');

                      return (
                        <div
                          key={`pat-${p.Id ?? pIdx}-${pIdx}`}
                          className={`suggestion-item ${highlightedPatientIdx === pIdx ? 'active' : ''}`}
                          onClick={() => handleSelectPatient(p)}
                        >
                          <div className="suggestion-main">
                            <span className="suggestion-title">
                              {pName}
                            </span>
                            <span className="suggestion-subtitle">
                              UHID: <strong>{p.MRN || p.PatientMrn || 'N/A'}</strong> {pAgeSex ? `• ${pAgeSex}` : ''}
                            </span>
                          </div>
                          <div className="suggestion-meta">
                            <span>📞 {p.Mobile || p.PhoneNumber || '-'}</span>
                            <span className="badge-pill info">Select</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visit Type */}
          <div className="field-group">
            <label className="field-label">Visit Type</label>
            <select
              className="field-select"
              value={item.EncounterTypeId || 1}
              onChange={(e) => dispatch('encounterTypeChange', { id: Number(e.target.value) })}
            >
              {(activeLookup.EncounterType || []).map((t: LookupItem, idx: number) => (
                <option key={`encounter-${t.Id ?? idx}-${idx}`} value={t.Id}>
                  {t.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Prescribing Doctor */}
          <div className="field-group">
            <label className="field-label">Prescribing Doctor</label>
            <select
              className="field-select"
              value={item.DoctorId || -1}
              onChange={(e) => {
                const docId = Number(e.target.value);
                const docObj = (activeLookup.Doctor || []).find((d: LookupItem) => d.Id === docId);
                dispatch('doctorChange', { id: docId, name: docObj?.Text || '' });
              }}
            >
              <option key="default-doctor" value={-1}>-- Select Prescribing Doctor --</option>
              {(activeLookup.Doctor || [])
                .filter((d: LookupItem) => d.Id !== -1)
                .map((d: LookupItem, idx: number) => (
                  <option key={`doctor-${d.Id ?? idx}-${idx}`} value={d.Id}>
                    {d.Text}
                  </option>
                ))}
            </select>
          </div>

          {/* Pharmacy Store */}
          <div className="field-group">
            <label className="field-label">Dispensing Pharmacy Store</label>
            <select
              className="field-select"
              value={currentfilter.StoreMasterId || Number(typeof localStorage !== 'undefined' ? localStorage.getItem('SELECTED_PHARMACY_STORE_ID') : 0) || ''}
              onChange={(e) => {
                const storeId = Number(e.target.value);
                const storeObj = (activeLookup.UserStores || []).find((s: LookupItem) => s.Id === storeId);
                try {
                  localStorage.setItem('SELECTED_PHARMACY_STORE_ID', String(storeId));
                } catch (_) {}
                dispatch('storeChange', { id: storeId, store: storeObj });
              }}
            >
              {(activeLookup.UserStores || []).map((s: LookupItem, idx: number) => (
                <option key={`store-${s.Id ?? idx}-${idx}`} value={s.Id}>
                  {s.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Payer / Guarantor */}
          <div className="field-group">
            <label className="field-label">Payer / Guarantor</label>
            <select
              className="field-select"
              value={item.GuarantorId || 1}
              onChange={(e) => {
                const gId = Number(e.target.value);
                const gObj = (activeLookup.Guarantor || []).find((g: LookupItem) => g.Id === gId);
                dispatch('guarantorChange', { id: gId, item: gObj });
              }}
            >
              {(activeLookup.Guarantor || []).map((g: LookupItem, idx: number) => (
                <option key={`guarantor-${g.Id ?? idx}-${idx}`} value={g.Id}>
                  {g.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Discount Mode (OP Billing Style Toggle) */}
          <div className="field-group">
            <label className="field-label">Discount Mode</label>
            <div style={{ paddingTop: '4px' }}>
              <DiscountToggle
                mode={currentfilter.DiscountModeId ?? 2}
                disabled={flags.isApproved}
                onChange={(newMode) => {
                  dispatch('discountModeChange', { id: newMode });
                  dispatch('headerDiscountChange', {
                    value: currentcontext.BillDiscount || 0,
                    discountModeId: newMode,
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RAPID MEDICINE ENTRY & BARCODE SCANNER BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="rapid-entry-bar" ref={medSearchRef}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <input
            type="checkbox"
            checked={!!item.IsGenericSearch}
            onChange={(e) => dispatch('genericSearchToggle', { value: e.target.checked })}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>Generic Search</span>
        </label>

        <div className="rapid-search-wrapper">
          <input
            ref={medInputRef}
            id="rapidMedSearchInput"
            type="text"
            className="rapid-search-input"
            placeholder="Scan Barcode or Type Medicine Code / Name [Press Enter]..."
            value={medQuery}
            onChange={(e) => handleMedSearchChange(e.target.value)}
            onKeyDown={handleMedKeyDown}
            onFocus={() => {
              if (medSuggestions.length > 0) setShowMedDropdown(true);
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '11px',
              fontSize: '16px',
              color: '#64748b',
              pointerEvents: 'none'
            }}
          >
            {isSearchingMed ? '⏳' : '⚡'}
          </span>

          {showMedDropdown && medSuggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {medSuggestions.map((m: any, idx: number) => {
                const itemName = m.ItemName || m.ItemMaster?.ItemName || 'Unnamed Item';
                const itemCode = m.ItemCode || m.ItemMaster?.ItemCode || '';
                const genericName = m.GenericName || m.ItemMaster?.GenericName || m.ItemMaster?.GenericMaster?.GenericName || 'N/A';
                const stockQty = m.StockInHand ?? m.Quantity ?? m.TotalQuantity ?? 0;
                const price = m.MrPrice || m.Rate || m.ItemMaster?.MrPrice || m.Mrp || 0;
                const rack = m.RackName || m.RST || '-';

                return (
                  <div
                    key={`med-${m.StockSerialItemId || m.ItemMasterId || m.Id || idx}-${idx}`}
                    className={`suggestion-item ${highlightedMedIdx === idx ? 'active' : ''}`}
                    onClick={() => handleSelectMedicine(m)}
                  >
                    <div className="suggestion-main">
                      <span className="suggestion-title">
                        {itemName} {itemCode ? <span style={{ color: '#64748b', fontSize: '11px' }}>({itemCode})</span> : null}
                      </span>
                      <span className="suggestion-subtitle">
                        Generic: {genericName} &bull; Rack: {rack}
                      </span>
                    </div>
                    <div className="suggestion-meta">
                      <span className={`badge-pill ${stockQty > 0 ? 'info' : 'danger'}`}>
                        Stock: {stockQty}
                      </span>
                      <span style={{ fontWeight: 700, color: '#166534' }}>
                        {fmtCur(price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          className="toolbar-btn primary"
          style={{ height: '40px', padding: '0 16px' }}
          onClick={() => dispatch('addServiceRow')}
        >
          <span>+ Add Row</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MEDICINES & LINE ITEMS TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="pharmacy-table-container">
        <table className="pharmacy-data-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th>Medicine Name & Code</th>
              <th>Generic Molecule</th>
              <th>Rack</th>
              <th>Total Stock</th>
              <th>Batch Stock</th>
              <th style={{ width: '90px', minWidth: '85px', textAlign: 'center' }}>Qty</th>
              <th>Batch No</th>
              <th>Expiry</th>
              <th style={{ textAlign: 'right' }}>MRP (₹)</th>
              <th style={{ textAlign: 'center', width: '125px' }}>Discount</th>
              <th style={{ textAlign: 'right' }}>GST %</th>
              <th style={{ textAlign: 'right' }}>Net (₹)</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patientBillDetails.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>💊</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>
                    No medicines added yet
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Scan barcode or use the rapid medicine search above to add items to this sale
                  </div>
                </td>
              </tr>
            ) : (
              patientBillDetails.map((row: PatientBillDetailRow, idx: number) => {
                const isExpiredOrStop = row.ExpiryStop;
                const isNearExpiry = row.ExpiryAlert;
                const isNarcotic = row.IsNarcotic;

                return (
                  <tr key={`bill-row-${row.Id !== undefined && row.Id !== -1 ? row.Id : 'new'}-${row.SNo || idx}-${idx}`}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                      {idx + 1}
                    </td>

                    {/* Medicine Code & Name */}
                    <td>
                      {row.ItemName || row.ServiceName ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {row.ItemName || row.ServiceName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {row.ItemCode || row.ServiceCode || ''}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="table-action-btn"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            color: '#3b82f6',
                            border: '1px dashed #93c5fd',
                            background: '#eff6ff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                          onClick={() => {
                            const input = document.querySelector('.rapid-search-input') as HTMLInputElement;
                            input?.focus();
                          }}
                        >
                          🔍 Click to scan / search medicine above...
                        </button>
                      )}
                    </td>

                    {/* Generic Name & Narcotic Indicator */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{row.GenericName || '-'}</span>
                        {isNarcotic && (
                          <span
                            className="badge-pill danger"
                            title="Narcotic Item"
                            style={{ padding: '0 4px', fontSize: '10px' }}
                          >
                            N
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rack */}
                    <td>
                      <span className="badge-pill neutral">{row.RST || '-'}</span>
                    </td>

                    {/* Total Stock */}
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: row.IsFallUnderMinQty ? '#dc2626' : '#334155'
                        }}
                      >
                        {row.TotalQuantity !== undefined && row.TotalQuantity !== null ? row.TotalQuantity : (row.StockInHand ?? '-')}
                      </span>
                    </td>

                    {/* Batch Stock */}
                    <td>
                      <span>{row.BatchQuantity !== undefined && row.BatchQuantity !== null && row.BatchQuantity > 0 ? row.BatchQuantity : (row.TotalQuantity ?? '-')}</span>
                    </td>

                    {/* Sell Quantity Input */}
                    <td style={{ textAlign: 'center', width: '90px', minWidth: '85px' }}>
                      <input
                        type="number"
                        min="1"
                        id={`table-qty-input-${idx}`}
                        className="table-qty-input"
                        style={{
                          width: '76px',
                          height: '38px',
                          fontSize: '15px',
                          fontWeight: 700,
                        }}
                        value={row.Quantity !== undefined && row.Quantity !== null && row.Quantity !== '' ? row.Quantity : (row.ItemName || row.ServiceName || row.ItemMasterId ? 1 : '')}
                        disabled={!row.ItemName && (!row.ItemMasterId || row.ItemMasterId <= 0)}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          const newQty = e.target.value === '' ? '' : (isNaN(val) ? 0 : Math.max(0, val));
                          dispatch('qtyChange', { index: idx, quantity: newQty, item: row });
                        }}
                        onBlur={() => {
                          if (row.Quantity === '' || !row.Quantity || Number(row.Quantity) <= 0) {
                            dispatch('qtyChange', { index: idx, quantity: 1, item: row });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (row.Quantity === '' || !row.Quantity || Number(row.Quantity) <= 0) {
                              dispatch('qtyChange', { index: idx, quantity: 1, item: row });
                            }
                            // Flow Step 3: Once qty is entered (Enter pressed), jump back and load next drug option!
                            focusMedSearch();
                          }
                        }}
                      />
                    </td>

                    {/* Batch No & Picker */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className={`badge-pill ${
                            isExpiredOrStop ? 'danger' : isNearExpiry ? 'warning' : 'neutral'
                          }`}
                        >
                          {row.BatchId || 'Default'}
                        </span>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Select Batch Details"
                          onClick={() => dispatch('batchDetails', { index: idx, item: row })}
                        >
                          <strong>B</strong>
                        </button>
                      </div>
                    </td>

                    {/* Expiry Date */}
                    <td>
                      <span
                        style={{
                          fontWeight: 500,
                          color: isExpiredOrStop ? '#dc2626' : isNearExpiry ? '#d97706' : '#15803d'
                        }}
                      >
                        {fmtDate(row.ExpiryDate)}
                      </span>
                    </td>

                    {/* Rate / MRP */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmtCur(row.MrPrice || row.Rate || 0)}
                    </td>

                    {/* Line Item Discount (% / ₹ Toggle + Input, OP Billing Style) */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <DiscountToggle
                          mode={row.DiscountModeId || currentfilter.DiscountModeId || 2}
                          disabled={flags.isApproved}
                          onChange={(newMode) => {
                            if (flags.isApproved) return;
                            dispatch('lineDiscountChange', {
                              index: idx,
                              discountAmount: row.DiscountAmount || 0,
                              discountModeId: newMode,
                            });
                          }}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={flags.isApproved}
                          value={row.DiscountAmount !== undefined && row.DiscountAmount !== null && row.DiscountAmount !== 0 ? row.DiscountAmount : ''}
                          placeholder="0"
                          onChange={(e) => {
                            if (flags.isApproved) return;
                            dispatch('lineDiscountChange', {
                              index: idx,
                              discountAmount: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0),
                              discountModeId: row.DiscountModeId || currentfilter.DiscountModeId || 2,
                            });
                          }}
                          className="table-qty-input"
                          style={{
                            width: '46px',
                            height: '26px',
                            textAlign: 'right',
                            color: '#dc2626',
                            fontWeight: 600,
                            padding: '0 4px',
                            fontSize: '11px',
                          }}
                        />
                      </div>
                    </td>

                    {/* GST % */}
                    <td style={{ textAlign: 'right' }}>
                      {row.GSTPercentage != null ? `${row.GSTPercentage}%` : '-'}
                    </td>

                    {/* Net Amount */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e3a8a' }}>
                      {fmtCur(row.NetAmount || row.Amount || 0)}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Alternate Generic Medicines"
                          onClick={() => dispatch('alternateDetails', { index: idx, item: row })}
                        >
                          🔄
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Alert Info"
                          onClick={() => dispatch('alertInfo', { index: idx, item: row })}
                        >
                          ℹ️
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Item Sales History"
                          onClick={() => dispatch('itemdataInfo', { index: idx, item: row })}
                        >
                          📜
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

      {/* ─────────────────────────────────────────────────────────────
          MIDDLE STATS & PENDING ORDERS NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div className="middle-stats-bar">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div
            className="stat-chip"
            onClick={() => dispatch('pendingPrescription')}
            title="View Pending Prescriptions"
          >
            <span>Pending Prescriptions</span>
            <span className="stat-count">{item.PatientPendingPrescribeCount || 0}</span>
          </div>

          <div
            className="stat-chip"
            onClick={() => dispatch('pendingBill')}
            title="View Pending Bills"
          >
            <span>Pending Bills</span>
            <span className="stat-count">{item.Count || 0}</span>
          </div>

          {currentcontext.PaymentTypeId === 7 && (
            <button
              type="button"
              className="toolbar-btn primary"
              onClick={() => dispatch('adjustAgainstAdvance')}
            >
              Adjust Against Advance
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            Balance Amount:
          </span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: currentcontext.TotBalanceAmt > 0 ? '#b45309' : '#15803d'
            }}
          >
            {fmtCur(currentcontext.TotBalanceAmt || 0)}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SETTLEMENT & PAYMENT DETAILS (OP BILLING 3-PANEL CLUSTER)
      ───────────────────────────────────────────────────────────── */}
      <div className="settlement-panel-opstyle">
        {/* Settlement Panel 1: Bill Discount & Approvals & Remarks */}
        <div className="settlement-card">
          <div>
            <div className="settlement-card-header">
              <span>🏷️</span> Bill Discount &amp; Approvals
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Bill Discount Field with Inline Mode Toggle */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="field-label" style={{ margin: 0 }}>
                    Bill Discount
                  </label>
                  <DiscountToggle
                    mode={currentfilter.DiscountModeId ?? 2}
                    disabled={flags.isApproved}
                    onChange={(newMode) => {
                      dispatch('discountModeChange', { id: newMode });
                      dispatch('headerDiscountChange', {
                        value: currentcontext.BillDiscount || 0,
                        discountModeId: newMode,
                      });
                    }}
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={flags.isApproved}
                  className="field-input"
                  style={{
                    fontWeight: 700,
                    color: '#dc2626',
                    height: '34px',
                    fontSize: '13px'
                  }}
                  value={currentcontext.BillDiscount !== undefined && currentcontext.BillDiscount !== null && currentcontext.BillDiscount !== 0 ? currentcontext.BillDiscount : ''}
                  placeholder={currentfilter.DiscountModeId === 1 ? '₹ 0.00' : '0.00 %'}
                  onChange={(e) => {
                    if (flags.isApproved) return;
                    dispatch('headerDiscountChange', {
                      value: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0),
                      discountModeId: currentfilter.DiscountModeId ?? 2,
                    });
                  }}
                />
              </div>

              {/* Discount Approver */}
              <div>
                <label className="field-label">Discount Approver</label>
                <select
                  className="field-select"
                  disabled={flags.isApproved}
                  value={currentcontext.DiscountApprovedBy || -1}
                  onChange={(e) => {
                    const apId = Number(e.target.value);
                    const apObj = (activeLookup.DiscountApprover || []).find((a: LookupItem) => a.Id === apId);
                    dispatch('discountApproverChange', { id: apId, item: apObj });
                  }}
                >
                  <option key="default-discount-approver" value={-1}>-- Select Discount Approver --</option>
                  {(activeLookup.DiscountApprover || [])
                    .filter((a: LookupItem) => a.Id !== -1)
                    .map((a: LookupItem, idx: number) => (
                      <option key={`disc-approver-${a.Id ?? idx}-${idx}`} value={a.Id}>
                        {a.Text}
                      </option>
                    ))}
                </select>
              </div>

              {/* Due / Credit Approver (Essential for authorizing bills with an outstanding balance / credit approval) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label htmlFor="creditapprover" className="field-label" style={{ margin: 0, fontWeight: 700, color: outstandingDueAmount > 0 && (!item.PrivateDueId || item.PrivateDueId <= 0) ? '#b45309' : '#334155' }}>
                    Credit / Due Approver {outstandingDueAmount > 0 && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {outstandingDueAmount > 0 ? (
                    <span className={`badge-pill ${item.PrivateDueId > 0 ? 'success' : 'warning'}`} style={{ fontSize: '10px' }}>
                      {item.PrivateDueId > 0 ? '✓ Authorized' : `! Required for Due ${fmtCur(outstandingDueAmount)}`}
                    </span>
                  ) : (
                    <span className="badge-pill success" style={{ fontSize: '10px' }}>
                      Paid in Full
                    </span>
                  )}
                </div>
                <select
                  id="creditapprover"
                  name="creditapprover"
                  className="field-select"
                  disabled={flags.isApproved || outstandingDueAmount <= 0}
                  value={item.PrivateDueId && item.PrivateDueId > 0 ? item.PrivateDueId : -1}
                  onChange={(e) => {
                    const apId = Number(e.target.value);
                    const apObj = (activeLookup.PrivateDueApprover || []).find((d: LookupItem) => d.Id === apId);
                    dispatch('creditApproverChange', { id: apId, item: apObj });
                  }}
                  style={{
                    backgroundColor: outstandingDueAmount <= 0 ? '#f8fafc' : '#ffffff',
                    borderColor: outstandingDueAmount > 0 && (!item.PrivateDueId || item.PrivateDueId <= 0) ? '#f59e0b' : '#cbd5e1',
                    fontWeight: item.PrivateDueId > 0 ? 600 : 400
                  }}
                >
                  <option key="default-due-approver-p1" value={-1}>-- Select Due Approver --</option>
                  {(activeLookup.PrivateDueApprover || [])
                    .filter((d: LookupItem) => d.Id !== -1)
                    .map((d: LookupItem, idx: number) => (
                      <option key={`due-approver-p1-${d.Id ?? idx}-${idx}`} value={d.Id}>
                        {d.Text}
                      </option>
                    ))}
                </select>
                {outstandingDueAmount > 0 && (!item.PrivateDueId || item.PrivateDueId <= 0) && (
                  <div style={{ fontSize: '11px', color: '#b45309', marginTop: '3px', fontWeight: 500 }}>
                    ⚠️ Balance of {fmtCur(outstandingDueAmount)} will remain as Due. Please select Due Approver before approval.
                  </div>
                )}
              </div>

              {/* Multiple Payment Checkbox */}
              <div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.IsMultiplePayment || paymentSplits.length > 1)}
                    disabled={flags.isApproved || isFullyCollected}
                    onChange={(e) => handleToggleMultiplePayment(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: (flags.isApproved || isFullyCollected) ? 'not-allowed' : 'pointer' }}
                  />
                  Enable Multiple Payment Modes
                </label>
              </div>
            </div>
          </div>

          {/* Billing Remarks / Notes */}
          <div style={{ marginTop: '12px' }}>
            <label className="field-label">Billing Remarks / Clinical Notes</label>
            <textarea
              rows={2}
              className="field-input"
              style={{ height: 'auto', resize: 'none', padding: '8px', fontSize: '12px' }}
              placeholder="Enter remarks or transaction notes..."
              value={item.Comments || ''}
              onChange={(e) => dispatch('fieldChange', { Comments: e.target.value })}
            />
          </div>
        </div>

        {/* Settlement Panel 2: Payment Mode & Collection Receipts */}
        <div className="settlement-card">
          <div>
            <div className="settlement-card-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💳</span> Payment Mode &amp; Receipts
                </span>
                {(item.IsMultiplePayment || paymentSplits.length > 1) && (
                  <span className="badge-pill primary" style={{ fontSize: '10px' }}>
                    {paymentSplits.length} Payment {paymentSplits.length > 1 ? 'Modes' : 'Mode'}
                  </span>
                )}
              </div>
            </div>

            {/* If Multiple Payment is active, render OP-Billing style split cards */}
            {(item.IsMultiplePayment || paymentSplits.length > 1) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {paymentSplits.map((split, sIdx) => {
                  const isCheque = split.paymentTypeId === 2 || split.paymentTypeId === 3 || split.paymentTypeId === 4;
                  const isCard = split.paymentTypeId === 5 || split.paymentTypeId === 6;
                  const isUpi = split.paymentTypeId === 11 || split.paymentTypeId === 12;

                  return (
                    <div
                      key={split.id || sIdx}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto', gap: '8px', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
                            Mode #{sIdx + 1}
                          </label>
                          <select
                            value={split.paymentTypeId}
                            disabled={flags.isApproved}
                            onChange={(e) => handleSplitTypeChange(sIdx, Number(e.target.value))}
                            className="field-select"
                            style={{ height: '30px', fontSize: '12px', fontWeight: 600, padding: '0 6px' }}
                          >
                            {(activeLookup.PaymentType || [
                              { Id: 1, Text: 'Cash' },
                              { Id: 2, Text: 'Cheque' },
                              { Id: 3, Text: 'DD' },
                              { Id: 4, Text: 'Wire Transfer / NEFT' },
                              { Id: 5, Text: 'Credit Card' },
                              { Id: 6, Text: 'Debit Card' },
                              { Id: 7, Text: 'Advance Adjustment' },
                              { Id: 11, Text: 'UPI / QR Payment' }
                            ]).map((p: LookupItem, idx: number) => (
                              <option key={`split-paytype-${p.Id ?? idx}-${idx}`} value={p.Id}>
                                {p.Text}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                              Amount (₹)
                            </label>
                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                              Max: {fmtCur(totalBillNetAmount)}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={maxAllowedReceiptAmount}
                            value={split.amount !== undefined && split.amount !== null ? split.amount : ''}
                            disabled={flags.isApproved}
                            placeholder="0.00"
                            onChange={(e) => handleSplitAmountChange(sIdx, e.target.value)}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              if (maxAllowedReceiptAmount > 0 && v > maxAllowedReceiptAmount) {
                                handleSplitAmountChange(sIdx, maxAllowedReceiptAmount);
                              }
                            }}
                            className="field-input"
                            style={{
                              height: '30px',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#15803d',
                              padding: '0 8px',
                            }}
                          />
                        </div>

                        <div style={{ paddingTop: '14px' }}>
                          {paymentSplits.length > 1 && !flags.isApproved && (
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentSplit(sIdx)}
                              title="Remove this split"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                                fontSize: '13px',
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mode-specific detail inputs */}
                      {isUpi && (
                        <div style={{ marginTop: '6px' }}>
                          <input
                            type="text"
                            placeholder="UPI Ref / Transaction ID"
                            value={split.upiRefNumber || (sIdx === 0 ? item.UPIRefNumber || '' : '')}
                            disabled={flags.isApproved}
                            onChange={(e) => handleSplitFieldChange(sIdx, 'upiRefNumber', e.target.value)}
                            className="field-input"
                            style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                          />
                        </div>
                      )}

                      {isCard && (
                        <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                          <select
                            value={split.bankId || (sIdx === 0 ? item.BankId || '' : '')}
                            disabled={flags.isApproved}
                            onChange={(e) => handleSplitFieldChange(sIdx, 'bankId', Number(e.target.value))}
                            className="field-select"
                            style={{ height: '28px', fontSize: '11px' }}
                          >
                            <option value="">-- Bank --</option>
                            {(activeLookup.Bank || []).filter((b: LookupItem) => b.Id !== -1).map((b: LookupItem, idx: number) => (
                              <option key={`card-bank-${b.Id ?? idx}-${idx}`} value={b.Id}>{b.Text}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            maxLength={8}
                            placeholder="Auth Code"
                            value={split.authorizeNumber || (sIdx === 0 ? item.AuthorizeNumber || '' : '')}
                            disabled={flags.isApproved}
                            onChange={(e) => handleSplitFieldChange(sIdx, 'authorizeNumber', e.target.value)}
                            className="field-input"
                            style={{ height: '28px', fontSize: '11px', padding: '0 6px' }}
                          />
                        </div>
                      )}

                      {isCheque && (
                        <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px' }}>
                          <select
                            value={split.bankId || (sIdx === 0 ? item.BankId || '' : '')}
                            disabled={flags.isApproved}
                            onChange={(e) => handleSplitFieldChange(sIdx, 'bankId', Number(e.target.value))}
                            className="field-select"
                            style={{ height: '28px', fontSize: '11px' }}
                          >
                            <option value="">-- Select Bank --</option>
                            {(activeLookup.Bank || []).filter((b: LookupItem) => b.Id !== -1).map((b: LookupItem, idx: number) => (
                              <option key={`cheque-bank-${b.Id ?? idx}-${idx}`} value={b.Id}>{b.Text}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Cheque No"
                            value={split.chequeNo || (sIdx === 0 ? item.ChequeNo || '' : '')}
                            disabled={flags.isApproved}
                            onChange={(e) => handleSplitFieldChange(sIdx, 'chequeNo', e.target.value)}
                            className="field-input"
                            style={{ height: '28px', fontSize: '11px', padding: '0 6px' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Split & Auto-fill buttons */}
                {!flags.isApproved && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleAddPaymentSplit}
                      disabled={paymentSplits.length >= 6}
                      style={{
                        border: '1px dashed #2563eb',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        borderRadius: '6px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: paymentSplits.length >= 6 ? 'not-allowed' : 'pointer',
                        opacity: paymentSplits.length >= 6 ? 0.5 : 1,
                      }}
                    >
                      + Add Payment Split
                    </button>

                    {outstandingDueAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const lastIdx = paymentSplits.length - 1;
                          handleSplitAmountChange(lastIdx, (paymentSplits[lastIdx]?.amount || 0) + outstandingDueAmount);
                        }}
                        className="autofill-btn"
                        style={{ fontSize: '11px' }}
                      >
                        Auto-fill Due {fmtCur(outstandingDueAmount)}
                      </button>
                    )}
                  </div>
                )}

                {/* Split Excess Warning */}
                {isPaymentSplitExceeded && (
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}>
                    ⚠️ Total payments ({fmtCur(totalCollectedFromSplits)}) exceed Net Payable ({fmtCur(totalBillNetAmount)}). Please adjust amounts.
                  </div>
                )}
              </div>
            ) : (
              /* Single Mode (Default) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Payment Method */}
                <div>
                  <label className="field-label">Payment Method</label>
                  <select
                    className="field-select"
                    disabled={flags.isApproved || isFullyCollected}
                    value={currentcontext.PaymentTypeId || 1}
                    onChange={(e) => dispatch('paymentTypeChange', { id: Number(e.target.value) })}
                  >
                    {(activeLookup.PaymentType || [
                      { Id: 1, Text: 'Cash' },
                      { Id: 2, Text: 'Cheque' },
                      { Id: 3, Text: 'DD' },
                      { Id: 4, Text: 'Wire Transfer / NEFT' },
                      { Id: 5, Text: 'Credit Card' },
                      { Id: 6, Text: 'Debit Card' },
                      { Id: 7, Text: 'Advance Adjustment' },
                      { Id: 11, Text: 'UPI / QR Payment' }
                    ]).map((p: LookupItem, idx: number) => (
                      <option key={`payment-type-${p.Id ?? idx}-${idx}`} value={p.Id}>
                        {p.Text}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Received Amount Input (Hidden when bill is fully paid/collected) */}
                {!isFullyCollected && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label className="field-label" style={{ margin: 0 }}>Received Amount (₹)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          Max: {fmtCur(maxAllowedReceiptAmount)}
                        </span>
                        {outstandingDueAmount > 0 && (
                          <button
                            type="button"
                            className="autofill-btn"
                            onClick={() => {
                              handleSplitAmountChange(0, maxAllowedReceiptAmount);
                            }}
                            title="Auto-fill balance to settle in full"
                          >
                            Auto-fill {fmtCur(outstandingDueAmount)}
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={maxAllowedReceiptAmount}
                      className="field-input"
                      style={{ fontWeight: 700, fontSize: '14px', color: '#15803d' }}
                      value={paymentSplits[0]?.amount !== undefined && paymentSplits[0]?.amount !== null ? paymentSplits[0].amount : ''}
                      onChange={(e) => handleSplitAmountChange(0, e.target.value)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (maxAllowedReceiptAmount > 0 && v > maxAllowedReceiptAmount) {
                          handleSplitAmountChange(0, maxAllowedReceiptAmount);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* Full Collection Status Indicator */}
                {isFullyCollected && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      color: '#15803d',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <span>✓</span>
                    <span>Full payment of {fmtCur(totalPaidAcrossAll > 0 ? totalPaidAcrossAll : totalBillNetAmount)} has been collected.</span>
                  </div>
                )}

                {/* Conditional Bank Name (Only for active collection) */}
                {!isFullyCollected && currentcontext.PaymentTypeId > 1 && currentcontext.PaymentTypeId !== 7 && (
                  <div>
                    <label className="field-label">Bank Name</label>
                    <select
                      className="field-select"
                      value={item.BankId || -1}
                      onChange={(e) => dispatch('fieldChange', { BankId: Number(e.target.value) })}
                    >
                      <option key="default-bank" value={-1}>-- Select Bank --</option>
                      {(activeLookup.Bank || [])
                        .filter((b: LookupItem) => b.Id !== -1)
                        .map((b: LookupItem, idx: number) => (
                          <option key={`bank-${b.Id ?? idx}-${idx}`} value={b.Id}>
                            {b.Text}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Cheque No */}
                {!isFullyCollected && currentcontext.PaymentTypeId === 2 && (
                  <div>
                    <label className="field-label">Cheque Number</label>
                    <input
                      type="text"
                      className="field-input"
                      value={item.ChequeNo || ''}
                      onChange={(e) => dispatch('fieldChange', { ChequeNo: e.target.value })}
                    />
                  </div>
                )}

                {/* UPI Ref Number */}
                {!isFullyCollected && (currentcontext.PaymentTypeId === 11 || currentcontext.PaymentTypeId === 12) && (
                  <div>
                    <label className="field-label">UPI Reference No</label>
                    <input
                      type="text"
                      className="field-input"
                      value={item.UPIRefNumber || ''}
                      onChange={(e) => dispatch('fieldChange', { UPIRefNumber: e.target.value })}
                    />
                  </div>
                )}

                {/* Card Authorization Code */}
                {!isFullyCollected && (currentcontext.PaymentTypeId === 5 || currentcontext.PaymentTypeId === 6) && (
                  <div>
                    <label className="field-label">Auth / Approval Code</label>
                    <input
                      type="text"
                      className="field-input"
                      value={item.AuthorizeNumber || ''}
                      maxLength={6}
                      onChange={(e) => dispatch('fieldChange', { AuthorizeNumber: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Collection Summary & Credit / Due Approver Section (Only shown when there is an outstanding balance) */}
            {outstandingDueAmount > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                      Credit / Due Authorization
                    </span>
                    <span className={`badge-pill ${item.PrivateDueId > 0 ? 'success' : 'warning'}`} style={{ fontSize: '10px' }}>
                      {item.PrivateDueId > 0 ? '✓ Authorized' : `! Due: ${fmtCur(outstandingDueAmount)}`}
                    </span>
                  </div>

                  <select
                    className="field-select"
                    disabled={flags.isApproved}
                    value={item.PrivateDueId && item.PrivateDueId > 0 ? item.PrivateDueId : -1}
                    onChange={(e) => {
                      const apId = Number(e.target.value);
                      const apObj = (activeLookup.PrivateDueApprover || []).find((d: LookupItem) => d.Id === apId);
                      dispatch('creditApproverChange', { id: apId, item: apObj });
                    }}
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: (!item.PrivateDueId || item.PrivateDueId === -1) ? '#f59e0b' : '#cbd5e1',
                      fontWeight: item.PrivateDueId > 0 ? 600 : 400
                    }}
                  >
                    <option key="default-due-approver-p2" value={-1}>-- Select Due Approver --</option>
                    {(activeLookup.PrivateDueApprover || [])
                      .filter((d: LookupItem) => d.Id !== -1)
                      .map((d: LookupItem, idx: number) => (
                        <option key={`due-approver-p2-${d.Id ?? idx}-${idx}`} value={d.Id}>
                          {d.Text}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Payment Receipts Breakdown */}
          {paymentInfoDetails.length > 0 && (
            <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e3a8a', marginBottom: '6px' }}>
                Payment Receipts History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {paymentInfoDetails.map((pay: PaymentInfoRow, pIdx: number) => (
                  <div
                    key={`pay-${pay.ReceiptNumber || pIdx}-${pIdx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      padding: '4px 8px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <span>
                      <strong>{pay.ReceiptNumber}</strong> &bull; {fmtDate(pay.ReceiptDateTime)} &bull; {pay.PaymentType}
                    </span>
                    <strong style={{ color: '#166534' }}>{fmtCur(pay.AmountPaid)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settlement Panel 3: Financial Summary & Tender Cash Return Calculator (OP Billing style) */}
        <div className="totals-receipt-card">
          <div className="receipt-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🧾</span> Billing Summary &amp; Balance
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>POS Settlement</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="receipt-row">
              <span>Patient Available Credit:</span>
              <span>{fmtCur(item.TotalAvailableAmount || 0)}</span>
            </div>

            <div className="receipt-row">
              <span>Gross Total:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmtCur(item.GrossAmount || 0)}</span>
            </div>

            <div className="receipt-row">
              <span>Total Discount:</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{fmtCur(item.TotDiscAmount || 0)}</span>
            </div>

            {(Boolean(flags.enableRoundOff) || Boolean(item.TotRndoffAmt || item.RoundOffValue)) && (
              <div className="receipt-row">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>Round Off:</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: flags.enableRoundOff ? '#ecfdf5' : '#f1f5f9',
                      color: flags.enableRoundOff ? '#059669' : '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {flags.enableRoundOff ? 'Facility Master' : 'Recorded'}
                  </span>
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      (item.TotRndoffAmt || item.RoundOffValue || 0) < 0
                        ? '#dc2626'
                        : (item.TotRndoffAmt || item.RoundOffValue || 0) > 0
                        ? '#15803d'
                        : '#64748b',
                  }}
                >
                  {(item.TotRndoffAmt || item.RoundOffValue || 0) > 0
                    ? `+${fmtCur(item.TotRndoffAmt || item.RoundOffValue)}`
                    : fmtCur(item.TotRndoffAmt ?? item.RoundOffValue ?? 0)}
                </span>
              </div>
            )}

            {currentcontext.TDSAmount > 0 && (
              <div className="receipt-row">
                <span>TDS Amount:</span>
                <span>{fmtCur(currentcontext.TDSAmount)}</span>
              </div>
            )}

            {currentcontext.RefundAmount > 0 && (
              <div className="receipt-row">
                <span>Refund Amount:</span>
                <span>{fmtCur(currentcontext.RefundAmount)}</span>
              </div>
            )}

            <div className="receipt-row highlight">
              <span>Net Payable Amount:</span>
              <span>{fmtCur(currentcontext.TotNetAmount || 0)}</span>
            </div>

            <div className="receipt-row">
              <span>Paid / Received Amount:</span>
              <span style={{ fontWeight: 700, color: '#15803d' }}>
                {fmtCur(totalPaidAcrossAll > 0 ? totalPaidAcrossAll : (item.Received || currentcontext.ReceiptAmt || 0))}
              </span>
            </div>

            <div className="receipt-row due">
              <span>Outstanding Balance Due:</span>
              <span style={{ fontWeight: 800, color: outstandingDueAmount > 0 ? '#b45309' : '#15803d' }}>
                {fmtCur(outstandingDueAmount)}
              </span>
            </div>
          </div>

          {/* Tender Amount Input & Change Return Box (OP Billing Style) */}
          <div className="tender-cash-box">
            <div className="tender-cash-row">
              <span className="tender-cash-label">
                💵 Tender Cash:
              </span>
              <input
                type="number"
                step="1"
                min="0"
                value={currentcontext.TenderAmount !== undefined && currentcontext.TenderAmount !== null && currentcontext.TenderAmount > 0 ? currentcontext.TenderAmount : ''}
                placeholder="e.g. 500"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  dispatch('tenderAmtChange', { value: val });
                }}
                className="tender-cash-input"
              />
            </div>

            <div className="tender-return-row">
              <span className="tender-return-label">
                Change to Return:
              </span>
              <span className="tender-return-val">
                {fmtCur(computedReturnAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM FLOATING ACTION BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bottom-floating-bar">

        {Boolean(privileges.canAddToCredit_Button && flags.canShowAddCredit) && (
          <button
            type="button"
            className="toolbar-btn"
            style={{ color: '#d97706', borderColor: '#fcd34d' }}
            onClick={() => dispatch('addCreditBill')}
          >
            💳 Add to Credit
          </button>
        )}

        {Boolean(flags.isUPIPay && (currentcontext.PaymentTypeId === 11 || currentcontext.PaymentTypeId === 5)) && (
          <>
            <button
              type="button"
              className="toolbar-btn primary"
              onClick={() => dispatch('paymentconfirm')}
            >
              ⚡ Pay UPI
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => dispatch('paymentconfirmQR')}
            >
              📱 Show QR
            </button>
          </>
        )}

        {flags.canShowSaveBtn && !isBillLocked && (
          <button
            type="button"
            className="secondary-draft-btn"
            id="btnSaveDraft"
            onClick={handleTriggerSaveDraft}
          >
            💾 Save Draft (F2)
          </button>
        )}

        {flags.canShowSaveapproveBtn && !isBillLocked && (
          <button
            type="button"
            className="primary-save-btn"
            id="btnSaveAndApprove"
            onClick={handleTriggerSaveAndApprove}
          >
            ✓ Save & Approve (F4)
          </button>
        )}

        <button
          type="button"
          className="toolbar-btn"
          onClick={() => dispatch('print')}
        >
          🖨️ Print (Alt+P)
        </button>
      </div>


    </div>
  );
};
