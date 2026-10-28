import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';
import { PatientProfileModal } from './PatientProfileModal';

export interface BedTransferItem {
  Id: number;
  TransferDate?: string;
  RequestIdentifier?: string;
  PatientId?: number;
  Patient?: {
    Id?: number;
    MRN?: string;
    FirstName?: string;
    LastName?: string;
    Title?: { Description?: string };
    Age?: number | string;
    Gender?: { Description?: string };
  };
  FromWard?: { WardName?: string; Id?: number };
  FromRoom?: { RoomNo?: string; Id?: number };
  FromBed?: { BedNo?: string; Id?: number };
  ToWard?: { WardName?: string; Id?: number };
  ToRoom?: { RoomNo?: string; Id?: number };
  ToBed?: { BedNo?: string; Id?: number };
  Doctor?: {
    Title?: { Description?: string };
    FirstName?: string;
    LastName?: string;
  };
  RequestedStatus?: {
    Id?: number;
    Description?: string;
  };
  ReceivedStatus?: {
    Id?: number;
    Description?: string;
  };
  ReceivedStatusId?: number;
  ReceivedBy?: number;
  ReceivedDate?: string;
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface BedReceiveListScreenProps {
  reactProps?: {
    items?: BedTransferItem[];
    lookup?: {
      Ward?: LookupOption[];
      ReceiveStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      patientnamemrn?: string;
      FromWardId?: number | string;
      ReceivedStatusId?: number | string;
      TransferDate?: string;
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

export const BedReceiveListScreen: React.FC<BedReceiveListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone States
  const [standaloneItems, setStandaloneItems] = useState<BedTransferItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wardList, setWardList] = useState<LookupOption[]>([]);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.patientnamemrn || ''
  );
  const [selectedWardId, setSelectedWardId] = useState<number | string>(
    reactProps?.currentfilter?.FromWardId ?? -1
  );
  const [selectedStatusId, setSelectedStatusId] = useState<number | string>(
    reactProps?.currentfilter?.ReceivedStatusId ?? 1
  );
  const [transferDateFilter, setTransferDateFilter] = useState<string>(() => {
    if (reactProps?.currentfilter?.TransferDate) {
      const d = reactProps.currentfilter.TransferDate;
      return typeof d === 'string' ? d.split('T')[0] : new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  // Modals
  const [profileModalPatientId, setProfileModalPatientId] = useState<number | null>(null);
  const [confirmReceiveModalItem, setConfirmReceiveModalItem] = useState<BedTransferItem | null>(null);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Sync hybrid filters
  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter) {
      if (reactProps.currentfilter.patientnamemrn !== undefined) {
        setSearchTerm(reactProps.currentfilter.patientnamemrn);
      }
      if (reactProps.currentfilter.FromWardId !== undefined) {
        setSelectedWardId(reactProps.currentfilter.FromWardId);
      }
      if (reactProps.currentfilter.ReceivedStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.ReceivedStatusId);
      }
      if (reactProps.currentfilter.TransferDate) {
        const d = reactProps.currentfilter.TransferDate;
        setTransferDateFilter(typeof d === 'string' ? d.split('T')[0] : transferDateFilter);
      }
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Standalone lookup fetch
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [
        { Key: 'Ward' },
        { Key: 'ReceiveStatus' },
      ]);
      if (res) {
        if (res.Ward) setWardList(res.Ward);
        if (res.ReceiveStatus) setStatusList(res.ReceiveStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch lookups in BedReceiveListScreen:', err);
    }
  }, []);

  // Standalone item fetch
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        const facilityId = sessionHelper.getFacilityId() || 1;
        const fromDate = transferDateFilter ? `${transferDateFilter} 00:00:00` : null;
        const toDate = transferDateFilter ? `${transferDateFilter} 23:59:59` : null;

        const inputData = {
          Params: [
            { Key: 1, Value: searchTerm || null },
            { Key: 2, Value: selectedWardId === -1 ? null : selectedWardId },
            { Key: 5, Value: fromDate },
            { Key: 6, Value: toDate },
            { Key: 19, Value: false },
            { Key: 20, Value: selectedStatusId === -1 ? null : selectedStatusId },
            { Key: 16, Value: facilityId },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/BedTransfer/GetBedTransfers', inputData);
        if (res && res.Data) {
          setStandaloneItems(res.Data);
          setStandaloneTotal(res.PageContext?.TotalRecords || res.Data.length);
        } else {
          setStandaloneItems([]);
          setStandaloneTotal(0);
        }
      } catch (err) {
        console.error('Error fetching bed transfers in BedReceiveListScreen:', err);
        setStandaloneItems([]);
        setStandaloneTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, searchTerm, selectedWardId, selectedStatusId, transferDateFilter]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchItems(standalonePage, standalonePageSize);
    }
  }, [isHybrid, fetchLookups, fetchItems, standalonePage, standalonePageSize]);

  // Computed data
  const rawItems: BedTransferItem[] = useMemo(() => {
    if (isHybrid) {
      return reactProps?.items || [];
    }
    return standaloneItems;
  }, [isHybrid, reactProps?.items, standaloneItems]);

  const totalCount = isHybrid
    ? reactProps?.pager?.totalItems ?? rawItems.length
    : standaloneTotal;
  const currentPage = isHybrid
    ? reactProps?.pager?.currentPage ?? 1
    : standalonePage;
  const pageSize = isHybrid
    ? reactProps?.pager?.pageSize ?? 25
    : standalonePageSize;

  // KPI Statistics
  const stats = useMemo(() => {
    let pending = 0;
    let received = 0;
    rawItems.forEach((item) => {
      if (item.ReceivedStatusId === 1) pending++;
      else if (item.ReceivedStatusId === 2) received++;
    });
    return {
      total: totalCount,
      pending,
      received,
    };
  }, [rawItems, totalCount]);

  // Lookups
  const wards: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.Ward) {
      return reactProps.lookup.Ward;
    }
    return wardList;
  }, [isHybrid, reactProps?.lookup?.Ward, wardList]);

  const receiveStatuses: LookupOption[] = useMemo(() => {
    if (isHybrid && reactProps?.lookup?.ReceiveStatus) {
      return reactProps.lookup.ReceiveStatus;
    }
    return statusList;
  }, [isHybrid, reactProps?.lookup?.ReceiveStatus, statusList]);

  // Actions
  const handleSearchSubmit = () => {
    if (isHybrid) {
      dispatch('filterChange', { field: 'patientnamemrn', value: searchTerm });
      dispatch('filterChange', { field: 'FromWardId', value: selectedWardId });
      dispatch('filterChange', { field: 'ReceivedStatusId', value: selectedStatusId });
      dispatch('filterChange', { field: 'TransferDate', value: transferDateFilter });
      dispatch('search');
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearchTerm('');
    setSelectedWardId(-1);
    setSelectedStatusId(1);
    setTransferDateFilter(today);

    if (isHybrid) {
      dispatch('filterChange', { field: 'patientnamemrn', value: '' });
      dispatch('filterChange', { field: 'FromWardId', value: -1 });
      dispatch('filterChange', { field: 'ReceivedStatusId', value: 1 });
      dispatch('filterChange', { field: 'TransferDate', value: today });
      dispatch('search');
    } else {
      setStandalonePage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    if (isHybrid) {
      dispatch('pageChange', { page: newPage });
    } else {
      setStandalonePage(newPage);
    }
  };

  const openReceiveModal = (item: BedTransferItem) => {
    setConfirmReceiveModalItem(item);
  };

  const handleConfirmReceive = async () => {
    if (!confirmReceiveModalItem) return;
    if (isHybrid) {
      dispatch('receive', { entity: confirmReceiveModalItem, id: confirmReceiveModalItem.Id });
    } else {
      try {
        const updateData = {
          ...confirmReceiveModalItem,
          Id: confirmReceiveModalItem.Id,
          ReceivedStatusId: 2,
          ReceivedBy: sessionHelper.getUserId() || 1,
          ReceivedDate: new Date().toISOString(),
        };
        await apiFetch<any>('ipmanagement/BedTransfer/UpdateBedTransfer', { Data: updateData });
        alert('Bed transfer successfully acknowledged and received!');
        fetchItems(standalonePage, standalonePageSize);
      } catch (err) {
        console.error('Failed to receive bed transfer:', err);
        alert('Failed to update bed transfer status.');
      }
    }
    setConfirmReceiveModalItem(null);
  };

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        backgroundColor: colors.background,
        minHeight: '100%',
        padding: spacing.lg,
        boxSizing: 'border-box',
        color: colors.textMain,
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
          backgroundColor: '#ffffff',
          padding: `${spacing.md} ${spacing.lg}`,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.md,
              backgroundColor: '#ccfbf1',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            <i className="fa fa-procedures" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textMain }}>
                Bed Transfer Receive
              </h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: '#ccfbf1',
                  color: '#0f766e',
                  padding: '2px 8px',
                  borderRadius: radii.sm,
                }}
              >
                Ward Bed Intake
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              Inpatient transfer arrival acknowledgment, destination bed receipt, and ward intake confirmation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <button
            onClick={() => handleSearchSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: colors.textMain,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <i className="fa fa-sync-alt" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted }}>
              Total Transfer Requests
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.textMain, marginTop: 4 }}>
              {stats.total}
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>Transfer orders routed to ward</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fa fa-exchange-alt" />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: radii.lg,
            border: '1px solid #fed7aa',
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#c2410c' }}>
              Pending Bed Receive
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#9a3412', marginTop: 4 }}>
              {stats.pending}
            </div>
            <span style={{ fontSize: 12, color: '#ea580c' }}>Awaiting nursing bed sign-in</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              backgroundColor: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fa fa-clock" />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: radii.lg,
            border: '1px solid #99f6e4',
            boxShadow: shadows.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f766e' }}>
              Received & Occupied
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#115e59', marginTop: 4 }}>
              {stats.received}
            </div>
            <span style={{ fontSize: 12, color: '#14b8a6' }}>Admitted into destination bed</span>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.full,
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <i className="fa fa-check-circle" />
          </div>
        </div>
      </div>

      {/* ── Modern Filter Bar ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: spacing.md,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: spacing.md,
            alignItems: 'flex-end',
          }}
        >
          {/* Patient Search */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Patient Name / MRN
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search patient name or UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  fontSize: 13,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  boxSizing: 'border-box',
                  outline: 'none',
                  color: colors.textMain,
                }}
              />
              <i
                className="fa fa-search"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 11,
                  color: '#94a3b8',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* From Ward */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Transferring Ward
            </label>
            <select
              value={selectedWardId}
              onChange={(e) => {
                const val = e.target.value === '-1' ? -1 : Number(e.target.value);
                setSelectedWardId(val);
                if (isHybrid) {
                  dispatch('filterChange', { field: 'FromWardId', value: val });
                  dispatch('search');
                }
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                outline: 'none',
                color: colors.textMain,
              }}
            >
              <option value="-1">All Source Wards</option>
              {wards.map((w) => (
                <option key={w.Id} value={w.Id}>
                  {w.Text || w.Description || `Ward #${w.Id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Receive Status
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => {
                const val = e.target.value === '-1' ? -1 : Number(e.target.value);
                setSelectedStatusId(val);
                if (isHybrid) {
                  dispatch('filterChange', { field: 'ReceivedStatusId', value: val });
                  dispatch('search');
                }
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                outline: 'none',
                color: colors.textMain,
              }}
            >
              <option value="-1">All Receive Statuses</option>
              {receiveStatuses.map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.Text || s.Description || `Status #${s.Id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Date */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Transfer Date
            </label>
            <input
              type="date"
              value={transferDateFilter}
              onChange={(e) => {
                setTransferDateFilter(e.target.value);
                if (isHybrid) {
                  dispatch('filterChange', { field: 'TransferDate', value: e.target.value });
                  dispatch('search');
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxSizing: 'border-box',
                outline: 'none',
                color: colors.textMain,
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={handleSearchSubmit}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: '#0d9488',
                color: '#ffffff',
                border: 'none',
                borderRadius: radii.md,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <i className="fa fa-filter" />
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              style={{
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.sm,
          overflow: 'hidden',
          marginBottom: spacing.lg,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: `1px solid ${colors.border}`,
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '14px 16px', width: 60, textAlign: 'center' }}>S.No</th>
                <th style={{ padding: '14px 16px' }}>Transfer Date & Time</th>
                <th style={{ padding: '14px 16px' }}>Ref Number</th>
                <th style={{ padding: '14px 16px' }}>Patient Details</th>
                <th style={{ padding: '14px 16px' }}>Destination Bed</th>
                <th style={{ padding: '14px 16px' }}>Requested By</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: 130 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: colors.textMuted }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <i className="fa fa-spinner fa-spin" style={{ fontSize: 20, color: '#0d9488' }} />
                      <span>Loading bed transfer requests...</span>
                    </div>
                  </td>
                </tr>
              ) : rawItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: colors.textMuted }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: colors.textSecondary }}>
                      No bed transfer receive orders found
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                      Try selecting another ward or date to locate active patient transfers.
                    </p>
                  </td>
                </tr>
              ) : (
                rawItems.map((item, idx) => {
                  const patient = item.Patient;
                  const patientId = item.PatientId || patient?.Id;
                  const pTitle = patient?.Title?.Description ? `${patient.Title.Description} ` : '';
                  const pName = `${pTitle}${patient?.FirstName || ''} ${patient?.LastName || ''}`.trim() || '—';
                  const mrn = patient?.MRN || '—';
                  const doctorName = item.Doctor
                    ? `${item.Doctor.Title?.Description || ''} ${item.Doctor.FirstName || ''} ${item.Doctor.LastName || ''}`.trim()
                    : '—';

                  const toWardDesc = `${item.ToWard?.WardName || ''} / ${item.ToRoom?.RoomNo || ''} / ${item.ToBed?.BedNo || ''}`;
                  const isReceived = item.ReceivedStatusId === 2;

                  return (
                    <tr
                      key={item.Id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa')
                      }
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: colors.textMain }}>
                          {item.TransferDate ? item.TransferDate.split('T')[0] : '—'}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          {item.TransferDate && item.TransferDate.includes('T')
                            ? item.TransferDate.split('T')[1].substring(0, 5)
                            : ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: '#0f766e',
                            backgroundColor: '#f0fdfa',
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            border: '1px solid #99f6e4',
                          }}
                        >
                          {item.RequestIdentifier || `TRF-${item.Id}`}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (patientId) {
                                setProfileModalPatientId(patientId);
                                if (isHybrid) dispatch('patientinfo', { entity: item });
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              fontWeight: 600,
                              color: '#0d9488',
                              cursor: patientId ? 'pointer' : 'default',
                              textAlign: 'left',
                              textDecoration: 'underline',
                              fontSize: 13,
                            }}
                          >
                            {pName}
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          UHID: {mrn} {patient?.Age ? `• ${patient.Age} yrs` : ''} {patient?.Gender?.Description ? `• ${patient.Gender.Description}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f766e' }}>
                          <i className="fa fa-bed" style={{ marginRight: 6, opacity: 0.7 }} />
                          {toWardDesc}
                        </div>
                        {item.FromWard?.WardName && (
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                            From: {item.FromWard.WardName} {item.FromBed?.BedNo ? `(${item.FromBed.BedNo})` : ''}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: colors.textSecondary }}>{doctorName}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {isReceived ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: radii.full,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                            Received
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: radii.full,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f97316' }} />
                            Pending Receive
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isReceived ? (
                          <button
                            disabled
                            style={{
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: '#f1f5f9',
                              color: '#94a3b8',
                              border: '1px solid #cbd5e1',
                              borderRadius: radii.md,
                              cursor: 'not-allowed',
                            }}
                          >
                            Received
                          </button>
                        ) : (
                          <button
                            onClick={() => openReceiveModal(item)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#0d9488',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: radii.md,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: '0 1px 2px rgba(13, 148, 136, 0.25)',
                            }}
                          >
                            <i className="fa fa-inbox" />
                            Receive
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Built-in Pagination Bar ── */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Showing {rawItems.length} of {totalCount} transfers
          </div>
          <Pagination
            totalItems={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ── Modal: Bed Receive Confirmation ── */}
      {confirmReceiveModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
              backgroundColor: '#ffffff',
              borderRadius: radii.xl,
              width: '100%',
              maxWidth: 500,
              boxShadow: shadows.lg,
              border: `1px solid ${colors.border}`,
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.md,
                    backgroundColor: '#ccfbf1',
                    color: '#0d9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className="fa fa-procedures" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textMain }}>
                  Confirm Inbound Bed Receive
                </h3>
              </div>
              <button
                onClick={() => setConfirmReceiveModalItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.textSecondary }}>
                Do you want to acknowledge and receive this patient into the assigned destination bed?
              </p>

              <div
                style={{
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: radii.md,
                  padding: 14,
                  marginBottom: 20,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8 }}>
                  <span style={{ color: colors.textMuted }}>Patient:</span>
                  <strong>
                    {confirmReceiveModalItem.Patient
                      ? `${confirmReceiveModalItem.Patient.FirstName || ''} ${confirmReceiveModalItem.Patient.LastName || ''}`
                      : '—'}
                  </strong>

                  <span style={{ color: colors.textMuted }}>Destination Bed:</span>
                  <strong style={{ color: '#0f766e' }}>
                    {confirmReceiveModalItem.ToWard?.WardName} / {confirmReceiveModalItem.ToRoom?.RoomNo} / {confirmReceiveModalItem.ToBed?.BedNo}
                  </strong>

                  <span style={{ color: colors.textMuted }}>From Ward:</span>
                  <span>{confirmReceiveModalItem.FromWard?.WardName || '—'}</span>

                  <span style={{ color: colors.textMuted }}>Ref Identifier:</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {confirmReceiveModalItem.RequestIdentifier || `TRF-${confirmReceiveModalItem.Id}`}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
                <button
                  onClick={() => setConfirmReceiveModalItem(null)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReceive}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: radii.md,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 3px rgba(13, 148, 136, 0.3)',
                  }}
                >
                  <i className="fa fa-check" />
                  Confirm & Receive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Patient Profile ── */}
      {profileModalPatientId && (
        <PatientProfileModal
          patientId={profileModalPatientId}
          onClose={() => setProfileModalPatientId(null)}
        />
      )}
    </div>
  );
};
