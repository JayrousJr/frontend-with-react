import { useEffect } from "react"
import ForbiddenPage from "@/pages/errors/forbidden"
import NotFoundPage from "@/pages/errors/not-found"
import { reportError } from "@/lib/error-reporting"
import { isRouteErrorResponse, useRouteError } from "react-router"

function ChunkLoadError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Update available</h1>
      <p className="text-muted-foreground">
        A new version of this app is available. Please reload.
      </p>
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Reload page
      </button>
    </div>
  )
}

function GenericError({ status }: { status?: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">
        {status ?? "Something went wrong"}
      </h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <a
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Go home
      </a>
    </div>
  )
}

const RouterErrorBoundary = () => {
  const error = useRouteError()

  const isChunkLoadError =
    error instanceof Error &&
    (error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed") ||
      error.message.includes("Loading chunk"))

  // Report genuine crashes only — 404/403 and stale-chunk reloads after a
  // deploy are expected traffic, not bugs.
  const isExpected = isChunkLoadError || isRouteErrorResponse(error)
  useEffect(() => {
    if (!isExpected) reportError(error)
  }, [error, isExpected])

  // Chunk load failure — new deploy invalidated old JS chunks
  if (isChunkLoadError) {
    return <ChunkLoadError />
  }

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFoundPage />
    if (error.status === 403) return <ForbiddenPage />
    return <GenericError status={error.status} />
  }

  return <GenericError />
}

export default RouterErrorBoundary
