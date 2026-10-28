import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';

export interface AePatientRegistrationProps {
  reactProps?: {
    item?: any;
    lookup?: Record<string, any[]>;
    selectedPatient?: any;
    currentcontext?: any;
    flags?: {
      SaveCompleted?: boolean;
      BillCompleted?: boolean;
      isPatientDeactivated?: boolean;
      ShowDayCarefields?: boolean;
    };
  };
  onAction?: (action: string, payload?: any) => void;
}

export const toSelectValue = (val: any): string => {
  if (val === null || val === undefined || val === '' || val === -1 || val === '-1' || (typeof val === 'number' && isNaN(val))) return '';
  return String(val);
};

export const AePatientRegistrationScreen: React.FC<AePatientRegistrationProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Form State
  const [formData, setFormData] = useState<any>({
    TitleId: '',
    FirstName: '',
    LastName: '',
    ApproxAgeYears: '',
    ApproxAgeMonths: '',
    ApproxAgeDays: '',
    Age: '',
    DOB: '',
    GenderId: '',
    BloodGroupId: '',
    MaritalStatusId: '',
    ReligionId: '',
    Mobile: '',
    PasspostNumber: '',
    GuardianName: '',
    NationalityId: 238, // India default
    AddressLine1: '',
    AddressLine2: '',
    Pincode: '',
    PatientTypeId: 1,
    VisitTypeId: 1,
    DoctorId: '',
    DepartmentId: '',
    GuarantorTypeId: 1,
    GuarantorId: '',
    ReferTypeId: '',
    ReferrerId: '',
    RemarkId: '',
    IsMLC: false,
    MLCInfo: '',
    IsDayCare: false,
    WardId: '',
    RoomId: '',
    BedId: '',
    TokenNo: '',
    EmergencyDate: new Date().toISOString().substring(0, 16),
    ERTypeId: 2, // Default Urgent/Emergency
    ArrivalModeId: 1, // Ambulance
    IncidentAddress: '',
    InjuryReason: '',
    BroughtDead: false,
  });

  const [lookups, setLookups] = useState<Record<string, any[]>>({
    Title: [],
    Gender: [],
    BloodGroup: [],
    MaritalStatus: [],
    Religion: [],
    Nationality: [],
    Department: [],
    Doctor: [],
    GuarantorType: [],
    Guarantor: [],
    ReferralType: [],
    Ward: [],
    Room: [],
    Bed: [],
    PatientType: [],
    ERType: [
      { Id: 1, Text: 'Level 1 - Resuscitation (Immediate)' },
      { Id: 2, Text: 'Level 2 - Emergent (Within 15 mins)' },
      { Id: 3, Text: 'Level 3 - Urgent (Within 30 mins)' },
      { Id: 4, Text: 'Level 4 - Less Urgent (Within 60 mins)' },
      { Id: 5, Text: 'Level 5 - Non-Urgent (Within 120 mins)' },
    ],
    ArrivalMode: [
      { Id: 1, Text: 'Ambulance (108 / Hospital)' },
      { Id: 2, Text: 'Self / Walk-in' },
      { Id: 3, Text: 'Police / Law Enforcement Escort' },
      { Id: 4, Text: 'Inter-Hospital Transfer' },
      { Id: 5, Text: 'Public / Private Vehicle' },
    ],
  });

  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatientBanner, setSelectedPatientBanner] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'demographics' | 'triage' | 'clinical' | 'admission' | 'guarantor'>('triage');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync hybrid props with rigorous null and -1 sanitization
  useEffect(() => {
    if (isHybrid && reactProps?.item) {
      const item = reactProps.item;
      const sanitizedItem: any = {};
      for (const k of Object.keys(item)) {
        sanitizedItem[k] = (item[k] === null || item[k] === -1 || item[k] === '-1') ? '' : item[k];
      }

      setFormData((prev: any) => ({
        ...prev,
        ...sanitizedItem,
        TitleId: toSelectValue(sanitizedItem.TitleId || prev.TitleId),
        GenderId: toSelectValue(sanitizedItem.GenderId || prev.GenderId),
        BloodGroupId: toSelectValue(sanitizedItem.BloodGroupId || prev.BloodGroupId),
        DepartmentId: toSelectValue(sanitizedItem.DepartmentId || prev.DepartmentId),
        DoctorId: toSelectValue(sanitizedItem.DoctorId || prev.DoctorId),
        WardId: toSelectValue(sanitizedItem.WardId || prev.WardId),
        RoomId: toSelectValue(sanitizedItem.RoomId || prev.RoomId),
        BedId: toSelectValue(sanitizedItem.BedId || prev.BedId),
        GuarantorTypeId: toSelectValue(sanitizedItem.GuarantorTypeId || prev.GuarantorTypeId || 1),
        GuarantorId: toSelectValue(sanitizedItem.GuarantorId || prev.GuarantorId),
        ERTypeId: toSelectValue(sanitizedItem.ERTypeId || prev.ERTypeId || 2),
        ArrivalModeId: toSelectValue(sanitizedItem.ArrivalModeId || prev.ArrivalModeId || 1),
        FirstName: sanitizedItem.FirstName ?? prev.FirstName ?? '',
        LastName: sanitizedItem.LastName ?? prev.LastName ?? '',
        Age: sanitizedItem.Age ?? prev.Age ?? '',
        DOB: sanitizedItem.DOB
          ? (typeof sanitizedItem.DOB === 'string'
              ? sanitizedItem.DOB.split('T')[0]
              : (sanitizedItem.DOB instanceof Date && !isNaN(sanitizedItem.DOB.getTime()))
                ? sanitizedItem.DOB.toISOString().split('T')[0]
                : '')
          : (prev.DOB ?? ''),
        Mobile: sanitizedItem.Mobile ?? prev.Mobile ?? '',
        IncidentAddress: sanitizedItem.IncidentAddress ?? prev.IncidentAddress ?? '',
        InjuryReason: sanitizedItem.InjuryReason ?? prev.InjuryReason ?? '',
        MLCInfo: sanitizedItem.MLCInfo ?? prev.MLCInfo ?? '',
        GuardianName: sanitizedItem.GuardianName ?? prev.GuardianName ?? '',
        AddressLine1: sanitizedItem.AddressLine1 ?? prev.AddressLine1 ?? '',
        Pincode: sanitizedItem.Pincode ?? prev.Pincode ?? '',
        IsMLC: Boolean(sanitizedItem.IsMLC),
        IsDayCare: Boolean(sanitizedItem.IsDayCare),
        TokenNo: reactProps.currentcontext?.TokenNo || sanitizedItem.TokenNo || prev.TokenNo || '',
      }));
    }
    if (isHybrid && reactProps?.lookup) {
      setLookups((prev) => ({
        ...prev,
        ...reactProps.lookup,
      }));
    }
    if (isHybrid && reactProps?.selectedPatient) {
      setSelectedPatientBanner(reactProps.selectedPatient);
    }
  }, [isHybrid, reactProps?.item, reactProps?.lookup, reactProps?.selectedPatient, reactProps?.currentcontext]);

  // Alt+A keyboard shortcut for Approve
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSaveApprove();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formData, isHybrid]);

  // Load Lookups in standalone mode
  useEffect(() => {
    if (isHybrid) return;
    const fetchOptions = async () => {
      try {
        const payload = [
          { Key: 'Title' },
          { Key: 'Gender' },
          { Key: 'BloodGroup' },
          { Key: 'MaritalStatus' },
          { Key: 'Religion' },
          { Key: 'Nationality' },
          { Key: 'GuarantorType' },
          { Key: 'PatientType' },
          { Key: 'ReferralType' },
          {
            Key: 'Department',
            Request: { Params: [{ Key: 12, Value: true }] },
          },
        ];
        const res = await apiFetch<any>('General/Options/getoptions', payload);
        if (res && typeof res === 'object') {
          setLookups((prev) => ({
            ...prev,
            ...res,
          }));
        }
      } catch (err) {
        console.warn('Could not load standalone options for A&E registration', err);
      }
    };
    fetchOptions();
  }, [isHybrid]);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    } else {
      showToast(`Action triggered: ${action}`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Age to DOB calculator
  const handleAgeChange = (val: string) => {
    const ageNum = parseInt(val, 10);
    setFormData((prev: any) => {
      const updated = { ...prev, Age: val, ApproxAgeYears: val };
      if (!isNaN(ageNum) && ageNum > 0) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - ageNum);
        updated.DOB = d.toISOString().split('T')[0];
      } else if (!val) {
        updated.DOB = '';
      }
      return updated;
    });

    if (isHybrid && onAction) {
      onAction('fieldChange', { field: 'Age', value: val });
      if (!isNaN(ageNum) && ageNum > 0) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - ageNum);
        onAction('fieldChange', { field: 'DOB', value: d.toISOString().split('T')[0] });
      }
    }
  };

  const handleFieldChange = (field: string, val: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: val };
      if (field === 'TitleId') {
        const titleObj = (lookups.Title || []).find((t: any) => t.Id === Number(val));
        if (titleObj) {
          const desc = (titleObj.Text || '').toLowerCase();
          if (desc.includes('mr') || desc.includes('master')) updated.GenderId = 1;
          else if (desc.includes('mrs') || desc.includes('ms') || desc.includes('miss')) updated.GenderId = 2;
        }
      } else if (field === 'DOB') {
        if (val) {
          const birthDate = new Date(val);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            if (age >= 0 && age < 150) {
              updated.Age = String(age);
              updated.ApproxAgeYears = String(age);
            }
          }
        }
      }
      return updated;
    });

    if (isHybrid && onAction) {
      onAction('fieldChange', { field, value: val });
      if (field === 'DOB' && val) {
        const birthDate = new Date(val);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
          if (age >= 0 && age < 150) {
            onAction('fieldChange', { field: 'Age', value: String(age) });
          }
        }
      }
    }
  };

  const handlePatientSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearchTerm.trim()) return;
    dispatch('patientSearch', { term: patientSearchTerm });
    // Mock quick patient banner if standalone
    if (!isHybrid) {
      setSelectedPatientBanner({
        FirstName: 'PATIENT',
        LastName: 'SEARCH',
        MRN: patientSearchTerm.toUpperCase(),
        Age: '34 Yrs',
        Gender: { Description: 'Male' },
        Mobile: '9840123456',
        BloodGroup: { Description: 'O+ve' },
      });
      showToast(`Loaded details for MRN: ${patientSearchTerm}`);
    }
  };

  const handleSaveDraft = () => {
    const payload = {
      ...formData,
      DOB: formData.DOB ? String(formData.DOB).split('T')[0] : null,
      Age: formData.Age ? Number(formData.Age) : null,
      ApproxAgeYears: formData.Age ? Number(formData.Age) : null,
    };
    if (isHybrid && onAction) {
      onAction('saveDraft', payload);
      return;
    }
    showToast('Emergency Registration Draft Saved');
  };

  const handleSaveApprove = async () => {
    const payload = {
      ...formData,
      DOB: formData.DOB ? String(formData.DOB).split('T')[0] : null,
      Age: formData.Age ? Number(formData.Age) : null,
      ApproxAgeYears: formData.Age ? Number(formData.Age) : null,
    };
    if (isHybrid && onAction) {
      onAction('saveAndApprove', payload);
      return;
    }
    if (!formData.FirstName) {
      showToast('Please enter Patient First Name');
      return;
    }
    setIsSaving(true);
    try {
      showToast('Emergency Registration Saved & Activated Successfully');
      setFormData((prev: any) => ({ ...prev, TokenNo: 'EMR-' + Math.floor(1000 + Math.random() * 9000) }));
    } finally {
      setIsSaving(false);
    }
  };

  const triagePriorityColors: Record<number, { bg: string; text: string; border: string; label: string }> = {
    1: { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444', label: 'L1: Resuscitation (Immediate)' },
    2: { bg: '#ffedd5', text: '#c2410c', border: '#f97316', label: 'L2: Emergent (15m)' },
    3: { bg: '#fef9c3', text: '#854d0e', border: '#eab308', label: 'L3: Urgent (30m)' },
    4: { bg: '#dcfce7', text: '#15803d', border: '#22c55e', label: 'L4: Less Urgent (60m)' },
    5: { bg: '#e0f2fe', text: '#0369a1', border: '#0ea5e9', label: 'L5: Non-Urgent (120m)' },
  };

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: typography.fontFamily.sans,
        color: '#0f172a',
        padding: '16px 20px 40px 20px',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: `${spacing[3]} ${spacing[5]}`,
            borderRadius: radii.lg,
            boxShadow: shadows.xl,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            borderLeft: `4px solid ${colors.danger[500]}`,
          }}
        >
          <span style={{ fontSize: 16 }}>🚨</span>
          {toastMessage}
        </div>
      )}

      {/* Modern Hospital Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: '14px 20px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #dc2626',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <i className="fas fa-ambulance" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Accident & Emergency Patient Admission
                </h1>
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }}></span>
                  Emergency Unit
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Trauma intake, priority triage, medico-legal documentation & emergency bed allocation
              </p>
            </div>
          </div>

          {/* Quick Header Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              id="btnSaveApproveTop"
              name="btnSaveApproveTop"
              data-testid="btnSaveApproveTop"
              data-id="saveAndApproveid"
              data-alias="btnApprove"
              type="button"
              onClick={handleSaveApprove}
              disabled={isSaving}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: '1px solid #15803d',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 5px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fas fa-check-double" style={{ color: '#ffffff' }}></i>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>
                {isSaving ? 'Approving...' : 'Approve (Alt+A)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <i className="fas fa-save" style={{ color: '#64748b' }}></i>
              <span style={{ color: '#334155' }}>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => dispatch('addNew')}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: '1px solid #1d4ed8',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              }}
            >
              <i className="fas fa-plus" style={{ color: '#ffffff' }}></i>
              <span style={{ color: '#ffffff' }}>New Emergency</span>
            </button>

            <button
              type="button"
              onClick={() => dispatch('admission')}
              style={{
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: '1px solid #6d28d9',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(124, 58, 237, 0.2)',
              }}
            >
              <i className="fas fa-bed" style={{ color: '#ffffff' }}></i>
              <span style={{ color: '#ffffff' }}>Direct Admission</span>
            </button>

            <button
              type="button"
              onClick={() => dispatch('backtoList')}
              style={{
                backgroundColor: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-th-large" style={{ color: '#64748b' }}></i>
              <span style={{ color: '#334155' }}>A&E Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Search & Quick Banner Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: '12px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Input */}
          <form onSubmit={handlePatientSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 340px', maxWidth: 480 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  fontSize: 14,
                }}
              ></i>
              <input
                type="text"
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder="Search Existing Patient by MRN, Name, or Mobile..."
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px 0 36px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-search" style={{ color: '#ffffff' }}></i>
              <span style={{ color: '#ffffff' }}>Search</span>
            </button>
          </form>

          {/* Quick Demographics pill or token badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {formData.TokenNo && (
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700 }}>TOKEN NO:</span>
                <span style={{ fontSize: '15px', color: '#1e3a8a', fontWeight: 800 }}>{formData.TokenNo}</span>
              </div>
            )}
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: triagePriorityColors[formData.ERTypeId]?.bg || '#fef2f2',
                color: triagePriorityColors[formData.ERTypeId]?.text || '#b91c1c',
                border: `1px solid ${triagePriorityColors[formData.ERTypeId]?.border || '#fecaca'}`,
                fontWeight: 700,
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-exclamation-circle"></i>
              {triagePriorityColors[formData.ERTypeId]?.label || 'Triage Priority'}
            </div>
          </div>
        </div>

        {/* Selected Patient Banner Display */}
        {selectedPatientBanner && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: radii.lg,
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {selectedPatientBanner.FirstName?.[0] || 'P'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  {selectedPatientBanner.FirstName} {selectedPatientBanner.LastName}
                  <span style={{ marginLeft: 8, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    ({selectedPatientBanner.MRN})
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: 2 }}>
                  {selectedPatientBanner.Age} • {selectedPatientBanner.Gender?.Description || 'Gender'} • Blood: {selectedPatientBanner.BloodGroup?.Description || 'Unknown'} • Contact: {selectedPatientBanner.Mobile || 'N/A'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dispatch('patientinfo', selectedPatientBanner.Id)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Full Profile
            </button>
          </div>
        )}
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '16px',
          padding: '4px',
          backgroundColor: '#f1f5f9',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'triage', label: '1. Triage & Incident Intake', icon: 'fa-ambulance', badge: 'Critical' },
          { key: 'demographics', label: '2. Patient Demographics', icon: 'fa-user' },
          { key: 'clinical', label: '3. Physician & MLC Legal', icon: 'fa-user-md' },
          { key: 'admission', label: '4. Ward & Bed Allocation', icon: 'fa-bed' },
          { key: 'guarantor', label: '5. Guarantor & Payer', icon: 'fa-shield-alt' },
        ].map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#1d4ed8' : '#475569',
                border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <i
                className={`fas ${tab.icon}`}
                style={{ color: isActive ? '#2563eb' : '#64748b', fontSize: 13 }}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    backgroundColor: isActive ? '#ef4444' : '#fee2e2',
                    color: isActive ? '#ffffff' : '#b91c1c',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Form Workstation Body */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
        }}
      >
        {/* Section 1: Triage & Incident Intake */}
        {activeSection === 'triage' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px 0' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                <i className="fas fa-heartbeat" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Emergency Triage Assessment & Incident Report
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Emergency arrival details, triage urgency level & chief complaint
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Emergency Date/Time */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Emergency Arrival Date & Time <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.EmergencyDate || ''}
                  onChange={(e) => handleFieldChange('EmergencyDate', e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Triage Level */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Triage Priority Level <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <select
                  value={toSelectValue(formData.ERTypeId)}
                  onChange={(e) => handleFieldChange('ERTypeId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: `2px solid ${triagePriorityColors[formData.ERTypeId]?.border || '#cbd5e1'}`,
                    padding: '0 10px',
                    fontSize: '13px',
                    backgroundColor: triagePriorityColors[formData.ERTypeId]?.bg || '#ffffff',
                    color: triagePriorityColors[formData.ERTypeId]?.text || '#0f172a',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                >
                  {lookups.ERType?.map((t: any) => (
                    <option key={t.Id} value={String(t.Id)}>
                      {t.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode of Arrival */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Mode of Arrival
                </label>
                <select
                  value={toSelectValue(formData.ArrivalModeId)}
                  onChange={(e) => handleFieldChange('ArrivalModeId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  {lookups.ArrivalMode?.map((m: any) => (
                    <option key={m.Id} value={String(m.Id)}>
                      {m.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brought Dead Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="broughtdead"
                  checked={formData.BroughtDead}
                  onChange={(e) => handleFieldChange('BroughtDead', e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#dc2626' }}
                />
                <label htmlFor="broughtdead" style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c', cursor: 'pointer' }}>
                  Patient Brought Dead (BID)
                </label>
              </div>

              {/* Incident Address */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Place of Incident / Accident Location
                </label>
                <input
                  type="text"
                  value={formData.IncidentAddress || ''}
                  onChange={(e) => handleFieldChange('IncidentAddress', e.target.value)}
                  placeholder="e.g. Highway intersection, Workplace factory floor, Home residence..."
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Injury / Complaint Reason */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason for Injury / Chief Complaint
                </label>
                <input
                  type="text"
                  value={formData.InjuryReason || ''}
                  onChange={(e) => handleFieldChange('InjuryReason', e.target.value)}
                  placeholder="e.g. Severe polytrauma with head injury, Acute respiratory distress, Suspected ingestion..."
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Patient Demographics */}
        {activeSection === 'demographics' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px 0' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#dbeafe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                <i className="fas fa-user-circle" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Patient Identification & Demographics
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Patient name, age, biological sex, contact & accompanying guardian
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Title <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <select
                  value={toSelectValue(formData.TitleId)}
                  onChange={(e) => handleFieldChange('TitleId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Select Title --</option>
                  {lookups.Title?.map((t: any) => (
                    <option key={t.Id} value={String(t.Id)}>
                      {t.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* First Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  First Name <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.FirstName || ''}
                  onChange={(e) => handleFieldChange('FirstName', e.target.value)}
                  placeholder="First Name (e.g. JOHN)"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    textTransform: 'uppercase',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Last Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Last Name / Surname
                </label>
                <input
                  type="text"
                  value={formData.LastName || ''}
                  onChange={(e) => handleFieldChange('LastName', e.target.value)}
                  placeholder="Last Name"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    textTransform: 'uppercase',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Age (Years) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Age (Years) <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.Age || ''}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="Years"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* DOB */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.DOB || ''}
                  onChange={(e) => handleFieldChange('DOB', e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Gender <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <select
                  value={toSelectValue(formData.GenderId)}
                  onChange={(e) => handleFieldChange('GenderId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Select Gender --</option>
                  {lookups.Gender?.map((g: any) => (
                    <option key={g.Id} value={String(g.Id)}>
                      {g.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Blood Group */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Blood Group
                </label>
                <select
                  value={toSelectValue(formData.BloodGroupId)}
                  onChange={(e) => handleFieldChange('BloodGroupId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Select Blood Group --</option>
                  {lookups.BloodGroup?.map((b: any) => (
                    <option key={b.Id} value={String(b.Id)}>
                      {b.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Mobile / Emergency Contact <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.Mobile || ''}
                  onChange={(e) => handleFieldChange('Mobile', e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Attender / Guardian */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Attender / Relative Accompanying
                </label>
                <input
                  type="text"
                  value={formData.GuardianName || ''}
                  onChange={(e) => handleFieldChange('GuardianName', e.target.value)}
                  placeholder="Name and relationship"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Address Line 1 */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Residential Address
                </label>
                <input
                  type="text"
                  value={formData.AddressLine1 || ''}
                  onChange={(e) => handleFieldChange('AddressLine1', e.target.value)}
                  placeholder="Street address, locality, area..."
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* PIN Code */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  PIN / Postal Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.Pincode || ''}
                  onChange={(e) => handleFieldChange('Pincode', e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit PIN code"
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Physician & MLC Legal */}
        {activeSection === 'clinical' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px 0' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                <i className="fas fa-stethoscope" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Physician Assignment & Medico-Legal Documentation (MLC)
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Attending doctor assignment and legal police notification
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Emergency Department */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Emergency Specialty / Department <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <select
                  value={toSelectValue(formData.DepartmentId)}
                  onChange={(e) => handleFieldChange('DepartmentId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Emergency Department --</option>
                  {lookups.Department?.map((d: any) => (
                    <option key={d.Id} value={String(d.Id)}>
                      {d.Text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attending Doctor */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Attending Emergency Medical Officer / Doctor <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <select
                  value={toSelectValue(formData.DoctorId)}
                  onChange={(e) => handleFieldChange('DoctorId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Select Attending Doctor --</option>
                  {lookups.Doctor?.map((doc: any) => (
                    <option key={doc.Id} value={String(doc.Id)}>
                      {doc.Text || `${doc.FirstName || ''} ${doc.LastName || ''}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* MLC Toggle Card */}
              <div
                style={{
                  gridColumn: 'span 2',
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: formData.IsMLC ? '#fef2f2' : '#f8fafc',
                  border: `2px solid ${formData.IsMLC ? '#f87171' : '#e2e8f0'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      id="mlcToggle"
                      checked={formData.IsMLC}
                      onChange={(e) => handleFieldChange('IsMLC', e.target.checked)}
                      style={{ width: 20, height: 20, accentColor: '#dc2626', cursor: 'pointer' }}
                    />
                    <div>
                      <label htmlFor="mlcToggle" style={{ fontSize: '13px', fontWeight: 700, color: formData.IsMLC ? '#991b1b' : '#0f172a', cursor: 'pointer' }}>
                        Is Medico-Legal Case (MLC)?
                      </label>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Required for RTAs, assaults, poisonings, burn cases, and fatal industrial accidents.
                      </p>
                    </div>
                  </div>
                  {formData.IsMLC && (
                    <span
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                    >
                      MLC NOTIFICATION ACTIVE
                    </span>
                  )}
                </div>

                {formData.IsMLC && (
                  <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                        Police Station & Officer Info
                      </label>
                      <input
                        type="text"
                        value={formData.MLCInfo || ''}
                        onChange={(e) => handleFieldChange('MLCInfo', e.target.value)}
                        placeholder="e.g. Inspector John Doe, Central PS, FIR Ref #..."
                        style={{
                          width: '100%',
                          height: 38,
                          borderRadius: '6px',
                          border: '1px solid #fca5a5',
                          padding: '0 10px',
                          fontSize: '13px',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Ward & Bed Allocation */}
        {activeSection === 'admission' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px 0' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#ede9fe',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                <i className="fas fa-bed" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  A&E Direct Inpatient Admission & Emergency Bed Assignment
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Immediate observation bed or emergency ward admission
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: formData.IsDayCare ? '#f5f3ff' : '#f8fafc',
                border: `2px solid ${formData.IsDayCare ? '#c4b5fd' : '#e2e8f0'}`,
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    id="daycareToggle"
                    checked={formData.IsDayCare}
                    onChange={(e) => handleFieldChange('IsDayCare', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="daycareToggle" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                      Admit Patient Immediately to A&E Observation / Ward Bed
                    </label>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Converts emergency visit into active daycare / observation admission without separate admission desk booking.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {formData.IsDayCare ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Emergency Ward / Unit <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                  </label>
                  <select
                    value={toSelectValue(formData.WardId)}
                    onChange={(e) => handleFieldChange('WardId', e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Select Ward --</option>
                    {lookups.Ward?.map((w: any) => (
                      <option key={w.Id} value={String(w.Id)}>
                        {w.Text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Room Number
                  </label>
                  <select
                    value={toSelectValue(formData.RoomId)}
                    onChange={(e) => handleFieldChange('RoomId', e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Select Room --</option>
                    {lookups.Room?.map((r: any) => (
                      <option key={r.Id} value={String(r.Id)}>
                        {r.Text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Designated Bed <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                  </label>
                  <select
                    value={toSelectValue(formData.BedId)}
                    onChange={(e) => handleFieldChange('BedId', e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '13px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Select Bed --</option>
                    {lookups.Bed?.map((b: any) => (
                      <option key={b.Id} value={String(b.Id)}>
                        {b.Text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                Patient will be registered as an Outpatient Emergency Consultation. Check the box above to assign an Inpatient Observation Bed.
              </div>
            )}
          </div>
        )}

        {/* Section 5: Guarantor & Payer */}
        {activeSection === 'guarantor' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px 0' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                <i className="fas fa-shield-alt" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Guarantor, Corporate & Insurance Payer
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Billing sponsor classification, insurance pre-authorization & corporate guarantees
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Guarantor Type <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                </label>
                <select
                  value={toSelectValue(formData.GuarantorTypeId)}
                  onChange={(e) => handleFieldChange('GuarantorTypeId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Select Guarantor Type --</option>
                  {lookups.GuarantorType?.map((gt: any) => (
                    <option key={gt.Id} value={String(gt.Id)}>
                      {gt.Text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Guarantor Entity / Insurance Company
                </label>
                <select
                  value={toSelectValue(formData.GuarantorId)}
                  onChange={(e) => handleFieldChange('GuarantorId', e.target.value ? Number(e.target.value) : '')}
                  style={{
                    width: '100%',
                    height: 38,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Self / Cash Paying --</option>
                  {lookups.Guarantor?.map((g: any) => (
                    <option key={g.Id} value={String(g.Id)}>
                      {g.Text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Bar (Sticky at bottom for persistent visibility across all tabs) */}
      <div
        id="aeRegistrationFooter"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 100,
          marginTop: '20px',
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: '14px 24px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left Footer Action Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => dispatch('printRegistration')}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-print" style={{ color: '#64748b' }}></i> Print Registration Slip
          </button>
          <button
            type="button"
            onClick={() => dispatch('patientidcard')}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-id-card" style={{ color: '#64748b' }}></i> Wristband / Barcode
          </button>
        </div>

        {/* Right Footer Main CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btnClear"
            type="button"
            onClick={() => dispatch('clear')}
            style={{
              backgroundColor: '#ffffff',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Form
          </button>

          <button
            id="btnSaveDraft"
            name="btnSaveDraft"
            type="button"
            onClick={handleSaveDraft}
            style={{
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-save" style={{ color: '#64748b' }}></i> Save Draft
          </button>

          <button
            id="btnSaveApprove"
            name="btnSaveApprove"
            data-testid="btnSaveApprove"
            data-id="saveAndApproveid"
            data-alias="btnApprove"
            type="button"
            onClick={handleSaveApprove}
            disabled={isSaving}
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: '1px solid #15803d',
              borderRadius: '7px',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-check-double" style={{ color: '#ffffff' }}></i>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>
              {isSaving ? 'Approving...' : 'Save & Approve (Alt+A)'}
            </span>
          </button>

          {/* Hidden helper elements matching legacy jQuery/Angular ID lookups */}
          <button
            id="saveAndApproveid"
            type="button"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
            onClick={handleSaveApprove}
            onFocus={() => {
              document.getElementById('btnSaveApprove')?.focus();
            }}
          />
          <button
            id="btnApprove"
            type="button"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
            onClick={handleSaveApprove}
            onFocus={() => {
              document.getElementById('btnSaveApprove')?.focus();
            }}
          />
        </div>
      </div>
    </div>
  );
};
