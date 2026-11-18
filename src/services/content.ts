import { gql } from "./api"
import {
  GET_POST,
  GET_POSTS,
  GET_POST_BY_SLUG,
  GET_PUBLISHED_POSTS,
  GET_REDIRECTS,
  RESOLVE_REDIRECT,
} from "./queries"
import {
  CREATE_POST,
  CREATE_REDIRECT,
  DELETE_POST,
  DELETE_REDIRECT,
  UPDATE_POST,
} from "./mutations"

export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

export type Post = {
  uniqueId: string
  slug: string
  title: string
  excerpt: string | null
  bodyHtml: string
  status: PostStatus
  locale: string
  translationKey: string
  publishedAt: string | null
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  noIndex: boolean
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

export type Redirect = {
  uniqueId: string
  fromPath: string
  toPath: string
  statusCode: number
  hitCount: number
  createdAt: string
}

type Paginated<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type PaginationInput = { page?: number; limit?: number }

export type PostInput = {
  uniqueId?: string
  title?: string
  slug?: string
  excerpt?: string
  bodyHtml?: string
  locale?: string
  status?: PostStatus
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  noIndex?: boolean
  coverImageUniqueId?: string
}

//  Public reads

export async function fetchPublishedPosts(
  locale?: string,
  pagination?: PaginationInput
): Promise<Paginated<Post>> {
  const data = await gql<
    { getPublishedPosts: Paginated<Post> },
    { locale?: string; pagination?: PaginationInput }
  >(GET_PUBLISHED_POSTS, { locale, pagination })
  return data.getPublishedPosts
}

export async function fetchPostBySlug(
  slug: string,
  locale?: string
): Promise<Post> {
  const data = await gql<
    { getPostBySlug: Post },
    { slug: string; locale?: string }
  >(GET_POST_BY_SLUG, { slug, locale })
  return data.getPostBySlug
}

/** Used by the 404 page: has this path moved? */
export async function resolveRedirect(
  path: string
): Promise<{ toPath: string; statusCode: number } | null> {
  const data = await gql<
    { resolveRedirect: { toPath: string; statusCode: number } | null },
    { path: string }
  >(RESOLVE_REDIRECT, { path })
  return data.resolveRedirect
}

//  Admin — requires content.read / content.manage

export async function fetchPosts(
  pagination?: PaginationInput,
  filter?: { search?: string; status?: PostStatus; locale?: string }
): Promise<Paginated<Post>> {
  const data = await gql<
    { getPosts: Paginated<Post> },
    { pagination?: PaginationInput; filter?: typeof filter }
  >(GET_POSTS, { pagination, filter })
  return data.getPosts
}

export async function fetchPost(uniqueId: string): Promise<Post> {
  const data = await gql<{ getPost: Post }, { uniqueId: string }>(GET_POST, {
    uniqueId,
  })
  return data.getPost
}

export async function createPost(input: PostInput): Promise<string> {
  const data = await gql<
    { createPost: { message: string } },
    { input: PostInput }
  >(CREATE_POST, { input })
  return data.createPost.message
}

export async function updatePost(input: PostInput): Promise<string> {
  const data = await gql<
    { updatePost: { message: string } },
    { input: PostInput }
  >(UPDATE_POST, { input })
  return data.updatePost.message
}

export async function deletePost(uniqueId: string): Promise<string> {
  const data = await gql<
    { deletePost: { message: string } },
    { uniqueId: string }
  >(DELETE_POST, { uniqueId })
  return data.deletePost.message
}

export async function fetchRedirects(
  pagination?: PaginationInput
): Promise<Paginated<Redirect>> {
  const data = await gql<
    { getRedirects: Paginated<Redirect> },
    { pagination?: PaginationInput }
  >(GET_REDIRECTS, { pagination })
  return data.getRedirects
}

export async function createRedirect(input: {
  fromPath: string
  toPath: string
  statusCode?: number
}): Promise<string> {
  const data = await gql<
    { createRedirect: { message: string } },
    { input: typeof input }
  >(CREATE_REDIRECT, { input })
  return data.createRedirect.message
}

export async function deleteRedirect(uniqueId: string): Promise<string> {
  const data = await gql<
    { deleteRedirect: { message: string } },
    { uniqueId: string }
  >(DELETE_REDIRECT, { uniqueId })
  return data.deleteRedirect.message
}
