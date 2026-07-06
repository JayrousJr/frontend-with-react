import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import enTranslation from "@/config/locales/en/translation.json"
import swTranslation from "@/config/locales/sw/translation.json"

// The real i18n config touches localStorage (unavailable in the node test
// environment), so stub `t` to echo the resolved key and count — the logic
// under test is which key formatRelativeTime picks, not the translation text.
vi.mock("@/config/i18n", () => ({
  default: {
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
  },
}))

import { formatRelativeTime } from "./format"

const NOW = new Date("2026-07-05T12:00:00Z")

function minutes(n: number) {
  return new Date(NOW.getTime() + n * 60_000)
}
function hours(n: number) {
  return minutes(n * 60)
}
function days(n: number) {
  return hours(n * 24)
}

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("handles null/undefined and invalid input", () => {
    expect(formatRelativeTime(null)).toBe("N/A")
    expect(formatRelativeTime(undefined)).toBe("N/A")
    expect(formatRelativeTime("not-a-date")).toBe("Invalid Date")
  })

  it("accepts both Date objects and ISO strings", () => {
    expect(formatRelativeTime(minutes(-5))).toBe("time.minute:5")
    expect(formatRelativeTime(minutes(-5).toISOString())).toBe("time.minute:5")
  })

  it("formats past dates", () => {
    expect(formatRelativeTime(minutes(-0.5))).toBe("time.justNow")
    expect(formatRelativeTime(minutes(-30))).toBe("time.minute:30")
    expect(formatRelativeTime(hours(-3))).toBe("time.hour:3")
    expect(formatRelativeTime(days(-2))).toBe("time.day:2")
  })

  it("formats future dates (e.g. session expiry) instead of collapsing to justNow", () => {
    // Regression: `now - date` is negative for future dates, and a plain
    // `diffInSeconds < 60` check is true for every negative diff, so an
    // expiry a week out rendered as "Just now".
    expect(formatRelativeTime(minutes(0.5))).toBe("time.soon")
    expect(formatRelativeTime(minutes(30))).toBe("time.in_minute:30")
    expect(formatRelativeTime(hours(3))).toBe("time.in_hour:3")
    expect(formatRelativeTime(days(7))).toBe("time.in_day:7")
    expect(formatRelativeTime(days(60))).toBe("time.in_month:2")
    expect(formatRelativeTime(days(730))).toBe("time.in_year:2")
  })

  it("uses month/year keys for long spans, not the day key", () => {
    // Regression: the month and year branches both called t("time.day").
    expect(formatRelativeTime(days(-45))).toBe("time.month:1")
    expect(formatRelativeTime(days(-400))).toBe("time.year:1")
  })
})

describe("time translation keys", () => {
  // formatRelativeTime resolves keys dynamically (`time.in_${unit}` plus
  // i18next `_one`/`_other` plural suffixes), so a missing key fails silently
  // at runtime — assert the full matrix exists in every locale instead.
  const units = ["minute", "hour", "day", "month", "year"]
  const expectedKeys = [
    "justNow",
    "soon",
    ...units.flatMap((u) => [
      `${u}_one`,
      `${u}_other`,
      `in_${u}_one`,
      `in_${u}_other`,
    ]),
  ]

  it.each([
    ["en", enTranslation],
    ["sw", swTranslation],
  ])("%s locale has every relative-time key", (_locale, translation) => {
    const time = (translation as { time: Record<string, string> }).time
    for (const key of expectedKeys) {
      expect(time, `missing time.${key}`).toHaveProperty(key)
    }
  })
})
