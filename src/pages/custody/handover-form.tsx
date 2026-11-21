import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { AsyncPicker, type PickerOption } from "@/components/app/async-picker"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  fetchInternalRequest,
  fetchInternalRequests,
  type InternalRequest,
} from "@/services/requests"
import { fetchAssets, fetchStores, type Store } from "@/services/store"
import {
  fetchCustodyTransfers,
  prepareHandover,
  type CustodyTransfer,
} from "@/services/custody"
import { PhotoInput } from "./dialogs"

type Line = {
  key: number
  asset: PickerOption | null
  isKit: boolean
  accessories: string
  photos: UploadedFile[]
}
let seq = 0

/** Prepare a handover: always from a request (internal request or approved custody transfer). */
const HandoverFormPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [stores, setStores] = useState<Store[]>([])
  const [store, setStore] = useState("")
  const [requests, setRequests] = useState<InternalRequest[]>([])
  const [transfers, setTransfers] = useState<CustodyTransfer[]>([])
  const [source, setSource] = useState(
    params.get("request")
      ? `ir:${params.get("request")}`
      : params.get("transfer")
        ? `ct:${params.get("transfer")}`
        : ""
  )
  const [ir, setIr] = useState<InternalRequest | null>(null)
  const [purpose, setPurpose] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [lines, setLines] = useState<Line[]>([
    { key: ++seq, asset: null, isKit: false, accessories: "", photos: [] },
  ])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetchStores().then((s) => {
      setStores(s)
      if (s.length === 1) setStore(s[0].uniqueId)
    })
    void fetchInternalRequests("deliver").then((r) =>
      setRequests(
        r.filter(
          (x) => x.product.trackingType === "SERIALISED" && x.beneficiary
        )
      )
    )
    void fetchCustodyTransfers().then((x) =>
      setTransfers(x.filter((y) => y.status === "APPROVED"))
    )
  }, [])
  const transfer = source.startsWith("ct:")
    ? transfers.find((x) => `ct:${x.uniqueId}` === source)
    : undefined
  useEffect(() => {
    if (!source.startsWith("ir:")) return
    let live = true
    void fetchInternalRequest(source.slice(3)).then((r) => {
      if (!live) return
      setIr(r)
      if (r.store) setStore(r.store.uniqueId)
      setPurpose((p) => p || r.justification)
    })
    return () => {
      live = false
    }
  }, [source])
  const shownIr = source.startsWith("ir:") ? ir : null
  const custodian = shownIr?.beneficiary?.fullName ?? transfer?.to.fullName
  const valid =
    !!store &&
    !!source &&
    purpose.trim().length >= 3 &&
    lines.every((l) => l.asset && (!l.isKit || l.photos.length > 0))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("custody.new_handover", "New handover")}
        description={t(
          "custody.handover_hint",
          "Every handover references a request; the custodian must be the employee on it. Vehicles are never handed over. Kits need photos."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={`${ROUTES.CUSTODY}?tab=handovers`}>
              {t("actions.cancel", "Cancel")}
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ho-src">
                {t("custody.source", "Request")}
              </FieldLabel>
              <NativeSelect
                id="ho-src"
                className="w-full"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <NativeSelectOption value="">
                  {t("common.choose", "— Choose —")}
                </NativeSelectOption>
                {source.startsWith("ir:") &&
                  !requests.some((r) => `ir:${r.uniqueId}` === source) &&
                  ir && (
                    <NativeSelectOption value={source}>
                      {ir.number}
                    </NativeSelectOption>
                  )}
                {requests.map((r) => (
                  <NativeSelectOption
                    key={r.uniqueId}
                    value={`ir:${r.uniqueId}`}
                  >
                    {r.number} — {r.product.name} for {r.beneficiary?.fullName}{" "}
                    ({r.fromStoreQty - r.deliveredQty} to deliver)
                  </NativeSelectOption>
                ))}
                {transfers.map((x) => (
                  <NativeSelectOption
                    key={x.uniqueId}
                    value={`ct:${x.uniqueId}`}
                  >
                    {x.number} —{" "}
                    {t("custody.transfer_to", "custody transfer to")}{" "}
                    {x.to.fullName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {custodian && (
              <Alert>
                <AlertDescription>
                  {t("custody.custodian_is", "Custodian")}:{" "}
                  <strong>{custodian}</strong>
                  {shownIr &&
                    ` · ${shownIr.product.name} (${shownIr.product.code})`}
                  {transfer &&
                    ` · ${transfer.assets.map((a) => a.tag).join(", ")}`}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ho-store">
                  {t("stores.store", "Store")}
                </FieldLabel>
                <NativeSelect
                  id="ho-store"
                  className="w-full"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                >
                  <NativeSelectOption value="">
                    {t("common.choose", "— Choose —")}
                  </NativeSelectOption>
                  {stores.map((s) => (
                    <NativeSelectOption key={s.uniqueId} value={s.uniqueId}>
                      {s.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="ho-ret">
                  {t(
                    "custody.expected_return",
                    "Expected return (empty = open-ended)"
                  )}
                </FieldLabel>
                <Input
                  id="ho-ret"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ho-purpose">
                {t("custody.purpose", "Purpose")}
              </FieldLabel>
              <Input
                id="ho-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("custody.items", "Items")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l) => (
            <div key={l.key} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <AsyncPicker
                    selected={l.asset}
                    disabled={!store}
                    placeholder={t("assets.tag", "Tag")}
                    onChange={(o) =>
                      setLines((p) =>
                        p.map((x) =>
                          x.key === l.key
                            ? {
                                ...x,
                                asset: o,
                                isKit: o?.hint?.includes("kit") ?? false,
                              }
                            : x
                        )
                      )
                    }
                    search={async (q) =>
                      (
                        await fetchAssets(
                          {
                            storeUniqueId: store,
                            statuses: ["IN_STORE"],
                            search: q || undefined,
                            productUniqueId: shownIr?.product.uniqueId,
                          },
                          1,
                          20
                        )
                      ).data
                        .filter(
                          (a) =>
                            !a.parent &&
                            !a.product.isVehicle &&
                            ["GOOD", "FAIR"].includes(a.condition)
                        )
                        .filter(
                          (a) =>
                            !transfer ||
                            transfer.assets.some(
                              (x) => x.uniqueId === a.uniqueId
                            )
                        )
                        .map((a) => ({
                          value: a.uniqueId,
                          label: `${a.tag} — ${a.product.name}`,
                          hint: [
                            a.serialNumber,
                            a.isKit ? "kit" : null,
                            a.condition,
                          ]
                            .filter(Boolean)
                            .join(" · "),
                        }))
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("actions.remove", "Remove")}
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((p) => p.filter((x) => x.key !== l.key))
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
              <Input
                placeholder={t(
                  "custody.accessories",
                  "Accessories (charger, bag, cables…)"
                )}
                value={l.accessories}
                onChange={(e) =>
                  setLines((p) =>
                    p.map((x) =>
                      x.key === l.key
                        ? { ...x, accessories: e.target.value }
                        : x
                    )
                  )
                }
              />
              <div className="text-xs text-muted-foreground">
                {l.isKit
                  ? t("custody.kit_photos", "Kit: photos are mandatory")
                  : t("custody.photos_optional", "Photos (optional)")}
              </div>
              <PhotoInput
                files={l.photos}
                onChange={(photos) =>
                  setLines((p) =>
                    p.map((x) => (x.key === l.key ? { ...x, photos } : x))
                  )
                }
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={!store}
            onClick={() =>
              setLines((p) => [
                ...p,
                {
                  key: ++seq,
                  asset: null,
                  isKit: false,
                  accessories: "",
                  photos: [],
                },
              ])
            }
          >
            <PlusIcon />
            {t("custody.add_item", "Add item")}
          </Button>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          disabled={busy || !valid}
          onClick={async () => {
            setBusy(true)
            let id = ""
            const ok = await run(
              async () => {
                const h = await prepareHandover({
                  storeUniqueId: store,
                  internalRequestUniqueId: source.startsWith("ir:")
                    ? source.slice(3)
                    : undefined,
                  custodyTransferUniqueId: source.startsWith("ct:")
                    ? source.slice(3)
                    : undefined,
                  purpose: purpose.trim(),
                  expectedReturnDate: returnDate || null,
                  lines: lines.map((l) => ({
                    assetUniqueId: l.asset!.value,
                    accessories: l.accessories
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                    photoFileUniqueIds: l.photos.map((p) => p.uniqueId),
                  })),
                })
                id = h.uniqueId
              },
              t("custody.handover_prepared", "Handover prepared")
            )
            setBusy(false)
            if (ok) navigate(withId(ROUTES.HANDOVER_DETAILS, id))
          }}
        >
          <SendIcon />
          {t("custody.prepare", "Hand over")}
        </Button>
      </div>
    </div>
  )
}

export default HandoverFormPage
