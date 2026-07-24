import { useState } from 'react'
import { X } from 'lucide-react'
import type { Medication } from '../../lib/database.types'
import { useModal } from '../../hooks/useModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { focusRing } from '../../lib/styles'
import { formatTime } from '../../lib/dates'

interface MedData {
  name: string
  dose: string
  scheduled_time: string | null
}

interface Props {
  medications: Medication[]
  onAdd: (data: MedData) => Promise<string | null>
  onUpdate: (id: string, data: MedData) => Promise<string | null>
  onDeactivate: (id: string) => Promise<string | null>
  onClose: () => void
}

const EMPTY = { name: '', dose: '', scheduled_time: '' }

export function ManageMedsModal({ medications, onAdd, onUpdate, onDeactivate, onClose }: Props) {
  const [addForm, setAddForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [confirmMed, setConfirmMed] = useState<Medication | null>(null)
  const dialogRef = useModal(onClose)

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.dose.trim()) return
    setAddError(null)
    const error = await onAdd({
      name: addForm.name.trim(),
      dose: addForm.dose.trim(),
      scheduled_time: addForm.scheduled_time || null,
    })
    if (error) {
      setAddError(error)
      return
    }
    setAddForm(EMPTY)
  }

  const startEdit = (med: Medication) => {
    setEditId(med.id)
    setEditForm({ name: med.name, dose: med.dose, scheduled_time: med.scheduled_time ?? '' })
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setEditError(null)
    const error = await onUpdate(editId, {
      name: editForm.name.trim(),
      dose: editForm.dose.trim(),
      scheduled_time: editForm.scheduled_time || null,
    })
    if (error) {
      setEditError(error)
      return
    }
    setEditId(null)
  }

  const confirmDeactivate = async (med: Medication) => {
    setListError(null)
    const error = await onDeactivate(med.id)
    if (error) setListError(error)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end z-50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-meds-title"
        className="bg-surface w-full max-h-[80vh] rounded-t-2xl shadow-[0_20px_48px_rgba(27,25,22,0.12)] p-6 flex flex-col gap-4 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 id="manage-meds-title" className="font-serif text-lg text-ink">Manage Medications</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`p-2 -m-2 text-faint rounded-lg ${focusRing}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {medications.map(med =>
            editId === med.id ? (
              <div key={med.id} className="flex flex-col gap-2 p-3 bg-surface border border-line rounded-lg">
                <input
                  className="border border-line bg-surface text-ink rounded p-2 text-sm"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                />
                <input
                  className="border border-line bg-surface text-ink rounded p-2 text-sm"
                  value={editForm.dose}
                  onChange={e => setEditForm(f => ({ ...f, dose: e.target.value }))}
                  placeholder="Dose"
                />
                <input
                  type="time"
                  className="border border-line bg-surface text-ink rounded p-2 text-sm"
                  value={editForm.scheduled_time}
                  onChange={e => setEditForm(f => ({ ...f, scheduled_time: e.target.value }))}
                />
                {editError && (
                  <p className="text-danger text-xs">{editError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-clay text-white rounded p-2 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex-1 border border-line rounded p-2 text-sm text-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={med.id} className="flex items-center justify-between p-3 bg-surface border border-line rounded-lg">
                <div>
                  <p className="font-medium text-ink text-sm">{med.name}</p>
                  <p className="text-xs text-faint">
                    <span>{med.dose}</span>
                    {med.scheduled_time && <span> @ {formatTime(med.scheduled_time)}</span>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(med)}
                    className="text-clay text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmMed(med)}
                    className="text-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
          {listError && (
            <p className="text-danger text-xs">{listError}</p>
          )}
        </div>

        <div className="border-t border-line pt-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Add medication</p>
          <input
            className="border border-line bg-surface text-ink rounded p-2 text-sm"
            value={addForm.name}
            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name (required)"
          />
          <input
            className="border border-line bg-surface text-ink rounded p-2 text-sm"
            value={addForm.dose}
            onChange={e => setAddForm(f => ({ ...f, dose: e.target.value }))}
            placeholder="Dose (required)"
          />
          <input
            type="time"
            className="border border-line bg-surface text-ink rounded p-2 text-sm"
            value={addForm.scheduled_time}
            onChange={e => setAddForm(f => ({ ...f, scheduled_time: e.target.value }))}
          />
          {addError && (
            <p className="text-danger text-xs">{addError}</p>
          )}
          <button
            onClick={handleAdd}
            disabled={!addForm.name.trim() || !addForm.dose.trim()}
            className="bg-clay text-white rounded p-2 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {confirmMed && (
          <ConfirmDialog
            title={`Remove ${confirmMed.name}?`}
            message="Past history is kept."
            confirmLabel="Remove"
            onConfirm={() => {
              const med = confirmMed
              setConfirmMed(null)
              void confirmDeactivate(med)
            }}
            onCancel={() => setConfirmMed(null)}
          />
        )}
      </div>
    </div>
  )
}
