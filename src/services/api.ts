import axios from "axios"
import i18n from "@/config/i18n"

//  Axios instances

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true,
})

export const graphql = axios.create({
  baseURL: import.meta.env.VITE_GRAPHQL_URL as string,
  withCredentials: true,
})

//  Auth strategy (JWT token management)

const AUTH_STRATEGY = import.meta.env.VITE_AUTH_STRATEGY as string

/**
 * The access token is kept in memory only — never localStorage — so an XSS
 * cannot read it, and it dies with the tab. The refresh token is never visible
 * to JavaScript at all: the backend sets it as an HttpOnly cookie, which the
 * browser replays automatically on `POST /auth/refresh` (hence
 * `withCredentials` above). On reload, AuthProvider trades that cookie for a
 * fresh access token.
 */
let accessToken: string | null = null

export function setAccessToken(token: string) {
  accessToken = token || null
}

export function getAccessToken() {
  return accessToken
}

// Attach auth + active locale (backend localizes errors, emails and
// notifications from the x-lang header) to every request
function withCredentialsAndLocale(
  config: import("axios").InternalAxiosRequestConfig
) {
  if (AUTH_STRATEGY !== "session" && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  config.headers["x-lang"] = i18n.language
  return config
}

graphql.interceptors.request.use(withCredentialsAndLocale)
api.interceptors.request.use(withCredentialsAndLocale)

//  Access-token refresh (single flight)

/**
 * Trade the HttpOnly refresh cookie for a new access token. Concurrent
 * callers share one request. On failure the session is over: listeners
 * (AuthProvider) are told via the `auth:expired` event.
 */
let refreshing: Promise<boolean> | null = null

export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= axios
    .post<{ accessToken: string }>(
      `${import.meta.env.VITE_API_URL as string}/auth/refresh`,
      undefined,
      { withCredentials: true, headers: { "x-lang": i18n.language } }
    )
    .then(({ data }) => {
      setAccessToken(data.accessToken)
      return true
    })
    .catch(() => {
      setAccessToken("")
      window.dispatchEvent(new Event("auth:expired"))
      return false
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

const NO_RETRY = ["/auth/login", "/auth/refresh", "/auth/logout"]

//  Error interceptor: retry once after a refresh, surface backend messages

api.interceptors.response.use(undefined, async (error) => {
  if (axios.isAxiosError(error)) {
    const config = error.config as
      | (import("axios").InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined
    const url = config?.url ?? ""
    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !NO_RETRY.some((p) => url.includes(p))
    ) {
      config._retried = true
      if (await refreshAccessToken()) return api(config)
    }
    if (error.response?.data?.message) {
      return Promise.reject(new Error(error.response.data.message))
    }
  }
  return Promise.reject(error)
})

//  GraphQL gateway

type GQLError = {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
  extensions?: { code?: string; status?: number }
}

type GQLResponse<TData> = {
  data?: TData
  errors?: GQLError[]
}

/**
 * Thrown when the server returns a 200 with a GraphQL errors array.
 * Distinct from a network/HTTP failure.
 */
export class GraphQLRequestError extends Error {
  readonly errors: GQLError[]

  constructor(errors: GQLError[]) {
    super(errors.map((e) => e.message).join("\n"))
    this.name = "GraphQLRequestError"
    this.errors = errors
  }
}

export async function gql<TData, TVariables = Record<string, unknown>>(
  document: string,
  variables?: TVariables
): Promise<TData> {
  const send = () =>
    graphql.post<GQLResponse<TData>>("", { query: document, variables })

  let { data: json } = await send()

  // An expired (or not yet restored) access token surfaces as
  // UNAUTHENTICATED: refresh once from the cookie, then retry. Route loaders
  // can run before AuthProvider restores the session on a deep link; the
  // shared single-flight refresh keeps them from racing each other.
  const unauthenticated = (r: GQLResponse<TData>) =>
    r.errors?.some((e) => e.extensions?.code === "UNAUTHENTICATED")
  if (unauthenticated(json) && (await refreshAccessToken())) {
    ;({ data: json } = await send())
  }

  if (json.errors?.length) {
    throw new GraphQLRequestError(json.errors)
  }

  return json.data as TData
}

/** Message of the first error, for toasts. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof GraphQLRequestError) return error.errors[0]?.message
  if (error instanceof Error) return error.message
  return fallback
}
