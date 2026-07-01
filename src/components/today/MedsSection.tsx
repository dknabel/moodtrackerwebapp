import { useState } from 'react'
import { useMedications } from '../../hooks/useMedications'
import { useMedicationLogs } from '../../hooks/useMedicationLogs'
import { ManageMedsModal } from './ManageMedsModal'

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

  const handleSetTaken = async (medicationId: string, taken: boolean, takenAt: string | null) => {
    setTakenError(null)
    const error = await setTaken(medicationId, taken, takenAt)
    if (error) setTakenError(error)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Medications</h2>
          <button
            onClick={() => setShowModal(true)}
            aria-label="Manage medications"
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            ⚙
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
        ) : fetchError ? (
          <p className="text-sm text-red-500">Could not load medications: {fetchError}</p>
        ) : medications.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No medications added.{' '}
            <button onClick={() => setShowModal(true)} className="text-blue-600 underline">
              Add yours
            </button>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {medications.map(med => {
              const log = getLog(med.id)
              const taken = log?.taken ?? false
              const takenAt = log?.taken_at?.slice(0, 5) ?? ''

              return (
                <div key={med.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={taken}
                    onChange={e => handleSetTaken(med.id, e.target.checked, taken ? null : takenAt || null)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                  <span className="flex-1 text-sm text-gray-900 dark:text-white">
                    {med.name} — {med.dose}
                    {med.scheduled_time && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        @ {med.scheduled_time.slice(0, 5)}
                      </span>
                    )}
                  </span>
                  {taken && (
                    <input
                      type="time"
                      value={takenAt}
                      onChange={e => handleSetTaken(med.id, true, e.target.value || null)}
                      className="text-xs border border-gray-200 dark:border-gray-700 rounded p-1 dark:bg-gray-800 dark:text-white"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {takenError && (
          <p className="text-sm text-red-500">Could not save: {takenError}</p>
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
