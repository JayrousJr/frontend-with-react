import { gql } from "./api"
import { GET_PAGE_VIEWS, VISITOR_STATS } from "./queries"
import { TRACK_PAGE_VIEW } from "./mutations"

// Types

export type VisitorStat = {
  date: string
  path: string
  viewCount: number
  uniqueVisitorCount: number
}

export type PageView = {
  id: number
  path: string
  referrer: string | null
  userAgent: string | null
  country: string | null
  sessionId: string | null
  userId: number | null
  createdAt: string
}

type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PaginationInput = {
  page?: number
  limit?: number
}

type VisitorStatFilterInput = {
  path?: string
  from?: string
  to?: string
}

type PageViewFilterInput = {
  path?: string
  sessionId?: string
  from?: string
  to?: string
}

// Queries — both require "analytics.read"

export async function fetchVisitorStats(
  pagination?: PaginationInput,
  filter?: VisitorStatFilterInput
): Promise<PaginatedResponse<VisitorStat>> {
  const data = await gql<
    { getVisitorStats: PaginatedResponse<VisitorStat> },
    { pagination?: PaginationInput; filter?: VisitorStatFilterInput }
  >(VISITOR_STATS, { pagination, filter })
  return data.getVisitorStats
}

export async function fetchPageViews(
  pagination?: PaginationInput,
  filter?: PageViewFilterInput
): Promise<PaginatedResponse<PageView>> {
  const data = await gql<
    { getPageViews: PaginatedResponse<PageView> },
    { pagination?: PaginationInput; filter?: PageViewFilterInput }
  >(GET_PAGE_VIEWS, { pagination, filter })
  return data.getPageViews
}

// Mutation — public, used by the page-view tracker (see hooks/use-page-view-tracker.ts)

type TrackPageViewInput = {
  path: string
  sessionId: string
  referrer?: string
}

export async function trackPageView(input: TrackPageViewInput): Promise<void> {
  await gql<{ trackPageView: { id: number } }, { input: TrackPageViewInput }>(
    TRACK_PAGE_VIEW,
    { input }
  )
}
