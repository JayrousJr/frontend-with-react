import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  MonitorIcon,
  SmartphoneIcon,
  GlobeIcon,
  Trash2Icon,
} from "lucide-react"
import {
  fetchMySessions,
  revokeSession,
  type Session,
} from "@/services/account"
import { formatRelativeTime } from "@/lib/format"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import i18n from "@/config/i18n"
function getDeviceIcon(userAgent: string) {
  const ua = userAgent?.toLowerCase()

  if (
    ua?.includes("mobile") ||
    ua?.includes("android") ||
    ua?.includes("iphone")
  ) {
    return <SmartphoneIcon className="size-5" />
  }
  if (
    ua?.includes("mozilla") ||
    ua?.includes("chrome") ||
    ua?.includes("safari")
  ) {
    return <MonitorIcon className="size-5" />
  }
  return <GlobeIcon className="size-5" />
}

function getBrowserName(userAgent: string): string {
  if (userAgent?.includes("Firefox")) return "Firefox"
  if (userAgent?.includes("Edg")) return "Edge"
  if (userAgent?.includes("Chrome")) return "Chrome"
  if (userAgent?.includes("Safari")) return "Safari"
  if (userAgent?.includes("Opera") || userAgent?.includes("OPR")) return "Opera"
  return i18n.t("session.session_unkown_browser")
}

const SessionsTab = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const { t } = useTranslation()
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMySessions()
        setSessions(data)
      } catch {
        toast.error(`${t("general_error")}`)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [t])

  async function handleRevoke(uniqueId: string) {
    setRevokingId(uniqueId)
    try {
      await revokeSession(uniqueId)
      setSessions((prev) => prev.filter((s) => s.uniqueId !== uniqueId))
      toast.success(`${t("session.revoke_session_message")}`)
    } catch {
      toast.error(`${t("general_error")}`)
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("session.active_sessions")}</CardTitle>
        <CardDescription>{t("session.session_text")}</CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            {t("session.loading_sessions")}
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("session.no_session")}
          </p>
        ) : (
          <div className="space-y-1">
            {sessions.map((session, index) => (
              <div key={session.uniqueId}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {getBrowserName(session.userAgent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.ipAddress}
                        {t("created_text", {
                          time: `${formatRelativeTime(session.createdAt)}`,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {t("expires_text", {
                        time: `${formatRelativeTime(session.expiresAt)}`,
                      })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session.uniqueId)}
                      disabled={revokingId === session.uniqueId}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SessionsTab
