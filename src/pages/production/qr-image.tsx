import { useEffect, useState } from "react"
import QRCode from "qrcode"

/** QR code image of a text (badges, my badge). */
export function QrImage({ text, size = 160 }: { text: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void QRCode.toDataURL(text, { margin: 1, width: size }).then(
      (d) => live && setSrc(d)
    )
    return () => {
      live = false
    }
  }, [text, size])
  return src ? (
    <img src={src} width={size} height={size} alt="QR" />
  ) : (
    <div style={{ width: size, height: size }} />
  )
}
