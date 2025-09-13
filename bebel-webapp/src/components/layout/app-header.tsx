"use client"

import { Search, User, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"

export function AppHeader() {
  const { toggleSidebar, isMobile } = useSidebar()
  
  // Don't render the header until we know if we're on mobile
  if (isMobile === undefined) {
    return (
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4">
        <div className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0" />
      </header>
    )
  }
  
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0"
        onClick={toggleSidebar}
        aria-label="Alternar menu"
      >
        <PanelLeft className="h-5 w-5" />
        <span className="sr-only">Alternar menu</span>
      </Button>
      
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">BebelAI</h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">Clínica Demo</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Global Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pacientes, conversas..."
              className="pl-8 w-64"
            />
          </div>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="@secretaria" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Secretária</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    secretaria@clinica.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
