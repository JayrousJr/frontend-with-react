import { useEffect, useState } from "react"

export const tzs = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `TZS ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`

/** Load once (and on demand) with a loading state. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    fn()
      .then((d) => live && (setData(d), setError(null)))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n])
  return { data, error, reload: () => setN((x) => x + 1), set: setData }
}
