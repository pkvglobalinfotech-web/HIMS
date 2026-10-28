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

export interface OtBedReceiveListScreenProps {
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

export const OtBedReceiveListScreen: React.FC<OtBedReceiveListScreenProps> = ({
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
      console.warn('Failed to fetch lookups in OtBedReceiveListScreen:', err);
    }
  }, []);

  // Standalone item fetch (Key 19: true for OT)
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
            { Key: 19, Value: true }, // OT bed receive filter
            { Key: 20, Value: selectedStatusId === -1 ? null : selectedStatusId },
            { Key: 16, Value: facilityId },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('IPManagement/BedTransfer/GetBedTransfers', inputData);
        if (res) {
          setStandaloneItems(res.Data || []);
          setStandaloneTotal(res.PageContext?.TotalRecords || 0);
        }
      } catch (err) {
        console.error('Failed to fetch OT bed transfers:', err);
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

  // Derived effective data
  const rawItems = isHybrid ? reactProps?.items || [] : standaloneItems;
  const wards = isHybrid ? reactProps?.lookup?.Ward || [] : wardList;
  const statuses = isHybrid ? reactProps?.lookup?.ReceiveStatus || [] : statusList;
  const totalItems = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  // Stats calculation
  const stats = useMemo(() => {
    let pending = 0;
    let received = 0;
    rawItems.forEach((item) => {
      if (item.ReceivedStatusId === 1 || item.ReceivedStatus?.Id === 1) {
        pending++;
      } else if (item.ReceivedStatusId === 2 || item.ReceivedStatus?.Id === 2) {
        received++;
      }
    });
    return {
      total: totalItems,
      pageCount: rawItems.length,
      pending,
      received,
    };
  }, [rawItems, totalItems]);

  const handleSearchCommit = () => {
    if (isHybrid) {
      dispatch('updateFilter', { patientnamemrn: searchTerm });
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleWardChange = (wardId: number | string) => {
    setSelectedWardId(wardId);
    if (isHybrid) {
      dispatch('updateFilter', { FromWardId: wardId });
    } else {
      setStandalonePage(1);
    }
  };

  const handleStatusChange = (statusId: number | string) => {
    setSelectedStatusId(statusId);
    if (isHybrid) {
      dispatch('updateFilter', { ReceivedStatusId: statusId });
    } else {
      setStandalonePage(1);
    }
  };

  const handleDateChange = (dateVal: string) => {
    setTransferDateFilter(dateVal);
    if (isHybrid) {
      dispatch('updateFilter', { TransferDate: dateVal });
    } else {
      setStandalonePage(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (isHybrid) {
      dispatch('changePage', page);
    } else {
      setStandalonePage(page);
      fetchItems(page, standalonePageSize);
    }
  };

  const handleOpenReceiveConfirm = (item: BedTransferItem) => {
    if (isHybrid) {
      dispatch('receiveBed', item);
    } else {
      setConfirmReceiveModalItem(item);
    }
  };

  const handleExecuteReceiveStandalone = async () => {
    if (!confirmReceiveModalItem) return;
    try {
      const payload = {
        ...confirmReceiveModalItem,
        Id: confirmReceiveModalItem.Id,
        ReceivedStatusId: 2,
        ReceivedBy: sessionHelper.getUserId() || 1,
        ReceivedDate: new Date().toISOString(),
      };
      await apiFetch<any>('ipmanagement/BedTransfer/UpdateBedTransfer', { Data: payload });
      setConfirmReceiveModalItem(null);
      fetchItems(standalonePage, standalonePageSize);
    } catch (err) {
      console.error('Failed to receive bed transfer:', err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

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
          marginBottom: spacing.lg,
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
              width: '46px',
              height: '46px',
              borderRadius: radii.lg,
              backgroundColor: `${colors.primary}15`,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            <i className="fas fa-procedures" />
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
                OT Bed Transfer Receive
              </h2>
              <span
                style={{
                  backgroundColor: '#0284c718',
                  color: '#0284c7',
                  padding: '3px 10px',
                  borderRadius: radii.full,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  border: '1px solid #0284c730',
                }}
              >
                Operating Theatre
              </span>
            </div>
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
              }}
            >
              Monitor, receive, and confirm patient bed transfers to Operating Theatres & Recovery Suites
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button
            onClick={() => {
              if (isHybrid) dispatch('refresh');
              else fetchItems(standalonePage, standalonePageSize);
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
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#3b82f618',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-exchange-alt" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Total OT Transfers
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
              {totalItems}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#f59e0b18',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-clock" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Pending OT Receive
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#d97706' }}>
              {stats.pending}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#10b98118',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-check-circle" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Received at OT
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#059669' }}>
              {stats.received}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.xs,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: radii.md,
              backgroundColor: '#8b5cf618',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fas fa-calendar-day" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Date Selected
            </div>
            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
              {formatDate(transferDateFilter)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          borderRadius: radii.xl,
          boxShadow: shadows.xs,
          border: `1px solid ${colors.border}`,
          marginBottom: spacing.lg,
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 220px', minWidth: '200px', position: 'relative' }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textSecondary,
              fontSize: '14px',
            }}
          />
          <input
            type="text"
            placeholder="Search Name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchCommit()}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md} ${spacing.sm} 36px`,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              outline: 'none',
              backgroundColor: colors.background,
            }}
          />
        </div>

        {/* From Ward Filter */}
        <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
          <select
            value={selectedWardId}
            onChange={(e) => handleWardChange(Number(e.target.value) || e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          >
            <option value={-1}>All From Wards</option>
            {wards.map((w) => (
              <option key={w.Id} value={w.Id}>
                {w.Text || w.Description || `Ward ${w.Id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
          <select
            value={selectedStatusId}
            onChange={(e) => handleStatusChange(Number(e.target.value) || e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          >
            <option value={-1}>All Statuses</option>
            {statuses.map((s) => (
              <option key={s.Id} value={s.Id}>
                {s.Text || s.Description}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
          <input
            type="date"
            value={transferDateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: spacing.sm,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              fontSize: typography.fontSize.sm,
              backgroundColor: colors.background,
              outline: 'none',
            }}
          />
        </div>

        {/* Search / Action Button */}
        <button
          onClick={handleSearchCommit}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: '#fff',
            borderRadius: radii.md,
            border: 'none',
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <i className="fas fa-filter" /> Apply
        </button>
      </div>

      {/* Main Grid Table */}
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.border}`,
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
              fontSize: typography.fontSize.sm,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.background,
                  borderBottom: `2px solid ${colors.border}`,
                  color: colors.textSecondary,
                  fontWeight: typography.fontWeight.semibold,
                }}
              >
                <th style={{ padding: `${spacing.md} ${spacing.lg}` }}>Transfer Date / Time</th>
                <th style={{ padding: spacing.md }}>Ref Number</th>
                <th style={{ padding: spacing.md }}>Patient Details</th>
                <th style={{ padding: spacing.md }}>From Ward / Bed</th>
                <th style={{ padding: spacing.md }}>To OT / Bed</th>
                <th style={{ padding: spacing.md }}>Doctor</th>
                <th style={{ padding: spacing.md }}>Status</th>
                <th style={{ padding: `${spacing.md} ${spacing.lg}`, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: spacing['2xl'], color: colors.textSecondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: spacing.sm }} />
                    Loading OT bed transfers...
                  </td>
                </tr>
              ) : rawItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: spacing['2xl'] }}>
                    <div style={{ fontSize: '36px', color: colors.textSecondary, marginBottom: spacing.sm }}>
                      <i className="fas fa-bed" />
                    </div>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                      No OT Bed Transfer Requests Found
                    </div>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
                      Try adjusting the date, ward, or search filter.
                    </div>
                  </td>
                </tr>
              ) : (
                rawItems.map((item, idx) => {
                  const patient = item.Patient || {};
                  const title = patient.Title?.Description ? `${patient.Title.Description} ` : '';
                  const fullName = `${title}${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || 'Unknown Patient';
                  const isReceived = item.ReceivedStatusId === 2 || item.ReceivedStatus?.Id === 2;

                  return (
                    <tr
                      key={item.Id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s ease',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : `${colors.background}40`,
                      }}
                    >
                      {/* Date & Time */}
                      <td style={{ padding: `${spacing.md} ${spacing.lg}` }}>
                        <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>
                          {formatDate(item.TransferDate)}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                          {formatTime(item.TransferDate)}
                        </div>
                      </td>

                      {/* Ref Identifier */}
                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: `${colors.primary}12`,
                            color: colors.primary,
                            fontWeight: typography.fontWeight.medium,
                            fontSize: typography.fontSize.xs,
                          }}
                        >
                          {item.RequestIdentifier || `REF-${item.Id}`}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: spacing.md }}>
                        <button
                          onClick={() => {
                            if (item.Patient?.Id) {
                              if (isHybrid) dispatch('patientinfo', item);
                              else setProfileModalPatientId(item.Patient.Id);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: colors.primary,
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.sm,
                          }}
                        >
                          {fullName}
                        </button>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: '2px' }}>
                          MRN: <strong>{patient.MRN || '—'}</strong> | {patient.Age ? `${patient.Age}Y` : '—'} | {patient.Gender?.Description || '—'}
                        </div>
                      </td>

                      {/* From Bed */}
                      <td style={{ padding: spacing.md }}>
                        <div style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>
                          {item.FromWard?.WardName || '—'}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                          {item.FromRoom?.RoomNo ? `Room ${item.FromRoom.RoomNo}` : ''}
                          {item.FromBed?.BedNo ? ` / Bed ${item.FromBed.BedNo}` : ''}
                        </div>
                      </td>

                      {/* To OT Bed */}
                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: radii.md,
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.xs,
                          }}
                        >
                          <i className="fas fa-door-open" /> {item.ToWard?.WardName || 'OT Ward'}
                        </span>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: '3px' }}>
                          {item.ToRoom?.RoomNo ? `Room: ${item.ToRoom.RoomNo}` : ''}
                          {item.ToBed?.BedNo ? ` / Bed: ${item.ToBed.BedNo}` : ''}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td style={{ padding: spacing.md }}>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                          {item.Doctor?.FirstName
                            ? `${item.Doctor.Title?.Description || 'Dr.'} ${item.Doctor.FirstName} ${item.Doctor.LastName || ''}`
                            : '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: radii.full,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.bold,
                            backgroundColor: isReceived ? '#ecfdf5' : '#fffbeb',
                            color: isReceived ? '#059669' : '#d97706',
                            border: `1px solid ${isReceived ? '#a7f3d0' : '#fde68a'}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isReceived ? '#059669' : '#d97706',
                            }}
                          />
                          {isReceived ? 'Received at OT' : 'Pending Receive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: `${spacing.md} ${spacing.lg}`, textAlign: 'right' }}>
                        {!isReceived ? (
                          <button
                            onClick={() => handleOpenReceiveConfirm(item)}
                            title="Receive Bed Transfer at OT"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: `${spacing.xs} ${spacing.md}`,
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              borderRadius: radii.md,
                              cursor: 'pointer',
                              fontWeight: typography.fontWeight.semibold,
                              fontSize: typography.fontSize.xs,
                              boxShadow: shadows.xs,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <i className="fas fa-check" /> Receive
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: typography.fontSize.xs,
                              color: colors.textSecondary,
                              fontStyle: 'italic',
                            }}
                          >
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.background,
          }}
        >
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
            Showing {rawItems.length} of {totalItems} total OT bed transfer records
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Standalone Receive Modal */}
      {confirmReceiveModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: shadows.xl,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: radii.lg,
                  backgroundColor: '#0284c718',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                <i className="fas fa-procedures" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>
                  Confirm OT Bed Receive
                </h3>
                <p style={{ margin: 0, fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                  Ref: {confirmReceiveModalItem.RequestIdentifier || confirmReceiveModalItem.Id}
                </p>
              </div>
            </div>

            <p style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, lineHeight: 1.5 }}>
              Are you sure you want to mark this patient as <strong>Received</strong> in Operating Theatre / Recovery Bed?
            </p>

            <div
              style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: radii.md,
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.xs,
              }}
            >
              <div><strong>Patient:</strong> {confirmReceiveModalItem.Patient?.FirstName} {confirmReceiveModalItem.Patient?.LastName}</div>
              <div style={{ marginTop: '4px' }}>
                <strong>Destination:</strong> {confirmReceiveModalItem.ToWard?.WardName} / Room {confirmReceiveModalItem.ToRoom?.RoomNo || '—'} / Bed {confirmReceiveModalItem.ToBed?.BedNo || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
              <button
                onClick={() => setConfirmReceiveModalItem(null)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  fontWeight: typography.fontWeight.medium,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReceiveStandalone}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Confirm Receive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Profile Modal */}
      {profileModalPatientId && (
        <PatientProfileModal
          patientId={profileModalPatientId}
          onClose={() => setProfileModalPatientId(null)}
        />
      )}
    </div>
  );
};
