/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import {
  api,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
} from "@/services/api"
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
  login: (accessToken: string, refreshToken: string) => Promise<void>
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
          const stored = getRefreshToken()
          if (!stored) return
          const { data } = await api.post<{
            accessToken: string
            refreshToken: string
          }>("/auth/refresh", { refreshToken: stored })
          setAccessToken(data.accessToken)
          setRefreshToken(data.refreshToken)
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

  const login = React.useCallback(
    async (accessToken: string, refreshToken: string) => {
      setAccessToken(accessToken)
      setRefreshToken(refreshToken)
      setUser(await fetchMe())
    },
    []
  )

  const logout = React.useCallback(async () => {
    const stored = getRefreshToken()
    if (stored) await api.post("/auth/logout", { refreshToken: stored })
    setAccessToken("")
    setRefreshToken("")
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
