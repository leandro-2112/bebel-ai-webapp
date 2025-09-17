"use client"

import { useState, useEffect } from "react"
import { KanbanBoard } from "@/components/pendencias/kanban-board"
import { PendenciaModal } from "@/components/pendencias/pendencia-modal"
import { PendenciasFilters } from "@/components/pendencias/pendencias-filters"
import { PendenciaWithDetails, FilterState } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function PendenciasPage() {
  const [pendencias, setPendencias] = useState<PendenciaWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPendencia, setSelectedPendencia] = useState<PendenciaWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    tipo: null,
    prioridade: null,
    responsavel: null,
  })
  const [searchTerm, setSearchTerm] = useState("")

    // Carrega pendências da API
  useEffect(() => {
    const loadPendencias = async () => {
      try {
        setIsLoading(true)
        
        // Construir query string com os filtros
        const params = new URLSearchParams()
        
        // Apenas adiciona os filtros que têm valor
        if (filters.status) params.append('status', filters.status)
        if (filters.tipo) params.append('tipo', filters.tipo)
        if (filters.prioridade) params.append('prioridade', filters.prioridade.toString())
        
        // Tratamento especial para o filtro de responsável
        if (filters.responsavel === 'none') {
          // Filtra por pendências sem responsável
          params.append('responsavel', 'none')
        } else if (filters.responsavel && filters.responsavel !== 'all') {
          // Filtra por um responsável específico
          params.append('responsavel', filters.responsavel)
        }
        
        const queryString = params.toString()
        const url = `/api/pendencias${queryString ? `?${queryString}` : ''}`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.ok) {
          // Garante que todas as pendências tenham o campo kanban_status
          const pendenciasComStatus = data.data.map((p: any) => ({
            ...p,
            kanban_status: p.kanban_status || 'A_FAZER' // Valor padrão se não existir
          }))
          
          setPendencias(pendenciasComStatus)
        } else {
          // Fallback para dados mock se der erro
          const { getPendenciasWithDetails } = await import('@/lib/mock-data')
          setPendencias(getPendenciasWithDetails())
        }
      } catch (error) {
        // Fallback para dados mock se der erro
        const { getPendenciasWithDetails } = await import('@/lib/mock-data')
        setPendencias(getPendenciasWithDetails())
      } finally {
        setIsLoading(false)
      }
    }

    loadPendencias()
  }, [filters]) // Recarrega quando os filtros mudarem

  const handleUpdatePendencia = async (id: number, updates: Partial<PendenciaWithDetails>) => {
    try {
      // Atualiza UI otimisticamente
      setPendencias(prev => 
        prev.map(p => 
          p.id_pendencia_sinalizada === id 
            ? { ...p, ...updates }
            : p
        )
      )

      // Atualiza no banco com todos os campos modificados
      const response = await fetch('/api/pendencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: updates.status,
          descricao: updates.descricao,
          prioridade: updates.prioridade,
          id_responsavel: updates.id_responsavel,
          resolution_note: updates.resolution_note
        })
      })

      const data = await response.json()
      
      if (!data.ok) {
        console.error('Erro ao atualizar no banco:', data.error)
        // Reverte a mudança otimística se falhou
        setPendencias(prev => 
          prev.map(p => 
            p.id_pendencia_sinalizada === id 
              ? { ...p, ...updates } // Reverte para valores anteriores
              : p
          )
        )
      }
    } catch (error) {
      console.error('Erro na atualização:', error)
      // Reverte a mudança otimística se falhou
      setPendencias(prev => 
        prev.map(p => 
          p.id_pendencia_sinalizada === id 
            ? { ...p, status: p.status } // Reverte para status anterior
            : p
        )
      )
    }
  }

  const handleEditPendencia = (pendencia: PendenciaWithDetails) => {
    setSelectedPendencia(pendencia)
    setIsModalOpen(true)
  }

  const handleCreatePendencia = () => {
    setSelectedPendencia(null)
    setIsModalOpen(true)
  }

  // A busca por termo ainda é feita no frontend por ser mais simples e não exigir uma nova requisição
  const filteredPendencias = searchTerm
    ? pendencias.filter(pendencia => {
        if (!pendencia) return false;
        
        const searchLower = searchTerm.toLowerCase();
        const descricao = pendencia.descricao?.toLowerCase() || '';
        const id = pendencia.id_pendencia_sinalizada?.toString() || '';
        const nomePessoa = pendencia.pessoa?.nome_completo?.toLowerCase() || '';

        return (
          descricao.includes(searchLower) ||
          id.includes(searchTerm) ||
          nomePessoa.includes(searchLower)
        );
      })
    : pendencias;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pendências</h1>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Nova Pendência
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando pendências do banco...</p>
          </div>
        </div>
      </div>
    )
  }

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
