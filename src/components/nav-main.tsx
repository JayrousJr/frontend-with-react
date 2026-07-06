import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { navMain, type NavMainItem } from "@/lib/exports"
import { useAuth } from "@/context/auth-context"
import { hasEveryPermission } from "@/lib/permissions"
import { ChevronRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

export function NavMain() {
  const { t } = useTranslation()
  const { user } = useAuth()

  // Hide entries the user has no permission for (admin bypasses, mirroring
  // the backend guard). A group with all of its children hidden disappears.
  const visibleNav = navMain
    .map((item): NavMainItem => {
      const items = item.items?.filter((subItem) =>
        hasEveryPermission(user, subItem.requiredPermissions ?? [])
      )
      return { ...item, items }
    })
    .filter(
      (item) =>
        hasEveryPermission(user, item.requiredPermissions ?? []) &&
        (!item.items || item.items.length > 0)
    )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("dashboards.navMain.title")}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleNav.map((item) => (
          <Collapsible
            key={item.id}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title()}>
                  <item.icon />
                  <span>{item.title()}</span>
                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.id}>
                      <SidebarMenuSubButton asChild>
                        <Link to={subItem.url}>
                          <span>{subItem.title()}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
