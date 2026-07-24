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

  const inputClass = "border border-line bg-surface text-ink rounded-lg p-2 text-base"

  return (
    <div className="flex flex-col gap-4">

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-ink">Last night's sleep</h3>
        <div className="flex flex-col gap-1">
          <label htmlFor="wake_time" className="text-sm text-muted">Wake time</label>
          <input
            id="wake_time"
            type="time"
            value={values.wake_time}
            onChange={e => handleWakeTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <Slider
          label="Sleep quality"
          value={values.sleep_quality}
          min={1}
          max={5}
          lowLabel="Poor"
          highLabel="Great"
          onChange={v => onChange({ ...values, sleep_quality: v })}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-ink">Tonight</h3>
        <div className="flex flex-col gap-1">
          <label htmlFor="tonight_bedtime" className="text-sm text-muted">Tonight's bedtime</label>
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
