export interface ShiftTiming {
  id: string;
  name: string;
  code: string;
  startTime: string; // e.g. "09:30" or "-"
  endTime: string;   // e.g. "18:30" or "-"
  breakDurationMinutes?: number;
  gracePeriodMinutes?: number;
  color?: string;
  isNightShift?: boolean;
}

/**
 * Format 24h "HH:mm" time string into 12h "hh:mm AM/PM" format
 */
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr || timeStr === '-' || timeStr === '---') return '';
  const trimmed = timeStr.trim();
  if (trimmed.includes('AM') || trimmed.includes('PM')) return trimmed;

  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return trimmed;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Convert a ShiftTiming object into a standardized display / value string
 * e.g. "Morning Shift (06:00 AM - 02:30 PM)" or "Weekly Off (Off Day)"
 */
export function formatShiftOption(shift: ShiftTiming | any): string {
  if (!shift) return '';
  const name = (shift.name || '').trim();
  if (!name) return '';

  // If already formatted with timing in parentheses, return as is
  if (name.includes('(') && name.includes(')')) {
    return name;
  }

  const isOff =
    shift.code === 'WO' ||
    shift.isWeeklyOff ||
    (shift.startTime === '-' && shift.endTime === '-') ||
    name.toLowerCase().includes('weekly off') ||
    name.toLowerCase().includes('off day');

  if (isOff) {
    return `${name} (Off Day)`;
  }

  const start12 = formatTime12h(shift.startTime);
  const end12 = formatTime12h(shift.endTime);

  if (start12 && end12) {
    return `${name} (${start12} - ${end12})`;
  } else if (shift.startTime && shift.endTime && shift.startTime !== '-' && shift.endTime !== '-') {
    return `${name} (${shift.startTime} - ${shift.endTime})`;
  }

  return name;
}
