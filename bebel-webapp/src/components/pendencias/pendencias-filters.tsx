"use client"

import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { FilterState } from "@/lib/types"

interface PendenciasFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  searchTerm: string
  onSearchChange: (search: string) => void
}

export function PendenciasFilters({
  filters,
  onFiltersChange,
  searchTerm,
  onSearchChange,
}: PendenciasFiltersProps) {
  const clearFilters = () => {
    onFiltersChange({
      status: null,
      tipo: null,
      prioridade: null,
      responsavel: null,
    })
    onSearchChange("")
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== null) || searchTerm

  const activeFiltersCount = Object.values(filters).filter(value => value !== null).length

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pendências..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="SINALIZADA">Sinalizada</SelectItem>
            <SelectItem value="RESOLVIDA">Resolvida</SelectItem>
            <SelectItem value="IGNORADA">Ignorada</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.tipo || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, tipo: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="AGENDAR">Agendamento</SelectItem>
            <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
            <SelectItem value="ORCAMENTO">Orçamento</SelectItem>
            <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
            <SelectItem value="INFORMACAO">Informação</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.prioridade?.toString() || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, prioridade: value === "all" ? null : parseInt(value) })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="5">Muito Alta</SelectItem>
            <SelectItem value="4">Alta</SelectItem>
            <SelectItem value="3">Média</SelectItem>
            <SelectItem value="2">Baixa</SelectItem>
            <SelectItem value="1">Muito Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filtros Avançados</SheetTitle>
            <SheetDescription>
              Configure filtros detalhados para as pendências
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Filtros avançados serão implementados em versões futuras.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      )}
    </div>
  )
}
