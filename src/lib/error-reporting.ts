/**
 * Optional error reporting, mirroring the backend's SENTRY_DSN.
 *
 * Sentry is loaded with a dynamic import so it lives in its own lazy chunk —
 * deployments that leave VITE_SENTRY_DSN unset never download a byte of it.
 * Swap the import for another provider here and the rest of the app
 * (main.tsx init, RouterErrorBoundary reports) doesn't change.
 */
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

export function initErrorReporting(): void {
  if (!dsn) return
  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
    })
  })
}

/** Report a caught error (no-op unless VITE_SENTRY_DSN is configured). */
export function reportError(error: unknown): void {
  if (!dsn) return
  void import("@sentry/react").then((Sentry) => {
    Sentry.captureException(error)
  })
}
