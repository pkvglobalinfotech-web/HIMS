import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';

export interface PatientProfileData {
  PatientId?: number;
  PatientName?: string;
  FirstName?: string;
  LastName?: string;
  Title?: { Description?: string };
  Age?: number | string;
  DOB?: string;
  Gender?: string;
  GenderId?: number;
  PatientType?: string;
  PatientTypeId?: number;
  Nationality?: string;
  NationalityId?: number | string;
  NationalityIdentifier?: string;
  Mobile?: string;
  MRN?: string;
  PhotoPath?: string;
  InsuranceCardPhotoPath?: string;
  IQAMAPhotoPath?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  State?: string;
  Country?: string;
  FullAddress?: string;
  Initials?: string;
  PasspostNumber?: string;
  AttenderName?: string;
  AttenderPhone?: string;
  // Visit Details
  DoctorName?: string;
  Department?: string;
  DepartmentId?: number;
  AdmissionDate?: string;
  VisitIdentifier?: string;
  VisitType?: string;
  VisitTypeId?: number;
  EncounterType?: string;
  EncounterTypeId?: number;
  WardName?: string;
  GuarantorName?: string;
  TPA?: string;
  ReferralType?: string;
  ReferralName?: string;
  [key: string]: any;
}

export interface PatientProfileModalProps {
  reactProps?: {
    item?: PatientProfileData;
    currentcontext?: {
      Photo?: string;
      pid?: number;
      file?: any;
    };
    patientId?: number;
  };
  onAction?: (actionName: string, payload?: any) => void;
  // Direct React Props (for standalone invocation)
  isOpen?: boolean;
  onClose?: () => void;
  patientId?: number;
  initialData?: PatientProfileData;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  reactProps,
  onAction,
  isOpen = true,
  onClose,
  patientId: propPatientId,
  initialData,
}) => {
  const effectivePatientId =
    propPatientId ||
    reactProps?.patientId ||
    reactProps?.currentcontext?.pid ||
    reactProps?.item?.PatientId;

  const [item, setItem] = useState<PatientProfileData>(
    initialData || reactProps?.item || {}
  );
  const [photoBase64, setPhotoBase64] = useState<string>(
    reactProps?.currentcontext?.Photo || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync when reactProps change from AngularJS
  useEffect(() => {
    if (reactProps?.item) {
      setItem(reactProps.item);
    }
    if (reactProps?.currentcontext?.Photo) {
      setPhotoBase64(reactProps.currentcontext.Photo);
    }
  }, [reactProps?.item, reactProps?.currentcontext?.Photo]);

  // Fetch patient profile if only patientId is provided (standalone mode)
  const fetchPatientDetails = useCallback(async (pid: number) => {
    if (!pid) return;
    setIsLoading(true);
    try {
      // 1. Fetch Patient Info
      const res = await apiFetch<any>('registration/patient/GetPatients', {
        Params: [{ Key: 0, Value: pid }],
        PageContext: { PageSize: 10, PageNumber: 1 },
      });

      if (res && res.Data && res.Data.length > 0) {
        const p = res.Data[0];
        const title = p.Title?.Description ? `${p.Title.Description} ` : '';
        const fName = p.FirstName || '';
        const lName = p.LastName ? ` ${p.LastName}` : '';
        const fullName = `${title}${fName}${lName}`.trim() || 'Patient';

        const addressParts = [p.AddressLine1, p.AddressLine2, p.City, p.State, p.Country].filter(
          (part) => part && typeof part === 'string' && part.trim().length > 0
        );
        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Not Specified';

        const nameClean = fullName.replace(/^(Mr|Mrs|Ms|Master|Dr|Prof)\.?\s+/i, '');
        const initials =
          nameClean
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0].toUpperCase())
            .join('') || 'PT';

        const enc = (p.Encounters && p.Encounters[0]) || {};
        const docTitle = enc.Doctor?.Title?.Description ? `${enc.Doctor.Title.Description} ` : '';
        const docName = `${docTitle}${enc.Doctor?.FirstName || ''} ${enc.Doctor?.LastName || ''}`.trim();

        let wardDetails = '';
        if (enc.WardMaster?.WardName) wardDetails += enc.WardMaster.WardName;
        if (enc.WardRoomMaster?.RoomNo) wardDetails += ` / ${enc.WardRoomMaster.RoomNo}`;
        if (enc.WardRoomBedMaster?.BedNo) wardDetails += ` / ${enc.WardRoomBedMaster.BedNo}`;

        const newItem: PatientProfileData = {
          ...p,
          PatientName: fullName,
          Gender: p.Gender?.Description || p.Gender,
          PatientType: p.PatientType?.Description || p.PatientType,
          Nationality: p.Nationality?.Description || p.Nationality || 'India',
          FullAddress: fullAddress,
          Initials: initials,
          DoctorName: docName || enc.DoctorName,
          Department: enc.Department?.DepartmentName || enc.Department,
          AdmissionDate: enc.AdmissionDate,
          VisitIdentifier: enc.VisitIdentifier,
          EncounterType: enc.EncounterType?.Description || enc.EncounterType,
          WardName: wardDetails,
          GuarantorName: enc.Guarantor?.GuarantorName || p.Guarantor?.GuarantorName || 'Self / Cash',
          TPA: enc.Guarantor?.TPA?.Description,
          ReferralType: enc.ReferralType?.Description,
          ReferralName: enc.ReferralName,
          AttenderName: enc.AttenderName,
          AttenderPhone: enc.AttenderPhone,
        };

        setItem(newItem);

        // Fetch photo if available
        if (p.PhotoPath) {
          try {
            const photoRes = await apiFetch<any>('registration/Patient/GetPatientProfilePic', {
              Data: { Id: p.PatientId || pid, PhotoPath: p.PhotoPath },
            });
            if (photoRes && photoRes.Photo) {
              setPhotoBase64(photoRes.Photo);
            }
          } catch (pe) {
            console.warn('Failed to load patient photo', pe);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch patient details in PatientProfileModal:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we only have patientId and no PatientName, fetch details
    if (effectivePatientId && !item.PatientName) {
      fetchPatientDetails(effectivePatientId);
    }
  }, [effectivePatientId, item.PatientName, fetchPatientDetails]);

  const handleClose = () => {
    if (onAction) {
      onAction('close');
    }
    if (onClose) {
      onClose();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const displayName = item.PatientName || `${item.Title?.Description || ''} ${item.FirstName || ''} ${item.LastName || ''}`.trim() || 'Patient Record';
  const mrn = item.MRN || '—';
  const ageGender = [item.Age ? `${item.Age} Y` : null, item.Gender].filter(Boolean).join(' / ');
  const address = item.FullAddress || [item.AddressLine1, item.AddressLine2, item.City, item.State, item.Country].filter(Boolean).join(', ') || 'Not Specified';

  const initials = useMemo(() => {
    if (item.Initials) return item.Initials;
    const clean = displayName.replace(/^(Mr|Mrs|Ms|Master|Dr|Prof)\.?\s+/i, '');
    return clean
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || 'PT';
  }, [displayName, item.Initials]);

  const formatDateTime = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        color: colors.textMain,
        backgroundColor: '#ffffff',
        borderRadius: radii.xl,
        overflow: 'hidden',
        boxShadow: shadows.xl,
        border: `1px solid ${colors.border}`,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      {/* ── Modal Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: radii.md,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
            }}
          >
            <i className="fa fa-id-card-o" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.textMain, letterSpacing: '-0.01em' }}>
              Patient Record & Clinical Profile
            </h3>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Master Demographics, Contact Details & In-Patient Visit Summary
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          title="Close (Esc)"
          style={{
            background: 'none',
            border: 'none',
            width: 34,
            height: 34,
            borderRadius: radii.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <i className="fa fa-times" style={{ fontSize: 18 }} />
        </button>
      </div>

      {/* ── Modal Body ── */}
      <div
        style={{
          padding: '20px 24px',
          maxHeight: 'calc(85vh - 130px)',
          overflowY: 'auto',
          backgroundColor: '#f8fafc',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: colors.textMuted }}>
            <i className="fa fa-circle-o-notch fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Loading Patient Record...</div>
          </div>
        ) : (
          <>
            {/* ── Hero Banner Card ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${colors.border}`,
                borderLeft: '4px solid #0284c7',
                borderRadius: radii.lg,
                padding: '18px 20px',
                marginBottom: 16,
                boxShadow: shadows.sm,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Photo or Initials Avatar */}
                  <div style={{ position: 'relative' }}>
                    {photoBase64 ? (
                      <div
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                        }}
                      >
                        <img
                          src={`data:image/png;base64,${photoBase64}`}
                          alt={displayName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                          color: '#0369a1',
                          fontSize: 24,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #bae6fd',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.15)',
                        }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Name and Key Badges */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: colors.textMain }}>
                        {displayName}
                      </h3>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: radii.full,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.PatientType || 'IN-PATIENT'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 6,
                        fontSize: 13,
                        color: '#475569',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong style={{ color: colors.textMuted }}>UHID:</strong>{' '}
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{mrn}</span>
                      </div>
                      <span>&bull;</span>
                      <div>
                        <strong style={{ color: colors.textMuted }}>Demographics:</strong>{' '}
                        <span style={{ fontWeight: 600 }}>{ageGender || '—'}</span>
                      </div>
                      <span>&bull;</span>
                      <div>
                        <strong style={{ color: colors.textMuted }}>Mobile:</strong>{' '}
                        <span style={{ fontWeight: 600 }}>{item.Mobile || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visit Identifier Pill */}
                {item.VisitIdentifier && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
                      Active Visit
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: radii.sm,
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        fontWeight: 700,
                        fontSize: 13,
                        marginTop: 2,
                      }}
                    >
                      <i className="fa fa-hospital-o" />
                      <span>{item.VisitIdentifier}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Card 1: Demographics & Personal Information ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${colors.border}`,
                borderRadius: radii.lg,
                padding: '18px 20px',
                marginBottom: 16,
                boxShadow: shadows.sm,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: `1px solid #f1f5f9`,
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.textMain,
                }}
              >
                <i className="fa fa-user" style={{ color: '#0284c7' }} />
                <span>Personal & Demographic Information</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '14px 20px',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Full Patient Name
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {displayName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Date of Birth
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.DOB || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Age / Gender
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {ageGender || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Primary Mobile No
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.Mobile || '—'}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Registered Residential Address
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {address}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Nationality
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.Nationality || 'India'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    National ID / Iqama
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.NationalityId || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Passport No
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.PasspostNumber || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Attender / Guardian Name
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.AttenderName || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Attender Contact Phone
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.AttenderPhone || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Visit & In-Patient Location Information ── */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${colors.border}`,
                borderRadius: radii.lg,
                padding: '18px 20px',
                boxShadow: shadows.sm,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: `1px solid #f1f5f9`,
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.textMain,
                }}
              >
                <i className="fa fa-stethoscope" style={{ color: '#0284c7' }} />
                <span>Latest In-Patient Visit & Location Allocation</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '14px 20px',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Visit / IP Number
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
                    {item.VisitIdentifier || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Admission Date & Time
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {formatDateTime(item.AdmissionDate)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Encounter / Visit Type
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.EncounterType || 'In-Patient (IP)'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Assigned Ward & Bed
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#1e40af',
                    }}
                  >
                    <i className="fa fa-bed" />
                    <span>{item.WardName || 'Unassigned'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Consultant Doctor
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.DoctorName || 'Attending Physician'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Admitting Department
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.Department || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Payer / Insurance
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.GuarantorName || 'Self / Cash'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    TPA / Policy Admin
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.TPA || 'Direct Payment'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Referral Source
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>
                    {item.ReferralName ? `${item.ReferralName} ${item.ReferralType ? `(${item.ReferralType})` : ''}` : 'Self / Direct'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: '#ffffff',
        }}
      >
        <button
          type="button"
          onClick={handlePrint}
          title="Print Patient Record Summary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: radii.md,
            border: `1px solid ${colors.border}`,
            backgroundColor: '#ffffff',
            color: colors.textMain,
            cursor: 'pointer',
          }}
        >
          <i className="fa fa-print" style={{ color: '#64748b' }} />
          <span>Print Record</span>
        </button>

        <button
          type="button"
          onClick={handleClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: radii.md,
            border: 'none',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
        >
          Close
        </button>
      </div>
    </div>
  );
};
