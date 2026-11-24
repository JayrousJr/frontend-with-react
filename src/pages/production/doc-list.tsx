import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { ArchiveIcon, FileUpIcon, HistoryIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToneBadge } from "@/components/app/tone-badge"
import { useRun } from "@/components/app/use-run"
import { formatFileSize, formatStamp } from "@/lib/format"
import { ROUTES, withId } from "@/routes/routeConstants"
import type { UploadedFile } from "@/services/products"
import {
  archiveDocument,
  fetchDocumentVersions,
  newDocumentVersion,
  openDocument,
  type ProductionDocument,
} from "@/services/production"
import { FileUpload, FormDialog, Loading, SimpleTable } from "./ui"
import { useLoad } from "./utils"

function Versions({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation()
  const v = useLoad(() => fetchDocumentVersions(id), [id])
  return (
    <FormDialog
      wide
      title={t("docs.versions", "Version history")}
      confirmLabel={t("actions.close", "Close")}
      onClose={onClose}
      onConfirm={async () => true}
    >
      {!v.data ? (
        <Loading error={v.error} />
      ) : (
        <SimpleTable
          head={[
            "v",
            t("docs.file", "File"),
            t("docs.change", "Change"),
            t("docs.uploaded", "Uploaded"),
            "",
          ]}
          rows={v.data.map((d) => [
            d.version,
            d.filename,
            d.changeNote ?? t("docs.original", "Original"),
            `${d.uploadedBy} · ${formatStamp(d.createdAt)}`,
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openDocument(d.uniqueId)}
            >
              {t("docs.open", "Open")}
            </Button>,
          ])}
        />
      )}
    </FormDialog>
  )
}

/** Documents table shared by the production tab and the documents page. */
export function DocList({
  docs,
  showProduction,
  canUpload,
  canArchive,
  onChange,
}: {
  docs: ProductionDocument[]
  showProduction?: boolean
  canUpload?: boolean
  canArchive?: boolean
  onChange?: () => void
}) {
  const { t } = useTranslation()
  const run = useRun()
  const [versions, setVersions] = useState<string | null>(null)
  const [nv, setNv] = useState<{
    id: string
    files: UploadedFile[]
    note: string
  } | null>(null)
  return (
    <>
      <SimpleTable
        head={[
          ...(showProduction ? [t("docs.production", "Production")] : []),
          t("docs.category", "Category"),
          t("docs.title", "Title"),
          t("docs.version", "Version"),
          t("docs.uploaded", "Uploaded"),
          t("common.status", "Status"),
          "",
        ]}
        rows={docs.map((d) => [
          ...(showProduction
            ? [
                <Link
                  className="font-mono underline"
                  to={withId(ROUTES.PRODUCTION_DETAILS, d.productionUniqueId)}
                >
                  {d.production}
                </Link>,
              ]
            : []),
          d.category,
          <button
            type="button"
            className="text-left underline"
            onClick={() => openDocument(d.uniqueId)}
          >
            {d.title}
            <span className="block text-xs text-muted-foreground no-underline">
              {d.filename} · {formatFileSize(d.size)}
              {d.reference && ` · ${d.reference}`}
              {d.department && ` · ${d.department}`}
            </span>
          </button>,
          `v${d.version}`,
          `${d.uploadedBy} · ${formatStamp(d.createdAt)}`,
          d.archived ? (
            <ToneBadge code="ARCHIVED" />
          ) : (
            <ToneBadge code={d.approvalStatus} />
          ),
          <span className="flex gap-1 whitespace-nowrap">
            <Button
              size="icon"
              variant="ghost"
              title={t("docs.versions", "Version history")}
              onClick={() => setVersions(d.uniqueId)}
            >
              <HistoryIcon />
            </Button>
            {canUpload && d.isLatest && !d.archived && (
              <Button
                size="icon"
                variant="ghost"
                title={t("docs.new_version", "New version")}
                onClick={() => setNv({ id: d.uniqueId, files: [], note: "" })}
              >
                <FileUpIcon />
              </Button>
            )}
            {canArchive && !d.archived && (
              <Button
                size="icon"
                variant="ghost"
                title={t("docs.archive", "Archive")}
                onClick={() =>
                  run(
                    async () => {
                      await archiveDocument(d.uniqueId)
                      onChange?.()
                    },
                    t("docs.archived", "Archived (kept, read-only)")
                  )
                }
              >
                <ArchiveIcon />
              </Button>
            )}
          </span>,
        ])}
        empty={t("docs.none", "No documents.")}
      />
      {versions && <Versions id={versions} onClose={() => setVersions(null)} />}
      {nv && (
        <FormDialog
          title={t("docs.new_version", "New version")}
          description={t(
            "docs.new_version_hint",
            "The current version is kept in the history."
          )}
          confirmLabel={t("docs.upload", "Upload")}
          canConfirm={nv.files.length === 1 && !!nv.note.trim()}
          onClose={() => setNv(null)}
          onConfirm={async () => {
            const ok = await run(
              () =>
                newDocumentVersion(nv.id, {
                  fileUniqueId: nv.files[0].uniqueId,
                  changeNote: nv.note,
                }),
              t("common.saved", "Saved")
            )
            if (ok) onChange?.()
            return ok
          }}
        >
          <FileUpload
            folder="production"
            multiple={false}
            files={nv.files}
            onChange={(files) => setNv({ ...nv, files })}
          />
          <Input
            placeholder={t("docs.change_note", "What changed")}
            value={nv.note}
            onChange={(e) => setNv({ ...nv, note: e.target.value })}
          />
        </FormDialog>
      )}
    </>
  )
}
