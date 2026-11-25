import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"
import { ComboboxSelect } from "./ui/combobox-select"
import { fetchSupportedLocales, updateProfile } from "@/services/account"
import { useAuth } from "@/context/auth-context"
import { languageLogos } from "@/config/languageLogos"
import { toast } from "sonner"

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation()
  const [locales, setLocale] = useState<string[]>([])
  const { refreshUser, user } = useAuth()

  // 1. Fetch available backend locales on mount
  useEffect(() => {
    async function load() {
      try {
        const localeData = await fetchSupportedLocales()
        setLocale(localeData)
      } catch (error) {
        console.error("Failed to load locales", error)
      }
    }
    void load()
  }, [])

  // AuthProvider owns syncing i18n to user.preferredLocale — here we only
  // read the active language and handle explicit switches
  const activeLocale = i18n.language
  const currentLogo = languageLogos[activeLocale] ?? languageLogos.en

  async function handleLanguageChange(language: string) {
    localStorage.setItem("preferredLocale", language)
    await i18n.changeLanguage(language)

    if (!user) return

    try {
      const res = await updateProfile({
        uniqueId: user.uniqueId,
        preferredLocale: language,
      })
      await refreshUser()
      toast.success(res.updateUser.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const options = locales.map((language) => ({
    value: language,
    label: language.toUpperCase(),
    icon: (
      <img
        src={languageLogos[language] ?? languageLogos.en}
        alt=""
        className="h-5 w-5 rounded-xs object-cover"
      />
    ),
  }))

  return (
    <ComboboxSelect
      aria-label={t("profile.language")}
      options={options}
      value={activeLocale}
      onValueChange={(language) => void handleLanguageChange(language)}
      searchable={options.length > 5}
      align="end"
      contentClassName="w-36"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 cursor-pointer rounded-full"
        >
          <img
            src={currentLogo}
            alt={`${activeLocale} flag`}
            className="h-6 w-6 rounded-sm object-cover"
          />
        </Button>
      }
    />
  )
}

export default LanguageSwitcher
