import { RouteSeo } from "@/components/seo"
import { Outlet } from "react-router"

const AuthLayout = () => {
  return (
    <div>
      <RouteSeo />
      <Outlet />
    </div>
  )
}

export default AuthLayout
