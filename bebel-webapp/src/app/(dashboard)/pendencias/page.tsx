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
        
        if (filters.status) params.append('status', filters.status)
        if (filters.tipo) params.append('tipo', filters.tipo)
        if (filters.prioridade) params.append('prioridade', filters.prioridade.toString())
        if (filters.responsavel) params.append('responsavel', filters.responsavel)
        
        const queryString = params.toString()
        const url = `/api/pendencias${queryString ? `?${queryString}` : ''}`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.ok) {
          console.log('Dados recebidos da API:', data.data)
          console.log('Total de pendências recebidas:', data.data.length)
          
          // Verifica se as pendências têm o campo kanban_status
          const pendenciasComStatus = data.data.map((p: any) => {
            if (!p.kanban_status) {
              console.warn('Pendência sem kanban_status:', p.id_pendencia_sinalizada)
              return {
                ...p,
                kanban_status: 'A_FAZER' // Valor padrão
              }
            }
            return p
          })
          
          console.log('Pendências após validação:', pendenciasComStatus)
          setPendencias(pendenciasComStatus)
        } else {
          console.error('Erro ao carregar pendências:', data.error)
          // Fallback para dados mock se der erro
          const { getPendenciasWithDetails } = await import('@/lib/mock-data')
          setPendencias(getPendenciasWithDetails())
        }
      } catch (error) {
        console.error('Erro na requisição:', error)
        // Fallback para dados mock se der erro
        const { getPendenciasWithDetails } = await import('@/lib/mock-data')
        setPendencias(getPendenciasWithDetails())
      } finally {
        setIsLoading(false)
      }
    }

    loadPendencias()
  }, [filters])

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

  // Aplicar filtros
  const filteredPendencias = pendencias.filter(pendencia => {
    if (!pendencia) return false;
    
    // Log para depuração
    console.log('Avaliando pendência:', {
      id: pendencia.id_pendencia_sinalizada,
      status: pendencia.status,
      kanban_status: pendencia.kanban_status,
      responsavel: pendencia.id_responsavel,
      filtros: filters
    });

    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const descricao = pendencia.descricao?.toLowerCase() || '';
      const id = pendencia.id_pendencia_sinalizada?.toString() || '';
      const nomePessoa = pendencia.pessoa?.nome_completo?.toLowerCase() || '';
      
      const matchesSearch = 
        descricao.includes(searchLower) ||
        id.includes(searchTerm) ||
        nomePessoa.includes(searchLower);
      
      if (!matchesSearch) {
        console.log('Filtrado por termo de busca:', pendencia.id_pendencia_sinalizada);
        return false;
      }
    }

    // Filtro de status
    if (filters.status && pendencia.status !== filters.status) {
      console.log('Filtrado por status:', pendencia.id_pendencia_sinalizada);
      return false;
    }

    // Filtro de tipo
    if (filters.tipo && pendencia.tipo !== filters.tipo) {
      console.log('Filtrado por tipo:', pendencia.id_pendencia_sinalizada);
      return false;
    }

    // Filtro de prioridade
    if (filters.prioridade && pendencia.prioridade !== filters.prioridade) {
      console.log('Filtrado por prioridade:', pendencia.id_pendencia_sinalizada);
      return false;
    }

    // Filtro de responsável
    if (filters.responsavel) {
      if (filters.responsavel === "none") {
        // Filtra pendências sem responsável
        if (pendencia.id_responsavel !== null) {
          console.log('Filtrado por sem responsável:', pendencia.id_pendencia_sinalizada);
          return false;
        }
      } else if (filters.responsavel !== "all") {
        // Converte ambos para string para garantir a comparação correta
        const pendenciaResponsavel = pendencia.id_responsavel?.toString() || '';
        const filtroResponsavel = filters.responsavel.toString();
        
        if (pendenciaResponsavel !== filtroResponsavel) {
          console.log('Filtrado por responsável:', {
            id: pendencia.id_pendencia_sinalizada,
            pendenciaResponsavel,
            filtroResponsavel,
            tipoPendencia: typeof pendenciaResponsavel,
            tipoFiltro: typeof filtroResponsavel
          });
          return false;
        }
      }
    }
    
    console.log('Pendência incluída:', pendencia.id_pendencia_sinalizada);
    return true;
  })

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
        {(() => {
          console.log('Pendências filtradas antes de passar para o KanbanBoard:', {
            count: filteredPendencias.length,
            pendencias: filteredPendencias.map(p => ({
              id: p?.id_pendencia_sinalizada,
              status: p?.status,
              kanban_status: p?.kanban_status,
              responsavel: p?.id_responsavel
            }))
          })
          return null
        })()}
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
