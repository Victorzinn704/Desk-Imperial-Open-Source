export const CALENDAR_THEME = `
  .imperial-cal .rbc-calendar {
    background: transparent !important;
    color: var(--text-primary) !important;
    font-family: inherit;
  }

  .imperial-cal .rbc-toolbar {
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border) !important;
    background: transparent !important;
  }

  .imperial-cal .rbc-toolbar button {
    color: var(--text-soft);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .imperial-cal .rbc-toolbar button:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
    background: var(--surface-soft);
  }

  .imperial-cal .rbc-toolbar button.rbc-active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .imperial-cal .rbc-toolbar-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .imperial-cal .rbc-header {
    padding: 10px 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border) !important;
    background: transparent !important;
  }

  .imperial-cal .rbc-header + .rbc-header,
  .imperial-cal .rbc-day-bg + .rbc-day-bg,
  .imperial-cal .rbc-time-header-content,
  .imperial-cal .rbc-time-content > * + * > * ,
  .imperial-cal .rbc-agenda-view tbody > tr > td + td {
    border-left: 1px solid var(--border) !important;
  }

  .imperial-cal .rbc-header a,
  .imperial-cal .rbc-header a:visited,
  .imperial-cal .rbc-date-cell {
    color: var(--text-soft);
    text-decoration: none;
  }

  .imperial-cal .rbc-month-view,
  .imperial-cal .rbc-time-view,
  .imperial-cal .rbc-time-view .rbc-row,
  .imperial-cal .rbc-time-header,
  .imperial-cal .rbc-time-header-gutter,
  .imperial-cal .rbc-time-column,
  .imperial-cal .rbc-time-content,
  .imperial-cal .rbc-allday-cell,
  .imperial-cal .rbc-day-slot,
  .imperial-cal .rbc-agenda-view {
    border: none !important;
    background: transparent !important;
  }

  .imperial-cal .rbc-month-row + .rbc-month-row,
  .imperial-cal .rbc-time-content,
  .imperial-cal .rbc-time-header,
  .imperial-cal .rbc-agenda-view table thead th,
  .imperial-cal .rbc-agenda-view tbody > tr > td,
  .imperial-cal .rbc-timeslot-group {
    border-bottom: 1px solid var(--border) !important;
  }

  .imperial-cal .rbc-off-range-bg {
    background: color-mix(in srgb, var(--surface-muted) 72%, var(--bg)) !important;
  }

  .imperial-cal .rbc-today {
    background: color-mix(in srgb, var(--accent) 6%, transparent) !important;
  }

  .imperial-cal .rbc-date-cell {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .imperial-cal .rbc-date-cell.rbc-now a {
    color: var(--accent);
  }

  .imperial-cal .rbc-time-slot,
  .imperial-cal .rbc-label,
  .imperial-cal .rbc-agenda-date-cell,
  .imperial-cal .rbc-agenda-time-cell {
    color: var(--text-muted);
    font-size: 11px;
    background: transparent !important;
  }

  .imperial-cal .rbc-day-slot .rbc-time-slot {
    border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent) !important;
  }

  .imperial-cal .rbc-current-time-indicator {
    background: var(--accent) !important;
    height: 2px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .imperial-cal .rbc-slot-selection {
    background: color-mix(in srgb, var(--accent) 10%, transparent) !important;
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border)) !important;
  }

  .imperial-cal .rbc-event {
    outline: none !important;
  }

  .imperial-cal .rbc-event:focus {
    outline: 2px solid color-mix(in srgb, var(--accent) 24%, transparent) !important;
  }

  .imperial-cal .rbc-show-more {
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    background: transparent;
  }

  .imperial-cal .rbc-agenda-view table {
    color: var(--text-primary);
    border-color: var(--border) !important;
    width: 100%;
    background: transparent !important;
  }

  .imperial-cal .rbc-agenda-view table thead {
    background: var(--surface-soft) !important;
  }

  .imperial-cal .rbc-agenda-view table thead th {
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 8px 12px;
  }

  .imperial-cal .rbc-agenda-view tbody > tr > td {
    padding: 8px 12px;
    background: transparent !important;
  }

  .imperial-cal .rbc-agenda-event-cell {
    color: var(--text-primary);
  }

  .imperial-cal .rbc-addons-dnd .rbc-addons-dnd-drag-preview {
    opacity: 0.82;
  }

  .imperial-cal .rbc-addons-dnd-resizable {
    cursor: grab;
  }

  .imperial-cal .rbc-addons-dnd-resize-ns-anchor,
  .imperial-cal .rbc-addons-dnd-resize-ew-anchor {
    background: color-mix(in srgb, var(--accent) 40%, transparent);
  }
`
