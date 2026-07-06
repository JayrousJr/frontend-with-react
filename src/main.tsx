import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/context/auth-context.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { Toaster } from "./components/ui/sonner.tsx"
import { initErrorReporting } from "@/lib/error-reporting"
import "./config/i18n.ts"

initErrorReporting()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster position="top-right" />
          <App />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)
