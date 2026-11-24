import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { fetchWidgetSettings, saveWidgetSettings } from "@/services/comms"
import { Loading, Section } from "../production/ui"
import { useLoad } from "../production/utils"

/** Module 14: which management dashboard sections each role sees. */
const DashboardWidgetsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const s = useLoad(fetchWidgetSettings)
  if (!s.data) return <Loading error={s.error} />
  const d = s.data
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("widgets.title", "Dashboard sections")}
        description={t(
          "widgets.subtitle",
          "Switch off sections a role should not see on the management dashboard. Permissions still apply: a section only shows when the user may see its data. If any of a user's roles hides a section, that user does not see it."
        )}
      />
      <Section title={t("widgets.by_role", "Sections by role")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">
                  {t("widgets.role", "Role")}
                </th>
                {d.widgets.map((w) => (
                  <th
                    key={w.code}
                    className="px-2 py-2 text-center font-medium"
                  >
                    {t(`widgets.${w.code}`, w.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.roles.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-2 py-2 font-medium">{r.name}</td>
                  {d.widgets.map((w) => {
                    const shown = !r.hidden.includes(w.code)
                    return (
                      <td key={w.code} className="px-2 py-2 text-center">
                        <Switch
                          checked={shown}
                          onCheckedChange={(v) =>
                            run(async () =>
                              s.set(
                                await saveWidgetSettings(
                                  r.id,
                                  v
                                    ? r.hidden.filter((x) => x !== w.code)
                                    : [...r.hidden, w.code]
                                )
                              )
                            )
                          }
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

export default DashboardWidgetsPage
