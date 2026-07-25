import { useModal } from '../../hooks/useModal'
import { btnSecondary, focusRing } from '../../lib/styles'

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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-surface border border-line rounded-xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-sans font-medium text-lg text-ink tracking-[-0.01em]">
          {title}
        </h2>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 ${btnSecondary} ${focusRing}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 bg-danger text-white rounded-full p-2 text-sm font-medium ${focusRing}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
