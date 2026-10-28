import React, { useState, useEffect, useCallback } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface BedItem {
  Id: number;
  BedNo?: string;
  RoomNo?: string;
  BedStatusId?: number;
  IsTemp?: boolean;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Age?: number | string;
    GenderId?: number;
    Gender?: { Description?: string };
    Title?: { Description?: string };
    IsVip?: boolean;
    IsAllergy?: boolean;
    IsNBM?: boolean;
    IsPatientAlert?: boolean;
  };
  Encounter?: {
    Id?: number;
    AdmissionDate?: string;
    VisitIdentifier?: string;
    AdmissionStatusId?: number;
    IsBillLock?: boolean | number;
  };
  Doctor?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  PatientPhoto?: string;
  isPhotoAvailable?: boolean;
  [key: string]: any;
}

export interface WardItem {
  Id: number;
  WardName: string;
  TotalBeds?: number;
  AvailableBeds?: number;
  OccupiedBeds?: number;
  BedData: BedItem[];
  CanShowDetails?: boolean;
  [key: string]: any;
}

export interface BedManagementGridScreenProps {
  reactProps?: {
    wards?: WardItem[];
    totalBeds?: number;
    availableBeds?: number;
    occupiedBeds?: number;
    todayAdmittedBed?: number;
    currentfilter?: {
      WardId?: number | string;
      AdmissionStatusId?: number | string;
      DoctorId?: number | string;
      PatientNameMRN?: string;
    };
    lookup?: {
      Ward?: Array<{ Id: number; Text: string }>;
      Doctor?: Array<{ Id: number; Text: string }>;
    };
    context?: string;
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const BedManagementGridScreen: React.FC<BedManagementGridScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && Array.isArray(reactProps.wards));

  // Standalone States
  const [standaloneWards, setStandaloneWards] = useState<WardItem[]>([]);
  const [standaloneStats, setStandaloneStats] = useState({
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    todayAdmittedBed: 0,
  });

  // Filter States
  const [selectedWard, setSelectedWard] = useState<number | string>(
    reactProps?.currentfilter?.WardId ?? -1
  );
  const [statusFilter, setStatusFilter] = useState<number | string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) onAction(action, payload);
  };

  const fetchStandaloneBeds = useCallback(async () => {
    try {
      const facilityId = sessionHelper.getFacilityId() || 1;
      const userId = sessionHelper.getUserId() || 1;

      const inputData = {
        Params: [
          { Key: 1, Value: userId },
          { Key: 2, Value: facilityId },
          { Key: 3, Value: Number(selectedWard) },
          { Key: 7, Value: 1 },
        ],
        PageContext: { PageSize: 100, PageNumber: 1 },
        Data: {
          WardId: Number(selectedWard),
        },
      };

      const res = await apiFetch<any>('generalmaster/WardMaster/GetWardBeds', inputData);
      if (res && res.Data) {
        let total = 0;
        let avail = 0;
        let occ = 0;

        const wards: WardItem[] = res.Data;
        wards.forEach((w) => {
          if (w.BedData) {
            w.BedData.forEach((b) => {
              if (!b.IsTemp) total++;
              if (b.BedStatusId === 1) avail++;
              if (b.BedStatusId === 2) occ++;
            });
          }
        });

        setStandaloneWards(wards);
        setStandaloneStats({
          totalBeds: total,
          availableBeds: avail,
          occupiedBeds: occ,
          todayAdmittedBed: 0,
        });
      }
    } catch (err) {
      console.error('Failed to load standalone beds:', err);
    }
  }, [selectedWard]);

  useEffect(() => {
    if (!isHybrid) {
      fetchStandaloneBeds();
    }
  }, [isHybrid, fetchStandaloneBeds]);

  const wards = isHybrid ? reactProps?.wards || [] : standaloneWards;
  const totalBeds = isHybrid ? reactProps?.totalBeds || 0 : standaloneStats.totalBeds;
  const availableBeds = isHybrid ? reactProps?.availableBeds || 0 : standaloneStats.availableBeds;
  const occupiedBeds = isHybrid ? reactProps?.occupiedBeds || 0 : standaloneStats.occupiedBeds;
  const todayAdmittedBed = isHybrid ? reactProps?.todayAdmittedBed || 0 : standaloneStats.todayAdmittedBed;

  const lookups = reactProps?.lookup || { Ward: [], Doctor: [] };

  // Status Color Map
  const getStatusConfig = (statusId?: number) => {
    switch (statusId) {
      case 1:
        return { label: 'Available', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
      case 2:
        return { label: 'Occupied', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' };
      case 3:
        return { label: 'Reserved', color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' };
      case 4:
        return { label: 'Cleaning', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' };
      case 6:
        return { label: 'Maintenance', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
      default:
        return { label: 'Transfer In', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' };
    }
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        color: colors.textMain,
        padding: '16px 20px',
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-th-large" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textMain }}>
                In-Patient Bed Board & Ward Occupancy
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Real-Time Visual Bed Status • Floor Plan Management & Bed Reservations
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <button
            onClick={() => dispatch('doctorDashboard')}
            title="Doctor Dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
            }}
          >
            <i className="fa fa-user-md" style={{ color: '#0284c7' }} />
            <span>Doctor Dashboard</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Pills ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderRadius: radii.lg,
            backgroundColor: '#ffffff',
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Total Capacity</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.textMain, marginTop: 2 }}>
            {totalBeds} <span style={{ fontSize: 12, fontWeight: 500, color: colors.textMuted }}>Beds</span>
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderRadius: radii.lg,
            backgroundColor: '#ffffff',
            border: `1px solid #a7f3d0`,
            borderLeft: `4px solid #10b981`,
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>Available</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
            {availableBeds} <span style={{ fontSize: 12, fontWeight: 500, color: '#047857' }}>Ready</span>
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderRadius: radii.lg,
            backgroundColor: '#ffffff',
            border: `1px solid #ddd6fe`,
            borderLeft: `4px solid #8b5cf6`,
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6d28d9' }}>Occupied</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>
            {occupiedBeds} <span style={{ fontSize: 12, fontWeight: 500, color: '#6d28d9' }}>Patients</span>
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderRadius: radii.lg,
            backgroundColor: '#ffffff',
            border: `1px solid #bfdbfe`,
            borderLeft: `4px solid #0284c7`,
            boxShadow: shadows.sm,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>Admitted Today</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
            {todayAdmittedBed} <span style={{ fontSize: 12, fontWeight: 500, color: '#0369a1' }}>New</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          padding: '14px 20px',
          marginBottom: spacing.md,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          {/* Ward filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Ward:</span>
            <select
              value={selectedWard}
              onChange={(e) => {
                setSelectedWard(e.target.value);
                if (isHybrid) dispatch('filterChangeAndSearch', { field: 'WardId', value: e.target.value });
              }}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="-1">All Wards</option>
              {lookups.Ward?.map((w) => (
                <option key={w.Id} value={w.Id}>
                  {w.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Status Filter Tabs */}
          <div style={{ display: 'inline-flex', borderRadius: radii.md, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            {[
              { id: 'all', label: 'All Beds' },
              { id: '1', label: 'Available' },
              { id: '2', label: 'Occupied' },
              { id: '3', label: 'Reserved' },
              { id: '4', label: 'Cleaning' },
              { id: '6', label: 'Maintenance' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === btn.id ? '#0284c7' : '#ffffff',
                  color: statusFilter === btn.id ? '#ffffff' : colors.textMuted,
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 220 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient/bed..."
            style={{
              width: '100%',
              height: 34,
              padding: '0 28px 0 10px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: 13,
              outline: 'none',
            }}
          />
          <i
            className="fa fa-search"
            style={{
              position: 'absolute',
              right: 10,
              top: 10,
              color: colors.textMuted,
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* ── Ward Sections & Bed Cards ── */}
      {wards.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            padding: 48,
            textAlign: 'center',
            color: colors.textMuted,
          }}
        >
          <i className="fa fa-hospital-o" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: colors.textMain }}>No Wards or Beds Configured</div>
        </div>
      ) : (
        wards.map((ward) => {
          const filteredBeds = (ward.BedData || []).filter((bed) => {
            if (statusFilter !== 'all' && String(bed.BedStatusId) !== String(statusFilter)) {
              return false;
            }
            if (searchTerm) {
              const term = searchTerm.toLowerCase();
              const bedNo = (bed.BedNo || '').toLowerCase();
              const pName = `${bed.Patient?.FirstName || ''} ${bed.Patient?.LastName || ''}`.toLowerCase();
              const mrn = (bed.Patient?.MRN || '').toLowerCase();
              return bedNo.includes(term) || pName.includes(term) || mrn.includes(term);
            }
            return true;
          });

          return (
            <div
              key={ward.Id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: radii.lg,
                border: `1px solid ${colors.border}`,
                boxShadow: shadows.sm,
                marginBottom: spacing.md,
                overflow: 'hidden',
              }}
            >
              {/* Ward Header */}
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#f8fafc',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <i className="fa fa-building-o" style={{ color: '#0284c7' }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.textMain }}>
                    {ward.WardName}
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: radii.full,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: '#e2e8f0',
                      color: colors.textMuted,
                    }}
                  >
                    {filteredBeds.length} Beds
                  </span>
                </div>
              </div>

              {/* Beds Grid */}
              <div
                style={{
                  padding: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: spacing.md,
                }}
              >
                {filteredBeds.map((bed) => {
                  const status = getStatusConfig(bed.BedStatusId);
                  const isOccupied = bed.BedStatusId === 2;
                  const patient = bed.Patient;
                  const patientName = patient ? `${patient.FirstName || ''} ${patient.LastName || ''}`.trim() : null;

                  return (
                    <div
                      key={bed.Id}
                      style={{
                        borderRadius: radii.md,
                        border: `1px solid ${status.border}`,
                        backgroundColor: status.bg,
                        padding: 12,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: shadows.sm,
                        cursor: isOccupied ? 'pointer' : 'default',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onClick={() => {
                        if (isOccupied) {
                          if (bed.Patient?.Id) {
                            setSelectedPatientId(bed.Patient.Id);
                          }
                          dispatch('patientdetails', bed);
                        }
                      }}
                    >
                      {/* Bed & Room Top Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: colors.textMain,
                            }}
                          >
                            Bed {bed.BedNo}
                          </span>
                          {bed.RoomNo && (
                            <span style={{ fontSize: 11, color: colors.textMuted }}>
                              (Rm {bed.RoomNo})
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: radii.sm,
                            backgroundColor: '#ffffff',
                            color: status.color,
                            border: `1px solid ${status.border}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Content: Occupied or Available Details */}
                      {isOccupied && patient ? (
                        <div style={{ fontSize: 12 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#6d28d9',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {patientName || 'Patient'}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                            {patient.MRN && <span>MRN: {patient.MRN}</span>}
                            {patient.Age && <span> • {patient.Age} yrs</span>}
                            {patient.Gender?.Description && <span> • {patient.Gender.Description}</span>}
                          </div>
                          {bed.Doctor && (
                            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                              Dr. {bed.Doctor.LastName || bed.Doctor.FirstName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: colors.textMuted, margin: '8px 0' }}>
                          <i className="fa fa-check-circle" style={{ color: '#10b981', marginRight: 4 }} />
                          Ready for Admission
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                          marginTop: 10,
                          paddingTop: 6,
                          borderTop: `1px dashed ${status.border}`,
                        }}
                      >
                        {isOccupied ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bed.Patient?.Id) {
                                setSelectedPatientId(bed.Patient.Id);
                              }
                              dispatch('patientdetails', bed);
                            }}
                            title="View Patient Chart / Profile"
                            style={{
                              border: 'none',
                              background: '#ffffff',
                              color: '#6d28d9',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: radii.sm,
                              cursor: 'pointer',
                            }}
                          >
                            Details &rarr;
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => dispatch('reserveBed', bed)}
                              title="Reserve this bed"
                              style={{
                                border: 'none',
                                background: '#ffffff',
                                color: colors.textMuted,
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: radii.sm,
                                cursor: 'pointer',
                              }}
                            >
                              Reserve
                            </button>
                            <button
                              type="button"
                              onClick={() => dispatch('maintenance', bed)}
                              title="Mark for maintenance"
                              style={{
                                border: 'none',
                                background: '#ffffff',
                                color: '#ef4444',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: radii.sm,
                                cursor: 'pointer',
                              }}
                            >
                              Maintenance
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* ── Modal: Patient Profile ── */}
      {selectedPatientId && (
        <PatientProfileModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </div>
  );
};
