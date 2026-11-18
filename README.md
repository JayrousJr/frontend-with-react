# React Frontend Template

A React 19 + Vite + TypeScript frontend template built for **security, RBAC, and performance**. Pairs with the [NestJS GraphQL backend template](../backend/nestjs-graphql-template) — the two are designed to be cloned and run together.

## Stack

- React 19, Vite 7, TypeScript
- React Router v7 (`createBrowserRouter`, data loaders, lazy-loaded routes)
- Tailwind CSS v4 + shadcn/radix-ui components
- react-i18next (English + Swahili out of the box)
- Axios for REST (auth, file upload/download) and a thin GraphQL wrapper for everything else

## Getting started

```bash
git clone <repo-url> my-app
cd my-app

# Run the setup script — it will:
#   - Remove template .git history and init a fresh repo
#   - Rename the project in package.json and index.html
#   - Create .env pointing at your backend URL
#   - Install dependencies, create an initial commit, and remove itself
bash setup.sh

pnpm dev
```

### Manual setup (if you prefer)

```bash
rm -rf .git && git init
# Rename "frontend-react-template" in package.json and titles in index.html
pnpm install
cp .env.example .env
pnpm dev
```

The app expects the backend template running locally (see its README for setup). Configure the connection in `.env`:

| Variable             | Purpose                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`       | REST base URL — auth endpoints, file upload/download                                                            |
| `VITE_GRAPHQL_URL`   | GraphQL gateway endpoint                                                                                        |
| `VITE_AUTH_STRATEGY` | `"jwt"` or `"session"` — switches how sessions are validated and how the axios interceptor attaches credentials |
| `VITE_APP_NAME`      | Display name used in the UI (nav, page titles)                                                                  |
| `VITE_SENTRY_DSN`    | Optional — enables Sentry error reporting (loaded lazily; costs nothing when unset)                             |

## Scripts

| Script            | Description                                  |
| ----------------- | -------------------------------------------- |
| `pnpm dev`        | Start the Vite dev server                    |
| `pnpm build`      | Typecheck (`tsc -b`) then build with Vite    |
| `pnpm typecheck`  | `tsc --noEmit`                               |
| `pnpm lint`       | ESLint over the whole project                |
| `pnpm format`     | Prettier write (with Tailwind class sorting) |
| `pnpm test`       | Run the Vitest suite once                    |
| `pnpm test:watch` | Vitest in watch mode                         |
| `pnpm preview`    | Preview the production build                 |

## Architecture: routes as the single source of truth

Everything routing-related is driven from `src/routes/routes.tsx`, which builds one `createBrowserRouter` tree. Adding a page means adding one entry to this config — lazy loading, guards, loaders, layouts, and error boundaries are composed by the structure of the tree, not hand-wired per page. Path strings live in `src/routes/routeConstants.ts` — never hardcode a path string in a route definition or link.

**Route guards** (HOCs wrapping `<Outlet/>`, stacked via nesting):

- `PublicOnlyRoute` — redirects authenticated users away from `/auth/*`
- `ProtectedRoute` — redirects unauthenticated users to the home page, preserving where they came from
- `RoleRoute` — gates a route behind `allowedRoles: UserRole[]`
- `PermissionRoute` — gates a route behind `requiredPermissions: Permission[]` (the user must hold _every_ one — AND, not OR)

`RoleRoute` and `PermissionRoute` nest inside `ProtectedRoute` so auth is always checked first.

**Lazy loading**: pages are never imported directly in the route tree. The `lazyPage()` helper wraps `import()` calls; `LazyBoundary` provides the `Suspense` fallback.

**Loaders**: declared on the route object, not inside components. Three patterns are used — no loader (static pages), search-param loaders (list/filter pages read `request.url`), and segment-param loaders (`{ params }`, e.g. a user-details page). Never use the `useParams` hook inside a loader — it's a React hook and only works inside components.

**Error boundaries**: `RouterErrorBoundary` is the single error element attached to each top-level route group. It branches on the error shape — stale JS chunk failures after a redeploy get a reload prompt instead of a blank crash, `isRouteErrorResponse` 404/403 render the matching error page, everything else gets a generic error UI.

## Two axes of authorization — role and permission

Every `User` carries both a coarse `role` (`"admin" | "user" | "manager"` — used for nav/grouping/defaults) and a fine-grained `permissions: Permission[]` array (backend-provided capability strings like `"users.delete"`). They're checked independently and can stack.

- **Route-level** (`src/routes/`): `RoleRoute` / `PermissionRoute` redirect to `/403` when a whole page shouldn't render.
- **Component-level** (`src/hocs/`): `withRole` / `withPermission` render `null` (no redirect) for inline UI — buttons or panel sections that simply shouldn't appear. `src/hocs/` also provides `withLoading` (skeleton swap) and `withErrorBoundary` (isolates a component crash).

The **admin role bypasses every permission check**, mirroring the backend's `PermissionsGuard` exactly (`src/lib/permissions.ts`). Nav items follow the same rule: `NavMain` filters the sidebar against the current user's permissions, so a user without `users.read` never sees a "Users" link at all — the hiding is on top of route-level enforcement, not instead of it.

## Auth (`src/context/auth-context.tsx`)

`AuthProvider` validates the session once on mount, branching on `VITE_AUTH_STRATEGY`:

- `"session"` — `GET /auth/me` with cookies
- `"jwt"` — `POST /auth/refresh`, which the browser authenticates with an **HttpOnly refresh-token cookie** the backend set at login

**Token storage:** the access token is held **in memory only** (`src/services/api.ts`) and the refresh token is an `HttpOnly; SameSite=Strict` cookie, so neither is reachable from JavaScript — an XSS cannot exfiltrate a long-lived credential. A page reload has no token in memory, so `AuthProvider` trades the cookie for a fresh access token on mount. Anything rendering user-authored HTML must still be sanitized (see `campaign-details.tsx`, which runs `DOMPurify.sanitize`).

`useAuth()` exposes `{ isLoading, isAuthenticated, user, login, logout, refreshUser }`. `AuthProvider` is also the single owner of locale sync — it applies `user.preferredLocale` to i18next and persists it, so a user's language preference follows them across devices once they're logged in.

Every REST and GraphQL request carries the active i18next language as an `x-lang` header, so the backend localizes errors, emails, and notifications to match the UI.

**Google sign-in**: the "Continue with Google" button sends the browser to the backend's `/auth/google`, and the round-trip lands on `/auth/callback` (`src/pages/auth/oauth-callback.tsx`) with tokens in the URL fragment — the page scrubs them from history, stores the session, and redirects to the dashboard. The route lives outside `PublicOnlyRoute` because it flips from unauthenticated to authenticated mid-page. Requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` on the backend (the button 404s gracefully otherwise).

## Data layer

All GraphQL fetching goes through `gql()` in `src/services/api.ts`, a thin wrapper that attaches auth + the `x-lang` header and throws a `GraphQLRequestError` when the response is `200` but contains a GraphQL `errors` array. REST calls (auth, file upload/download) use a sibling `api` axios instance sharing the same interceptor. GraphQL documents live centrally in `src/services/queries.ts` / `src/services/mutations.ts`; domain services (`src/services/users.ts`, `campaigns.ts`, etc.) wrap `gql()` with typed functions — follow this pattern for new domains rather than calling `gql` directly from components or loaders.

## Forms

Forms use **react-hook-form + zod**, wired to the shadcn `Field` primitives — `login-form.tsx` and `signup-form.tsx` are the reference implementations. The pattern:

1. **Schema factory** in `src/lib/validations/` — takes `t` so validation messages are localized, and mirrors the backend DTO rules (e.g. the 8-char password minimum) so local validation never contradicts the API. Build it with `useMemo(() => createLoginSchema(t), [t])` and pass to `zodResolver`.
2. **`TextField`** (`src/components/form/text-field.tsx`) — a typed `Controller` wrapper rendering label, input, and inline `FieldError` in one tag. Extend the same shape for selects, checkboxes, etc.
3. **Backend errors** go to the form's root error via `setRootError(form.setError, err, fallback)` (`src/lib/form.ts`), rendered with `<FieldError errors={[form.formState.errors.root]} />` — backend messages arrive already localized via the `x-lang` header, so they're shown verbatim.
4. `form.formState.isSubmitting` drives the submit button's disabled/loading state — no manual `useState` bookkeeping.

## File uploads

`FileUpload` (`src/components/file-upload.tsx`) is the standard uploader, built on the `Attachment` primitives (`components/ui/attachment.tsx`): a dashed drop zone plus one attachment card per file. `settings/profile-tab.tsx` is the reference usage.

```tsx
<FileUpload
  accept="image/*"
  maxSize={MAX_UPLOAD_SIZE}
  onUpload={async (file, { onProgress, signal }) => {
    await uploadAvatar(file, { onProgress, signal })
  }}
/>
```

What it handles for you:

- **Real progress** — the `onProgress` callback is wired to axios `onUploadProgress`, so the card shows actual percentages, not a fake bar.
- **Cancellation** — the `signal` is an `AbortSignal`; forward it to axios and the ✕ on an in-flight upload genuinely aborts the request.
- **Inline errors with retry** — throw from `onUpload` and the card flips to the error state showing the thrown message (backend messages are already localized via `x-lang`), with a retry action. Size and type violations fail locally without spending a request.
- **Image previews** — image files render a thumbnail that dims while uploading and brightens when done.

Keep `maxSize` aligned with the backend's `MAX_FILE_SIZE` (`storage.constants.ts`) — `MAX_UPLOAD_SIZE` in `src/services/account.ts` mirrors it.

## SEO

The public surface is search-optimized; everything behind auth is explicitly excluded.

**Per-route metadata.** SEO lives in the route config, next to loaders and guards:

```tsx
{
  path: ROUTES.BLOG,
  loader: async () => ({ posts: await fetchPublishedPosts() }),
  handle: { seo: { title: "Blog", description: "Latest articles." } },
}
```

`handle.seo` is either a static object or a function of the route's loader data (see the `/blog/:slug` route, which derives title, canonical, OG image and Article JSON-LD from the post). `RouteSeo`, rendered once per layout, merges the handles of all matched routes — deepest wins — so a page overrides its layout. The `/auth/*` and `ProtectedRoute` groups set `noindex` at the group level, so no dashboard page can leak into search results.

`Seo` writes tags imperatively rather than as JSX. React 19 hoists `<title>`/`<meta>` on its own, but lazy routes suspend and remount, which left orphaned tags behind — a production build accumulated four `<title>` elements. Upserting by selector guarantees exactly one of each.

**What it emits:** title, description, canonical, robots, full Open Graph + Twitter card, `hreflang` alternates with `x-default`, and JSON-LD (`organizationJsonLd`, `websiteJsonLd`, `articleJsonLd`, `breadcrumbJsonLd` in `src/lib/seo.ts`).

**Prerendering.** This is a client-rendered SPA: every route ships the same empty `index.html`. Googlebot executes JS, but social crawlers (Facebook, X, LinkedIn, WhatsApp, Slack) never do — without prerendering, every share preview falls back to generic site-wide tags. `pnpm prerender` (after `pnpm build`) renders the public routes with headless Chrome and writes real HTML into `dist/`:

```bash
pnpm build
PRERENDER_ROUTES=/,/blog,/blog/my-post pnpm prerender
```

The prerender server runs on port 4173 because route loaders call the API while rendering, and that origin is already in the backend's `CORS_ORIGINS`. Only public routes need it — authenticated pages are noindex.

**robots.txt / sitemap.xml** are generated by the backend from live content (see its README). `public/robots.txt` is a static fallback, and `nginx.conf` has an optional block to proxy both from the site's own origin.

`VITE_SITE_URL` must be set in production — canonical and OG URLs are absolute, and the runtime-origin fallback produces wrong values during prerendering.

## Real-time notifications

`NotificationBell` (in the dashboard header) shows a badge with the unread count and a popover list. It connects to the backend's Socket.io gateway (`src/lib/socket.ts` — singleton, JWT handshake) and prepends + toasts incoming `notification` events live. Notification content arrives as i18n keys plus JSON-encoded params (`titleKey` / `messageKey` / `params`), rendered with the user's current locale — new notification kinds only need translation entries under `notifications.*` in each locale file. The socket requires a JWT access token, so under the `"session"` auth strategy the bell degrades gracefully to fetch-on-load without live pushes.

## Testing

Vitest runs two kinds of tests:

- **Pure logic** (default, Node environment) — `src/lib/permissions.test.ts`, `src/lib/format.test.ts`, `src/lib/validations/auth.test.ts`. Anything importing `src/config/i18n.ts` (directly or transitively) reads `localStorage` at module scope, so either mock the i18n module the way `format.test.ts` does or opt into jsdom.
- **Component tests** (jsdom, via `@testing-library/react`) — opt in per file with a `// @vitest-environment jsdom` pragma. `src/components/form/text-field.test.tsx` is the reference: it renders a real form around the component (react-hook-form + zod, nothing mocked) and asserts on what the user sees. `vitest.setup.ts` registers the jest-dom matchers and per-test cleanup.

## Adding components (shadcn / 21st.dev registries)

`components.json` at the project root configures the shadcn-style CLIs so installed components land under `src/` with the right aliases. The `@21st-dev` registry entry reads its auth token from the `API_KEY_21ST` environment variable — set it in your shell (not in the file) before running `npx shadcn add @21st-dev/...`. Never commit a literal token into `components.json`.

## Deployment

`pnpm build` outputs a static SPA to `dist/`. Because routing uses `createBrowserRouter`, the server **must rewrite unknown paths to `index.html`** or every deep link and page refresh 404s:

- **Docker (included)** — the `Dockerfile` builds the app and serves it with nginx (`nginx.conf` has the SPA fallback, gzip, and immutable caching for hashed assets). Vite env vars are baked in at **build time**, so pass them as build args:

  ```bash
  docker build \
    --build-arg VITE_API_URL=https://api.example.com/api \
    --build-arg VITE_GRAPHQL_URL=https://api.example.com/api/graphql \
    -t my-frontend .
  docker run -p 8080:80 my-frontend
  ```

- **Netlify / Vercel / Cloudflare Pages** — handled by their SPA preset (or a one-line `_redirects` / `vercel.json` rewrite).
- **nginx (bare)** — see `nginx.conf` in the repo root for the full config; the essential line:

  ```nginx
  location / {
    try_files $uri /index.html;
  }
  ```

The chunk-splitting config in `vite.config.ts` separates the heaviest stable vendors (react, motion, i18n, charts) so app-code changes don't invalidate the whole vendor download. `RouterErrorBoundary` already handles the stale-chunk-after-redeploy case with a reload prompt.

## Keeping your project up to date

Projects created from this template have **no automatic link back to it** — you own a divergent copy. Three ways to pull in template improvements, from manual to automated:

1. **Follow the releases.** Each [release](https://github.com/JayrousJr/frontend-with-react/releases) describes what changed and how to apply it to an existing project. Commits are small and conventional, so individual changes are easy to cherry-pick by hand.

2. **Template remote** (best adopted right after scaffolding, degrades as you diverge):

   ```bash
   git remote add template git@github.com:JayrousJr/frontend-with-react.git
   # when the template releases updates:
   git fetch template
   git merge template/main --allow-unrelated-histories
   ```

   Files you never touched merge cleanly; files you customized raise conflicts to resolve deliberately.

3. **Automated sync PRs** — install [`actions-template-sync`](https://github.com/AndreasAugustin/actions-template-sync) in your project and template changes arrive as reviewable pull requests on a schedule.

After significant divergence, most projects stop syncing wholesale and instead read the template's release diffs for ideas — that's expected and fine.

## Before you ship this

A few things in the template are placeholder content and should be replaced or removed before a real release:

- `teams`, `productLinks`, `companyLinks`, and `footerDetails` in `src/lib/exports.ts` describe the template itself, with `href: "#"` placeholders.
- The home page copy lives under the `home.*` keys in `src/config/locales/*/translation.json`, and the hero/feature/CTA sections themselves in `src/pages/guests/home.tsx`.
- `index.html` carries generic title/description/Open Graph tags — update them (and `og:url`/`og:image`) for your product and deployment URL.
- `public/logo.png` is the template logo, used as favicon and og:image.
- The default locales cover English and Swahili — add or remove locale files in `src/config/locales/` to match your product.
- The `LICENSE` file names the template author — replace it with your own license or keep MIT with your name.
