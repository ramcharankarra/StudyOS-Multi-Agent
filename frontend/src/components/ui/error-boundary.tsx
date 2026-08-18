import React, { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error Boundary Exception:", error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-8 rounded-3xl border border-border/80 bg-card shadow-2xl space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-600 shadow-sm">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight font-heading text-foreground">
                Something went wrong
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An unexpected application error occurred. Don't worry, your data and progress are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] font-mono text-muted-foreground text-left max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
export default ErrorBoundary
