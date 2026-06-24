import { useState } from 'react'
import type { Medication } from '../../lib/database.types'

interface MedData {
  name: string
  dose: string
  scheduled_time: string | null
}

interface Props {
  medications: Medication[]
  onAdd: (data: MedData) => Promise<void>
  onUpdate: (id: string, data: MedData) => Promise<void>
  onDeactivate: (id: string) => Promise<void>
  onClose: () => void
}

const EMPTY = { name: '', dose: '', scheduled_time: '' }

export function ManageMedsModal({ medications, onAdd, onUpdate, onDeactivate, onClose }: Props) {
  const [addForm, setAddForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY)

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.dose.trim()) return
    await onAdd({
      name: addForm.name.trim(),
      dose: addForm.dose.trim(),
      scheduled_time: addForm.scheduled_time || null,
    })
    setAddForm(EMPTY)
  }

  const startEdit = (med: Medication) => {
    setEditId(med.id)
    setEditForm({ name: med.name, dose: med.dose, scheduled_time: med.scheduled_time ?? '' })
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    await onUpdate(editId, {
      name: editForm.name.trim(),
      dose: editForm.dose.trim(),
      scheduled_time: editForm.scheduled_time || null,
    })
    setEditId(null)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-gray-900 w-full max-h-[80vh] rounded-t-2xl p-6 flex flex-col gap-4 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Medications</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 dark:text-gray-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {medications.map(med =>
            editId === med.id ? (
              <div key={med.id} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                />
                <input
                  className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                  value={editForm.dose}
                  onChange={e => setEditForm(f => ({ ...f, dose: e.target.value }))}
                  placeholder="Dose"
                />
                <input
                  type="time"
                  className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                  value={editForm.scheduled_time}
                  onChange={e => setEditForm(f => ({ ...f, scheduled_time: e.target.value }))}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-blue-600 text-white rounded p-2 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{med.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span>{med.dose}</span>
                    {med.scheduled_time && <span> @ {med.scheduled_time.slice(0, 5)}</span>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(med)}
                    className="text-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeactivate(med.id)}
                    className="text-red-500 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add medication</p>
          <input
            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            value={addForm.name}
            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name (required)"
          />
          <input
            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            value={addForm.dose}
            onChange={e => setAddForm(f => ({ ...f, dose: e.target.value }))}
            placeholder="Dose (required)"
          />
          <input
            type="time"
            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            value={addForm.scheduled_time}
            onChange={e => setAddForm(f => ({ ...f, scheduled_time: e.target.value }))}
          />
          <button
            onClick={handleAdd}
            disabled={!addForm.name.trim() || !addForm.dose.trim()}
            className="bg-blue-600 text-white rounded p-2 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
