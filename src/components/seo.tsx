import { useLocation, useMatches } from "react-router"
import { useTranslation } from "react-i18next"
import { absoluteUrl, pageTitle, type SeoHandle, type SeoMeta } from "@/lib/seo"
import { APP_NAME } from "@/lib/exports"

/**
 * Renders document metadata. React 19 hoists <title>, <meta> and <link> to
 * <head> automatically, so no helmet library is needed — but note this all
 * happens client-side: crawlers that don't execute JS (every social preview
 * bot) only see it on prerendered routes. See `scripts/prerender.mjs`.
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

  const url = absoluteUrl(canonical ?? pathname)
  const imageUrl = absoluteUrl(image)
  const structured = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <>
      <title>{pageTitle(title)}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {alternates?.map((alt) => (
        <link
          key={alt.locale}
          rel="alternate"
          hrefLang={alt.locale}
          href={absoluteUrl(alt.path)}
        />
      ))}
      {alternates && alternates.length > 0 && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={absoluteUrl(alternates[0].path)}
        />
      )}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:title" content={pageTitle(title)} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content={i18n.language} />
      {publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}
      {modifiedAt && (
        <meta property="article:modified_time" content={modifiedAt} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle(title)} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />

      {structured.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          // Built from our own data, never user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
    </>
  )
}

/**
 * Applies the `handle.seo` of every matched route, deepest last so a page can
 * override its layout. Rendered once per layout — pages only need <Seo> when
 * their metadata depends on state rather than loader data.
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
