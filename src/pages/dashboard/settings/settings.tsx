import { useSearchParams } from "react-router"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProfileTab from "./profile-tab"
import PasswordTab from "./password-tab"
import SessionsTab from "./sessions-tab"
import RolePermissionsTab from "./role-permissions-tab"
import NotificationsTab from "./notifications-tab"
import { useTranslation } from "react-i18next"

const TABS = [
  "profile",
  "password",
  "notifications",
  "sessions",
  "role-permissions",
] as const

type Tab = (typeof TABS)[number]

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "profile"

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true })
  }
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("profile.settings")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("profile.settings_message")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="profile">{t("profile.my_profile")}</TabsTrigger>
          <TabsTrigger value="password">{t("profile.password")}</TabsTrigger>
          <TabsTrigger value="notifications">
            {t("profile.notification")}
          </TabsTrigger>
          <TabsTrigger value="sessions">{t("profile.session")}</TabsTrigger>
          <TabsTrigger value="role-permissions">
            {t("profile.role")} & {t("profile.permission")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="role-permissions">
          <RolePermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
