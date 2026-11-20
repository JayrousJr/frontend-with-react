import { useState } from "react"
import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { ScaleIcon, ShieldIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { formatStamp } from "@/lib/format"
import { updatePolicySetting, type PolicySetting } from "@/services/admin"

type Params = Record<string, unknown>

/** Human labels for known parameters; unknown ones fall back to the key. */
const PARAM_LABELS: Record<string, string> = {
  domains: "Allowed domains (comma-separated)",
  minLength: "Minimum length",
  historyCount: "Previous passwords that cannot be reused",
  expiryDays: "Expiry in days (empty = never)",
  maxAttempts: "Failed attempts before lockout",
  lockMinutes: "Lockout minutes",
  validHours: "Valid for (hours)",
  validMinutes: "Valid for (minutes)",
  idleMinutes: "Idle timeout (minutes)",
  absoluteHours: "Absolute lifetime (hours)",
  requiredRoles: "Roles that must use 2FA (comma-separated)",
}

const PoliciesPage = () => {
  const { t } = useTranslation()
  const { settings } = useLoaderData() as { settings: PolicySetting[] }
  const sod = settings.filter((s) => s.category === "SOD")
  const security = settings.filter((s) => s.category === "SECURITY")

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("policies.title", "SoD & security settings")}
        description={t(
          "policies.subtitle",
          "Every change is audited and versioned. Changes apply within a minute."
        )}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScaleIcon className="size-4" />
            {t("policies.sod", "Separation of duties")}
          </CardTitle>
          <CardDescription>
            {t(
              "policies.sod_hint",
              "When a rule is on, the system refuses the conflicting action."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {sod.map((s) => (
            <SettingRow key={s.code} setting={s} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="size-4" />
            {t("policies.security", "Security")}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {security.map((s) => (
            <SettingRow key={s.code} setting={s} withParams />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SettingRow({
  setting,
  withParams,
}: {
  setting: PolicySetting
  withParams?: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const revalidator = useRevalidator()
  const canManage = hasPermission(user, P.POLICY_MANAGE)
  const original: Params = setting.parameters
    ? JSON.parse(setting.parameters)
    : {}
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(original).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v),
      ])
    )
  )

  const parsed = (): Params =>
    Object.fromEntries(
      Object.entries(draft).map(([k, v]) => {
        const before = original[k]
        if (Array.isArray(before)) {
          return [
            k,
            v
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          ]
        }
        if (typeof before === "number" || before === null) {
          return [k, v.trim() === "" ? null : Number(v)]
        }
        return [k, v]
      })
    )
  const dirty = JSON.stringify(parsed()) !== JSON.stringify(original)
  const invalid = Object.values(parsed()).some(
    (v) => typeof v === "number" && (Number.isNaN(v) || v < 0)
  )

  const save = (patch: { enabled?: boolean; parameters?: string }) =>
    run(
      () => updatePolicySetting({ code: setting.code, ...patch }),
      t("common.saved", "Saved")
    ).then((ok) => {
      if (ok) void revalidator.revalidate()
    })

  return (
    <div className="space-y-3 px-6 py-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{setting.code}</span>
            <Badge variant="outline">v{setting.version}</Badge>
          </div>
          <div className="text-sm">{setting.description}</div>
          <div className="text-xs text-muted-foreground">
            {t("policies.updated", "Updated {{time}}", {
              time: formatStamp(setting.updatedAt),
            })}
          </div>
        </div>
        {!withParams && (
          <Switch
            checked={setting.enabled}
            disabled={!canManage}
            aria-label={setting.code}
            onCheckedChange={(v) => save({ enabled: v })}
          />
        )}
      </div>
      {withParams && Object.keys(draft).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(draft).map(([k, v]) => (
            <Field key={k}>
              <FieldLabel htmlFor={`${setting.code}-${k}`} className="text-xs">
                {t(`policies.param.${k}`, PARAM_LABELS[k] ?? k)}
              </FieldLabel>
              <Input
                id={`${setting.code}-${k}`}
                value={v}
                disabled={!canManage}
                inputMode={
                  typeof original[k] === "number" ? "numeric" : undefined
                }
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [k]: e.target.value }))
                }
              />
            </Field>
          ))}
          {canManage && (
            <div className="flex items-end">
              <Button
                size="sm"
                disabled={!dirty || invalid}
                onClick={() => save({ parameters: JSON.stringify(parsed()) })}
              >
                {t("common.save", "Save")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PoliciesPage
