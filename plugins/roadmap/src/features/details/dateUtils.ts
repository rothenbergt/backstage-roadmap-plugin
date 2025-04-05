/**
 * Utility functions for date handling
 */

/**
 * Formats a date string that's stored in UTC format in the database without timezone information.
 * The database returns dates in format: "YYYY-MM-DD HH:MM:SS" in UTC time.
 * 
 * @param dateString - Date string from the backend in format "YYYY-MM-DD HH:MM:SS" (UTC)
 * @returns Formatted date string in the user's local timezone
 */
export function formatDateUTC(dateString: string): string {
  // Create a date object, treating the input as UTC time
  // Add 'Z' to indicate it's UTC time, as the backend doesn't include timezone info
  const utcDateString = `${dateString.replace(' ', 'T')}Z`;
  const date = new Date(utcDateString);
  
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}