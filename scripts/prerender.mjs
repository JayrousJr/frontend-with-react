/**
 * Post-build prerender: renders public routes with a real browser and writes
 * the resulting HTML next to the SPA bundle.
 *
 * Why: this is a client-rendered SPA, so every route ships the same empty
 * index.html. Googlebot executes JS, but social crawlers (Facebook, X,
 * LinkedIn, WhatsApp, Slack) never do — without this, every share preview
 * falls back to the generic site-wide tags. Prerendering just the public
 * routes keeps it cheap; everything behind auth is noindex anyway.
 *
 *   pnpm build && pnpm prerender
 *   PRERENDER_ROUTES=/,/blog pnpm prerender
 */
import { createServer } from "node:http"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import { join, extname, dirname } from "node:path"
import { existsSync } from "node:fs"
import puppeteer from "puppeteer-core"

const DIST = "dist"
// Defaults to Vite's preview port because that origin is already in the
// backend's CORS allowlist — route loaders must reach the API while rendering.
const PORT = Number(process.env.PRERENDER_PORT ?? 4173)
const CHROME =
  process.env.CHROME_PATH ??
  [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((path) => existsSync(path))

const routes = (process.env.PRERENDER_ROUTES ?? "/").split(",").filter(Boolean)

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
}

// Minimal static server with SPA fallback — same contract as nginx.conf.
const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname)
  const candidate = join(DIST, urlPath)
  const file =
    extname(urlPath) && existsSync(candidate)
      ? candidate
      : join(DIST, "index.html")
  try {
    const body = await readFile(file)
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
    })
    res.end(body)
  } catch {
    res.writeHead(404).end("not found")
  }
})

await new Promise((resolve) => server.listen(PORT, resolve))

if (!CHROME) {
  console.error(
    "✗ No Chrome found. Set CHROME_PATH to a Chrome/Chromium binary."
  )
  server.close()
  process.exit(1)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
})

let failures = 0
for (const route of routes) {
  const page = await browser.newPage()
  try {
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    })
    const html = await page.content()
    const outFile = join(
      DIST,
      route === "/" ? "index.html" : `${route}/index.html`
    )
    await mkdir(dirname(outFile), { recursive: true })
    await writeFile(outFile, html)
    console.log(`✓ prerendered ${route} -> ${outFile}`)
  } catch (error) {
    failures++
    console.error(`✗ ${route}: ${error.message}`)
  } finally {
    await page.close()
  }
}

await browser.close()
server.close()
process.exit(failures > 0 ? 1 : 0)
