import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { CheckCircle2Icon, MessageSquareWarningIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/app/page-header"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { useRun } from "@/components/app/use-run"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  acknowledgeHandover,
  disputeHandover,
  fetchCustodyItems,
  fetchHandovers,
  type CustodyItem,
  type Handover,
} from "@/services/custody"
import { CustodyItemsTable } from "./custody"
import { ReportDialog, ReturnRequestDialog } from "./dialogs"

/** B3 §5: the custodian's own view. */
const MyItemsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const [items, setItems] = useState<CustodyItem[]>([])
  const [pending, setPending] = useState<Handover[]>([])
  const [dispute, setDispute] = useState<Handover | null>(null)
  const [report, setReport] = useState<CustodyItem | null>(null)
  const [ret, setRet] = useState<CustodyItem | null>(null)
  const load = useCallback(() => {
    void fetchCustodyItems({ mine: true }).then(setItems)
    void fetchHandovers(["AWAITING_ACKNOWLEDGEMENT"]).then((h) =>
      setPending(h.filter((x) => x.can.acknowledge))
    )
  }, [])
  useEffect(load, [load])
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("my_items.title", "My items")}
        description={t(
          "my_items.subtitle",
          "Company items in your custody. Report any fault, damage, loss or theft at once."
        )}
      />
      {pending.map((h) => (
        <Card key={h.uniqueId} className="border-amber-500/40">
          <CardHeader>
            <CardTitle>
              {t("my_items.ack_title", "Please acknowledge handover {{n}}", {
                n: h.number,
              })}
            </CardTitle>
            <CardDescription>
              {h.purpose} · {h.store.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-inside list-disc text-sm">
              {h.lines.map((l) => (
                <li key={l.assetUniqueId}>
                  <span className="font-mono">{l.tag}</span> {l.productName}
                  {l.serialNumber && ` · ${l.serialNumber}`}
                  {l.accessories.length > 0 && ` · ${l.accessories.join(", ")}`}
                  {l.components.length > 0 && ` · + ${l.components.join(", ")}`}
                </li>
              ))}
            </ul>
            {h.termsText && (
              <p className="rounded-md bg-muted p-3 text-xs whitespace-pre-line">
                {h.termsText}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  run(
                    async () => {
                      await acknowledgeHandover(h.uniqueId)
                      load()
                    },
                    t("my_items.acknowledged", "Acknowledged")
                  )
                }
              >
                <CheckCircle2Icon />
                {t(
                  "my_items.ack",
                  "I received these items and accept the terms"
                )}
              </Button>
              <Button variant="outline" onClick={() => setDispute(h)}>
                <MessageSquareWarningIcon />
                {t("my_items.dispute", "Report a difference")}
              </Button>
              <Button variant="ghost" asChild>
                <Link to={withId(ROUTES.HANDOVER_DETAILS, h.uniqueId)}>
                  {t("my_items.details", "Details")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent>
          <CustodyItemsTable
            items={items}
            showCustodian={false}
            actions={(i) =>
              i.isComponent ? null : (
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReport(i)}
                  >
                    {t("custody.report_short", "Report")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRet(i)}>
                    {t("custody.request_return", "Request return")}
                  </Button>
                </div>
              )
            }
          />
        </CardContent>
      </Card>
      {dispute && (
        <ReasonDialog
          title={t("my_items.dispute", "Report a difference")}
          description={t(
            "my_items.dispute_hint",
            "Describe what is different (missing item, wrong serial, damage). The storekeeper is notified."
          )}
          confirmLabel={t("my_items.dispute_send", "Send")}
          onClose={() => setDispute(null)}
          onConfirm={async (note) => {
            const ok = await run(() => disputeHandover(dispute.uniqueId, note))
            if (ok) load()
            return ok
          }}
        />
      )}
      {report && (
        <ReportDialog
          assetUniqueId={report.assetUniqueId}
          tag={report.tag}
          onClose={() => setReport(null)}
          onDone={() => {
            setReport(null)
            load()
          }}
        />
      )}
      {ret && (
        <ReturnRequestDialog
          items={[ret]}
          onClose={() => setRet(null)}
          onDone={() => {
            setRet(null)
            load()
          }}
        />
      )}
    </div>
  )
}

export default MyItemsPage
