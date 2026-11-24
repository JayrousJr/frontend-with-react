import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import { fetchBookings } from "@/services/production"
import { Loading, Section, SimpleTable } from "./ui"
import { useLoad } from "./utils"

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_OUT",
  "RETURNED",
  "REJECTED",
  "CANCELLED",
]

/** Equipment bookings: storekeepers see their store, HODs their department. */
const BookingsPage = () => {
  const { t } = useTranslation()
  const [status, setStatus] = useState("")
  const rows = useLoad(
    () => fetchBookings({ status: status || undefined }),
    [status]
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bookings.title", "Equipment bookings")}
        description={t(
          "bookings.subtitle",
          "Production equipment booked from the Store: confirm (reserve), check out, receive returns."
        )}
      />
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
      <Section title={t("bookings.list", "Bookings")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("bookings.number", "Booking"),
              t("productions.production", "Production"),
              t("bookings.store", "Store"),
              t("productions.department", "Department"),
              t("bookings.period", "Period"),
              t("bookings.items", "Items"),
              t("common.status", "Status"),
            ]}
            rows={rows.data.map((b) => [
              <Link
                className="font-mono underline"
                to={withId(ROUTES.EQUIPMENT_BOOKING_DETAILS, b.uniqueId)}
              >
                {b.number}
              </Link>,
              <span>
                <span className="font-mono">{b.production}</span>{" "}
                {b.productionTitle}
              </span>,
              b.store,
              b.department,
              `${formatStamp(b.fromAt)} – ${formatStamp(b.toAt)}`,
              b.items,
              <ToneBadge code={b.status} />,
            ])}
            empty={t("bookings.none", "No bookings yet.")}
          />
        )}
      </Section>
    </div>
  )
}

export default BookingsPage
