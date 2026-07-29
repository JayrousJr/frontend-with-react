import DOMPurify from "dompurify"
import { useLoaderData } from "react-router"
import { formatDate } from "@/lib/format"
import type { Post } from "@/services/content"

const BlogPost = () => {
  const { post } = useLoaderData() as { post: Post }

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {post.title}
        </h1>
        {post.publishedAt && (
          <time
            dateTime={post.publishedAt}
            className="mt-2 block text-sm text-muted-foreground"
          >
            {formatDate(post.publishedAt)}
          </time>
        )}
      </header>

      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          className="mb-8 w-full rounded-xl object-cover"
        />
      )}

      {/* Sanitized server-side on write and again here on render. */}
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.bodyHtml) }}
      />
    </article>
  )
}

export default BlogPost
