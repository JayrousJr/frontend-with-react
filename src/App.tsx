import { RouterProvider } from "react-router"
import { routes } from "./routes/routes"

export function App() {
  return <RouterProvider router={routes} />
}

export default App
