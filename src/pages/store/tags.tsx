import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { useTranslation } from "react-i18next"
import { PrinterIcon, TicketPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/app/page-header"
import { useRun } from "@/components/app/use-run"
import { formatStamp } from "@/lib/format"
import { fetchCategories, type Category } from "@/services/products"
import {
  fetchUnusedTags,
  issueTags,
  markTagsPrinted,
  type AssetTag,
} from "@/services/store"
import { TagLabel } from "./tag-label"

/**
 * Tagging campaign step 2 (B2 §12): issue tags per category series, print
 * them (QR + readable code), stick them on during the count. Also prints
 * tags of existing assets (?tags=A,B&captions=…).
 */
const TagsPage = () => {
  const { t } = useTranslation()
  const run = useRun()
  const [params] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState("")
  const [count, setCount] = useState("20")
  const [unused, setUnused] = useState<AssetTag[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fromAssets = (params.get("tags") ?? "").split(",").filter(Boolean)
  const captions = (params.get("captions") ?? "").split("|")

  const reload = () => void fetchUnusedTags().then(setUnused)
  useEffect(() => {
    void fetchCategories().then(setCategories)
    reload()
  }, [])

  const toPrint = fromAssets.length ? fromAssets : [...selected]

  async function print() {
    window.print()
    await run(() => markTagsPrinted(toPrint))
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <PageHeader
          title={t("tags.title", "Asset tags")}
          description={t(
            "tags.subtitle",
            "Issue tags before the tagging campaign and print them. Each tag is used once; scanning its QR code opens the asset."
          )}
          actions={
            <Button disabled={!toPrint.length} onClick={print}>
              <PrinterIcon />
              {t("tags.print_n", "Print {{n}} tags", { n: toPrint.length })}
            </Button>
          }
        />
        {!fromAssets.length && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("tags.issue", "Issue new tags")}</CardTitle>
                <CardDescription>
                  {t(
                    "tags.issue_hint",
                    "Numbers continue the category's series (AZM-CAM-000124…)."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field>
                  <FieldLabel htmlFor="t-cat">
                    {t("products.category", "Category")}
                  </FieldLabel>
                  <NativeSelect
                    id="t-cat"
                    className="w-full"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <NativeSelectOption value="">
                      {t("common.choose", "— Choose —")}
                    </NativeSelectOption>
                    {categories.map((c) => (
                      <NativeSelectOption key={c.uniqueId} value={c.uniqueId}>
                        {c.name} (AZM-{c.tagPrefix})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="t-n">
                    {t("tags.count", "How many")}
                  </FieldLabel>
                  <Input
                    id="t-n"
                    type="number"
                    min={1}
                    max={500}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={
                    !category || !(Number(count) >= 1 && Number(count) <= 500)
                  }
                  onClick={() =>
                    run(
                      async () => {
                        const tags = await issueTags(category, Number(count))
                        setSelected(new Set(tags.map((x) => x.tag)))
                        reload()
                      },
                      t("tags.issued", "Tags issued")
                    )
                  }
                >
                  <TicketPlusIcon />
                  {t("tags.issue_button", "Issue tags")}
                </Button>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>
                    {t("tags.unused", "Issued, not yet on an asset")}
                  </CardTitle>
                  <CardDescription>
                    {t("tags.unused_hint", "Tick the tags to print.")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelected(new Set(unused.map((x) => x.tag)))
                    }
                  >
                    {t("tags.select_all", "Select all")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(new Set())}
                  >
                    {t("tags.clear", "Clear")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-auto">
                {unused.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("tags.none", "No unused tags.")}
                  </p>
                ) : (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {unused.map((x) => (
                      <label
                        key={x.tag}
                        className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={selected.has(x.tag)}
                          onCheckedChange={(on) =>
                            setSelected((prev) => {
                              const next = new Set(prev)
                              if (on) next.add(x.tag)
                              else next.delete(x.tag)
                              return next
                            })
                          }
                        />
                        <span className="font-mono">{x.tag}</span>
                        <span className="text-xs text-muted-foreground">
                          {x.printedAt
                            ? t("tags.printed_on", "printed {{d}}", {
                                d: formatStamp(x.printedAt),
                              })
                            : t("tags.not_printed", "not printed")}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {toPrint.length > 0 && (
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("tags.preview", "Print preview")}
          </h2>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 print:grid-cols-3 print:gap-1">
        {toPrint.map((tag, i) => (
          <TagLabel
            key={tag}
            tag={tag}
            caption={fromAssets.length ? captions[i] : null}
          />
        ))}
      </div>
    </div>
  )
}

export default TagsPage
