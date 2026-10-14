import { format } from 'date-fns';

/**
 * Single helper to get YYYY-MM-DD date key in UTC or company timezone
 * Ensures dates are not shifted erroneously.
 */
export function toDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Format using UTC year, month, date or ISO formatted date part
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Checks if a given date is a workable day according to workingDays (e.g., 'mon,tue,wed,thu,fri')
 * and a list of holiday date keys (YYYY-MM-DD).
 */
export function isWorkableDay(
  date: Date,
  workingDaysStr: string = 'mon,tue,wed,thu,fri',
  holidayDateKeys: Set<string> = new Set()
): boolean {
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[date.getUTCDay()];
  const allowedDays = workingDaysStr.toLowerCase().split(',').map((s) => s.trim());

  if (!allowedDays.includes(dayName)) {
    return false;
  }

  const key = toDateKey(date);
  if (holidayDateKeys.has(key)) {
    return false;
  }

  return true;
}

/**
 * Get all calendar dates in a month (1-indexed month, 1-12)
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= daysCount; day++) {
    dates.push(new Date(Date.UTC(year, month - 1, day)));
  }
  return dates;
}
