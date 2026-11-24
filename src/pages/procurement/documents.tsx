import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRun } from "@/components/app/use-run"
import { useAuth } from "@/context/auth-context"
import { formatStamp } from "@/lib/format"
import { P, hasPermission } from "@/lib/permissions"
import type { UploadedFile } from "@/services/products"
import { attachDocument, fetchDocuments } from "@/services/procurement"
import { FileUpload, Files } from "./shared"
import { useLoad } from "./shared-utils"

/** Documents uploaded at any stage (purchase file). */
export function Documents({ type, id }: { type: string; id: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const run = useRun()
  const docs = useLoad(() => fetchDocuments(type, id), [type, id])
  const [docType, setDocType] = useState("")
  const [files, setFiles] = useState<UploadedFile[]>([])
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("documents.title", "Documents")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {(docs.data ?? []).length === 0 && (
          <p className="text-muted-foreground">—</p>
        )}
        {docs.data?.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{d.docType}</span>
            <Files files={[d.file]} />
            <span className="text-xs text-muted-foreground">
              {d.uploadedBy} · {formatStamp(d.createdAt)}
            </span>
          </div>
        ))}
        {hasPermission(user, P.PROC_DOC_UPLOAD) && (
          <div className="grid gap-2 border-t pt-3 sm:grid-cols-[12rem_1fr_auto]">
            <Input
              placeholder={t("documents.type", "Document type")}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            />
            <FileUpload multiple={false} files={files} onChange={setFiles} />
            <Button
              size="sm"
              disabled={!files.length || !docType.trim()}
              onClick={() =>
                run(
                  async () => {
                    docs.set(
                      await attachDocument(type, id, docType, files[0].uniqueId)
                    )
                    setFiles([])
                    setDocType("")
                  },
                  t("documents.added", "Document added")
                )
              }
            >
              {t("documents.add", "Add")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
