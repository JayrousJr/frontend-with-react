import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useLoaderData, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { TextField } from "@/components/form/text-field"
import { setRootError } from "@/lib/form"
import { SITE_URL } from "@/lib/seo"
import { ROUTES } from "@/routes/routeConstants"
import { createPost, updatePost, type Post } from "@/services/content"

/** Google truncates around these lengths — surfaced as live counters. */
const TITLE_LIMIT = 60
const DESCRIPTION_LIMIT = 155

function createPostSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t("validation.required")),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    bodyHtml: z.string().min(1, t("validation.required")),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    canonicalUrl: z.string().optional(),
  })
}

type PostValues = z.infer<ReturnType<typeof createPostSchema>>

const PostEditor = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { post } = (useLoaderData() ?? {}) as { post?: Post }
  const [noIndex, setNoIndex] = useState(post?.noIndex ?? false)

  const schema = useMemo(() => createPostSchema(t), [t])
  const form = useForm<PostValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: post?.title ?? "",
      slug: post?.slug ?? "",
      excerpt: post?.excerpt ?? "",
      bodyHtml: post?.bodyHtml ?? "",
      metaTitle: post?.metaTitle ?? "",
      metaDescription: post?.metaDescription ?? "",
      canonicalUrl: post?.canonicalUrl ?? "",
    },
  })

  const metaTitle = form.watch("metaTitle") || form.watch("title")
  const metaDescription = form.watch("metaDescription") || form.watch("excerpt")
  const slug = form.watch("slug")

  async function submit(values: PostValues, status: "DRAFT" | "PUBLISHED") {
    try {
      const payload = { ...values, noIndex, status }
      const message = post
        ? await updatePost({ ...payload, uniqueId: post.uniqueId })
        : await createPost(payload)
      toast.success(message)
      navigate(ROUTES.POSTS)
    } catch (error) {
      setRootError(form.setError, error, t("general_error"))
    }
  }

  return (
    <form
      className="grid gap-4 lg:grid-cols-[1fr_360px]"
      onSubmit={form.handleSubmit((values) => submit(values, "DRAFT"))}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {post ? t("content.edit_post") : t("content.new_post")}
          </CardTitle>
          <CardDescription>{t("content.editor_hint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TextField
            control={form.control}
            name="title"
            label={t("content.columns.title")}
          />
          <TextField
            control={form.control}
            name="slug"
            label={t("content.columns.slug")}
            placeholder={t("content.slug_hint")}
          />
          <Field>
            <FieldLabel htmlFor="excerpt">{t("content.excerpt")}</FieldLabel>
            <Textarea id="excerpt" rows={2} {...form.register("excerpt")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="bodyHtml">{t("content.body")}</FieldLabel>
            <Textarea id="bodyHtml" rows={14} {...form.register("bodyHtml")} />
            <FieldError errors={[form.formState.errors.bodyHtml]} />
          </Field>
          <FieldError errors={[form.formState.errors.root]} />
          <div className="flex gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("content.save_draft")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit((values) =>
                submit(values, "PUBLISHED")
              )}
            >
              {t("content.publish")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{t("content.seo_panel")}</CardTitle>
          <CardDescription>{t("content.seo_hint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Live approximation of the Google result for this page. */}
          <div className="rounded-lg border p-3">
            <p className="truncate text-xs text-muted-foreground">
              {SITE_URL}/blog/{slug || "…"}
            </p>
            <p className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">
              {metaTitle || t("content.untitled")}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {metaDescription || t("content.no_description")}
            </p>
          </div>

          <TextField
            control={form.control}
            name="metaTitle"
            label={`${t("content.meta_title")} (${(metaTitle ?? "").length}/${TITLE_LIMIT})`}
          />
          <Field>
            <FieldLabel htmlFor="metaDescription">
              {t("content.meta_description")} ({(metaDescription ?? "").length}/
              {DESCRIPTION_LIMIT})
            </FieldLabel>
            <Textarea
              id="metaDescription"
              rows={3}
              {...form.register("metaDescription")}
            />
          </Field>
          <TextField
            control={form.control}
            name="canonicalUrl"
            label={t("content.canonical")}
            placeholder={t("content.canonical_hint")}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noIndex}
              onChange={(event) => setNoIndex(event.target.checked)}
            />
            {t("content.noindex_label")}
          </label>
        </CardContent>
      </Card>
    </form>
  )
}

export default PostEditor
