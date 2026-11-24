import { useState } from "react"
import { useTranslation } from "react-i18next"
import { UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { P, hasPermission } from "@/lib/permissions"
import type { UploadedFile } from "@/services/products"
import {
  fetchConfig,
  fetchDocuments,
  uploadDocument,
  type Production,
} from "@/services/production"
import { FileUpload, FormDialog, Loading, Section } from "./ui"
import { DocList } from "./doc-list"
import { useLoad } from "./utils"

type Up = {
  category: string
  title: string
  description: string
  reference: string
  departmentId: string
  docDate: string
  files: UploadedFile[]
}

export function DocumentsTab({ p }: { p: Production }) {
  const { t } = useTranslation()
  const run = useRun()
  const { user } = useAuth()
  const cfg = useLoad(fetchConfig)
  const [archived, setArchived] = useState(false)
  const docs = useLoad(
    () => fetchDocuments({ production: p.uniqueId, archived }),
    [p.uniqueId, archived]
  )
  const [up, setUp] = useState<Up | null>(null)
  const canUpload =
    hasPermission(user, P.PRODUCTION_DOC_UPLOAD) && p.status !== "CLOSED"
  return (
    <Section
      title={t("docs.title", "Production documents")}
      description={t(
        "docs.hint",
        "Kept forever: updates become new versions, deleting archives (read-only, searchable)."
      )}
      actions={
        <>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={archived}
              onCheckedChange={(c) => setArchived(c === true)}
            />
            {t("docs.show_archived", "Show archived")}
          </label>
          {canUpload && (
            <Button
              size="sm"
              onClick={() =>
                setUp({
                  category: cfg.data?.documentCategories[0] ?? "",
                  title: "",
                  description: "",
                  reference: "",
                  departmentId: "",
                  docDate: "",
                  files: [],
                })
              }
            >
              <UploadIcon />
              {t("docs.upload", "Upload")}
            </Button>
          )}
        </>
      }
    >
      {!docs.data ? (
        <Loading error={docs.error} />
      ) : (
        <DocList
          docs={docs.data}
          canUpload={canUpload}
          canArchive={canUpload}
          onChange={docs.reload}
        />
      )}
      {up && cfg.data && (
        <FormDialog
          title={t("docs.upload", "Upload")}
          confirmLabel={t("docs.upload", "Upload")}
          canConfirm={!!up.title.trim() && up.files.length === 1}
          onClose={() => setUp(null)}
          onConfirm={async () => {
            const ok = await run(
              () =>
                uploadDocument(p.uniqueId, {
                  category: up.category,
                  title: up.title,
                  description: up.description || null,
                  reference: up.reference || null,
                  departmentId: up.departmentId
                    ? Number(up.departmentId)
                    : null,
                  docDate: up.docDate || null,
                  fileUniqueId: up.files[0].uniqueId,
                }),
              t("docs.uploaded_ok", "Document uploaded")
            )
            if (ok) docs.reload()
            return ok
          }}
        >
          <Field>
            <FieldLabel>{t("docs.category", "Category")}</FieldLabel>
            <NativeSelect
              className="w-full"
              value={up.category}
              onChange={(e) => setUp({ ...up, category: e.target.value })}
            >
              {cfg.data.documentCategories.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>{t("docs.title", "Title")}</FieldLabel>
            <Input
              value={up.title}
              onChange={(e) => setUp({ ...up, title: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel>{t("docs.reference", "Reference")}</FieldLabel>
              <Input
                value={up.reference}
                onChange={(e) => setUp({ ...up, reference: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("docs.date", "Date")}</FieldLabel>
              <Input
                type="date"
                value={up.docDate}
                onChange={(e) => setUp({ ...up, docDate: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>
                {t("productions.department", "Department")}
              </FieldLabel>
              <NativeSelect
                className="w-full"
                value={up.departmentId}
                onChange={(e) => setUp({ ...up, departmentId: e.target.value })}
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {p.departments.map((d) => (
                  <NativeSelectOption
                    key={d.departmentId}
                    value={String(d.departmentId)}
                  >
                    {d.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Textarea
            rows={2}
            placeholder={t("docs.description", "Description")}
            value={up.description}
            onChange={(e) => setUp({ ...up, description: e.target.value })}
          />
          <FileUpload
            folder="production"
            multiple={false}
            files={up.files}
            onChange={(files) => setUp({ ...up, files })}
          />
        </FormDialog>
      )}
    </Section>
  )
}
