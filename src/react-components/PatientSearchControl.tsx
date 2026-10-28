import React, { useState, useEffect, useRef } from 'react';
import { colors, spacing, radii, shadows, typography, controlHeight } from '../components/ui/tokens';
import { Loading } from '../components/ui/Loading';

export interface PatientSearchControlProps {
  reactProps: {
    controlId: string;
    canDisable: boolean;
    tabIndex: number;
    patientDisplay: string;
    placeholder: string;
  };
  onSearch: (query: string) => Promise<any[]>;
  onSelect: (patient: any) => void;
}

export const PatientSearchControl: React.FC<PatientSearchControlProps> = ({
  reactProps = {
    controlId: '',
    canDisable: false,
    tabIndex: 0,
    patientDisplay: '',
    placeholder: 'Search Name/Phone/UHID....'
  },
  onSearch,
  onSelect
}) => {
  const [prevDisplay, setPrevDisplay] = useState(reactProps.patientDisplay);
  const [inputValue, setInputValue] = useState(reactProps.patientDisplay || '');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync input value if external patientDisplay changes
  if (reactProps.patientDisplay !== prevDisplay) {
    setPrevDisplay(reactProps.patientDisplay);
    setInputValue(reactProps.patientDisplay || '');
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);
    setActiveIndex(-1);

    if (query && query.length >= 2) {
      setIsLoading(true);
      setIsOpen(true);
      try {
        const data = await onSearch(query);
        setResults(data || []);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (patient: any) => {
    onSelect(patient);
    setIsOpen(false);
    setResults([]);
    // The parent will update patientDisplay via props if needed, but we can optimistically set it or wait
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="typeahead-demo" style={{ position: 'relative' }} ref={wrapperRef}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <div className="col-sm-12" style={{ padding: 0, position: 'relative' }}>
          {/*
            NOTE ON DESIGN-SYSTEM USAGE: the design system's <SearchBox> only
            accepts {value, onChange, onSubmit, placeholder, onClear, autoFocus} --
            it has no passthrough for `id`, `disabled`, `tabIndex`, `onKeyDown`, or
            `onFocus`. This control genuinely needs all of those (id is a real
            legacy hook -- see `.typeahead-demo>input` in registrationcumvisit.html
            and `.drhms-filters .search .typeahead-demo` in regcumvisitwithbill.html
            -- disabled/tabIndex come straight from reactProps, onKeyDown drives the
            real Up/Down/Enter/Escape result navigation, and onFocus reopens the
            dropdown). Swapping in <SearchBox> as-is would silently drop that
            wiring, so per the "don't distort real behavior to fit a component
            that doesn't match" rule this keeps the real <input> and simply
            reskins it to match SearchBox's exact visual language (icon inset,
            tokens-based border/radius/height/type) instead.
          */}
          <i
            className={isLoading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-magnifying-glass'}
            style={{
              position: 'absolute',
              left: spacing.sm,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '13px',
              color: colors.textSubtle,
              pointerEvents: 'none',
            }}
          />
          <input
            id={reactProps.controlId || 'pid'}
            type="text"
            className="premium-input pid"
            placeholder={reactProps.placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={reactProps.canDisable}
            tabIndex={reactProps.tabIndex}
            onFocus={() => { if (results.length > 0) setIsOpen(true); }}
            autoComplete="off"
            style={{
              width: '100%',
              height: controlHeight.md,
              padding: `0 ${spacing.sm} 0 30px`,
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: reactProps.canDisable ? colors.surfaceMuted : colors.surface,
              color: reactProps.canDisable ? colors.textSubtle : colors.textMain,
              fontFamily: typography.fontFamily,
              fontSize: typography.body.fontSize,
              boxSizing: 'border-box',
              cursor: reactProps.canDisable ? 'not-allowed' : 'text',
            }}
          />
        </div>
      </div>

      {isOpen && (results.length > 0 || isLoading) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 9999,
            maxHeight: '340px',
            width: '560px',
            maxWidth: '90vw',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            boxShadow: shadows.xl,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: colors.surfaceMuted,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-users" style={{ color: colors.primary, fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMain, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Matching Patients
              </span>
              <span
                style={{
                  backgroundColor: colors.primaryLight,
                  color: colors.primary,
                  padding: '2px 8px',
                  borderRadius: radii.full,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {results.length} found
              </span>
            </div>
            <span style={{ fontSize: 11, color: colors.textSubtle }}>
              ↑↓ navigate • ↵ select
            </span>
          </div>

          {/* List Content */}
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {isLoading && results.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                <Loading text="Searching patients..." size="sm" />
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
                No patients found matching your search.
              </div>
            ) : (
              results.map((patient: any, index: number) => {
                const isActive = index === activeIndex;
                const isFemale = patient.GenderId === 2 || patient.GenderCode === 'F';
                const avatarBg = isFemale ? '#fdf2f8' : '#eff6ff';
                const avatarFg = isFemale ? '#db2777' : '#2563eb';
                const initials = (patient.FirstName ? patient.FirstName[0] : '') + (patient.LastName ? patient.LastName[0] : '');
                const due = Number(patient.OutStandingAmount || 0);
                const mrn = patient.MRN || patient.PatientMrn || '—';
                const name = `${patient.Title?.Description || patient.TitleDesc || ''} ${patient.FirstName || patient.PatientName || ''} ${patient.LastName || ''}`.trim();
                const age = patient.Age ? (String(patient.Age).includes('Y') ? patient.Age : `${patient.Age}Y`) : '—';
                const gender = patient.Gender?.Description || patient.GenderCode || (patient.GenderId === 1 ? 'M' : patient.GenderId === 2 ? 'F' : '—');

                return (
                  <div
                    key={patient.Id || index}
                    onClick={() => handleSelect(patient)}
                    onMouseEnter={() => setActiveIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: isActive ? colors.primaryLight : colors.surface,
                      borderLeft: isActive ? `3px solid ${colors.primary}` : '3px solid transparent',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    {/* Left: Avatar + Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: radii.full,
                          backgroundColor: avatarBg,
                          color: avatarFg,
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: `1px solid ${isFemale ? '#fbcfe8' : '#bfdbfe'}`,
                        }}
                      >
                        {initials || <i className="fa-solid fa-user" style={{ fontSize: 11 }} />}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          <span>
                            <i className="fa-regular fa-user" style={{ fontSize: 10, marginRight: 4, color: colors.textSubtle }} />
                            {age} • {gender}
                          </span>
                          {patient.Mobile && (
                            <span>
                              <i className="fa-solid fa-phone" style={{ fontSize: 10, marginRight: 4, color: colors.textSubtle }} />
                              {patient.Mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: MRN & Due */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          padding: '3px 8px',
                          borderRadius: radii.sm,
                          backgroundColor: colors.primaryLight,
                          color: colors.primary,
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {mrn}
                      </span>
                      {due > 0 ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: radii.sm,
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                          }}
                        >
                          ₹{due.toLocaleString()} Due
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>
                          <i className="fa-solid fa-check" style={{ fontSize: 9, marginRight: 3 }} />
                          No Due
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: colors.surfaceMuted,
              borderTop: `1px solid ${colors.border}`,
              fontSize: 11,
              color: colors.textSubtle,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Tip: Type <strong>%%</strong> for all recent patients</span>
            <span>ESC to dismiss</span>
          </div>
        </div>
      )}
    </div>
  );
};
