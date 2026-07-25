import type { Medication, MedicationLog } from '../../lib/database.types'
import { buildAdherenceDays } from '../../lib/adherence'
import { Section } from '../ui/Section'

interface MedAdherenceSectionProps {
  index: number
  medications: Medication[]
  logs: MedicationLog[]
  days?: number
}

export function MedAdherenceSection({ index, medications, logs, days = 14 }: MedAdherenceSectionProps) {
  const active = medications.filter(m => m.active)
  if (active.length === 0) return null
  return (
    <Section index={index} title="Medications">
      <div className="flex flex-col gap-3">
        {active.map(med => {
          const segments = buildAdherenceDays(logs, med.id, days)
          const taken = segments.filter(s => s.taken === true).length
          return (
            <div key={med.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-ink">{med.name}</span>
                <span className="font-mono text-xs tnum text-faint">{taken}/{days}</span>
              </div>
              <div
                role="img"
                aria-label={`${med.name}: taken ${taken} of ${days} days`}
                className="flex gap-[3px]"
              >
                {segments.map(s => (
                  <div
                    key={s.date}
                    title={`${s.date}: ${s.taken === null ? 'no record' : s.taken ? 'taken' : 'missed'}`}
                    className={`h-4 flex-1 rounded-[2px] ${
                      s.taken === null ? 'border border-line' : s.taken ? 'bg-signal' : 'bg-danger'
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
