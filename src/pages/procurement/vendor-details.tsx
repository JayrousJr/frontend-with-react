import { useState } from "react"
import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { BanIcon, PencilIcon, RefreshCwIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatDay, formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import {
  createVendorAdmin,
  fetchVendor,
  renewVendor,
  resendVendorActivation,
  resetVendorUser2fa,
  setVendorStatus,
  setVendorUserActive,
  updateVendor,
  type Vendor,
  type VendorInput,
} from "@/services/procurement"
import { FormDialog, Info, Loading } from "./shared"
import { useLoad } from "./shared-utils"
import { VendorForm } from "./vendors"

const showLink = (link: string | null, msg: string) => {
  if (!link) return
  toast.info(msg, { description: link, duration: 60000 })
  console.info("Vendor activation link:", link)
}

const VendorDetailsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const { uniqueId = "" } = useParams()
  const v = useLoad(() => fetchVendor(uniqueId), [uniqueId])
  const [edit, setEdit] = useState<VendorInput | null>(null)
  const [admin, setAdmin] = useState<{
    fullName: string
    email: string
    phone: string
  } | null>(null)
  const [status, setStatus] = useState<{
    status: Vendor["status"]
    reason: string
  } | null>(null)
  if (!v.data) return <Loading error={v.error} />
  const d = v.data
  const devMsg = t(
    "vendors.dev_link",
    "Development: no mail server — activation link shown here"
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {d.name}
            <ToneBadge
              code={d.expired && d.status === "ACTIVE" ? "EXPIRED" : d.status}
            />
          </span>
        }
        description={`${d.number} · ${d.canBid ? t("vendors.can_bid", "Can bid") : t("vendors.cannot_bid", "Cannot bid")}`}
        actions={
          <>
            {hasPermission(user, P.VENDOR_MANAGE) && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    setEdit({
                      name: d.name,
                      email: d.email,
                      tin: d.tin,
                      vrn: d.vrn,
                      phone: d.phone,
                      address: d.address,
                      contactPerson: d.contactPerson,
                      note: d.note,
                      categoryUniqueIds: d.categories.map((c) => c.uniqueId),
                    })
                  }
                >
                  <PencilIcon />
                  {t("actions.edit", "Edit")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    run(
                      async () => v.set(await renewVendor(d.uniqueId)),
                      t("vendors.renewed", "Registration renewed")
                    )
                  }
                >
                  <RefreshCwIcon />
                  {t("vendors.renew", "Renew 2 years")}
                </Button>
              </>
            )}
            {hasPermission(user, P.VENDOR_SUSPEND) && (
              <Button
                variant="outline"
                onClick={() =>
                  setStatus({
                    status: d.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                    reason: "",
                  })
                }
              >
                <BanIcon />
                {t("vendors.change_status", "Suspend / blacklist / reactivate")}
              </Button>
            )}
          </>
        }
      />
      <Card>
        <CardContent>
          <Info
            items={[
              [t("vendors.email", "Company email"), d.email],
              [t("vendors.tin", "TIN"), d.tin],
              [t("vendors.vrn", "VRN"), d.vrn],
              [t("vendors.phone", "Phone"), d.phone],
              [t("vendors.contact", "Contact person"), d.contactPerson],
              [t("vendors.address", "Address"), d.address],
              [
                t("vendors.registered_on", "Registered"),
                formatDay(d.registeredAt),
              ],
              [
                t("vendors.valid_until", "Valid until"),
                formatDay(d.validUntil),
              ],
              [
                t("vendors.categories_short", "Categories"),
                d.categories.map((c) => c.name).join(", "),
              ],
              [t("vendors.status_reason", "Status reason"), d.statusReason],
              [t("common.note", "Note"), d.note],
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("vendors.users", "Portal users")}</CardTitle>
          {hasPermission(user, P.VENDOR_CREATE_ADMIN) &&
            !d.users.some((u) => u.isAdmin) && (
              <Button
                size="sm"
                onClick={() =>
                  setAdmin({
                    fullName: d.contactPerson ?? "",
                    email: d.email,
                    phone: d.phone ?? "",
                  })
                }
              >
                <UserPlusIcon />
                {t("vendors.create_admin", "Create vendor admin")}
              </Button>
            )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="mb-3 text-xs text-muted-foreground">
            {t(
              "vendors.users_hint",
              "Procurement creates the first user (vendor admin); the vendor admin creates the vendor's other users on the portal. Authenticator 2FA is mandatory and set up at first sign-in."
            )}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name", "Name")}</TableHead>
                <TableHead>{t("common.status", "Status")}</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>{t("vendors.last_login", "Last sign-in")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.users.map((u) => (
                <TableRow key={u.uniqueId}>
                  <TableCell>
                    {u.fullName}{" "}
                    {u.isAdmin && (
                      <span className="text-xs text-muted-foreground">
                        ({t("vendors.admin", "admin")})
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ToneBadge code={u.status} />
                  </TableCell>
                  <TableCell>
                    {u.twoFactorEnabled
                      ? t("common.yes", "Yes")
                      : t("common.no", "No")}
                  </TableCell>
                  <TableCell>{formatStamp(u.lastLoginAt)}</TableCell>
                  <TableCell className="space-x-1 text-right whitespace-nowrap">
                    {u.status === "PENDING_ACTIVATION" &&
                      hasPermission(user, P.VENDOR_CREATE_ADMIN) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(
                              async () =>
                                showLink(
                                  (await resendVendorActivation(u.uniqueId))
                                    .devLink,
                                  devMsg
                                ),
                              t("vendors.link_sent", "Activation link sent")
                            )
                          }
                        >
                          {t("vendors.resend", "Resend link")}
                        </Button>
                      )}
                    {u.twoFactorEnabled &&
                      hasPermission(user, P.VENDOR_RESET_2FA) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(
                              async () => {
                                await resetVendorUser2fa(u.uniqueId)
                                v.reload()
                              },
                              t("vendors.2fa_reset", "Authenticator reset")
                            )
                          }
                        >
                          {t("vendors.reset_2fa", "Reset 2FA")}
                        </Button>
                      )}
                    {hasPermission(user, P.VENDOR_MANAGE) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(async () => {
                            await setVendorUserActive(
                              u.uniqueId,
                              u.status === "DEACTIVATED"
                            )
                            v.reload()
                          })
                        }
                      >
                        {u.status === "DEACTIVATED"
                          ? t("actions.activate", "Activate")
                          : t("actions.deactivate", "Deactivate")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {edit && (
        <FormDialog
          wide
          title={t("actions.edit", "Edit")}
          confirmLabel={t("actions.save", "Save")}
          canConfirm={
            !!edit.name.trim() &&
            edit.email.includes("@") &&
            edit.categoryUniqueIds.length > 0
          }
          onClose={() => setEdit(null)}
          onConfirm={() =>
            run(
              async () => v.set(await updateVendor(d.uniqueId, edit)),
              t("common.saved", "Saved")
            )
          }
        >
          <VendorForm value={edit} onChange={setEdit} />
        </FormDialog>
      )}
      {admin && (
        <FormDialog
          title={t("vendors.create_admin", "Create vendor admin")}
          description={t(
            "vendors.create_admin_hint",
            "An activation link (72 hours) is emailed to this person."
          )}
          confirmLabel={t("actions.create", "Create")}
          canConfirm={!!admin.fullName.trim() && admin.email.includes("@")}
          onClose={() => setAdmin(null)}
          onConfirm={() =>
            run(
              async () => {
                const r = await createVendorAdmin(d.uniqueId, admin)
                showLink(r.devLink, devMsg)
                v.reload()
              },
              t("vendors.admin_created", "Vendor admin created")
            )
          }
        >
          {(["fullName", "email", "phone"] as const).map((k) => (
            <Field key={k}>
              <FieldLabel htmlFor={`va-${k}`}>
                {k === "fullName"
                  ? t("common.name", "Name")
                  : k === "email"
                    ? t("vendors.email_login", "Email (sign-in)")
                    : t("vendors.phone", "Phone")}
              </FieldLabel>
              <Input
                id={`va-${k}`}
                value={admin[k]}
                onChange={(e) => setAdmin({ ...admin, [k]: e.target.value })}
              />
            </Field>
          ))}
        </FormDialog>
      )}
      {status && (
        <FormDialog
          title={t("vendors.change_status", "Suspend / blacklist / reactivate")}
          confirmLabel={t("actions.save", "Save")}
          destructive={status.status !== "ACTIVE"}
          canConfirm={
            status.status === "ACTIVE" || status.reason.trim().length >= 3
          }
          onClose={() => setStatus(null)}
          onConfirm={() =>
            run(
              async () =>
                v.set(
                  await setVendorStatus(
                    d.uniqueId,
                    status.status,
                    status.reason
                  )
                ),
              t("common.saved", "Saved")
            )
          }
        >
          <NativeSelect
            className="w-full"
            value={status.status}
            onChange={(e) =>
              setStatus({
                ...status,
                status: e.target.value as Vendor["status"],
              })
            }
          >
            <NativeSelectOption value="ACTIVE">
              {t("vendors.active", "Active")}
            </NativeSelectOption>
            <NativeSelectOption value="SUSPENDED">
              {t("vendors.suspended", "Suspended (read-only, cannot bid)")}
            </NativeSelectOption>
            <NativeSelectOption value="BLACKLISTED">
              {t("vendors.blacklisted", "Blacklisted (no sign-in)")}
            </NativeSelectOption>
          </NativeSelect>
          <Textarea
            rows={3}
            placeholder={t("common.reason", "Reason")}
            value={status.reason}
            onChange={(e) => setStatus({ ...status, reason: e.target.value })}
          />
        </FormDialog>
      )}
    </div>
  )
}

export default VendorDetailsPage
