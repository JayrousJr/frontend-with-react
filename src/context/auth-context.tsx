/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { api, refreshAccessToken, setAccessToken } from "@/services/api"
import { disconnectSocket } from "@/lib/socket"
import { fetchMe } from "@/services/auth"
import i18next from "i18next"

/**
 * A permission code from the backend catalogue, e.g. "employee.manage".
 * The frontend only ever checks membership; scopes are enforced by the
 * backend on every record. There are no role-name checks anywhere.
 */
export type Permission = string

export type Scope =
  | "ALL"
  | "OWN_DEPARTMENT"
  | "OWN_RECORDS"
  | "ASSIGNED"
  | "ASSIGNED_STORE"
  | "ASSIGNED_PRODUCTION"
  | "OWN_VENDOR"

export type Grant = {
  permission: Permission
  scope: Scope
  contextType: "STORE" | "DEPARTMENT" | null
  contextId: number | null
  delegated: boolean
}

export type User = {
  uniqueId: string
  email: string
  fullName: string
  employeeUniqueId: string
  employeeNumber: string
  department: { uniqueId: string; code: string; name: string }
  jobTitle: string
  roles: {
    roleUniqueId: string
    roleName: string
    contextName: string | null
  }[]
  /** Distinct permission codes held with any scope. */
  permissions: Permission[]
  grants: Grant[]
  preferredLocale: string
}

type AuthContextValue = {
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
  login: (accessToken: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [user, setUser] = React.useState<User | null>(null)

  // Single owner of locale sync: apply the profile's preferred locale.
  React.useEffect(() => {
    if (user?.preferredLocale) {
      void i18next.changeLanguage(user.preferredLocale)
      localStorage.setItem("preferredLocale", user.preferredLocale)
    }
  }, [user?.preferredLocale])

  React.useEffect(() => {
    async function validateSession() {
      // The vendor portal has its own session; never touch the staff one there.
      if (window.location.pathname.startsWith("/portal")) {
        setIsLoading(false)
        return
      }
      try {
        // The refresh token is an HttpOnly cookie. Shares one in-flight
        // request with any route loader doing the same on a deep link —
        // two parallel refreshes would revoke each other (token rotation).
        if (await refreshAccessToken()) setUser(await fetchMe())
      } catch {
        // No valid session — user stays unauthenticated
      } finally {
        setIsLoading(false)
      }
    }
    void validateSession()
  }, [])

  // The API layer signals a session that can no longer be refreshed.
  React.useEffect(() => {
    const onExpired = () => {
      setAccessToken("")
      disconnectSocket()
      setUser(null)
    }
    window.addEventListener("auth:expired", onExpired)
    return () => window.removeEventListener("auth:expired", onExpired)
  }, [])

  const login = React.useCallback(async (accessToken: string) => {
    setAccessToken(accessToken)
    setUser(await fetchMe())
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await api.post("/auth/logout")
    } catch {
      // Logout is best-effort — always drop local state below.
    }
    setAccessToken("")
    disconnectSocket()
    setUser(null)
  }, [])

  const refreshUser = React.useCallback(async () => {
    setUser(await fetchMe())
  }, [])

  const value = React.useMemo(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      user,
      login,
      logout,
      refreshUser,
    }),
    [isLoading, user, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
