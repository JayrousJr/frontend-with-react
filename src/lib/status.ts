/** "PENDING_ACTIVATION" → "Pending activation" (fallback when untranslated). */
export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}
