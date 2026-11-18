import { describe, it, expect } from 'vitest';
import { calculateHolidayNoticeDiffDays, DEFAULT_EVENT_EMAIL_SETTINGS } from '../services/eventEmailService.js';

describe('Holiday Announcement Notice Logic Tests', () => {
  it('1. Returns exactly 1 day prior when holiday is tomorrow', () => {
    const today = new Date('2026-11-18T10:00:00Z');
    const holidayTomorrow = new Date('2026-11-19T00:00:00Z');

    const diffDays = calculateHolidayNoticeDiffDays(holidayTomorrow, today);
    expect(diffDays).toBe(1);
    expect(diffDays === DEFAULT_EVENT_EMAIL_SETTINGS.holidayNoticeDays).toBe(true);
  });

  it('2. Returns 0 when holiday is today (not upcoming 1 day prior)', () => {
    const today = new Date('2026-11-18T08:30:00Z');
    const holidayToday = new Date('2026-11-18T00:00:00Z');

    const diffDays = calculateHolidayNoticeDiffDays(holidayToday, today);
    expect(diffDays).toBe(0);
    // Should NOT trigger the 1-day prior notice
    expect(diffDays === 1).toBe(false);
  });

  it('3. Returns > 1 when holiday is in the future (e.g., 2 days, 10 days, 1 month)', () => {
    const today = new Date('2026-11-18T00:00:00Z');
    const holidayInTwoDays = '2026-11-20';
    const holidayNextMonth = '2026-12-25';

    expect(calculateHolidayNoticeDiffDays(holidayInTwoDays, today)).toBe(2);
    expect(calculateHolidayNoticeDiffDays(holidayNextMonth, today)).toBe(37);

    // Neither should trigger 1-day announcement
    expect(calculateHolidayNoticeDiffDays(holidayInTwoDays, today) === 1).toBe(false);
    expect(calculateHolidayNoticeDiffDays(holidayNextMonth, today) === 1).toBe(false);
  });

  it('4. Correctly computes 1 day prior across month boundary (Nov 30 -> Dec 1)', () => {
    const today = new Date('2026-11-30T15:00:00Z');
    const holidayDec1 = new Date('2026-12-01T00:00:00Z');

    const diffDays = calculateHolidayNoticeDiffDays(holidayDec1, today);
    expect(diffDays).toBe(1);
  });

  it('5. Correctly computes 1 day prior across year boundary (Dec 31 -> Jan 1)', () => {
    const today = new Date('2026-12-31T20:00:00Z');
    const holidayNewYear = new Date('2027-01-01T00:00:00Z');

    const diffDays = calculateHolidayNoticeDiffDays(holidayNewYear, today);
    expect(diffDays).toBe(1);
  });

  it('6. Returns negative value when holiday has already passed', () => {
    const today = new Date('2026-11-18T10:00:00Z');
    const pastHoliday = new Date('2026-11-10T00:00:00Z');

    const diffDays = calculateHolidayNoticeDiffDays(pastHoliday, today);
    expect(diffDays).toBe(-8);
    expect(diffDays === 1).toBe(false);
  });
});
