import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup, FieldLabel } from "@/components/ui/field"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/context/auth-context"
import { useAuthenticatedImage } from "@/hooks/use-authenticated-image"
import {
  fetchMyProfile,
  updateProfile,
  uploadAvatar,
  type Profile,
} from "@/services/account"
import { UploadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "@/components/languageSwitcher"
import { toast } from "sonner"

const ProfileTab = () => {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")

  const avatarSrc = useAuthenticatedImage(user?.avatar)

  useEffect(() => {
    async function load() {
      try {
        const [profileData] = await Promise.all([fetchMyProfile()])
        setProfile(profileData.me)
        setFirstName(profileData.me.firstName)
        setLastName(profileData.me.lastName)
        setEmail(profileData.me.email)
      } catch {
        toast.error(`${t("general_error")}`)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [t])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    try {
      const { uniqueId: avatarUniqueId } = await uploadAvatar(file)
      const res = await updateProfile({
        uniqueId: profile.uniqueId,
        avatarUniqueId,
      })
      await refreshUser()
      toast.success(res.updateUser.message)
    } catch {
      toast.error(`${t("general_error")}`)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setIsSaving(true)

    try {
      const res = await updateProfile({
        uniqueId: profile.uniqueId,
        firstName,
        lastName,
        email,
      })

      // await fetchMe()
      // await refreshUser()
      toast.success(res.updateUser.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${t("general_error")}`)
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    if (!profile) return
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setEmail(profile.email)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("profile.loading_profile_text")}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : ""

  return (
    <>
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("profile.personal_profile")}</CardTitle>
              <CardDescription>
                {t("profile.personal_profile_text")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? `${t("actions.saving")}` : `${t("actions.save")}`}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <FieldGroup>
              <Separator />

              <div className="grid grid-cols-[200px_1fr] items-center gap-x-8 gap-y-6">
                <FieldLabel>{t("profile.name")}</FieldLabel>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t("profile.first_name")}
                    required
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t("profile.last_name")}
                    required
                  />
                </div>

                <Separator className="col-span-2" />

                <FieldLabel>{t("profile.email")}</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Separator className="col-span-2" />

                <div>
                  <FieldLabel>{t("profile.avatar")}</FieldLabel>
                </div>
                <div className="flex items-center gap-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={avatarSrc}
                      alt={`${firstName} ${lastName}`}
                    />
                    <AvatarFallback className="text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-6 py-4 text-sm text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground">
                    <UploadIcon className="size-5" />
                    <span> {t("actions.click_to_upload")}</span>
                    <span className="text-xs">
                      SVG, PNG or JPG (max. 800x400px)
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>

                <Separator className="col-span-2" />

                <FieldLabel>{t("profile.role")}</FieldLabel>
                <Input
                  value={profile?.role.name ?? ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </form>
      <Card className="mt-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("profile.other_Settings")}</CardTitle>
            <CardDescription>
              {t("profile.other_Settings_text")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="col-span-2" />
          <div className="flex items-center gap-2 py-1">
            <span className="">
              {t("profile.locale")}/ {t("profile.language")}
            </span>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default ProfileTab
