import { useEffect, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import {
  portalCreateUser,
  portalMarkRead,
  portalNotifications,
  portalUserActive,
  portalUserResend,
  portalUserReset2fa,
  portalUsers,
} from "@/services/portal"
import { FormDialog, Loading } from "../procurement/shared"
import { useLoad } from "../procurement/shared-utils"
import { usePortal } from "./layout"

export const PortalNotificationsPage = () => {
  const { t } = useTranslation()
  const rows = useLoad(portalNotifications)
  const { reload } = usePortal()
  useEffect(() => {
    if (rows.data?.some((n) => !n.readAt)) void portalMarkRead().then(reload)
  }, [rows.data, reload])
  return (
    <>
      <h1 className="text-2xl font-semibold">
        {t("portal.notifications", "Notifications")}
      </h1>
      <Card className="py-0">
        <CardContent className="divide-y p-0">
          {!rows.data && (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          )}
          {rows.data?.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              {t("portal.no_notifications", "Nothing yet.")}
            </p>
          )}
          {rows.data?.map((n) => (
            <div key={n.uniqueId} className="space-y-1 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge code={n.type} />
                <span className="font-medium">{n.title}</span>
                {!n.readAt && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
                <span className="text-xs text-muted-foreground">
                  {formatStamp(n.createdAt)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-line">{n.body}</p>
              {n.link && (
                <Link className="text-sm underline" to={n.link}>
                  {t("portal.open", "Open")}
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

export const PortalUsersPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { me } = usePortal()
  const rows = useLoad(portalUsers)
  const [form, setForm] = useState<{
    fullName: string
    email: string
    phone: string
  } | null>(null)
  const link = (l: string | null) =>
    l &&
    toast.info(
      t(
        "vendors.dev_link",
        "Development: no mail server — activation link shown here"
      ),
      { description: l, duration: 60000 }
    )
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("portal.users", "Users")}</h1>
        <Button onClick={() => setForm({ fullName: "", email: "", phone: "" })}>
          <UserPlusIcon />
          {t("portal.add_user", "Add user")}
        </Button>
      </div>
      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0">
          {!rows.data ? (
            <div className="p-6">
              <Loading error={rows.error} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name", "Name")}</TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.map((u) => (
                  <TableRow key={u.uniqueId}>
                    <TableCell>
                      {u.fullName}{" "}
                      {u.isAdmin && (
                        <span className="text-xs">
                          ({t("vendors.admin", "admin")})
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ToneBadge code={u.status} />
                    </TableCell>
                    <TableCell>{u.twoFactorEnabled ? "✓" : "—"}</TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      {u.status === "PENDING_ACTIVATION" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(
                              async () =>
                                link(
                                  (await portalUserResend(u.uniqueId)).devLink
                                ),
                              t("vendors.link_sent", "Activation link sent")
                            )
                          }
                        >
                          {t("vendors.resend", "Resend link")}
                        </Button>
                      )}
                      {u.twoFactorEnabled && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(
                              async () => {
                                await portalUserReset2fa(u.uniqueId)
                                rows.reload()
                              },
                              t("vendors.2fa_reset", "Authenticator reset")
                            )
                          }
                        >
                          {t("vendors.reset_2fa", "Reset 2FA")}
                        </Button>
                      )}
                      {u.uniqueId !== me.user.uniqueId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(async () => {
                              await portalUserActive(
                                u.uniqueId,
                                u.status === "DEACTIVATED"
                              )
                              rows.reload()
                            })
                          }
                        >
                          {u.status === "DEACTIVATED"
                            ? t("actions.activate", "Activate")
                            : t("actions.deactivate", "Deactivate")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {form && (
        <FormDialog
          title={t("portal.add_user", "Add user")}
          description={t(
            "vendors.create_admin_hint",
            "An activation link (72 hours) is emailed to this person."
          )}
          confirmLabel={t("actions.create", "Create")}
          canConfirm={!!form.fullName.trim() && form.email.includes("@")}
          onClose={() => setForm(null)}
          onConfirm={() =>
            run(
              async () => {
                link((await portalCreateUser(form)).devLink)
                rows.reload()
              },
              t("portal.user_added", "User added")
            )
          }
        >
          <Input
            placeholder={t("common.name", "Name")}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            type="email"
            placeholder={t("auth.email", "Email")}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder={t("vendors.phone", "Phone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </FormDialog>
      )}
    </>
  )
}
