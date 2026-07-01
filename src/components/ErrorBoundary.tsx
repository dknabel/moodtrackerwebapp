import { Component, type ReactNode } from 'react'

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
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center dark:bg-gray-900">
          <p className="text-gray-700 dark:text-gray-300">Something went wrong.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your data is safe — try reloading the app.</p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
