import React, { useState, useEffect, useRef } from 'react';
import './NewPatientRegisterModalScreen.css';

export interface LookupItem {
  Id: number;
  Text: string;
  GuarantorTypeId?: number;
}

export interface NewPatientItem {
  Id?: number;
  PatientId?: number;
  TitleId?: number;
  FirstName?: string;
  LastName?: string;
  Age?: string | number;
  GenderId?: number;
  Mobile?: string;
  AddressLine1?: string;
  DoctorId?: number;
  Comments?: string;
  MRN?: string;
  GuarantorId?: number;
  PatientLocation?: string;
  EncounterTypeId?: number;
  AlternateMobileNum?: string;
  Email?: string;
  DOB?: string | Date;
  ApproxAgeDays?: string | number;
  ApproxAgeMonths?: string | number;
  PhotoPath?: string;
  iswebcamphoto?: boolean;
  webcamphoto?: string;
  [key: string]: any;
}

export interface NewPatientRegisterModalScreenProps {
  reactProps?: {
    item?: NewPatientItem;
    lookup?: {
      Title?: LookupItem[];
      Gender?: LookupItem[];
      Guarantor?: LookupItem[];
      EncounterType?: LookupItem[];
      [key: string]: any;
    };
    currentcontext?: {
      pid?: number;
      eid?: number;
      Photo?: string;
      file?: any;
      isSaving?: boolean;
    };
  };
  onAction?: (actionName: string, payload?: any) => void;
}

function formatDateString(d?: string | Date | null): string {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const NewPatientRegisterModalScreen: React.FC<NewPatientRegisterModalScreenProps> = ({
  reactProps,
  onAction
}) => {
  const item = reactProps?.item || {};
  const lookup = reactProps?.lookup || {};
  const currentcontext = reactProps?.currentcontext || {};

  // Local form state initialized from props
  const [form, setForm] = useState<NewPatientItem>({
    TitleId: item.TitleId,
    FirstName: item.FirstName || '',
    LastName: item.LastName || '',
    Age: item.Age ?? '',
    GenderId: item.GenderId,
    Mobile: item.Mobile || '',
    AddressLine1: item.AddressLine1 || '',
    DoctorId: item.DoctorId,
    Comments: item.Comments || '',
    MRN: item.MRN || '',
    GuarantorId: item.GuarantorId || 1,
    PatientLocation: item.PatientLocation || '',
    EncounterTypeId: item.EncounterTypeId || 1,
    AlternateMobileNum: item.AlternateMobileNum || '',
    Email: item.Email || '',
    DOB: formatDateString(item.DOB),
    ApproxAgeDays: item.ApproxAgeDays || '',
    ApproxAgeMonths: item.ApproxAgeMonths || '',
    PhotoPath: item.PhotoPath || '',
    iswebcamphoto: item.iswebcamphoto || false,
    webcamphoto: item.webcamphoto || ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when external props update
  useEffect(() => {
    if (reactProps?.item) {
      setForm((prev) => ({
        ...prev,
        TitleId: reactProps.item?.TitleId,
        FirstName: reactProps.item?.FirstName || '',
        LastName: reactProps.item?.LastName || '',
        Age: reactProps.item?.Age ?? '',
        GenderId: reactProps.item?.GenderId,
        Mobile: reactProps.item?.Mobile || '',
        AddressLine1: reactProps.item?.AddressLine1 || '',
        DoctorId: reactProps.item?.DoctorId,
        Comments: reactProps.item?.Comments || '',
        MRN: reactProps.item?.MRN || '',
        GuarantorId: reactProps.item?.GuarantorId || 1,
        PatientLocation: reactProps.item?.PatientLocation || '',
        EncounterTypeId: reactProps.item?.EncounterTypeId || 1,
        AlternateMobileNum: reactProps.item?.AlternateMobileNum || '',
        Email: reactProps.item?.Email || '',
        DOB: formatDateString(reactProps.item?.DOB),
        ApproxAgeDays: reactProps.item?.ApproxAgeDays || '',
        ApproxAgeMonths: reactProps.item?.ApproxAgeMonths || '',
        PhotoPath: reactProps.item?.PhotoPath || '',
        iswebcamphoto: reactProps.item?.iswebcamphoto || false,
        webcamphoto: reactProps.item?.webcamphoto || ''
      }));
    }
  }, [reactProps?.item]);

  const handleChange = (field: keyof NewPatientItem, value: any) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-fill gender on Title change
      if (field === 'TitleId') {
        const valNum = Number(value);
        if (valNum === 10 || valNum === 37) { // 10: Mr, 37: Master
          updated.GenderId = 1; // Male
        } else if (valNum === 11 || valNum === 12 || valNum === 5) { // 11: Mrs, 12: Ms, 5: Miss
          updated.GenderId = 2; // Female
        }
      }

      // Auto calculate DOB when age changes
      if (field === 'Age') {
        const ageNum = parseInt(value, 10);
        if (!isNaN(ageNum) && ageNum >= 0) {
          const now = new Date();
          now.setFullYear(now.getFullYear() - ageNum);
          updated.DOB = formatDateString(now);
        }
      }

      // Auto calculate Age when DOB changes
      if (field === 'DOB') {
        if (value) {
          const dobDate = new Date(value);
          if (!isNaN(dobDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - dobDate.getFullYear();
            const m = today.getMonth() - dobDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
              age--;
            }
            updated.Age = Math.max(0, age);
          }
        }
      }

      return updated;
    });

    // Clear validation error on change
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }

    if (onAction) {
      onAction('fieldChange', { field, value });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.TitleId) errors.TitleId = 'Title is required';
    if (!form.FirstName || !form.FirstName.trim()) errors.FirstName = 'Patient Name is required';
    if (form.Age === '' || form.Age === null || form.Age === undefined) errors.Age = 'Age is required';
    if (!form.GenderId) errors.GenderId = 'Gender is required';
    if (!form.Mobile || !form.Mobile.trim()) {
      errors.Mobile = 'Mobile number is required';
    } else if (form.Mobile.trim().length !== 10) {
      errors.Mobile = 'Mobile number must be 10 digits';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (onAction) {
      onAction('saveAndApprove', form);
    }
  };

  const handleCancel = () => {
    if (onAction) {
      onAction('cancel');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onAction) {
        onAction('photoFileChanged', { file });
      }
    }
  };

  const handleWebCam = () => {
    if (onAction) {
      onAction('openWebCam');
    }
  };

  const handleClearImage = () => {
    setForm((prev) => ({
      ...prev,
      PhotoPath: '',
      iswebcamphoto: false,
      webcamphoto: ''
    }));
    if (onAction) {
      onAction('clearImage');
    }
  };

  // Image display logic
  let previewSrc: string | null = null;
  if (currentcontext.file && typeof window !== 'undefined' && (window as any).URL) {
    try {
      previewSrc = (window as any).URL.createObjectURL(currentcontext.file);
    } catch {
      previewSrc = null;
    }
  } else if (form.iswebcamphoto && form.webcamphoto) {
    previewSrc = form.webcamphoto.startsWith('data:') ? form.webcamphoto : `data:image/png;base64,${form.webcamphoto}`;
  } else if (currentcontext.Photo) {
    previewSrc = currentcontext.Photo.startsWith('data:') ? currentcontext.Photo : `data:image/png;base64,${currentcontext.Photo}`;
  }

  const isEditing = Boolean(currentcontext.pid && currentcontext.pid > 0);

  return (
    <div className="patient-modal-container">
      {/* ─────────────────────────────────────────────────────────────
          1. MODAL HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="patient-modal-header">
        <div className="modal-header-left">
          <div className="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h3>{isEditing ? 'Edit Patient Demographic' : 'Patient Registration'}</h3>
              {form.MRN && <span className="modal-header-uhid-badge">{form.MRN}</span>}
            </div>
            <p>Fill in patient registration and demographic details</p>
          </div>
        </div>

        <button
          type="button"
          className="btn-modal-close"
          onClick={handleCancel}
          title="Close dialog"
        >
          ✕
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SCROLLABLE FORM BODY
      ───────────────────────────────────────────────────────────── */}
      <div className="patient-modal-body">
        <div className="modal-form-grid">
          {/* Title */}
          <div className="modal-field">
            <label htmlFor="modal_title">
              <span>Title</span>
              <span className="req-star">*</span>
            </label>
            <select
              id="modal_title"
              className={`modal-select ${validationErrors.TitleId ? 'has-error' : ''}`}
              value={form.TitleId || ''}
              onChange={(e) => handleChange('TitleId', Number(e.target.value))}
            >
              <option value="">Please Select</option>
              {(lookup.Title || []).map((t) => (
                <option key={t.Id} value={t.Id}>
                  {t.Text}
                </option>
              ))}
            </select>
          </div>

          {/* First Name */}
          <div className="modal-field">
            <label htmlFor="modal_fname">
              <span>Patient Name</span>
              <span className="req-star">*</span>
            </label>
            <input
              id="modal_fname"
              type="text"
              className={`modal-input ${validationErrors.FirstName ? 'has-error' : ''}`}
              placeholder="First Name"
              value={form.FirstName}
              onChange={(e) => handleChange('FirstName', e.target.value.toUpperCase())}
            />
          </div>

          {/* Last Name */}
          <div className="modal-field">
            <label htmlFor="modal_lname">
              <span>Last Name</span>
            </label>
            <input
              id="modal_lname"
              type="text"
              className="modal-input"
              placeholder="Last Name"
              value={form.LastName}
              onChange={(e) => handleChange('LastName', e.target.value.toUpperCase())}
            />
          </div>

          {/* Age */}
          <div className="modal-field">
            <label htmlFor="modal_age">
              <span>Age</span>
              <span className="req-star">*</span>
            </label>
            <input
              id="modal_age"
              type="number"
              min="0"
              max="150"
              className={`modal-input ${validationErrors.Age ? 'has-error' : ''}`}
              placeholder="Years"
              value={form.Age}
              onChange={(e) => handleChange('Age', e.target.value)}
            />
          </div>

          {/* Gender */}
          <div className="modal-field">
            <label htmlFor="modal_gender">
              <span>Sex / Gender</span>
              <span className="req-star">*</span>
            </label>
            <select
              id="modal_gender"
              className={`modal-select ${validationErrors.GenderId ? 'has-error' : ''}`}
              value={form.GenderId || ''}
              onChange={(e) => handleChange('GenderId', Number(e.target.value))}
            >
              <option value="">Please Select</option>
              {(lookup.Gender || []).map((g) => (
                <option key={g.Id} value={g.Id}>
                  {g.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile */}
          <div className="modal-field">
            <label htmlFor="modal_mobile">
              <span>Mobile Number</span>
              <span className="req-star">*</span>
            </label>
            <input
              id="modal_mobile"
              type="text"
              maxLength={10}
              className={`modal-input ${validationErrors.Mobile ? 'has-error' : ''}`}
              placeholder="10-digit Mobile"
              value={form.Mobile}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                handleChange('Mobile', numericOnly);
              }}
            />
          </div>

          {/* Address */}
          <div className="modal-field">
            <label htmlFor="modal_address">
              <span>Address</span>
            </label>
            <input
              id="modal_address"
              type="text"
              className="modal-input"
              placeholder="Address / Street"
              value={form.AddressLine1}
              onChange={(e) => handleChange('AddressLine1', e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="modal-field">
            <label htmlFor="modal_remarks">
              <span>Remarks</span>
            </label>
            <input
              id="modal_remarks"
              type="text"
              className="modal-input"
              placeholder="Remarks / Notes"
              value={form.Comments}
              onChange={(e) => handleChange('Comments', e.target.value)}
            />
          </div>

          {/* Patient ID (MRN) */}
          <div className="modal-field">
            <label htmlFor="modal_mrn">
              <span>Patient ID (UHID)</span>
            </label>
            <input
              id="modal_mrn"
              type="text"
              className="modal-input"
              disabled
              placeholder="Auto Generated"
              value={form.MRN}
            />
          </div>

          {/* Payer / Guarantor */}
          <div className="modal-field">
            <label htmlFor="modal_guarantor">
              <span>Payer / Insurance</span>
            </label>
            <select
              id="modal_guarantor"
              className="modal-select"
              value={form.GuarantorId || 1}
              onChange={(e) => handleChange('GuarantorId', Number(e.target.value))}
            >
              {(lookup.Guarantor || []).map((g) => (
                <option key={g.Id} value={g.Id}>
                  {g.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Patient Location */}
          <div className="modal-field">
            <label htmlFor="modal_loc">
              <span>Patient Location</span>
            </label>
            <input
              id="modal_loc"
              type="text"
              className="modal-input"
              placeholder="Location"
              value={form.PatientLocation}
              onChange={(e) => handleChange('PatientLocation', e.target.value)}
            />
          </div>

          {/* Encounter Type */}
          <div className="modal-field">
            <label htmlFor="modal_enc_type">
              <span>Type</span>
            </label>
            <select
              id="modal_enc_type"
              className="modal-select"
              value={form.EncounterTypeId || 1}
              onChange={(e) => handleChange('EncounterTypeId', Number(e.target.value))}
            >
              {(lookup.EncounterType || []).map((t) => (
                <option key={t.Id} value={t.Id}>
                  {t.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Alternate Mobile */}
          <div className="modal-field">
            <label htmlFor="modal_alt_mobile">
              <span>Alternate Mobile#</span>
            </label>
            <input
              id="modal_alt_mobile"
              type="text"
              maxLength={10}
              className="modal-input"
              placeholder="Alternate contact"
              value={form.AlternateMobileNum}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                handleChange('AlternateMobileNum', numericOnly);
              }}
            />
          </div>

          {/* Email */}
          <div className="modal-field">
            <label htmlFor="modal_email">
              <span>Email</span>
            </label>
            <input
              id="modal_email"
              type="email"
              className="modal-input"
              placeholder="patient@example.com"
              value={form.Email}
              onChange={(e) => handleChange('Email', e.target.value)}
            />
          </div>

          {/* DOB */}
          <div className="modal-field">
            <label htmlFor="modal_dob">
              <span>Date of Birth</span>
            </label>
            <input
              id="modal_dob"
              type="date"
              className="modal-input"
              value={typeof form.DOB === 'string' ? form.DOB : ''}
              onChange={(e) => handleChange('DOB', e.target.value)}
            />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            PHOTO UPLOAD SECTION
        ───────────────────────────────────────────────────────────── */}
        <div className="modal-photo-section">
          <div className="photo-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Upload & Image Preview</span>
          </div>

          <div className="photo-content-row">
            <div className="photo-preview-box">
              {previewSrc ? (
                <img src={previewSrc} alt="Patient preview" className="photo-preview-img" />
              ) : (
                <div className="photo-preview-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Not Uploaded</span>
                </div>
              )}
            </div>

            <div className="photo-actions-col">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
              />
              <div className="photo-buttons-strip">
                <button
                  type="button"
                  className="btn-photo-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  className="btn-photo-webcam"
                  onClick={handleWebCam}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Web Camera</span>
                </button>

                {(previewSrc || form.PhotoPath) && (
                  <button
                    type="button"
                    className="btn-photo-remove"
                    onClick={handleClearImage}
                  >
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Supports PNG, JPG, JPEG up to 5MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. STICKY MODAL FOOTER (ALWAYS VISIBLE!)
      ───────────────────────────────────────────────────────────── */}
      <div className="patient-modal-footer">
        <button
          type="button"
          className="btn-modal-cancel"
          onClick={handleCancel}
        >
          Cancel
        </button>

        <div className="modal-footer-actions">
          <button
            id="btnSaveApprove"
            type="button"
            className="btn-modal-save"
            onClick={handleSave}
            disabled={currentcontext.isSaving}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{isEditing ? 'Update Patient' : 'Save & Register'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPatientRegisterModalScreen;
