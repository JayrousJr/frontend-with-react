import { AppSidebar } from "@/components/app-sidebar"
import LanguageSwitcher from "@/components/languageSwitcher"
import NotificationBell from "@/components/notification-bell"
import { useTheme } from "@/components/theme-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Moon, Sun } from "lucide-react"
import { Outlet, useLocation, useNavigation } from "react-router"

const DashboardLayout = () => {
  const navigation = useNavigation()
  const { pathname } = useLocation()

  const isLoading = navigation.state === "loading"
  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/")
    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    return { href, label }
  })
  const { theme, setTheme } = useTheme()
  return (
    <div className="min-h-screen">
      <div
        className={cn(
          "fixed top-0 right-0 left-0 z-50 h-1 bg-primary transition-all duration-300",
          isLoading ? "opacity-100" : "opacity-0"
        )}
      />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="mr-4 flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center gap-2">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage className="truncate">
                            {crumb.label.length > 20
                              ? crumb.label.substring(0, 6) + "..."
                              : crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>
                            {crumb.label.length > 20
                              ? crumb.label.substring(0, 6) + "..."
                              : crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell />
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme == "light" ? "dark" : "light")}
                className="cursor-pointer"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] scale-0 rotate-0 transition-all dark:scale-100 dark:-rotate-90" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-100 rotate-90 transition-all dark:scale-0 dark:rotate-0" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default DashboardLayout
