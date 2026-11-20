import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { ExcelImport } from "@/components/app/excel-import"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import { ROUTES } from "@/routes/routeConstants"
import { fetchDepartments, type Department } from "@/services/org"
import { importClient } from "@/services/products"

const client = importClient("products")

const ProductImportPage = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<Department[]>([])
  const [dept, setDept] = useState(user?.department.uniqueId ?? "")
  useEffect(() => {
    if (hasPermission(user, P.DEPARTMENT_VIEW))
      void fetchDepartments().then(setDepartments)
  }, [user])
  const own = useMemo(
    () =>
      departments.filter(
        (d) =>
          d.uniqueId === user?.department.uniqueId ||
          d.parent?.uniqueId === user?.department.uniqueId
      ),
    [departments, user]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("products.import_title", "Import products")}
        description={t(
          "products.import_subtitle",
          "Your department's products from the Excel template. Imported products are submitted for activation straight away."
        )}
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.PRODUCTS}>
              {t("products.back", "Back to products")}
            </Link>
          </Button>
        }
      />
      <ExcelImport
        client={client}
        ready={!!dept}
        selector={
          own.length > 1 ? (
            <Card>
              <CardContent>
                <Field className="max-w-sm">
                  <FieldLabel htmlFor="imp-dept">
                    {t("products.owner", "Owning department")}
                  </FieldLabel>
                  <NativeSelect
                    id="imp-dept"
                    className="w-full"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  >
                    {own.map((d) => (
                      <NativeSelectOption key={d.uniqueId} value={d.uniqueId}>
                        {d.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </CardContent>
            </Card>
          ) : undefined
        }
        templateQuery={`departmentUniqueId=${dept}`}
        templateName="azamtv-products.xlsx"
        templateHint={t(
          "products.template_hint",
          "Sheets for products, specifications and receiving criteria, with today's categories and their criteria library."
        )}
        uploadFields={{ departmentUniqueId: dept }}
        previewColumns={[
          { key: "row", label: t("import.row", "Row") },
          { key: "key", label: t("products.key", "Key"), mono: true },
          { key: "name", label: t("common.name", "Name") },
          { key: "category", label: t("products.category", "Category") },
          { key: "unit", label: t("products.unit_short", "Unit") },
          { key: "specs", label: t("products.specs_count", "Specs") },
          { key: "criteria", label: t("products.criteria_count", "Criteria") },
        ]}
        commitLabel={t("products.import_commit", "Create and submit")}
        commitTitle={t(
          "products.import_commit_title",
          "Create these products?"
        )}
        commitHint={(r) =>
          t(
            "products.import_commit_hint",
            "{{n}} products will be created for your department and submitted for activation, in one step.",
            { n: r.createCount }
          )
        }
        committedHint={t(
          "products.import_committed",
          "Created and submitted for activation."
        )}
        onCommitted={() => navigate(`${ROUTES.PRODUCTS}?pending=yes`)}
      />
    </div>
  )
}

export default ProductImportPage
