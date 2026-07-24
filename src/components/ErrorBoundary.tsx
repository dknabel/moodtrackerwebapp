import { Component, type ReactNode } from 'react'
import { btnPrimary } from '../lib/styles'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-ink">Something went wrong.</p>
          <p className="text-sm text-muted">Your data is safe — try reloading the app.</p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className={btnPrimary}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
