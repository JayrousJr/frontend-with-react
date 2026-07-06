import { gql, api } from "./api"
import {
  MY_PROFILE,
  MY_SESSIONS,
  MY_NEWSLETTER_SUBSCRIPTION,
  SUPPORTED_LOCALES,
} from "./queries"
import { CHANGE_PASSWORD, REVOKE_SESSION } from "./mutations"
import {
  SUBSCRIBE_TO_NEWSLETTER,
  UNSUBSCRIBE_FROM_NEWSLETTER,
  UPDATE_USER,
} from "./mutations"

// -- Types --

export type ProfileRole = {
  uniqueId: string
  name: string
  description: string
}

export type ProfilePermission = {
  uniqueId: string
  name: string
  description: string
}

export type ProfileAvatar = {
  uniqueId: string
  size: number
  uri: string
}

export type Profile = {
  uniqueId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  email: string
  firstName: string
  lastName: string
  tenantId: string | null
  preferredLocale: string
  role: ProfileRole
  permissions: ProfilePermission[]
  allPermissions: ProfilePermission[]
  avatar: ProfileAvatar | null
}

export type NewsletterSubscription = {
  uniqueId: string
  userId: number
}

export type Session = {
  uniqueId: string
  userAgent: string
  ipAddress: string
  createdAt: string
  expiresAt: string
}

// -- Queries --

type MyProfileResponse = {
  me: Profile
  myNewsletterSubscription: NewsletterSubscription | null
}

export async function fetchMyProfile(): Promise<MyProfileResponse> {
  return gql<MyProfileResponse>(MY_PROFILE)
}

type MySessionsResponse = {
  mySessions: Session[]
}

export async function fetchMySessions(): Promise<Session[]> {
  const data = await gql<MySessionsResponse>(MY_SESSIONS)
  return data.mySessions
}

export async function fetchNewsletterSubscription(): Promise<NewsletterSubscription | null> {
  const data = await gql<{
    myNewsletterSubscription: NewsletterSubscription | null
  }>(MY_NEWSLETTER_SUBSCRIPTION)
  return data.myNewsletterSubscription
}

export async function fetchSupportedLocales(): Promise<string[]> {
  const data = await gql<{ getSupportedLocales: string[] }>(SUPPORTED_LOCALES)
  return data.getSupportedLocales
}

// -- Mutations --

type UpdateProfileInput = {
  uniqueId: string
  firstName?: string
  lastName?: string
  email?: string
  preferredLocale?: string
  avatarUniqueId?: string
}
type Subscription = {
  subscribeToNewsletter: { message: string }
  unsubscribeFromNewsletter: { message: string }
}
export async function updateProfile(input: UpdateProfileInput): Promise<any> {
  return await gql(UPDATE_USER, { updateUserInput: input })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  return await gql(CHANGE_PASSWORD, { currentPassword, newPassword })
}

export async function revokeSession(uniqueId: string): Promise<void> {
  await gql(REVOKE_SESSION, { uniqueId })
}

export async function subscribeToNewsletter(): Promise<Subscription> {
  return await gql(SUBSCRIBE_TO_NEWSLETTER)
}

export async function unsubscribeFromNewsletter(): Promise<Subscription> {
  return await gql(UNSUBSCRIBE_FROM_NEWSLETTER)
}

export async function uploadAvatar(file: File): Promise<{ uniqueId: string }> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", "images/profiles")
  const { data } = await api.post<{ data: { uniqueId: string } }>(
    "/files/upload",
    formData
  )
  return data.data
}
