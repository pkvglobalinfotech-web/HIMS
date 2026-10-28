import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, spacing, typography, radii, shadows } from '../components/ui/tokens';
import { apiFetch } from './utils/api';
import { sessionHelper } from '../services/sessionHelper';

export interface CalendarEventItem {
  id: number | string;
  title?: string;
  start?: string | Date;
  end?: string | Date;
  StartTime?: string;
  EndTime?: string;
  status?: string;
  backgroundColor?: string;
  PatientName?: string;
  DoctorName?: string;
  OTRoom?: string;
  Procedure?: string;
  [key: string]: any;
}

export interface LookupOption {
  Id: number | string;
  Text?: string;
  Description?: string;
  Name?: string;
  [key: string]: any;
}

export interface SurgeryScheduleCalendarScreenProps {
  reactProps?: {
    calendarEvents?: CalendarEventItem[];
    lookup?: {
      Doctor?: LookupOption[];
      SurgeryRoom?: LookupOption[];
      OTScheduleStatus?: LookupOption[];
      [key: string]: any;
    };
    currentfilter?: {
      DoctorId?: any;
      OTRoomId?: any;
      OTScheduleStatusId?: any;
      fromdate?: any;
      todate?: any;
      [key: string]: any;
    };
  };
  onAction?: (actionName: string, payload?: any) => void;
}

export const SurgeryScheduleCalendarScreen: React.FC<SurgeryScheduleCalendarScreenProps> = ({
  reactProps,
  onAction,
}) => {
  const isHybrid = Boolean(reactProps && onAction);

  // Calendar view mode
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Standalone states
  const [standaloneEvents, setStandaloneEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [doctorList, setDoctorList] = useState<LookupOption[]>([]);
  const [roomList, setRoomList] = useState<LookupOption[]>([]);
  const [statusList, setStatusList] = useState<LookupOption[]>([]);

  const normalizeDoctorId = (val: any): number | string => {
    if (val === null || val === undefined) return -1;
    if (Array.isArray(val)) return val.length > 0 ? (val[0] ?? -1) : -1;
    return val;
  };

  // Filter states
  const [selectedDoctorId, setSelectedDoctorId] = useState<any>(
    normalizeDoctorId(reactProps?.currentfilter?.DoctorId)
  );
  const [selectedRooms, setSelectedRooms] = useState<(number | string)[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<number | string>(-1);

  // Selected event modal/popover
  const [activeEvent, setActiveEvent] = useState<CalendarEventItem | null>(null);

  const dispatch = (action: string, payload?: any) => {
    if (onAction) {
      onAction(action, payload);
    }
  };

  // Sync hybrid filters
  useEffect(() => {
    if (isHybrid && reactProps?.currentfilter) {
      if (reactProps.currentfilter.DoctorId !== undefined) {
        setSelectedDoctorId(normalizeDoctorId(reactProps.currentfilter.DoctorId));
      }
      if (reactProps.currentfilter.OTRoomId) {
        const r = reactProps.currentfilter.OTRoomId;
        setSelectedRooms(Array.isArray(r) ? r : [r]);
      }
      if (reactProps.currentfilter.OTScheduleStatusId !== undefined) {
        setSelectedStatus(reactProps.currentfilter.OTScheduleStatusId ?? -1);
      }
    }
  }, [isHybrid, reactProps?.currentfilter]);

  // Standalone lookups
  const fetchLookups = useCallback(async () => {
    try {
      const facilityId = sessionHelper.getFacilityId() || 1;
      const res = await apiFetch<any>('General/Options/getoptions', [
        {
          Key: 'Doctor',
          Request: { Params: [{ Key: 2, Value: facilityId }] },
        },
        { Key: 'SurgeryRoom' },
        { Key: 'OTScheduleStatus' },
      ]);
      if (res) {
        if (res.Doctor) setDoctorList(res.Doctor);
        if (res.SurgeryRoom) setRoomList(res.SurgeryRoom);
        if (res.OTScheduleStatus) setStatusList(res.OTScheduleStatus);
      }
    } catch (err) {
      console.warn('Failed to fetch calendar lookups:', err);
    }
  }, []);

  // Standalone events fetch
  const fetchEvents = useCallback(async () => {
    if (isHybrid) return;
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const fromDate = new Date(year, month, 1).toISOString().split('T')[0] + ' 00:00:00';
      const toDate = new Date(year, month + 1, 0).toISOString().split('T')[0] + ' 23:59:59';
      const facilityId = sessionHelper.getFacilityId() || 1;

      const inputData = {
        Params: [
          { Key: 20, Value: selectedRooms.length > 0 ? selectedRooms.join(',') : '' },
          { Key: 19, Value: selectedDoctorId === -1 ? null : selectedDoctorId },
          { Key: 4, Value: facilityId },
          { Key: 2, Value: selectedStatus === -1 ? null : selectedStatus },
          { Key: 10, Value: fromDate },
          { Key: 11, Value: toDate },
          { Key: 18, Value: false },
        ],
      };

      const res = await apiFetch<any>('OtManagement/OtSchedule/GetOtSchedules', inputData);
      if (res && res.Data) {
        const events: CalendarEventItem[] = res.Data.map((event: any) => {
          let color = '#0284c7';
          switch (event.OTScheduleStatusId) {
            case 2:
              color = '#f59e0b';
              break;
            case 3:
              color = '#0284c7';
              break;
            case 4:
              color = '#ef4444';
              break;
            case 5:
              color = '#10b981';
              break;
            default:
              color = '#64748b';
          }

          const patient = event.Patient || {};
          const pTitle = patient.Title?.Description ? `${patient.Title.Description} ` : '';
          const pName = `${pTitle}${patient.FirstName || ''} ${patient.LastName || ''}`.trim();

          const details = Array.isArray(event.OtScheduleDetails) ? event.OtScheduleDetails : [];
          const docNames = details.map((d: any) => d.ChiefSurgeonName).filter(Boolean).join(', ') || 'Doctor';
          const procNames = details.map((d: any) => d.ProcedureName).filter(Boolean).join(', ') || 'Surgery';
          const roomName = event.SurgeryRoomMaster?.Name || event.OTRoom?.Description || 'OT Suite';
          const statusDesc = event.OTScheduleStatus?.Description || 'Scheduled';

          return {
            id: event.Id,
            title: `${patient.FirstName || 'Patient'} - ${procNames}`,
            start: event.OTScheduledOn ? `${event.OTScheduledOn.split('T')[0]}T${event.StartTime || '08:00:00'}` : new Date().toISOString(),
            end: event.OTScheduledOn ? `${event.OTScheduledOn.split('T')[0]}T${event.EndTime || '10:00:00'}` : new Date().toISOString(),
            StartTime: event.StartTime,
            EndTime: event.EndTime,
            status: statusDesc,
            backgroundColor: color,
            PatientName: pName,
            DoctorName: docNames,
            OTRoom: roomName,
            Procedure: procNames,
          };
        });
        setStandaloneEvents(events);
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isHybrid, currentDate, selectedRooms, selectedDoctorId, selectedStatus]);

  useEffect(() => {
    if (!isHybrid) {
      fetchLookups();
      fetchEvents();
    }
  }, [isHybrid, fetchLookups, fetchEvents]);

  // Derived effective data
  const events = isHybrid ? reactProps?.calendarEvents || [] : standaloneEvents;
  const doctors = isHybrid ? reactProps?.lookup?.Doctor || [] : doctorList;
  const rooms = isHybrid ? reactProps?.lookup?.SurgeryRoom || [] : roomList;

  // Toggle room filter
  const toggleRoom = (roomId: number | string) => {
    let next: (number | string)[];
    if (selectedRooms.includes(roomId)) {
      next = selectedRooms.filter((id) => id !== roomId);
    } else {
      next = [...selectedRooms, roomId];
    }
    setSelectedRooms(next);
    if (isHybrid) {
      dispatch('toggleRoom', roomId);
    }
  };

  const handleStatusFilterChange = (statusId: number | string) => {
    setSelectedStatus(statusId);
    if (isHybrid) {
      dispatch('filterByStatus', statusId);
    }
  };

  const handleDoctorChange = (docId: any) => {
    setSelectedDoctorId(docId);
    if (isHybrid) {
      dispatch('filterByDoctor', docId);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEventItem) => {
    setActiveEvent(event);
    if (isHybrid) {
      dispatch('editEvent', event);
    }
  };

  const handleAddSlotClick = (dateStr?: string) => {
    const selectedDate = dateStr || currentDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate < today) {
      alert('Cannot schedule surgery on past dates.');
      return;
    }

    // Default to next upcoming slot if selected date is today
    let startTime = '08:00';
    let endTime = '09:00';
    if (selectedDate === today) {
      const now = new Date();
      const nextMin = Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 15) * 15;
      const h = Math.floor(nextMin / 60) % 24;
      const m = nextMin % 60;
      const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
      startTime = `${pad(h)}:${pad(m)}`;
      const endMin = nextMin + 30;
      endTime = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;
    }

    if (isHybrid) {
      dispatch('addEvent', {
        date: selectedDate,
        OTScheduledOn: selectedDate,
        StartTime: startTime,
        EndTime: endTime,
      });
    } else {
      alert(`Schedule surgery for ${selectedDate} at ${startTime}`);
    }
  };

  // Month Grid Calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDaysInMonth = lastDay.getDate();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; dayNumber: number }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        isCurrentMonth: false,
        dayNumber: prevMonthLastDay - i,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const isoMonth = String(month + 1).padStart(2, '0');
      const isoDay = String(i).padStart(2, '0');
      days.push({
        date: d,
        dateStr: `${year}-${isoMonth}-${isoDay}`,
        isCurrentMonth: true,
        dayNumber: i,
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        isCurrentMonth: false,
        dayNumber: i,
      });
    }

    return days;
  }, [currentDate]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};
    events.forEach((ev) => {
      if (!ev.start) return;
      const dateKey = typeof ev.start === 'string' ? ev.start.split('T')[0] : new Date(ev.start).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    });
    return map;
  }, [events]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const currentMonthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const todayStr = new Date().toISOString().split('T')[0];

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
            <i className="fas fa-calendar-alt" />
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
                Surgery Schedule Calendar
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
                OT Scheduling
              </span>
            </div>
            <p
              style={{
                margin: `${spacing.xs} 0 0 0`,
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
              }}
            >
              Interactive calendar for scheduling theatre suites, surgeons, and monitoring operative time slots
            </p>
          </div>
        </div>

        {/* View Mode & Today Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: colors.background,
              borderRadius: radii.md,
              padding: '2px',
              border: `1px solid ${colors.border}`,
            }}
          >
            {(['month', 'week', 'day', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 12px',
                  borderRadius: radii.sm,
                  border: 'none',
                  backgroundColor: viewMode === mode ? colors.surface : 'transparent',
                  color: viewMode === mode ? colors.primary : colors.textSecondary,
                  fontWeight: viewMode === mode ? typography.fontWeight.bold : typography.fontWeight.medium,
                  fontSize: typography.fontSize.xs,
                  cursor: 'pointer',
                  boxShadow: viewMode === mode ? shadows.xs : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleToday}
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              color: colors.textPrimary,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.medium,
              fontSize: typography.fontSize.sm,
            }}
          >
            Today
          </button>

          <button
            onClick={() => handleAddSlotClick()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
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
            <i className="fa fa-plus" /> Schedule
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Calendar Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: spacing.lg }}>
        {/* Left Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {/* Surgeon Filter */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.md,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.xs,
            }}
          >
            <label
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: spacing.xs,
              }}
            >
              Surgeon
            </label>
            <select
              value={normalizeDoctorId(selectedDoctorId)}
              onChange={(e) => handleDoctorChange(e.target.value)}
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
              <option value={-1}>All Doctors</option>
              {doctors.map((d) => (
                <option key={d.Id} value={d.Id}>
                  {d.Text || d.Description}
                </option>
              ))}
            </select>
          </div>

          {/* OT Rooms Filter */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.md,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                marginBottom: spacing.sm,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>OT Rooms</span>
              {selectedRooms.length > 0 && (
                <button
                  onClick={() => setSelectedRooms([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: colors.primary,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Clear ({selectedRooms.length})
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {rooms.map((room) => {
                const isChecked = selectedRooms.includes(room.Id);
                return (
                  <label
                    key={room.Id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      fontSize: typography.fontSize.xs,
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: radii.sm,
                      backgroundColor: isChecked ? `${colors.primary}10` : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRoom(room.Id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{room.Name || room.Text}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status Legend Pills */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.md,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                marginBottom: spacing.sm,
              }}
            >
              Surgery Status
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { id: -1, name: 'All Statuses', color: '#2563eb' },
                { id: 2, name: 'Scheduled', color: '#f59e0b' },
                { id: 3, name: 'Confirmed', color: '#0284c7' },
                { id: 5, name: 'Completed', color: '#10b981' },
                { id: 4, name: 'Cancelled', color: '#ef4444' },
              ].map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleStatusFilterChange(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: '5px 8px',
                    borderRadius: radii.md,
                    cursor: 'pointer',
                    backgroundColor: selectedStatus === st.id ? `${st.color}15` : 'transparent',
                    border: `1px solid ${selectedStatus === st.id ? st.color : 'transparent'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: st.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: selectedStatus === st.id ? typography.fontWeight.bold : typography.fontWeight.normal,
                      color: colors.textPrimary,
                    }}
                  >
                    {st.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Main Panel */}
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.sm,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Month Navigator Header */}
          <div
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              backgroundColor: colors.background,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div style={{ display: 'flex', gap: spacing.xs }}>
                <button
                  onClick={handlePrevMonth}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.sm,
                    cursor: 'pointer',
                    color: colors.textPrimary,
                  }}
                >
                  <i className="fas fa-chevron-left" />
                </button>
                <button
                  onClick={handleNextMonth}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.sm,
                    cursor: 'pointer',
                    color: colors.textPrimary,
                  }}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
              <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                {currentMonthLabel}
              </h3>
            </div>

            <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
              {events.length} Active Surgeries
            </div>
          </div>

          {/* Month Calendar Grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Days of Week Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: `2px solid ${colors.border}`,
                backgroundColor: colors.background,
                textAlign: 'center',
                padding: '8px 0',
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.textSecondary,
                textTransform: 'uppercase',
              }}
            >
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days Cells */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                flex: 1,
                minHeight: '520px',
              }}
            >
              {calendarDays.map((dayItem, idx) => {
                const dayEvents = eventsByDate[dayItem.dateStr] || [];
                const isToday = dayItem.dateStr === todayStr;
                const isPast = dayItem.dateStr < todayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!isPast) handleAddSlotClick(dayItem.dateStr);
                    }}
                    title={isPast ? 'Past date cannot be scheduled' : 'Click to schedule surgery'}
                    style={{
                      borderRight: `1px solid ${colors.border}`,
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: dayItem.isCurrentMonth
                        ? isToday
                          ? '#f0f9ff'
                          : isPast
                          ? '#f8fafc'
                          : colors.surface
                        : `${colors.background}80`,
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      opacity: isPast ? 0.65 : 1,
                      minHeight: '100px',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (dayItem.isCurrentMonth && !isToday && !isPast) {
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dayItem.isCurrentMonth && !isToday && !isPast) {
                        e.currentTarget.style.backgroundColor = colors.surface;
                      }
                    }}
                  >
                    {/* Day Number */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: typography.fontSize.xs,
                          fontWeight: isToday ? typography.fontWeight.bold : typography.fontWeight.medium,
                          color: isToday
                            ? '#0284c7'
                            : dayItem.isCurrentMonth
                            ? colors.textPrimary
                            : colors.textSecondary,
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isToday ? '#e0f2fe' : 'transparent',
                        }}
                      >
                        {dayItem.dayNumber}
                      </span>

                      {dayEvents.length > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: typography.fontWeight.bold,
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            padding: '1px 5px',
                            borderRadius: radii.full,
                          }}
                        >
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Events inside Day */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
                      {dayEvents.map((ev, eIdx) => (
                        <div
                          key={ev.id || eIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(ev);
                          }}
                          title={`${ev.PatientName || 'Patient'} | ${ev.Procedure || ''} | ${ev.DoctorName || ''}`}
                          style={{
                            padding: '3px 6px',
                            borderRadius: radii.sm,
                            backgroundColor: ev.backgroundColor || '#0284c7',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: typography.fontWeight.semibold,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            boxShadow: shadows.xs,
                            cursor: 'pointer',
                          }}
                        >
                          {ev.title || 'Surgery'}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Popover Modal */}
      {activeEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
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
              maxWidth: '460px',
              width: '100%',
              boxShadow: shadows.xl,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: radii.md,
                    backgroundColor: `${activeEvent.backgroundColor || '#0284c7'}18`,
                    color: activeEvent.backgroundColor || '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <i className="fas fa-stethoscope" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: typography.fontSize.base, color: colors.textPrimary }}>
                    {activeEvent.PatientName || 'Surgical Procedure'}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      color: activeEvent.backgroundColor || '#0284c7',
                      fontWeight: typography.fontWeight.bold,
                    }}
                  >
                    {activeEvent.status || 'Scheduled'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: radii.md,
                fontSize: typography.fontSize.xs,
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div><strong>Procedure:</strong> {activeEvent.Procedure || '—'}</div>
              <div><strong>Surgeon:</strong> {activeEvent.DoctorName || '—'}</div>
              <div><strong>Operating Room:</strong> {activeEvent.OTRoom || 'OT Suite'}</div>
              <div>
                <strong>Start Date Time:</strong>{' '}
                {activeEvent.start && String(activeEvent.start).includes('T')
                  ? `${String(activeEvent.start).split('T')[0]} ${activeEvent.StartTime || String(activeEvent.start).split('T')[1]?.substring(0, 5)}`
                  : `${activeEvent.OTScheduledOn || ''} ${activeEvent.StartTime || ''}`}
              </div>
              <div>
                <strong>End Date Time:</strong>{' '}
                {activeEvent.end && String(activeEvent.end).includes('T')
                  ? `${String(activeEvent.end).split('T')[0]} ${activeEvent.EndTime || String(activeEvent.end).split('T')[1]?.substring(0, 5)}`
                  : `${activeEvent.Enddate || activeEvent.OTScheduledOn || ''} ${activeEvent.EndTime || ''}`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg }}>
              <button
                onClick={() => setActiveEvent(null)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveEvent(null);
                  if (isHybrid) dispatch('openConfirmation', activeEvent);
                  else alert(`Edit schedule confirmation for ${activeEvent.id}`);
                }}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: radii.md,
                  cursor: 'pointer',
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Open Details / Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
