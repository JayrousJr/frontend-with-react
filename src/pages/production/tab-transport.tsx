import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { TruckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  fetchTrips,
  requestTransport,
  type Production,
} from "@/services/production"
import { FormDialog, Loading, Section, SimpleTable } from "./ui"
import { TripFields, type TripForm } from "./transport-form"
import { fromLocal, toLocal, useLoad } from "./utils"

export function TransportTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const rows = useLoad(
    () => fetchTrips({ production: p.uniqueId }),
    [p.uniqueId]
  )
  const [f, setF] = useState<TripForm | null>(null)
  const open = [
    "SCHEDULED",
    "PREPARING",
    "READY",
    "IN_PROGRESS",
    "ON_HOLD",
    "DELAYED",
  ].includes(p.status)
  return (
    <Section
      title={t("transport.title", "Transport")}
      description={t(
        "transport.tab_hint",
        "Transport Officers allocate a Store vehicle and a driver, then confirm. Trips record times, kilometres and litres."
      )}
      actions={
        open && (
          <Button
            size="sm"
            onClick={() =>
              setF({
                departmentId: "",
                pickup: "",
                destination: p.venues[0]?.name ?? "",
                route: "",
                departAt: toLocal(p.setupAt ?? p.startAt),
                returnAt: toLocal(p.breakdownAt ?? p.endAt),
                passengers: "1",
                equipmentNote: "",
                instructions: "",
              })
            }
          >
            <TruckIcon />
            {t("transport.request", "Request transport")}
          </Button>
        )
      }
    >
      {!rows.data ? (
        <Loading error={rows.error} />
      ) : (
        <SimpleTable
          head={[
            t("transport.trip", "Trip"),
            t("transport.route_short", "From → to"),
            t("transport.depart", "Departure"),
            t("transport.vehicle", "Vehicle"),
            t("transport.driver", "Driver"),
            t("common.status", "Status"),
          ]}
          rows={rows.data.map((x) => [
            <Link
              className="font-mono underline"
              to={withId(ROUTES.TRANSPORT_DETAILS, x.uniqueId)}
            >
              {x.number}
            </Link>,
            `${x.pickup} → ${x.destination}`,
            formatStamp(x.departAt),
            x.vehicle ?? "—",
            x.driver ?? "—",
            <ToneBadge code={x.status} />,
          ])}
          empty={t("transport.none", "No transport requested yet.")}
        />
      )}
      {f && (
        <FormDialog
          wide
          title={t("transport.request", "Request transport")}
          confirmLabel={t("transport.send", "Send request")}
          canConfirm={
            !!f.pickup.trim() &&
            !!f.destination.trim() &&
            !!f.departAt &&
            !!f.returnAt
          }
          onClose={() => setF(null)}
          onConfirm={async () => {
            const ok = await run(
              () =>
                requestTransport(p.uniqueId, {
                  departmentId: f.departmentId ? Number(f.departmentId) : null,
                  pickup: f.pickup,
                  destination: f.destination,
                  route: f.route || null,
                  departAt: fromLocal(f.departAt)!,
                  returnAt: fromLocal(f.returnAt)!,
                  passengers: Number(f.passengers) || 0,
                  equipmentNote: f.equipmentNote || null,
                  instructions: f.instructions || null,
                }),
              t("transport.sent", "Transport requested")
            )
            if (ok) rows.reload()
            return ok
          }}
        >
          <TripFields f={f} onChange={setF} departments={p.departments} />
        </FormDialog>
      )}
    </Section>
  )
}
