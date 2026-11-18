import { Link, useLoaderData } from "react-router"
import { useTranslation } from "react-i18next"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import type { Post } from "@/services/content"

const BlogList = () => {
  const { posts } = useLoaderData() as { posts: { data: Post[] } }
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("blog.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("blog.subtitle")}</p>
      </header>

      {posts.data.length === 0 ? (
        <p className="text-muted-foreground">{t("blog.empty")}</p>
      ) : (
        <div className="grid gap-6">
          {posts.data.map((post) => (
            <Link key={post.uniqueId} to={`/blog/${post.slug}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-2 p-6">
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                  {post.excerpt && (
                    <CardDescription>{post.excerpt}</CardDescription>
                  )}
                  {post.publishedAt && (
                    <time
                      dateTime={post.publishedAt}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(post.publishedAt)}
                    </time>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default BlogList
