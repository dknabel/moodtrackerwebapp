import { format, isValid, parse, parseISO, subDays } from 'date-fns'

/** Formats an ISO yyyy-MM-dd date as "Today", "Yesterday", or a short
 * human date ("Tue, Jul 1", with the year appended when it differs from
 * the current year). Malformed input is returned unchanged. */
export function formatDay(dateStr: string, now: Date = new Date()): string {
  const parsed = parseISO(dateStr)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !isValid(parsed)) return dateStr
  if (dateStr === format(now, 'yyyy-MM-dd')) return 'Today'
  if (dateStr === format(subDays(now, 1), 'yyyy-MM-dd')) return 'Yesterday'
  const sameYear = format(parsed, 'yyyy') === format(now, 'yyyy')
  return format(parsed, sameYear ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')
}

/** Formats an "HH:mm" (or "HH:mm:ss") 24-hour time string as 12-hour time
 * with AM/PM, e.g. "08:00" -> "8:00 AM". Malformed input is returned unchanged. */
export function formatTime(timeStr: string): string {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) return timeStr
  const parsed = parse(timeStr.slice(0, 5), 'HH:mm', new Date())
  if (!isValid(parsed)) return timeStr
  return format(parsed, 'h:mm a')
}
