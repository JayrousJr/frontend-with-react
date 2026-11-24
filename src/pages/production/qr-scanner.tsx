import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { CameraIcon, CameraOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Detector = {
  detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}
type DetectorCtor = new (o: { formats: string[] }) => Detector

/**
 * Scan a personal attendance QR code with the phone camera (browsers with
 * BarcodeDetector), or type / paste it (USB and Bluetooth scanners type the
 * code and press Enter).
 */
export function QrScanner({
  onCode,
}: {
  onCode: (code: string) => Promise<void> | void
}) {
  const { t } = useTranslation()
  const video = useRef<HTMLVideoElement>(null)
  const [on, setOn] = useState(false)
  const [text, setText] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 })
  const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor })
    .BarcodeDetector

  useEffect(() => {
    if (!on || !Ctor) return
    let stream: MediaStream | null = null
    let timer = 0
    let stop = false
    const detector = new Ctor({ formats: ["qr_code"] })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s
        if (!video.current) return
        video.current.srcObject = s
        await video.current.play()
        const tick = async () => {
          if (stop || !video.current) return
          try {
            const codes = await detector.detect(video.current)
            const code = codes[0]?.rawValue
            // Same badge twice within 5 s = one scan.
            if (
              code &&
              (code !== last.current.code ||
                Date.now() - last.current.at > 5000)
            ) {
              last.current = { code, at: Date.now() }
              await onCode(code)
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(tick, 400)
        }
        void tick()
      })
      .catch((e: Error) => {
        setErr(e.message)
        setOn(false)
      })
    return () => {
      stop = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((x) => x.stop())
    }
  }, [on, Ctor, onCode])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-64 flex-1"
          placeholder={t(
            "attendance.qr_input",
            "Scan or paste the badge code, then Enter"
          )}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && text.trim()) {
              await onCode(text.trim())
              setText("")
            }
          }}
        />
        {Ctor ? (
          <Button variant="outline" onClick={() => setOn(!on)}>
            {on ? <CameraOffIcon /> : <CameraIcon />}
            {on
              ? t("attendance.camera_off", "Stop camera")
              : t("attendance.camera_on", "Scan with camera")}
          </Button>
        ) : (
          <span className="self-center text-xs text-muted-foreground">
            {t(
              "attendance.no_camera",
              "Camera scanning needs Chrome on Android; use a scanner or type the code."
            )}
          </span>
        )}
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {on && (
        <video
          ref={video}
          className="max-h-72 w-full rounded-md bg-black object-contain"
          muted
          playsInline
        />
      )}
    </div>
  )
}
