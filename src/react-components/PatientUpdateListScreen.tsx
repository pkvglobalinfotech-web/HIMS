import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PatientUpdateListScreen.css';
import { apiFetch } from './utils/api';

export interface PatientLookupItem {
  Id: number;
  Text: string;
}

export interface PatientEntity {
  Id: number;
  FirstName?: string;
  LastName?: string;
  MRN?: string;
  Age?: string | number;
  Mobile?: string;
  RegisteredDate?: string;
  GenderId?: number;
  Gender?: { Description?: string };
  Title?: { Description?: string };
  PatientStatusId?: number;
  PatientStatus?: { Description?: string; Text?: string };
  [key: string]: any;
}

export interface PagerObject {
  totalItems?: number;
  currentPage?: number;
  startIndex?: number;
  pageSize?: number;
}

export interface PatientUpdateReactProps {
  gridData?: PatientEntity[];
  pagerObj?: PagerObject;
  currentfilter?: {
    PatientStatusId?: number;
    RegisteredDate?: string | Date | null;
    Patientinfo?: number | string | null;
  };
  lookup?: {
    PatientStatus?: PatientLookupItem[];
    [key: string]: any;
  };
  selectedPatient?: PatientEntity | null;
  isLoading?: boolean;
}

export interface PatientUpdateListScreenProps {
  reactProps?: PatientUpdateReactProps;
  onAction?: (actionName: string, payload?: any) => void;
}

function formatDateForInput(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDateTime(dateVal?: string | null): { date: string; time: string } {
  if (!dateVal) return { date: '-', time: '' };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { date: String(dateVal), time: '' };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yr = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  return {
    date: `${day}-${mon}-${yr}`,
    time: `${hours}:${mins}`
  };
}

export const PatientUpdateListScreen: React.FC<PatientUpdateListScreenProps> = ({
  reactProps,
  onAction
}) => {
  // If embedded in AngularJS bridge, reactProps & onAction will be provided.
  // Otherwise, fallback to standalone local state and direct API calls.
  const isHybrid = Boolean(onAction);

  // Fallback standalone states
  const [standaloneData, setStandaloneData] = useState<PatientEntity[]>([]);
  const [standaloneTotal, setStandaloneTotal] = useState<number>(0);
  const [standalonePage, setStandalonePage] = useState<number>(1);
  const [standalonePageSize, setStandalonePageSize] = useState<number>(25);
  const [standaloneStatusList, setStandaloneStatusList] = useState<PatientLookupItem[]>([]);
  const [standaloneFilterDate, setStandaloneFilterDate] = useState<string>(formatDateForInput(new Date()));
  const [standaloneFilterStatus, setStandaloneFilterStatus] = useState<number>(2);
  const [standaloneLoading, setStandaloneLoading] = useState<boolean>(false);

  // Typeahead live search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PatientEntity[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number>(-1);
  const [copiedUhid, setCopiedUhid] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active dataset derived from either hybrid props or standalone
  const patients = isHybrid ? (reactProps?.gridData || []) : standaloneData;
  const pager = isHybrid
    ? (reactProps?.pagerObj || { totalItems: 0, currentPage: 1, pageSize: 25 })
    : { totalItems: standaloneTotal, currentPage: standalonePage, pageSize: standalonePageSize };

  const currentfilter = reactProps?.currentfilter;
  const statusOptions = (isHybrid ? reactProps?.lookup?.PatientStatus : standaloneStatusList) || [];
  const isLoading = isHybrid ? !!reactProps?.isLoading : standaloneLoading;

  // Selected date value (string YYYY-MM-DD for date input)
  const selectedDateStr = isHybrid
    ? formatDateForInput(currentfilter?.RegisteredDate)
    : standaloneFilterDate;

  // Selected status
  const selectedStatusId = isHybrid
    ? (currentfilter?.PatientStatusId ?? 2)
    : standaloneFilterStatus;

  // Active selected patient banner (if filtered by single patient)
  const selectedPatient = reactProps?.selectedPatient || null;

  // Standalone data fetcher
  const fetchStandaloneList = useCallback(async (
    page: number = standalonePage,
    pageSize: number = standalonePageSize,
    dateStr: string = standaloneFilterDate,
    statusId: number = standaloneFilterStatus,
    patientId: number | string | null = null
  ) => {
    setStandaloneLoading(true);
    try {
      let FrRegDt: string | null = null;
      let ToRegDt: string | null = null;

      if (dateStr && !patientId) {
        FrRegDt = `${dateStr} 00:00:00`;
        ToRegDt = `${dateStr} 23:59:59`;
      }

      let patKey = 0;
      if (patientId) {
        patKey = (typeof patientId === 'number' || (!isNaN(Number(patientId)) && !String(patientId).startsWith('0') && String(patientId).length < 8)) ? 0 : 1;
      }

      const inputData = {
        Params: [
          { Key: patKey, Value: patientId || null },
          { Key: 9, Value: FrRegDt },
          { Key: 10, Value: ToRegDt },
          { Key: 7, Value: statusId }
        ],
        PageContext: {
          PageSize: pageSize,
          PageNumber: page
        }
      };

      const res = await apiFetch<any>('registration/patient/GetPatients', inputData);
      if (res && res.Data) {
        setStandaloneData(res.Data || []);
        setStandaloneTotal(res.PageContext?.TotalRecords || res.Data.length || 0);
      }
    } catch (err) {
      console.error('Error fetching standalone patient list:', err);
    } finally {
      setStandaloneLoading(false);
    }
  }, [standalonePage, standalonePageSize, standaloneFilterDate, standaloneFilterStatus]);

  // Initial lookup fetch in standalone mode
  useEffect(() => {
    if (!isHybrid) {
      apiFetch<any>('General/Options/getoptions', [{ Key: 'PatientStatus' }])
        .then(res => {
          if (res && res.PatientStatus) {
            setStandaloneStatusList(res.PatientStatus);
          }
        })
        .catch(err => console.error('Lookup load error:', err));

      fetchStandaloneList(1, standalonePageSize, standaloneFilterDate, standaloneFilterStatus, null);
    }
  }, [isHybrid]);

  // Click outside listener for typeahead dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Live patient search debounced
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.trim();
        let rawList: any[] = [];

        // 1. Primary: Fast live patient search used across HIMS
        try {
          const res = await apiFetch<any>('registration/Patient/GetMinPatientSearch', {
            Params: [
              { Key: 1, Value: query },
              { Key: 7, Value: 2 },
              { Key: 37, Value: 2 }
            ],
            PageContext: { PageSize: 15, PageNumber: 1 }
          });
          rawList = res?.Data || res?.data || (Array.isArray(res) ? res : []);
        } catch {
          rawList = [];
        }

        // 2. Fallback: GetPatients with Key: 1 (searches Name, Mobile, MRN, UHID)
        if (!rawList || rawList.length === 0) {
          try {
            const res2 = await apiFetch<any>('registration/patient/GetPatients', {
              Params: [
                { Key: 1, Value: query }
              ],
              PageContext: { PageSize: 15, PageNumber: 1 }
            });
            rawList = res2?.Data || res2?.data || (Array.isArray(res2) ? res2 : []);
          } catch (err2) {
            console.error('Fallback GetPatients error:', err2);
          }
        }

        // Format items with display names and attributes
        const formatted = (rawList || []).map((item: any) => {
          let patName = item.PatientName || '';
          if (!patName) {
            const title = item.Title?.Description ? item.Title.Description + ' ' : '';
            patName = `${title}${item.FirstName || ''} ${item.LastName || ''}`.trim();
          }
          const genderDesc = item.Gender?.Description || (item.GenderId === 1 ? 'Male' : item.GenderId === 2 ? 'Female' : '');
          return {
            ...item,
            PatientName: patName || item.MRN || 'Patient #' + item.Id,
            GenderDesc: genderDesc
          };
        });

        setSearchResults(formatted);
        setIsDropdownOpen(formatted.length > 0);
      } catch (err) {
        console.error('Search patient error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Actions dispatcher
  const handleDateChange = (newDateStr: string) => {
    if (isHybrid && onAction) {
      onAction('dateChange', { date: newDateStr ? new Date(newDateStr) : null });
    } else {
      setStandaloneFilterDate(newDateStr);
      setStandalonePage(1);
      fetchStandaloneList(1, standalonePageSize, newDateStr, standaloneFilterStatus, null);
    }
  };

  const handleStatusChange = (newStatusId: number) => {
    if (isHybrid && onAction) {
      onAction('statusChange', { statusId: newStatusId });
    } else {
      setStandaloneFilterStatus(newStatusId);
      setStandalonePage(1);
      fetchStandaloneList(1, standalonePageSize, standaloneFilterDate, newStatusId, null);
    }
  };

  const handleSelectPatient = (patient: PatientEntity) => {
    setIsDropdownOpen(false);
    const displayName = (patient as any).PatientName ||
      `${patient.Title?.Description ? patient.Title.Description + ' ' : ''}${patient.FirstName || ''} ${patient.LastName || ''}`.trim() ||
      patient.MRN || '';
    setSearchQuery(displayName);

    if (isHybrid && onAction) {
      onAction('patientSelect', patient);
    } else {
      setStandalonePage(1);
      fetchStandaloneList(1, standalonePageSize, '', standaloneFilterStatus, patient.Id);
    }
  };

  const handleSearchSubmit = (queryText: string) => {
    setIsDropdownOpen(false);
    if (isHybrid && onAction) {
      onAction('patientSelect', queryText);
    } else {
      setStandalonePage(1);
      fetchStandaloneList(1, standalonePageSize, '', standaloneFilterStatus, queryText);
    }
  };

  const handleClearPatient = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);

    if (isHybrid && onAction) {
      onAction('patientClear');
    } else {
      const todayStr = formatDateForInput(new Date());
      setStandaloneFilterDate(todayStr);
      setStandalonePage(1);
      fetchStandaloneList(1, standalonePageSize, todayStr, standaloneFilterStatus, null);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1) return;
    if (isHybrid && onAction) {
      onAction('pageChange', { page });
    } else {
      setStandalonePage(page);
      fetchStandaloneList(page, standalonePageSize, standaloneFilterDate, standaloneFilterStatus, null);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (isHybrid && onAction) {
      onAction('pageSizeChange', { pageSize: size });
    } else {
      setStandalonePageSize(size);
      setStandalonePage(1);
      fetchStandaloneList(1, size, standaloneFilterDate, standaloneFilterStatus, null);
    }
  };

  const handleEditDemographic = (patient: PatientEntity) => {
    if (isHybrid && onAction) {
      onAction('edit', patient);
    } else {
      // In standalone, notify or link if modal bridge not present
      if ((window as any).utl?.Modal) {
        (window as any).utl.Modal.open('app.newpatientregister', {
          params: { id: patient.Id },
          confirmCallback: () => fetchStandaloneList()
        });
      } else {
        alert(`Opening Demographic Edit for Patient ${patient.FirstName || ''} (${patient.MRN || patient.Id})`);
      }
    }
  };

  const handleViewProfile = (patient: PatientEntity) => {
    if (isHybrid && onAction) {
      onAction('patientinfo', patient);
    } else {
      if ((window as any).utl?.Modal) {
        (window as any).utl.Modal.open('registration.patientprofile', {
          params: { pid: patient.Id }
        });
      } else {
        alert(`Opening Profile for Patient ${patient.FirstName || ''} (${patient.MRN || patient.Id})`);
      }
    }
  };

  const handleRefresh = () => {
    if (isHybrid && onAction) {
      onAction('refresh');
    } else {
      fetchStandaloneList();
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedUhid(text);
    setTimeout(() => setCopiedUhid(null), 1800);
  };

  // Quick Date Helpers
  const setQuickDate = (type: 'today' | 'yesterday' | 'all') => {
    if (type === 'today') {
      handleDateChange(formatDateForInput(new Date()));
    } else if (type === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      handleDateChange(formatDateForInput(yesterday));
    } else if (type === 'all') {
      handleDateChange('');
    }
  };

  const currentPage = pager.currentPage || 1;
  const pageSize = pager.pageSize || 25;
  const totalItems = pager.totalItems || patients.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startRow = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(currentPage * pageSize, totalItems);

  const isToday = selectedDateStr === formatDateForInput(new Date());

  return (
    <div className="patient-update-wrapper">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="patient-update-header">
        <div className="patient-update-title-area">
          <div className="patient-update-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
          </div>
          <div>
            <h2>Demographic Update</h2>
            <p>Search, view, and update patient demographics, UHID, and identity profile</p>
          </div>
        </div>

        <div className="patient-update-header-actions">
          <div className="header-stat-badge">
            <span>Patients</span>
            <span className="stat-count">{totalItems}</span>
          </div>

          <button
            type="button"
            className="btn-header-refresh"
            onClick={handleRefresh}
            title="Refresh Patient List"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER & SEARCH CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="patient-update-filter-card">
        <div className="filter-grid-row">
          {/* Date Filter */}
          <div className="filter-field-group">
            <label>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Registration Date</span>
            </label>
            <div className="filter-input-wrap">
              <input
                type="date"
                className="filter-input"
                value={selectedDateStr}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
            <div className="date-presets-strip">
              <button
                type="button"
                className={`btn-date-preset ${isToday ? 'active' : ''}`}
                onClick={() => setQuickDate('today')}
              >
                Today
              </button>
              <button
                type="button"
                className="btn-date-preset"
                onClick={() => setQuickDate('yesterday')}
              >
                Yesterday
              </button>
              <button
                type="button"
                className={`btn-date-preset ${!selectedDateStr ? 'active' : ''}`}
                onClick={() => setQuickDate('all')}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-field-group">
            <label>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Patient Status</span>
            </label>
            <select
              className="filter-select"
              value={selectedStatusId || ''}
              onChange={(e) => handleStatusChange(Number(e.target.value))}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.Id} value={opt.Id}>
                  {opt.Text}
                </option>
              ))}
            </select>
          </div>

          {/* Autocomplete Patient Search */}
          <div className="filter-field-group" ref={searchContainerRef}>
            <label>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search Patient (Name / Mobile / UHID)</span>
            </label>
            <div className="patient-typeahead-wrap">
              <span
                className="search-icon-left"
                style={{ cursor: searchQuery.trim() ? 'pointer' : 'default' }}
                onClick={() => searchQuery.trim() && handleSearchSubmit(searchQuery.trim())}
                title={searchQuery.trim() ? 'Search patients' : undefined}
              >
                {isSearching ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
              </span>

              <input
                type="text"
                className="patient-search-input"
                placeholder="Type patient name, mobile, or UHID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isDropdownOpen && activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
                      handleSelectPatient(searchResults[activeSearchIndex]);
                    } else if (isDropdownOpen && searchResults.length > 0) {
                      handleSelectPatient(searchResults[0]);
                    } else if (searchQuery.trim()) {
                      handleSearchSubmit(searchQuery.trim());
                    }
                    return;
                  }
                  if (!isDropdownOpen || searchResults.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
                  } else if (e.key === 'Escape') {
                    setIsDropdownOpen(false);
                  }
                }}
              />

              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={handleClearPatient}
                  title="Clear search"
                >
                  ✕
                </button>
              )}

              {/* Dropdown Options */}
              {isDropdownOpen && searchResults.length > 0 && (
                <ul className="patient-typeahead-dropdown">
                  {searchResults.map((pat, idx) => {
                    const fullName = (pat as any).PatientName ||
                      `${pat.Title?.Description ? pat.Title.Description + ' ' : ''}${pat.FirstName || ''} ${pat.LastName || ''}`.trim() ||
                      'Unnamed';
                    const isSelected = activeSearchIndex === idx;
                    const avatarLetter = (((pat.FirstName && pat.FirstName[0]) || ((pat as any).PatientName && (pat as any).PatientName[0]) || 'P')).toUpperCase();
                    const uhid = pat.MRN || (pat as any).VisitIdentifier || '';
                    const genderDesc = pat.Gender?.Description || (pat as any).GenderDesc || (pat.GenderId === 1 ? 'Male' : pat.GenderId === 2 ? 'Female' : '');

                    return (
                      <li
                        key={pat.Id || idx}
                        className={`patient-typeahead-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectPatient(pat)}
                        onMouseEnter={() => setActiveSearchIndex(idx)}
                      >
                        <div className="typeahead-item-main">
                          <div className={`typeahead-avatar ${pat.GenderId === 2 ? 'female' : ''}`}>
                            {avatarLetter}
                          </div>
                          <div className="typeahead-info-col">
                            <span className="typeahead-name">{fullName}</span>
                            <span className="typeahead-sub">
                              {pat.Age ? `${pat.Age} Yrs` : ''}
                              {genderDesc ? ` • ${genderDesc}` : ''}
                              {pat.Mobile ? ` • 📞 ${pat.Mobile}` : ''}
                            </span>
                          </div>
                        </div>
                        {uhid && (
                          <span className="typeahead-uhid-badge">
                            {uhid}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Quick Clear Action */}
          <div className="filter-field-group" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleClearPatient}
              title="Reset all filters to defaults"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Active Filter Indicator Chips */}
        {(selectedPatient || searchQuery || !selectedDateStr) && (
          <div className="active-filter-strip">
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Active Filters:</span>
            {selectedPatient && (
              <span className="filter-chip">
                <span>Selected: <strong>{selectedPatient.FirstName} {selectedPatient.LastName}</strong> ({selectedPatient.MRN})</span>
                <button type="button" className="filter-chip-clear" onClick={handleClearPatient}>✕</button>
              </span>
            )}
            {!selectedDateStr && (
              <span className="filter-chip">
                <span>Date: <strong>All History</strong></span>
                <button type="button" className="filter-chip-clear" onClick={() => setQuickDate('today')}>✕</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DATA TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="patient-update-table-card">
        <div className="patient-table-wrap">
          <table className="patient-table">
            <thead>
              <tr>
                <th style={{ width: '45px' }} className="center">#</th>
                <th style={{ width: '150px' }}>Registered Date</th>
                <th>Patient Details</th>
                <th style={{ width: '130px' }}>UHID / MRN</th>
                <th style={{ width: '110px' }}>Age & Gender</th>
                <th style={{ width: '140px' }}>Mobile</th>
                <th style={{ width: '100px' }} className="center">Status</th>
                <th style={{ width: '160px' }} className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Shimmer Loading Skeleton Rows
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`loading-${i}`} className="loading-row">
                    <td><div className="shimmer-bar" style={{ width: '20px', margin: '0 auto' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '90px' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '180px' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '95px' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '60px' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '85px' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '65px', margin: '0 auto' }}></div></td>
                    <td><div className="shimmer-bar" style={{ width: '110px', margin: '0 auto' }}></div></td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-table-state">
                      <div className="empty-state-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </div>
                      <h4>No Patients Found</h4>
                      <p>No registration records match the current filter criteria. Try changing the date or search query.</p>
                      <button
                        type="button"
                        className="btn-reset-filters"
                        onClick={handleClearPatient}
                      >
                        Reset to Today's Registrations
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((row, idx) => {
                  const sNo = (currentPage - 1) * pageSize + idx + 1;
                  const dt = formatDisplayDateTime(row.RegisteredDate);
                  const isFemale = row.GenderId === 2 || row.Gender?.Description?.toLowerCase() === 'female';
                  const titleDesc = row.Title?.Description ? `${row.Title.Description} ` : '';
                  const fullName = `${titleDesc}${row.FirstName || ''} ${row.LastName || ''}`.trim() || 'Unknown';
                  const isActive = row.PatientStatusId === 2 || (row.PatientStatus?.Description || row.PatientStatus?.Text || '').toLowerCase().includes('active');

                  return (
                    <tr key={row.Id || idx}>
                      {/* S.No */}
                      <td className="center">
                        <span className="sno-badge">{sNo}</span>
                      </td>

                      {/* Registered Date & Time */}
                      <td>
                        <div className="reg-datetime">
                          <span className="reg-date">{dt.date}</span>
                          {dt.time && (
                            <span className="reg-time">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {dt.time}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient Details & Clickable Link */}
                      <td>
                        <div className="patient-name-cell">
                          <div className={`patient-avatar-mini ${isFemale ? 'female' : ''}`}>
                            {(row.FirstName?.[0] || 'P').toUpperCase()}
                          </div>
                          <div className="patient-info-stack">
                            <button
                              type="button"
                              className="patient-link-btn"
                              onClick={() => handleViewProfile(row)}
                              title="Click to view Patient Profile"
                            >
                              <span>{fullName}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </button>
                            <span className="patient-gender-label">
                              {row.Gender?.Description || (isFemale ? 'Female' : 'Male')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* UHID / MRN with Copy */}
                      <td>
                        {row.MRN ? (
                          <span
                            className="uhid-code-badge"
                            title="Click to copy UHID"
                            onClick={(e) => copyToClipboard(row.MRN, e)}
                          >
                            <span>{row.MRN}</span>
                            <span className="uhid-copy-icon">
                              {copiedUhid === row.MRN ? '✓' : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Age & Gender */}
                      <td>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {row.Age ? `${row.Age} Yrs` : '-'}
                        </span>
                      </td>

                      {/* Mobile Number */}
                      <td>
                        {row.Mobile ? (
                          <span className="phone-badge">
                            <svg className="phone-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>{row.Mobile}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="center">
                        <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                          <span className="status-dot"></span>
                          <span>{row.PatientStatus?.Description || row.PatientStatus?.Text || (isActive ? 'Active' : 'Inactive')}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="center">
                        <div className="action-buttons-cell">
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => handleEditDemographic(row)}
                            title="Edit Demographic Details"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="btn-action-view"
                            onClick={() => handleViewProfile(row)}
                            title="View Full Profile"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span>Profile</span>
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

        {/* ─────────────────────────────────────────────────────────────
            4. PAGINATION FOOTER
        ───────────────────────────────────────────────────────────── */}
        <div className="patient-update-footer">
          <div className="footer-page-info">
            <span>
              Showing <strong>{startRow}</strong> to <strong>{endRow}</strong> of <strong>{totalItems}</strong> records
            </span>

            <div className="page-size-selector">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          <div className="pagination-nav">
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlePageChange(1)}
              title="First Page"
            >
              «
            </button>
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
              title="Previous Page"
            >
              ‹
            </button>

            <span style={{ fontSize: '12.5px', fontWeight: 600, padding: '0 8px', color: '#334155' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => handlePageChange(currentPage + 1)}
              title="Next Page"
            >
              ›
            </button>
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => handlePageChange(totalPages)}
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientUpdateListScreen;
