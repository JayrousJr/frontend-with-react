import { APP_NAME } from "@/lib/exports"

/**
 * Absolute origin used to build canonical URLs, OG tags and hreflang
 * alternates. Set VITE_SITE_URL in production — falling back to the runtime
 * origin is fine in dev but produces wrong canonicals during prerendering.
 */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "")

/** Locales this site publishes, used for hreflang alternates. */
export const SEO_LOCALES = ["en", "sw"] as const

export type SeoMeta = {
  title?: string
  description?: string
  /** Path or absolute URL; defaults to the current path. */
  canonical?: string
  /** Path or absolute URL of the social preview image. */
  image?: string
  type?: "website" | "article"
  /** Keeps the page out of search results (auth + dashboard default to true). */
  noindex?: boolean
  /** hreflang alternates: same content in other locales. */
  alternates?: { locale: string; path: string }[]
  publishedAt?: string
  modifiedAt?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/** Route `handle.seo` may be static or derived from the route's loader data. */
export type SeoHandle = SeoMeta | ((data: unknown) => SeoMeta)

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
}

export function pageTitle(title?: string): string {
  if (!title) return APP_NAME
  return title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`
}

//  JSON-LD builders — structured data Google uses for rich results.

export function organizationJsonLd(logoPath = "/logo.png") {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: SITE_URL,
    logo: absoluteUrl(logoPath),
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: SITE_URL,
  }
}

export function articleJsonLd(post: {
  title: string
  description?: string | null
  path: string
  image?: string | null
  publishedAt?: string | null
  modifiedAt?: string | null
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.description && { description: post.description }),
    url: absoluteUrl(post.path),
    mainEntityOfPage: absoluteUrl(post.path),
    ...(post.image && { image: absoluteUrl(post.image) }),
    ...(post.publishedAt && { datePublished: post.publishedAt }),
    ...(post.modifiedAt && { dateModified: post.modifiedAt }),
    publisher: organizationJsonLd(),
  }
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}
