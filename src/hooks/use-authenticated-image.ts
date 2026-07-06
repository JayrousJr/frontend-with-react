import { useEffect, useState } from "react"
import { api } from "@/services/api"

export function useAuthenticatedImage(url: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ url: string; src: string } | null>(
    null
  )

  useEffect(() => {
    if (!url) return

    let objectUrl: string | undefined
    const controller = new AbortController()

    api
      .get(url, { responseType: "blob", signal: controller.signal })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data)
        setLoaded({ url, src: objectUrl })
      })
      .catch(() => {
        // Image stays on fallback (initials) when the fetch fails
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  // Derive instead of clearing state in the effect: a src from a previous
  // (now revoked) url is ignored rather than rendered as a broken image.
  return loaded && loaded.url === url ? loaded.src : undefined
}
