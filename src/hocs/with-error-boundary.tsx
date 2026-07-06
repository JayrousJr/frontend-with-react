import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react"

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

type FallbackProps = {
  error: Error
  reset: () => void
}

class ErrorBoundary extends Component<
  { children: ReactNode; Fallback: ComponentType<FallbackProps> },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <this.props.Fallback error={this.state.error} reset={this.reset} />
    }
    return this.props.children
  }
}

/**
 * Wraps a component in an error boundary. Catches render-time errors and
 * shows a fallback UI instead of crashing the whole page.
 *
 * The Fallback component receives the error and a reset() function to
 * retry rendering the original component.
 *
 * @example
 * const SafeChart = withErrorBoundary(ChartErrorFallback)(Chart)
 */
export function withErrorBoundary<TProps extends object>(
  Fallback: ComponentType<FallbackProps>
) {
  return function (Component: ComponentType<TProps>) {
    const WithErrorBoundary = (props: TProps) => (
      <ErrorBoundary Fallback={Fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )

    WithErrorBoundary.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`

    return WithErrorBoundary
  }
}
