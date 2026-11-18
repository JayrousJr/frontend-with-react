import { RouteSeo } from "@/components/seo"
import Footer from "@/sections/footer"
import Navigation from "@/sections/navigation"
import { Outlet } from "react-router"

const LandingLayout = () => {
  return (
    <div>
      <Navigation />
      <RouteSeo />
      <Outlet />
      <Footer />
    </div>
  )
}

export default LandingLayout
