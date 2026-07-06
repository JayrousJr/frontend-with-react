import { MenuIcon, LayoutDashboard, LogOut, Sun, Moon } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavGridCard,
  NavSmallItem,
  NavLargeItem,
  NavItemMobile,
} from "@/components/ui/navigation-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { APP_NAME, companyLinks, logo, productLinks } from "@/lib/exports"
import { useNavigate } from "react-router"
import { ROUTES } from "@/routes/routeConstants"
import { useAuth, type User } from "@/context/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import { useAuthenticatedImage } from "@/hooks/use-authenticated-image"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "@/components/languageSwitcher"

export default function Navigation() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  async function handleLogout() {
    await logout()
    navigate(ROUTES.HOME, { replace: true })
  }
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  return (
    <div className="relative my-4 h-full w-full px-4">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 size-full",
          //   "bg-[radial-gradient(color-mix(in_oklab,--theme(--color-foreground/.2)30%,transparent)_2px,transparent_2px)]",
          "bg-size-[12px_12px]"
        )}
      />

      <div className="sticky top-1/30 z-50 mx-auto h-14 w-full max-w-7xl rounded-lg border bg-background px-4">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} className="w-10" />{" "}
            <p className="font-mono text-lg font-bold">{APP_NAME}</p>
          </div>
          <DesktopMenu />

          <div className="flex items-center gap-2">
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
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30 focus:outline-none md:flex">
                    <UserAvatar size="sm" user={user!} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm leading-none font-semibold">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t("profile.dashboard")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("profile.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => navigate("/auth/login")}
                >
                  {t("auth.login")}
                </Button>
                {/* <Button size="sm" onClick={() => navigate("/auth/register")}>
                  Get Started
                </Button> */}
              </div>
            )}
            <MobileView />
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopMenu() {
  return (
    <NavigationMenu className="hidden lg:block">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Features</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-full md:w-4xl md:grid-cols-[1fr_.30fr]">
              <ul className="grid grow gap-4 p-4 md:grid-cols-3 md:border-r">
                {productLinks.slice(0, 3).map((link) => (
                  <li key={link.href}>
                    <NavGridCard link={link} />
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 p-4">
                {productLinks.slice(3).map((link) => (
                  <li key={link.href}>
                    <NavSmallItem
                      item={link}
                      href={link.href}
                      className="gap-x-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-full md:w-4xl md:grid-cols-[1fr_.40fr]">
              <ul className="grid grow grid-cols-2 gap-4 p-4 md:border-r">
                {companyLinks.slice(0, 2).map((link) => (
                  <li key={link.href}>
                    <NavGridCard link={link} className="min-h-36" />
                  </li>
                ))}
                <div className="col-span-2 grid grid-cols-3 gap-x-4">
                  {companyLinks.slice(2, 5).map((link) => (
                    <li key={link.href}>
                      <NavLargeItem href={link.href} link={link} />
                    </li>
                  ))}
                </div>
              </ul>
              <ul className="space-y-2 p-4">
                {companyLinks.slice(5, 10).map((link) => (
                  <li key={link.href}>
                    <NavLargeItem href={link.href} link={link} />
                  </li>
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className="cursor-pointer">
            GitHub
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function MobileView() {
  const sections = [
    {
      id: "features",
      name: "Features",
      list: productLinks,
    },
    {
      id: "resources",
      name: "Resources",
      list: companyLinks,
    },
  ]

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className="rounded-full lg:hidden">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        // showClose={false}
        className="w-full gap-0 bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/80"
      >
        <div className="flex h-14 items-center justify-end border-b px-4">
          <SheetClose asChild>
            <Button size="icon" variant="ghost" className="rounded-full">
              {/* <XIcon className="size-5" /> */}
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </div>
        <div className="container grid gap-y-2 overflow-y-auto px-4 pt-5 pb-12">
          <Accordion type="single" collapsible>
            {sections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="capitalize hover:no-underline">
                  {section.id}
                </AccordionTrigger>
                <AccordionContent className="space-y-1">
                  <ul className="grid gap-1">
                    {section.list.map((link) => (
                      <li key={link.href}>
                        <SheetClose asChild>
                          <NavItemMobile item={link} href={link.href} />
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function UserAvatar({ size = "sm", user }: { size?: "sm" | "md"; user: User }) {
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?"
  const px = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"

  return (
    <Avatar className={px}>
      <AvatarImage
        src={useAuthenticatedImage(user?.avatar) ?? undefined}
        alt={user?.firstName}
      />
      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
