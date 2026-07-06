import { useCallback, useEffect, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelativeTime } from "@/lib/format"
import { connectSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/services/notifications"

const PAGE_SIZE = 10

const typeDotColor: Record<Notification["type"], string> = {
  INFO: "bg-blue-500",
  SUCCESS: "bg-emerald-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-red-500",
}

/** Interpolation values arrive JSON-encoded from the API — see services/notifications.ts */
function parseParams(params: string | null): Record<string, string> {
  if (!params) return {}
  try {
    return JSON.parse(params) as Record<string, string>
  } catch {
    return {}
  }
}

export default function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const result = await fetchMyNotifications({ page: 1, limit: PAGE_SIZE })
      setItems(result.data)
      setUnreadCount(result.unreadCount)
    } catch {
      // Bell is non-critical chrome — stay silent on fetch failures.
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchMyNotifications({ page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return
        setItems(result.data)
        setUnreadCount(result.unreadCount)
      })
      .catch(() => {
        // Bell is non-critical chrome — stay silent on fetch failures.
      })

    // Real-time: the backend pushes new notifications over the EventsGateway
    // socket the moment they're created.
    const socket = connectSocket()
    const onNotification = (notification: Notification) => {
      setItems((prev) => [notification, ...prev].slice(0, PAGE_SIZE))
      setUnreadCount((prev) => prev + 1)
      toast(t(notification.titleKey, parseParams(notification.params)), {
        description: t(
          notification.messageKey,
          parseParams(notification.params)
        ),
      })
    }
    socket?.on("notification", onNotification)

    return () => {
      cancelled = true
      socket?.off("notification", onNotification)
    }
  }, [t])

  async function handleItemClick(notification: Notification) {
    if (!notification.readAt) {
      setItems((prev) =>
        prev.map((n) =>
          n.uniqueId === notification.uniqueId
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      markNotificationRead(notification.uniqueId).catch(() => void refresh())
    }
    if (notification.link) {
      setOpen(false)
      void navigate(notification.link)
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    )
    setUnreadCount(0)
    markAllNotificationsRead().catch(() => void refresh())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">{t("notifications.aria_label")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">{t("notifications.title")}</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-3.5" />
              {t("notifications.mark_all_read")}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("notifications.empty")}
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {items.map((notification) => (
                <li key={notification.uniqueId}>
                  <button
                    type="button"
                    onClick={() => void handleItemClick(notification)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      !notification.readAt && "bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        typeDotColor[notification.type],
                        notification.readAt && "opacity-30"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          notification.readAt
                            ? "text-muted-foreground"
                            : "font-medium"
                        )}
                      >
                        {t(
                          notification.titleKey,
                          parseParams(notification.params)
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(
                          notification.messageKey,
                          parseParams(notification.params)
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
