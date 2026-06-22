import { Slider } from '../ui/Slider'
import { calculateSleepHours } from '../../lib/sleep'

interface SleepValues {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
  tonight_bedtime: string
}

interface SleepSectionProps {
  values: SleepValues
  onChange: (values: SleepValues) => void
}

export function SleepSection({ values, onChange }: SleepSectionProps) {
  const handleWakeTime = (wake_time: string) => {
    const hours = values.bedtime && wake_time
      ? calculateSleepHours(values.bedtime, wake_time)
      : null
    onChange({ ...values, wake_time, sleep_hours: hours })
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    onChange({ ...values, sleep_hours: isNaN(v) ? null : v })
  }

  const inputClass = "border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg p-2 text-base"

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sleep</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Last night's sleep</h3>
        <div className="flex flex-col gap-1">
          <label htmlFor="wake_time" className="text-sm text-gray-600 dark:text-gray-400">Wake time</label>
          <input
            id="wake_time"
            type="time"
            value={values.wake_time}
            onChange={e => handleWakeTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sleep_hours" className="text-sm text-gray-600 dark:text-gray-400">
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
            className={`${inputClass} dark:placeholder-gray-400`}
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

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tonight</h3>
        <div className="flex flex-col gap-1">
          <label htmlFor="tonight_bedtime" className="text-sm text-gray-600 dark:text-gray-400">Tonight's bedtime</label>
          <input
            id="tonight_bedtime"
            type="time"
            value={values.tonight_bedtime}
            onChange={e => onChange({ ...values, tonight_bedtime: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
