import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import enTranslation from "./locales/en/translation.json"
import swTranslation from "./locales/sw/translation.json"

i18n.use(initReactI18next).init({
  resources: {
    sw: { translation: swTranslation },
    en: { translation: enTranslation },
  },
  // Restore the last chosen locale on reload (also covers logged-out users);
  // once a user profile loads, AuthProvider syncs it to user.preferredLocale
  lng: localStorage.getItem("preferredLocale") || "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
