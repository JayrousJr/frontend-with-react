import { useEffect, useState } from "react"
import QRCode from "qrcode"

/** Printable asset tag: QR (the tag text) + readable code. */
export function TagLabel({
  tag,
  caption,
}: {
  tag: string
  caption?: string | null
}) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void QRCode.toDataURL(tag, {
      margin: 1,
      width: 160,
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (live) setSrc(url)
    })
    return () => {
      live = false
    }
  }, [tag])
  return (
    <div className="tag-label flex w-full break-inside-avoid items-center gap-2 rounded-md border bg-white p-2 text-black">
      {src ? (
        <img src={src} alt="" className="size-20 shrink-0" />
      ) : (
        <div className="size-20 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-[10px] font-semibold tracking-wide uppercase">
          AzamTV
        </div>
        <div className="font-mono text-sm font-bold break-all">{tag}</div>
        {caption && <div className="truncate text-[10px]">{caption}</div>}
      </div>
    </div>
  )
}
