import { useState } from 'react'
import { Settings } from 'lucide-react'
import { useMedications } from '../../hooks/useMedications'
import { useMedicationLogs } from '../../hooks/useMedicationLogs'
import { ManageMedsModal } from './ManageMedsModal'
import { formatTime } from '../../lib/dates'

interface Props {
  date: string
}

export function MedsSection({ date }: Props) {
  const {
    medications, loading: medsLoading, error: medsError,
    addMedication, updateMedication, deactivateMedication,
  } = useMedications()
  const { logs, loading: logsLoading, error: logsError, setTaken } = useMedicationLogs(date)
  const [showModal, setShowModal] = useState(false)
  const [takenError, setTakenError] = useState<string | null>(null)

  const loading = medsLoading || logsLoading
  const fetchError = medsError ?? logsError

  const getLog = (medicationId: string) =>
    logs.find(l => l.medication_id === medicationId)

  const handleSetTaken = async (medicationId: string, taken: boolean) => {
    setTakenError(null)
    const error = await setTaken(medicationId, taken)
    if (error) setTakenError(error)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            aria-label="Manage medications"
            className="text-faint hover:text-muted"
          >
            <Settings className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-faint">Loading…</p>
        ) : fetchError ? (
          <p className="text-sm text-danger">Could not load medications: {fetchError}</p>
        ) : medications.length === 0 ? (
          <p className="text-sm text-muted">
            No medications added.{' '}
            <button onClick={() => setShowModal(true)} className="text-signal underline">
              Add yours
            </button>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {medications.map(med => {
              const log = getLog(med.id)
              const taken = log?.taken ?? false

              return (
                <div key={med.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={taken}
                    onChange={e => handleSetTaken(med.id, e.target.checked)}
                    className="w-5 h-5 accent-signal cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${taken ? 'line-through text-faint' : 'text-ink'}`}>
                    {med.name} — {med.dose}
                    {med.scheduled_time && (
                      <span className="text-xs text-faint ml-1">
                        @ {formatTime(med.scheduled_time)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {takenError && (
          <p className="text-sm text-danger">Could not save: {takenError}</p>
        )}
      </div>

      {showModal && (
        <ManageMedsModal
          medications={medications}
          onAdd={addMedication}
          onUpdate={updateMedication}
          onDeactivate={deactivateMedication}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
