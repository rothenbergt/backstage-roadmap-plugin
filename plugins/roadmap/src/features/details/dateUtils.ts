/**
 * Utility functions for date handling
 */

/**
 * Parses timestamps returned by the roadmap API.
 *
 * The backend guarantees ISO 8601 UTC since v2 (it normalizes at the database
 * boundary). The SQL-style fallback (`YYYY-MM-DD HH:MM:SS`, treated as UTC)
 * is kept as a safety net for older backends.
 */
function parseRoadmapDate(dateString: string): Date {
  const trimmed = dateString.trim();
  if (!trimmed) {
    return new Date(NaN);
  }

  // ISO 8601: includes calendar/time separator `T` (Postgres JSON, GitLab, etc.)
  if (trimmed.includes('T')) {
    return new Date(trimmed);
  }

  // SQL datetime without timezone — treat as UTC (original plugin behavior)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return new Date(`${trimmed.replace(' ', 'T')}Z`);
  }

  return new Date(trimmed);
}

/**
 * Formats a timestamp from the roadmap backend for display in the user's local timezone.
 *
 * Supports ISO 8601 strings (typical with PostgreSQL) and legacy SQL-style UTC strings
 * (`YYYY-MM-DD HH:MM:SS`) without timezone information.
 *
 * @param dateString - Timestamp string from the API
 * @returns Formatted date string in the user's local timezone, or an em dash if unparseable
 */
/**
 * Formats a timestamp as a short relative age, e.g. "3d ago", "2mo ago".
 *
 * @param dateString - Timestamp string from the API
 * @returns Short relative age, or an empty string if unparseable
 */
export function formatRelativeTime(dateString: string): string {
  const date = parseRoadmapDate(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  const months = days / 30.44;
  if (months < 12) return `${Math.floor(months)}mo ago`;
  return `${Math.floor(days / 365.25)}y ago`;
}

export function formatDateUTC(dateString: string): string {
  const date = parseRoadmapDate(dateString);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
