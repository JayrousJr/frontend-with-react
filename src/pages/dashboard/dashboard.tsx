import { useTranslation } from "react-i18next"

const DashboardPage = () => {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {t("dashboards.navMain.dashboard.title")}
        </h1>
      </div>
    </div>
  )
}

export default DashboardPage
