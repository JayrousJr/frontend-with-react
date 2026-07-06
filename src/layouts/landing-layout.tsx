import Footer from "@/sections/footer"
import Navigation from "@/sections/navigation"
import { Outlet } from "react-router"

const LandingLayout = () => {
  return (
    <div>
      <Navigation />
      <Outlet />
      <Footer />
    </div>
  )
}

export default LandingLayout
