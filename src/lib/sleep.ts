export function calculateSleepHours(bedtime: string, wakeTime: string): number {
  const [bedH, bedM] = bedtime.split(':').map(Number)
  const [wakeH, wakeM] = wakeTime.split(':').map(Number)

  const bedMinutes = bedH * 60 + bedM
  const rawWakeMinutes = wakeH * 60 + wakeM
  const wakeMinutes = rawWakeMinutes < bedMinutes ? rawWakeMinutes + 24 * 60 : rawWakeMinutes

  const hours = (wakeMinutes - bedMinutes) / 60
  return Math.round(hours * 10) / 10
}
