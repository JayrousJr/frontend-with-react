import { io, type Socket } from "socket.io-client"
import { API_URL } from "./api-url"

/**
 * Singleton socket.io connection to the backend EventsGateway (`/ws`
 * namespace). The gateway authenticates the handshake with a JWT access
 * token, so under the "session" auth strategy (no token in localStorage)
 * there is nothing to connect with and this returns null.
 */
let socket: Socket | null = null

export function connectSocket(): Socket | null {
  const token = localStorage.getItem("accessToken")
  if (!token) return null

  if (socket) return socket

  const origin = new URL(API_URL).origin
  socket = io(`${origin}/ws`, {
    auth: { token },
    transports: ["websocket"],
  })
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
