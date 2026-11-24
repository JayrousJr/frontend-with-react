import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { ShieldCheckIcon, ShieldQuestionIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { formatStamp } from "@/lib/format"
import { openDocumentFile, searchDocuments } from "@/services/comms"
import { Loading, Section, SimpleTable } from "../production/ui"
import { useLoad } from "../production/utils"

/** Module 08 shared service: documents of the whole system in one search. */
const DocumentsPage = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [source, setSource] = useState("")
  const rows = useLoad(
    () => searchDocuments({ search, source }),
    [search, source]
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("documents.title", "Documents")}
        description={t(
          "documents.subtitle",
          "Production documents and purchase-file documents in one place, limited to what you may see. Kept forever; uploads are virus-scanned when a scanner is configured."
        )}
      />
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-72"
          placeholder={t(
            "documents.search",
            "Title, type, reference or file name"
          )}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NativeSelect
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("documents.all", "All sources")}
          </NativeSelectOption>
          <NativeSelectOption value="PRODUCTION">
            {t("documents.production", "Productions")}
          </NativeSelectOption>
          <NativeSelectOption value="PURCHASE_FILE">
            {t("documents.purchase", "Purchase files")}
          </NativeSelectOption>
        </NativeSelect>
      </div>
      <Section title={t("documents.results", "Results")}>
        {!rows.data ? (
          <Loading error={rows.error} />
        ) : (
          <SimpleTable
            head={[
              t("documents.document", "Document"),
              t("documents.type", "Type"),
              t("documents.belongs", "Belongs to"),
              t("documents.uploaded", "Uploaded"),
              t("documents.scan", "Scan"),
            ]}
            rows={rows.data.map((d) => [
              <button
                type="button"
                className="text-left underline"
                onClick={() => openDocumentFile(d.source, d.uniqueId)}
              >
                {d.title}
                {d.version && d.version > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    v{d.version}
                  </span>
                )}
                {d.archived && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    ({t("documents.archived", "archived")})
                  </span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {d.filename}
                </span>
              </button>,
              d.category,
              d.link ? (
                <Link className="underline" to={d.link}>
                  {d.reference}
                </Link>
              ) : (
                d.reference
              ),
              `${d.uploadedBy} · ${formatStamp(d.createdAt)}`,
              d.scanStatus === "CLEAN" ? (
                <ShieldCheckIcon
                  className="size-4 text-emerald-600"
                  aria-label="clean"
                />
              ) : (
                <ShieldQuestionIcon
                  className="size-4 text-muted-foreground"
                  aria-label="not scanned"
                />
              ),
            ])}
            empty={t("documents.none", "No documents found.")}
          />
        )}
      </Section>
    </div>
  )
}

export default DocumentsPage
