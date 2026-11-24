import { useState } from "react"
import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  CarIcon,
  CheckIcon,
  FlagIcon,
  PencilIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatDay, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import {
  allocateTrip,
  cancelTrip,
  completeTrip,
  decideTrip,
  departTrip,
  fetchTrip,
  fetchTripResources,
  updateTrip,
  type Trip,
} from "@/services/production"
import {
  Conflicts,
  FormDialog,
  Info,
  Loading,
  Section,
  SimpleTable,
} from "./ui"
import { TripFields, type TripForm } from "./transport-form"
import { fromLocal, toLocal, useLoad } from "./utils"

function Allocate({
  trip,
  onClose,
  onDone,
}: {
  trip: Trip
  onClose: () => void
  onDone: (t: Trip) => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const res = useLoad(() => fetchTripResources(trip.uniqueId), [trip.uniqueId])
  const [vehicle, setVehicle] = useState<number | null>(
    trip.vehicle?.assetId ?? null
  )
  const [driver, setDriver] = useState<number | null>(
    trip.driver?.employeeId ?? null
  )
  const [note, setNote] = useState("")
  return (
    <FormDialog
      wide
      title={t("transport.allocate", "Allocate vehicle and driver")}
      description={t(
        "transport.allocate_hint",
        "Hard conflicts (red) block; seats are checked against the passengers."
      )}
      confirmLabel={t("transport.allocate_btn", "Allocate")}
      canConfirm={!!vehicle && !!driver}
      onClose={onClose}
      onConfirm={() =>
        run(
          async () =>
            onDone(
              await allocateTrip(trip.uniqueId, {
                vehicleAssetId: vehicle!,
                driverEmployeeId: driver!,
                note: note || null,
              })
            ),
          t("transport.allocated", "Allocated")
        )
      }
    >
      {!res.data ? (
        <Loading error={res.error} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {t("transport.vehicles", "Vehicles")}
            </div>
            {res.data.vehicles.map((v) => (
              <button
                key={v.assetId}
                type="button"
                disabled={!v.available}
                onClick={() => setVehicle(v.assetId)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm disabled:opacity-60 ${vehicle === v.assetId ? "border-primary bg-muted" : "hover:bg-muted"}`}
              >
                <div className="font-medium">
                  {v.registrationNumber}{" "}
                  <span className="text-xs text-muted-foreground">
                    {v.name}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {v.seats ?? "?"} {t("transport.seats", "seats")}
                  {!v.enoughSeats && (
                    <span className="text-amber-700">
                      {" "}
                      · {t("transport.few_seats", "not enough seats")}
                    </span>
                  )}
                </div>
                <Conflicts items={v.conflicts} />
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {t("transport.drivers", "Drivers")}
            </div>
            {res.data.drivers.map((d) => (
              <button
                key={d.employeeId}
                type="button"
                disabled={!d.available}
                onClick={() => setDriver(d.employeeId)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm disabled:opacity-60 ${driver === d.employeeId ? "border-primary bg-muted" : "hover:bg-muted"}`}
              >
                <div className="font-medium">{d.name}</div>
                <div
                  className={`text-xs ${d.licenceExpired ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {d.licenceNumber} ({d.licenceClass}) ·{" "}
                  {t("transport.expires", "expires")}{" "}
                  {formatDay(d.licenceExpiry)} · {d.phone}
                </div>
                <Conflicts items={d.conflicts} />
              </button>
            ))}
            {!res.data.drivers.length && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "transport.no_drivers",
                  "No driver profiles. Add them on the employee record."
                )}
              </p>
            )}
          </div>
        </div>
      )}
      <Input
        placeholder={t("common.note", "Note")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </FormDialog>
  )
}

const TripDetailsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const x = useLoad(() => fetchTrip(uniqueId), [uniqueId])
  const [dialog, setDialog] = useState<
    null | "allocate" | "reject" | "cancel" | "edit" | "depart" | "complete"
  >(null)
  const [reason, setReason] = useState("")
  const [form, setForm] = useState<TripForm | null>(null)
  const [rec, setRec] = useState({
    at: "",
    odo: "",
    arriveAt: "",
    returnAt: "",
    fuel: "",
    report: "",
  })
  if (!x.data) return <Loading error={x.error} />
  const d = x.data
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{d.number}</span>
            {d.pickup} → {d.destination}
            <ToneBadge code={d.status} />
          </span>
        }
        description={
          <Link
            className="underline"
            to={withId(ROUTES.PRODUCTION_DETAILS, d.productionUniqueId)}
          >
            {d.production} {d.productionTitle}
          </Link>
        }
        actions={
          <span className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <PrinterIcon />
              {t("transport.trip_sheet", "Trip sheet")}
            </Button>
            {d.can.allocate && (
              <Button
                size="sm"
                variant={d.vehicle ? "outline" : "default"}
                onClick={() => setDialog("allocate")}
              >
                <CarIcon />
                {d.vehicle
                  ? t("transport.reallocate", "Change allocation")
                  : t("transport.allocate", "Allocate vehicle and driver")}
              </Button>
            )}
            {d.can.decide && (
              <>
                <Button
                  size="sm"
                  disabled={!d.vehicle || !d.driver}
                  onClick={() =>
                    run(
                      async () => {
                        await decideTrip(d.uniqueId, "APPROVE")
                        setTimeout(x.reload, 1500)
                      },
                      t("transport.confirmed", "Transport confirmed")
                    )
                  }
                >
                  <CheckIcon />
                  {t("transport.confirm", "Confirm")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReason("")
                    setDialog("reject")
                  }}
                >
                  <XIcon />
                  {t("transport.reject", "Reject")}
                </Button>
              </>
            )}
            {d.can.edit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setForm({
                    departmentId: d.departmentId ? String(d.departmentId) : "",
                    pickup: d.pickup,
                    destination: d.destination,
                    route: d.route ?? "",
                    departAt: toLocal(d.departAt),
                    returnAt: toLocal(d.returnAt),
                    passengers: String(d.passengers),
                    equipmentNote: d.equipmentNote ?? "",
                    instructions: d.instructions ?? "",
                  })
                  setDialog("edit")
                }}
              >
                <PencilIcon />
                {t("actions.edit", "Edit")}
              </Button>
            )}
            {d.can.depart && (
              <Button
                size="sm"
                onClick={() => {
                  setRec({ ...rec, at: toLocal(new Date().toISOString()) })
                  setDialog("depart")
                }}
              >
                <FlagIcon />
                {t("transport.departed", "Record departure")}
              </Button>
            )}
            {d.can.complete && (
              <Button
                size="sm"
                onClick={() => {
                  setRec({
                    ...rec,
                    odo: "",
                    returnAt: toLocal(new Date().toISOString()),
                  })
                  setDialog("complete")
                }}
              >
                <CheckIcon />
                {t("transport.complete", "Complete trip")}
              </Button>
            )}
            {d.can.cancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setReason("")
                  setDialog("cancel")
                }}
              >
                {t("actions.cancel", "Cancel")}
              </Button>
            )}
          </span>
        }
      />
      <Section title={t("transport.request_details", "Request")}>
        <Info
          items={[
            [t("transport.depart", "Departure"), formatStamp(d.departAt)],
            [t("transport.return", "Expected return"), formatStamp(d.returnAt)],
            [t("transport.passengers", "Passengers"), d.passengers],
            [t("transport.route", "Route"), d.route],
            [t("transport.equipment", "Equipment to carry"), d.equipmentNote],
            [
              t("transport.instructions", "Special instructions"),
              d.instructions,
            ],
            [t("productions.department", "Department"), d.department],
            [t("transport.requested_by", "Requested by"), d.requestedBy],
            [t("transport.reject_reason", "Rejected"), d.rejectReason],
            [t("transport.cancel_reason", "Cancelled"), d.cancelReason],
          ]}
        />
      </Section>
      <Section title={t("transport.allocation", "Allocation")}>
        <Info
          items={[
            [
              t("transport.vehicle", "Vehicle"),
              d.vehicle
                ? `${d.vehicle.registrationNumber} · ${d.vehicle.name} (${d.vehicle.tag})`
                : "—",
            ],
            [
              t("transport.driver", "Driver"),
              d.driver ? `${d.driver.name} · ${d.driver.phone}` : "—",
            ],
            [
              t("transport.licence", "Licence"),
              d.driver
                ? `${d.driver.licenceNumber} · ${formatDay(d.driver.licenceExpiry)}`
                : null,
            ],
            [
              t("transport.allocated_by", "Allocated by"),
              d.allocatedBy
                ? `${d.allocatedBy} · ${formatStamp(d.allocatedAt)}`
                : null,
            ],
          ]}
        />
      </Section>
      {(d.actualDepartAt || d.status === "COMPLETED") && (
        <Section title={t("transport.trip_record", "Trip record")}>
          <Info
            items={[
              [
                t("transport.actual_depart", "Departed"),
                formatStamp(d.actualDepartAt),
              ],
              [
                t("transport.arrived", "Arrived"),
                d.actualArriveAt ? formatStamp(d.actualArriveAt) : null,
              ],
              [
                t("transport.returned", "Returned"),
                d.actualReturnAt ? formatStamp(d.actualReturnAt) : null,
              ],
              [
                t("transport.odometer", "Odometer"),
                d.odometerStart != null
                  ? `${d.odometerStart} → ${d.odometerEnd ?? "…"}`
                  : null,
              ],
              [t("transport.km", "Km"), d.km],
              [t("transport.fuel", "Fuel (litres)"), d.fuelLitres],
              [t("transport.driver_report", "Driver report"), d.driverReport],
            ]}
          />
        </Section>
      )}
      {d.changes.length > 0 && (
        <Section title={t("transport.changes", "Changes")}>
          <SimpleTable
            head={[
              t("common.date", "Date"),
              t("common.by", "By"),
              t("transport.change", "Change"),
            ]}
            rows={d.changes.map((c) => [formatStamp(c.at), c.by, c.what])}
          />
        </Section>
      )}

      {dialog === "allocate" && (
        <Allocate
          trip={d}
          onClose={() => setDialog(null)}
          onDone={(v) => x.set(v)}
        />
      )}
      {(dialog === "reject" || dialog === "cancel") && (
        <FormDialog
          title={
            dialog === "reject"
              ? t("transport.reject", "Reject")
              : t("transport.cancel", "Cancel trip")
          }
          confirmLabel={
            dialog === "reject"
              ? t("transport.reject", "Reject")
              : t("transport.cancel", "Cancel trip")
          }
          destructive
          canConfirm={!!reason.trim()}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            dialog === "reject"
              ? run(async () => {
                  await decideTrip(d.uniqueId, "REJECT", reason)
                  setTimeout(x.reload, 1500)
                })
              : run(async () => x.set(await cancelTrip(d.uniqueId, reason)))
          }
        >
          <Textarea
            rows={3}
            placeholder={t("common.reason", "Reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormDialog>
      )}
      {dialog === "edit" && form && (
        <FormDialog
          wide
          title={t("transport.edit", "Change transport arrangement")}
          description={t(
            "transport.edit_hint",
            "Changes are recorded; the driver and departments are told when the trip is confirmed."
          )}
          confirmLabel={t("actions.save", "Save")}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            run(async () =>
              x.set(
                await updateTrip(d.uniqueId, {
                  departmentId: form.departmentId
                    ? Number(form.departmentId)
                    : null,
                  pickup: form.pickup,
                  destination: form.destination,
                  route: form.route || null,
                  departAt: fromLocal(form.departAt)!,
                  returnAt: fromLocal(form.returnAt)!,
                  passengers: Number(form.passengers) || 0,
                  equipmentNote: form.equipmentNote || null,
                  instructions: form.instructions || null,
                })
              )
            )
          }
        >
          <TripFields f={form} onChange={setForm} />
        </FormDialog>
      )}
      {dialog === "depart" && (
        <FormDialog
          title={t("transport.departed", "Record departure")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={rec.odo !== "" && Number(rec.odo) >= 0}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            run(async () =>
              x.set(
                await departTrip(d.uniqueId, {
                  at: fromLocal(rec.at),
                  odometerStart: Number(rec.odo),
                })
              )
            )
          }
        >
          <Field>
            <FieldLabel>{t("transport.actual_depart", "Departed")}</FieldLabel>
            <Input
              type="datetime-local"
              value={rec.at}
              onChange={(e) => setRec({ ...rec, at: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>
              {t("transport.odometer_start", "Odometer at departure (km)")}
            </FieldLabel>
            <Input
              type="number"
              min={0}
              value={rec.odo}
              onChange={(e) => setRec({ ...rec, odo: e.target.value })}
            />
          </Field>
        </FormDialog>
      )}
      {dialog === "complete" && (
        <FormDialog
          title={t("transport.complete", "Complete trip")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            rec.odo !== "" && Number(rec.odo) >= (d.odometerStart ?? 0)
          }
          onClose={() => setDialog(null)}
          onConfirm={() =>
            run(async () =>
              x.set(
                await completeTrip(d.uniqueId, {
                  arriveAt: fromLocal(rec.arriveAt),
                  returnAt: fromLocal(rec.returnAt),
                  odometerEnd: Number(rec.odo),
                  fuelLitres: rec.fuel ? Number(rec.fuel) : null,
                  driverReport: rec.report || null,
                })
              )
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>
                {t("transport.arrived", "Arrived at destination")}
              </FieldLabel>
              <Input
                type="datetime-local"
                value={rec.arriveAt}
                onChange={(e) => setRec({ ...rec, arriveAt: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("transport.returned", "Returned")}</FieldLabel>
              <Input
                type="datetime-local"
                value={rec.returnAt}
                onChange={(e) => setRec({ ...rec, returnAt: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>
                {t("transport.odometer_end", "Odometer at return (km)")}
              </FieldLabel>
              <Input
                type="number"
                min={d.odometerStart ?? 0}
                value={rec.odo}
                onChange={(e) => setRec({ ...rec, odo: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("transport.fuel", "Fuel (litres)")}</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={rec.fuel}
                onChange={(e) => setRec({ ...rec, fuel: e.target.value })}
              />
            </Field>
          </div>
          <Textarea
            rows={2}
            placeholder={t("transport.driver_report", "Driver report")}
            value={rec.report}
            onChange={(e) => setRec({ ...rec, report: e.target.value })}
          />
        </FormDialog>
      )}
    </div>
  )
}

export default TripDetailsPage
