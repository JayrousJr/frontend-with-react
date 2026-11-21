import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PaperclipIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { searchEmployeeOptions } from "@/components/app/pickers"
import { useCodeLabel } from "@/components/app/use-code-label"
import { useRun } from "@/components/app/use-run"
import { uploadFile, type UploadedFile } from "@/services/products"
import {
  CONDITIONS,
  fetchStores,
  type AssetCondition,
  type Store,
} from "@/services/store"
import {
  createReport,
  receiveReturn,
  recordInspection,
  requestCustodyTransfer,
  requestReturn,
  type CustodyItem,
  type ReportType,
} from "@/services/custody"

export function PhotoInput({
  files,
  onChange,
}: {
  files: UploadedFile[]
  onChange: (f: UploadedFile[]) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-1">
      {files.map((f) => (
        <div key={f.uniqueId} className="flex items-center gap-2 text-xs">
          <PaperclipIcon className="size-3" />
          {f.filename}
        </div>
      ))}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-muted">
        {busy ? <Spinner /> : <PaperclipIcon className="size-3" />}
        {t("custody.add_photo", "Add photo")}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setBusy(true)
            await run(async () =>
              onChange([...files, await uploadFile(file, "custody")])
            )
            setBusy(false)
          }}
        />
      </label>
    </div>
  )
}

const TYPES: ReportType[] = ["FAULT", "DAMAGE", "LOSS", "THEFT"]

export function ReportDialog({
  assetUniqueId,
  tag,
  onClose,
  onDone,
}: {
  assetUniqueId: string
  tag: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [type, setType] = useState<ReportType>("FAULT")
  const [when, setWhen] = useState(new Date().toISOString().slice(0, 16))
  const [text, setText] = useState("")
  const [usable, setUsable] = useState(true)
  const [files, setFiles] = useState<UploadedFile[]>([])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("custody.report", "Report a problem")} — {tag}
          </DialogTitle>
          <DialogDescription>
            {t(
              "custody.report_hint",
              "Fault or damage opens a maintenance ticket. Loss or theft marks the item missing until the owning HOD and Store Managers confirm it."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rp-type">
                {t("custody.report_type", "What happened")}
              </FieldLabel>
              <NativeSelect
                id="rp-type"
                className="w-full"
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
              >
                {TYPES.map((x) => (
                  <NativeSelectOption key={x} value={x}>
                    {label(x)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="rp-when">
                {t("custody.when", "When")}
              </FieldLabel>
              <Input
                id="rp-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="rp-text">
              {t("custody.circumstances", "Circumstances and description")}
            </FieldLabel>
            <Textarea
              id="rp-text"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          {(type === "FAULT" || type === "DAMAGE") && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={usable}
                onCheckedChange={(v) => setUsable(v === true)}
              />
              {t("custody.still_usable", "Still usable")}
            </label>
          )}
          <Field>
            <FieldLabel>
              {t(
                "custody.documents",
                "Photos / documents (e.g. police report)"
              )}
            </FieldLabel>
            <PhotoInput files={files} onChange={setFiles} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            variant={
              type === "LOSS" || type === "THEFT" ? "destructive" : "default"
            }
            disabled={text.trim().length < 3}
            onClick={async () => {
              const ok = await run(
                () =>
                  createReport({
                    assetUniqueId,
                    type,
                    occurredAt: new Date(when).toISOString(),
                    circumstances: text.trim(),
                    stillUsable:
                      type === "LOSS" || type === "THEFT" ? false : usable,
                    fileUniqueIds: files.map((f) => f.uniqueId),
                  }),
                t("custody.reported", "Report submitted")
              )
              if (ok) onDone()
            }}
          >
            {t("custody.submit_report", "Submit report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReturnRequestDialog({
  items,
  recall,
  onClose,
  onDone,
}: {
  items: CustodyItem[]
  recall?: boolean
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {recall
              ? t("custody.recall", "Recall items")
              : t("custody.request_return", "Request return")}
          </DialogTitle>
          <DialogDescription>
            {items.map((i) => i.tag).join(", ")}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="rr-reason">
            {t("common.reason", "Reason")}
          </FieldLabel>
          <Textarea
            id="rr-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={reason.trim().length < 3}
            onClick={async () => {
              const ok = await run(
                () =>
                  requestReturn({
                    assetUniqueIds: items.map((i) => i.assetUniqueId),
                    reason: reason.trim(),
                    recall,
                  }),
                t("custody.return_requested", "Return requested")
              )
              if (ok) onDone()
            }}
          >
            {recall
              ? t("custody.recall", "Recall items")
              : t("custody.request_return", "Request return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TransferCustodyDialog({
  items,
  onClose,
  onDone,
}: {
  items: CustodyItem[]
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [to, setTo] = useState<PickerOption | null>(null)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("custody.transfer", "Transfer custody")}</DialogTitle>
          <DialogDescription>
            {t(
              "custody.transfer_hint",
              "Approved by the HOD of the receiving employee. Then the items come back to a store and are handed over to the new custodian."
            )}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <p className="text-sm">
            {items.map((i) => `${i.tag} ${i.productName}`).join(", ")}
          </p>
          <Field>
            <FieldLabel>{t("custody.to_employee", "To employee")}</FieldLabel>
            <AsyncPicker
              selected={to}
              onChange={setTo}
              search={searchEmployeeOptions({ statuses: ["ACTIVE"] })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ct-reason">
              {t("common.reason", "Reason")}
            </FieldLabel>
            <Textarea
              id="ct-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={!to || reason.trim().length < 3}
            onClick={async () => {
              const ok = await run(
                () =>
                  requestCustodyTransfer({
                    assetUniqueIds: items.map((i) => i.assetUniqueId),
                    toEmployeeUniqueId: to!.value,
                    reason: reason.trim(),
                  }),
                t("custody.transfer_requested", "Transfer sent for approval")
              )
              if (ok) onDone()
            }}
          >
            {t("custody.transfer", "Transfer custody")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InspectionDialog({
  item,
  onClose,
  onDone,
}: {
  item: CustodyItem
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [condition, setCondition] = useState<AssetCondition>(item.condition)
  const [remarks, setRemarks] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("custody.inspection", "Condition inspection")} — {item.tag}
          </DialogTitle>
          <DialogDescription>
            {item.productName} · {item.custodian.fullName}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="in-cond">
              {t("assets.condition", "Condition")}
            </FieldLabel>
            <NativeSelect
              id="in-cond"
              className="w-full"
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
            >
              {CONDITIONS.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {label(c)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="in-rem">
              {t("custody.remarks", "Remarks")}
            </FieldLabel>
            <Textarea
              id="in-rem"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            onClick={async () => {
              const ok = await run(
                () =>
                  recordInspection({
                    assetUniqueId: item.assetUniqueId,
                    condition,
                    remarks: remarks.trim() || undefined,
                  }),
                t("custody.inspected", "Inspection recorded")
              )
              if (ok) onDone()
            }}
          >
            {t("custody.record", "Record")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type RowState = {
  on: boolean
  condition: AssetCondition
  location: string
  accessories: string
  missing: string
  photos: UploadedFile[]
}

/** Store receives items back from one custodian (any store). */
export function ReceiveReturnDialog({
  items,
  returnUniqueId,
  onClose,
  onDone,
}: {
  items: CustodyItem[]
  returnUniqueId?: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const label = useCodeLabel()
  const run = useRun()
  const [stores, setStores] = useState<Store[]>([])
  const [store, setStore] = useState("")
  const main = items.filter((i) => !i.isComponent)
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      main.map((i) => [
        i.assetUniqueId,
        {
          on: true,
          condition: i.condition,
          location: "",
          accessories: "",
          missing: "",
          photos: [],
        },
      ])
    )
  )
  useEffect(() => void fetchStores().then(setStores), [])
  const s = stores.find((x) => x.uniqueId === store)
  const locations =
    s?.locations.filter((l) => l.kind === "GENERAL" && l.isActive) ?? []
  const set = (id: string, p: Partial<RowState>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...p } }))
  const chosen = main.filter((i) => rows[i.assetUniqueId]?.on)
  const valid =
    !!store &&
    chosen.length > 0 &&
    chosen.every((i) => rows[i.assetUniqueId].location)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("custody.receive", "Receive items back")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "custody.receive_hint",
              "Check each item against how it was handed over. A worse condition or missing parts creates a damage report automatically. Photos are mandatory for kits."
            )}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="rc-store">
            {t("custody.receiving_store", "Receiving store")}
          </FieldLabel>
          <NativeSelect
            id="rc-store"
            className="w-full"
            value={store}
            onChange={(e) => setStore(e.target.value)}
          >
            <NativeSelectOption value="">
              {t("common.choose", "— Choose —")}
            </NativeSelectOption>
            {stores.map((x) => (
              <NativeSelectOption key={x.uniqueId} value={x.uniqueId}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="space-y-3">
          {main.map((i) => {
            const r = rows[i.assetUniqueId]
            return (
              <div
                key={i.assetUniqueId}
                className="space-y-2 rounded-md border p-3"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={r.on}
                    onCheckedChange={(v) =>
                      set(i.assetUniqueId, { on: v === true })
                    }
                  />
                  <span className="font-mono">{i.tag}</span> {i.productName}
                </label>
                {r.on && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <NativeSelect
                      className="w-full"
                      aria-label={t("assets.condition", "Condition")}
                      value={r.condition}
                      onChange={(e) =>
                        set(i.assetUniqueId, {
                          condition: e.target.value as AssetCondition,
                        })
                      }
                    >
                      {CONDITIONS.map((c) => (
                        <NativeSelectOption key={c} value={c}>
                          {label(c)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <NativeSelect
                      className="w-full"
                      aria-label={t("locations.path", "Location")}
                      value={r.location}
                      onChange={(e) =>
                        set(i.assetUniqueId, { location: e.target.value })
                      }
                    >
                      <NativeSelectOption value="">
                        {t("locations.path", "Location")}
                      </NativeSelectOption>
                      {locations.map((l) => (
                        <NativeSelectOption key={l.uniqueId} value={l.uniqueId}>
                          {l.path}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <Input
                      placeholder={t(
                        "custody.accessories_back",
                        "Accessories returned (comma-separated)"
                      )}
                      value={r.accessories}
                      onChange={(e) =>
                        set(i.assetUniqueId, { accessories: e.target.value })
                      }
                    />
                    <Input
                      placeholder={t(
                        "custody.missing",
                        "Missing parts / accessories"
                      )}
                      value={r.missing}
                      onChange={(e) =>
                        set(i.assetUniqueId, { missing: e.target.value })
                      }
                    />
                    <PhotoInput
                      files={r.photos}
                      onChange={(photos) => set(i.assetUniqueId, { photos })}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel", "Cancel")}
          </Button>
          <Button
            disabled={!valid}
            onClick={async () => {
              const ok = await run(
                () =>
                  receiveReturn({
                    storeUniqueId: store,
                    returnUniqueId,
                    lines: chosen.map((i) => {
                      const r = rows[i.assetUniqueId]
                      return {
                        assetUniqueId: i.assetUniqueId,
                        condition: r.condition,
                        locationUniqueId: r.location,
                        accessoriesReturned: r.accessories
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                        missing: r.missing.trim() || null,
                        photoFileUniqueIds: r.photos.map((p) => p.uniqueId),
                      }
                    }),
                  }),
                t("custody.received", "Items received")
              )
              if (ok) onDone()
            }}
          >
            {t("custody.receive", "Receive items back")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
