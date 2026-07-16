import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Stack of open modals so that with nested dialogs (e.g. a confirm on top of
// a sheet) only the topmost one reacts to Escape and traps Tab.
const stack: symbol[] = []
let savedOverflow = ''

/** Accessible modal behavior: focuses the dialog on open, restores focus on
 * close, locks body scroll, traps Tab, and closes on Escape. Attach the
 * returned ref to the dialog element. */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const id = Symbol('modal')
    if (stack.length === 0) savedOverflow = document.body.style.overflow
    stack.push(id)
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || !dialog) return
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      stack.splice(stack.indexOf(id), 1)
      if (stack.length === 0) document.body.style.overflow = savedOverflow
      previous?.focus()
    }
  }, [])

  return ref
}
