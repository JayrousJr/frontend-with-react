/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { api, setAccessToken } from "@/services/api"
import { disconnectSocket } from "@/lib/socket"
import { fetchMe } from "@/services/auth"
import i18next from "i18next"

export type UserRole = "admin" | "user" | "manager"
/**
 * Fine-grained authorization unit, e.g. "users.delete", "products.read".
 * Backend-provided — the frontend only ever checks membership, never derives
 * permissions from role. Role stays a coarse label for nav/grouping/defaults.
 */
export type Permission = string

export type User = {
  uniqueId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  permissions: Permission[]
  avatar: string | null
  preferredLocale?: string
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

  // Single owner of locale sync: whenever the profile's preferred locale
  // changes (login, refreshUser after a profile update), apply it to i18next
  // and persist it so the next page load starts in the right language.
  React.useEffect(() => {
    if (user?.preferredLocale) {
      void i18next.changeLanguage(user.preferredLocale)
      localStorage.setItem("preferredLocale", user.preferredLocale)
    }
  }, [user?.preferredLocale])

  React.useEffect(() => {
    async function validateSession() {
      try {
        if (import.meta.env.VITE_AUTH_STRATEGY === "session") {
          await api.get("/auth/me")
          setUser(await fetchMe())
        } else {
          // The refresh token is an HttpOnly cookie the browser attaches
          // itself — there is nothing to read or send from JS. A 401 here
          // simply means no (or an expired) session.
          const { data } = await api.post<{ accessToken: string }>(
            "/auth/refresh"
          )
          setAccessToken(data.accessToken)
          setUser(await fetchMe())
        }
      } catch {
        // No valid session — user stays unauthenticated
      } finally {
        setIsLoading(false)
      }
    }

    void validateSession()
  }, [])

  const login = React.useCallback(async (accessToken: string) => {
    setAccessToken(accessToken)
    setUser(await fetchMe())
  }, [])

  const logout = React.useCallback(async () => {
    // The cookie identifies the session; the backend revokes it and clears it.
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
