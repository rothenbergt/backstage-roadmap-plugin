/**
 * Utility functions for date handling
 */

/**
 * Parses timestamps returned by the roadmap API.
 *
 * - **PostgreSQL (`pg`)** and GitLab serialize timestamps as ISO 8601 (e.g. `2024-01-15T12:00:00.000Z`).
 * - **SQLite / some drivers** may return SQL-style UTC strings without a timezone: `YYYY-MM-DD HH:MM:SS`.
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
