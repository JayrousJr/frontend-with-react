import { useEffect, useRef } from "react"
import type { routes } from "@/routes/routes"
import { trackPageView } from "@/services/analytics"

const SESSION_STORAGE_KEY = "visitorSessionId"

/**
 * Stable per-browser id for anonymous visitor de-duplication (distinct from
 * the auth session) — persisted in localStorage so repeat visits in the same
 * browser count as one "unique visitor" rather than a new one every load.
 */
function getVisitorSessionId(): string {
  let id = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

/**
 * Fires `trackPageView` once per settled navigation. Subscribes directly to
 * the router instance rather than using `useLocation()` so it works from a
 * single place outside the route tree (data routers fire `subscribe` on every
 * state change — loading, submitting, idle — so this dedupes by pathname and
 * only tracks once a navigation has actually settled).
 */
export function usePageViewTracker(router: typeof routes) {
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = router.subscribe((state) => {
      if (state.navigation.state !== "idle") return

      const path = state.location.pathname
      if (path === lastTracked.current) return
      lastTracked.current = path

      void trackPageView({
        path,
        sessionId: getVisitorSessionId(),
        referrer: document.referrer || undefined,
      }).catch(() => {
        // Analytics is best-effort — never surface this to the user.
      })
    })

    return unsubscribe
  }, [router])
}
