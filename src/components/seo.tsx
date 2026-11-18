import { useEffect } from "react"
import { useLocation, useMatches } from "react-router"
import { useTranslation } from "react-i18next"
import { absoluteUrl, pageTitle, type SeoHandle, type SeoMeta } from "@/lib/seo"
import { APP_NAME } from "@/lib/exports"

/**
 * Marks every tag this component owns, so a re-render can replace the whole
 * set instead of accumulating duplicates.
 */
const OWNED = "data-seo"

function upsertMeta(key: "name" | "property", value: string, content?: string) {
  const selector = `meta[${key}="${value}"]`
  const existing = document.head.querySelector<HTMLMetaElement>(selector)
  if (!content) {
    existing?.remove()
    return
  }
  const tag = existing ?? document.createElement("meta")
  tag.setAttribute(key, value)
  tag.setAttribute("content", content)
  tag.setAttribute(OWNED, "")
  if (!existing) document.head.appendChild(tag)
}

function upsertCanonical(href: string) {
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  )
  const tag = existing ?? document.createElement("link")
  tag.setAttribute("rel", "canonical")
  tag.setAttribute("href", href)
  tag.setAttribute(OWNED, "")
  if (!existing) document.head.appendChild(tag)
}

/** Alternates and JSON-LD are sets, so they are cleared and rebuilt together. */
function replaceAll(selector: string, build: () => HTMLElement[]) {
  document.head.querySelectorAll(selector).forEach((node) => node.remove())
  for (const node of build()) document.head.appendChild(node)
}

/**
 * Applies document metadata for the current page.
 *
 * Tags are written imperatively rather than rendered as JSX: React 19 hoists
 * <title>/<meta> automatically, but lazy routes suspend and remount, which
 * leaves the previous hoisted tags behind — a production build ended up with
 * four <title> elements. Upserting by selector guarantees exactly one of each
 * in dev, in the bundle, and in the prerendered HTML.
 */
export function Seo({
  title,
  description,
  canonical,
  image = "/logo.png",
  type = "website",
  noindex,
  alternates,
  publishedAt,
  modifiedAt,
  jsonLd,
}: SeoMeta) {
  const { pathname } = useLocation()
  const { i18n } = useTranslation()

  const resolvedTitle = pageTitle(title)
  const url = absoluteUrl(canonical ?? pathname)
  const imageUrl = absoluteUrl(image)
  const structured = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []
  const serializedStructured = JSON.stringify(structured)
  const serializedAlternates = JSON.stringify(alternates ?? [])

  useEffect(() => {
    document.title = resolvedTitle

    upsertMeta("name", "description", description)
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow"
    )

    upsertMeta("property", "og:type", type)
    upsertMeta("property", "og:site_name", APP_NAME)
    upsertMeta("property", "og:title", resolvedTitle)
    upsertMeta("property", "og:description", description)
    upsertMeta("property", "og:url", url)
    upsertMeta("property", "og:image", imageUrl)
    upsertMeta("property", "og:locale", i18n.language)
    upsertMeta("property", "article:published_time", publishedAt)
    upsertMeta("property", "article:modified_time", modifiedAt)

    upsertMeta("name", "twitter:card", "summary_large_image")
    upsertMeta("name", "twitter:title", resolvedTitle)
    upsertMeta("name", "twitter:description", description)
    upsertMeta("name", "twitter:image", imageUrl)

    upsertCanonical(url)

    const parsedAlternates = JSON.parse(serializedAlternates) as {
      locale: string
      path: string
    }[]
    replaceAll('link[rel="alternate"][hreflang]', () =>
      parsedAlternates.flatMap((alt, index) => {
        const link = document.createElement("link")
        link.setAttribute("rel", "alternate")
        link.setAttribute("hreflang", alt.locale)
        link.setAttribute("href", absoluteUrl(alt.path))
        link.setAttribute(OWNED, "")
        if (index > 0) return [link]
        // The first locale doubles as the x-default target.
        const fallback = document.createElement("link")
        fallback.setAttribute("rel", "alternate")
        fallback.setAttribute("hreflang", "x-default")
        fallback.setAttribute("href", absoluteUrl(alt.path))
        fallback.setAttribute(OWNED, "")
        return [link, fallback]
      })
    )

    const parsedStructured = JSON.parse(serializedStructured) as unknown[]
    replaceAll(`script[type="application/ld+json"][${OWNED}]`, () =>
      parsedStructured.map((entry) => {
        const script = document.createElement("script")
        script.type = "application/ld+json"
        script.setAttribute(OWNED, "")
        script.textContent = JSON.stringify(entry)
        return script
      })
    )
  }, [
    resolvedTitle,
    description,
    url,
    imageUrl,
    type,
    noindex,
    publishedAt,
    modifiedAt,
    serializedAlternates,
    serializedStructured,
    i18n.language,
  ])

  return null
}

/**
 * Applies the `handle.seo` of every matched route, deepest last so a page can
 * override its layout. Rendered once per layout.
 */
export function RouteSeo() {
  const matches = useMatches()

  const meta = matches.reduce<SeoMeta>((acc, match) => {
    const handle = (match.handle as { seo?: SeoHandle } | undefined)?.seo
    if (!handle) return acc
    const resolved = typeof handle === "function" ? handle(match.data) : handle
    return { ...acc, ...resolved }
  }, {})

  return <Seo {...meta} />
}
