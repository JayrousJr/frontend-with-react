import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { errorMessage } from "@/services/api"

/**
 * Run a mutation with toast feedback. Returns true on success so callers
 * can close dialogs / revalidate. Backend messages arrive localised.
 */
export function useRun() {
  const { t } = useTranslation()
  return useCallback(
    async (fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
      try {
        await fn()
        if (success) toast.success(success)
        return true
      } catch (err) {
        toast.error(errorMessage(err, t("general_error")))
        return false
      }
    },
    [t]
  )
}
