import { RouterProvider } from "react-router"
import { routes } from "./routes/routes"
import { usePageViewTracker } from "@/hooks/use-page-view-tracker"

export function App() {
  usePageViewTracker(routes)
  return <RouterProvider router={routes} />
}

export default App
