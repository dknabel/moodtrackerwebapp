import { useModal } from '../../hooks/useModal'
import { btnSecondary } from '../../lib/styles'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useModal(onCancel)
  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-[60] p-6"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-surface rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-[0_20px_48px_rgba(27,25,22,0.12)]"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-serif text-lg text-ink">
          {title}
        </h2>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 ${btnSecondary}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-danger text-white rounded-full p-2 text-sm font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
