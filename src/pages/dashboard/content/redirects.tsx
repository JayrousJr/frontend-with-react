import { useLoaderData, useRevalidator } from "react-router"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createRedirect,
  deleteRedirect,
  type Redirect,
} from "@/services/content"

const RedirectsPage = () => {
  const { t } = useTranslation()
  const { redirects } = useLoaderData() as { redirects: { data: Redirect[] } }
  const revalidator = useRevalidator()
  const [fromPath, setFromPath] = useState("")
  const [toPath, setToPath] = useState("")
  const [saving, setSaving] = useState(false)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      toast.success(await createRedirect({ fromPath, toPath }))
      setFromPath("")
      setToPath("")
      void revalidator.revalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("general_error"))
    } finally {
      setSaving(false)
    }
  }

  async function remove(uniqueId: string) {
    try {
      toast.success(await deleteRedirect(uniqueId))
      void revalidator.revalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("general_error"))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("redirects.title")}</CardTitle>
        <CardDescription>{t("redirects.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form className="flex flex-wrap items-end gap-3" onSubmit={add}>
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor="fromPath">{t("redirects.from")}</FieldLabel>
            <Input
              id="fromPath"
              value={fromPath}
              onChange={(event) => setFromPath(event.target.value)}
              placeholder="/blog/old-slug"
              required
            />
          </Field>
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor="toPath">{t("redirects.to")}</FieldLabel>
            <Input
              id="toPath"
              value={toPath}
              onChange={(event) => setToPath(event.target.value)}
              placeholder="/blog/new-slug"
              required
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {t("redirects.add")}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("redirects.from")}</TableHead>
              <TableHead>{t("redirects.to")}</TableHead>
              <TableHead>{t("redirects.hits")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {redirects.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  {t("redirects.empty")}
                </TableCell>
              </TableRow>
            ) : (
              redirects.data.map((redirect) => (
                <TableRow key={redirect.uniqueId}>
                  <TableCell>
                    <code className="text-xs">{redirect.fromPath}</code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{redirect.toPath}</code>
                  </TableCell>
                  <TableCell>{redirect.hitCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(redirect.uniqueId)}
                    >
                      {t("redirects.delete")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default RedirectsPage
