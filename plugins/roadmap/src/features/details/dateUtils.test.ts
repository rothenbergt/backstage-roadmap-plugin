import { formatDateUTC } from './dateUtils';

describe('formatDateUTC', () => {
  it('formats PostgreSQL-style ISO 8601 timestamps with Z suffix', () => {
    const out = formatDateUTC('2024-06-15T14:30:45.000Z');
    expect(out).not.toMatch(/Invalid/);
    expect(out).toMatch(/2024/);
    expect(out.length).toBeGreaterThan(8);
  });

  it('formats ISO 8601 with numeric offset', () => {
    const out = formatDateUTC('2024-06-15T14:30:45.000+00:00');
    expect(out).not.toMatch(/Invalid/);
    expect(out).toContain('2024');
  });

  it('formats legacy SQL UTC datetime strings (space separator, no timezone)', () => {
    const out = formatDateUTC('2024-06-15 14:30:45');
    expect(out).not.toMatch(/Invalid/);
    expect(out).toMatch(/2024/);
    expect(out.length).toBeGreaterThan(8);
  });

  it('returns an em dash for unparseable input', () => {
    expect(formatDateUTC('not-a-date')).toBe('—');
    expect(formatDateUTC('')).toBe('—');
    expect(formatDateUTC('   ')).toBe('—');
  });
});
