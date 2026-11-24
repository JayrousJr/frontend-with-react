import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { PaperclipIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { resolveImageUrl } from "@/lib/format"
import { uploadFile, type UploadedFile } from "@/services/products"
import type { FileRef } from "@/services/procurement"

export function Loading({ error }: { error?: string | null }) {
  return error ? (
    <p className="text-sm text-destructive">{error}</p>
  ) : (
    <Spinner />
  )
}

export function Files({ files }: { files: (FileRef | null)[] }) {
  return (
    <span className="flex flex-wrap gap-2">
      {files
        .filter((f): f is FileRef => !!f)
        .map((f) => (
          <a
            key={f.uniqueId}
            className="inline-flex items-center gap-1 text-xs underline"
            href={resolveImageUrl(f.uri)}
            target="_blank"
            rel="noreferrer"
          >
            <PaperclipIcon className="size-3" />
            {f.filename}
          </a>
        ))}
    </span>
  )
}

/** Upload one or more files; shows the uploaded names. */
export function FileUpload({
  files,
  onChange,
  folder = "procurement",
  multiple = true,
  accept,
}: {
  files: UploadedFile[]
  onChange: (f: UploadedFile[]) => void
  folder?: string
  multiple?: boolean
  accept?: string
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-1">
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={busy}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1"
        onChange={async (e) => {
          const list = [...(e.target.files ?? [])]
          if (!list.length) return
          setBusy(true)
          try {
            const up = await Promise.all(list.map((f) => uploadFile(f, folder)))
            onChange(multiple ? [...files, ...up] : up)
          } finally {
            setBusy(false)
            e.target.value = ""
          }
        }}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {files.map((f) => (
            <button
              key={f.uniqueId}
              type="button"
              className="underline"
              onClick={() =>
                onChange(files.filter((x) => x.uniqueId !== f.uniqueId))
              }
            >
              {f.filename} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Generic form dialog. */
export function FormDialog({
  title,
  description,
  children,
  confirmLabel,
  canConfirm = true,
  destructive,
  wide,
  onClose,
  onConfirm,
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  confirmLabel: ReactNode
  canConfirm?: boolean
  destructive?: boolean
  wide?: boolean
  onClose: () => void
  onConfirm: () => Promise<boolean>
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        className={
          wide
            ? "max-h-[90svh] overflow-y-auto sm:max-w-3xl"
            : "max-h-[90svh] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy || !canConfirm}
            onClick={async () => {
              setBusy(true)
              const ok = await onConfirm()
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

export function Info({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
    </dl>
  )
}
