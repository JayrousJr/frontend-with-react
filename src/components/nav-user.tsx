import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ChevronsUpDownIcon,
  BadgeCheckIcon,
  BellIcon,
  LogOutIcon,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useNavigate } from "react-router"
import { ROUTES } from "@/routes/routeConstants"
import { useAuthenticatedImage } from "@/hooks/use-authenticated-image"
import { useTranslation } from "react-i18next"
import { userImg } from "@/lib/exports"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const avatarSrc = useAuthenticatedImage(user?.avatar)
  const { t } = useTranslation()
  console.log(avatarSrc)

  if (!user) return null

  const fullName = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate(ROUTES.HOME, { replace: true })
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  alt={fullName}
                  src={avatarSrc === undefined ? userImg : avatarSrc}
                />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{fullName}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    alt={fullName}
                    src={avatarSrc === undefined ? userImg : avatarSrc}
                  />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
                <BadgeCheckIcon />
                {t("profile.account")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`${ROUTES.SETTINGS}?tab=notifications`)}
              >
                <BellIcon />
                {t("profile.notification")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              {t("profile.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
