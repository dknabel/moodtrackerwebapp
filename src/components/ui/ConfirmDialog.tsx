import { useModal } from '../../hooks/useModal'

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white rounded-lg p-2 text-sm font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
