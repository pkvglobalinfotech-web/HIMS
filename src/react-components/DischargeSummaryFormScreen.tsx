import React, { useState, useEffect, useCallback, useRef } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { RichTextEditor } from './RichTextEditor';
import { apiFetch } from './utils/api';
import { APIHelper } from './utils/APIHelper';
import { alert } from './utils/alert';
import { sessionHelper } from '../services/sessionHelper';

export interface EncounterOption {
  Id: number;
  AdmissionDate?: string;
  DeathDate?: string;
  DischargeDate?: string;
  DoctorId?: number;
  DepartmentId?: number;
  WardId?: number;
  RoomId?: number;
  BedId?: number;
  GuarantorId?: number;
  AdmissionStatusId?: number;
  DischargeTypeId?: number;
  PatientId?: number;
  PatientMrn?: string;
  VisitIdentifier?: string;
  Department?: { DepartmentName?: string };
  Guarantor?: { GuarantorName?: string };
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string };
    DOB?: string;
    Mobile?: string;
  };
  Doctor?: {
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
  };
  WardMaster?: { WardName?: string };
  WardRoomMaster?: { RoomNo?: string };
  WardRoomBedMaster?: { BedNo?: string };
  WardDetail?: string;
  PatientName?: string;
  DoctorName?: string;
  Gender?: string;
  [key: string]: any;
}

export interface DischargeSummaryFormScreenProps {
  reactProps?: {
    item?: any;
    currentcontext?: any;
    lookup?: {
      DischargeType?: Array<{ Id: number | string; Text?: string; Description?: string }>;
      NoteTemplate?: Array<{ Id: number | string; Text?: string; Description?: string }>;
      NoteType?: Array<{ Id: number | string; Text?: string; Description?: string }>;
      AdmissionStatus?: Array<{ Id: number | string; Text?: string; Description?: string }>;
      [key: string]: any;
    };
    CreatedBy?: string;
    AprovedBy?: string;
    canShowSaveBtn?: boolean;
    canShowSaveactiveBtn?: boolean;
    canShowSaveandApproveBtn?: boolean;
    canprintBtn?: boolean;
    canShowreverseBtn?: boolean;
    canShowrelesedBtn?: boolean;
    [key: string]: any;
  };
  onAction?: (actionName: string, payload?: any) => void;
}

const fontSizes = (typography && (typography.fontSize || typography.fontSizes)) || {
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  xxl: '20px',
};

export const DischargeSummaryFormScreen: React.FC<DischargeSummaryFormScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Form State
  const initialItem = reactProps?.item || {};
  const [item, setItem] = useState<any>(initialItem);
  const [createdByText, setCreatedByText] = useState<string>(reactProps?.CreatedBy || '');
  const [approvedByText, setApprovedByText] = useState<string>(reactProps?.AprovedBy || '');

  // Lookups
  const [dischargeTypes, setDischargeTypes] = useState<Array<{ Id: number | string; Text: string }>>(
    reactProps?.lookup?.DischargeType?.map((d: any) => ({ Id: d.Id, Text: d.Text || d.Description || '' })) || [
      { Id: 1, Text: 'Normal Discharge' },
      { Id: 2, Text: 'Death / Expired' },
      { Id: 3, Text: 'LAMA (Left Against Medical Advice)' },
      { Id: 4, Text: 'Absconded' },
      { Id: 5, Text: 'Transfer to Other Hospital' },
      { Id: 6, Text: 'Referral' },
    ]
  );
  const [noteTemplates, setNoteTemplates] = useState<Array<{ Id: number | string; Text: string }>>(
    reactProps?.lookup?.NoteTemplate?.map((t: any) => ({ Id: t.Id, Text: t.Text || t.Description || '' })) || []
  );

  // Content state for editor
  const [contentHtml, setContentHtml] = useState<string>(item?.DataTemplate || '');
  const [addonHtml, setAddonHtml] = useState<string>('');

  // Search Encounter / Patient
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<EncounterOption[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmVariant: 'primary' | 'danger' | 'warning' | 'success';
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'primary',
    action: () => {},
  });

  // Loading state
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Keep hybrid props in sync
  useEffect(() => {
    if (reactProps?.item) {
      setItem(reactProps.item);
      if (reactProps.item.DataTemplate !== undefined) {
        setContentHtml(reactProps.item.DataTemplate);
      }
    }
    if (reactProps?.CreatedBy) setCreatedByText(reactProps.CreatedBy);
    if (reactProps?.AprovedBy) setApprovedByText(reactProps.AprovedBy);
    if (reactProps?.lookup?.DischargeType) {
      setDischargeTypes(
        reactProps.lookup.DischargeType.map((d: any) => ({ Id: d.Id, Text: d.Text || d.Description || '' }))
      );
    }
    if (reactProps?.lookup?.NoteTemplate) {
      setNoteTemplates(
        reactProps.lookup.NoteTemplate.map((t: any) => ({ Id: t.Id, Text: t.Text || t.Description || '' }))
      );
    }
  }, [reactProps]);

  // Load standalone lookups if not hybrid
  useEffect(() => {
    if (!isHybrid) {
      const loadLookups = async () => {
        try {
          const res: any = await apiFetch('General/Options/getoptions', [
            { Key: 'DischargeType' },
            { Key: 'NoteType' },
            { Key: 'AdmissionStatus' },
            { Key: 'NoteTemplate', Request: { Params: [{ Key: 1, Value: 1 }] } },
          ]);
          if (res?.DischargeType) {
            setDischargeTypes(
              res.DischargeType.map((d: any) => ({ Id: d.Id, Text: d.Text || d.Description || '' }))
            );
          }
          if (res?.NoteTemplate) {
            setNoteTemplates(
              res.NoteTemplate.map((t: any) => ({ Id: t.Id, Text: t.Text || t.Description || '' }))
            );
          }
        } catch (e) {
          console.warn('Could not load standalone options', e);
        }
      };
      loadLookups();
    }
  }, [isHybrid]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search encounters for IP patients
  const handleSearchPatient = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const facilityId = sessionHelper.getFacilityId() || 1;
      const res: any = await apiFetch('Visit/Visit/GetEncounters', {
        Params: [
          { Key: 15, Value: 2 }, // EncounterTypeId = 2 (IP)
          { Key: 38, Value: [2, 3, 4, 5, 6] }, // Inpatient statuses
          { Key: 1, Value: facilityId },
          { Key: 11, Value: query.trim() }, // Search query
        ],
        PageContext: { PageSize: 15, PageNumber: 1 },
      });
      const encounters: EncounterOption[] = (res?.Data || []).map((enc: any) => {
        const p = enc.Patient || {};
        const title = p.Title?.Description || '';
        const pName = [title, p.FirstName, p.LastName].filter(Boolean).join(' ');
        const docTitle = enc.Doctor?.Title?.Description || '';
        const dName = [docTitle, enc.Doctor?.FirstName, enc.Doctor?.LastName].filter(Boolean).join(' ');
        let wardStr = enc.WardMaster?.WardName || '';
        if (enc.WardRoomMaster?.RoomNo) wardStr += ' / ' + enc.WardRoomMaster.RoomNo;
        if (enc.WardRoomBedMaster?.BedNo) wardStr += ' / ' + enc.WardRoomBedMaster.BedNo;

        return {
          ...enc,
          PatientName: pName || 'Unnamed Patient',
          DoctorName: dName || 'Unassigned',
          WardDetail: wardStr || 'General Ward',
          Gender: p.Gender?.Description || '',
          Age: p.Age || '—',
          PatientMrn: p.MRN || enc.PatientMrn || '',
          VisitIdentifier: enc.VisitIdentifier || '',
          GuarantorName: enc.Guarantor?.GuarantorName || 'Self',
        };
      });
      setSearchResults(encounters);
      setShowSearchDropdown(true);
    } catch (err) {
      console.error('Error searching encounters', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Select an encounter from search
  const handleSelectEncounter = (enc: EncounterOption) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (isHybrid) {
      onAction?.('patientChange', enc);
    } else {
      const newItem = {
        ...item,
        EncounterId: enc.Id,
        PatientId: enc.PatientId,
        PatientMrn: enc.PatientMrn,
        VisitIdentifier: enc.VisitIdentifier,
        PatientName: enc.PatientName,
        Age: enc.Age,
        Gender: enc.Gender,
        DoctorName: enc.DoctorName,
        DepartmentName: enc.Department?.DepartmentName || '',
        WardDetail: enc.WardDetail,
        AdmissionDate: enc.AdmissionDate,
        DischargeDate: enc.DischargeDate || new Date().toISOString(),
        GuarantorName: enc.GuarantorName,
        DischargeTypeId: enc.DischargeTypeId || 1,
        CertificateStatusId: 2, // Draft
      };
      setItem(newItem);
    }
  };

  // Editor content changes
  const handleContentChange = (html: string) => {
    setContentHtml(html);
    if (isHybrid) {
      onAction?.('contentChange', html);
    } else {
      setItem((prev: any) => ({ ...prev, DataTemplate: html }));
    }
  };

  // Template change
  const handleTemplateChange = async (templateId: number | string) => {
    const tid = Number(templateId);
    if (isHybrid) {
      onAction?.('templateChange', tid);
    } else {
      setItem((prev: any) => ({ ...prev, NoteTemplateId: tid }));
      if (tid > 0) {
        try {
          const res: any = await apiFetch('clinicalmaster/NoteTemplate/GetNoteTemplateById', { Id: tid });
          if (res?.DataTemplate) {
            setContentHtml(res.DataTemplate);
            setItem((prev: any) => ({ ...prev, DataTemplate: res.DataTemplate }));
          }
        } catch (e) {
          console.error('Error fetching template', e);
        }
      }
    }
  };

  // Discharge type change
  const handleDischargeTypeChange = (dtId: number | string) => {
    const val = Number(dtId);
    if (isHybrid) {
      onAction?.('dischargeTypeChange', val);
    } else {
      setItem((prev: any) => ({ ...prev, DischargeTypeId: val }));
    }
  };

  // Discharge date change
  const handleDischargeDateChange = (val: string) => {
    if (isHybrid) {
      onAction?.('dischargeDateChange', val);
    } else {
      setItem((prev: any) => ({ ...prev, DischargeDate: val }));
    }
  };

  // Death date change
  const handleDeathDateChange = (val: string) => {
    if (isHybrid) {
      onAction?.('deathDateChange', val);
    } else {
      setItem((prev: any) => ({ ...prev, DeathDate: val }));
    }
  };

  // Actions
  const handleBack = () => {
    if (isHybrid) {
      onAction?.('back');
    } else {
      window.history.back();
    }
  };

  const handlePrintWithHeader = () => {
    if (isHybrid) {
      onAction?.('printWithHeader');
    } else if (item.EncounterId) {
      APIHelper.doDownload({
        action: 'DischargeSummary/patientcertificate/PrintPatientCertificate',
        data: { Id: item.EncounterId },
      });
    }
  };

  const handlePrintWithoutHeader = () => {
    if (isHybrid) {
      onAction?.('printWithoutHeader');
    } else if (item.EncounterId) {
      APIHelper.doDownload({
        action: 'DischargeSummary/patientcertificate/PrintPatientCertificatewithoutheader',
        data: { Id: item.EncounterId },
      });
    }
  };

  const handleLabResults = () => {
    if (isHybrid) {
      onAction?.('labresult');
    } else if (item.EncounterId) {
      APIHelper.doDownload({
        action: 'emr/patientorder/PrintConsolidatedLabResult',
        data: { Id: item.EncounterId },
      });
    }
  };

  const handleRadiologyResults = () => {
    if (isHybrid) {
      onAction?.('radiologyresult');
    } else if (item.EncounterId) {
      APIHelper.doDownload({
        action: 'emr/patientorder/PrintConsolidatedRadiologyResult',
        data: { Id: item.EncounterId },
      });
    }
  };

  const handleSaveDraft = async () => {
    if (isHybrid) {
      onAction?.('save');
    } else {
      setIsSaving(true);
      try {
        const payload = { ...item, DataTemplate: contentHtml, CertificateStatusId: 2 };
        const actionUrl = item.Id > 0
          ? 'dischargesummary/PatientCertificate/UpdatePatientCertificate'
          : 'dischargesummary/PatientCertificate/AddPatientCertificate';
        await apiFetch(actionUrl, { Data: payload });
        alert.showSuccessMsg('Discharge summary saved as draft.');
      } catch (e) {
        alert.showErrorMsg('Failed to save discharge summary.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveAndActive = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Save & Activate Discharge Summary',
      message: 'Are you sure you want to activate this discharge summary? It will be ready for physician review.',
      confirmText: 'Activate',
      confirmVariant: 'primary',
      action: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (isHybrid) {
          onAction?.('saveandactive');
        } else {
          setIsSaving(true);
          const payload = { ...item, DataTemplate: contentHtml, CertificateStatusId: 1 };
          const actionUrl = item.Id > 0
            ? 'dischargesummary/PatientCertificate/UpdatePatientCertificate'
            : 'dischargesummary/PatientCertificate/AddPatientCertificate';
          apiFetch(actionUrl, { Data: payload })
            .then(() => alert.showSuccessMsg('Discharge summary activated.'))
            .catch(() => alert.showErrorMsg('Failed to activate summary.'))
            .finally(() => setIsSaving(false));
        }
      },
    });
  };

  const handleApprove = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Discharge Summary',
      message: 'Are you sure you want to approve and sign this discharge summary? Once approved, clinical content will be locked.',
      confirmText: 'Approve & Lock',
      confirmVariant: 'success',
      action: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (isHybrid) {
          onAction?.('approve');
        } else {
          setIsSaving(true);
          const payload = {
            ...item,
            DataTemplate: contentHtml,
            CertificateStatusId: 3,
            AprovedBy: sessionHelper.getUserId(),
            ApprovedOn: new Date().toISOString(),
          };
          const actionUrl = item.Id > 0
            ? 'dischargesummary/PatientCertificate/UpdatePatientCertificate'
            : 'dischargesummary/PatientCertificate/AddPatientCertificate';
          apiFetch(actionUrl, { Data: payload })
            .then(() => alert.showSuccessMsg('Discharge summary approved and locked.'))
            .catch(() => alert.showErrorMsg('Failed to approve summary.'))
            .finally(() => setIsSaving(false));
        }
      },
    });
  };

  const handleReverse = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reverse Discharge Summary to Draft',
      message: 'Are you sure you want to reverse this approved summary back to draft? This will re-enable editing.',
      confirmText: 'Reverse to Draft',
      confirmVariant: 'warning',
      action: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (isHybrid) {
          onAction?.('reverse');
        } else {
          setIsSaving(true);
          const payload = { ...item, CertificateStatusId: 2 };
          apiFetch('dischargesummary/PatientCertificate/UpdatePatientCertificate', { Data: payload })
            .then(() => alert.showSuccessMsg('Summary reversed to draft.'))
            .catch(() => alert.showErrorMsg('Failed to reverse summary.'))
            .finally(() => setIsSaving(false));
        }
      },
    });
  };

  const handleRelease = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Release Discharge Summary to Patient',
      message: 'Are you sure you want to mark this summary as Released to Patient? This certifies that the patient received their discharge document.',
      confirmText: 'Release Document',
      confirmVariant: 'primary',
      action: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (isHybrid) {
          onAction?.('release');
        } else {
          setIsSaving(true);
          const payload = {
            ...item,
            CertificateStatusId: 5,
            ReleasedBy: sessionHelper.getUserId(),
            ReleasedOn: new Date().toISOString(),
            ReleasedToPatient: 1,
          };
          apiFetch('dischargesummary/PatientCertificate/UpdatePatientCertificate', { Data: payload })
            .then(() => alert.showSuccessMsg('Discharge summary released to patient.'))
            .catch(() => alert.showErrorMsg('Failed to release summary.'))
            .finally(() => setIsSaving(false));
        }
      },
    });
  };

  // Formatting helpers
  const formatDateDisplay = (dateVal: any) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(dateVal);
    }
  };

  // Status configuration
  const statusId = Number(item?.CertificateStatusId ?? 2);
  const isApproved = statusId === 3;
  const isReleased = statusId === 5;
  const isCompleted = item?.isCompleted || isApproved || isReleased;

  const getStatusBadge = () => {
    switch (statusId) {
      case 1:
        return { label: 'Active Draft', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: 'fa-file-alt' };
      case 2:
        return { label: 'Draft', bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: 'fa-pencil-alt' };
      case 3:
        return { label: 'Approved & Signed', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: 'fa-check-circle' };
      case 4:
        return { label: 'Cancelled', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: 'fa-times-circle' };
      case 5:
        return { label: 'Released to Patient', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', icon: 'fa-user-check' };
      default:
        return { label: 'Draft', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: 'fa-file' };
    }
  };
  const statusBadge = getStatusBadge();

  // Visibility Flags from hybrid props or calculated
  const canShowSaveBtn = reactProps?.canShowSaveBtn !== undefined ? reactProps.canShowSaveBtn : !isCompleted;
  const canShowSaveactiveBtn = reactProps?.canShowSaveactiveBtn !== undefined ? reactProps.canShowSaveactiveBtn : (!isCompleted && statusId === 2);
  const canShowSaveandApproveBtn = reactProps?.canShowSaveandApproveBtn !== undefined ? reactProps.canShowSaveandApproveBtn : (!isApproved && !isReleased);
  const canprintBtn = reactProps?.canprintBtn !== undefined ? reactProps.canprintBtn : (statusId !== 2 || item.EncounterId > 0);
  const canShowreverseBtn = reactProps?.canShowreverseBtn !== undefined ? reactProps.canShowreverseBtn : isApproved;
  const canShowrelesedBtn = reactProps?.canShowrelesedBtn !== undefined ? reactProps.canShowrelesedBtn : isApproved;

  // Insert standard clinical snippet into Quill editor
  const insertSnippet = (snippetHtml: string) => {
    setAddonHtml(snippetHtml);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
        padding: spacing.xl,
        backgroundColor: colors.background.secondary,
        minHeight: '100%',
        boxSizing: 'border-box',
        fontFamily: typography.fontFamily,
      }}
    >
      {/* ──────────────── Top Navigation & Header ──────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.md,
          background: colors.surface,
          padding: `${spacing.md}px ${spacing.xl}px`,
          borderRadius: radii.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.border.subtle}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              backgroundColor: colors.background.tertiary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.md,
              color: colors.text.primary,
              fontSize: fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = colors.border.subtle)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.background.tertiary)}
          >
            <i className="fas fa-arrow-left" />
            <span>Back to List</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: fontSizes.xl,
                  fontWeight: 700,
                  color: colors.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <i className="fas fa-file-medical-alt" style={{ color: colors.primary }} />
                Discharge Summary Document
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: radii.full,
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.color,
                  border: `1px solid ${statusBadge.border}`,
                }}
              >
                <i className={`fas ${statusBadge.icon}`} />
                {statusBadge.label}
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: fontSizes.xs,
                color: colors.text.secondary,
              }}
            >
              Inpatient EMR / Medical Certificates / Electronic Clinical Discharge Summary
            </p>
          </div>
        </div>

        {/* Patient Autosearch Header Box */}
        <div ref={searchContainerRef} style={{ position: 'relative', width: 340 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: colors.background.secondary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.lg,
              padding: '6px 12px',
              transition: 'all 0.2s',
            }}
          >
            <i className="fas fa-search" style={{ color: colors.text.tertiary, marginRight: 8 }} />
            <input
              type="text"
              placeholder="Search Inpatient (Name, MRN, Bed, IP#)..."
              value={searchQuery}
              onChange={(e) => handleSearchPatient(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDropdown(true);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: fontSizes.sm,
                color: colors.text.primary,
              }}
            />
            {isSearching && (
              <i className="fas fa-spinner fa-spin" style={{ color: colors.primary, marginLeft: 6 }} />
            )}
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: colors.text.tertiary,
                  padding: 2,
                }}
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                boxShadow: shadows.lg,
                border: `1px solid ${colors.border.subtle}`,
                zIndex: 999,
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: colors.text.secondary,
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  backgroundColor: colors.background.secondary,
                }}
              >
                Active Inpatients ({searchResults.length})
              </div>
              {searchResults.map((res) => (
                <div
                  key={res.Id}
                  onClick={() => handleSelectEncounter(res)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = colors.primaryLight)}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: colors.text.primary, fontSize: 13 }}>
                      {res.PatientName}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: radii.sm,
                        backgroundColor: colors.background.tertiary,
                        color: colors.text.secondary,
                        fontWeight: 600,
                      }}
                    >
                      {res.PatientMrn || 'No MRN'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      fontSize: 11,
                      color: colors.text.secondary,
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      <i className="fas fa-bed" style={{ marginRight: 4, color: colors.primary }} />
                      {res.WardDetail}
                    </span>
                    <span>
                      <i className="fas fa-user-md" style={{ marginRight: 4 }} />
                      {res.DoctorName}
                    </span>
                    <span>
                      <i className="fas fa-file-invoice" style={{ marginRight: 4 }} />
                      {res.VisitIdentifier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── Patient & Encounter Clinical Banner ──────────────── */}
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: spacing.lg,
            padding: spacing.lg,
          }}
        >
          {/* Column 1: Patient Identity */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
              borderRight: `1px solid ${colors.border.subtle}`,
              paddingRight: spacing.lg,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: 4 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radii.full,
                  backgroundColor: colors.primaryLight,
                  color: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {item.PatientName ? item.PatientName.charAt(0).toUpperCase() : <i className="fas fa-user" />}
              </div>
              <div>
                <div style={{ fontSize: fontSizes.md, fontWeight: 700, color: colors.text.primary }}>
                  {item.PatientName || 'No Patient Selected'}
                </div>
                <div style={{ fontSize: fontSizes.xs, color: colors.text.secondary }}>
                  {item.Age ? `${item.Age} Yrs` : '—'} &bull; {item.Gender || '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>UHID / MRN:</span>
              <span style={{ fontWeight: 700, color: colors.text.primary, fontFamily: 'monospace' }}>
                {item.PatientMrn || item.Mrn || '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>IP / Visit #:</span>
              <span style={{ fontWeight: 700, color: colors.primary, fontFamily: 'monospace' }}>
                {item.VisitIdentifier || '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Ward / Room / Bed:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>
                <i className="fas fa-procedures" style={{ color: colors.primary, marginRight: 4 }} />
                {item.WardDetail || '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Admission Date:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>
                {formatDateDisplay(item.AdmissionDate)}
              </span>
            </div>
          </div>

          {/* Column 2: Clinical Team & Dates */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
              borderRight: `1px solid ${colors.border.subtle}`,
              paddingRight: spacing.lg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Attending Doctor:</span>
              <span style={{ fontWeight: 700, color: colors.text.primary }}>
                <i className="fas fa-user-md" style={{ color: colors.accent, marginRight: 4 }} />
                {item.DoctorName || '—'}&nbsp;
                {item.DepartmentName ? `(${item.DepartmentName})` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Date of Discharge:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  value={
                    item.DischargeDate
                      ? new Date(item.DischargeDate).toISOString().split('T')[0]
                      : new Date().toISOString().split('T')[0]
                  }
                  disabled={isCompleted}
                  onChange={(e) => handleDischargeDateChange(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: radii.md,
                    fontSize: fontSizes.xs,
                    color: colors.text.primary,
                    background: isCompleted ? colors.background.tertiary : colors.surface,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Payer / Guarantor:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>
                <i className="fas fa-shield-alt" style={{ color: colors.gold, marginRight: 4 }} />
                {item.GuarantorName || 'Self / Private'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Created Date:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>
                {formatDateDisplay(item.CreatedAt)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizes.xs }}>
              <span style={{ color: colors.text.secondary, fontWeight: 600 }}>Approved Date:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>
                {formatDateDisplay(item.ApprovedOn)}
              </span>
            </div>
          </div>

          {/* Column 3: Discharge Configuration & Audit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
                Discharge Type:
              </label>
              <select
                value={item.DischargeTypeId ?? 1}
                disabled={isCompleted}
                onChange={(e) => handleDischargeTypeChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border.default}`,
                  fontSize: fontSizes.xs,
                  fontWeight: 600,
                  color: colors.text.primary,
                  background: isCompleted ? colors.background.tertiary : colors.surface,
                }}
              >
                {dischargeTypes.map((dt) => (
                  <option key={dt.Id} value={dt.Id}>
                    {dt.Text}
                  </option>
                ))}
              </select>
            </div>

            {/* Note Template selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
                Clinical Note Template:
              </label>
              <select
                value={item.NoteTemplateId ?? -1}
                disabled={isCompleted}
                onChange={(e) => handleTemplateChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border.default}`,
                  fontSize: fontSizes.xs,
                  fontWeight: 600,
                  color: colors.text.primary,
                  background: isCompleted ? colors.background.tertiary : colors.surface,
                }}
              >
                <option value={-1}>-- Select Standard Template --</option>
                {noteTemplates.map((nt) => (
                  <option key={nt.Id} value={nt.Id}>
                    {nt.Text}
                  </option>
                ))}
              </select>
            </div>

            {/* Death Date if DischargeTypeId == 2 */}
            {Number(item.DischargeTypeId) === 2 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: '#fef2f2',
                  padding: '6px 10px',
                  borderRadius: radii.md,
                  border: '1px solid #fecaca',
                }}
              >
                <label style={{ fontSize: fontSizes.xs, fontWeight: 700, color: '#991b1b' }}>
                  Death Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={item.DeathDate ? item.DeathDate.substring(0, 16) : ''}
                  disabled={isCompleted}
                  onChange={(e) => handleDeathDateChange(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: radii.sm,
                    border: '1px solid #fca5a5',
                    fontSize: fontSizes.xs,
                    color: '#991b1b',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: colors.text.secondary }}>Created By:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>{createdByText || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: colors.text.secondary }}>Approved By:</span>
              <span style={{ fontWeight: 600, color: colors.text.primary }}>{approvedByText || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── Clinical Content & Quick Snippets Bar ──────────────── */}
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.sm,
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: fontSizes.sm, fontWeight: 700, color: colors.text.primary }}>
              <i className="fas fa-edit" style={{ marginRight: 6, color: colors.primary }} />
              Clinical Summary Narrative:
            </span>
            {isCompleted && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: radii.sm,
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.secondary,
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-lock" style={{ marginRight: 4 }} /> Read-Only
              </span>
            )}
          </div>

          {/* Quick Insert Snippet Buttons */}
          {!isCompleted && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  insertSnippet(
                    '<h4><strong>CLINICAL COURSE IN HOSPITAL:</strong></h4><p>Patient was admitted under stable hemodynamics. Course of treatment was monitored daily with regular progress evaluations and favorable recovery.</p>'
                  )
                }
                style={{
                  padding: '4px 10px',
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radii.md,
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.text.primary,
                  cursor: 'pointer',
                }}
              >
                + Insert Course
              </button>
              <button
                type="button"
                onClick={() =>
                  insertSnippet(
                    '<h4><strong>CONDITION AT DISCHARGE:</strong></h4><p>Patient is hemodynamically stable, afebrile, and tolerating oral intake well. Vitals within normal limits.</p>'
                  )
                }
                style={{
                  padding: '4px 10px',
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radii.md,
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.text.primary,
                  cursor: 'pointer',
                }}
              >
                + Condition at Discharge
              </button>
              <button
                type="button"
                onClick={() =>
                  insertSnippet(
                    '<h4><strong>DISCHARGE MEDICATIONS &amp; ADVICE:</strong></h4><p>1. Follow standard medication instructions.<br>2. Low-salt, balanced nutrition diet.<br>3. Report immediately if acute symptoms recur.</p>'
                  )
                }
                style={{
                  padding: '4px 10px',
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radii.md,
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.text.primary,
                  cursor: 'pointer',
                }}
              >
                + Discharge Advice
              </button>
              <button
                type="button"
                onClick={() =>
                  insertSnippet(
                    '<h4><strong>FOLLOW-UP APPOINTMENT:</strong></h4><p>Review in OPD after 7 days or SOS in Emergency Room if any warning signs arise.</p>'
                  )
                }
                style={{
                  padding: '4px 10px',
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radii.md,
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.text.primary,
                  cursor: 'pointer',
                }}
              >
                + Follow-up Review
              </button>
            </div>
          )}
        </div>

        {/* Embedded Quill v2 Modern RichTextEditor */}
        <div style={{ marginTop: 4 }}>
          <RichTextEditor
            richtext={contentHtml}
            onContentChange={handleContentChange}
            readonly={isCompleted}
            insertHtml={addonHtml}
            onInsertHtmlDone={() => setAddonHtml('')}
            height={440}
            placeholder="Type or dictate the comprehensive inpatient discharge summary, clinical findings, investigations, hospital course, and post-discharge advice here..."
          />
        </div>
      </div>

      {/* ──────────────── Bottom Action Command Bar ──────────────── */}
      <div
        style={{
          position: 'sticky',
          bottom: spacing.lg,
          zIndex: 100,
          background: colors.surface,
          borderRadius: radii.xl,
          padding: `${spacing.md}px ${spacing.xl}px`,
          boxShadow: shadows.lg,
          border: `1px solid ${colors.border.subtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        {/* Left Side: Navigation & Reports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: colors.background.tertiary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.md,
              color: colors.text.primary,
              fontSize: fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <i className="fas fa-chevron-left" />
            Back
          </button>

          {canprintBtn && (
            <>
              <button
                type="button"
                onClick={handlePrintWithHeader}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.md,
                  color: colors.text.primary,
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Print Summary with Hospital Letterhead"
              >
                <i className="fas fa-print" style={{ color: colors.primary }} />
                With Header
              </button>

              <button
                type="button"
                onClick={handlePrintWithoutHeader}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.md,
                  color: colors.text.primary,
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Print Summary on Pre-printed Stationary"
              >
                <i className="fas fa-file-alt" style={{ color: colors.text.secondary }} />
                Without Header
              </button>

              <button
                type="button"
                onClick={handleLabResults}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.md,
                  color: colors.text.primary,
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Download Consolidated Laboratory Results"
              >
                <i className="fas fa-flask" style={{ color: colors.accent }} />
                Lab Results
              </button>

              <button
                type="button"
                onClick={handleRadiologyResults}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.md,
                  color: colors.text.primary,
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Download Consolidated Radiology Reports"
              >
                <i className="fas fa-x-ray" style={{ color: colors.gold }} />
                Radiology Results
              </button>
            </>
          )}

          {canShowreverseBtn && (
            <button
              type="button"
              onClick={handleReverse}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: radii.md,
                color: '#b45309',
                fontSize: fontSizes.sm,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Reverse to Draft to enable edits"
            >
              <i className="fas fa-undo-alt" />
              Reverse to Draft
            </button>
          )}

          {canShowrelesedBtn && (
            <button
              type="button"
              onClick={handleRelease}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: radii.md,
                color: '#6b21a8',
                fontSize: fontSizes.sm,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Release Document to Patient"
            >
              <i className="fas fa-user-check" />
              Release to Patient
            </button>
          )}
        </div>

        {/* Right Side: Saving & Workflow Transitions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {canShowSaveBtn && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: radii.md,
                color: colors.text.primary,
                fontSize: fontSizes.sm,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <i className="fas fa-save" style={{ color: colors.primary }} />
              Save Draft
            </button>
          )}

          {canShowSaveactiveBtn && (
            <button
              type="button"
              onClick={handleSaveAndActive}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                backgroundColor: colors.primaryLight,
                border: `1px solid ${colors.primaryMid}`,
                borderRadius: radii.md,
                color: colors.primaryHover,
                fontSize: fontSizes.sm,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <i className="fas fa-check" />
              Save &amp; Active
            </button>
          )}

          {canShowSaveandApproveBtn && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 22px',
                backgroundColor: '#059669',
                border: 'none',
                borderRadius: radii.md,
                color: '#ffffff',
                fontSize: fontSizes.sm,
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <i className="fas fa-stamp" />
              Approve &amp; Sign
            </button>
          )}
        </div>
      </div>

      {/* ──────────────── Confirmation Modal ──────────────── */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: spacing.md,
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
              maxWidth: 460,
              width: '100%',
              boxShadow: shadows.xl,
              border: `1px solid ${colors.border.subtle}`,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.full,
                  backgroundColor:
                    confirmModal.confirmVariant === 'success'
                      ? '#ecfdf5'
                      : confirmModal.confirmVariant === 'warning'
                      ? '#fffbeb'
                      : colors.primaryLight,
                  color:
                    confirmModal.confirmVariant === 'success'
                      ? '#059669'
                      : confirmModal.confirmVariant === 'warning'
                      ? '#b45309'
                      : colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <i
                  className={`fas ${
                    confirmModal.confirmVariant === 'success'
                      ? 'fa-stamp'
                      : confirmModal.confirmVariant === 'warning'
                      ? 'fa-exclamation-triangle'
                      : 'fa-info-circle'
                  }`}
                />
              </div>
              <h3 style={{ margin: 0, fontSize: fontSizes.lg, fontWeight: 700, color: colors.text.primary }}>
                {confirmModal.title}
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: fontSizes.sm, color: colors.text.secondary, lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.background.tertiary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radii.md,
                  color: colors.text.primary,
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.action}
                style={{
                  padding: '8px 20px',
                  backgroundColor:
                    confirmModal.confirmVariant === 'success'
                      ? '#059669'
                      : confirmModal.confirmVariant === 'warning'
                      ? '#d97706'
                      : colors.primary,
                  border: 'none',
                  borderRadius: radii.md,
                  color: '#ffffff',
                  fontSize: fontSizes.sm,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
