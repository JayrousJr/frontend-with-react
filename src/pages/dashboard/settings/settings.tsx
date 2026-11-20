import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { LogOutIcon, MonitorSmartphoneIcon } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { TextField } from "@/components/form/text-field"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import LanguageSwitcher from "@/components/languageSwitcher"
import { useAuth } from "@/context/auth-context"
import { setRootError } from "@/lib/form"
import { formatStamp } from "@/lib/format"
import { createNewPasswordSchema } from "@/lib/validations/auth"
import {
  changePassword,
  fetchSessions,
  logoutAll,
  revokeSession,
  type SessionInfo,
} from "@/services/auth"
import { fetchMyLoginEvents, type LoginEvent } from "@/services/users"
import { scopeLabel } from "@/pages/admin/scope-label"
import { TwoFactorCard } from "./two-factor-card"

const TABS = ["profile", "password", "sessions", "access"] as const
type Tab = (typeof TABS)[number]

const SettingsPage = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab") as Tab
  const activeTab: Tab = TABS.includes(tabParam) ? tabParam : "profile"

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title", "My account")}
        description={t(
          "settings.subtitle",
          "Your profile, password, sessions and access."
        )}
      />
      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="line">
          <TabsTrigger value="profile">
            {t("settings.profile", "Profile")}
          </TabsTrigger>
          <TabsTrigger value="password">
            {t("settings.password", "Password & 2FA")}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {t("settings.sessions", "Sessions & activity")}
          </TabsTrigger>
          <TabsTrigger value="access">
            {t("settings.access", "My access")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="password" className="space-y-4">
          <PasswordTab />
          <TwoFactorCard />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="access">
          <AccessTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!user) return null
  const rows: [string, string][] = [
    [t("employees.name", "Name"), user.fullName],
    [t("employees.number", "Employee no."), user.employeeNumber],
    [t("employees.company_email", "Company email"), user.email],
    [t("employees.department", "Department"), user.department.name],
    [t("employees.job_title", "Job title"), user.jobTitle],
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile", "Profile")}</CardTitle>
        <CardDescription>
          {t(
            "settings.profile_hint",
            "Your details come from your employee record, maintained by HR. Ask HR to correct anything wrong."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-3 border-t pt-4">
          <span className="text-sm text-muted-foreground">
            {t("settings.language", "Language")}
          </span>
          <LanguageSwitcher />
        </div>
      </CardContent>
    </Card>
  )
}

function PasswordTab() {
  const { t } = useTranslation()
  const schema = useMemo(
    () =>
      createNewPasswordSchema(t).and(
        z.object({
          currentPassword: z.string().min(1, t("validation.required")),
        })
      ),
    [t]
  )
  type Values = z.infer<typeof schema>
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(v: Values) {
    try {
      await changePassword(v.currentPassword, v.password)
      form.reset()
      toast.success(
        t(
          "settings.password_changed",
          "Password changed. Your other sessions were signed out."
        )
      )
    } catch (err) {
      setRootError(form.setError, err, t("general_error"))
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>
          {t("settings.change_password", "Change password")}
        </CardTitle>
        <CardDescription>
          {t(
            "auth.password_rules",
            "At least 10 characters with letters and numbers. Not a common password, not your name or email, and not one of your last 5 passwords."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              control={form.control}
              name="currentPassword"
              label={t("settings.current_password", "Current password")}
              type="password"
              autoComplete="current-password"
            />
            <TextField
              control={form.control}
              name="password"
              label={t("auth.new_password", "New password")}
              type="password"
              autoComplete="new-password"
            />
            <TextField
              control={form.control}
              name="confirmPassword"
              label={t("auth.confirm_password", "Confirm password")}
              type="password"
              autoComplete="new-password"
            />
            <FieldError errors={[form.formState.errors.root]} />
            <Field orientation="horizontal">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("settings.change_password", "Change password")}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function SessionsTab() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const run = useRun()
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)
  const [events, setEvents] = useState<LoginEvent[]>([])

  const load = () => {
    void fetchSessions().then(setSessions)
    void fetchMyLoginEvents().then(setEvents)
  }
  useEffect(load, [])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("settings.active_sessions", "Active sessions")}
          </CardTitle>
          <CardDescription>
            {t(
              "settings.sessions_hint",
              "Sessions end after 30 minutes of inactivity and 12 hours at most."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions?.map((s) => (
            <div
              key={s.uniqueId}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <MonitorSmartphoneIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate">{s.userAgent ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {s.ipAddress ?? "—"} · {t("settings.since", "since")}{" "}
                  {formatStamp(s.createdAt)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  run(() => revokeSession(s.uniqueId)).then((ok) => {
                    if (ok) void load()
                  })
                }
              >
                {t("settings.end_session", "End")}
              </Button>
            </div>
          ))}
          {sessions && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">—</p>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              if (await run(logoutAll)) await logout()
            }}
          >
            <LogOutIcon />
            {t("settings.logout_all", "Sign out everywhere")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("settings.login_activity", "Recent login activity")}
          </CardTitle>
          <FieldDescription>
            {t(
              "settings.login_activity_hint",
              "If you see activity you don't recognise, change your password and tell ICT."
            )}
          </FieldDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.when", "When")}</TableHead>
                <TableHead>{t("audit.event", "Event")}</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    {formatStamp(e.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.success ? "secondary" : "destructive"}>
                      {e.type.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.ipAddress ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function AccessTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!user) return null
  const grants = [...user.grants].sort((a, b) =>
    a.permission.localeCompare(b.permission)
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.access", "My access")}</CardTitle>
        <CardDescription>
          {t(
            "settings.access_hint",
            "Everything you can do comes from these permissions, through your roles, your groups and any delegation to you."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {user.roles.map((r) => (
            <Badge key={`${r.roleName}-${r.contextName}`} variant="secondary">
              {r.roleName}
              {r.contextName ? ` · ${r.contextName}` : ""}
            </Badge>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("roles.permission", "Permission")}</TableHead>
              <TableHead>{t("roles.scope", "Scope")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grants.map((g, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">
                  {g.permission}
                </TableCell>
                <TableCell>{scopeLabel(t, g.scope)}</TableCell>
                <TableCell className="text-right">
                  {g.delegated && (
                    <Badge variant="outline">
                      {t("settings.delegated", "Delegated")}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default SettingsPage
