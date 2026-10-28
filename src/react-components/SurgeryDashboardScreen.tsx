import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';

export interface SurgeryScheduleCardItem {
  Id?: number;
  patientname?: string;
  doctorname?: string;
  warddetails?: string;
  ProcedureName?: string;
  OTRoomName?: string;
  OTScheduledOn?: string;
  StartTime?: string;
  EndTime?: string;
  [key: string]: any;
}

export interface SurgeryDashboardScreenProps {
  reactProps?: {
    todaysurgeryData?: SurgeryScheduleCardItem[];
    todaysurgerycompletedData?: SurgeryScheduleCardItem[];
    currentfilter?: {
      OTScheduledOn?: string;
      [key: string]: any;
    };
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const SurgeryDashboardScreen: React.FC<SurgeryDashboardScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone states
  const [standaloneScheduled, setStandaloneScheduled] = useState<SurgeryScheduleCardItem[]>([]);
  const [standaloneCompleted, setStandaloneCompleted] = useState<SurgeryScheduleCardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (reactProps?.currentfilter?.OTScheduledOn) {
      const d = reactProps.currentfilter.OTScheduledOn;
      return typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter?.OTScheduledOn) {
      const d = reactProps.currentfilter.OTScheduledOn;
      setSelectedDate(typeof d === 'string' ? d.split('T')[0] : selectedDate);
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Standalone fetch
  const fetchDashboardData = useCallback(async () => {
    if (isHybrid) return;
    setIsLoading(true);
    try {
      const fromDate = selectedDate ? `${selectedDate} 00:00:00` : null;
      const toDate = selectedDate ? `${selectedDate} 23:59:59` : null;

      // 1. Fetch Scheduled
      const schedInput = {
        Params: [
          { Key: 2, Value: 3 },
          { Key: 10, Value: fromDate },
          { Key: 11, Value: toDate },
          { Key: 18, Value: false },
        ],
        PageContext: { PageSize: 20, PageNumber: 1 },
      };
      const schedRes = await apiFetch<any>('OtManagement/OtSchedule/GetOtSchedules', schedInput);
      if (schedRes && schedRes.Data) {
        const formatted = schedRes.Data.map((s: any) => {
          const p = s.Patient || {};
          const pTitle = p.Title?.Description ? `${p.Title.Description} ` : '';
          const pName = `${pTitle}${p.FirstName || ''} ${p.LastName || ''}`.trim();

          const doc = s.Doctor || {};
          const docTitle = doc.Title?.Description ? `${doc.Title.Description} ` : '';
          const dName = `${docTitle}${doc.FirstName || ''} ${doc.LastName || ''}`.trim();

          let wDetails = '';
          if (s.WardMaster?.WardName) wDetails += `${s.WardMaster.WardName} - `;
          if (s.WardRoomMaster?.RoomNo) wDetails += `${s.WardRoomMaster.RoomNo} - `;
          if (s.WardRoomBedMaster?.BedNo) wDetails += s.WardRoomBedMaster.BedNo;

          return {
            Id: s.Id,
            patientname: pName || 'Patient',
            doctorname: dName || 'Doctor',
            warddetails: wDetails || 'General Ward',
            ProcedureName: s.Procedure?.ProcedureName || 'Surgical Procedure',
            OTRoomName: s.OTRoom?.Description || s.SurgeryRoomMaster?.Name || 'OT Suite',
            OTScheduledOn: s.OTScheduledOn,
            StartTime: s.StartTime,
            EndTime: s.EndTime,
          };
        });
        setStandaloneScheduled(formatted);
      }

      // 2. Fetch Completed
      const compInput = {
        Params: [
          { Key: 20, Value: 3 },
          { Key: 16, Value: fromDate },
          { Key: 17, Value: toDate },
          { Key: 19, Value: false },
        ],
        PageContext: { PageSize: 20, PageNumber: 1 },
      };
      const compRes = await apiFetch<any>('OtManagement/SurgeryEntry/GetSurgeryEntrys', compInput);
      if (compRes && compRes.Data) {
        const formattedComp = compRes.Data.map((c: any) => {
          const p = c.Patient || {};
          const pTitle = p.Title?.Description ? `${p.Title.Description} ` : '';
          const pName = `${pTitle}${p.FirstName || ''} ${p.LastName || ''}`.trim();

          const doc = c.Doctor || c.ChiefSurgeon || {};
          const docTitle = doc.Title?.Description ? `${doc.Title.Description} ` : '';
          const dName = `${docTitle}${doc.FirstName || ''} ${doc.LastName || ''}`.trim();

          let wDetails = '';
          if (c.WardMaster?.WardName) wDetails += `${c.WardMaster.WardName} - `;
          if (c.WardRoomMaster?.RoomNo) wDetails += `${c.WardRoomMaster.RoomNo} - `;
          if (c.WardRoomBedMaster?.BedNo) wDetails += c.WardRoomBedMaster.BedNo;

          return {
            Id: c.Id,
            patientname: pName || 'Patient',
            doctorname: dName || 'Doctor',
            warddetails: wDetails || 'General Ward',
            ProcedureName: c.Procedure?.ProcedureName || 'Completed Procedure',
            OTRoomName: c.OTRoom?.Description || c.SurgeryRoomMaster?.Name || 'OT Suite',
            OTScheduledOn: c.SurgeryStartedate,
          };
        });
        setStandaloneCompleted(formattedComp);
      }
    } catch (err) {
      console.error('Failed to fetch surgery dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isHybrid, selectedDate]);

  useEffect(() => {
    if (!isHybrid) {
      fetchDashboardData();
    }
  }, [isHybrid, fetchDashboardData]);

  const scheduledList = isHybrid ? reactProps?.todaysurgeryData || [] : standaloneScheduled;
  const completedList = isHybrid ? reactProps?.todaysurgerycompletedData || [] : standaloneCompleted;

  const navigateTo = (actionKey: string, routeHash: string) => {
    if (isHybrid) {
      dispatch(actionKey);
    } else {
      window.location.hash = routeHash;
    }
  };

  const handleDateChange = (val: string) => {
    setSelectedDate(val);
    if (isHybrid) {
      dispatch('dateChange', val);
    }
  };

  const actionTiles = [
    {
      key: 'surgeryschedule',
      label: 'Surgery Schedule',
      desc: 'Calendar & bookings',
      icon: 'fa-calendar-alt',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      route: '#/app/surgeryschedules',
    },
    {
      key: 'scheduleconfirmed',
      label: 'Surgery Confirmation',
      desc: 'PAC & Pre-op clearance',
      icon: 'fa-clipboard-check',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      route: '#/app/surgeryconfirmation',
    },
    {
      key: 'procedure',
      label: 'OT Procedure Entries',
      desc: 'Surgical register & intra-op logs',
      icon: 'fa-notes-medical',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      route: '#/appsurgerymanagement/surgeryentrylist/',
    },
    {
      key: 'inpatientlist',
      label: 'Current Inpatients',
      desc: 'Ward pre-op / post-op patients',
      icon: 'fa-user-injured',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      route: '#/app/currentinpatients',
    },
    {
      key: 'stockindents',
      label: 'OT Stock Indent',
      desc: 'Surgical implants & consumables',
      icon: 'fa-boxes',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      route: '#/app/stockrequests',
    },
    {
      key: 'stockreceives',
      label: 'Stock Receive',
      desc: 'Delivery acceptance & pharmacy',
      icon: 'fa-box-open',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      route: '#/app/stocktacceptencelist',
    },
    {
      key: 'report',
      label: 'Surgery Reports',
      desc: 'OT audit & surgeon analytics',
      icon: 'fa-chart-pie',
      gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
      route: '#/app/surgeryreports',
    },
  ];

  return (
    <div
      style={{
        padding: spacing.xl,
        backgroundColor: colors.background,
        minHeight: '100vh',
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.md,
          marginBottom: spacing.xl,
          backgroundColor: colors.surface,
          padding: `${spacing.lg} ${spacing.xl}`,
          borderRadius: radii.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: radii.lg,
              backgroundColor: '#0284c718',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            <i className="fas fa-hospital-user" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.textPrimary,
                  letterSpacing: '-0.02em',
                }}
              >
                Surgery Executive Dashboard
              </h2>
              <span
                style={{
                  backgroundColor: '#0284c718',
                  color: '#0284c7',
                  padding: '3px 10px',
                  borderRadius: radii.full,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  border: '1px solid #0284c730',
                }}
              >
                OT Operations
              </span>
            </div>
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
              }}
            >
              Real-time theatre monitoring, scheduled surgical procedures, and theatre workflow control
            </p>
          </div>
        </div>

        {/* Date Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.sm,
                backgroundColor: colors.background,
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={() => {
              if (isHybrid) dispatch('refresh');
              else fetchDashboardData();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              color: colors.textPrimary,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.medium,
              fontSize: typography.fontSize.sm,
            }}
          >
            <i className="fas fa-sync-alt" />
          </button>
        </div>
      </div>

      {/* Navigation Quick Action Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        {actionTiles.map((tile) => (
          <div
            key={tile.key}
            onClick={() => navigateTo(tile.key, tile.route)}
            style={{
              background: tile.gradient,
              borderRadius: radii.xl,
              padding: `${spacing.lg} ${spacing.md}`,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: shadows.md,
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '110px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = shadows.lg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = shadows.md;
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '24px', opacity: 0.9 }}>
                <i className={`fas ${tile.icon}`} />
              </div>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                <i className="fas fa-arrow-right" />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base }}>
                {tile.label}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, opacity: 0.85, marginTop: '2px' }}>
                {tile.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Split Section: Scheduled Surgeries & Completed Surgeries */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: spacing.lg,
        }}
      >
        {/* Panel 1: Today's Scheduled Surgeries */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <i className="fas fa-calendar-check" style={{ fontSize: '18px' }} />
              <h3 style={{ margin: 0, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold }}>
                Scheduled Surgeries
              </h3>
            </div>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                padding: '2px 8px',
                borderRadius: radii.full,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
              }}
            >
              {scheduledList.length} Procedures
            </span>
          </div>

          <div style={{ padding: spacing.md }}>
            {isLoading ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: spacing.xs }} /> Loading schedules...
              </div>
            ) : scheduledList.length === 0 ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
                <i className="far fa-calendar-times" style={{ fontSize: '32px', marginBottom: spacing.xs }} />
                <div>No scheduled surgeries found for this date.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {scheduledList.map((item, idx) => (
                  <div
                    key={item.Id || idx}
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.lg,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                        <span style={{ fontWeight: typography.fontWeight.bold, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                          {item.patientname}
                        </span>
                        <span
                          style={{
                            fontSize: typography.fontSize.xs,
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '1px 6px',
                            borderRadius: radii.sm,
                            fontWeight: typography.fontWeight.semibold,
                          }}
                        >
                          {item.OTRoomName || 'OT Suite'}
                        </span>
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: '3px' }}>
                        <i className="fas fa-procedures" style={{ marginRight: '4px' }} />
                        {item.warddetails} | <i className="fas fa-user-md" style={{ marginLeft: '4px', marginRight: '4px' }} />
                        {item.doctorname}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.primary, fontWeight: typography.fontWeight.medium, marginTop: '2px' }}>
                        <i className="fas fa-syringe" style={{ marginRight: '4px' }} />
                        {item.ProcedureName}
                      </div>
                    </div>

                    <button
                      onClick={() => navigateTo('procedure', '#/appsurgerymanagement/surgeryentrylist/')}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: '#0284c718',
                        color: '#0284c7',
                        border: '1px solid #0284c730',
                        borderRadius: radii.md,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View OT
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Today's Completed Surgeries */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              backgroundColor: '#059669',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <i className="fas fa-check-circle" style={{ fontSize: '18px' }} />
              <h3 style={{ margin: 0, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold }}>
                Completed Surgeries
              </h3>
            </div>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                padding: '2px 8px',
                borderRadius: radii.full,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
              }}
            >
              {completedList.length} Completed
            </span>
          </div>

          <div style={{ padding: spacing.md }}>
            {isLoading ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: spacing.xs }} /> Loading completed records...
              </div>
            ) : completedList.length === 0 ? (
              <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }}>
                <i className="far fa-check-circle" style={{ fontSize: '32px', marginBottom: spacing.xs }} />
                <div>No completed surgeries recorded yet for this date.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {completedList.map((item, idx) => (
                  <div
                    key={item.Id || idx}
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.lg,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                        <span style={{ fontWeight: typography.fontWeight.bold, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                          {item.patientname}
                        </span>
                        <span
                          style={{
                            fontSize: typography.fontSize.xs,
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            padding: '1px 6px',
                            borderRadius: radii.sm,
                            fontWeight: typography.fontWeight.semibold,
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          Completed
                        </span>
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: '3px' }}>
                        <i className="fas fa-procedures" style={{ marginRight: '4px' }} />
                        {item.warddetails} | <i className="fas fa-user-md" style={{ marginLeft: '4px', marginRight: '4px' }} />
                        {item.doctorname}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: '#059669', fontWeight: typography.fontWeight.medium, marginTop: '2px' }}>
                        <i className="fas fa-check" style={{ marginRight: '4px' }} />
                        {item.ProcedureName}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textSecondary,
                        backgroundColor: colors.surface,
                        padding: '4px 8px',
                        borderRadius: radii.sm,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {item.OTRoomName || 'OT Suite'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
