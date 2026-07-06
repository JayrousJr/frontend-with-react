/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_URL: string
  readonly VITE_AUTH_STRATEGY: "jwt" | "session"
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
