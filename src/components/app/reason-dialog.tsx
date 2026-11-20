import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

/** Dialog that asks for a reason (audited actions); extra fields go in children. */
export function ReasonDialog({
  title,
  description,
  confirmLabel,
  destructive,
  canConfirm = true,
  onClose,
  onConfirm,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  confirmLabel: ReactNode
  destructive?: boolean
  canConfirm?: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<boolean>
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <FieldGroup>
          {children}
          <Field>
            <FieldLabel htmlFor="reason">
              {t("common.reason", "Reason")}
            </FieldLabel>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy || reason.trim().length < 3 || !canConfirm}
            onClick={async () => {
              setBusy(true)
              const ok = await onConfirm(reason.trim())
              setBusy(false)
              if (ok) onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
