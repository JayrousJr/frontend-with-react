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

export function setAccessToken(token: string) {
  if (token) localStorage.setItem("accessToken", token)
  else localStorage.removeItem("accessToken")
}

export function setRefreshToken(token: string) {
  if (token) localStorage.setItem("refreshToken", token)
  else localStorage.removeItem("refreshToken")
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken")
}

// Attach auth + active locale (backend localizes errors, emails and
// notifications from the x-lang header) to every request
function withCredentialsAndLocale(
  config: import("axios").InternalAxiosRequestConfig
) {
  const accessToken = localStorage.getItem("accessToken")
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
