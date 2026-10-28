import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { APIHelper } from './utils/APIHelper';
import { alert } from './utils/alert';
import { sessionHelper } from '../services/sessionHelper';

export interface DischargeNoteEntity {
  Id: number;
  CreatedAt?: string;
  AdmissionDate?: string;
  DischargeDate?: string;
  PatientId?: number;
  EncounterId?: number;
  DoctorId?: number;
  Doctor?: string;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    firstname?: string;
    lastname?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string };
  };
  Encounter?: {
    Id?: number;
    VisitIdentifier?: string;
  };
  DischargeType?: {
    Id?: number;
    Description?: string;
  };
  ProfileMaster?: {
    Id?: number;
    Name?: string;
  };
  ProgressNoteStatus?: {
    Id?: number;
    Description?: string;
  };
  ProgressNoteStatusId?: number;
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface DischargeNotesListScreenProps {
  reactProps?: {
    items?: DischargeNoteEntity[];
    lookup?: {
      ProgressNoteStatus?: LookupOption[];
      Profile?: LookupOption[];
      Doctor?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      PatientMRN?: string;
      IPNumber?: string;
      fromdate?: string;
      todate?: string;
      DoctorId?: number | string;
      DoctorName?: string;
      ProgressNoteStatusId?: number | string;
      Context?: string;
      [key: string]: any;
    };
    pager?: {
      totalItems: number;
      currentPage: number;
      pageSize: number;
    };
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

export const DischargeNotesListScreen: React.FC<DischargeNotesListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone States
  const [standaloneItems, setStandaloneItems] = useState<DischargeNoteEntity[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters
  const [patientSearch, setPatientSearch] = useState<string>(reactProps?.currentfilter?.PatientMRN || '');
  const [ipSearch, setIpSearch] = useState<string>(reactProps?.currentfilter?.IPNumber || '');
  const [fromDate, setFromDate] = useState<string>(() => {
    if (reactProps?.currentfilter?.fromdate) {
      const d = reactProps.currentfilter.fromdate;
      return typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0];
    }
    // Default 7 days back to today
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    if (reactProps?.currentfilter?.todate) {
      const d = reactProps.currentfilter.todate;
      return typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>(
    reactProps?.currentfilter?.DoctorId ?? -1
  );
  const [selectedStatusId, setSelectedStatusId] = useState<number | string>(
    reactProps?.currentfilter?.ProgressNoteStatusId ?? -1
  );

  // Lookups
  const [doctorList, setDoctorList] = useState<LookupOption[]>(reactProps?.lookup?.Doctor || []);
  const [statusList, setStatusList] = useState<LookupOption[]>(
    reactProps?.lookup?.ProgressNoteStatus || [
      { Id: -1, Text: 'All Statuses' },
      { Id: 1, Text: 'Draft' },
      { Id: 2, Text: 'Completed' },
      { Id: 3, Text: 'Approved' },
    ]
  );

  // Modals
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DischargeNoteEntity | null>(null);
  const [previewNoteItem, setPreviewNoteItem] = useState<DischargeNoteEntity | null>(null);

  // Sync hybrid props
  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter) {
      if (reactProps.currentfilter.PatientMRN !== undefined) setPatientSearch(reactProps.currentfilter.PatientMRN);
      if (reactProps.currentfilter.IPNumber !== undefined) setIpSearch(reactProps.currentfilter.IPNumber);
      if (reactProps.currentfilter.fromdate) {
        const d = reactProps.currentfilter.fromdate;
        setFromDate(typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0]);
      }
      if (reactProps.currentfilter.todate) {
        const d = reactProps.currentfilter.todate;
        setToDate(typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0]);
      }
      if (reactProps.currentfilter.DoctorId !== undefined) setSelectedDoctorId(reactProps.currentfilter.DoctorId);
      if (reactProps.currentfilter.ProgressNoteStatusId !== undefined)
        setSelectedStatusId(reactProps.currentfilter.ProgressNoteStatusId);
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Load standalone doctors & status lookups
  useEffect(() => {
    if (!isHybrid) {
      const loadOptions = async () => {
        try {
          const res: any = await apiFetch('General/Options/getoptions', [
            { Key: 'ProgressNoteStatus' },
            { Key: 'Profile' },
          ]);
          if (res?.ProgressNoteStatus) {
            setStatusList([
              { Id: -1, Text: 'All Statuses' },
              ...res.ProgressNoteStatus.map((s: any) => ({ Id: s.Id, Text: s.Text || s.Description })),
            ]);
          }
          // Fetch Doctors
          const docRes: any = await apiFetch('SystemSettings/User/GetUsers', {
            Params: [{ Key: 3, Value: 2 }], // Doctor Group
            PageContext: { PageSize: 100, PageNumber: 1 },
          });
          if (docRes?.Data) {
            setDoctorList(
              docRes.Data.map((doc: any) => {
                const title = doc.Title?.Description || '';
                const name = [title, doc.FirstName, doc.LastName].filter(Boolean).join(' ');
                return { Id: doc.Id, Text: name || `Doctor #${doc.Id}` };
              })
            );
          }
        } catch (e) {
          console.warn('Error loading options in DischargeNotesListScreen', e);
        }
      };
      loadOptions();
    }
  }, [isHybrid]);

  // Standalone list fetcher
  const fetchStandaloneList = useCallback(async () => {
    if (isHybrid) return;
    setIsLoading(true);
    try {
      const formattedFrom = fromDate ? `${fromDate} 00:00:00` : null;
      const formattedTo = toDate ? `${toDate} 23:59:59` : null;

      const params: any[] = [
        { Key: 4, Value: selectedDoctorId !== -1 ? Number(selectedDoctorId) : -1 },
        { Key: 5, Value: selectedStatusId !== -1 ? Number(selectedStatusId) : -1 },
        { Key: 11, Value: 2 }, // Discharge notes / consultation type
        { Key: 15, Value: patientSearch.trim() || null },
        { Key: 16, Value: ipSearch.trim() || null },
      ];

      if (!patientSearch && !ipSearch && formattedFrom && formattedTo) {
        params.push({ Key: 7, Value: formattedFrom }, { Key: 8, Value: formattedTo });
      }

      const res: any = await apiFetch('emr/consultation/GetConsultations', {
        Params: params,
        PageContext: {
          PageSize: standalonePageSize,
          PageNumber: standalonePage,
        },
      });

      setStandaloneItems(res?.Data || []);
      setStandaloneTotal(res?.PageContext?.TotalRecords || 0);
    } catch (err) {
      console.error('Error fetching discharge notes', err);
      setStandaloneItems([]);
      setStandaloneTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    isHybrid,
    standalonePage,
    standalonePageSize,
    patientSearch,
    ipSearch,
    fromDate,
    toDate,
    selectedDoctorId,
    selectedStatusId,
  ]);

  useEffect(() => {
    if (!isHybrid) {
      fetchStandaloneList();
    }
  }, [isHybrid, fetchStandaloneList]);

  // Items to display
  const items: DischargeNoteEntity[] = useMemo(() => {
    if (isHybrid) {
      return reactProps?.items || [];
    }
    return standaloneItems;
  }, [isHybrid, reactProps?.items, standaloneItems]);

  const totalItems = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  // KPI Calculations
  const stats = useMemo(() => {
    const total = totalItems || items.length;
    let completed = 0;
    let draft = 0;
    let approved = 0;

    items.forEach((item) => {
      const sId = item.ProgressNoteStatusId || item.ProgressNoteStatus?.Id;
      if (sId === 2) completed++;
      else if (sId === 1) draft++;
      else if (sId === 3) approved++;
    });

    return { total, completed, draft, approved };
  }, [totalItems, items]);

  // Dispatch action to hybrid parent or local handler
  const handleAction = (key: string, entity: DischargeNoteEntity) => {
    if (isHybrid) {
      onAction?.('rowAction', { key, id: entity.Id, entity });
    } else {
      if (key === 'print') {
        APIHelper.doDownload({
          action: 'emr/consultation/PrintDischargeCasesheet',
          data: {
            Id: Number(entity.Id),
            Data: {
              PatientId: entity.PatientId,
              EncounterId: entity.EncounterId,
              ConsultationId: entity.Id,
            },
          },
        });
      } else if (key === 'reviewnote') {
        setPreviewNoteItem(entity);
      } else if (key === 'delete') {
        setDeleteConfirmItem(entity);
      } else if (key === 'edit') {
        window.location.hash = `#/patientemr/dischargecasesheet/${entity.Id}`;
      }
    }
  };

  const handleApplyFilter = () => {
    if (isHybrid) {
      onAction?.('filterChange', {
        PatientMRN: patientSearch,
        IPNumber: ipSearch,
        fromdate: fromDate,
        todate: toDate,
        DoctorId: selectedDoctorId,
        ProgressNoteStatusId: selectedStatusId,
      });
    } else {
      setStandalonePage(1);
      fetchStandaloneList();
    }
  };

  const handleResetFilter = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const defFrom = d.toISOString().split('T')[0];
    const defTo = new Date().toISOString().split('T')[0];

    setPatientSearch('');
    setIpSearch('');
    setFromDate(defFrom);
    setToDate(defTo);
    setSelectedDoctorId(-1);
    setSelectedStatusId(-1);

    if (isHybrid) {
      onAction?.('filterChange', {
        PatientMRN: '',
        IPNumber: '',
        fromdate: defFrom,
        todate: defTo,
        DoctorId: -1,
        ProgressNoteStatusId: -1,
      });
    } else {
      setStandalonePage(1);
    }
  };

  const setDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    let f = new Date();
    let t = new Date();

    if (preset === 'today') {
      // today to today
    } else if (preset === 'yesterday') {
      f.setDate(f.getDate() - 1);
      t.setDate(t.getDate() - 1);
    } else if (preset === 'week') {
      f.setDate(f.getDate() - 7);
    } else if (preset === 'month') {
      f.setDate(f.getDate() - 30);
    }

    const fromStr = f.toISOString().split('T')[0];
    const toStr = t.toISOString().split('T')[0];
    setFromDate(fromStr);
    setToDate(toStr);

    if (isHybrid) {
      onAction?.('filterChange', {
        PatientMRN: patientSearch,
        IPNumber: ipSearch,
        fromdate: fromStr,
        todate: toStr,
        DoctorId: selectedDoctorId,
        ProgressNoteStatusId: selectedStatusId,
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isHybrid) {
      onAction?.('pageChange', { page: newPage });
    } else {
      setStandalonePage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isHybrid) {
      onAction?.('pageSizeChange', { pageSize: newSize });
    } else {
      setStandalonePageSize(newSize);
      setStandalonePage(1);
    }
  };

  // Helper date formatting
  const formatDateTime = (val?: string) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return val;
    }
  };

  // Status Badge styling helper
  const renderStatusBadge = (statusDesc?: string, statusId?: number) => {
    const desc = statusDesc || (statusId === 2 ? 'Completed' : statusId === 1 ? 'Draft' : 'Pending');
    let bg = '#eff6ff';
    let color = '#1d4ed8';
    let border = '#bfdbfe';

    if (desc.toLowerCase().includes('completed') || statusId === 2) {
      bg = '#ecfdf5';
      color = '#047857';
      border = '#a7f3d0';
    } else if (desc.toLowerCase().includes('draft') || statusId === 1) {
      bg = '#fffbeb';
      color = '#b45309';
      border = '#fde68a';
    } else if (desc.toLowerCase().includes('approved') || statusId === 3) {
      bg = '#f0fdf4';
      color = '#15803d';
      border = '#bbf7d0';
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: radii.full,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {desc}
      </span>
    );
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
      {/* ──────────────── Header Section ──────────────── */}
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
              <i className="fas fa-file-medical" style={{ color: colors.primary }} />
              Inpatient Discharge Notes
            </h2>
            <span
              style={{
                backgroundColor: colors.primaryLight,
                color: colors.primary,
                padding: '2px 10px',
                borderRadius: radii.full,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {totalItems} Total Records
            </span>
          </div>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: fontSizes.xs,
              color: colors.text.secondary,
            }}
          >
            Inpatient Clinical Casesheets, Attending Physician Discharge Notes &amp; Summary Records
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleApplyFilter}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radii.md,
              color: colors.text.primary,
              fontSize: fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: shadows.xs,
            }}
          >
            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`} style={{ color: colors.primary }} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/app/dischargesummary-form/';
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: radii.md,
              color: '#ffffff',
              fontSize: fontSizes.sm,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.3)',
            }}
          >
            <i className="fas fa-plus" />
            New Discharge Summary
          </button>
        </div>
      </div>

      {/* ──────────────── Stat KPI Cards ──────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing.md,
        }}
      >
        {/* Total Notes */}
        <div
          style={{
            background: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.subtle}`,
            padding: spacing.md,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: fontSizes.xs, color: colors.text.secondary, fontWeight: 600 }}>
              Total Discharge Notes
            </div>
            <div style={{ fontSize: fontSizes.xxl, fontWeight: 800, color: colors.text.primary, marginTop: 4 }}>
              {stats.total}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: colors.primaryLight,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fas fa-notes-medical" />
          </div>
        </div>

        {/* Completed */}
        <div
          style={{
            background: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.subtle}`,
            padding: spacing.md,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: fontSizes.xs, color: colors.text.secondary, fontWeight: 600 }}>
              Completed &amp; Signed
            </div>
            <div style={{ fontSize: fontSizes.xxl, fontWeight: 800, color: '#047857', marginTop: 4 }}>
              {stats.completed}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fas fa-check-double" />
          </div>
        </div>

        {/* Draft */}
        <div
          style={{
            background: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.subtle}`,
            padding: spacing.md,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: fontSizes.xs, color: colors.text.secondary, fontWeight: 600 }}>
              Drafts / In-Progress
            </div>
            <div style={{ fontSize: fontSizes.xxl, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
              {stats.draft}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fas fa-pencil-alt" />
          </div>
        </div>

        {/* Approved */}
        <div
          style={{
            background: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.subtle}`,
            padding: spacing.md,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: fontSizes.xs, color: colors.text.secondary, fontWeight: 600 }}>
              Approved by Consultant
            </div>
            <div style={{ fontSize: fontSizes.xxl, fontWeight: 800, color: colors.accent, marginTop: 4 }}>
              {stats.approved}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: '#eef2ff',
              color: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fas fa-stamp" />
          </div>
        </div>
      </div>

      {/* ──────────────── Modern Unified Filter Bar ──────────────── */}
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          padding: spacing.lg,
          boxShadow: shadows.sm,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: fontSizes.sm, fontWeight: 700, color: colors.text.primary }}>
            <i className="fas fa-filter" style={{ color: colors.primary, marginRight: 6 }} />
            Search &amp; Filter Criteria
          </span>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: colors.text.secondary, fontWeight: 600 }}>Presets:</span>
            <button
              type="button"
              onClick={() => setDatePreset('today')}
              style={{
                padding: '4px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.subtle}`,
                background: colors.background.secondary,
                fontSize: 11,
                fontWeight: 600,
                color: colors.text.primary,
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('yesterday')}
              style={{
                padding: '4px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.subtle}`,
                background: colors.background.secondary,
                fontSize: 11,
                fontWeight: 600,
                color: colors.text.primary,
                cursor: 'pointer',
              }}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('week')}
              style={{
                padding: '4px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.subtle}`,
                background: colors.background.secondary,
                fontSize: 11,
                fontWeight: 600,
                color: colors.text.primary,
                cursor: 'pointer',
              }}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('month')}
              style={{
                padding: '4px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.subtle}`,
                background: colors.background.secondary,
                fontSize: 11,
                fontWeight: 600,
                color: colors.text.primary,
                cursor: 'pointer',
              }}
            >
              This Month
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing.md,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient MRN / Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
              Patient Name / MRN:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Name or MRN..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border.default}`,
                  fontSize: fontSizes.xs,
                  boxSizing: 'border-box',
                }}
              />
              <i
                className="fas fa-search"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.text.tertiary }}
              />
            </div>
          </div>

          {/* IP Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
              IP / Visit #:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. IP-10492"
                value={ipSearch}
                onChange={(e) => setIpSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border.default}`,
                  fontSize: fontSizes.xs,
                  boxSizing: 'border-box',
                }}
              />
              <i
                className="fas fa-hospital-user"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.text.tertiary }}
              />
            </div>
          </div>

          {/* From Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
              From Date:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.default}`,
                fontSize: fontSizes.xs,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* To Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
              To Date:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.default}`,
                fontSize: fontSizes.xs,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Doctor Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
              Attending Doctor:
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.default}`,
                fontSize: fontSizes.xs,
                boxSizing: 'border-box',
                background: colors.surface,
              }}
            >
              <option value={-1}>-- All Doctors --</option>
              {doctorList.map((doc) => (
                <option key={doc.Id} value={doc.Id}>
                  {doc.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.secondary }}>
              Note Status:
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => setSelectedStatusId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border.default}`,
                fontSize: fontSizes.xs,
                boxSizing: 'border-box',
                background: colors.surface,
              }}
            >
              {statusList.map((st) => (
                <option key={st.Id} value={st.Id}>
                  {st.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleApplyFilter}
              style={{
                flex: 1,
                padding: '8px 14px',
                backgroundColor: colors.primary,
                border: 'none',
                borderRadius: radii.md,
                color: '#ffffff',
                fontSize: fontSizes.xs,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.background.tertiary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: radii.md,
                color: colors.text.secondary,
                fontSize: fontSizes.xs,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Reset Filters"
            >
              <i className="fas fa-undo" />
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── Main Data Table ──────────────── */}
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.xl,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: fontSizes.xs,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.background.secondary,
                  borderBottom: `2px solid ${colors.border.subtle}`,
                }}
              >
                <th style={{ padding: '12px 14px', width: 48, fontWeight: 700, color: colors.text.primary }}>#</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Date &amp; Time</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Patient Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>UHID / MRN</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>IP Number</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Admission (DOA)</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Discharge (DOD)</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Discharge Type</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Attending Doctor</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Note Template</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: colors.text.primary }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: colors.text.primary }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: 'center', color: colors.text.secondary }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: radii.full,
                          backgroundColor: colors.background.tertiary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          color: colors.text.tertiary,
                        }}
                      >
                        <i className="fas fa-folder-open" />
                      </div>
                      <div style={{ fontSize: fontSizes.md, fontWeight: 700, color: colors.text.primary }}>
                        No Discharge Notes Found
                      </div>
                      <div style={{ fontSize: fontSizes.xs, color: colors.text.secondary, maxWidth: 360 }}>
                        No records match the current filter criteria. Try expanding the date range or clearing filters.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetFilter}
                        style={{
                          marginTop: 6,
                          padding: '6px 16px',
                          backgroundColor: colors.primaryLight,
                          color: colors.primary,
                          border: `1px solid ${colors.primaryMid}`,
                          borderRadius: radii.md,
                          fontSize: fontSizes.xs,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((entity, idx) => {
                  const p = entity.Patient || {};
                  const title = p.Title?.Description ? p.Title.Description + ' ' : '';
                  const firstName = p.FirstName || p.firstname || '';
                  const lastName = p.LastName || p.lastname || '';
                  const patientFullName = `${title}${firstName} ${lastName}`.trim() || 'Patient #' + entity.Id;
                  const mrn = p.MRN || '—';
                  const ipNo = entity.Encounter?.VisitIdentifier || '—';
                  const doctorName = entity.Doctor || '—';
                  const notesName = entity.ProfileMaster?.Name || 'General Casesheet';
                  const statusDesc = entity.ProgressNoteStatus?.Description || 'Draft';
                  const sNo = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={entity.Id}
                      style={{
                        borderBottom: `1px solid ${colors.border.subtle}`,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = colors.background.secondary)}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: colors.text.secondary }}>{sNo}</td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: colors.text.primary }}>
                          {formatDateTime(entity.CreatedAt)}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.full,
                              backgroundColor: colors.primaryLight,
                              color: colors.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {patientFullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: colors.text.primary }}>{patientFullName}</div>
                            {p.Age && (
                              <div style={{ fontSize: 10, color: colors.text.secondary }}>
                                {p.Age} Yrs &bull; {p.Gender?.Description || ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: colors.text.primary,
                            padding: '2px 6px',
                            background: colors.background.tertiary,
                            borderRadius: radii.sm,
                          }}
                        >
                          {mrn}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: colors.primary,
                            padding: '2px 6px',
                            background: colors.primaryLight,
                            borderRadius: radii.sm,
                          }}
                        >
                          {ipNo}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: colors.text.secondary }}>
                        {formatDateTime(entity.AdmissionDate)}
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: colors.text.secondary }}>
                        {formatDateTime(entity.DischargeDate)}
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: colors.background.tertiary,
                            color: colors.text.primary,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {entity.DischargeType?.Description || 'Normal'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text.primary }}>
                          <i className="fas fa-user-md" style={{ color: colors.accent, fontSize: 11 }} />
                          <span style={{ fontWeight: 600 }}>{doctorName}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', color: colors.text.primary, fontWeight: 600 }}>
                        {notesName}
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(statusDesc, entity.ProgressNoteStatusId)}
                      </td>

                      {/* Row Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleAction('reviewnote', entity)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.md,
                              border: `1px solid ${colors.border.subtle}`,
                              backgroundColor: colors.surface,
                              color: colors.primary,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Summary Notes"
                          >
                            <i className="fas fa-file-medical" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction('print', entity)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.md,
                              border: `1px solid ${colors.border.subtle}`,
                              backgroundColor: colors.surface,
                              color: colors.text.primary,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Print Casesheet"
                          >
                            <i className="fas fa-print" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction('edit', entity)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.md,
                              border: `1px solid ${colors.border.subtle}`,
                              backgroundColor: colors.surface,
                              color: colors.accent,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Inpatient Casesheet"
                          >
                            <i className="fas fa-procedures" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction('delete', entity)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.md,
                              border: `1px solid ${colors.border.subtle}`,
                              backgroundColor: colors.surface,
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete Note"
                          >
                            <i className="fas fa-trash-alt" />
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

        {/* ──────────────── Modern Pagination Bar ──────────────── */}
        <div
          style={{
            padding: `${spacing.md}px ${spacing.xl}px`,
            borderTop: `1px solid ${colors.border.subtle}`,
            backgroundColor: colors.background.secondary,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.md,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: fontSizes.xs, color: colors.text.secondary }}>
              Showing {items.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} records
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: fontSizes.xs, color: colors.text.secondary }}>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.border.default}`,
                  fontSize: fontSizes.xs,
                  background: colors.surface,
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(totalItems / pageSize))}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ──────────────── Note Preview Modal ──────────────── */}
      {previewNoteItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
              maxWidth: 600,
              width: '100%',
              boxShadow: shadows.xl,
              border: `1px solid ${colors.border.subtle}`,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-file-medical-alt" style={{ color: colors.primary, fontSize: 18 }} />
                <h3 style={{ margin: 0, fontSize: fontSizes.md, fontWeight: 700 }}>
                  Discharge Summary Note Overview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNoteItem(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: colors.text.tertiary,
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: radii.lg,
                padding: spacing.md,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                fontSize: fontSizes.xs,
              }}
            >
              <div>
                <span style={{ color: colors.text.secondary }}>Patient:</span>
                <div style={{ fontWeight: 700, color: colors.text.primary, marginTop: 2 }}>
                  {previewNoteItem.Patient?.FirstName} {previewNoteItem.Patient?.LastName}
                </div>
              </div>
              <div>
                <span style={{ color: colors.text.secondary }}>UHID / MRN:</span>
                <div style={{ fontWeight: 700, color: colors.text.primary, marginTop: 2 }}>
                  {previewNoteItem.Patient?.MRN}
                </div>
              </div>
              <div>
                <span style={{ color: colors.text.secondary }}>Visit Number:</span>
                <div style={{ fontWeight: 700, color: colors.primary, marginTop: 2 }}>
                  {previewNoteItem.Encounter?.VisitIdentifier}
                </div>
              </div>
              <div>
                <span style={{ color: colors.text.secondary }}>Attending Doctor:</span>
                <div style={{ fontWeight: 700, color: colors.text.primary, marginTop: 2 }}>
                  {previewNoteItem.Doctor}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setPreviewNoteItem(null)}
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
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const ent = previewNoteItem;
                  setPreviewNoteItem(null);
                  handleAction('print', ent);
                }}
                style={{
                  padding: '8px 18px',
                  backgroundColor: colors.primary,
                  border: 'none',
                  borderRadius: radii.md,
                  color: '#ffffff',
                  fontSize: fontSizes.sm,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-print" style={{ marginRight: 6 }} />
                Print Full Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── Delete Confirmation Modal ──────────────── */}
      {deleteConfirmItem && (
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
              maxWidth: 440,
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
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <i className="fas fa-trash-alt" />
              </div>
              <h3 style={{ margin: 0, fontSize: fontSizes.lg, fontWeight: 700, color: colors.text.primary }}>
                Delete Discharge Note
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: fontSizes.sm, color: colors.text.secondary, lineHeight: 1.5 }}>
              Are you sure you want to delete consultation note #{deleteConfirmItem.Id} for patient{' '}
              <strong>
                {deleteConfirmItem.Patient?.FirstName} {deleteConfirmItem.Patient?.LastName}
              </strong>
              ? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
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
                onClick={async () => {
                  const id = deleteConfirmItem.Id;
                  setDeleteConfirmItem(null);
                  try {
                    await apiFetch('emr/consultation/DeleteConsultation', { Id: id });
                    alert.showSuccessMsg('Discharge note deleted successfully.');
                    fetchStandaloneList();
                  } catch (e) {
                    alert.showErrorMsg('Failed to delete discharge note.');
                  }
                }}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: radii.md,
                  color: '#ffffff',
                  fontSize: fontSizes.sm,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
