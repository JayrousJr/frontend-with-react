import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"
import { fetchSupportedLocales, updateProfile } from "@/services/account"
import { useAuth } from "@/context/auth-context"
import { languageLogos } from "@/config/languageLogos"
import { toast } from "sonner"

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuGroup>
          {locales.map((language) => {
            const languageUrl = languageLogos[language] ?? languageLogos.en
            return (
              <DropdownMenuItem
                key={language}
                onClick={() => handleLanguageChange(language)}
                className={`my-0.5 flex cursor-pointer items-center gap-2 ${
                  activeLocale === language ? "bg-accent font-semibold" : ""
                }`}
              >
                <img
                  src={languageUrl}
                  alt=""
                  className="h-5 w-5 rounded-xs object-cover"
                />
                <span className="text-sm uppercase">{language}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageSwitcher
