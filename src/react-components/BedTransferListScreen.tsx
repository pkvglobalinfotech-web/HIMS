import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { printWithBrowser } from '../printing/browserPrint';

export interface BedTransferItem {
  Id: number;
  TransferDate?: string;
  RequestDate?: string;
  RequestIdentifier?: string;
  VisitIdentifier?: string;
  EncounterId?: number;
  PatientId?: number;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Age?: number | string;
    Gender?: { Description?: string };
    Title?: { Description?: string };
    Mobile?: string;
  };
  FromWard?: { WardName?: string };
  FromRoom?: { RoomNo?: string };
  FromBed?: { BedNo?: string };
  FromWardMaster?: { WardName?: string };
  FromWardRoomMaster?: { RoomNo?: string };
  FromWardRoomBedMaster?: { BedNo?: string };
  ToWard?: { WardName?: string };
  ToRoom?: { RoomNo?: string };
  ToBed?: { BedNo?: string };
  ToWardMaster?: { WardName?: string };
  ToWardRoomMaster?: { RoomNo?: string };
  ToWardRoomBedMaster?: { BedNo?: string };
  Doctor?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  Department?: { DepartmentName?: string };
  Status?: { Description?: string };
  RequestedStatus?: { Description?: string };
  TransferStatusId?: number;
  RequestedStatusId?: number;
  Remarks?: string;
  Reason?: string;
  [key: string]: any;
}

export interface LookupOption {
  Id: number;
  Text: string;
  Description?: string;
  Code?: string;
}

export interface BedTransferListScreenProps {
  reactProps?: {
    items?: BedTransferItem[];
    totalItems?: number;
    currentPage?: number;
    pageSize?: number;
    currentfilter?: {
      patientnamemrn?: string;
      TransferDate?: string;
      WardId?: number | string;
      FromWardId?: number | string;
      StatusId?: number | string;
      RequestedStatusId?: number | string;
      RoomTypeId?: number | string;
      Context?: string;
    };
    lookup?: {
      Ward?: LookupOption[];
      RoomType?: LookupOption[];
      Status?: LookupOption[];
      RequestedStatus?: LookupOption[];
      Doctor?: LookupOption[];
      Department?: LookupOption[];
    };
    context?: string;
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const BedTransferListScreen: React.FC<BedTransferListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && Array.isArray(reactProps.items));

  // Standalone State
  const [standaloneItems, setStandaloneItems] = useState<BedTransferItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [standaloneLookups, setStandaloneLookups] = useState<{
    Ward: LookupOption[];
    Doctor: LookupOption[];
    Department: LookupOption[];
    Status: LookupOption[];
  }>({
    Ward: [],
    Doctor: [],
    Department: [],
    Status: [],
  });

  // Filter State
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.patientnamemrn || ''
  );
  const [transferDate, setTransferDate] = useState<string>(() => {
    if (reactProps?.currentfilter?.TransferDate) {
      try {
        const d = new Date(reactProps.currentfilter.TransferDate);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch {}
    }
    return new Date().toISOString().split('T')[0];
  });

  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'week' | 'all' | 'custom'>('today');
  const [selectedWard, setSelectedWard] = useState<number | string>(
    reactProps?.currentfilter?.FromWardId ?? reactProps?.currentfilter?.WardId ?? -1
  );
  const [selectedStatus, setSelectedStatus] = useState<number | string>(
    reactProps?.currentfilter?.RequestedStatusId ?? reactProps?.currentfilter?.StatusId ?? -1
  );

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [selectedDoctor, setSelectedDoctor] = useState<number | string>(-1);
  const [selectedDepartment, setSelectedDepartment] = useState<number | string>(-1);
  const [refNumberFilter, setRefNumberFilter] = useState<string>('');

  // Selected Item Modal State
  const [selectedTransfer, setSelectedTransfer] = useState<BedTransferItem | null>(null);

  // Sync props from hybrid wrapper
  useEffect(() => {
    if (reactProps?.currentfilter) {
      if (reactProps.currentfilter.patientnamemrn !== undefined) {
        setSearchTerm(reactProps.currentfilter.patientnamemrn);
      }
      if (reactProps.currentfilter.WardId !== undefined || reactProps.currentfilter.FromWardId !== undefined) {
        setSelectedWard(reactProps.currentfilter.FromWardId ?? reactProps.currentfilter.WardId ?? -1);
      }
      if (reactProps.currentfilter.StatusId !== undefined || reactProps.currentfilter.RequestedStatusId !== undefined) {
        setSelectedStatus(reactProps.currentfilter.RequestedStatusId ?? reactProps.currentfilter.StatusId ?? -1);
      }
      if (reactProps.currentfilter.TransferDate) {
        try {
          const d = new Date(reactProps.currentfilter.TransferDate);
          if (!isNaN(d.getTime())) setTransferDate(d.toISOString().split('T')[0]);
        } catch {}
      }
    }
  }, [reactProps?.currentfilter]);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) onAction(action, payload);
  };

  // Fetch Lookups for standalone mode
  const fetchStandaloneLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [
        { Key: 'Ward' },
        { Key: 'RequestedStatus' },
        { Key: 'Doctor' },
        { Key: 'Department' },
      ]);
      if (res && typeof res === 'object') {
        setStandaloneLookups({
          Ward: Array.isArray(res.Ward) ? res.Ward : [],
          Doctor: Array.isArray(res.Doctor) ? res.Doctor : [],
          Department: Array.isArray(res.Department) ? res.Department : [],
          Status: Array.isArray(res.RequestedStatus) ? res.RequestedStatus : [],
        });
      }
    } catch (e) {
      console.warn('Failed to fetch standalone lookups for bed transfer', e);
    }
  }, []);

  // Fetch items for standalone mode
  const fetchStandaloneList = useCallback(
    async (page: number = 1, pageSize: number = 25) => {
      setIsLoading(true);
      try {
        const facilityId = sessionHelper.getFacilityId() || 1;
        let From: string | null = null;
        let To: string | null = null;

        if (dateFilterMode !== 'all' && transferDate) {
          From = `${transferDate} 00:00:00`;
          To = `${transferDate} 23:59:59`;
        }

        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm || '' },
            { Key: 2, Value: Number(selectedWard) },
            { Key: 18, Value: selectedStatus === -1 ? null : String(selectedStatus) },
            { Key: 5, Value: From },
            { Key: 6, Value: To },
            { Key: 7, Value: selectedDepartment === -1 ? null : Number(selectedDepartment) },
            { Key: 8, Value: selectedDoctor === -1 ? null : Number(selectedDoctor) },
            { Key: 11, Value: refNumberFilter || null },
            { Key: 16, Value: facilityId },
          ],
          PageContext: {
            PageSize: pageSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/BedTransfer/GetBedTransfers', inputData);
        if (res) {
          setStandaloneItems(res.Data || []);
          setStandaloneTotal(res.PageContext?.TotalRecords || 0);
          setStandalonePage(page);
          setStandalonePageSize(pageSize);
        }
      } catch (err) {
        console.error('Failed to fetch standalone bed transfers:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [transferDate, dateFilterMode, selectedWard, selectedStatus, searchTerm, selectedDepartment, selectedDoctor, refNumberFilter]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchStandaloneLookups();
      fetchStandaloneList(1, 25);
    }
  }, [isHybrid, fetchStandaloneLookups, fetchStandaloneList]);

  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'patientnamemrn', value: searchTerm });
      dispatch('search');
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    if (field === 'patientnamemrn') setSearchTerm(value);
    if (field === 'TransferDate') {
      setTransferDate(value);
      setDateFilterMode('custom');
    }
    if (field === 'WardId' || field === 'FromWardId') setSelectedWard(value);
    if (field === 'StatusId' || field === 'RequestedStatusId') setSelectedStatus(value);

    if (isHybrid) {
      dispatch('filterChangeAndSearch', { field, value });
    }
  };

  const handleQuickDatePreset = (mode: 'today' | 'yesterday' | 'week' | 'all') => {
    setDateFilterMode(mode);
    const now = new Date();
    let target = now.toISOString().split('T')[0];

    if (mode === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      target = y.toISOString().split('T')[0];
    }

    setTransferDate(target);

    if (isHybrid) {
      dispatch('filterChangeAndSearch', { field: 'TransferDate', value: target });
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchTerm('');
    setTransferDate(today);
    setDateFilterMode('today');
    setSelectedWard(-1);
    setSelectedStatus(-1);
    setSelectedDoctor(-1);
    setSelectedDepartment(-1);
    setRefNumberFilter('');

    if (isHybrid) {
      dispatch('resetFilters');
    } else {
      fetchStandaloneList(1, standalonePageSize);
    }
  };

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('pageChange', { page });
    } else {
      fetchStandaloneList(page, standalonePageSize);
    }
  };

  const items = isHybrid ? reactProps?.items || [] : standaloneItems;
  const totalItems = isHybrid ? reactProps?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pageSize || 25 : standalonePageSize;

  const wardsList = isHybrid
    ? reactProps?.lookup?.Ward || []
    : standaloneLookups.Ward;

  const doctorsList = isHybrid
    ? reactProps?.lookup?.Doctor || []
    : standaloneLookups.Doctor;

  const departmentsList = isHybrid
    ? reactProps?.lookup?.Department || []
    : standaloneLookups.Department;

  const context = reactProps?.context || reactProps?.currentfilter?.Context || '';

  // KPI Metrics Calculation
  const kpiCounts = useMemo(() => {
    let requested = 0;
    let inTransit = 0;
    let completed = 0;

    items.forEach((item) => {
      const statusId = item.RequestedStatusId ?? item.TransferStatusId;
      const desc = (item.RequestedStatus?.Description || item.Status?.Description || '').toLowerCase();
      if (statusId === 1 || desc.includes('request')) requested++;
      else if (statusId === 2 || desc.includes('transit') || desc.includes('authoriz')) inTransit++;
      else if (statusId === 3 || desc.includes('complet')) completed++;
    });

    return {
      total: totalItems || items.length,
      requested,
      inTransit,
      completed,
    };
  }, [items, totalItems]);

  const formatDate = (val?: string) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  };

  const getStatusBadge = (item: BedTransferItem) => {
    const statusId = item.RequestedStatusId ?? item.TransferStatusId;
    const desc = (item.RequestedStatus?.Description || item.Status?.Description || 'Completed').trim();

    if (statusId === 1 || desc.toLowerCase().includes('request')) {
      return {
        label: desc || 'Requested',
        bg: '#fffbeb',
        color: '#b45309',
        border: '#fde68a',
        icon: 'fa-clock-o',
      };
    }
    if (statusId === 2 || desc.toLowerCase().includes('transit') || desc.toLowerCase().includes('authoriz')) {
      return {
        label: desc || 'In Transit',
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        icon: 'fa-exchange',
      };
    }
    if (statusId === 4 || desc.toLowerCase().includes('cancel')) {
      return {
        label: desc || 'Cancelled',
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
        icon: 'fa-times-circle',
      };
    }
    return {
      label: desc || 'Completed',
      bg: '#f0fdf4',
      color: '#15803d',
      border: '#bbf7d0',
      icon: 'fa-check-circle',
    };
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('No bed transfer records available to export.');
      return;
    }

    const headers = ['#', 'Transfer Date', 'Ref Number', 'IP Number', 'Patient Name', 'MRN', 'Age', 'Gender', 'From Ward/Room/Bed', 'To Ward/Room/Bed', 'Doctor', 'Status'];
    const rows = items.map((item, idx) => {
      const p = item.Patient || {};
      const pName = `${p.Title?.Description || ''} ${p.FirstName || ''} ${p.LastName || ''}`.trim();
      const fromLoc = [item.FromWardMaster?.WardName || item.FromWard?.WardName, item.FromWardRoomMaster?.RoomNo || item.FromRoom?.RoomNo, item.FromWardRoomBedMaster?.BedNo || item.FromBed?.BedNo].filter(Boolean).join(' / ');
      const toLoc = [item.ToWardMaster?.WardName || item.ToWard?.WardName, item.ToWardRoomMaster?.RoomNo || item.ToRoom?.RoomNo, item.ToWardRoomBedMaster?.BedNo || item.ToBed?.BedNo].filter(Boolean).join(' / ');
      const doc = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim();
      const st = item.RequestedStatus?.Description || item.Status?.Description || 'Completed';

      return [
        idx + 1,
        item.TransferDate || '',
        item.RequestIdentifier || '',
        item.VisitIdentifier || '',
        `"${pName.replace(/"/g, '""')}"`,
        p.MRN || '',
        p.Age || '',
        p.Gender?.Description || '',
        `"${fromLoc.replace(/"/g, '""')}"`,
        `"${toLoc.replace(/"/g, '""')}"`,
        `"${doc.replace(/"/g, '""')}"`,
        st,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bed_transfers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Transfer Slip
  const handlePrintSlip = (item: BedTransferItem) => {
    const p = item.Patient || {};
    const fullName = `${p.Title?.Description || ''} ${p.FirstName || ''} ${p.LastName || ''}`.trim() || '—';
    const fromLoc = [item.FromWardMaster?.WardName || item.FromWard?.WardName, item.FromWardRoomMaster?.RoomNo || item.FromRoom?.RoomNo, item.FromWardRoomBedMaster?.BedNo || item.FromBed?.BedNo].filter(Boolean).join(' / ') || '—';
    const toLoc = [item.ToWardMaster?.WardName || item.ToWard?.WardName, item.ToWardRoomMaster?.RoomNo || item.ToRoom?.RoomNo, item.ToWardRoomBedMaster?.BedNo || item.ToBed?.BedNo].filter(Boolean).join(' / ') || '—';
    const docName = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim() || '—';
    const st = item.RequestedStatus?.Description || item.Status?.Description || 'Completed';

    const slipHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bed Relocation Order - ${item.VisitIdentifier || ''}</title>
          <style>
            @page { size: A5 landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 16px; color: #0f172a; }
            .order-card { border: 2px solid #2563eb; border-radius: 8px; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 0; }
            .ref { font-size: 13px; font-weight: 700; color: #2563eb; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 13px; }
            .journey { grid-column: span 2; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 14px 20px; border-radius: 6px; margin: 12px 0; }
            .loc-box { flex: 1; }
            .loc-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
            .loc-val { font-size: 15px; font-weight: 800; color: #0f172a; }
            .arrow { font-size: 24px; color: #2563eb; padding: 0 20px; }
            .footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="order-card">
            <div class="header">
              <div>
                <h1 class="title">Internal In-Patient Bed Relocation Slip</h1>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Department of In-Patient Nursing & Ward Management</div>
              </div>
              <div style="text-align: right;">
                <div class="ref">REF: ${item.RequestIdentifier || item.Id || 'TR-001'}</div>
                <div style="font-size: 11px; color: #64748b;">${formatDate(item.TransferDate)}</div>
              </div>
            </div>

            <div class="grid">
              <div><strong>Patient Name:</strong> ${fullName}</div>
              <div><strong>IP Number:</strong> ${item.VisitIdentifier || '—'}</div>
              <div><strong>UHID / MRN:</strong> ${p.MRN || '—'}</div>
              <div><strong>Age / Gender:</strong> ${p.Age || '—'} / ${p.Gender?.Description || '—'}</div>
              <div><strong>Consultant Doctor:</strong> ${docName}</div>
              <div><strong>Status:</strong> ${st}</div>

              <div class="journey">
                <div class="loc-box">
                  <div class="loc-title" style="color: #dc2626;">From Origin Bed</div>
                  <div class="loc-val" style="color: #991b1b;">${fromLoc}</div>
                </div>
                <div class="arrow">➔</div>
                <div class="loc-box" style="text-align: right;">
                  <div class="loc-title" style="color: #059669;">To Assigned Bed</div>
                  <div class="loc-val" style="color: #065f46;">${toLoc}</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <div>Transferred By: __________________</div>
              <div>Ward Sister / Nurse: __________________</div>
              <div>Authorized Signatory: __________________</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWithBrowser(slipHtml);
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        color: colors.textMain,
        padding: '20px 24px',
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          padding: '18px 24px',
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
              width: 48,
              height: 48,
              borderRadius: radii.md,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            }}
          >
            <i className="fa fa-exchange" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textMain, letterSpacing: '-0.01em' }}>
                In-Patient Bed Transfers
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: radii.full,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                }}
              >
                {totalItems} Records
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Hospital IP Relocation Management • Ward, Room & Bed Shifting Tracking
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <button
            onClick={() => dispatch('addNew')}
            title="Create New Bed Transfer Request"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            <i className="fa fa-plus" />
            <span>New Bed Transfer</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Export Records to CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              boxShadow: shadows.sm,
            }}
          >
            <i className="fa fa-download" style={{ color: '#0284c7' }} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              if (isHybrid) dispatch('search');
              else fetchStandaloneList(currentPage, pageSize);
            }}
            title="Refresh List"
            style={{
              width: 38,
              height: 38,
              borderRadius: radii.md,
              backgroundColor: '#ffffff',
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: shadows.sm,
            }}
          >
            <i className={`fa fa-refresh ${isLoading ? 'fa-spin' : ''}`} />
          </button>

          {(context === 'frontoffice' || context === 'nursing') && (
            <button
              onClick={() => dispatch('backToList')}
              title="Return to Dashboard"
              style={{
                width: 38,
                height: 38,
                borderRadius: radii.md,
                backgroundColor: '#f1f5f9',
                border: `1px solid ${colors.border}`,
                color: colors.textMain,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-home" />
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        {/* Total Transfers */}
        <div
          onClick={() => handleFilterChange('StatusId', -1)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Total Relocations</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-exchange" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.textMain, marginTop: 6 }}>
            {kpiCounts.total}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            All ward/room transfer events
          </div>
        </div>

        {/* Pending Requests */}
        <div
          onClick={() => handleFilterChange('StatusId', 1)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: selectedStatus === 1 ? '1.5px solid #f59e0b' : `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>Pending Requests</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-clock-o" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 6 }}>
            {kpiCounts.requested}
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
            Awaiting bed approval or allocation
          </div>
        </div>

        {/* In Transit */}
        <div
          onClick={() => handleFilterChange('StatusId', 2)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: selectedStatus === 2 ? '1.5px solid #0284c7' : `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>In Transit / Active</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-spinner fa-spin" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', marginTop: 6 }}>
            {kpiCounts.inTransit}
          </div>
          <div style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }}>
            Authorized & currently moving
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => handleFilterChange('StatusId', 3)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: radii.lg,
            border: selectedStatus === 3 ? '1.5px solid #10b981' : `1px solid ${colors.border}`,
            padding: '16px 20px',
            boxShadow: shadows.sm,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = shadows.sm;
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Completed Transfers</span>
            <div style={{ width: 34, height: 34, borderRadius: radii.full, backgroundColor: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa fa-check-circle" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 6 }}>
            {kpiCounts.completed}
          </div>
          <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>
            Occupancy assigned and completed
          </div>
        </div>
      </div>

      {/* ── Search & Filters Toolbar ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          padding: '16px 20px',
          marginBottom: spacing.md,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: spacing.md,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient Search */}
          <div style={{ minWidth: 220, gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Search Patient / MRN / IP#
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder="Type Patient Name, MRN or IP No..."
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 36px 0 12px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    handleFilterChange('patientnamemrn', '');
                  }}
                  style={{
                    position: 'absolute',
                    right: 30,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: colors.textMuted,
                  }}
                >
                  <i className="fa fa-times" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSearchSubmit}
                style={{
                  position: 'absolute',
                  right: 8,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#2563eb',
                  fontSize: 14,
                }}
              >
                <i className="fa fa-search" />
              </button>
            </div>
          </div>

          {/* Transfer Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Transfer Date
            </label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => handleFilterChange('TransferDate', e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Ward */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Ward / Department
            </label>
            <select
              value={selectedWard}
              onChange={(e) => handleFilterChange('FromWardId', e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Origin Wards</option>
              {wardsList.map((w) => (
                <option key={w.Id} value={w.Id}>
                  {w.Text || w.Description}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 5 }}>
              Transfer Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange('StatusId', e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: 13,
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="-1">All Statuses</option>
              <option value="1">Requested (Pending)</option>
              <option value="2">In Transit (Authorized)</option>
              <option value="3">Completed</option>
              <option value="4">Cancelled</option>
            </select>
          </div>

          {/* Action Filter Buttons */}
          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                flex: 1,
                height: 38,
                padding: '0 10px',
                borderRadius: radii.md,
                border: `1px solid ${showAdvancedFilters ? '#2563eb' : colors.border}`,
                backgroundColor: showAdvancedFilters ? '#eff6ff' : '#f8fafc',
                color: showAdvancedFilters ? '#2563eb' : colors.textMain,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-sliders" />
              <span>Filters</span>
            </button>

            <button
              onClick={handleResetFilters}
              title="Reset all filters to default"
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: '#f8fafc',
                color: colors.textMuted,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa fa-refresh" />
            </button>
          </div>
        </div>

        {/* Quick Date Presets Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginRight: 4 }}>Date Presets:</span>
          {(['today', 'yesterday', 'all'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleQuickDatePreset(mode)}
              style={{
                padding: '3px 10px',
                fontSize: 12,
                borderRadius: radii.full,
                border: `1px solid ${dateFilterMode === mode ? '#2563eb' : colors.border}`,
                backgroundColor: dateFilterMode === mode ? '#2563eb' : '#ffffff',
                color: dateFilterMode === mode ? '#ffffff' : colors.textMain,
                fontWeight: dateFilterMode === mode ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {mode === 'all' ? 'All Dates' : mode}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px dashed ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: spacing.md,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                Consultant Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="-1">All Doctors</option>
                {doctorsList.map((d) => (
                  <option key={d.Id} value={d.Id}>
                    {d.Text || d.Description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="-1">All Departments</option>
                {departmentsList.map((dep) => (
                  <option key={dep.Id} value={dep.Id}>
                    {dep.Text || dep.Description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                Reference / Order #
              </label>
              <input
                type="text"
                value={refNumberFilter}
                onChange={(e) => setRefNumberFilter(e.target.value)}
                placeholder="Order Reference..."
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  if (isHybrid) dispatch('search');
                  else fetchStandaloneList(1, standalonePageSize);
                }}
                style={{
                  height: 36,
                  padding: '0 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: radii.md,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply Advanced Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Transfers Table Card ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
          marginBottom: spacing.md,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: `1px solid ${colors.border}`,
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '14px 16px', width: 45 }}>#</th>
                <th style={{ padding: '14px 16px' }}>Date & Time</th>
                <th style={{ padding: '14px 16px' }}>IP / Order Ref</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>From Location (Origin)</th>
                <th style={{ padding: '14px 16px' }}>To Location (Destination)</th>
                <th style={{ padding: '14px 16px' }}>Requested By</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '56px 16px', textAlign: 'center', color: colors.textMuted }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: radii.full,
                        backgroundColor: '#f1f5f9',
                        color: '#94a3b8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        marginBottom: 12,
                      }}
                    >
                      <i className="fa fa-bed" />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                      No Bed Transfers Found
                    </div>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                      Try adjusting your date range, origin ward, or search keywords.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const sNo = (currentPage - 1) * pageSize + index + 1;
                  const patient = item.Patient || {};
                  const fullName = `${patient.Title?.Description || ''} ${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || '—';
                  const fromLoc = [item.FromWardMaster?.WardName || item.FromWard?.WardName, item.FromWardRoomMaster?.RoomNo || item.FromRoom?.RoomNo, item.FromWardRoomBedMaster?.BedNo || item.FromBed?.BedNo].filter(Boolean).join(' / ') || '—';
                  const toLoc = [item.ToWardMaster?.WardName || item.ToWard?.WardName, item.ToWardRoomMaster?.RoomNo || item.ToRoom?.RoomNo, item.ToWardRoomBedMaster?.BedNo || item.ToBed?.BedNo].filter(Boolean).join(' / ') || '—';
                  const doctorName = `${item.Doctor?.Title?.Description || ''} ${item.Doctor?.FirstName || ''} ${item.Doctor?.LastName || ''}`.trim() || '—';
                  const statusBadge = getStatusBadge(item);
                  const statusId = item.RequestedStatusId ?? item.TransferStatusId;

                  // Initials
                  const initials = fullName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0].toUpperCase())
                    .join('') || 'PT';

                  return (
                    <tr
                      key={item.Id || index}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* S.No */}
                      <td style={{ padding: '14px 16px', color: colors.textMuted, fontWeight: 500 }}>
                        {sNo}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: colors.textMain }}>
                          <i className="fa fa-calendar-o" style={{ color: '#64748b', fontSize: 12 }} />
                          <span>{formatDate(item.TransferDate)}</span>
                        </div>
                      </td>

                      {/* IP / Ref Number */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {item.VisitIdentifier || '—'}
                        </div>
                        {item.RequestIdentifier && (
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                            Ref: {item.RequestIdentifier}
                          </div>
                        )}
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: radii.full,
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              fontWeight: 700,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div
                              onClick={() => dispatch('patientinfo', item)}
                              style={{
                                fontWeight: 700,
                                color: '#2563eb',
                                cursor: 'pointer',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {fullName}
                            </div>
                            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                              <strong>MRN:</strong> {patient.MRN || '—'} &bull; {patient.Age ? `${patient.Age}Y` : ''} {patient.Gender?.Description ? `/${patient.Gender.Description}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* From Bed */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: radii.sm, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>
                          <i className="fa fa-sign-out" />
                          <span>{fromLoc}</span>
                        </div>
                      </td>

                      {/* To Bed */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: radii.sm, backgroundColor: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
                          <i className="fa fa-sign-in" />
                          <span>{toLoc}</span>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>
                          {doctorName}
                        </div>
                        {item.Department?.DepartmentName && (
                          <div style={{ fontSize: 11, color: colors.textMuted }}>
                            {item.Department.DepartmentName}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: radii.full,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                          }}
                        >
                          <i className={`fa ${statusBadge.icon}`} style={{ fontSize: 10 }} />
                          <span>{statusBadge.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* View Details */}
                          <button
                            onClick={() => setSelectedTransfer(item)}
                            title="View Relocation Details"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <i className="fa fa-eye" />
                          </button>

                          {/* Print Transfer Slip */}
                          <button
                            onClick={() => handlePrintSlip(item)}
                            title="Print Transfer Slip"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radii.sm,
                              border: `1px solid ${colors.border}`,
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <i className="fa fa-print" />
                          </button>

                          {/* Edit / Process (Active requests) */}
                          {(statusId === 1 || statusId === 2) && (
                            <button
                              onClick={() => dispatch('edit', item)}
                              title="Process / Edit Bed Transfer"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: radii.sm,
                                border: `1px solid ${colors.border}`,
                                backgroundColor: '#ffffff',
                                color: '#15803d',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="fa fa-pencil" />
                            </button>
                          )}

                          {/* Cancel Transfer (Active requests) */}
                          {statusId === 2 && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to cancel Bed Transfer Order ${item.RequestIdentifier || item.Id}?`)) {
                                  dispatch('cancel', item);
                                }
                              }}
                              title="Cancel Transfer Order"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: radii.sm,
                                border: `1px solid ${colors.border}`,
                                backgroundColor: '#ffffff',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="fa fa-ban" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#ffffff',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Showing <strong>{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> bed transfers
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── View Details Modal Popup ── */}
      {selectedTransfer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setSelectedTransfer(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: radii.lg,
              boxShadow: shadows.lg,
              maxWidth: 580,
              width: '100%',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  <i className="fa fa-bed" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                    Bed Transfer Relocation Order
                  </h3>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>
                    Ref: {selectedTransfer.RequestIdentifier || selectedTransfer.Id || 'TR-001'} &bull; {formatDate(selectedTransfer.TransferDate)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 18,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <i className="fa fa-times" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              {/* Patient Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  backgroundColor: '#f8fafc',
                  borderRadius: radii.md,
                  border: `1px solid ${colors.border}`,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radii.full,
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    fontWeight: 700,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {((selectedTransfer.Patient?.FirstName || 'P')[0]).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {selectedTransfer.Patient?.Title?.Description} {selectedTransfer.Patient?.FirstName} {selectedTransfer.Patient?.LastName}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    <strong>IP No:</strong> {selectedTransfer.VisitIdentifier || '—'} &bull; <strong>MRN:</strong> {selectedTransfer.Patient?.MRN || '—'} &bull; {selectedTransfer.Patient?.Age}Y/{selectedTransfer.Patient?.Gender?.Description}
                  </div>
                </div>
              </div>

              {/* Journey Visualizer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f1f5f9',
                  border: '1px dashed #cbd5e1',
                  borderRadius: radii.md,
                  padding: '16px 20px',
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                    From Origin Bed
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#991b1b', marginTop: 4 }}>
                    {[selectedTransfer.FromWardMaster?.WardName || selectedTransfer.FromWard?.WardName, selectedTransfer.FromWardRoomMaster?.RoomNo || selectedTransfer.FromRoom?.RoomNo, selectedTransfer.FromWardRoomBedMaster?.BedNo || selectedTransfer.FromBed?.BedNo].filter(Boolean).join(' / ') || '—'}
                  </div>
                </div>

                <div style={{ fontSize: 24, color: '#2563eb' }}>
                  <i className="fa fa-arrow-right" />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                    To Assigned Bed
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#065f46', marginTop: 4 }}>
                    {[selectedTransfer.ToWardMaster?.WardName || selectedTransfer.ToWard?.WardName, selectedTransfer.ToWardRoomMaster?.RoomNo || selectedTransfer.ToRoom?.RoomNo, selectedTransfer.ToWardRoomBedMaster?.BedNo || selectedTransfer.ToBed?.BedNo].filter(Boolean).join(' / ') || '—'}
                  </div>
                </div>
              </div>

              {/* Clinical Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 13, borderBottom: `1px solid ${colors.border}`, paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <span style={{ color: colors.textMuted }}>Consultant Doctor:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedTransfer.Doctor?.Title?.Description} {selectedTransfer.Doctor?.FirstName} {selectedTransfer.Doctor?.LastName || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Department:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedTransfer.Department?.DepartmentName || 'General Ward'}
                  </div>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Current Status:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedTransfer.RequestedStatus?.Description || selectedTransfer.Status?.Description || 'Completed'}
                  </div>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Relocation Date:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {formatDate(selectedTransfer.TransferDate)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => handlePrintSlip(selectedTransfer)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: radii.md,
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <i className="fa fa-print" />
                  <span>Print Relocation Slip</span>
                </button>
                <button
                  onClick={() => setSelectedTransfer(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: '#ffffff',
                    color: colors.textMain,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
