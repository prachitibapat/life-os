import { cn, formatDate, today, getDatesInRange } from '../lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'ignored', 'added')).toBe('base added');
  });

  it('deduplicates tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatDate', () => {
  it('formats a date string', () => {
    // Use noon UTC to avoid date shifting across timezones
    const result = formatDate('2026-01-15T12:00:00Z');
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2026/);
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-06-01'));
    expect(result).toMatch(/2026/);
  });
});

describe('today', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDatesInRange', () => {
  it('returns all dates between start and end inclusive', () => {
    const dates = getDatesInRange('2026-01-01', '2026-01-03');
    expect(dates).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('returns a single date when start equals end', () => {
    expect(getDatesInRange('2026-03-10', '2026-03-10')).toEqual(['2026-03-10']);
  });

  it('returns empty array when start is after end', () => {
    expect(getDatesInRange('2026-03-10', '2026-03-09')).toEqual([]);
  });
});
