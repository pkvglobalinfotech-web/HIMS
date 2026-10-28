import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';

export interface BillItem {
  Id?: number;
  ServiceId?: number;
  ServiceCode?: string;
  ServiceName?: string;
  TestId?: number;
  TestCode?: string;
  TestName?: string;
  Quantity: number;
  Rate: number;
  Amount: number;
  DiscountAmount?: number;
  DiscountPercentage?: number;
  ProportionateDiscount?: number;
  GSTAmount?: number;
  TaxCode?: string;
  NetAmount: number;
  DoctorShare?: number;
  Status?: number; // 1: Active, 2: Cancelled
  IsPackage?: boolean;
  RdoServiceId?: boolean;
  SelectedItem?: any;
  [key: string]: any;
}

export interface PaymentReceipt {
  ReceiptType?: string;
  ReceiptNumber?: string;
  ReceiptDateTime?: string;
  AmountPaid?: number;
  PaymentInfo?: string;
  [key: string]: any;
}

export interface EmergencyPatient {
  Id?: number;
  PatientId?: number;
  MRN?: string;
  FirstName?: string;
  LastName?: string;
  Age?: number | string;
  Gender?: { Id?: number; Description?: string; Code?: string };
  Title?: { Id?: number; Description?: string };
  Referrer?: { ReferralName?: string };
  VisitIdentifier?: string;
  TriageLevel?: string;
  EncounterId?: number;
  [key: string]: any;
}

export interface AeBillingProps {
  reactProps?: {
    item?: Record<string, any>;
    selectedPatient?: EmergencyPatient;
    PatientBillDetails?: BillItem[];
    currentcontext?: Record<string, any>;
    currentfilter?: Record<string, any>;
    lookup?: {
      Doctor?: Array<{ Id: number; Text: string; DepartmentId?: number; [key: string]: any }>;
      GuarantorType?: Array<{ Id: number; Text: string }>;
      Guarantor?: Array<{ Id: number; Text: string }>;
      ServiceRateCategory?: Array<{ Id: number; Text: string }>;
      DiscountMode?: Array<{ Id: number; Text: string }>;
      DiscountApprover?: Array<{ Id: number; Text: string }>;
      PaymentType?: Array<{ Id: number; Text: string }>;
      Bank?: Array<{ Id: number; Text: string }>;
      CardType?: Array<{ Id: number; Text: string }>;
      Terminal?: Array<{ Id: number; Text: string }>;
      PrivateDueApprover?: Array<{ Id: number; Text: string }>;
      PatientType?: Array<{ Id: number; Text: string }>;
    };
    PaymentInfoDetails?: PaymentReceipt[];
    canShowSaveBtn?: boolean;
    canShowSaveapproveBtn?: boolean;
    canShowCancelBtn?: boolean;
    CanDelete?: boolean;
    HidePrintBtn?: boolean;
    Context?: string;
    PatientPendingOrdersCount?: number;
    PendingBillsCount?: number;
    ShowVAT?: boolean;
  };
  onAction?: (action: string, payload?: any) => void;
}

// Emergency service presets for rapid one-click cashiering in trauma situations
const QUICK_EMERGENCY_PRESETS = [
  { code: 'AE-01', name: 'Emergency Consultation & Primary Triage', rate: 120, qty: 1 },
  { code: 'AE-TR02', name: 'Trauma Resuscitation & Stabilization Protocol', rate: 450, qty: 1 },
  { code: 'AE-IV05', name: 'Stat IV Access, Cannulation & Infusion Set', rate: 45, qty: 1 },
  { code: 'AE-ECG', name: 'Stat 12-Lead ECG with Urgent Physician Review', rate: 65, qty: 1 },
  { code: 'AE-ABG', name: 'Point-of-Care Arterial Blood Gas & Lytes', rate: 85, qty: 1 },
  { code: 'AE-WND', name: 'Emergency Wound Debridement & Suturing', rate: 180, qty: 1 },
  { code: 'AE-OBS', name: 'A&E Observation Bed Charge (First 6 Hours)', rate: 220, qty: 1 },
];

export const AeBillingScreen: React.FC<AeBillingProps> = ({ reactProps, onAction }) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Fallback standalone states
  const [standalonePatient, setStandalonePatient] = useState<EmergencyPatient>({
    Id: 9201,
    PatientId: 9201,
    MRN: 'EMR-2026-9201',
    FirstName: 'RAMESH',
    LastName: 'KUMAR',
    Age: 34,
    Gender: { Id: 1, Description: 'Male' },
    Title: { Id: 1, Description: 'Mr.' },
    Referrer: { ReferralName: 'Emergency 108 Ambulance / Trauma Call' },
    VisitIdentifier: 'AE-2026-8901',
    TriageLevel: 'Level 1 - Resuscitation',
    EncounterId: 8901,
  });

  const [standaloneItem, setStandaloneItem] = useState<Record<string, any>>({
    BillNumber: 'AE-BL-2026-00482',
    BillDateTime: new Date().toISOString(),
    PatientBillStatus: 'Draft / Unsettled',
    PatientBillStatusId: 1,
    GrossAmount: 680,
    TotDiscAmount: 0,
    GSTAmount: 0,
    Received: 0,
    TotalAvailableAmount: 0,
    Comments: 'Emergency stabilization & initial trauma intake charges.',
    IsMultiplePayment: false,
    DoctorId: 101,
    BankId: 1,
    CardTypeId: 1,
    TerminalNoId: 1,
    CardNumber: '',
    AuthorizeNumber: '',
    UPIRefNumber: '',
    ChequeNo: '',
    WireTransferId: '',
    PatientPendingOrdersCount: 2,
    PendingBillsCount: 1,
  });

  const [standaloneContext, setStandaloneContext] = useState<Record<string, any>>({
    TotNetAmount: 680,
    TotBalanceAmt: 680,
    PaidAmt: 0,
    ReceiptAmt: 680,
    RefundAmount: 0,
    TenderAmount: 700,
    ReturnAmount: 20,
    PaymentTypeId: 1, // 1: Cash, 2: Cheque, 3: DD, 4: Wire, 5: Credit Card, 6: Debit Card, 7: Advance, 11: UPI
    BillDiscount: 0,
    DiscountApprovedBy: '',
  });

  const [standaloneFilter, setStandaloneFilter] = useState<Record<string, any>>({
    PatientId: 9201,
    GuarantorTypeId: 1, // 1: Self/Private, 2: Corporate, 3: Insurance
    GuarantorId: 1,
    ServiceRateCategoryId: 1, // 1: Standard
    DiscountModeId: 1, // 1: Flat, 2: %
    DoctorId: 101,
  });

  const [standaloneBillDetails, setStandaloneBillDetails] = useState<BillItem[]>([
    {
      Id: 1,
      ServiceId: 101,
      ServiceCode: 'AE-01',
      ServiceName: 'Emergency Consultation & Primary Triage',
      Quantity: 1,
      Rate: 120,
      Amount: 120,
      DiscountAmount: 0,
      GSTAmount: 0,
      NetAmount: 120,
      DoctorShare: 40,
      Status: 1,
    },
    {
      Id: 2,
      ServiceId: 102,
      ServiceCode: 'AE-TR02',
      ServiceName: 'Trauma Resuscitation & Stabilization Protocol',
      Quantity: 1,
      Rate: 450,
      Amount: 450,
      DiscountAmount: 0,
      GSTAmount: 0,
      NetAmount: 450,
      DoctorShare: 150,
      Status: 1,
    },
    {
      Id: 3,
      ServiceId: 103,
      ServiceCode: 'AE-ECG',
      ServiceName: 'Stat 12-Lead ECG with Urgent Physician Review',
      Quantity: 1,
      Rate: 65,
      Amount: 65,
      DiscountAmount: 0,
      GSTAmount: 0,
      NetAmount: 65,
      DoctorShare: 20,
      Status: 1,
    },
    {
      Id: 4,
      ServiceId: 104,
      ServiceCode: 'AE-IV05',
      ServiceName: 'Stat IV Access, Cannulation & Infusion Set',
      Quantity: 1,
      Rate: 45,
      Amount: 45,
      DiscountAmount: 0,
      GSTAmount: 0,
      NetAmount: 45,
      DoctorShare: 10,
      Status: 1,
    },
  ]);

  const [standaloneReceipts, setStandaloneReceipts] = useState<PaymentReceipt[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [serviceFilterTerm, setServiceFilterTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active state selectors (hybrid vs standalone)
  const patient = isHybrid && reactProps?.selectedPatient ? reactProps.selectedPatient : standalonePatient;
  const item = isHybrid && reactProps?.item ? reactProps.item : standaloneItem;
  const currentcontext = isHybrid && reactProps?.currentcontext ? reactProps.currentcontext : standaloneContext;
  const currentfilter = isHybrid && reactProps?.currentfilter ? reactProps.currentfilter : standaloneFilter;
  const billDetails = isHybrid && reactProps?.PatientBillDetails ? reactProps.PatientBillDetails : standaloneBillDetails;
  const receipts = isHybrid && reactProps?.PaymentInfoDetails ? reactProps.PaymentInfoDetails : standaloneReceipts;

  const lookups = useMemo(() => {
    return {
      Doctor: reactProps?.lookup?.Doctor || [
        { Id: 101, Text: 'Dr. ANIL VERMA (Emergency Medicine)' },
        { Id: 102, Text: 'Dr. PRIYA SHARMA (Trauma & Critical Care)' },
        { Id: 103, Text: 'Dr. RAJESH IYER (General Surgery)' },
        { Id: 104, Text: 'Dr. KAVITHA REDDY (Cardiology Stat)' },
      ],
      GuarantorType: reactProps?.lookup?.GuarantorType || [
        { Id: 1, Text: 'Self / Private Cash Paying' },
        { Id: 2, Text: 'Corporate Guarantee / Empanelled' },
        { Id: 3, Text: 'TPA / Health Insurance' },
        { Id: 6, Text: 'Government / Emergency Free Care' },
      ],
      Guarantor: reactProps?.lookup?.Guarantor || [
        { Id: 1, Text: 'Self / Direct Patient' },
        { Id: 2, Text: 'Star Health Insurance TPA' },
        { Id: 3, Text: 'HDFC ERGO General Insurance' },
        { Id: 4, Text: 'Medi Assist TPA Services' },
        { Id: 5, Text: 'Indian Oil Corp Ltd (IOCL)' },
      ],
      ServiceRateCategory: reactProps?.lookup?.ServiceRateCategory || [
        { Id: 1, Text: 'Standard Emergency Tariff' },
        { Id: 2, Text: 'Night & Emergency Holiday Tariff' },
        { Id: 3, Text: 'Corporate Preferred Tariff' },
      ],
      DiscountMode: reactProps?.lookup?.DiscountMode || [
        { Id: 1, Text: 'Flat Amount (Currency)' },
        { Id: 2, Text: 'Percentage (%)' },
      ],
      DiscountApprover: reactProps?.lookup?.DiscountApprover || [
        { Id: 1, Text: 'Dr. SURESH NAIR (Medical Superintendent)' },
        { Id: 2, Text: 'MR. VIKRAM MEHTA (Chief Financial Officer)' },
        { Id: 3, Text: 'A&E Senior Consultant on Duty' },
      ],
      PaymentType: reactProps?.lookup?.PaymentType || [
        { Id: 1, Text: 'Cash' },
        { Id: 5, Text: 'Credit Card' },
        { Id: 6, Text: 'Debit Card' },
        { Id: 11, Text: 'UPI / QR Payment' },
        { Id: 2, Text: 'Cheque' },
        { Id: 4, Text: 'Wire / NEFT / RTGS' },
        { Id: 7, Text: 'Adjust Against Advance' },
      ],
      Bank: reactProps?.lookup?.Bank || [
        { Id: 1, Text: 'HDFC Bank' },
        { Id: 2, Text: 'State Bank of India (SBI)' },
        { Id: 3, Text: 'ICICI Bank' },
        { Id: 4, Text: 'Axis Bank' },
      ],
      CardType: reactProps?.lookup?.CardType || [
        { Id: 1, Text: 'Visa' },
        { Id: 2, Text: 'Mastercard' },
        { Id: 3, Text: 'RuPay' },
        { Id: 4, Text: 'American Express' },
      ],
      Terminal: reactProps?.lookup?.Terminal || [
        { Id: 1, Text: 'POS-01 (A&E Triage Counter)' },
        { Id: 2, Text: 'POS-02 (Emergency Cashier Desk)' },
        { Id: 3, Text: 'POS-03 (Mobile Card Swiper)' },
      ],
      PrivateDueApprover: reactProps?.lookup?.PrivateDueApprover || [
        { Id: 1, Text: 'Dr. ANIL VERMA (A&E Head)' },
        { Id: 2, Text: 'Finance Duty Officer' },
      ],
    };
  }, [reactProps?.lookup]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    } else {
      showToast(`Action dispatched: ${action}`);
      if (action === 'addNewBill') {
        setStandaloneBillDetails([]);
        setStandaloneContext((prev) => ({ ...prev, TotNetAmount: 0, TotBalanceAmt: 0, ReceiptAmt: 0 }));
        setStandaloneItem((prev) => ({ ...prev, GrossAmount: 0, TotDiscAmount: 0, GSTAmount: 0 }));
      } else if (action === 'saveAndApprove' || action === 'saveDraft') {
        setIsSaving(true);
        setTimeout(() => {
          setIsSaving(false);
          showToast(action === 'saveAndApprove' ? 'A&E Bill Approved & Receipt Generated!' : 'Draft Saved Successfully!');
        }, 600);
      }
    }
  };

  // Keyboard shortcut binding: Alt+A (Approve), Alt+S (Save), Alt+P (Print), F7 (Add New)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        dispatch('saveAndApprove');
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        dispatch('saveDraft');
      } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        dispatch('print', { withHeader: true });
      } else if (e.key === 'F7') {
        e.preventDefault();
        dispatch('addNewBill');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAction]);

  // Recalculate totals in standalone mode
  const recalculateStandalone = (items: BillItem[], discountVal: number = currentcontext.BillDiscount || 0) => {
    let gross = 0;
    let disc = 0;
    let tax = 0;

    items.forEach((it) => {
      if (it.Status !== 2) {
        const itemGross = Number(it.Quantity || 0) * Number(it.Rate || 0);
        let itemDisc = Number(it.DiscountAmount || 0);
        if (currentfilter.DiscountModeId === 2) {
          itemDisc = (itemDisc / 100) * itemGross;
        }
        const itemTax = Number(it.GSTAmount || 0);
        const itemNet = itemGross - itemDisc + itemTax;

        gross += itemGross;
        disc += itemDisc;
        tax += itemTax;
        it.Amount = itemGross;
        it.NetAmount = itemNet;
      }
    });

    const net = Math.max(0, gross - disc - discountVal + tax);
    const received = Number(currentcontext.ReceiptAmt || 0);
    const balance = Math.max(0, net - received);
    const tender = Number(currentcontext.TenderAmount || 0);
    const ret = Math.max(0, tender - received);

    setStandaloneItem((prev) => ({
      ...prev,
      GrossAmount: gross,
      TotDiscAmount: disc + discountVal,
      GSTAmount: tax,
    }));

    setStandaloneContext((prev) => ({
      ...prev,
      TotNetAmount: net,
      TotBalanceAmt: balance,
      ReturnAmount: ret,
    }));
  };

  // Service item updates
  const handleItemChange = (index: number, field: keyof BillItem, val: any) => {
    if (isHybrid) {
      dispatch('updateBillItem', { index, field, value: val });
    } else {
      const updated = [...billDetails];
      const target = { ...updated[index], [field]: val };
      if (field === 'Quantity' || field === 'Rate' || field === 'DiscountAmount') {
        const q = Number(field === 'Quantity' ? val : target.Quantity || 0);
        const r = Number(field === 'Rate' ? val : target.Rate || 0);
        const d = Number(field === 'DiscountAmount' ? val : target.DiscountAmount || 0);
        target.Amount = q * r;
        target.NetAmount = Math.max(0, target.Amount - d);
      }
      updated[index] = target;
      setStandaloneBillDetails(updated);
      recalculateStandalone(updated);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (isHybrid) {
      dispatch('removeBillItem', { index });
    } else {
      const updated = billDetails.filter((_, idx) => idx !== index);
      setStandaloneBillDetails(updated);
      recalculateStandalone(updated);
      showToast('Line item removed');
    }
  };

  const handleAddBlankRow = () => {
    const newItem: BillItem = {
      Id: Date.now(),
      ServiceId: -1,
      ServiceCode: '',
      ServiceName: '',
      Quantity: 1,
      Rate: 0,
      Amount: 0,
      DiscountAmount: 0,
      GSTAmount: 0,
      NetAmount: 0,
      DoctorShare: 0,
      Status: 1,
    };
    if (isHybrid) {
      dispatch('addBillItem', { item: newItem });
    } else {
      const updated = [...billDetails, newItem];
      setStandaloneBillDetails(updated);
      showToast('Blank service row added');
    }
  };

  const handleQuickAddPreset = (preset: (typeof QUICK_EMERGENCY_PRESETS)[0]) => {
    const newItem: BillItem = {
      Id: Date.now(),
      ServiceId: Math.floor(Math.random() * 900) + 100,
      ServiceCode: preset.code,
      ServiceName: preset.name,
      Quantity: preset.qty,
      Rate: preset.rate,
      Amount: preset.qty * preset.rate,
      DiscountAmount: 0,
      GSTAmount: 0,
      NetAmount: preset.qty * preset.rate,
      DoctorShare: Math.round(preset.rate * 0.3),
      Status: 1,
    };
    if (isHybrid) {
      dispatch('addBillItem', { item: newItem });
    } else {
      const updated = [...billDetails, newItem];
      setStandaloneBillDetails(updated);
      recalculateStandalone(updated);
      showToast(`Added: ${preset.name}`);
    }
  };

  const toSelectValue = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val);
  };

  const activeServices = useMemo(() => {
    if (!serviceFilterTerm.trim()) return billDetails;
    return billDetails.filter(
      (b) =>
        b.ServiceName?.toLowerCase().includes(serviceFilterTerm.toLowerCase()) ||
        b.ServiceCode?.toLowerCase().includes(serviceFilterTerm.toLowerCase())
    );
  }, [billDetails, serviceFilterTerm]);

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: typography.fontFamily.sans,
        color: '#0f172a',
        padding: '16px 24px 90px 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: radii.md,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            borderLeft: '4px solid #10b981',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: 16 }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HERO HEADER & QUICK ACTION BAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: '16px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        {/* Left: Module Title & Emergency Siren Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.lg,
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            <i className="fas fa-file-invoice-dollar" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontSize: '19px',
                  fontWeight: 800,
                  margin: 0,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                Accident & Emergency Billing & Cashier Desk
              </h1>
              <span
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    display: 'inline-block',
                  }}
                />
                24/7 Trauma Cashier
              </span>
              {item.BillNumber && (
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: radii.md,
                    border: '1px solid #bfdbfe',
                  }}
                >
                  Bill #{item.BillNumber}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Real-time point-of-sale invoicing, stat order capture, insurance authorization & settlement
            </p>
          </div>
        </div>

        {/* Right: Quick Action Hub & Alt+A Header Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            id="btnAddNewBill"
            onClick={() => dispatch('addNewBill')}
            title="Create fresh bill (F7)"
            style={{
              height: 36,
              padding: '0 13px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: radii.md,
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-plus-circle" style={{ color: '#2563eb' }} />
            <span>New Bill (F7)</span>
          </button>

          <button
            type="button"
            id="btnFindBill"
            onClick={() => dispatch('findBill')}
            title="Search previous bills"
            style={{
              height: 36,
              padding: '0 13px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: radii.md,
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-search" style={{ color: '#475569' }} />
            <span>Find Bill</span>
          </button>

          <button
            type="button"
            id="btnOutstanding"
            onClick={() => dispatch('outstandingBill')}
            title="View outstanding balance bills"
            style={{
              height: 36,
              padding: '0 13px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: radii.md,
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-exclamation-triangle" style={{ color: '#d97706' }} />
            <span>Outstandings</span>
          </button>

          <button
            type="button"
            id="btnPendingOrders"
            onClick={() => dispatch('pendingOrder')}
            title="Clinical orders awaiting billing"
            style={{
              height: 36,
              padding: '0 13px',
              backgroundColor: '#ede9fe',
              border: '1px solid #ddd6fe',
              borderRadius: radii.md,
              color: '#5b21b6',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-clipboard-list" style={{ color: '#7c3aed' }} />
            <span>Orders ({item.PatientPendingOrdersCount || 0})</span>
          </button>

          {/* Top Header Direct Approve CTA */}
          <button
            type="button"
            id="btnSaveApproveTop"
            onClick={() => dispatch('saveAndApprove')}
            disabled={isSaving}
            style={{
              height: 36,
              padding: '0 18px',
              backgroundColor: '#16a34a',
              border: '1px solid #15803d',
              borderRadius: radii.md,
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-check-double" />
            <span>{isSaving ? 'Processing...' : 'Approve (Alt+A)'}</span>
          </button>
        </div>
      </div>

      {/* PATIENT EMERGENCY DEMOGRAPHICS & SPONSOR CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.3fr) minmax(320px, 1.7fr)',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Card 1: Patient Identity & Emergency Triage Info */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.xl,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-user-injured" style={{ color: '#ef4444', fontSize: 16 }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                Emergency Patient Identification
              </span>
            </div>
            <button
              type="button"
              onClick={() => dispatch('findBill')}
              style={{
                fontSize: '11px',
                color: '#2563eb',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Switch Patient
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                flexShrink: 0,
                border: '2px solid #fca5a5',
              }}
            >
              {(patient.FirstName || 'P').charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {patient.Title?.Description || ''} {patient.FirstName || 'UNKNOWN'} {patient.LastName || ''}
                </span>
                <span
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: radii.sm,
                  }}
                >
                  MRN: {patient.MRN || 'N/A'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '6px 12px',
                  marginTop: 8,
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Age / Sex: </span>
                  <strong style={{ color: '#0f172a' }}>
                    {patient.Age || 'N/A'} Y / {patient.Gender?.Description || patient.Gender?.Code || 'N/A'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Visit / AE #: </span>
                  <strong style={{ color: '#2563eb' }}>{patient.VisitIdentifier || 'AE-CURRENT'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b' }}>Referral Source: </span>
                  <span style={{ color: '#334155' }}>
                    {patient.Referrer?.ReferralName || 'Emergency Ambulance Walk-in'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Triage Severity Indicator Pill */}
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              borderRadius: radii.md,
              border: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#991b1b', fontWeight: 600 }}>
              <i className="fas fa-heartbeat" style={{ marginRight: 6, color: '#dc2626' }} />
              Triage Level: <strong>{patient.TriageLevel || 'Priority 1 - High Acuity'}</strong>
            </span>
            <span
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
              }}
            >
              RED CODE STAT
            </span>
          </div>
        </div>

        {/* Card 2: Clinical Encounter, Attending Doctor & Billing Sponsor */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.xl,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-user-md" style={{ color: '#2563eb', fontSize: 16 }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                Attending Clinician & Billing Category
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Configure Tariff & Sponsor</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* Attending Doctor */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Attending Emergency Physician <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="doctorid"
                value={toSelectValue(item.DoctorId || currentfilter.DoctorId)}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  if (isHybrid) {
                    dispatch('doctorChange', { DoctorId: val });
                  } else {
                    setStandaloneItem((prev) => ({ ...prev, DoctorId: val }));
                    setStandaloneFilter((prev) => ({ ...prev, DoctorId: val }));
                  }
                }}
                style={{
                  width: '100%',
                  height: 35,
                  borderRadius: radii.md,
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  fontWeight: 600,
                }}
              >
                <option value="">-- Select Emergency Doctor --</option>
                {lookups.Doctor?.map((d: any) => (
                  <option key={d.Id} value={String(d.Id)}>
                    {d.Text}
                  </option>
                ))}
              </select>
            </div>

            {/* Payer / Guarantor Type */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Payer Category <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="GuarantorTypeId"
                value={toSelectValue(currentfilter.GuarantorTypeId)}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  if (isHybrid) {
                    dispatch('payerTypeChange', { GuarantorTypeId: val });
                  } else {
                    setStandaloneFilter((prev) => ({ ...prev, GuarantorTypeId: val }));
                  }
                }}
                style={{
                  width: '100%',
                  height: 35,
                  borderRadius: radii.md,
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                {lookups.GuarantorType?.map((gt: any) => (
                  <option key={gt.Id} value={String(gt.Id)}>
                    {gt.Text}
                  </option>
                ))}
              </select>
            </div>

            {/* Guarantor Entity */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Payer / Insurance TPA Name
              </label>
              <select
                id="GuarantorId"
                value={toSelectValue(currentfilter.GuarantorId)}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  if (isHybrid) {
                    dispatch('guarantorChange', { GuarantorId: val });
                  } else {
                    setStandaloneFilter((prev) => ({ ...prev, GuarantorId: val }));
                  }
                }}
                style={{
                  width: '100%',
                  height: 35,
                  borderRadius: radii.md,
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                {lookups.Guarantor?.map((g: any) => (
                  <option key={g.Id} value={String(g.Id)}>
                    {g.Text}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Rate Category */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Emergency Tariff Rate Category
              </label>
              <select
                id="ServiceRateCategoryId"
                value={toSelectValue(currentfilter.ServiceRateCategoryId)}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  if (isHybrid) {
                    dispatch('rateCategoryChange', { ServiceRateCategoryId: val });
                  } else {
                    setStandaloneFilter((prev) => ({ ...prev, ServiceRateCategoryId: val }));
                  }
                }}
                style={{
                  width: '100%',
                  height: 35,
                  borderRadius: radii.md,
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                {lookups.ServiceRateCategory?.map((rc: any) => (
                  <option key={rc.Id} value={String(rc.Id)}>
                    {rc.Text}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* EMERGENCY SERVICE PRESETS BAR (ONE-TOUCH BILLING) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: '12px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 700, color: '#475569' }}>
            <i className="fas fa-bolt" style={{ color: '#eab308' }} />
            <span>High-Frequency Trauma Presets (Click to add directly):</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Stat order entry</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {QUICK_EMERGENCY_PRESETS.map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => handleQuickAddPreset(preset)}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '5px 12px',
                fontSize: '12px',
                color: '#1e293b',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              <span
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                {preset.code}
              </span>
              <span>{preset.name}</span>
              <strong style={{ color: '#059669', marginLeft: 2 }}>${preset.rate}</strong>
              <i className="fas fa-plus" style={{ fontSize: '10px', color: '#64748b' }} />
            </button>
          ))}
        </div>
      </div>

      {/* BILLABLE SERVICES GRID & LINE ITEMS TABLE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Table Header Controls */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              <i className="fas fa-list-ol" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Emergency Services, Investigations & Bed Procedures
            </h3>
            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {billDetails.length} Items
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Filter search in table */}
            <div style={{ position: 'relative' }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 12,
                }}
              />
              <input
                type="text"
                placeholder="Filter services..."
                value={serviceFilterTerm}
                onChange={(e) => setServiceFilterTerm(e.target.value)}
                style={{
                  height: 32,
                  width: 170,
                  paddingLeft: 28,
                  paddingRight: 10,
                  borderRadius: radii.md,
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              id="btnAddItemRow"
              onClick={handleAddBlankRow}
              style={{
                height: 32,
                padding: '0 12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: radii.md,
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-plus" />
              <span>Add Custom Service</span>
            </button>
          </div>
        </div>

        {/* Responsive Table Body */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', width: 40, fontWeight: 700 }}>#</th>
                <th style={{ padding: '10px 14px', minWidth: 260, fontWeight: 700 }}>
                  Service Code & Description <span style={{ color: '#dc2626' }}>*</span>
                </th>
                <th style={{ padding: '10px 14px', width: 85, fontWeight: 700, textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px 14px', width: 110, fontWeight: 700, textAlign: 'right' }}>Rate ($)</th>
                <th style={{ padding: '10px 14px', width: 110, fontWeight: 700, textAlign: 'right' }}>Amount ($)</th>
                <th style={{ padding: '10px 14px', width: 100, fontWeight: 700, textAlign: 'right' }}>Discount</th>
                <th style={{ padding: '10px 14px', width: 120, fontWeight: 700, textAlign: 'right' }}>Net ($)</th>
                <th style={{ padding: '10px 14px', width: 100, fontWeight: 700, textAlign: 'right' }}>Dr. Share</th>
                <th style={{ padding: '10px 14px', width: 60, textAlign: 'center', fontWeight: 700 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeServices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <i className="fas fa-inbox" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                    No services billed yet. Click on any quick trauma preset above or press "+ Add Custom Service".
                  </td>
                </tr>
              ) : (
                activeServices.map((bi, idx) => {
                  const isCancelled = bi.Status === 2;
                  return (
                    <tr
                      key={bi.Id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isCancelled ? '#fef2f2' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        color: isCancelled ? '#94a3b8' : '#0f172a',
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '12px' }}>{idx + 1}</td>

                      {/* Service Name & Code */}
                      <td style={{ padding: '10px 14px' }}>
                        {bi.ServiceCode && (
                          <span
                            style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              marginRight: 6,
                            }}
                          >
                            {bi.ServiceCode}
                          </span>
                        )}
                        {bi.ServiceName ? (
                          <span style={{ fontWeight: 600 }}>{bi.ServiceName}</span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter service or procedure name..."
                            value={bi.ServiceName || ''}
                            onChange={(e) => handleItemChange(idx, 'ServiceName', e.target.value)}
                            style={{
                              width: '100%',
                              height: 30,
                              borderRadius: radii.sm,
                              border: '1px solid #cbd5e1',
                              padding: '0 8px',
                              fontSize: '12px',
                            }}
                          />
                        )}
                      </td>

                      {/* Quantity */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={1}
                          disabled={bi.RdoServiceId || isCancelled}
                          value={bi.Quantity ?? 1}
                          onChange={(e) => handleItemChange(idx, 'Quantity', Math.max(1, Number(e.target.value)))}
                          style={{
                            width: 65,
                            height: 30,
                            textAlign: 'center',
                            borderRadius: radii.sm,
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        />
                      </td>

                      {/* Rate */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          disabled={bi.RdoServiceId || isCancelled}
                          value={bi.Rate ?? 0}
                          onChange={(e) => handleItemChange(idx, 'Rate', Number(e.target.value))}
                          style={{
                            width: 85,
                            height: 30,
                            textAlign: 'right',
                            borderRadius: radii.sm,
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        />
                      </td>

                      {/* Gross Amount */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        ${Number(bi.Amount || 0).toFixed(2)}
                      </td>

                      {/* Discount Amount */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          disabled={bi.RdoServiceId || isCancelled}
                          value={bi.DiscountAmount ?? 0}
                          onChange={(e) => handleItemChange(idx, 'DiscountAmount', Number(e.target.value))}
                          style={{
                            width: 75,
                            height: 30,
                            textAlign: 'right',
                            borderRadius: radii.sm,
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                          }}
                        />
                      </td>

                      {/* Net Amount */}
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#059669',
                          fontSize: '14px',
                        }}
                      >
                        ${Number(bi.NetAmount || bi.Amount || 0).toFixed(2)}
                      </td>

                      {/* Doctor Share */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.01"
                          disabled={bi.RdoServiceId || isCancelled}
                          value={bi.DoctorShare ?? 0}
                          onChange={(e) => handleItemChange(idx, 'DoctorShare', Number(e.target.value))}
                          style={{
                            width: 70,
                            height: 30,
                            textAlign: 'right',
                            borderRadius: radii.sm,
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                          }}
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: radii.sm,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                          }}
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SETTLEMENT CONSOLE: 3-COLUMN FINANCIAL & PAYMENT PANEL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.4fr) minmax(300px, 1.1fr)',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Column 1: Billing Notes, Discounts & Multiple Pay Toggle */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.xl,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <i className="fas fa-percent" style={{ color: '#8b5cf6', fontSize: 16 }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>Discounts & Clinical Remarks</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 12 }}>
              {/* Discount Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Discount Mode
                </label>
                <select
                  id="DiscountModeId"
                  value={toSelectValue(currentfilter.DiscountModeId)}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    if (isHybrid) {
                      dispatch('discountModeChange', { DiscountModeId: val });
                    } else {
                      setStandaloneFilter((prev) => ({ ...prev, DiscountModeId: val }));
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 35,
                    borderRadius: radii.md,
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    fontSize: '12px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {lookups.DiscountMode?.map((dm: any) => (
                    <option key={dm.Id} value={String(dm.Id)}>
                      {dm.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bill Discount Value */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Header Discount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentcontext.BillDiscount || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isHybrid) {
                      dispatch('fieldChange', { contextField: 'BillDiscount', value: val });
                    } else {
                      setStandaloneContext((prev) => ({ ...prev, BillDiscount: val }));
                      recalculateStandalone(billDetails, val);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 35,
                    borderRadius: radii.md,
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Discount Approver if discount > 0 */}
            {(Number(item.TotDiscAmount) > 0 || Number(currentcontext.BillDiscount) > 0) && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Discount Authorized By <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={toSelectValue(currentcontext.DiscountApprovedBy)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isHybrid) {
                      dispatch('fieldChange', { contextField: 'DiscountApprovedBy', value: val });
                    } else {
                      setStandaloneContext((prev) => ({ ...prev, DiscountApprovedBy: val }));
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 35,
                    borderRadius: radii.md,
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    fontSize: '12px',
                    backgroundColor: '#fffbeb',
                    borderColor: '#fde68a',
                  }}
                >
                  <option value="">-- Select Authorizing Medical Admin --</option>
                  {lookups.DiscountApprover?.map((da: any) => (
                    <option key={da.Id} value={String(da.Id)}>
                      {da.Text}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Multiple Payment Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(item.IsMultiplePayment)}
                onChange={(e) => {
                  const val = e.target.checked;
                  if (isHybrid) {
                    dispatch('fieldChange', { field: 'IsMultiplePayment', value: val });
                  } else {
                    setStandaloneItem((prev) => ({ ...prev, IsMultiplePayment: val }));
                  }
                }}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span>Enable Split / Multiple Tender Payments</span>
            </label>
          </div>

          {/* Remarks textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Cashier & Clinical Billing Remarks
            </label>
            <textarea
              rows={2}
              value={item.Comments || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (isHybrid) {
                  dispatch('fieldChange', { field: 'Comments', value: val });
                } else {
                  setStandaloneItem((prev) => ({ ...prev, Comments: val }));
                }
              }}
              placeholder="e.g. Medico-legal police documentation attached, emergency discount authorized."
              style={{
                width: '100%',
                borderRadius: radii.md,
                border: '1px solid #cbd5e1',
                padding: '8px',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Column 2: Payment Method & Dynamic Tender Details */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.xl,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-credit-card" style={{ color: '#0284c7', fontSize: 16 }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>Payment Mode & Settlement</span>
            </div>
            {currentcontext.PaymentTypeId === 7 && (
              <button
                type="button"
                onClick={() => dispatch('adjustAgainstAdvance')}
                style={{
                  fontSize: '11px',
                  color: '#2563eb',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Pick Advance Voucher
              </button>
            )}
          </div>

          {/* Mode Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Payment Method <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="paymenttype"
              value={toSelectValue(currentcontext.PaymentTypeId)}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : 1;
                if (isHybrid) {
                  dispatch('paymentTypeChange', { PaymentTypeId: val });
                } else {
                  setStandaloneContext((prev) => ({ ...prev, PaymentTypeId: val }));
                }
              }}
              style={{
                width: '100%',
                height: 38,
                borderRadius: radii.md,
                border: '1px solid #cbd5e1',
                padding: '0 10px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              {lookups.PaymentType?.map((pt: any) => (
                <option key={pt.Id} value={String(pt.Id)}>
                  {pt.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Received Amount Input */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Receipt / Collected Amount ($) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="number"
              id="receivedamt"
              step="0.01"
              value={currentcontext.ReceiptAmt ?? currentcontext.TotNetAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isHybrid) {
                  dispatch('fieldChange', { contextField: 'ReceiptAmt', value: val });
                } else {
                  const bal = Math.max(0, currentcontext.TotNetAmount - val);
                  setStandaloneContext((prev) => ({
                    ...prev,
                    ReceiptAmt: val,
                    TotBalanceAmt: bal,
                  }));
                }
              }}
              style={{
                width: '100%',
                height: 38,
                borderRadius: radii.md,
                border: '2px solid #2563eb',
                padding: '0 10px',
                fontSize: '15px',
                fontWeight: 800,
                color: '#1d4ed8',
                backgroundColor: '#eff6ff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Dynamic Inputs based on Payment Mode */}
          {/* Card fields */}
          {(currentcontext.PaymentTypeId === 5 || currentcontext.PaymentTypeId === 6) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                  Card Brand
                </label>
                <select
                  value={toSelectValue(item.CardTypeId)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isHybrid) dispatch('fieldChange', { field: 'CardTypeId', value: val });
                    else setStandaloneItem((prev) => ({ ...prev, CardTypeId: val }));
                  }}
                  style={{ width: '100%', height: 32, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '11px' }}
                >
                  {lookups.CardType?.map((c: any) => (
                    <option key={c.Id} value={String(c.Id)}>
                      {c.Text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="4242"
                  value={item.CardNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isHybrid) dispatch('fieldChange', { field: 'CardNumber', value: val });
                    else setStandaloneItem((prev) => ({ ...prev, CardNumber: val }));
                  }}
                  style={{ width: '100%', height: 32, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '12px', padding: '0 6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                  Auth Code
                </label>
                <input
                  type="text"
                  placeholder="AUTH#"
                  value={item.AuthorizeNumber || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isHybrid) dispatch('fieldChange', { field: 'AuthorizeNumber', value: val });
                    else setStandaloneItem((prev) => ({ ...prev, AuthorizeNumber: val }));
                  }}
                  style={{ width: '100%', height: 32, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '12px', padding: '0 6px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* UPI Reference field */}
          {currentcontext.PaymentTypeId === 11 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                UPI / QR Reference Number (UTR) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 329048190248"
                value={item.UPIRefNumber || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isHybrid) dispatch('fieldChange', { field: 'UPIRefNumber', value: val });
                  else setStandaloneItem((prev) => ({ ...prev, UPIRefNumber: val }));
                }}
                style={{ width: '100%', height: 34, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '12px', padding: '0 8px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Bank Wire / NEFT */}
          {currentcontext.PaymentTypeId === 4 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                Wire Transfer Reference ID <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Bank Transaction Ref"
                value={item.WireTransferId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isHybrid) dispatch('fieldChange', { field: 'WireTransferId', value: val });
                  else setStandaloneItem((prev) => ({ ...prev, WireTransferId: val }));
                }}
                style={{ width: '100%', height: 34, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '12px', padding: '0 8px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Cheque / DD Fields */}
          {(currentcontext.PaymentTypeId === 2 || currentcontext.PaymentTypeId === 3) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                  Cheque / DD Number
                </label>
                <input
                  type="text"
                  placeholder="000123"
                  value={item.ChequeNo || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isHybrid) dispatch('fieldChange', { field: 'ChequeNo', value: val });
                    else setStandaloneItem((prev) => ({ ...prev, ChequeNo: val }));
                  }}
                  style={{ width: '100%', height: 32, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '12px', padding: '0 6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                  Issuing Bank
                </label>
                <select
                  value={toSelectValue(item.BankId)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isHybrid) dispatch('fieldChange', { field: 'BankId', value: val });
                    else setStandaloneItem((prev) => ({ ...prev, BankId: val }));
                  }}
                  style={{ width: '100%', height: 32, borderRadius: radii.sm, border: '1px solid #cbd5e1', fontSize: '11px' }}
                >
                  {lookups.Bank?.map((b: any) => (
                    <option key={b.Id} value={String(b.Id)}>
                      {b.Text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Cash Tender & Return Calculator */}
          {currentcontext.PaymentTypeId === 1 && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: radii.md,
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                  Tender Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentcontext.TenderAmount || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isHybrid) {
                      dispatch('fieldChange', { contextField: 'TenderAmount', value: val });
                    } else {
                      const ret = Math.max(0, val - Number(currentcontext.ReceiptAmt || 0));
                      setStandaloneContext((prev) => ({ ...prev, TenderAmount: val, ReturnAmount: ret }));
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 32,
                    borderRadius: radii.sm,
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '0 8px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                  Return Change ($)
                </label>
                <div
                  style={{
                    height: 32,
                    borderRadius: radii.sm,
                    backgroundColor: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#15803d',
                  }}
                >
                  ${Number(currentcontext.ReturnAmount || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Invoicing Totals & Summary Breakdown Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.xl,
            padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <i className="fas fa-calculator" style={{ color: '#059669', fontSize: 16 }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>Invoicing Financial Summary</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Available Advance / Deposits:</span>
                <strong style={{ color: '#0f172a' }}>
                  ${Number(item.TotalAvailableAmount || 0).toFixed(2)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Gross Service Total:</span>
                <strong style={{ color: '#0f172a' }}>
                  ${Number(item.GrossAmount || 0).toFixed(2)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Total Discount Concession:</span>
                <strong style={{ color: '#dc2626' }}>
                  -${Number(item.TotDiscAmount || 0).toFixed(2)}
                </strong>
              </div>

              {reactProps?.ShowVAT && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Tax / GST:</span>
                  <strong style={{ color: '#0f172a' }}>
                    +${Number(item.GSTAmount || 0).toFixed(2)}
                  </strong>
                </div>
              )}

              {/* Net Payable Highlight Box */}
              <div
                style={{
                  marginTop: 6,
                  padding: '12px 14px',
                  borderRadius: radii.lg,
                  background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                    Net Payable Amount
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em' }}>
                    ${Number(currentcontext.TotNetAmount || 0).toFixed(2)}
                  </div>
                </div>
                <i className="fas fa-receipt" style={{ fontSize: 26, opacity: 0.5 }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px dashed #e2e8f0',
                  color: '#475569',
                }}
              >
                <span>Paid / Collected:</span>
                <strong style={{ color: '#16a34a' }}>
                  ${Number(currentcontext.ReceiptAmt || 0).toFixed(2)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Outstanding Balance Due:</span>
                <strong
                  style={{
                    color: Number(currentcontext.TotBalanceAmt || 0) > 0 ? '#dc2626' : '#16a34a',
                    fontWeight: 800,
                  }}
                >
                  ${Number(currentcontext.TotBalanceAmt || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          {/* Due Credit Approver if Balance > 0 */}
          {Number(currentcontext.TotBalanceAmt) > 0 && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#dc2626', marginBottom: 3 }}>
                Credit Due Authorized By:
              </label>
              <select
                id="creditapprover"
                value={toSelectValue(currentcontext.CreditApprovedBy)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isHybrid) {
                    dispatch('fieldChange', { contextField: 'CreditApprovedBy', value: val });
                  } else {
                    setStandaloneContext((prev) => ({ ...prev, CreditApprovedBy: val }));
                  }
                }}
                style={{
                  width: '100%',
                  height: 32,
                  borderRadius: radii.sm,
                  border: '1px solid #fca5a5',
                  backgroundColor: '#fef2f2',
                  fontSize: '11px',
                  color: '#991b1b',
                  fontWeight: 600,
                }}
              >
                <option value="">-- Credit Due Approver --</option>
                {lookups.PrivateDueApprover?.map((p: any) => (
                  <option key={p.Id} value={String(p.Id)}>
                    {p.Text}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT RECEIPTS STREAM (IF RECORDED) */}
      {receipts && receipts.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.xl,
            padding: '14px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <i className="fas fa-file-invoice" style={{ color: '#0369a1', fontSize: 14 }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
              Issued Payment Receipts Stream
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {receipts.map((r, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: radii.md,
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 700, color: '#166534' }}>
                  {r.ReceiptType || 'Receipt'} #{r.ReceiptNumber}
                </span>
                <span style={{ color: '#64748b' }}>•</span>
                <span style={{ color: '#15803d', fontWeight: 800 }}>${Number(r.AmountPaid || 0).toFixed(2)}</span>
                <span style={{ color: '#64748b' }}>•</span>
                <span style={{ color: '#475569' }}>{r.PaymentInfo || 'Cash'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROMINENT FIXED BOTTOM ACTION BAR */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1050,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 24px',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Side: Print & Void Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            id="btnPrintHeader"
            onClick={() => dispatch('print', { withHeader: true })}
            style={{
              height: 38,
              padding: '0 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: radii.md,
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-print" style={{ color: '#64748b' }} />
            <span>Print Invoice (Alt+P)</span>
          </button>

          <button
            type="button"
            id="btnPrintNoHeader"
            onClick={() => dispatch('printWithoutHeader')}
            style={{
              height: 38,
              padding: '0 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: radii.md,
              color: '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Pre-Printed Stationery</span>
          </button>

          {reactProps?.CanDelete && (
            <button
              type="button"
              id="btnDeleteBill"
              onClick={() => dispatch('deleteBill')}
              style={{
                height: 38,
                padding: '0 14px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: radii.md,
                color: '#b91c1c',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-trash-alt" />
              <span>Delete</span>
            </button>
          )}

          {reactProps?.canShowCancelBtn && (
            <button
              type="button"
              id="btnCancelBill"
              onClick={() => dispatch('saveCancelled')}
              style={{
                height: 38,
                padding: '0 14px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: radii.md,
                color: '#b91c1c',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-ban" />
              <span>Cancel / Void</span>
            </button>
          )}
        </div>

        {/* Right Side: Save Draft & Primary Approve Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Hidden alias buttons for legacy jQuery selectors */}
          <button
            type="button"
            id="btnsubmit"
            onClick={() => dispatch('saveDraft')}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <button
            type="button"
            id="saveAndApproveid"
            onClick={() => dispatch('saveAndApprove')}
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          <button
            type="button"
            id="btnSaveDraft"
            name="btnSaveDraft"
            onClick={() => dispatch('saveDraft')}
            style={{
              height: 40,
              padding: '0 20px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: radii.md,
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-save" style={{ color: '#64748b' }} />
            <span>Save Draft (Alt+S)</span>
          </button>

          {/* Primary Save & Approve CTA */}
          <button
            type="button"
            id="btnSaveApprove"
            name="btnSaveApprove"
            data-testid="btnSaveApprove"
            onClick={() => dispatch('saveAndApprove')}
            disabled={isSaving}
            style={{
              height: 42,
              padding: '0 26px',
              backgroundColor: '#16a34a',
              border: '1px solid #15803d',
              borderRadius: radii.md,
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-check-double" style={{ fontSize: 15 }} />
            <span>{isSaving ? 'Processing Approval...' : 'Approve & Activate (Alt+A)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AeBillingScreen;
