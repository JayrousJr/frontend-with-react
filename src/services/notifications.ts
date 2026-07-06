import { gql } from "./api"
import { GET_MY_NOTIFICATIONS } from "./queries"
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
} from "./mutations"

// Types

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR"

/**
 * titleKey/messageKey are frontend i18n keys (with `params` as JSON-encoded
 * interpolation values) — render with t(titleKey, JSON.parse(params)).
 */
export type Notification = {
  uniqueId: string
  type: NotificationType
  titleKey: string
  messageKey: string
  params: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

type PaginatedNotifications = {
  data: Notification[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  unreadCount: number
}

type PaginationInput = {
  page?: number
  limit?: number
}

type NotificationFilterInput = {
  unreadOnly?: boolean
}

// Queries

export async function fetchMyNotifications(
  pagination?: PaginationInput,
  filter?: NotificationFilterInput
): Promise<PaginatedNotifications> {
  const data = await gql<
    { getMyNotifications: PaginatedNotifications },
    { pagination?: PaginationInput; filter?: NotificationFilterInput }
  >(GET_MY_NOTIFICATIONS, { pagination, filter })
  return data.getMyNotifications
}

// Mutations

export async function markNotificationRead(uniqueId: string): Promise<void> {
  await gql<
    { markNotificationRead: { data: { uniqueId: string } } },
    { uniqueId: string }
  >(MARK_NOTIFICATION_READ, { uniqueId })
}

export async function markAllNotificationsRead(): Promise<void> {
  await gql<{ markAllNotificationsRead: { message: string } }, void>(
    MARK_ALL_NOTIFICATIONS_READ
  )
}
