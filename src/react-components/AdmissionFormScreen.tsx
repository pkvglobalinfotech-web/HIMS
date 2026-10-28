import React, { useState, useEffect, useMemo, useRef } from 'react';
import { tokens } from '../components/ui/tokens';
import { apiFetch } from './utils/api';

export interface AdmissionFormProps {
  reactProps?: {
    item?: any;
    lookup?: Record<string, any[]>;
    selectedPatient?: any;
    patientSearchResults?: any[];
    currentcontext?: any;
    Data?: any;
    flags?: {
      SaveCompleted?: boolean;
      BillCompleted?: boolean;
      isPatientDeactivated?: boolean;
      canShowSaveBtn?: boolean;
      canShowSaveandApproveBtn?: boolean;
      canphysicaldischargeBtn?: boolean;
      canShowCancelledBtn?: boolean;
      canbedoccupancyBtn?: boolean;
      canhistoryBtn?: boolean;
      canprintBtn?: boolean;
      DisRateType?: boolean;
      ShowAdmissionDate?: boolean;
    };
  };
  onAction?: (action: string, payload?: any) => void;
}

interface FormSelectProps {
  label?: string;
  required?: boolean;
  value: any;
  onChange: (val: any) => void;
  options: Array<{ value: any; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  actionButton?: {
    icon: string;
    title: string;
    onClick: () => void;
  };
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = '-- Select --',
  disabled,
  id,
  actionButton,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <select
            id={id}
            disabled={disabled}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              height: '38px',
              fontSize: '13px',
              padding: '0 32px 0 12px',
              fontFamily: tokens.typography.fontFamily,
              color: disabled ? '#94a3b8' : '#0f172a',
              backgroundColor: disabled ? '#f8fafc' : '#ffffff',
              border: `1px solid ${focused ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '8px',
              outline: 'none',
              boxShadow: focused ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
              transition: 'all 0.15s ease',
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt, i) => (
              <option key={`${opt.value}-${i}`} value={opt.value != null ? String(opt.value) : ''}>
                {opt.label}
              </option>
            ))}
          </select>
          <i
            className="fa fa-chevron-down"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
        </div>
        {actionButton && (
          <button
            type="button"
            onClick={actionButton.onClick}
            title={actionButton.title}
            style={{
              height: '38px',
              width: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              borderRadius: '8px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
          >
            <i className={actionButton.icon} />
          </button>
        )}
      </div>
    </div>
  );
};

interface FormInputProps {
  label?: string;
  required?: boolean;
  type?: string;
  value: any;
  onChange: (val: any) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  leftIcon?: string;
  maxLength?: number;
  actionButton?: {
    icon: string;
    title: string;
    onClick: () => void;
  };
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  id,
  leftIcon,
  maxLength,
  actionButton,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          {leftIcon && (
            <i
              className={leftIcon}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '13px',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
          )}
          <input
            id={id}
            type={type}
            disabled={disabled}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              height: '38px',
              fontSize: '13px',
              padding: leftIcon ? '0 12px 0 34px' : '0 12px',
              fontFamily: tokens.typography.fontFamily,
              color: disabled ? '#94a3b8' : '#0f172a',
              backgroundColor: disabled ? '#f8fafc' : '#ffffff',
              border: `1px solid ${focused ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '8px',
              outline: 'none',
              boxShadow: focused ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
              cursor: disabled ? 'not-allowed' : 'text',
            }}
          />
        </div>
        {actionButton && (
          <button
            type="button"
            onClick={actionButton.onClick}
            title={actionButton.title}
            style={{
              height: '38px',
              width: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              borderRadius: '8px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
          >
            <i className={actionButton.icon} />
          </button>
        )}
      </div>
    </div>
  );
};

export const AdmissionFormScreen: React.FC<AdmissionFormProps> = ({ reactProps, onAction }) => {
  const isHybrid = Boolean(reactProps);

  // Standalone state fallbacks
  const [standaloneItem, setStandaloneItem] = useState<any>({
    AdmissionDate: new Date().toISOString().slice(0, 16),
    AdmissionTypeId: 1,
    AdmissionRequestTypeId: 1,
    GuarantorTypeId: 1,
    GuarantorId: 1,
    IsActive: true,
    IsMRDFileCreation: false,
    IsMLC: false,
  });
  const [standaloneLookup, setStandaloneLookup] = useState<Record<string, any[]>>({});
  const [standalonePatient, setStandalonePatient] = useState<any>({});
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [activePatientIdx, setActivePatientIdx] = useState<number>(-1);
  const [activeAccordion, setActiveAccordion] = useState<'attender' | 'clinical' | 'payer' | null>('attender');
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  // Debounced search ref & container ref for outside click
  const searchTimeoutRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve active data
  const item = isHybrid ? (reactProps?.item || {}) : standaloneItem;
  const lookup = isHybrid ? (reactProps?.lookup || {}) : standaloneLookup;
  const selectedPatient = isHybrid ? (reactProps?.selectedPatient || {}) : standalonePatient;
  const currentcontext = isHybrid ? (reactProps?.currentcontext || {}) : { id: 0, patientAlertsCount: 0, attachmentcount: 0 };
  const flags = reactProps?.flags || {
    canShowSaveBtn: true,
    canShowSaveandApproveBtn: true,
    canShowCancelledBtn: false,
    canbedoccupancyBtn: true,
  };

  // Resolve best patient record (either from selectedPatient or item.Patient)
  const activePatient = useMemo(() => {
    const isValPatient = (p: any) => {
      if (!p) return false;
      const pid = Number(p.Id);
      if (!isNaN(pid) && pid > 0) return true;
      if (p.MRN && String(p.MRN).trim() !== '') return true;
      if (p.PatientMrn && String(p.PatientMrn).trim() !== '') return true;
      if (p.FirstName && String(p.FirstName).trim() !== '') return true;
      if (p.PatientName && String(p.PatientName).trim() !== '') return true;
      return false;
    };

    if (isValPatient(selectedPatient)) {
      return selectedPatient;
    }
    if (isValPatient(item?.Patient)) {
      return item.Patient;
    }
    return {};
  }, [selectedPatient, item?.Patient]);

  // Check if patient details are available on the screen (PatientId > 0 or loaded patient info)
  const hasPatient = useMemo(() => {
    const isValPatient = (p: any) => {
      if (!p) return false;
      const pid = Number(p.Id);
      if (!isNaN(pid) && pid > 0) return true;
      if (p.MRN && String(p.MRN).trim() !== '') return true;
      if (p.PatientMrn && String(p.PatientMrn).trim() !== '') return true;
      if (p.FirstName && String(p.FirstName).trim() !== '') return true;
      if (p.PatientName && String(p.PatientName).trim() !== '') return true;
      return false;
    };

    const hasItemPatientId = !isNaN(Number(item?.PatientId)) && Number(item?.PatientId) > 0;
    const hasItemPatient = isValPatient(item?.Patient);
    const hasActive = isValPatient(activePatient);
    const hasSelected = isValPatient(selectedPatient);

    return Boolean(hasItemPatientId || hasItemPatient || hasActive || hasSelected);
  }, [activePatient, item?.PatientId, item?.Patient, selectedPatient]);

  // Sync patient search input text when active patient changes or is already loaded
  useEffect(() => {
    if (activePatient && (activePatient.FirstName || activePatient.PatientName || activePatient.MRN)) {
      const name = `${activePatient.Title?.Description || activePatient.TitleDesc || ''} ${activePatient.FirstName || activePatient.PatientName || ''} ${activePatient.LastName || ''}`.trim();
      const mrn = activePatient.MRN || activePatient.PatientMrn || '';
      setPatientSearchQuery(mrn ? `${name} (${mrn})` : name);
    }
  }, [activePatient?.Id, activePatient?.MRN, activePatient?.FirstName]);

  // Sync search results passed from Angular controller
  useEffect(() => {
    if (reactProps?.patientSearchResults && Array.isArray(reactProps.patientSearchResults)) {
      setPatientSearchResults(reactProps.patientSearchResults);
      if (reactProps.patientSearchResults.length > 0) {
        setShowPatientDropdown(true);
      }
    }
  }, [reactProps?.patientSearchResults]);

  // Helper to dispatch action or mutate standalone state
  const handleFieldChange = (field: string, value: any) => {
    if (onAction) {
      onAction('fieldChange', { field, value });
    } else {
      setStandaloneItem((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const dispatchAction = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    } else {
      console.log(`[Standalone AdmissionForm] Action: ${action}`, payload);
      if (action === 'backToList') {
        window.location.hash = '#/app/admissions';
      }
    }
  };

  // Standalone initialization
  useEffect(() => {
    if (!isHybrid) {
      const loadStandaloneLookups = async () => {
        try {
          const req = [
            { Key: 'Referral' },
            { Key: 'Department' },
            { Key: 'Doctor', Request: { Params: [{ Key: 2, Value: [-1, 1] }] } },
            { Key: 'AdmissionRequestType' },
            { Key: 'GuarantorType' },
            { Key: 'GuardianType' },
            { Key: 'ReferralType' },
            { Key: 'Location' },
            { Key: 'Ward' },
            { Key: 'Room' },
            { Key: 'Bed' },
            { Key: 'ServiceRateCategory' },
            { Key: 'AdmittingReason' },
            { Key: 'Guarantor' },
          ];
          const res = await apiFetch<any>('General/Options/getoptions', {
            method: 'POST',
            body: JSON.stringify(req),
          });
          if (res && typeof res === 'object') {
            setStandaloneLookup(res);
          }
        } catch (err) {
          console.error('Failed to load standalone lookups:', err);
        }
      };
      loadStandaloneLookups();
    }
  }, [isHybrid]);

  // Handle patient autocomplete search with exact HIMS parameter keys
  const handleSearchPatient = (query: string) => {
    setPatientSearchQuery(query);
    setActivePatientIdx(-1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length === 0) {
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      setSearchingPatients(false);
      return;
    }

    setSearchingPatients(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const searchTerm = query.trim();

      // 1. In hybrid mode, trigger searchPatients action to AngularJS controller
      if (onAction) {
        onAction('searchPatients', {
          query: searchTerm,
          callback: (results: any[]) => {
            const list = Array.isArray(results) ? results : [];
            setPatientSearchResults(list);
            setShowPatientDropdown(true);
            setSearchingPatients(false);
          },
        });
      }

      // 2. Also run direct apiFetch with standard HIMS params (Key 1 = Name/MRN/%%, Key 7 = Active, Key 37 = MRNType, Key 25 = BillOutstanding)
      try {
        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm },
            { Key: 7, Value: 2 },
            { Key: 37, Value: 2 },
            { Key: 25, Value: 1 },
          ],
          PageContext: { PageSize: 20, PageNumber: 1 },
        };

        let list: any[] = [];
        try {
          const res = await apiFetch<any>('registration/Patient/GetMinPatientSearch', inputData, { silent: true });
          list = res?.Data || res?.data || (Array.isArray(res) ? res : []);
        } catch {
          try {
            const res2 = await apiFetch<any>('registration/Patient/GetPatients', inputData, { silent: true });
            list = res2?.Data || res2?.data || (Array.isArray(res2) ? res2 : []);
          } catch (e2) {
            console.warn('Fallback patient search failed:', e2);
          }
        }

        if (list && list.length > 0) {
          setPatientSearchResults(list);
          setShowPatientDropdown(true);
        }
      } catch (err) {
        console.error('Failed patient search:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 250);
  };

  const selectPatient = (pat: any) => {
    setShowPatientDropdown(false);
    setActivePatientIdx(-1);
    const fullName = `${pat.Title?.Description || pat.TitleDesc || ''} ${pat.FirstName || pat.PatientName || ''} ${pat.LastName || ''}`.trim();
    const mrn = pat.MRN || pat.PatientMrn || '';
    setPatientSearchQuery(mrn ? `${fullName} (${mrn})` : fullName);
    if (onAction) {
      onAction('patientSelect', pat);
    } else {
      setStandalonePatient(pat);
      setStandaloneItem((prev: any) => ({
        ...prev,
        PatientId: pat.Id,
        Patient: pat,
        FirstName: pat.FirstName,
        LastName: pat.LastName,
      }));
    }
  };

  const handleClearPatient = () => {
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
    setActivePatientIdx(-1);
    if (onAction) {
      onAction('clearPatient');
    } else {
      setStandalonePatient({});
      setStandaloneItem((prev: any) => ({
        ...prev,
        PatientId: null,
        Patient: null,
        FirstName: '',
        LastName: '',
      }));
    }
  };

  const handlePatientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPatientDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivePatientIdx((prev) => (prev < patientSearchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivePatientIdx((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activePatientIdx >= 0 && activePatientIdx < patientSearchResults.length) {
        selectPatient(patientSearchResults[activePatientIdx]);
      }
    } else if (e.key === 'Escape') {
      setShowPatientDropdown(false);
    }
  };

  // Status computation
  const statusLabel = useMemo(() => {
    const rawStatus = reactProps?.Data?.AdmissionStatus;
    if (rawStatus && typeof rawStatus === 'string') {
      const lower = rawStatus.toLowerCase();
      if (lower.includes('draft')) return { text: rawStatus, bg: '#f1f5f9', color: '#475569' };
      if (lower.includes('admit')) return { text: rawStatus, bg: '#ecfdf5', color: '#059669' };
      if (lower.includes('fit')) return { text: rawStatus, bg: '#fef3c7', color: '#d97706' };
      if (lower.includes('clinical')) return { text: rawStatus, bg: '#eff6ff', color: '#2563eb' };
      if (lower.includes('financial')) return { text: rawStatus, bg: '#fef3c7', color: '#b45309' };
      if (lower.includes('physical')) return { text: rawStatus, bg: '#f8fafc', color: '#64748b' };
      return { text: rawStatus, bg: '#eff6ff', color: '#2563eb' };
    }
    const sId = item.AdmissionStatusId || currentcontext.AdmissionStatusId || reactProps?.Data?.AdmissionStatusId;
    switch (sId) {
      case 1:
        return { text: 'Draft', bg: '#f1f5f9', color: '#475569' };
      case 2:
        return { text: 'Admitted', bg: '#ecfdf5', color: '#059669' };
      case 3:
        return { text: 'Fit for Discharge', bg: '#fef3c7', color: '#d97706' };
      case 4:
        return { text: 'Clinically Discharged', bg: '#eff6ff', color: '#2563eb' };
      case 5:
        return { text: 'Financially Discharged', bg: '#fef3c7', color: '#b45309' };
      case 6:
        return { text: 'Physically Discharged', bg: '#f8fafc', color: '#64748b' };
      default:
        return item.Id && item.Id > 0
          ? { text: 'Admitted', bg: '#ecfdf5', color: '#059669' }
          : hasPatient
          ? { text: 'New Admission', bg: '#eff6ff', color: '#2563eb' }
          : { text: 'Select Patient', bg: '#f1f5f9', color: '#64748b' };
    }
  }, [item.AdmissionStatusId, item.Id, currentcontext.AdmissionStatusId, reactProps?.Data, hasPatient]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        backgroundColor: '#f8fafc',
        fontFamily: tokens.typography.fontFamily,
        color: tokens.colors.textPrimary,
        padding: '16px 24px 24px 24px',
      }}
    >
      {/* Top Header Card */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 20px',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: tokens.shadows.sm,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => dispatchAction('backToList')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
            }}
          >
            <i className="fa fa-arrow-left" /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {item.Id && item.Id > 0 ? `Admission Encounter #${item.EncounterIdentifier || item.Id}` : 'New Inpatient Admission'}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 999,
                  backgroundColor: statusLabel.bg,
                  color: statusLabel.color,
                }}
              >
                {statusLabel.text}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Assign bed, physician, guarantor, and initiate inpatient medical admission record.
            </p>
          </div>
        </div>

        {/* Right utility shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {hasPatient && Number(selectedPatient?.Id) > 0 && (
            <button
              type="button"
              onClick={() => dispatchAction('clinicalalertview')}
              title="Clinical Alerts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#b45309',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fa fa-exclamation-triangle" />
              Alerts ({currentcontext.patientAlertsCount || 0})
            </button>
          )}

          {item.Id > 0 && (
            <>
              <button
                type="button"
                onClick={() => dispatchAction('openattachments')}
                title="Attachments"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <i className="fa fa-paperclip" /> ({currentcontext.attachmentcount || 0})
              </button>

              <button
                type="button"
                onClick={() => dispatchAction('admissionlablescript')}
                title="Print Barcode"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <i className="fa fa-barcode" /> Barcode
              </button>

              <button
                type="button"
                onClick={() => dispatchAction('OPDBill')}
                title="Billing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#059669',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <i className="fa fa-calculator" /> Billing
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => dispatchAction('addNew')}
            title="Reset / New Admission"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: tokens.colors.primary,
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <i className="fa fa-plus" /> New
          </button>
        </div>
      </div>

      {/* Patient Search & Banner Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: tokens.shadows.sm,
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-user-circle" style={{ color: tokens.colors.primary, fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Patient Information & Demographic Banner</span>
          </div>

          {/* Patient Search Box */}
          <div ref={searchContainerRef} style={{ position: 'relative', width: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <i
                className="fa fa-search"
                style={{ position: 'absolute', left: 12, color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}
              />
              <input
                type="text"
                placeholder="Search patient by Name, MRN, Phone, %%..."
                value={patientSearchQuery}
                onChange={(e) => handleSearchPatient(e.target.value)}
                onKeyDown={handlePatientKeyDown}
                onFocus={() => {
                  if (patientSearchResults.length > 0) {
                    setShowPatientDropdown(true);
                  } else if (patientSearchQuery && patientSearchQuery.trim().length > 0) {
                    handleSearchPatient(patientSearchQuery);
                  }
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 32px 0 34px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                  fontFamily: tokens.typography.fontFamily,
                  transition: 'all 0.15s ease',
                }}
              />
              {patientSearchQuery && (
                <button
                  type="button"
                  onClick={handleClearPatient}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: searchingPatients ? 30 : 10,
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <i className="fa fa-times-circle" />
                </button>
              )}
              {searchingPatients && (
                <i
                  className="fa fa-spinner fa-spin"
                  style={{ position: 'absolute', right: 10, color: tokens.colors.primary, fontSize: 13 }}
                />
              )}
            </div>

            {/* Dropdown search results */}
            {showPatientDropdown && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 9999,
                  maxHeight: '380px',
                  width: '580px',
                  maxWidth: '92vw',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa fa-users" style={{ color: tokens.colors.primary, fontSize: 13 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Matching Patients
                    </span>
                    <span
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: 11,
                        fontWeight: 700,
                        border: '1px solid #dbeafe',
                      }}
                    >
                      {patientSearchResults.length} found
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    ↑↓ navigate • ↵ select
                  </span>
                </div>

                {/* List Content */}
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {searchingPatients && patientSearchResults.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      <i className="fa fa-spinner fa-spin" style={{ marginRight: 8, color: tokens.colors.primary }} />
                      Searching patients...
                    </div>
                  ) : patientSearchResults.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      <i className="fa fa-info-circle" style={{ marginRight: 6, color: '#94a3b8' }} />
                      No patients found matching "{patientSearchQuery}"
                    </div>
                  ) : (
                    patientSearchResults.map((pat: any, index: number) => {
                      const isActive = index === activePatientIdx;
                      const isFemale = pat.GenderId === 2 || pat.GenderCode === 'F' || pat.Gender?.Description?.toLowerCase() === 'female';
                      const avatarBg = isFemale ? '#fdf2f8' : '#eff6ff';
                      const avatarFg = isFemale ? '#db2777' : '#2563eb';
                      const initials = ((pat.FirstName ? pat.FirstName[0] : '') + (pat.LastName ? pat.LastName[0] : '')) || (pat.PatientName ? pat.PatientName[0] : '');
                      const due = Number(pat.OutStandingAmount || 0);
                      const mrn = pat.MRN || pat.PatientMrn || '—';
                      const name = `${pat.Title?.Description || pat.TitleDesc || ''} ${pat.FirstName || pat.PatientName || ''} ${pat.LastName || ''}`.trim();
                      const age = pat.Age ? (String(pat.Age).includes('Y') ? pat.Age : `${pat.Age}Y`) : '—';
                      const gender = pat.Gender?.Description || pat.GenderCode || (pat.GenderId === 1 ? 'M' : pat.GenderId === 2 ? 'F' : '—');
                      const phone = pat.Mobile || pat.PhoneNumber || pat.Phone || '';

                      return (
                        <div
                          key={pat.Id || index}
                          onClick={() => selectPatient(pat)}
                          onMouseEnter={() => setActivePatientIdx(index)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                            borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {/* Left: Avatar + Name + Subtitle */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: avatarBg,
                                color: avatarFg,
                                fontWeight: 700,
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: `1px solid ${isFemale ? '#fbcfe8' : '#bfdbfe'}`,
                              }}
                            >
                              {initials ? initials.toUpperCase() : <i className="fa fa-user" style={{ fontSize: 11 }} />}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                <span>
                                  <i className="fa fa-user" style={{ fontSize: 10, marginRight: 4, color: '#94a3b8' }} />
                                  {age} • {gender}
                                </span>
                                {phone && (
                                  <span>
                                    <i className="fa fa-phone" style={{ fontSize: 10, marginRight: 4, color: '#94a3b8' }} />
                                    {phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: MRN & Due */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              {mrn}
                            </span>
                            {due > 0 ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                }}
                              >
                                ₹{due.toLocaleString()} Due
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                                <i className="fa fa-check" style={{ fontSize: 9, marginRight: 3 }} />
                                No Due
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: 11,
                    color: '#64748b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Tip: Type <strong>%%</strong> for all recent patients</span>
                  <span>ESC to dismiss</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Details Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            backgroundColor: '#f8fafc',
            padding: 14,
            borderRadius: 10,
            border: '1px solid #edf2f7',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Patient Full Name</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              {activePatient?.FirstName || activePatient?.PatientName || item.FirstName
                ? `${activePatient.Title?.Description || activePatient.TitleDesc || ''} ${activePatient.FirstName || activePatient.PatientName || item.FirstName || ''} ${activePatient.LastName || item.LastName || ''}`.trim()
                : 'No Patient Selected'}
              {activePatient?.Id && (
                <button
                  type="button"
                  onClick={() => dispatchAction('patcmnts')}
                  title="Patient Comments"
                  style={{ background: 'none', border: 'none', color: tokens.colors.primary, cursor: 'pointer', padding: 2 }}
                >
                  <i className="fa fa-comment" />
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Patient MRN / ID</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
              {activePatient?.MRN || activePatient?.PatientMrn || item.PatientMrn || item.Patient?.MRN || '—'}
              {(activePatient?.VisitIdentifier || item.VisitIdentifier) ? (
                <span style={{ color: '#64748b', fontWeight: 500, marginLeft: 6 }}>
                  / {activePatient?.VisitIdentifier || item.VisitIdentifier}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Age / Gender</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {activePatient?.Age || item.Age ? (String(activePatient?.Age || item.Age).includes('Y') ? `${activePatient?.Age || item.Age}` : `${activePatient?.Age || item.Age} Yrs`) : '—'} /{' '}
              {activePatient?.Gender?.Description || activePatient?.GenderDescription || item.Gender?.Description || (activePatient?.GenderId === 1 ? 'Male' : activePatient?.GenderId === 2 ? 'Female' : '—')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Location</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {item.WardMaster?.WardName || item.Ward?.Text ? (
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  {item.WardMaster?.WardName || item.Ward?.Text} / Room {item.WardRoomMaster?.RoomNo || item.Room?.Text || '—'} / Bed {item.WardRoomBedMaster?.BedNo || item.Bed?.Text || '—'}
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Unassigned Bed</span>
              )}
            </div>
          </div>

          {activePatient?.OutStandingAmount && Number(activePatient.OutStandingAmount) > 0 ? (
            <div>
              <div style={{ fontSize: 11, color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding Due</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                ₹{Number(activePatient.OutStandingAmount).toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Admission Details Form */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: tokens.shadows.sm,
          border: '1px solid #e2e8f0',
          padding: '20px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-hospital" style={{ color: tokens.colors.primary, fontSize: 16 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Primary Admission & Bed Details</span>
          </div>
          {hasPatient && (
            <button
              type="button"
              onClick={() => dispatchAction('openWardBed')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#166534',
                cursor: 'pointer',
              }}
            >
              <i className="fa fa-bed" /> Live Floor & Bed Picker
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Admitting Doctor */}
          <FormSelect
            label="Admitting Doctor"
            required
            value={item.DoctorId || ''}
            onChange={(val) => {
              const num = val ? parseInt(val, 10) : null;
              handleFieldChange('DoctorId', num);
              if (onAction) onAction('doctorChange', num);
            }}
            placeholder="-- Select Admitting Doctor --"
            options={(lookup.Doctor || []).map((doc: any) => ({
              value: doc.Id,
              label: `${doc.Title?.Description || ''} ${doc.FirstName || doc.DoctorName || doc.Text || ''} ${doc.LastName || ''}`.trim(),
            }))}
          />

          {/* Secondary Doctor */}
          <FormSelect
            label="Secondary Doctor"
            value={item.SecondaryDoctorId || ''}
            onChange={(val) => handleFieldChange('SecondaryDoctorId', val ? parseInt(val, 10) : null)}
            placeholder="-- Select Secondary Doctor --"
            options={(lookup.Doctor || []).map((doc: any) => ({
              value: doc.Id,
              label: `${doc.Title?.Description || ''} ${doc.FirstName || doc.DoctorName || doc.Text || ''} ${doc.LastName || ''}`.trim(),
            }))}
          />

          {/* Department */}
          <FormSelect
            label="Admitting Department"
            required
            value={item.DepartmentId || ''}
            onChange={(val) => handleFieldChange('DepartmentId', val ? parseInt(val, 10) : null)}
            placeholder="-- Select Department --"
            options={(lookup.Department || []).map((dept: any) => ({
              value: dept.Id,
              label: dept.Text || dept.DepartmentName,
            }))}
          />

          {/* Admission Type */}
          <FormSelect
            label="Admission Type"
            required
            value={item.AdmissionRequestTypeId || ''}
            onChange={(val) => handleFieldChange('AdmissionRequestTypeId', val ? parseInt(val, 10) : null)}
            placeholder="-- Select Type --"
            options={(lookup.AdmissionRequestType || []).map((t: any) => ({
              value: t.Id,
              label: t.Text || t.Description,
            }))}
          />

          {/* Admission Date & Time */}
          <FormInput
            label="Admission Date & Time"
            required
            type="datetime-local"
            value={
              item.AdmissionDate
                ? typeof item.AdmissionDate === 'string' && item.AdmissionDate.includes('T')
                  ? item.AdmissionDate.slice(0, 16)
                  : new Date(item.AdmissionDate).toISOString().slice(0, 16)
                : ''
            }
            onChange={(val) => handleFieldChange('AdmissionDate', val)}
          />

          {/* Location / Wing */}
          <FormSelect
            label="Facility Location / Wing"
            required
            value={item.LocationId || ''}
            onChange={(val) => {
              const num = val ? parseInt(val, 10) : null;
              handleFieldChange('LocationId', num);
              if (onAction) onAction('locationChange', num);
            }}
            placeholder="-- Select Location --"
            options={(lookup.Location || []).map((loc: any) => ({
              value: loc.Id,
              label: loc.Text || loc.LocationName,
            }))}
          />

          {/* Ward */}
          <FormSelect
            label="Ward"
            required
            value={item.WardId || ''}
            onChange={(val) => {
              const num = val ? parseInt(val, 10) : null;
              handleFieldChange('WardId', num);
              if (onAction) onAction('wardChange', num);
            }}
            placeholder="-- Select Ward --"
            options={(lookup.Ward || []).map((w: any) => ({
              value: w.Id,
              label: w.Text || w.WardName,
            }))}
          />

          {/* Room */}
          <FormSelect
            label="Room"
            required
            value={item.RoomId || ''}
            onChange={(val) => {
              const num = val ? parseInt(val, 10) : null;
              handleFieldChange('RoomId', num);
              if (onAction) onAction('roomChange', num);
            }}
            placeholder="-- Select Room --"
            options={(lookup.Room || []).map((r: any) => ({
              value: r.Id,
              label: r.Text || r.RoomNo,
            }))}
          />

          {/* Bed */}
          <FormSelect
            label="Bed"
            required
            value={item.BedId || ''}
            onChange={(val) => {
              const num = val ? parseInt(val, 10) : null;
              handleFieldChange('BedId', num);
              if (onAction) onAction('bedChange', num);
            }}
            placeholder="-- Select Bed --"
            options={(lookup.Bed || []).map((b: any) => ({
              value: b.Id,
              label: b.Text || b.BedNo || b.Description,
            }))}
          />

          {/* Service Rate Category */}
          <FormSelect
            label="Service Rate Category"
            value={item.ServiceRateCategoryId || ''}
            onChange={(val) => handleFieldChange('ServiceRateCategoryId', val ? parseInt(val, 10) : null)}
            placeholder="-- Select Rate Category --"
            options={(lookup.ServiceRateCategory || []).map((src: any) => ({
              value: src.Id,
              label: src.Text || src.Description,
            }))}
          />

          {/* Admitting Reason */}
          <FormSelect
            label="Admitting Reason"
            value={item.AdmittingReasonId || ''}
            onChange={(val) => handleFieldChange('AdmittingReasonId', val ? parseInt(val, 10) : null)}
            placeholder="-- Select Reason --"
            options={(lookup.AdmittingReason || []).map((ar: any) => ({
              value: ar.Id,
              label: ar.Text || ar.Description,
            }))}
          />

          {/* Scheme */}
          <FormSelect
            label="Promotional Scheme"
            value={item.PromotionalSchemeId || ''}
            onChange={(val) => handleFieldChange('PromotionalSchemeId', val ? parseInt(val, 10) : null)}
            placeholder="-- Select Scheme --"
            options={(lookup.PromotionalScheme || []).map((ps: any) => ({
              value: ps.Id,
              label: ps.Text || ps.Description,
            }))}
          />
        </div>
      </div>

      {/* Accordion Sections: Payer, Clinical Diagnosis, Attender & MLC */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {/* Payer & Financial Details */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: tokens.shadows.sm,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={() => setActiveAccordion(activeAccordion === 'payer' ? null : 'payer')}
            style={{
              padding: '14px 20px',
              backgroundColor: activeAccordion === 'payer' ? '#f8fafc' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: activeAccordion === 'payer' ? '1px solid #e2e8f0' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa fa-shield-alt" style={{ color: tokens.colors.primary, fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Payer, Guarantor & Billing Details</span>
            </div>
            <i className={`fa fa-chevron-${activeAccordion === 'payer' ? 'up' : 'down'}`} style={{ color: '#94a3b8' }} />
          </div>

          {activeAccordion === 'payer' && (
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <FormSelect
                label="Guarantor Type"
                required
                value={item.GuarantorTypeId || ''}
                onChange={(val) => {
                  const num = val ? parseInt(val, 10) : null;
                  handleFieldChange('GuarantorTypeId', num);
                  if (onAction) onAction('guarantorTypeChange', num);
                }}
                placeholder="-- Select Guarantor Type --"
                options={(lookup.GuarantorType || []).map((gt: any) => ({
                  value: gt.Id,
                  label: gt.Text || gt.Description,
                }))}
              />

              <FormSelect
                label="Payer / Guarantor Name"
                required
                value={item.GuarantorId || ''}
                onChange={(val) => handleFieldChange('GuarantorId', val ? parseInt(val, 10) : null)}
                placeholder="-- Select Guarantor --"
                options={(lookup.Guarantor || []).map((g: any) => ({
                  value: g.Id,
                  label: g.Text || g.GuarantorName,
                }))}
                actionButton={hasPatient ? {
                  icon: 'fa fa-info-circle',
                  title: 'Guarantor Information',
                  onClick: () => dispatchAction('addGuarantor'),
                } : undefined}
              />

              <FormInput
                label="Insurance / Claim Number"
                placeholder="Enter policy / claim no."
                value={item.InsuranceNumber || ''}
                onChange={(val) => handleFieldChange('InsuranceNumber', val)}
              />

              <FormSelect
                label="Referral Type"
                value={item.ReferralTypeId || ''}
                onChange={(val) => {
                  const num = val ? parseInt(val, 10) : null;
                  handleFieldChange('ReferralTypeId', num);
                  if (onAction) onAction('referralTypeChange', num);
                }}
                placeholder="-- Select Referral Type --"
                options={(lookup.ReferralType || []).map((rt: any) => ({
                  value: rt.Id,
                  label: rt.Text || rt.Description,
                }))}
              />

              <FormSelect
                label="Referred By"
                value={item.ReferralId || ''}
                onChange={(val) => handleFieldChange('ReferralId', val ? parseInt(val, 10) : null)}
                placeholder="-- Select Referral Source --"
                options={(lookup.Referral || []).map((ref: any) => ({
                  value: ref.Id,
                  label: ref.Text || ref.ReferralName,
                }))}
                actionButton={hasPatient ? {
                  icon: 'fa fa-plus',
                  title: 'Add Referral',
                  onClick: () => dispatchAction('addReferral'),
                } : undefined}
              />

              <FormInput
                label="Estimated Cost (INR / Curr)"
                placeholder="Estimated amount"
                value={item.EstimationCost || ''}
                onChange={(val) => handleFieldChange('EstimationCost', val)}
              />

              <FormInput
                label="PAN Number"
                placeholder="PAN Card #"
                value={item.PANNo || ''}
                onChange={(val) => handleFieldChange('PANNo', val)}
              />
            </div>
          )}
        </div>

        {/* Clinical Diagnosis & Remarks */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: tokens.shadows.sm,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={() => setActiveAccordion(activeAccordion === 'clinical' ? null : 'clinical')}
            style={{
              padding: '14px 20px',
              backgroundColor: activeAccordion === 'clinical' ? '#f8fafc' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: activeAccordion === 'clinical' ? '1px solid #e2e8f0' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa fa-stethoscope" style={{ color: tokens.colors.primary, fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Clinical Diagnosis & Remarks</span>
            </div>
            <i className={`fa fa-chevron-${activeAccordion === 'clinical' ? 'up' : 'down'}`} style={{ color: '#94a3b8' }} />
          </div>

          {activeAccordion === 'clinical' && (
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <FormInput
                label="Provisional Diagnosis"
                placeholder="Search or enter ICD diagnosis"
                value={item.ProvisionalDiagnosis || item.DiagnosisText || ''}
                onChange={(val) => handleFieldChange('ProvisionalDiagnosis', val)}
                actionButton={hasPatient ? {
                  icon: 'fa fa-search',
                  title: 'Diagnosis Catalog',
                  onClick: () => dispatchAction('Diagnosis'),
                } : undefined}
              />

              <FormInput
                label="Other / Secondary Diagnosis"
                placeholder="Other notes or free-text condition"
                value={item.OtherDiagnosis || ''}
                onChange={(val) => handleFieldChange('OtherDiagnosis', val)}
              />

              <FormSelect
                label="Admission Remarks / Instructions"
                value={item.RemarkId || ''}
                onChange={(val) => handleFieldChange('RemarkId', val ? parseInt(val, 10) : null)}
                placeholder="-- Select Standard Remark --"
                options={(lookup.Remark || []).map((rmk: any) => ({
                  value: rmk.Id,
                  label: rmk.Text || rmk.Remarks,
                }))}
                actionButton={hasPatient ? {
                  icon: 'fa fa-plus',
                  title: 'Add Remark',
                  onClick: () => dispatchAction('addRemark'),
                } : undefined}
              />
            </div>
          )}
        </div>

        {/* Attender, MLC & MRD Details */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: tokens.shadows.sm,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={() => setActiveAccordion(activeAccordion === 'attender' ? null : 'attender')}
            style={{
              padding: '14px 20px',
              backgroundColor: activeAccordion === 'attender' ? '#f8fafc' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderBottom: activeAccordion === 'attender' ? '1px solid #e2e8f0' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa fa-users" style={{ color: tokens.colors.primary, fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Attender, Discharge Estimation & MLC Records</span>
            </div>
            <i className={`fa fa-chevron-${activeAccordion === 'attender' ? 'up' : 'down'}`} style={{ color: '#94a3b8' }} />
          </div>

          {activeAccordion === 'attender' && (
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <FormInput
                label="Primary Attender Name"
                placeholder="Full name of attender"
                value={item.AttenderName || ''}
                onChange={(val) => handleFieldChange('AttenderName', val)}
              />

              <FormSelect
                label="Relationship to Patient"
                value={item.GuardianTypeId || ''}
                onChange={(val) => handleFieldChange('GuardianTypeId', val ? parseInt(val, 10) : null)}
                placeholder="-- Select Relationship --"
                options={(lookup.GuardianType || []).map((rel: any) => ({
                  value: rel.Id,
                  label: rel.Text || rel.Description,
                }))}
              />

              <FormInput
                label="Attender Mobile Phone"
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={item.AttenderPhone || ''}
                onChange={(val) => handleFieldChange('AttenderPhone', val.replace(/\D/g, ''))}
              />

              <FormInput
                label="Expected Discharge Date"
                type="date"
                value={
                  item.ExpectedDischargeDate
                    ? typeof item.ExpectedDischargeDate === 'string'
                      ? item.ExpectedDischargeDate.slice(0, 10)
                      : new Date(item.ExpectedDischargeDate).toISOString().slice(0, 10)
                    : ''
                }
                onChange={(val) => handleFieldChange('ExpectedDischargeDate', val)}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="chkMRD"
                  checked={Boolean(item.IsMRDFileCreation)}
                  onChange={(e) => handleFieldChange('IsMRDFileCreation', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: tokens.colors.primary, cursor: 'pointer' }}
                />
                <label htmlFor="chkMRD" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                  Create MRD Physical Record File
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="chkMLC"
                  checked={Boolean(item.IsMLC)}
                  onChange={(e) => handleFieldChange('IsMLC', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#dc2626', cursor: 'pointer' }}
                />
                <label htmlFor="chkMLC" style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                  Is Medico-Legal Case (MLC)
                </label>
              </div>

              {item.IsMLC && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormInput
                    label="MLC Incident & Police Station Details"
                    placeholder="Police Station, Constable Name, Buckle #, Incident Details"
                    value={item.MLCInfo || ''}
                    onChange={(val) => handleFieldChange('MLCInfo', val)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* In-flow & Sticky Bottom Action Bar */}
      <div
        className="admission-footer-bar"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 100,
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 -4px 18px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          padding: '14px 20px',
          marginTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => dispatchAction('backToList')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fa fa-angle-left" /> Back
          </button>

          {flags.canShowCancelledBtn && (
            <button
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                dispatchAction('admsnCancel');
              }}
              title={!hasPatient ? 'Select patient to enable cancel admission' : 'Cancel Admission'}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: hasPatient ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                backgroundColor: hasPatient ? '#fef2f2' : '#f8fafc',
                fontSize: 13,
                fontWeight: 600,
                color: hasPatient ? '#dc2626' : '#94a3b8',
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                opacity: hasPatient ? 1 : 0.65,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-times" /> Cancel Admission
            </button>
          )}

          {flags.canbedoccupancyBtn !== false && (
            <button
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                dispatchAction('openattachments');
              }}
              title={!hasPatient ? 'Select patient to view attachments' : 'Attachment'}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: hasPatient ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                backgroundColor: hasPatient ? '#ffffff' : '#f8fafc',
                fontSize: 13,
                fontWeight: 600,
                color: hasPatient ? '#334155' : '#94a3b8',
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                opacity: hasPatient ? 1 : 0.65,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-paperclip" />
              Attachment {currentcontext.attachmentcount ? `(${currentcontext.attachmentcount})` : ''}
            </button>
          )}

          {flags.canbedoccupancyBtn !== false && (
            <button
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                dispatchAction('Bedoccupancy');
              }}
              title={!hasPatient ? 'Select patient to view bed history' : 'Bed History'}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: hasPatient ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                backgroundColor: hasPatient ? '#ffffff' : '#f8fafc',
                fontSize: 13,
                fontWeight: 600,
                color: hasPatient ? '#334155' : '#94a3b8',
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                opacity: hasPatient ? 1 : 0.65,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-bed" /> Bed History
            </button>
          )}

          {(item.IsMLC === true || item.IsMLC === 1 || Boolean(item.IsMLC)) && (
            <button
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                dispatchAction('mlcForm');
              }}
              title={!hasPatient ? 'Select patient to view medico legal form' : 'Medico Legal'}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: hasPatient ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                backgroundColor: hasPatient ? '#fff1f2' : '#f8fafc',
                fontSize: 13,
                fontWeight: 600,
                color: hasPatient ? '#e11d48' : '#94a3b8',
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                opacity: hasPatient ? 1 : 0.65,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-balance-scale" /> Medico Legal
            </button>
          )}

          {/* Current Status Badge in Footer */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 16,
              backgroundColor: statusLabel.bg,
              border: `1px solid ${statusLabel.color}30`,
              fontSize: 12,
              fontWeight: 600,
              color: statusLabel.color,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: statusLabel.color,
                display: 'inline-block',
              }}
            />
            Status: {statusLabel.text}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', flexWrap: 'wrap' }}>
          {/* Print Dropdown */}
          {(item.AdmissionStatusId >= 2 || (item.Id && item.Id > 0) || flags.canprintBtn) && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                disabled={!hasPatient}
                onClick={() => {
                  if (!hasPatient) return;
                  setShowPrintMenu(!showPrintMenu);
                }}
                title={!hasPatient ? 'Select patient to enable print options' : 'Print options'}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: hasPatient ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                  backgroundColor: hasPatient ? '#ffffff' : '#f8fafc',
                  fontSize: 13,
                  fontWeight: 600,
                  color: hasPatient ? '#334155' : '#94a3b8',
                  cursor: hasPatient ? 'pointer' : 'not-allowed',
                  opacity: hasPatient ? 1 : 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="fa fa-print" /> Print <i className="fa fa-caret-down" />
              </button>

              {showPrintMenu && hasPatient && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 8,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    boxShadow: tokens.shadows.lg,
                    minWidth: 180,
                    overflow: 'hidden',
                    zIndex: 1100,
                  }}
                >
                  {[
                    { label: 'Patient Barcode', action: 'admissionlablescript' },
                    { label: 'Admission Label (A5)', action: 'print5' },
                    { label: 'Consent Form', action: 'openPatientConsentPrint' },
                    { label: 'Admission Form', action: 'print' },
                    { label: 'Wrist Band', action: 'wristbandprint' },
                  ].map((p) => (
                    <div
                      key={p.action}
                      onClick={() => {
                        setShowPrintMenu(false);
                        dispatchAction(p.action);
                      }}
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {p.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Draft Button */}
          {(flags.canShowSaveBtn || (item.Id && item.Id > 0 && item.AdmissionStatusId === 1)) && (
            <button
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                dispatchAction('save');
              }}
              title={!hasPatient ? 'Select patient to save draft' : 'Save Draft'}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: hasPatient ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                backgroundColor: hasPatient ? '#ffffff' : '#f8fafc',
                fontSize: 13,
                fontWeight: 600,
                color: hasPatient ? '#334155' : '#94a3b8',
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                opacity: hasPatient ? 1 : 0.65,
              }}
            >
              Save Draft
            </button>
          )}

          {/* Save & Admit / Approve Button */}
          {flags.canShowSaveandApproveBtn !== false && (
            <button
              id="btnSaveApprove"
              name="btnSaveApprove"
              data-testid="btnSaveApprove"
              data-alias="btnApprove"
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                if (currentcontext.isemergency) {
                  dispatchAction('saveEmergency');
                } else if (currentcontext.isdaycare) {
                  dispatchAction('savedaycare');
                } else {
                  dispatchAction('saveAndApprove');
                }
              }}
              title={!hasPatient ? 'Select patient to enable admission' : (currentcontext.isemergency ? 'Save Emergency' : currentcontext.isdaycare ? 'Save Daycare' : 'Approve & Admit')}
              style={{
                padding: '8px 22px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: hasPatient ? tokens.colors.primary : '#94a3b8',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: hasPatient ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                opacity: hasPatient ? 1 : 0.65,
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa fa-check-double" />
              {currentcontext.isemergency
                ? 'Approve / Save Emergency'
                : currentcontext.isdaycare
                ? 'Approve / Save Daycare'
                : 'Approve / Save & Admit'}
            </button>
          )}

          {/* Discharge Button */}
          {flags.canphysicaldischargeBtn && (
            <button
              type="button"
              disabled={!hasPatient}
              onClick={() => {
                if (!hasPatient) return;
                dispatchAction('patientDischarge');
              }}
              title={!hasPatient ? 'Select patient to enable discharge' : 'Discharge Patient'}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: hasPatient ? '#dc2626' : '#94a3b8',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: hasPatient ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: hasPatient ? 1 : 0.65,
              }}
            >
              <i className="fa fa-sign-out" /> Discharge Patient
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
