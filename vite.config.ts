/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest stable dependencies out of the main bundle so
        // app-code changes don't invalidate the whole vendor download.
        manualChunks(id) {
          if (!id.includes("node_modules")) return
          const pkg = id.split("node_modules/").pop()!.split("/")[0]
          if (["react", "react-dom", "scheduler", "react-router"].includes(pkg))
            return "react"
          if (
            pkg === "recharts" ||
            pkg === "victory-vendor" ||
            pkg === "internmap" ||
            pkg.startsWith("d3-")
          )
            return "charts"
          if (["motion", "motion-dom", "motion-utils"].includes(pkg))
            return "motion"
          if (["i18next", "react-i18next"].includes(pkg)) return "i18n"
        },
      },
    },
  },
  test: {
    // Node by default (fast, right for pure logic). Component tests opt in
    // to jsdom per file with a `// @vitest-environment jsdom` pragma — see
    // src/components/form/text-field.test.tsx.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
})
