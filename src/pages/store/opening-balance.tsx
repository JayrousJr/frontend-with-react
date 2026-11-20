import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel } from "@/components/ui/field"
import { useState } from "react"
import { PageHeader } from "@/components/app/page-header"
import { ExcelImport } from "@/components/app/excel-import"
import { ROUTES, withId } from "@/routes/routeConstants"
import { importClient } from "@/services/products"
import type { Store } from "@/services/store"

const client = importClient("opening-balance")

/** Tagging campaign import (B2 §12), one store at a time. */
const OpeningBalancePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { stores } = useLoaderData() as { stores: Store[] }
  const [params, setParams] = useSearchParams()
  const store =
    params.get("store") ?? (stores.length === 1 ? stores[0].uniqueId : "")
  const [reason, setReason] = useState("")

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("opening.title", "Opening balance — tagging campaign")}
        description={t(
          "opening.subtitle",
          "Per store: every tagged asset (serial, condition, location, holder) and every consumable counted. After upload it goes to Store Managers; stock appears once approved."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.ASSET_TAGS}>
              {t("opening.print_tags", "Issue / print tags first")}
            </Link>
          </Button>
        }
      />
      <ExcelImport
        client={client}
        ready={!!store}
        selector={
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ob-store">
                  {t("stores.store", "Store")}
                </FieldLabel>
                <NativeSelect
                  id="ob-store"
                  className="w-full"
                  value={store}
                  onChange={(e) =>
                    setParams({ store: e.target.value }, { replace: true })
                  }
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
                <FieldLabel htmlFor="ob-reason">
                  {t("opening.note", "Note (optional)")}
                </FieldLabel>
                <Textarea
                  id="ob-reason"
                  rows={1}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        }
        templateQuery={`storeUniqueId=${store}`}
        templateName="azamtv-opening-balance.xlsx"
        templateHint={t(
          "opening.template_hint",
          "Assets and Consumables sheets with today's Active products and this store's locations."
        )}
        uploadFields={{ storeUniqueId: store, reason }}
        historyQuery={store ? `storeUniqueId=${store}` : ""}
        previewColumns={[
          { key: "sheet", label: t("opening.sheet", "Sheet") },
          { key: "row", label: t("import.row", "Row") },
          { key: "tag", label: t("assets.tag", "Tag"), mono: true },
          { key: "product", label: t("products.product", "Product") },
          { key: "serialNumber", label: t("assets.serial", "Serial number") },
          { key: "location", label: t("locations.path", "Location") },
          { key: "condition", label: t("assets.condition", "Condition") },
          { key: "holder", label: t("assets.held_by", "Held by") },
          { key: "kitTag", label: t("assets.kit", "Kit"), mono: true },
          { key: "quantity", label: t("movements.qty", "Qty") },
        ]}
        commitLabel={t("opening.commit", "Send for approval")}
        commitTitle={t(
          "opening.commit_title",
          "Send this opening balance for approval?"
        )}
        commitHint={(r) =>
          t(
            "opening.commit_hint",
            "{{n}} lines become one opening-balance adjustment for Store Managers. Nothing is in stock until they approve.",
            { n: r.createCount }
          )
        }
        committedHint={t(
          "opening.committed",
          "Sent for approval as a stock adjustment."
        )}
        onCommitted={(r) => {
          if (r.adjustmentUniqueId)
            navigate(withId(ROUTES.ADJUSTMENT_DETAILS, r.adjustmentUniqueId))
        }}
      />
    </div>
  )
}

export default OpeningBalancePage
