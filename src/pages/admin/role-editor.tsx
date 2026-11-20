import { useMemo, useState } from "react"
import { useLoaderData, useNavigate, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { ArchiveIcon, ArchiveRestoreIcon, SaveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/app/page-header"
import { ActiveBadge } from "@/components/app/status-badge"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { useRun } from "@/components/app/use-run"
import { useAuth, type Scope } from "@/context/auth-context"
import { P, groupByModule, hasPermission } from "@/lib/permissions"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  createRole,
  setRoleActive,
  updateRole,
  type PermissionDef,
  type Role,
} from "@/services/access"
import { scopeHint, scopeLabel } from "./scope-label"

const MODULE_NAMES: Record<string, string> = {
  A1: "A1 · Users & employees",
  SHARED: "Shared services",
  B1: "B1 · Tender & procurement",
  B2: "B2 · Store & inventory",
  B3: "B3 · Handover & custody",
}

/** Narrowest first: a newly ticked permission starts with the least access. */
const NARROW_TO_BROAD: Scope[] = [
  "OWN_RECORDS",
  "ASSIGNED",
  "ASSIGNED_PRODUCTION",
  "ASSIGNED_STORE",
  "OWN_DEPARTMENT",
  "ALL",
  "OWN_VENDOR",
]

const narrowest = (scopes: Scope[]): Scope =>
  [...scopes].sort(
    (a, b) => NARROW_TO_BROAD.indexOf(a) - NARROW_TO_BROAD.indexOf(b)
  )[0]

/** One permission can be granted with several scopes; we edit sets. */
type GrantMap = Map<string, Set<Scope>>

const toMap = (role: Role | null): GrantMap => {
  const m: GrantMap = new Map()
  for (const g of role?.grants ?? []) {
    if (!m.has(g.permissionCode)) m.set(g.permissionCode, new Set())
    m.get(g.permissionCode)!.add(g.scope)
  }
  return m
}

const RoleEditorPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { role, catalogue } = useLoaderData() as {
    role: Role | null
    catalogue: PermissionDef[]
  }
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const run = useRun()
  const canManage = hasPermission(user, P.ROLE_MANAGE)
  const isNew = role === null

  const [name, setName] = useState(role?.name ?? "")
  const [description, setDescription] = useState(role?.description ?? "")
  const [contextType, setContextType] = useState<"" | "STORE" | "DEPARTMENT">(
    ""
  )
  const [grants, setGrants] = useState<GrantMap>(() => toMap(role))
  const [filter, setFilter] = useState("")
  const [confirmRetire, setConfirmRetire] = useState(false)
  const [busy, setBusy] = useState(false)

  const modules = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return groupByModule(
      catalogue.filter(
        (p) =>
          !q || p.code.includes(q) || p.description.toLowerCase().includes(q)
      )
    )
  }, [catalogue, filter])

  const grantCount = [...grants.values()].reduce((n, s) => n + s.size, 0)
  const original = toMap(role)
  const grantsDirty =
    JSON.stringify([...grants].map(([k, v]) => [k, [...v].sort()]).sort()) !==
    JSON.stringify([...original].map(([k, v]) => [k, [...v].sort()]).sort())
  const dirty =
    isNew ||
    grantsDirty ||
    name !== role.name ||
    description !== (role.description ?? "")

  /** Toggle a permission on (with its narrowest scope) or off. */
  function togglePermission(p: PermissionDef, on: boolean) {
    setGrants((prev) => {
      const next = new Map(prev)
      if (on) next.set(p.code, new Set([narrowest(p.allowedScopes)]))
      else next.delete(p.code)
      return next
    })
  }

  function setScope(code: string, scope: Scope) {
    setGrants((prev) => new Map(prev).set(code, new Set([scope])))
  }

  async function save() {
    setBusy(true)
    const list = [...grants].flatMap(([permissionCode, scopes]) =>
      [...scopes].map((scope) => ({ permissionCode, scope }))
    )
    let savedId = role?.uniqueId ?? ""
    const ok = await run(
      async () => {
        if (isNew) {
          savedId = (
            await createRole({
              name: name.trim(),
              description: description.trim() || undefined,
              contextType: contextType || undefined,
              grants: list,
            })
          ).uniqueId
        } else {
          await updateRole({
            uniqueId: role.uniqueId,
            name: name.trim(),
            description: description.trim(),
            ...(grantsDirty && { grants: list }),
          })
        }
      },
      t("common.saved", "Saved")
    )
    setBusy(false)
    if (!ok) return
    if (isNew) navigate(withId(ROUTES.ROLE_DETAILS, savedId), { replace: true })
    else revalidator.revalidate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isNew ? (
            t("roles.new", "New role")
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              {role.name}
              <ActiveBadge active={role.isActive} />
            </span>
          )
        }
        description={
          isNew
            ? t(
                "roles.new_hint",
                "Pick permissions and the scope each one is granted with."
              )
            : t("roles.summary", "{{grants}} grants · {{users}} users", {
                grants: role.grants.length,
                users: role.userCount,
              })
        }
        actions={
          canManage && (
            <>
              {!isNew && (
                <Button
                  variant="outline"
                  onClick={() =>
                    role.isActive
                      ? setConfirmRetire(true)
                      : run(
                          () => setRoleActive(role.uniqueId, true),
                          t("roles.reinstated", "Role reinstated")
                        ).then((ok) => {
                          if (ok) void revalidator.revalidate()
                        })
                  }
                >
                  {role.isActive ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
                  {role.isActive
                    ? t("roles.retire", "Retire")
                    : t("roles.reinstate", "Reinstate")}
                </Button>
              )}
              <Button
                disabled={!dirty || busy || name.trim().length < 2}
                onClick={save}
              >
                <SaveIcon />
                {t("common.save", "Save")}
              </Button>
            </>
          )
        }
      />

      <Alert>
        <AlertDescription>
          {t(
            "roles.rules",
            "You can only grant permissions you hold yourself, and you cannot add permissions to a role you hold. At least two active users must always hold role.manage."
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("roles.details", "Details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-name">
                  {t("common.name", "Name")}
                </FieldLabel>
                <Input
                  id="role-name"
                  value={name}
                  disabled={!canManage}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-desc">
                  {t("common.description", "Description")}
                </FieldLabel>
                <Textarea
                  id="role-desc"
                  value={description}
                  disabled={!canManage}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-ctx">
                  {t("roles.context", "Assigned per")}
                </FieldLabel>
                {isNew ? (
                  <NativeSelect
                    id="role-ctx"
                    className="w-full"
                    value={contextType}
                    onChange={(e) =>
                      setContextType(e.target.value as typeof contextType)
                    }
                  >
                    <NativeSelectOption value="">
                      {t("roles.no_context", "No context (company-wide)")}
                    </NativeSelectOption>
                    <NativeSelectOption value="DEPARTMENT">
                      {t(
                        "roles.per_department_long",
                        "Department (e.g. Inspector)"
                      )}
                    </NativeSelectOption>
                    <NativeSelectOption value="STORE">
                      {t("roles.per_store_long", "Store (e.g. Storekeeper)")}
                    </NativeSelectOption>
                  </NativeSelect>
                ) : (
                  <div className="text-sm">
                    {role.contextType === "STORE"
                      ? t("roles.per_store_long", "Store (e.g. Storekeeper)")
                      : role.contextType === "DEPARTMENT"
                        ? t(
                            "roles.per_department_long",
                            "Department (e.g. Inspector)"
                          )
                        : t("roles.no_context", "No context (company-wide)")}
                  </div>
                )}
              </Field>
              <div className="text-sm text-muted-foreground">
                {t("roles.selected_grants", "{{count}} grants selected", {
                  count: grantCount,
                })}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Input
            placeholder={t("roles.filter", "Filter permissions…")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {Object.entries(modules).map(([module, perms]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(`modules.${module}`, MODULE_NAMES[module] ?? module)}
                </CardTitle>
                <CardDescription>
                  {t("roles.module_count", "{{on}} of {{all}} selected", {
                    on: perms.filter((p) => grants.has(p.code)).length,
                    all: perms.length,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {perms.map((p) => {
                  const scopes = grants.get(p.code)
                  const on = !!scopes
                  const current = scopes ? [...scopes][0] : undefined
                  return (
                    <div
                      key={p.code}
                      className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center"
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <Checkbox
                          className="mt-0.5"
                          checked={on}
                          disabled={!canManage}
                          onCheckedChange={(v) =>
                            togglePermission(p, v === true)
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-mono text-xs">{p.code}</div>
                          <div className="text-sm text-muted-foreground">
                            {p.description}
                          </div>
                        </div>
                      </label>
                      {on &&
                        (p.allowedScopes.length > 1 && canManage ? (
                          <NativeSelect
                            size="sm"
                            value={current}
                            aria-label={t("roles.scope", "Scope")}
                            title={current ? scopeHint(t, current) : undefined}
                            onChange={(e) =>
                              setScope(p.code, e.target.value as Scope)
                            }
                          >
                            {p.allowedScopes.map((s) => (
                              <NativeSelectOption key={s} value={s}>
                                {scopeLabel(t, s)}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        ) : (
                          <Badge
                            variant="secondary"
                            title={current ? scopeHint(t, current) : undefined}
                          >
                            {current && scopeLabel(t, current)}
                          </Badge>
                        ))}
                      {scopes && scopes.size > 1 && (
                        <Badge variant="outline">
                          {t("roles.multi_scope", "+{{n}} scopes", {
                            n: scopes.size - 1,
                          })}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {!isNew && (
        <ConfirmDialog
          open={confirmRetire}
          onOpenChange={setConfirmRetire}
          title={t("roles.retire_title", "Retire “{{name}}”?", {
            name: role.name,
          })}
          description={t(
            "roles.retire_hint",
            "A retired role grants nothing, but stays on record with its history. {{users}} users currently hold it.",
            { users: role.userCount }
          )}
          confirmLabel={t("roles.retire", "Retire")}
          destructive
          onConfirm={async () => {
            if (
              await run(
                () => setRoleActive(role.uniqueId, false),
                t("roles.retired", "Role retired")
              )
            )
              revalidator.revalidate()
            setConfirmRetire(false)
          }}
        />
      )}
    </div>
  )
}

export default RoleEditorPage
