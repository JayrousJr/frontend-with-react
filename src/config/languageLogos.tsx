import enLogo from "@/assets/locale/en.png"
import swLogo from "@/assets/locale/sw.png"
import usLogo from "@/assets/locale/us.png"
import jpLogo from "@/assets/locale/jp.png"
import chLogo from "@/assets/locale/cn.png"
import krLogo from "@/assets/locale/kr.png"
import frLogo from "@/assets/locale/fr.png"
import spLogo from "@/assets/locale/sp.png"
import isLogo from "@/assets/locale/is.png"

export const languageLogos: Record<string, string> = {
  en: enLogo,
  sw: swLogo,
  fr: frLogo,
  is: isLogo,
  us: usLogo,
  // ISO 639-1 codes (what the backend's supported-locales list uses)
  zh: chLogo,
  es: spLogo,
  ko: krLogo,
  ja: jpLogo,
  // legacy aliases kept for safety
  ch: chLogo,
  sp: spLogo,
  kr: krLogo,
  jp: jpLogo,
}
