import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"
import { updateMyLocale } from "@/services/auth"
import { useAuth } from "@/context/auth-context"
import { languageLogos } from "@/config/languageLogos"
import { toast } from "sonner"

/** UI languages: English (default) and Swahili. */
const SUPPORTED_LOCALES = ["en", "sw"]

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const locales = SUPPORTED_LOCALES
  const { refreshUser, user } = useAuth()

  // AuthProvider owns syncing i18n to user.preferredLocale — here we only
  // read the active language and handle explicit switches
  const activeLocale = i18n.language
  const currentLogo = languageLogos[activeLocale] ?? languageLogos.en

  async function handleLanguageChange(language: string) {
    localStorage.setItem("preferredLocale", language)
    await i18n.changeLanguage(language)

    if (!user) return

    try {
      await updateMyLocale(language)
      await refreshUser()
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
