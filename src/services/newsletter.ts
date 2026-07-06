import { gql } from "./api"
import { GET_NEWSLETTER_SUBSCRIBERS } from "./queries"

// Types

export type NewsletterSubscriber = {
  uniqueId: string
  isActive: boolean
  createdAt: string
  email: string
  firstName: string
  lastName: string
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

type NewsletterSubscriberFilterInput = {
  isActive?: boolean
  email?: string
}

// Queries — requires "newsletter.read"

export async function fetchNewsletterSubscribers(
  pagination?: PaginationInput,
  filter?: NewsletterSubscriberFilterInput
): Promise<PaginatedResponse<NewsletterSubscriber>> {
  const data = await gql<
    { getNewsletterSubscribers: PaginatedResponse<NewsletterSubscriber> },
    {
      pagination?: PaginationInput
      filter?: NewsletterSubscriberFilterInput
    }
  >(GET_NEWSLETTER_SUBSCRIBERS, { pagination, filter })
  return data.getNewsletterSubscribers
}
