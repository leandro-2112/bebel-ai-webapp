"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <ToastProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AppHeader />
            <SidebarInset className="flex-1 overflow-auto">
              <main className="p-4">
                {children}
              </main>
            </SidebarInset>
          </div>
        </div>
        <ToastViewport />
      </ToastProvider>
    </SidebarProvider>
  )
}
