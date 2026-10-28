import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';

export interface EmergencyPatientItem {
  Id?: number;
  PatientMrn?: string;
  PatientName?: string;
  StartDate?: string;
  AdmissionDate?: string;
  DischargeDate?: string;
  OTScheduledOn?: string;
  VisitIdentifier?: string;
  TriageLevel?: string;
  Encounter?: {
    VisitIdentifier?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface AeDashboardProps {
  reactProps?: {
    Items?: Record<string, any>;
    TodayPendingList?: EmergencyPatientItem[];
    TodayCompletedList?: EmergencyPatientItem[];
    admissionlist?: EmergencyPatientItem[];
    dischargedlist?: EmergencyPatientItem[];
    ScheduleList?: EmergencyPatientItem[];
    currentcontext?: any;
  };
  onAction?: (action: string, payload?: any) => void;
}

export const AeDashboardScreen: React.FC<AeDashboardProps> = ({ reactProps, onAction }) => {
  const isHybrid = Boolean(reactProps && onAction);

  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'admissions' | 'discharges' | 'surgeries'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Standalone state fallbacks
  const [standaloneCounts, setStandaloneCounts] = useState({
    checkedincount: '12',
    inpatientcount: '5',
    otschedulecount: '2',
    dischargedcount: '8',
    pendingdischargescount: '3',
    labresultcount: '14',
  });

  const [standalonePending, setStandalonePending] = useState<EmergencyPatientItem[]>([
    { Id: 101, PatientMrn: 'EMR-9201', PatientName: 'RAMESH KUMAR', StartDate: new Date().toISOString(), TriageLevel: 'Level 1 - Resuscitation', VisitIdentifier: 'AE-8901' },
    { Id: 102, PatientMrn: 'EMR-9204', PatientName: 'PRIYA NAIR', StartDate: new Date().toISOString(), TriageLevel: 'Level 2 - Emergent', VisitIdentifier: 'AE-8902' },
    { Id: 103, PatientMrn: 'EMR-9207', PatientName: 'SUNIL SHARMA', StartDate: new Date().toISOString(), TriageLevel: 'Level 3 - Urgent', VisitIdentifier: 'AE-8903' },
    { Id: 104, PatientMrn: 'EMR-9210', PatientName: 'FATIMA BEGUM', StartDate: new Date().toISOString(), TriageLevel: 'Level 2 - Emergent', VisitIdentifier: 'AE-8904' },
  ]);

  const [standaloneCompleted, setStandaloneCompleted] = useState<EmergencyPatientItem[]>([
    { Id: 201, PatientMrn: 'EMR-9188', PatientName: 'ANITHA REDDY', StartDate: new Date().toISOString(), VisitIdentifier: 'AE-8890' },
    { Id: 202, PatientMrn: 'EMR-9192', PatientName: 'DEEPAK PATEL', StartDate: new Date().toISOString(), VisitIdentifier: 'AE-8894' },
  ]);

  const [standaloneAdmissions, setStandaloneAdmissions] = useState<EmergencyPatientItem[]>([
    { Id: 301, PatientMrn: 'EMR-9201', PatientName: 'RAMESH KUMAR', VisitIdentifier: 'IP-2026-081', AdmissionDate: new Date().toISOString() },
    { Id: 302, PatientMrn: 'EMR-9155', PatientName: 'MOHAMMED ALI', VisitIdentifier: 'IP-2026-082', AdmissionDate: new Date().toISOString() },
  ]);

  const [standaloneDischarges, setStandaloneDischarges] = useState<EmergencyPatientItem[]>([
    { Id: 401, PatientMrn: 'EMR-9104', PatientName: 'VIKRAM SINGH', VisitIdentifier: 'IP-2026-074', DischargeDate: new Date().toISOString() },
  ]);

  const [standaloneSurgeries, setStandaloneSurgeries] = useState<EmergencyPatientItem[]>([
    { Id: 501, PatientMrn: 'EMR-9201', PatientName: 'RAMESH KUMAR', OTScheduledOn: new Date().toISOString(), Encounter: { VisitIdentifier: 'IP-2026-081' } },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    } else {
      showToast(`Action: ${action}`);
    }
  };

  // Standalone API loader
  const fetchDashboardData = useCallback(async () => {
    if (isHybrid) return;
    setIsLoading(true);
    try {
      const inputData = {
        Data: {
          Keys: [{ Key: 'appointment' }, { Key: 'mycheckedin' }, { Key: 'myinpatient' }, { Key: 'otschedule' }],
        },
        Attributes: {
          FromDate: `${selectedDate} 00:00:00`,
          ToDate: `${selectedDate} 23:59:59`,
        },
      };
      const res = await apiFetch<any>('Visit/DoctorDashboard/GetDashboardOptions', inputData);
      if (res) {
        setStandaloneCounts({
          checkedincount: res.mycheckedin?.checkedincount || '12',
          inpatientcount: res.myinpatient?.inpatientcount || '5',
          otschedulecount: res.otschedule?.otschedulecount || '2',
          dischargedcount: res.myinpatient?.dischargedcount || '8',
          pendingdischargescount: res.pendingdischarge?.pendingdischargescount || '3',
          labresultcount: res.resultreview?.labresultcount || '14',
        });
      }
    } catch (e) {
      console.warn('Could not load doctor dashboard options', e);
    } finally {
      setIsLoading(false);
    }
  }, [isHybrid, selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived lists
  const pendingList = isHybrid ? reactProps?.TodayPendingList || [] : standalonePending;
  const completedList = isHybrid ? reactProps?.TodayCompletedList || [] : standaloneCompleted;
  const admissionList = isHybrid ? reactProps?.admissionlist || [] : standaloneAdmissions;
  const dischargeList = isHybrid ? reactProps?.dischargedlist || [] : standaloneDischarges;
  const surgeryList = isHybrid ? reactProps?.ScheduleList || [] : standaloneSurgeries;

  const counts = isHybrid
    ? {
        checkedincount: reactProps?.Items?.checkedincount || '0',
        inpatientcount: reactProps?.Items?.inpatientcount || '0',
        otschedulecount: reactProps?.Items?.otschedulecount || '0',
        dischargedcount: reactProps?.Items?.dischargedcount || '0',
        pendingdischargescount: reactProps?.Items?.pendingdischargescount || '0',
        labresultcount: reactProps?.Items?.labresultcount || '0',
      }
    : standaloneCounts;

  // Filter current active list by search term
  const filterList = (items: EmergencyPatientItem[]) => {
    if (!searchTerm.trim()) return items;
    const s = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        (item.PatientMrn && item.PatientMrn.toLowerCase().includes(s)) ||
        (item.PatientName && item.PatientName.toLowerCase().includes(s)) ||
        (item.VisitIdentifier && item.VisitIdentifier.toLowerCase().includes(s))
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: typography.fontFamily.sans,
        color: colors.neutral[800],
        padding: spacing[6],
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: colors.neutral[900],
            color: '#fff',
            padding: `${spacing[3]} ${spacing[5]}`,
            borderRadius: radii.lg,
            boxShadow: shadows.xl,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            borderLeft: `4px solid ${colors.danger[500]}`,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Hero Operational Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #091e3a 0%, #172554 100%)',
          borderRadius: radii.xl,
          padding: `${spacing[5]} ${spacing[6]}`,
          color: '#ffffff',
          boxShadow: shadows.lg,
          marginBottom: spacing[6],
          borderLeft: `6px solid ${colors.danger[500]}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing[4] }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[1] }}>
              <span
                style={{
                  backgroundColor: colors.danger[600],
                  color: '#ffffff',
                  padding: '3px 12px',
                  borderRadius: radii.full,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }}></span>
                LEVEL-1 TRAUMA & EMERGENCY OPERATIONS HUB
              </span>
              <span style={{ color: '#93c5fd', fontSize: typography.fontSize.xs }}>
                Real-Time Triage & Inpatient Census
              </span>
            </div>
            <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, margin: 0 }}>
              Accident & Emergency Clinical Dashboard
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: typography.fontSize.sm, color: '#94a3b8' }}>
              Live emergency queue management, rapid resuscitation tracking, direct inpatient admissions, and trauma discharge workflows.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (isHybrid) dispatch('aeregistration');
                else window.location.hash = '#/app/AccidentEmergency';
              }}
              style={{
                backgroundColor: colors.danger[600],
                color: '#fff',
                border: 'none',
                borderRadius: radii.md,
                padding: '9px 16px',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: shadows.md,
              }}
            >
              <i className="fas fa-plus"></i> + New A&E Registration
            </button>
            <button
              onClick={() => dispatch('daycarepatients')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.14)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: radii.md,
                padding: '9px 14px',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-bed"></i> Observation Admissions
            </button>
            <button
              onClick={() => dispatch('reports')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: radii.md,
                padding: '9px 14px',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-chart-line"></i> A&E Reports
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: spacing[4],
          marginBottom: spacing[6],
        }}
      >
        {[
          {
            title: 'Checked-in Emergency',
            count: counts.checkedincount,
            icon: 'fa-ambulance',
            color: colors.danger[600],
            bgColor: '#fef2f2',
            borderColor: '#fecaca',
            tab: 'pending',
          },
          {
            title: 'A&E Inpatient Admissions',
            count: counts.inpatientcount,
            icon: 'fa-procedures',
            color: colors.primary[600],
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe',
            tab: 'admissions',
          },
          {
            title: 'Emergency Surgeries',
            count: counts.otschedulecount,
            icon: 'fa-syringe',
            color: '#7c3aed',
            bgColor: '#f5f3ff',
            borderColor: '#ddd6fe',
            tab: 'surgeries',
          },
          {
            title: 'Discharged Today',
            count: counts.dischargedcount,
            icon: 'fa-door-open',
            color: colors.success[600],
            bgColor: '#f0fdf4',
            borderColor: '#bbf7d0',
            tab: 'discharges',
          },
          {
            title: 'Pending Discharges',
            count: counts.pendingdischargescount,
            icon: 'fa-clipboard-check',
            color: colors.warning[600],
            bgColor: '#fffbeb',
            borderColor: '#fde68a',
            tab: 'pending',
          },
          {
            title: 'Pending Lab Reviews',
            count: counts.labresultcount,
            icon: 'fa-flask',
            color: '#0891b2',
            bgColor: '#ecfeff',
            borderColor: '#a5f3fc',
            tab: 'pending',
          },
        ].map((card, idx) => {
          const isSelected = activeTab === card.tab;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(card.tab as any)}
              style={{
                backgroundColor: card.bgColor,
                border: `1.5px solid ${isSelected ? card.color : card.borderColor}`,
                borderRadius: radii.xl,
                padding: spacing[4],
                boxShadow: isSelected ? shadows.md : shadows.sm,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: card.color }}>
                  {card.title}
                </span>
                <i className={`fas ${card.icon}`} style={{ fontSize: 18, color: card.color }}></i>
              </div>
              <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.extrabold, color: colors.neutral[900] }}>
                {card.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          padding: spacing[4],
          boxShadow: shadows.sm,
          border: `1px solid ${colors.neutral[200]}`,
          marginBottom: spacing[6],
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing[4],
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: 340 }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.neutral[400],
              fontSize: 14,
            }}
          ></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient name, MRN, IP number..."
            style={{
              width: '100%',
              height: 38,
              padding: '0 12px 0 36px',
              borderRadius: radii.md,
              border: `1px solid ${colors.neutral[300]}`,
              fontSize: typography.fontSize.sm,
              outline: 'none',
            }}
          />
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <label style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.neutral[600] }}>
            Date Filter:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              height: 38,
              borderRadius: radii.md,
              border: `1px solid ${colors.neutral[300]}`,
              padding: '0 10px',
              fontSize: typography.fontSize.sm,
            }}
          />
          <button
            onClick={() => {
              if (isHybrid) dispatch('refresh');
              else fetchDashboardData();
            }}
            style={{
              height: 38,
              backgroundColor: colors.neutral[100],
              border: `1px solid ${colors.neutral[300]}`,
              borderRadius: radii.md,
              padding: '0 14px',
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              color: colors.neutral[700],
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {/* Multi-Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: spacing[2],
          borderBottom: `2px solid ${colors.neutral[200]}`,
          marginBottom: spacing[4],
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'pending', label: `Pending Consultations (${pendingList.length})`, icon: 'fa-clock' },
          { key: 'completed', label: `Completed (${completedList.length})`, icon: 'fa-check-circle' },
          { key: 'admissions', label: `Today's Admissions (${admissionList.length})`, icon: 'fa-bed' },
          { key: 'discharges', label: `Today's Discharges (${dischargeList.length})`, icon: 'fa-walking' },
          { key: 'surgeries', label: `Emergency Surgeries (${surgeryList.length})`, icon: 'fa-cut' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: `${spacing[3]} ${spacing[4]}`,
                borderRadius: `${radii.lg} ${radii.lg} 0 0`,
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? colors.primary[700] : colors.neutral[600],
                border: isActive ? `1px solid ${colors.neutral[200]}` : '1px solid transparent',
                borderBottom: isActive ? '2px solid #ffffff' : 'none',
                marginBottom: -2,
                fontSize: typography.fontSize.sm,
                fontWeight: isActive ? typography.fontWeight.bold : typography.fontWeight.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                whiteSpace: 'nowrap',
              }}
            >
              <i className={`fas ${tab.icon}`} style={{ color: isActive ? colors.danger[500] : colors.neutral[400] }}></i>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Operational Patient Grid Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.neutral[200]}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${colors.neutral[200]}` }}>
                <th style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.neutral[600], textTransform: 'uppercase' }}>
                  Patient / MRN
                </th>
                <th style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.neutral[600], textTransform: 'uppercase' }}>
                  Identifier / Visit #
                </th>
                <th style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.neutral[600], textTransform: 'uppercase' }}>
                  Timestamp / Date
                </th>
                <th style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.neutral[600], textTransform: 'uppercase' }}>
                  Triage / Status
                </th>
                <th style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.neutral[600], textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* PENDING LIST */}
              {activeTab === 'pending' &&
                filterList(pendingList).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: colors.neutral[900], fontSize: typography.fontSize.sm }}>
                        {row.PatientName || 'Unknown Patient'}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.neutral[500] }}>
                        MRN: {row.PatientMrn || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.sm, color: colors.neutral[700], fontWeight: 600 }}>
                      {row.VisitIdentifier || `AE-${row.Id || '00'}`}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, color: colors.neutral[600] }}>
                      {row.StartDate ? new Date(row.StartDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          padding: '3px 8px',
                          borderRadius: radii.full,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {row.TriageLevel || 'Urgent Triage'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: spacing[1] }}>
                        <button
                          onClick={() => dispatch('emr', row)}
                          style={{
                            backgroundColor: colors.primary[50],
                            color: colors.primary[700],
                            border: `1px solid ${colors.primary[200]}`,
                            padding: '4px 8px',
                            borderRadius: radii.md,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          EMR
                        </button>
                        <button
                          onClick={() => dispatch('triage', row)}
                          style={{
                            backgroundColor: colors.danger[50],
                            color: colors.danger[700],
                            border: `1px solid ${colors.danger[200]}`,
                            padding: '4px 8px',
                            borderRadius: radii.md,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Triage
                        </button>
                        <button
                          onClick={() => dispatch('admission', row)}
                          style={{
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            padding: '4px 8px',
                            borderRadius: radii.md,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Admit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {/* COMPLETED LIST */}
              {activeTab === 'completed' &&
                filterList(completedList).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: colors.neutral[900] }}>
                      {row.PatientName}
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.neutral[500], fontWeight: 400 }}>MRN: {row.PatientMrn}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.sm, color: colors.neutral[700] }}>
                      {row.VisitIdentifier || 'Completed'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, color: colors.neutral[600] }}>
                      {row.StartDate ? new Date(row.StartDate).toLocaleDateString() : 'Today'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: radii.full, fontSize: 11, fontWeight: 700 }}>
                        Consultation Done
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => dispatch('emr', row)}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: `1px solid ${colors.neutral[300]}`,
                          padding: '4px 8px',
                          borderRadius: radii.md,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        View Summary
                      </button>
                    </td>
                  </tr>
                ))}

              {/* ADMISSIONS LIST */}
              {activeTab === 'admissions' &&
                filterList(admissionList).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: colors.neutral[900] }}>
                      {row.PatientName}
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.neutral[500], fontWeight: 400 }}>MRN: {row.PatientMrn}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.sm, color: colors.primary[700], fontWeight: 700 }}>
                      {row.VisitIdentifier}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, color: colors.neutral[600] }}>
                      {row.AdmissionDate ? new Date(row.AdmissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: radii.full, fontSize: 11, fontWeight: 700 }}>
                        Inpatient / Bed Active
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => dispatch('bedboard', row)}
                        style={{
                          backgroundColor: colors.primary[50],
                          color: colors.primary[700],
                          border: `1px solid ${colors.primary[200]}`,
                          padding: '4px 8px',
                          borderRadius: radii.md,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Bed Board
                      </button>
                    </td>
                  </tr>
                ))}

              {/* DISCHARGES LIST */}
              {activeTab === 'discharges' &&
                filterList(dischargeList).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: colors.neutral[900] }}>
                      {row.PatientName}
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.neutral[500], fontWeight: 400 }}>MRN: {row.PatientMrn}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.sm, color: colors.neutral[700] }}>
                      {row.VisitIdentifier}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, color: colors.neutral[600] }}>
                      {row.DischargeDate ? new Date(row.DischargeDate).toLocaleDateString() : 'Today'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: radii.full, fontSize: 11, fontWeight: 700 }}>
                        Discharged
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => dispatch('dischargesummary', row)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: `1px solid ${colors.neutral[300]}`,
                          padding: '4px 8px',
                          borderRadius: radii.md,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Summary
                      </button>
                    </td>
                  </tr>
                ))}

              {/* SURGERIES LIST */}
              {activeTab === 'surgeries' &&
                filterList(surgeryList).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: colors.neutral[900] }}>
                      {row.PatientName}
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.neutral[500], fontWeight: 400 }}>MRN: {row.PatientMrn}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.sm, color: colors.neutral[700] }}>
                      {row.Encounter?.VisitIdentifier || 'OT-EMERGENCY'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: typography.fontSize.xs, color: colors.neutral[600] }}>
                      {row.OTScheduledOn ? new Date(row.OTScheduledOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Emergency Booking'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '3px 8px', borderRadius: radii.full, fontSize: 11, fontWeight: 700 }}>
                        OT Scheduled
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => dispatch('otschedule', row)}
                        style={{
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: radii.md,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        OT Details
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
