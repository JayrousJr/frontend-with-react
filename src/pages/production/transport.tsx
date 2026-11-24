import { useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchTrips } from "@/services/production"
import { Loading, Section, SimpleTable, Stat } from "./ui"
import { useLoad } from "./utils"

const STATUSES = [
  "SUBMITTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
]

/** Transport requests, allocations and trips (Module 07). */
const TransportPage = () => {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [status, setStatus] = useState("")
  const rows = useLoad(
    () =>
      fetchTrips({
        status: status || undefined,
        production: params.get("production") ?? undefined,
      }),
    [status, params.get("production")]
  )
  const list = rows.data ?? []
  const done = list.filter((x) => x.status === "COMPLETED")
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transport.title", "Transport")}
        description={t(
          "transport.subtitle",
          "Production trips with Store vehicles and drivers. Vehicles under maintenance or with expired documents, and drivers with expired licences, cannot be allocated."
        )}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat
          label={t("transport.pending", "Waiting for allocation")}
          value={list.filter((x) => x.status === "SUBMITTED").length}
          tone="warn"
        />
        <Stat
          label={t("transport.upcoming", "Confirmed")}
          value={list.filter((x) => x.status === "CONFIRMED").length}
        />
        <Stat
          label={t("transport.on_road", "On the road")}
          value={list.filter((x) => x.status === "IN_PROGRESS").length}
        />
        <Stat
          label={t("transport.completed", "Completed")}
          value={done.length}
        />
        <Stat
          label={t("transport.km_fuel", "Km / fuel")}
          value={done.reduce((s, x) => s + (x.km ?? 0), 0)}
          hint={`${done.reduce((s, x) => s + (x.fuelLitres ?? 0), 0).toFixed(1)} L`}
        />
      </div>
      <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
        <NativeSelectOption value="">
          {t("common.all_statuses", "All statuses")}
        </NativeSelectOption>
        {STATUSES.map((s) => (
          <NativeSelectOption key={s} value={s}>
            {t(`codes.${s}`, s)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Section title={t("transport.trips", "Trips")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("transport.trip", "Trip"),
              t("productions.production", "Production"),
              t("transport.route_short", "From → to"),
              t("transport.depart", "Departure"),
              t("transport.passengers", "Passengers"),
              t("transport.vehicle", "Vehicle"),
              t("transport.driver", "Driver"),
              t("transport.km", "Km"),
              t("common.status", "Status"),
            ]}
            rows={list.map((x) => [
              <Link
                className="font-mono underline"
                to={withId(ROUTES.TRANSPORT_DETAILS, x.uniqueId)}
              >
                {x.number}
              </Link>,
              <span>
                <span className="font-mono">{x.production}</span>{" "}
                {x.productionTitle}
              </span>,
              `${x.pickup} → ${x.destination}`,
              formatStamp(x.departAt),
              x.passengers,
              x.vehicle ?? "—",
              x.driver ?? "—",
              x.km ?? "",
              <ToneBadge code={x.status} />,
            ])}
            empty={t("transport.none", "No transport requested yet.")}
          />
        )}
      </Section>
    </div>
  )
}

export default TransportPage
