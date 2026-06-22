import { useRef, useEffect } from 'react'
import { Slider } from '../ui/Slider'
import { calculateSleepHours } from '../../lib/sleep'

interface SleepValues {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
}

interface SleepSectionProps {
  values: SleepValues
  onChange: (values: SleepValues) => void
}

function getTimeOfDay(): 'morning' | 'evening' | 'day' {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 20 || h < 5) return 'evening'
  return 'day'
}

export function SleepSection({ values, onChange }: SleepSectionProps) {
  const timeOfDay = getTimeOfDay()

  // Track latest typed values in refs so handlers can cross-reference
  // even when the parent hasn't flushed the prop update yet (e.g. rapid typing).
  // Also sync refs when props change externally (e.g. log loaded from Supabase).
  const bedtimeRef = useRef(values.bedtime)
  const wakeTimeRef = useRef(values.wake_time)

  useEffect(() => { bedtimeRef.current = values.bedtime }, [values.bedtime])
  useEffect(() => { wakeTimeRef.current = values.wake_time }, [values.wake_time])

  const handleBedtime = (bedtime: string) => {
    bedtimeRef.current = bedtime
    const hours = bedtime && wakeTimeRef.current
      ? calculateSleepHours(bedtime, wakeTimeRef.current)
      : null
    onChange({ ...values, bedtime, sleep_hours: hours })
  }

  const handleWakeTime = (wake_time: string) => {
    wakeTimeRef.current = wake_time
    const hours = bedtimeRef.current && wake_time
      ? calculateSleepHours(bedtimeRef.current, wake_time)
      : null
    onChange({ ...values, wake_time, sleep_hours: hours })
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    onChange({ ...values, sleep_hours: isNaN(v) ? null : v })
  }

  const bedtimeField = (
    <div className="flex flex-col gap-1 flex-1">
      <label htmlFor="bedtime" className="text-sm text-gray-600">Bedtime</label>
      <input
        id="bedtime"
        type="time"
        value={values.bedtime}
        onChange={e => handleBedtime(e.target.value)}
        className="border border-gray-300 rounded-lg p-2 text-base"
      />
    </div>
  )

  const wakeTimeField = (
    <div className="flex flex-col gap-1 flex-1">
      <label htmlFor="wake_time" className="text-sm text-gray-600">Wake time</label>
      <input
        id="wake_time"
        type="time"
        value={values.wake_time}
        onChange={e => handleWakeTime(e.target.value)}
        className="border border-gray-300 rounded-lg p-2 text-base"
      />
    </div>
  )

  const contextLabel =
    timeOfDay === 'morning' ? 'Good morning — how did you sleep?' :
    timeOfDay === 'evening' ? 'Heading to bed?' :
    null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Sleep</h2>
        {contextLabel && <p className="text-sm text-gray-500 mt-0.5">{contextLabel}</p>}
      </div>
      <div className="flex gap-4">
        {timeOfDay === 'morning' ? <>{wakeTimeField}{bedtimeField}</> : <>{bedtimeField}{wakeTimeField}</>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sleep_hours" className="text-sm text-gray-600">
          Hours slept {values.sleep_hours !== null ? `(${values.sleep_hours}h)` : ''}
        </label>
        <input
          id="sleep_hours"
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={values.sleep_hours ?? ''}
          onChange={handleHoursChange}
          placeholder="e.g. 7.5"
          className="border border-gray-300 rounded-lg p-2 text-base"
        />
      </div>
      <Slider
        label="Sleep quality"
        value={values.sleep_quality}
        min={1}
        max={5}
        onChange={v => onChange({ ...values, sleep_quality: v })}
      />
    </div>
  )
}
