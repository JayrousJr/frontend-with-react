import { useTranslation } from "react-i18next"
import { statusLabel } from "@/lib/status"

/** Plain label for a B1/B2 code (selects, tables): `codes.<CODE>`. */
export function useCodeLabel() {
  const { t } = useTranslation()
  return (code: string) => t(`codes.${code}`, statusLabel(code))
}
