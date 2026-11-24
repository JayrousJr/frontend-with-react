import { createContext, useContext, useEffect, useState } from "react"
import { NavLink, Navigate, Outlet, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { formatDay } from "@/lib/format"
import {
  getPortalToken,
  portalLogout,
  portalMe,
  portalRefresh,
  setPortalToken,
  type PortalMe,
} from "@/services/portal"

const Ctx = createContext<{ me: PortalMe; reload: () => void } | null>(null)
// eslint-disable-next-line react-refresh/only-export-components
export const usePortal = () => useContext(Ctx)!

/** Vendor portal frame: own session, own navigation (no staff menus). */
const PortalLayout = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [me, setMe] = useState<PortalMe | null>(null)
  const [n, setN] = useState(0)
  const token = getPortalToken()
  useEffect(() => {
    if (!token) return
    void portalMe()
      .then(setMe)
      .catch(() => navigate("/portal/login", { replace: true }))
  }, [token, n, navigate])
  useEffect(() => {
    const out = () => navigate("/portal/login", { replace: true })
    window.addEventListener("portal:expired", out)
    // Sliding session: refresh every 10 minutes while the portal is open.
    const id = setInterval(
      () =>
        void portalRefresh()
          .then((r) => setPortalToken(r.accessToken))
          .catch(() => undefined),
      10 * 60_000
    )
    return () => {
      window.removeEventListener("portal:expired", out)
      clearInterval(id)
    }
  }, [navigate])
  if (!token) return <Navigate to="/portal/login" replace />
  if (!me)
    return (
      <div className="p-10">
        <Spinner />
      </div>
    )
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm",
      isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
    )
  return (
    <Ctx.Provider value={{ me, reload: () => setN((x) => x + 1) }}>
      <div className="min-h-svh bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <div className="mr-auto">
              <div className="font-semibold">
                AzamTV · {t("portal.title", "Vendor portal")}
              </div>
              <div className="text-xs text-muted-foreground">
                {me.vendor.name} ({me.vendor.number}) · {me.user.fullName} ·{" "}
                {t("portal.valid", "registration valid until")}{" "}
                {formatDay(me.vendor.validUntil)}
              </div>
            </div>
            <nav className="flex flex-wrap gap-1">
              <NavLink end to="/portal" className={link}>
                {t("portal.tenders", "Tenders")}
              </NavLink>
              <NavLink to="/portal/orders" className={link}>
                {t("portal.orders", "LPOs")}
              </NavLink>
              <NavLink to="/portal/notifications" className={link}>
                {t("portal.notifications", "Notifications")}{" "}
                {me.unread > 0 && (
                  <Badge variant="destructive">{me.unread}</Badge>
                )}
              </NavLink>
              {me.user.isAdmin && (
                <NavLink to="/portal/users" className={link}>
                  {t("portal.users", "Users")}
                </NavLink>
              )}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("auth.logout", "Sign out")}
              onClick={async () => {
                await portalLogout().catch(() => undefined)
                setPortalToken(null)
                navigate("/portal/login", { replace: true })
              }}
            >
              <LogOutIcon />
            </Button>
          </div>
        </header>
        {!me.vendor.canBid && (
          <div className="bg-amber-500/10 px-4 py-2 text-center text-sm">
            {t(
              "portal.cannot_bid",
              "Your registration is expired or suspended: you can view tenders and LPOs but cannot bid. Contact AzamTV Procurement."
            )}
          </div>
        )}
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </Ctx.Provider>
  )
}

export default PortalLayout
