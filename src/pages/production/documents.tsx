import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { PageHeader } from "@/components/app/page-header"
import { fetchConfig, fetchDocuments } from "@/services/production"
import { Loading, Section } from "./ui"
import { DocList } from "./doc-list"
import { useLoad } from "./utils"

/** Module 08: search documents across the productions you may see. */
const DocumentsPage = () => {
  const { t } = useTranslation()
  const cfg = useLoad(fetchConfig)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [archived, setArchived] = useState(false)
  const docs = useLoad(
    () => fetchDocuments({ search, category, archived }),
    [search, category, archived]
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("docs.all", "Production documents")}
        description={t(
          "docs.all_hint",
          "Kept forever. Upload and version documents on the production's Documents tab."
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-64"
          placeholder={t("docs.search", "Title, reference or production")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NativeSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <NativeSelectOption value="">
            {t("docs.all_categories", "All categories")}
          </NativeSelectOption>
          {cfg.data?.documentCategories.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {c}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={archived}
            onCheckedChange={(c) => setArchived(c === true)}
          />
          {t("docs.show_archived", "Show archived")}
        </label>
      </div>
      <Section title={t("docs.list", "Documents")}>
        {!docs.data ? (
          <Loading error={docs.error} />
        ) : (
          <DocList docs={docs.data} showProduction />
        )}
      </Section>
    </div>
  )
}

export default DocumentsPage
