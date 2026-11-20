import { gql, api } from "./api"
import type { Grant, User } from "@/context/auth-context"

const ME = /* GraphQL */ `
  query Me {
    me {
      uniqueId
      email
      preferredLocale
      employee {
        uniqueId
        employeeNumber
        fullName
      }
      department {
        uniqueId
        code
        name
      }
      jobTitle
      roles {
        roleUniqueId
        roleName
        contextName
      }
      permissions
      grants {
        permission
        scope
        contextType
        contextId
        delegated
      }
    }
  }
`

type MeResponse = {
  me: {
    uniqueId: string
    email: string
    preferredLocale: string
    employee: { uniqueId: string; employeeNumber: string; fullName: string }
    department: { uniqueId: string; code: string; name: string }
    jobTitle: string
    roles: {
      roleUniqueId: string
      roleName: string
      contextName: string | null
    }[]
    permissions: string[]
    grants: Grant[]
  }
}

export async function fetchMe(): Promise<User> {
  const { me } = await gql<MeResponse>(ME)
  localStorage.setItem("preferredLocale", me.preferredLocale)
  return {
    uniqueId: me.uniqueId,
    email: me.email,
    fullName: me.employee.fullName,
    employeeUniqueId: me.employee.uniqueId,
    employeeNumber: me.employee.employeeNumber,
    department: me.department,
    jobTitle: me.jobTitle,
    roles: me.roles,
    permissions: me.permissions,
    grants: me.grants,
    preferredLocale: me.preferredLocale,
  }
}

const UPDATE_PREFERENCES = /* GraphQL */ `
  mutation UpdateMyPreferences($input: UpdateMyPreferencesInput!) {
    updateMyPreferences(input: $input) {
      preferredLocale
    }
  }
`

export async function updateMyLocale(preferredLocale: string): Promise<void> {
  await gql(UPDATE_PREFERENCES, { input: { preferredLocale } })
}

// ── REST auth endpoints ────────────────────────────────────────────────────

/** With 2FA the password step answers with a challenge instead of a token. */
export type TwoFactorChallenge = {
  challengeToken: string
  setupRequired: boolean
}

export type LoginResponse =
  | { accessToken: string; twoFactor?: undefined }
  | { twoFactor: TwoFactorChallenge; accessToken?: undefined }

/** The refresh token is not in the body — it arrives as an HttpOnly cookie. */
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

// ── two-factor ─────────────────────────────────────────────────────────────

export type TwoFactorSetup = { secret: string; otpauthUri: string }

export async function verifyTwoFactor(
  challengeToken: string,
  code: string
): Promise<{ accessToken: string }> {
  const { data } = await api.post("/auth/2fa/verify", { challengeToken, code })
  return data
}

export async function sendTwoFactorEmail(challengeToken: string) {
  await api.post("/auth/2fa/email-code", { challengeToken })
}

export async function challengeSetup(
  challengeToken: string
): Promise<TwoFactorSetup> {
  const { data } = await api.post("/auth/2fa/challenge-setup", {
    challengeToken,
  })
  return data
}

export async function challengeEnable(
  challengeToken: string,
  code: string
): Promise<{ accessToken: string }> {
  const { data } = await api.post("/auth/2fa/challenge-enable", {
    challengeToken,
    code,
  })
  return data
}

export async function fetchTwoFactorStatus(): Promise<{
  enabled: boolean
  required: boolean
}> {
  const { data } = await api.get("/auth/2fa")
  return data
}

export async function beginTwoFactorSetup(): Promise<TwoFactorSetup> {
  const { data } = await api.post("/auth/2fa/setup")
  return data
}

export async function enableTwoFactor(code: string): Promise<void> {
  await api.post("/auth/2fa/enable", { code })
}

export async function disableTwoFactor(
  password: string,
  code: string
): Promise<void> {
  await api.post("/auth/2fa/disable", { password, code })
}

export async function resetUserTwoFactor(userUniqueId: string) {
  await gql(`mutation($u: String!) { resetTwoFactor(userUniqueId: $u) }`, {
    u: userUniqueId,
  })
}

/** Activation link: the user sets their first password. */
export async function activateAccount(
  token: string,
  password: string
): Promise<void> {
  await api.post("/auth/activate", { token, password })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email })
}

export async function resetPassword(
  token: string,
  password: string
): Promise<void> {
  await api.post("/auth/reset-password", { token, password })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword })
}

export type SessionInfo = {
  uniqueId: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  expiresAt: string
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const { data } = await api.get<SessionInfo[]>("/auth/sessions")
  return data
}

export async function revokeSession(uniqueId: string): Promise<void> {
  await api.delete(`/auth/sessions/${uniqueId}`)
}

export async function logoutAll(): Promise<void> {
  await api.post("/auth/logout-all")
}
