import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { Pagination } from '../components/ui/Pagination';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';

export interface SurgeryRoomItem {
  Id: number;
  Code?: string;
  Name?: string;
  SurgeryRoomTypeId?: number;
  SurgeryRoomType?: {
    Id?: number;
    Description?: string;
  };
  ActiveStatusId?: number;
  ActiveStatus?: {
    Id?: number;
    Description?: string;
  };
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  [key: string]: any;
}

export interface SurgeryRoomMasterListScreenProps {
  reactProps?: {
    items?: SurgeryRoomItem[];
    lookup?: {
      SurgeryRoomType?: LookupOption[];
      ActiveStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      CodeName?: string;
      SurgeryRoomTypeId?: number | string;
      ActiveStatusId?: number | string;
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

export const SurgeryRoomMasterListScreen: React.FC<SurgeryRoomMasterListScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Standalone states
  const [standaloneItems, setStandaloneItems] = useState<SurgeryRoomItem[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [roomTypes, setRoomTypes] = useState<LookupOption[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<LookupOption[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>(
    reactProps?.currentfilter?.CodeName || ''
  );
  const [selectedTypeId, setSelectedTypeId] = useState<number | string>(
    reactProps?.currentfilter?.SurgeryRoomTypeId ?? -1
  );
  const [selectedStatusId, setSelectedStatusId] = useState<number | string>(
    reactProps?.currentfilter?.ActiveStatusId ?? 2
  );

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Sync hybrid filters
  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter) {
      if (reactProps.currentfilter.CodeName !== undefined) {
        setSearchTerm(reactProps.currentfilter.CodeName);
      }
      if (reactProps.currentfilter.SurgeryRoomTypeId !== undefined) {
        setSelectedTypeId(reactProps.currentfilter.SurgeryRoomTypeId);
      }
      if (reactProps.currentfilter.ActiveStatusId !== undefined) {
        setSelectedStatusId(reactProps.currentfilter.ActiveStatusId);
      }
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Standalone lookups
  const fetchLookups = useCallback(async () => {
    try {
      const res = await apiFetch<any>('General/Options/getoptions', [
        { Key: 'SurgeryRoomType' },
        { Key: 'ActiveStatus' },
      ]);
      if (res) {
        if (res.SurgeryRoomType) setRoomTypes(res.SurgeryRoomType);
        if (res.ActiveStatus) setActiveStatuses(res.ActiveStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch lookups in SurgeryRoomMasterListScreen:', err);
    }
  }, []);

  // Standalone items fetch
  const fetchItems = useCallback(
    async (page: number = 1, pSize: number = 25) => {
      if (isHybrid) return;
      setIsLoading(true);
      try {
        const inputData = {
          Params: [
            { Key: 2, Value: selectedTypeId === -1 ? null : selectedTypeId },
            { Key: 3, Value: selectedStatusId === -1 ? null : selectedStatusId },
            { Key: 1, Value: searchTerm || null },
          ],
          PageContext: {
            PageSize: pSize,
            PageNumber: page,
          },
        };

        const res = await apiFetch<any>('OtManagement/SurgeryRoomMaster/GetSurgeryRoomMasters', inputData);
        if (res) {
          setStandaloneItems(res.Data || []);
          setStandaloneTotal(res.PageContext?.TotalRecords || 0);
        }
      } catch (err) {
        console.error('Failed to fetch surgery rooms:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isHybrid, searchTerm, selectedTypeId, selectedStatusId]
  );

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchItems(standalonePage, standalonePageSize);
    }
  }, [isHybrid, fetchLookups, fetchItems, standalonePage, standalonePageSize]);

  // Derived effective data
  const rawItems = isHybrid ? reactProps?.items || [] : standaloneItems;
  const types = isHybrid ? reactProps?.lookup?.SurgeryRoomType || [] : roomTypes;
  const statuses = isHybrid ? reactProps?.lookup?.ActiveStatus || [] : activeStatuses;
  const totalItems = isHybrid ? reactProps?.pager?.totalItems || 0 : standaloneTotal;
  const currentPage = isHybrid ? reactProps?.pager?.currentPage || 1 : standalonePage;
  const pageSize = isHybrid ? reactProps?.pager?.pageSize || 25 : standalonePageSize;

  // Stats calculation
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    rawItems.forEach((r) => {
      if (r.ActiveStatusId === 2 || r.ActiveStatus?.Id === 2) active++;
      else inactive++;
    });
    return {
      total: totalItems,
      pageCount: rawItems.length,
      active,
      inactive,
    };
  }, [rawItems, totalItems]);

  const handleSearchCommit = () => {
    if (isHybrid) {
      dispatch('updateFilter', { CodeName: searchTerm });
    } else {
      setStandalonePage(1);
      fetchItems(1, standalonePageSize);
    }
  };

  const handleTypeChange = (val: number | string) => {
    setSelectedTypeId(val);
    if (isHybrid) {
      dispatch('updateFilter', { SurgeryRoomTypeId: val });
    } else {
      setStandalonePage(1);
    }
  };

  const handleStatusChange = (val: number | string) => {
    setSelectedStatusId(val);
    if (isHybrid) {
      dispatch('updateFilter', { ActiveStatusId: val });
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

  const handleAddNew = () => {
    if (isHybrid) {
      dispatch('addNew');
    } else {
      alert('Open Add Surgery Room form dialog');
    }
  };

  const handleEdit = (item: SurgeryRoomItem) => {
    if (isHybrid) {
      dispatch('edit', item);
    } else {
      alert(`Edit Room: ${item.Name} (${item.Code})`);
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
              backgroundColor: '#0284c718',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            <i className="fas fa-door-open" />
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
                Surgery Room Master
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
                OT Configuration
              </span>
            </div>
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
              }}
            >
              Configure and maintain Operating Theatres, surgical suites, room types, and operational statuses
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
            }}
          >
            <i className="fas fa-sync-alt" /> Refresh
          </button>

          <button
            onClick={handleAddNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.sm} ${spacing.lg}`,
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: radii.md,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.sm,
              boxShadow: shadows.xs,
            }}
          >
            <i className="fa fa-plus" /> Add Surgery Room
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            <i className="fas fa-hospital" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Total Surgery Rooms
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
              Active Theatres
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#059669' }}>
              {stats.active}
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
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, fontWeight: typography.fontWeight.medium }}>
              Room Categories
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#7c3aed' }}>
              {types.length || '—'}
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
        <div style={{ flex: '1 1 240px', minWidth: '220px', position: 'relative' }}>
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
            placeholder="Search Code or Name..."
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

        {/* Room Type */}
        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
          <select
            value={selectedTypeId}
            onChange={(e) => handleTypeChange(Number(e.target.value) || e.target.value)}
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
            <option value={-1}>All Surgery Room Types</option>
            {types.map((t) => (
              <option key={t.Id} value={t.Id}>
                {t.Text || t.Description}
              </option>
            ))}
          </select>
        </div>

        {/* Active Status */}
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

        {/* Apply Button */}
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
          <i className="fas fa-filter" /> Filter
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
                <th style={{ padding: `${spacing.md} ${spacing.lg}`, width: '80px' }}>S.No</th>
                <th style={{ padding: spacing.md, width: '160px' }}>Room Code</th>
                <th style={{ padding: spacing.md }}>Room Name</th>
                <th style={{ padding: spacing.md }}>Room Type</th>
                <th style={{ padding: spacing.md }}>Status</th>
                <th style={{ padding: `${spacing.md} ${spacing.lg}`, textAlign: 'right', width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: spacing['2xl'], color: colors.textSecondary }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: spacing.sm }} />
                    Loading surgery rooms...
                  </td>
                </tr>
              ) : rawItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: spacing['2xl'] }}>
                    <div style={{ fontSize: '36px', color: colors.textSecondary, marginBottom: spacing.sm }}>
                      <i className="fas fa-door-closed" />
                    </div>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                      No Surgery Rooms Found
                    </div>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
                      Try adjusting the search criteria or add a new room.
                    </div>
                  </td>
                </tr>
              ) : (
                rawItems.map((item, idx) => {
                  const isActive = item.ActiveStatusId === 2 || item.ActiveStatus?.Id === 2;
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={item.Id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background-color 0.15s ease',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : `${colors.background}40`,
                      }}
                    >
                      <td style={{ padding: `${spacing.md} ${spacing.lg}`, color: colors.textSecondary }}>
                        {itemIndex}
                      </td>

                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: radii.sm,
                            backgroundColor: `${colors.primary}12`,
                            color: colors.primary,
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.xs,
                          }}
                        >
                          {item.Code || `OT-${item.Id}`}
                        </span>
                      </td>

                      <td style={{ padding: spacing.md }}>
                        <div style={{ fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                          {item.Name || 'Unnamed Room'}
                        </div>
                      </td>

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
                          <i className="fas fa-procedures" /> {item.SurgeryRoomType?.Description || 'General OT'}
                        </span>
                      </td>

                      <td style={{ padding: spacing.md }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: radii.full,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.bold,
                            backgroundColor: isActive ? '#ecfdf5' : '#fee2e2',
                            color: isActive ? '#059669' : '#dc2626',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#059669' : '#dc2626',
                            }}
                          />
                          {item.ActiveStatus?.Description || (isActive ? 'Active' : 'Inactive')}
                        </span>
                      </td>

                      <td style={{ padding: `${spacing.md} ${spacing.lg}`, textAlign: 'right' }}>
                        <button
                          onClick={() => handleEdit(item)}
                          title="Edit Surgery Room"
                          style={{
                            padding: '5px 8px',
                            backgroundColor: `${colors.primary}12`,
                            color: colors.primary,
                            border: 'none',
                            borderRadius: radii.sm,
                            cursor: 'pointer',
                            fontSize: typography.fontSize.xs,
                          }}
                        >
                          <i className="fas fa-edit" />
                        </button>
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
            Showing {rawItems.length} of {totalItems} total surgery room records
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};
