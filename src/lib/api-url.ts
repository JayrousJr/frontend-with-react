export const API_URL: string = import.meta.env.VITE_API_URL as string

export const API_ORIGIN: string = API_URL.replace(/\/api\/?$/, "")
