"use client"

import * as React from "react"

import { ComboboxSelect } from "@/components/ui/combobox-select"
import { Button } from "@/components/ui/button"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import { teams } from "@/lib/exports"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  const options = React.useMemo(
    () =>
      teams.map((team) => ({
        value: team.name,
        label: team.name,
        icon: (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md border">
            <team.logo />
          </div>
        ),
      })),
    []
  )

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <ComboboxSelect
          aria-label="Teams"
          options={options}
          value={activeTeam.name}
          onValueChange={(name) => {
            const team = teams.find((t) => t.name === name)
            if (team) setActiveTeam(team)
          }}
          searchable={teams.length > 5}
          side={isMobile ? "bottom" : "right"}
          contentClassName="w-56"
          itemClassName="gap-2 p-2"
          trigger={
            <SidebarMenuButton
              size="lg"
              className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <activeTeam.logo />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          }
          footer={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 p-2 font-medium text-muted-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <PlusIcon className="size-4" />
              </div>
              Add team
            </Button>
          }
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
