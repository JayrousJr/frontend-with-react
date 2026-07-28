import { useCallback, useEffect, useRef, useState } from "react"
import { FileIcon, RotateCcwIcon, UploadIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Spinner } from "@/components/ui/spinner"
import { formatFileSize } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface UploadHandlerOptions {
  /** Report 0–100 so the attachment shows real progress, not a fake bar. */
  onProgress: (percent: number) => void
  /** Aborts when the user cancels — forward it to axios as `signal`. */
  signal: AbortSignal
}

interface FileUploadProps {
  /**
   * Performs the upload. Throw to put the item in the error state — the
   * thrown message is shown on the attachment, so backend messages (already
   * localized via the x-lang header) surface as-is.
   */
  onUpload: (file: File, options: UploadHandlerOptions) => Promise<void>
  accept?: string
  multiple?: boolean
  /** Max size in bytes; oversized files fail locally without hitting the API. */
  maxSize?: number
  disabled?: boolean
  label?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

type UploadItem = {
  id: string
  file: File
  status: "uploading" | "error" | "done"
  progress: number
  error?: string
  /** Object URL for image previews; revoked when the item goes away. */
  previewUrl?: string
  controller: AbortController
}

/** Mirrors the browser's own `accept` matching so drag-and-drop is validated too. */
function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true
  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule)
      if (rule.endsWith("/*")) return file.type.startsWith(rule.slice(0, -1))
      return file.type.toLowerCase() === rule
    })
}

/**
 * File uploader built on the Attachment primitives: a dashed drop zone plus
 * one attachment card per file showing live progress, image previews, and
 * inline errors with retry. The standard uploader for this template — see
 * `settings/profile-tab.tsx` for a single-image example.
 */
export function FileUpload({
  onUpload,
  accept,
  multiple = false,
  maxSize,
  disabled,
  label,
  description,
  className,
}: FileUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Mirror the latest items into a ref so the unmount cleanup below can abort
  // in-flight uploads without re-subscribing on every progress tick.
  const itemsRef = useRef<UploadItem[]>([])
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        item.controller.abort()
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [])

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    )
  }, [])

  const start = useCallback(
    async (item: UploadItem) => {
      try {
        await onUpload(item.file, {
          onProgress: (percent) => patch(item.id, { progress: percent }),
          signal: item.controller.signal,
        })
        patch(item.id, { status: "done", progress: 100 })
      } catch (error) {
        // A cancel rejects too, but that item is already gone from the list.
        if (item.controller.signal.aborted) return
        patch(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : t("upload.failed"),
        })
      }
    },
    [onUpload, patch, t]
  )

  function addFiles(selected: FileList | File[]) {
    const files = Array.from(selected)
    if (files.length === 0 || disabled) return

    const accepted = multiple ? files : files.slice(0, 1)
    const created: UploadItem[] = accepted.map((file) => {
      const rejection = !matchesAccept(file, accept)
        ? t("upload.invalid_type")
        : maxSize !== undefined && file.size > maxSize
          ? t("upload.too_large", { size: formatFileSize(maxSize) })
          : undefined

      return {
        id: crypto.randomUUID(),
        file,
        controller: new AbortController(),
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
        status: rejection ? "error" : "uploading",
        error: rejection,
      }
    })

    if (multiple) {
      setItems((prev) => [...prev, ...created])
    } else {
      // Single-file mode replaces whatever was there — drop the old upload.
      for (const previous of items) {
        previous.controller.abort()
        if (previous.previewUrl) URL.revokeObjectURL(previous.previewUrl)
      }
      setItems(created)
    }

    for (const item of created) {
      if (item.status === "uploading") void start(item)
    }
  }

  function remove(item: UploadItem) {
    item.controller.abort()
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    setItems((prev) => prev.filter((entry) => entry.id !== item.id))
  }

  function retry(item: UploadItem) {
    const controller = new AbortController()
    patch(item.id, {
      controller,
      status: "uploading",
      progress: 0,
      error: undefined,
    })
    void start({ ...item, controller })
  }

  function describe(item: UploadItem) {
    if (item.status === "uploading") {
      return t("upload.uploading_percent", { percent: item.progress })
    }
    if (item.status === "error") return item.error ?? t("upload.failed")
    return formatFileSize(item.file.size)
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          addFiles(event.target.files ?? [])
          // Reset so picking the same file again still fires onChange.
          event.target.value = ""
        }}
      />

      <Attachment
        state="idle"
        className={cn(
          "w-full",
          isDragging && "border-primary bg-muted/50",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          addFiles(event.dataTransfer.files)
        }}
      >
        <AttachmentMedia>
          <UploadIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{label ?? t("upload.hint")}</AttachmentTitle>
          {description && (
            <AttachmentDescription>{description}</AttachmentDescription>
          )}
        </AttachmentContent>
        <AttachmentTrigger
          disabled={disabled}
          aria-label={t("actions.click_to_upload")}
          onClick={() => inputRef.current?.click()}
        />
      </Attachment>

      {items.map((item) => (
        <Attachment key={item.id} state={item.status} className="w-full">
          <AttachmentMedia variant={item.previewUrl ? "image" : "icon"}>
            {item.previewUrl ? (
              // The image variant dims itself until the item reaches "done".
              <img src={item.previewUrl} alt={item.file.name} />
            ) : item.status === "uploading" ? (
              <Spinner />
            ) : (
              <FileIcon />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{item.file.name}</AttachmentTitle>
            <AttachmentDescription>{describe(item)}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            {item.status === "error" && (
              <AttachmentAction
                type="button"
                aria-label={t("upload.retry")}
                onClick={() => retry(item)}
              >
                <RotateCcwIcon />
              </AttachmentAction>
            )}
            <AttachmentAction
              type="button"
              aria-label={
                item.status === "uploading"
                  ? t("upload.cancel")
                  : t("upload.remove")
              }
              onClick={() => remove(item)}
            >
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </div>
  )
}
