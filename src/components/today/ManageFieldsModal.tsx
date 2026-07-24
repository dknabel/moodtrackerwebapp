import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type { CustomField, FieldConfig, FieldType } from '../../lib/database.types'
import { isCompatibleTypeChange, validateField, type FieldData } from '../../lib/fields'
import { useModal } from '../../hooks/useModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { focusRing } from '../../lib/styles'

interface Props {
  fields: CustomField[]
  onAdd: (data: FieldData) => Promise<string | null>
  onUpdate: (id: string, data: FieldData & { show_in_charts?: boolean }) => Promise<string | null>
  onArchive: (id: string) => Promise<string | null>
  onReactivate: (id: string) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
  onMove: (id: string, direction: -1 | 1) => Promise<string | null>
  onClose: () => void
}

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  action: () => void | Promise<void>
}

interface FormValues {
  name: string
  type: FieldType
  min: string
  max: string
  lowLabel: string
  highLabel: string
  unit: string
  options: string
  show_in_charts: boolean
}

const EMPTY: FormValues = {
  name: '', type: 'slider', min: '1', max: '10',
  lowLabel: '', highLabel: '', unit: '', options: '', show_in_charts: true,
}

function toConfig(v: FormValues): FieldConfig {
  switch (v.type) {
    case 'slider':
      return {
        min: Number(v.min), max: Number(v.max),
        lowLabel: v.lowLabel, highLabel: v.highLabel,
      }
    case 'number':
      return v.unit ? { unit: v.unit } : {}
    case 'tags':
      return { options: v.options.split(',').map(s => s.trim()).filter(Boolean) }
    default:
      return {}
  }
}

function toFormValues(f: CustomField): FormValues {
  return {
    name: f.name,
    type: f.type,
    min: String(f.config.min ?? 1),
    max: String(f.config.max ?? 10),
    lowLabel: f.config.lowLabel ?? '',
    highLabel: f.config.highLabel ?? '',
    unit: f.config.unit ?? '',
    options: (f.config.options ?? []).join(', '),
    show_in_charts: f.show_in_charts,
  }
}

const TYPE_LABELS: Record<FieldType, string> = {
  slider: 'Slider (rate 1–10)',
  number: 'Number',
  toggle: 'Yes / No',
  text: 'Text',
  tags: 'Tags',
}

const inputClass =
  'border border-line bg-surface text-ink rounded p-2 text-sm'

function ConfigInputs({ values, setValues }: {
  values: FormValues
  setValues: (updater: (v: FormValues) => FormValues) => void
}) {
  return (
    <>
      {values.type === 'slider' && (
        <div className="flex gap-2">
          <input
            type="number" aria-label="Min" className={`${inputClass} w-16`} value={values.min}
            onChange={e => setValues(v => ({ ...v, min: e.target.value }))}
          />
          <input
            type="number" aria-label="Max" className={`${inputClass} w-16`} value={values.max}
            onChange={e => setValues(v => ({ ...v, max: e.target.value }))}
          />
          <input
            className={`${inputClass} flex-1 min-w-0`} placeholder="Low label" value={values.lowLabel}
            onChange={e => setValues(v => ({ ...v, lowLabel: e.target.value }))}
          />
          <input
            className={`${inputClass} flex-1 min-w-0`} placeholder="High label" value={values.highLabel}
            onChange={e => setValues(v => ({ ...v, highLabel: e.target.value }))}
          />
        </div>
      )}
      {values.type === 'number' && (
        <input
          className={inputClass} placeholder="Unit (optional, e.g. cups)" value={values.unit}
          onChange={e => setValues(v => ({ ...v, unit: e.target.value }))}
        />
      )}
      {values.type === 'tags' && (
        <input
          className={inputClass} placeholder="Options, comma-separated" value={values.options}
          onChange={e => setValues(v => ({ ...v, options: e.target.value }))}
        />
      )}
    </>
  )
}

export function ManageFieldsModal({
  fields, onAdd, onUpdate, onArchive, onReactivate, onDelete, onMove, onClose,
}: Props) {
  const [addForm, setAddForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const dialogRef = useModal(onClose)

  const active = fields.filter(f => f.active)
  const archived = fields.filter(f => !f.active)
  const namesExcept = (id: string | null) =>
    fields.filter(f => f.id !== id).map(f => f.name)

  const handleAdd = async () => {
    const data: FieldData = { name: addForm.name.trim(), type: addForm.type, config: toConfig(addForm) }
    const invalid = validateField(data, namesExcept(null))
    if (invalid) { setAddError(invalid); return }
    setAddError(null)
    const error = await onAdd(data)
    if (error) { setAddError(error); return }
    setAddForm(EMPTY)
  }

  const startEdit = (f: CustomField) => {
    setEditId(f.id)
    setEditForm(toFormValues(f))
    setEditError(null)
  }

  const applyEdit = async (data: FieldData) => {
    if (!editId) return
    const error = await onUpdate(editId, { ...data, show_in_charts: editForm.show_in_charts })
    if (error) { setEditError(error); return }
    setEditId(null)
  }

  const handleSaveEdit = () => {
    if (!editId) return
    const original = fields.find(f => f.id === editId)
    if (!original) return
    const data: FieldData = { name: editForm.name.trim(), type: editForm.type, config: toConfig(editForm) }
    const invalid = validateField(data, namesExcept(editId))
    if (invalid) { setEditError(invalid); return }
    setEditError(null)
    if (original.type !== data.type && !isCompatibleTypeChange(original.type, data.type)) {
      setConfirm({
        title: `Change ${original.name} to ${TYPE_LABELS[data.type]}?`,
        message: "Past values that don't match the new type will be hidden from charts (they stay in History).",
        confirmLabel: 'Change type',
        action: () => applyEdit(data),
      })
      return
    }
    void applyEdit(data)
  }

  const handleArchive = (f: CustomField) => {
    setConfirm({
      title: `Archive ${f.name}?`,
      message: 'Its history is kept and it can be restored later.',
      confirmLabel: 'Archive',
      action: async () => {
        setListError(null)
        const error = await onArchive(f.id)
        if (error) setListError(error)
      },
    })
  }

  const handleDelete = (f: CustomField) => {
    setConfirm({
      title: `Delete ${f.name} forever?`,
      message: 'This permanently deletes the field and all of its logged values. This cannot be undone.',
      confirmLabel: 'Delete forever',
      action: async () => {
        setListError(null)
        const error = await onDelete(f.id)
        if (error) setListError(error)
      },
    })
  }

  const handleMove = async (f: CustomField, direction: -1 | 1) => {
    setListError(null)
    const error = await onMove(f.id, direction)
    if (error) setListError(error)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-fields-title"
        className="bg-surface w-full max-h-[80vh] rounded-t-2xl shadow-[0_20px_48px_rgba(27,25,22,0.12)] p-6 flex flex-col gap-4 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 id="manage-fields-title" className="font-serif text-lg text-ink">Manage Fields</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`p-2 -m-2 text-faint rounded-lg ${focusRing}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {active.map((f, i) =>
            editId === f.id ? (
              <div key={f.id} className="flex flex-col gap-2 p-3 bg-surface border border-line rounded-lg">
                <input
                  className={inputClass}
                  value={editForm.name}
                  onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))}
                  placeholder="Name"
                />
                <label htmlFor="edit-type" className="text-xs text-faint flex flex-col gap-1">
                  Type
                  <select
                    id="edit-type"
                    className={inputClass}
                    value={editForm.type}
                    onChange={e => setEditForm(v => ({ ...v, type: e.target.value as FieldType }))}
                  >
                    {(Object.keys(TYPE_LABELS) as FieldType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </label>
                <ConfigInputs values={editForm} setValues={setEditForm} />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={editForm.show_in_charts}
                    onChange={e => setEditForm(v => ({ ...v, show_in_charts: e.target.checked }))}
                    className="w-4 h-4 accent-clay"
                  />
                  Show in charts
                </label>
                {editError && <p className="text-danger text-xs">{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="flex-1 bg-clay text-white rounded p-2 text-sm">
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
              <div key={f.id} className="flex items-center justify-between p-3 bg-surface border border-line rounded-lg">
                <div>
                  <p className="font-medium text-ink text-sm">{f.name}</p>
                  <p className="text-xs text-faint">{TYPE_LABELS[f.type]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleMove(f, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${f.name} up`}
                      className={`p-2 -m-1 text-faint disabled:opacity-30 rounded ${focusRing}`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMove(f, 1)}
                      disabled={i === active.length - 1}
                      aria-label={`Move ${f.name} down`}
                      className={`p-2 -m-1 text-faint disabled:opacity-30 rounded ${focusRing}`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => startEdit(f)} className="text-clay text-sm">Edit</button>
                  <button onClick={() => handleArchive(f)} className="text-danger text-sm">Archive</button>
                </div>
              </div>
            )
          )}
          {listError && <p className="text-danger text-xs">{listError}</p>}
        </div>

        {archived.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted">Archived</p>
            {archived.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-surface border border-line rounded-lg opacity-70">
                <div>
                  <p className="font-medium text-ink text-sm">{f.name}</p>
                  <p className="text-xs text-faint">{TYPE_LABELS[f.type]}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onReactivate(f.id)} className="text-clay text-sm">Restore</button>
                  <button onClick={() => handleDelete(f)} className="text-danger text-sm">Delete forever</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!editId && (
        <div className="border-t border-line pt-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Add field</p>
          <input
            className={inputClass}
            value={addForm.name}
            onChange={e => setAddForm(v => ({ ...v, name: e.target.value }))}
            placeholder="Name (required)"
          />
          <label htmlFor="add-type" className="text-xs text-faint flex flex-col gap-1">
            Type
            <select
              id="add-type"
              className={inputClass}
              value={addForm.type}
              onChange={e => setAddForm(v => ({ ...v, type: e.target.value as FieldType }))}
            >
              {(Object.keys(TYPE_LABELS) as FieldType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <ConfigInputs values={addForm} setValues={setAddForm} />
          {addError && <p className="text-danger text-xs">{addError}</p>}
          <button
            onClick={handleAdd}
            disabled={!addForm.name.trim()}
            className="bg-clay text-white rounded p-2 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
        )}

        {confirm && (
          <ConfirmDialog
            title={confirm.title}
            message={confirm.message}
            confirmLabel={confirm.confirmLabel}
            onConfirm={() => {
              const { action } = confirm
              setConfirm(null)
              void action()
            }}
            onCancel={() => setConfirm(null)}
          />
        )}
      </div>
    </div>
  )
}
