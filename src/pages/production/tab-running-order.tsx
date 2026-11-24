import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PaperclipIcon,
  PlusIcon,
  PrinterIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import type { UploadedFile } from "@/services/products"
import {
  commentRunningOrder,
  fetchRunningOrders,
  newRunningOrder,
  openProductionFile,
  saveRunningOrder,
  submitRunningOrder,
  type Production,
  type RunningOrderVersion,
} from "@/services/production"
import { FileUpload, Loading, Section, SimpleTable } from "./ui"
import { clock, duration, parseDuration, useLoad } from "./utils"

type Row = {
  title: string
  duration: string
  departmentId: string
  personnel: string
  description: string
}

function Editor({
  p,
  v,
  startAt,
  onSaved,
}: {
  p: Production
  v: RunningOrderVersion
  startAt: string
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [notes, setNotes] = useState(v.notes ?? "")
  const [file, setFile] = useState<UploadedFile[]>(
    v.file ? [v.file as UploadedFile] : []
  )
  const [rows, setRows] = useState<Row[]>(
    v.items.map((i) => ({
      title: i.title,
      duration: duration(i.durationSec),
      departmentId: i.departmentId ? String(i.departmentId) : "",
      personnel: i.personnel ?? "",
      description: i.description ?? "",
    }))
  )
  const upd = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    setRows(next)
  }
  // Start time of each segment and the end of the last one.
  const starts: number[] = []
  const end = rows.reduce((acc, r) => {
    starts.push(acc)
    const sec = parseDuration(r.duration)
    return isNaN(sec) ? acc : acc + sec * 1000
  }, new Date(startAt).getTime())
  const valid = rows.every(
    (r) => r.title.trim() && !isNaN(parseDuration(r.duration))
  )
  const payload = () => ({
    notes,
    fileUniqueId: file[0]?.uniqueId ?? null,
    items: rows.map((r) => ({
      title: r.title,
      durationSec: parseDuration(r.duration),
      departmentId: r.departmentId ? Number(r.departmentId) : null,
      personnel: r.personnel || null,
      description: r.description || null,
    })),
  })
  return (
    <div className="space-y-3">
      {v.returnComment && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t("ro.returned", "Returned")}: {v.returnComment}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-1 py-2">#</th>
              <th className="px-1 py-2">{t("ro.start", "Start")}</th>
              <th className="px-1 py-2">{t("ro.segment", "Segment")}</th>
              <th className="px-1 py-2">
                {t("ro.duration", "Duration (m:ss)")}
              </th>
              <th className="px-1 py-2">
                {t("productions.department", "Department")}
              </th>
              <th className="px-1 py-2">{t("ro.personnel", "Personnel")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const start = starts[i]
              return (
                <tr key={i} className="border-b align-top">
                  <td className="px-1 py-1 text-muted-foreground">{i + 1}</td>
                  <td className="px-1 py-1 text-muted-foreground tabular-nums">
                    {clock(new Date(start).toISOString())}
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={r.title}
                      onChange={(e) => upd(i, { title: e.target.value })}
                    />
                    <Input
                      className="mt-1"
                      placeholder={t("ro.description", "Instructions")}
                      value={r.description}
                      onChange={(e) => upd(i, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      className="w-24"
                      value={r.duration}
                      onChange={(e) => upd(i, { duration: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <NativeSelect
                      value={r.departmentId}
                      onChange={(e) => upd(i, { departmentId: e.target.value })}
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {p.departments.map((d) => (
                        <NativeSelectOption
                          key={d.departmentId}
                          value={String(d.departmentId)}
                        >
                          {d.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={r.personnel}
                      onChange={(e) => upd(i, { personnel: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1 whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setRows([
              ...rows,
              {
                title: "",
                duration: "5:00",
                departmentId: "",
                personnel: "",
                description: "",
              },
            ])
          }
        >
          <PlusIcon />
          {t("ro.add", "Add segment")}
        </Button>
        <span className="text-muted-foreground">
          {t("ro.ends", "Ends")} {clock(new Date(end).toISOString())}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Textarea
          rows={2}
          placeholder={t("ro.notes", "Notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="space-y-1 text-sm">
          <div className="text-muted-foreground">
            {t("ro.upload", "Or upload the running order (PDF, Word, Excel)")}
          </div>
          <FileUpload
            folder="production"
            multiple={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            files={file}
            onChange={setFile}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!valid}
          onClick={() =>
            run(
              async () => {
                await saveRunningOrder(v.uniqueId, payload())
                onSaved()
              },
              t("common.saved", "Saved")
            )
          }
        >
          <SaveIcon />
          {t("actions.save", "Save")}
        </Button>
        <Button
          size="sm"
          disabled={!valid}
          onClick={() =>
            run(
              async () => {
                await saveRunningOrder(v.uniqueId, payload())
                await submitRunningOrder(v.uniqueId)
                onSaved()
              },
              t("ro.submitted", "Sent to the Production Manager")
            )
          }
        >
          <SendIcon />
          {t("ro.submit", "Save and submit")}
        </Button>
      </div>
    </div>
  )
}

export function RunningOrderTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const ro = useLoad(() => fetchRunningOrders(p.uniqueId), [p.uniqueId])
  const [comment, setComment] = useState<Record<string, string>>({})
  const [show, setShow] = useState<number | null>(null)
  if (!ro.data) return <Loading error={ro.error} />
  const d = ro.data
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          {d.officialVersion
            ? t(
                "ro.official",
                "Official: version {{v}}. A revision stays a draft until approved.",
                { v: d.officialVersion }
              )
            : t("ro.no_official", "No approved running order yet.")}
        </p>
        <div className="flex gap-2">
          {d.officialVersion && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShow(d.officialVersion)
                setTimeout(() => window.print(), 50)
              }}
            >
              <PrinterIcon />
              {t("ro.print", "Print official")}
            </Button>
          )}
          {d.canCreate && (
            <Button
              size="sm"
              onClick={() =>
                run(async () => ro.set(await newRunningOrder(p.uniqueId)))
              }
            >
              <PlusIcon />
              {d.versions.length
                ? t("ro.revise", "New revision")
                : t("ro.create", "Create running order")}
            </Button>
          )}
        </div>
      </div>
      {d.versions.map((v) => (
        <Section
          key={v.uniqueId}
          className={show && show !== v.version ? "print:hidden" : ""}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {t("ro.version", "Version {{v}}", { v: v.version })}
              <ToneBadge code={v.status} />
              {v.official && (
                <ToneBadge code="APPROVED" className="font-semibold" />
              )}
              {v.official && (
                <span className="text-xs text-emerald-700">
                  {t("ro.latest_official", "latest approved — official")}
                </span>
              )}
            </span>
          }
          description={`${v.createdBy} · ${formatStamp(v.createdAt)}${v.approvedAt ? ` · ${t("ro.approved_at", "approved")} ${formatStamp(v.approvedAt)}` : ""} · ${t("ro.total", "total")} ${duration(v.totalSec)}`}
        >
          {v.canEdit ? (
            <Editor p={p} v={v} startAt={d.startAt} onSaved={ro.reload} />
          ) : (
            <div className="space-y-3">
              <SimpleTable
                head={[
                  "#",
                  t("ro.start", "Start"),
                  t("ro.segment", "Segment"),
                  t("ro.duration", "Duration"),
                  t("productions.department", "Department"),
                  t("ro.personnel", "Personnel"),
                ]}
                rows={v.items.map((i) => [
                  i.seq,
                  <span className="tabular-nums">{clock(i.startAt)}</span>,
                  <span>
                    {i.title}
                    {i.description && (
                      <span className="block text-xs text-muted-foreground">
                        {i.description}
                      </span>
                    )}
                  </span>,
                  duration(i.durationSec),
                  i.department ?? "",
                  i.personnel ?? "",
                ])}
                empty={t(
                  "ro.no_items",
                  "No segments (see the uploaded document)."
                )}
              />
              {v.notes && (
                <p className="text-sm whitespace-pre-wrap">{v.notes}</p>
              )}
              {v.file && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    openProductionFile(p.uniqueId, v.file!.uniqueId)
                  }
                >
                  <PaperclipIcon />
                  {v.file.filename}
                </Button>
              )}
            </div>
          )}
          {(v.comments.length > 0 ||
            ["APPROVED", "SUBMITTED"].includes(v.status)) && (
            <div className="mt-4 space-y-2 border-t pt-3 print:hidden">
              <div className="text-sm font-medium">
                {t("ro.comments", "Concerns and correction requests")}
              </div>
              {v.comments.map((c, i) => (
                <p key={i} className="text-sm">
                  <span className="text-muted-foreground">
                    {formatStamp(c.at)} {c.by}:
                  </span>{" "}
                  {c.text}
                </p>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder={t("ro.comment", "Raise a concern…")}
                  value={comment[v.uniqueId] ?? ""}
                  onChange={(e) =>
                    setComment({ ...comment, [v.uniqueId]: e.target.value })
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!comment[v.uniqueId]?.trim()}
                  onClick={() =>
                    run(async () => {
                      ro.set(
                        await commentRunningOrder(
                          v.uniqueId,
                          comment[v.uniqueId]
                        )
                      )
                      setComment({ ...comment, [v.uniqueId]: "" })
                    })
                  }
                >
                  {t("ro.send", "Send")}
                </Button>
              </div>
            </div>
          )}
        </Section>
      ))}
    </div>
  )
}
