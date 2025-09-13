"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/pendencias/kanban-board"
import { PendenciaModal } from "@/components/pendencias/pendencia-modal"
import { PendenciasFilters } from "@/components/pendencias/pendencias-filters"
import { getPendenciasWithDetails } from "@/lib/mock-data"
import { PendenciaWithDetails, FilterState } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function PendenciasPage() {
  const [pendencias, setPendencias] = useState<PendenciaWithDetails[]>(getPendenciasWithDetails())
  const [selectedPendencia, setSelectedPendencia] = useState<PendenciaWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    tipo: null,
    prioridade: null,
    responsavel: null,
  })
  const [searchTerm, setSearchTerm] = useState("")

  const handleUpdatePendencia = (id: number, updates: Partial<PendenciaWithDetails>) => {
    setPendencias(prev => 
      prev.map(p => 
        p.id_pendencia_sinalizada === id 
          ? { ...p, ...updates }
          : p
      )
    )
  }

  const handleEditPendencia = (pendencia: PendenciaWithDetails) => {
    setSelectedPendencia(pendencia)
    setIsModalOpen(true)
  }

  const handleCreatePendencia = () => {
    setSelectedPendencia(null)
    setIsModalOpen(true)
  }

  // Apply filters
  const filteredPendencias = pendencias.filter(pendencia => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        pendencia.descricao?.toLowerCase().includes(searchLower) ||
        pendencia.tipo.toLowerCase().includes(searchLower) ||
        pendencia.pessoa?.nome_completo?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }
    
    // Status filter
    if (filters.status && pendencia.status !== filters.status) return false
    
    // Type filter
    if (filters.tipo && pendencia.tipo !== filters.tipo) return false
    
    // Priority filter
    if (filters.prioridade && pendencia.prioridade !== filters.prioridade) return false
    
    return true
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pendências</h1>
        <Button onClick={handleCreatePendencia} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Pendência
        </Button>
      </div>

      <div className="mb-6">
        <PendenciasFilters 
          filters={filters}
          onFiltersChange={setFilters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard
          pendencias={filteredPendencias}
          onUpdatePendencia={handleUpdatePendencia}
          onEditPendencia={handleEditPendencia}
        />
      </div>

      <PendenciaModal
        pendencia={selectedPendencia}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) setSelectedPendencia(null)
        }}
        onSave={selectedPendencia ? 
          (id, updates) => handleUpdatePendencia(id, updates) :
          (id, updates) => {
            const newPendencia: PendenciaWithDetails = {
              id_pendencia_sinalizada: Math.max(...pendencias.map(p => p.id_pendencia_sinalizada)) + 1,
              id_conversa: 1,
              id_mensagem_origem: null,
              tipo: 'INFORMACAO',
              descricao: '',
              prioridade: 1,
              sla_at: null,
              status: 'SINALIZADA',
              detected_at: new Date().toISOString(),
              resolved_at: null,
              resolution_note: null,
              kanban_status: 'A_FAZER',
              ...updates,
            }
            setPendencias(prev => [...prev, newPendencia])
          }
        }
      />
    </div>
  )
}
