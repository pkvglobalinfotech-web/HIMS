import React, { useState, useMemo, useEffect } from 'react';
import { colors, tokens } from '../components/ui/tokens';

export interface WardBedItem {
  Id: number;
  BedNo?: string;
  Description?: string;
  LocationId?: number;
  LocationMaster?: {
    Id?: number;
    LocationName?: string;
  };
  WardId?: number;
  WardMaster?: {
    Id?: number;
    WardName?: string;
    WardCode?: string;
  };
  RoomId?: number;
  WardRoomMaster?: {
    Id?: number;
    RoomNo?: string;
    PhotoPath?: string;
  };
  BedStatusId?: number;
  BedStatus?: {
    Id?: number;
    Description?: string;
  };
  ServiceRateCategoryId?: number;
  ServiceRateCategory?: {
    Id?: number;
    ServiceRateCategory?: string;
  };
  IsTemp?: boolean;
}

export interface WardBedPickerModalScreenProps {
  reactProps?: {
    modeldata?: {
      FacilityId?: number;
      LocationId?: number;
      WardId?: number;
      RoomTypeId?: number;
      BedStatusId?: number;
      IsTemp?: boolean;
      WardMasterTypeId?: number;
    };
    lookup?: {
      Facility?: Array<{ Id: number; Text?: string; FacilityName?: string }>;
      Location?: Array<{ Id: number; Text?: string; LocationName?: string }>;
      Ward?: Array<{ Id: number; Text?: string; WardName?: string }>;
      RoomTypeMaster?: Array<{ Id: number; Text?: string; RoomType?: string }>;
      BedStatus?: Array<{ Id: number; Text?: string; Description?: string }>;
    };
    beds?: WardBedItem[];
    totalItems?: number;
    currentPage?: number;
    pageSize?: number;
    loading?: boolean;
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const WardBedPickerModalScreen: React.FC<WardBedPickerModalScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps);

  // Filters state
  const [selectedWardId, setSelectedWardId] = useState<number>(
    reactProps?.modeldata?.WardId !== undefined ? reactProps.modeldata.WardId : -1
  );
  const [selectedStatusId, setSelectedStatusId] = useState<number>(
    reactProps?.modeldata?.BedStatusId !== undefined ? reactProps.modeldata.BedStatusId : 1
  );
  const [isTemp, setIsTemp] = useState<boolean>(
    Boolean(reactProps?.modeldata?.IsTemp)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Sync from reactProps when they change
  useEffect(() => {
    if (reactProps?.modeldata) {
      if (reactProps.modeldata.WardId !== undefined) {
        setSelectedWardId(reactProps.modeldata.WardId);
      }
      if (reactProps.modeldata.BedStatusId !== undefined) {
        setSelectedStatusId(reactProps.modeldata.BedStatusId);
      }
      if (reactProps.modeldata.IsTemp !== undefined) {
        setIsTemp(Boolean(reactProps.modeldata.IsTemp));
      }
    }
  }, [reactProps?.modeldata?.WardId, reactProps?.modeldata?.BedStatusId, reactProps?.modeldata?.IsTemp]);

  const rawBeds: WardBedItem[] = reactProps?.beds || [];
  const lookup = reactProps?.lookup || {};
  const totalItems = reactProps?.totalItems || rawBeds.length;
  const currentPage = reactProps?.currentPage || 1;
  const pageSize = reactProps?.pageSize || 25;
  const loading = Boolean(reactProps?.loading);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Quick client-side filter over the retrieved beds
  const filteredBeds = useMemo(() => {
    if (!searchQuery.trim()) return rawBeds;
    const q = searchQuery.toLowerCase().trim();
    return rawBeds.filter((b) => {
      const bedName = (b.BedNo || b.Description || '').toLowerCase();
      const wardName = (b.WardMaster?.WardName || '').toLowerCase();
      const roomNo = (b.WardRoomMaster?.RoomNo || '').toLowerCase();
      const locName = (b.LocationMaster?.LocationName || '').toLowerCase();
      const tariff = (b.ServiceRateCategory?.ServiceRateCategory || '').toLowerCase();
      const status = (b.BedStatus?.Description || '').toLowerCase();
      return (
        bedName.includes(q) ||
        wardName.includes(q) ||
        roomNo.includes(q) ||
        locName.includes(q) ||
        tariff.includes(q) ||
        status.includes(q)
      );
    });
  }, [rawBeds, searchQuery]);

  // Statistics
  const availableCount = useMemo(() => {
    return rawBeds.filter((b) => b.BedStatusId === 1).length;
  }, [rawBeds]);

  const uniqueWardsCount = useMemo(() => {
    const s = new Set(rawBeds.map((b) => b.WardId).filter(Boolean));
    return s.size;
  }, [rawBeds]);

  // Dispatch helpers
  const handleSelectBed = (bed: WardBedItem) => {
    if (bed.BedStatusId !== 1) {
      if (onAction) {
        onAction('selectBed', { bed });
      }
      return;
    }
    setSelectedRowId(bed.Id);
    if (onAction) {
      onAction('selectBed', { bed });
    }
  };

  const handleFetch = (wardId: number, statusId: number, tempVal: boolean) => {
    if (onAction) {
      onAction('fetch', {
        WardId: wardId,
        BedStatusId: statusId,
        IsTemp: tempVal,
      });
    }
  };

  const handleReset = () => {
    setSelectedWardId(-1);
    setSelectedStatusId(1);
    setIsTemp(false);
    setSearchQuery('');
    if (onAction) {
      onAction('resetFilters');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (onAction) {
      onAction('pageChange', { page: newPage });
    }
  };

  const handleClose = () => {
    if (onAction) {
      onAction('close');
    }
  };

  // Status badge helper
  const getStatusBadge = (statusId?: number, statusText?: string) => {
    switch (statusId) {
      case 1:
        return {
          label: statusText || 'Available',
          bg: '#ecfdf5',
          color: '#059669',
          border: '#a7f3d0',
          dot: '#10b981',
          selectable: true,
        };
      case 2:
        return {
          label: statusText || 'Occupied',
          bg: '#fef2f2',
          color: '#dc2626',
          border: '#fca5a5',
          dot: '#ef4444',
          selectable: false,
        };
      case 3:
        return {
          label: statusText || 'Cleaning',
          bg: '#fffbeb',
          color: '#d97706',
          border: '#fde68a',
          dot: '#f59e0b',
          selectable: false,
        };
      case 4:
        return {
          label: statusText || 'Maintenance',
          bg: '#f1f5f9',
          color: '#475569',
          border: '#cbd5e1',
          dot: '#64748b',
          selectable: false,
        };
      case 5:
        return {
          label: statusText || 'Reserved',
          bg: '#f5f3ff',
          color: '#7c3aed',
          border: '#ddd6fe',
          dot: '#8b5cf6',
          selectable: false,
        };
      default:
        return {
          label: statusText || 'Unknown',
          bg: '#f8fafc',
          color: '#64748b',
          border: '#e2e8f0',
          dot: '#94a3b8',
          selectable: false,
        };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        fontFamily: tokens.typography.fontFamily,
        color: tokens.colors.textPrimary,
        maxHeight: '90vh',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* ─── MODAL HEADER ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'rgba(37, 99, 235, 0.25)',
              border: '1px solid rgba(37, 99, 235, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              fontSize: 18,
            }}
          >
            <i className="fa fa-bed" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Bed Board & Ward Bed Picker
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 999,
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ffffff' }} />
                {availableCount} Available
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
              Select an available inpatient bed to assign to admission encounter
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#cbd5e1';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <i className="fa fa-times" />
        </button>
      </div>

      {/* ─── FILTERS & SEARCH TOOLBAR ─── */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Ward Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200, flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
              Ward
            </label>
            <select
              value={selectedWardId}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setSelectedWardId(val);
                if (onAction) {
                  onAction('filterChange', { field: 'WardId', value: val });
                }
              }}
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={-1}>-- All Wards --</option>
              {(lookup.Ward || []).map((w: any) => (
                <option key={w.Id} value={w.Id}>
                  {w.Text || w.WardName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 170, flex: '1 1 170px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
              Bed Status
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setSelectedStatusId(val);
                if (onAction) {
                  onAction('filterChange', { field: 'BedStatusId', value: val });
                }
              }}
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value={-1}>-- All Statuses --</option>
              <option value={1}>Available</option>
              <option value={2}>Occupied</option>
              <option value={3}>Cleaning</option>
              <option value={4}>Maintenance</option>
              <option value={5}>Reserved</option>
              {(lookup.BedStatus || []).map((s: any) => {
                if ([1, 2, 3, 4, 5].includes(s.Id)) return null;
                return (
                  <option key={s.Id} value={s.Id}>
                    {s.Text || s.Description}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Is Temp Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 20,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => {
              const next = !isTemp;
              setIsTemp(next);
              if (onAction) {
                onAction('filterChange', { field: 'IsTemp', value: next });
              }
            }}
          >
            <input
              type="checkbox"
              id="isTempCheckbox"
              checked={isTemp}
              onChange={(e) => {
                setIsTemp(e.target.checked);
                if (onAction) {
                  onAction('filterChange', { field: 'IsTemp', value: e.target.checked });
                }
              }}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: tokens.colors.primary }}
            />
            <label htmlFor="isTempCheckbox" style={{ fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              Is Temp Bed
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20, marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => handleFetch(selectedWardId, selectedStatusId, isTemp)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 18px',
                height: 38,
                borderRadius: 8,
                backgroundColor: tokens.colors.primary,
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.primary)}
            >
              <i className="fa fa-sync-alt" /> Fetch
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                height: 38,
                borderRadius: 8,
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <i className="fa fa-undo" /> Reset
            </button>
          </div>
        </div>

        {/* Real-time search box & Quick count pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <i
              className="fa fa-search"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: 13,
              }}
            />
            <input
              type="text"
              placeholder="Instant filter by Bed, Room, Ward, Floor, Tariff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 34,
                padding: '0 30px 0 32px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <i className="fa fa-times-circle" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748b' }}>
            <span>
              Wards: <strong>{uniqueWardsCount}</strong>
            </span>
            <span>•</span>
            <span>
              Available Beds: <strong style={{ color: '#059669' }}>{availableCount}</strong>
            </span>
            <span>•</span>
            <span>
              Showing: <strong>{filteredBeds.length}</strong> of {totalItems}
            </span>
          </div>
        </div>
      </div>

      {/* ─── DATA TABLE AREA ─── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 320, maxHeight: '52vh' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <i className="fa fa-spinner fa-spin" style={{ fontSize: 28, color: tokens.colors.primary, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Loading Bed Board data...</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Fetching live ward and room allocations</div>
          </div>
        ) : filteredBeds.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              <i className="fa fa-bed" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>No Beds Found</div>
            <p style={{ margin: '4px 0 16px 0', fontSize: 13, color: '#64748b' }}>
              {searchQuery
                ? `No beds matching "${searchQuery}". Try adjusting your search query.`
                : 'No beds found matching the current ward/status filters.'}
            </p>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: tokens.colors.primary,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
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
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  zIndex: 10,
                }}
              >
                <th style={{ padding: '12px 16px', width: 100 }}>Select</th>
                <th style={{ padding: '12px 16px' }}>Bed</th>
                <th style={{ padding: '12px 16px' }}>Ward</th>
                <th style={{ padding: '12px 16px' }}>Room</th>
                <th style={{ padding: '12px 16px' }}>Location / Floor</th>
                <th style={{ padding: '12px 16px' }}>Bed Status</th>
                <th style={{ padding: '12px 16px' }}>Tariff</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeds.map((bed, idx) => {
                const isSelected = selectedRowId === bed.Id;
                const status = getStatusBadge(bed.BedStatusId, bed.BedStatus?.Description);
                const isAvailable = bed.BedStatusId === 1;

                return (
                  <tr
                    key={bed.Id || idx}
                    onClick={() => {
                      if (isAvailable) {
                        handleSelectBed(bed);
                      }
                    }}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelected
                        ? '#eff6ff'
                        : idx % 2 === 0
                        ? '#ffffff'
                        : '#fafbfc',
                      cursor: isAvailable ? 'pointer' : 'default',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (isAvailable && !isSelected) {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafbfc';
                      }
                    }}
                  >
                    {/* Select Action Button */}
                    <td style={{ padding: '10px 16px' }}>
                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBed(bed);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            borderRadius: 6,
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
                          title="Click to assign this bed to admission"
                        >
                          <i className="fa fa-check" /> Select
                        </button>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: '#f1f5f9',
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <i className="fa fa-ban" /> Closed
                        </span>
                      )}
                    </td>

                    {/* Bed ID / Name */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: isAvailable ? '#ecfdf5' : '#f1f5f9',
                            color: isAvailable ? '#059669' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                          }}
                        >
                          <i className="fa fa-bed" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                            {bed.BedNo || bed.Description || `Bed #${bed.Id}`}
                          </div>
                          {bed.IsTemp && (
                            <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>Temporary Bed</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ward */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {bed.WardMaster?.WardName || '—'}
                      </span>
                    </td>

                    {/* Room */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#2563eb',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {bed.WardRoomMaster?.RoomNo || '—'}
                      </span>
                    </td>

                    {/* Location / Floor */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
                        <i className="fa fa-map-marker-alt" style={{ color: '#94a3b8', fontSize: 11 }} />
                        <span>{bed.LocationMaster?.LocationName || '—'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 9px',
                          borderRadius: 12,
                          backgroundColor: status.bg,
                          color: status.color,
                          border: `1px solid ${status.border}`,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: status.dot,
                            display: 'inline-block',
                          }}
                        />
                        {status.label}
                      </span>
                    </td>

                    {/* Tariff / Rate Category */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          color: '#7c3aed',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {bed.ServiceRateCategory?.ServiceRateCategory || 'STANDARD'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── MODAL FOOTER & PAGINATION ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total records)
        </div>

        {/* Pagination buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: currentPage <= 1 ? '#94a3b8' : '#334155',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <i className="fa fa-chevron-left" /> Previous
          </button>

          {/* Quick page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => handlePageChange(pageNum)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: isActive ? 'none' : '1px solid #cbd5e1',
                  backgroundColor: isActive ? tokens.colors.primary : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: currentPage >= totalPages ? '#94a3b8' : '#334155',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Next <i className="fa fa-chevron-right" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            style={{
              marginLeft: 12,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
