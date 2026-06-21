export function calculateSleepHours(bedtime: string, wakeTime: string): number {
  const [bedH, bedM] = bedtime.split(':').map(Number)
  const [wakeH, wakeM] = wakeTime.split(':').map(Number)

  let bedMinutes = bedH * 60 + bedM
  let wakeMinutes = wakeH * 60 + wakeM

  if (wakeMinutes < bedMinutes) {
    wakeMinutes += 24 * 60
  }

  const hours = (wakeMinutes - bedMinutes) / 60
  return Math.round(hours * 10) / 10
}
