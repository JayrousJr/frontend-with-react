import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShieldIcon, KeyIcon } from "lucide-react"
import { fetchMyProfile, type Profile } from "@/services/account"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

function groupPermissions(
  permissions: { name: string; description: string }[]
) {
  const groups: Record<string, { name: string; description: string }[]> = {}
  for (const perm of permissions) {
    const [group] = perm.name.split(".")
    if (!groups[group]) groups[group] = []
    groups[group].push(perm)
  }
  return groups
}

const RolePermissionsTab = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const { t } = useTranslation()
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMyProfile()
        setProfile(data.me)
      } catch {
        toast.error(`${t("general_error")}`)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [t])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-sm text-muted-foreground">
            {t("actions.loading")}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-sm text-destructive">
            {error ?? `${t("general_error")}`}
          </p>
        </CardContent>
      </Card>
    )
  }

  const grouped = groupPermissions(profile.allPermissions)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="size-5" />
            {t("profile.role")}
          </CardTitle>
          <CardDescription>{t("role_permission.role_text")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className="px-4 py-1.5 text-sm capitalize">
              {profile.role.name}
            </Badge>
            {profile.role.description && (
              <p className="text-sm text-muted-foreground">
                {profile.role.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="size-5" />
            {t("profile.permission")}
          </CardTitle>
          <CardDescription>
            {t("role_permission.permission_text")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.allPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("role_permission.no_permission")}
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([group, perms]) => (
                <div key={group}>
                  <h4 className="mb-3 text-sm font-medium capitalize">
                    {group}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <Badge
                        key={perm.name}
                        variant="secondary"
                        className="gap-1.5"
                      >
                        {perm.name}
                      </Badge>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}

          {profile.permissions.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                {t("role_permission.direct_permission")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.permissions.map((perm) => (
                  <Badge key={perm.name} variant="outline" className="gap-1.5">
                    {perm.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RolePermissionsTab
