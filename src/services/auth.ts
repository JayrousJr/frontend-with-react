import { gql, api } from "./api"
import { ME } from "./queries"
import type { User, UserRole } from "@/context/auth-context"

// GraphQL: fetch authenticated user with permissions
type MeResponse = {
  me: {
    uniqueId: string
    email: string
    firstName: string
    lastName: string
    role: { name: string }
    allPermissions: { name: string }[]
    avatar: { uri: string } | null
    preferredLocale: string
  }
}
export type ErrorResponse = {
  errors: [
    {
      message: string
    },
  ]
}
export async function fetchMe(): Promise<User> {
  const data = await gql<MeResponse>(ME)
  const me = data.me

  localStorage.setItem("preferredLocale", me.preferredLocale)
  return {
    uniqueId: me.uniqueId,
    email: me.email,
    firstName: me.firstName,
    lastName: me.lastName,
    role: me.role.name.toLowerCase() as UserRole,
    permissions: me.allPermissions.map((p) => p.name),
    avatar: me.avatar
      ? `/files/download/${me.avatar.uri.replace(/^\//, "")}`
      : null,
    preferredLocale: me.preferredLocale,
  }
}

// REST auth endpoints (public, no JWT required)
type LoginResponse = {
  accessToken: string
  refreshToken: string
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  })
  return data
}

type RegisterResponse = {
  user: {
    uniqueId: string
    email: string
    firstName: string
    lastName: string
  }
  message: string
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>("/auth/register", {
    email,
    password,
    firstName,
    lastName,
  })
  return data
}

// Password flows

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email })
}

export async function resetPassword(
  token: string,
  password: string
): Promise<void> {
  await api.post("/auth/reset-password", { token, password })
}
