"use client"

import { Calendar, MessageSquare, ClipboardList, Home } from "lucide-react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    disabled: true,
  },
  {
    title: "Conversas",
    url: "/conversas",
    icon: MessageSquare,
    disabled: true,
  },
  {
    title: "Pendências",
    url: "/pendencias",
    icon: ClipboardList,
    disabled: false,
  },
  {
    title: "Agenda",
    url: "/agenda",
    icon: Calendar,
    disabled: true,
  },
]

export function AppSidebar() {
  const { isMobile } = useSidebar()
  
  if (isMobile === undefined) {
    return null // Prevent hydration mismatch
  }

  return (
    <Sidebar collapsible="icon" className="h-full border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2">
            <span className="group-data-[collapsible=icon]/sidebar-wrapper:hidden">
              BebelAI - Gestão de Clínica
            </span>
            <span className="hidden group-data-[collapsible=icon]/sidebar-wrapper:block text-center">
              B
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    disabled={item.disabled}
                    tooltip={item.title}
                    className="px-4 group-data-[collapsible=icon]/sidebar-wrapper:justify-center"
                  >
                    <Link href={item.url} className="w-full flex items-center">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="group-data-[collapsible=icon]/sidebar-wrapper:hidden ml-2 truncate">
                        {item.title}
                      </span>
                      {item.disabled && (
                        <span className="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]/sidebar-wrapper:hidden whitespace-nowrap">
                          Em breve
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

