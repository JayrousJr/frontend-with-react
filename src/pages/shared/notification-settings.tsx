import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import {
  fetchPreferences,
  setPreference,
  type Preference,
} from "@/services/comms"
import { Loading } from "../production/ui"

/** Module 09: each user picks the channels of non-critical notifications. */
const NotificationSettingsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const [rows, setRows] = useState<Preference[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetchPreferences().then(setRows, (e: Error) => setError(e.message))
  }, [])
  const change = (p: Preference, patch: Partial<Preference>) =>
    run(async () => {
      const next = { ...p, ...patch }
      setRows(await setPreference(p.category, next.inApp, next.email))
    })
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("prefs.title", "My notifications")}
        description={t(
          "prefs.subtitle",
          "Choose how you receive each kind of notification. Approval requests and urgent alerts always arrive on both channels."
        )}
      />
      {!rows ? (
        <Loading error={error} />
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:px-6">
              <span />
              <span className="text-center">
                {t("prefs.dashboard", "Dashboard")}
              </span>
              <span className="text-center">{t("prefs.email", "Email")}</span>
            </div>
            {rows.map((p) => (
              <div
                key={p.category}
                className="grid grid-cols-[1fr_6rem_6rem] items-center gap-2 px-4 py-3 sm:px-6"
              >
                <div>
                  <div className="font-medium">
                    {t(
                      `prefs.cat_${p.category}`,
                      p.category[0].toUpperCase() + p.category.slice(1)
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`prefs.desc_${p.category}`, p.label)}
                  </div>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={p.inApp}
                    disabled={p.critical}
                    onCheckedChange={(v) => change(p, { inApp: v })}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={p.email}
                    disabled={p.critical}
                    onCheckedChange={(v) => change(p, { email: v })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NotificationSettingsPage
