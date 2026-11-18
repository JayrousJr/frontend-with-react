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

const AUTH_STRATEGY = import.meta.env.VITE_AUTH_STRATEGY

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

//  Error interceptor: surface backend error messages

api.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return Promise.reject(new Error(error.response.data.message))
  }
  return Promise.reject(error)
})

//  GraphQL gateway

type GQLError = {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
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
  const { data: json } = await graphql.post<GQLResponse<TData>>("", {
    query: document,
    variables,
  })

  if (json.errors?.length) {
    throw new GraphQLRequestError(json.errors)
  }

  return json.data as TData
}
