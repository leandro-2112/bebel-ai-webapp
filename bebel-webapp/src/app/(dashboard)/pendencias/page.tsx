"use client"

import { useState, useCallback } from "react"
import { KanbanBoard } from "@/components/pendencias/kanban-board"
import { PendenciaModal } from "@/components/pendencias/pendencia-modal"
import { PendenciasFilters } from "@/components/pendencias/pendencias-filters"
import { PendenciaWithDetails, FilterState } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { usePendencias, useUpdatePendencia } from "@/hooks/usePendencias"
import { useToast } from "@/components/ui/use-toast"

// Função para construir a query string de filtros
const buildQueryString = (filters: FilterState) => {
  const params = new URLSearchParams()
  
  // Apenas adiciona os filtros que têm valor
  if (filters.status) params.append('status', filters.status)
  if (filters.tipo) params.append('tipo', filters.tipo)
  if (filters.prioridade) params.append('prioridade', filters.prioridade.toString())
  
  // Tratamento especial para o filtro de responsável
  if (filters.responsavel === 'none') {
    params.append('responsavel', 'none')
  } else if (filters.responsavel && filters.responsavel !== 'all') {
    params.append('responsavel', filters.responsavel)
  }
  
  return params.toString()
}

export default function PendenciasPage() {
  const [selectedPendencia, setSelectedPendencia] = useState<PendenciaWithDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    tipo: null,
    prioridade: null,
    responsavel: null,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  
  // Construir a query string baseada nos filtros
  const queryString = buildQueryString(filters)
  console.log('Query string construída:', queryString);
  
  const { 
    pendencias = [], 
    isLoading, 
    isError, 
    error,
    mutate 
  } = usePendencias(queryString)
  
  console.log('Dados retornados pelo hook usePendencias:', {
    pendenciasCount: pendencias.length,
    isLoading,
    isError,
    error: error?.message
  });
  
  const { updatePendencia } = useUpdatePendencia()

  // Função para lidar com erros
  const handleError = (error: Error) => {
    console.error('Erro:', error)
    toast({
      title: 'Erro',
      description: 'Ocorreu um erro ao processar a requisição.',
      variant: 'destructive',
    })
  }

  const handleUpdatePendencia = async (id: number, updates: Partial<PendenciaWithDetails>) => {
    try {
      // Atualização otimística com SWR
      await updatePendencia(id, updates)
      
      toast({
        title: 'Sucesso',
        description: 'Pendência atualizada com sucesso!',
      })
    } catch (error) {
      handleError(error as Error)
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
  console.log('Antes de filtrar - Total de pendencias:', pendencias.length);
  console.log('Termo de busca:', searchTerm);
  
  const filteredPendencias = searchTerm
    ? pendencias.filter(pendencia => {
        if (!pendencia) {
          console.warn('Pendência nula encontrada no array');
          return false;
        }
        
        const searchLower = searchTerm.toLowerCase();
        const descricao = pendencia.descricao?.toLowerCase() || '';
        const id = pendencia.id_pendencia_sinalizada?.toString() || '';
        const nomePessoa = pendencia.pessoa?.nome_completo?.toLowerCase() || '';
        
        console.log('Filtrando pendência:', {
          id: pendencia.id_pendencia_sinalizada,
          descricao: pendencia.descricao,
          nomePessoa: pendencia.pessoa?.nome_completo
        });

        const matches = (
          descricao.includes(searchLower) ||
          id.includes(searchTerm) ||
          nomePessoa.includes(searchLower)
        );
        
        console.log(`Pendência ${pendencia.id_pendencia_sinalizada} ${matches ? 'corresponde' : 'não corresponde'} ao termo de busca`);
        return matches;
      })
    : pendencias;
    
  console.log('Depois de filtrar - Total de pendencias:', filteredPendencias.length);

  if (isLoading && !pendencias.length) {
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
  
  if (isError) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pendências</h1>
          <Button 
            onClick={() => mutate()}
            variant="outline"
          >
            Tentar novamente
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">Erro ao carregar as pendências</p>
            <Button 
              onClick={() => mutate()}
              variant="outline"
              className="mt-4"
            >
              Tentar novamente
            </Button>
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
          async (id, updates) => {
            try {
              const response = await fetch('/api/pendencias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              })
              
              if (!response.ok) throw new Error('Erro ao criar pendência')
              
              const newPendencia = await response.json()
              
              // Atualiza o cache do SWR com a nova pendência
              mutate((current: PendenciaWithDetails[] | undefined) => 
                current ? [...current, newPendencia] : [newPendencia]
              )
              
              toast({
                title: 'Sucesso',
                description: 'Pendência criada com sucesso!',
              })
              
              return true
            } catch (error) {
              handleError(error as Error)
              return false
            }
          }
        }
      />
    </div>
  )
}
