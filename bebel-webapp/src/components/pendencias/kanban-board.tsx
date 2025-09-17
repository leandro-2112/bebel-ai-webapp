"use client"

import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove, SortableContext } from "@dnd-kit/sortable"
import { PendenciaWithDetails, KanbanColumn } from "@/lib/types"
import { KanbanColumn as KanbanColumnComponent } from "@/components/pendencias/kanban-column"
import { PendenciaCard } from "@/components/pendencias/pendencia-card"

interface KanbanBoardProps {
  pendencias: PendenciaWithDetails[]
  onUpdatePendencia: (id: number, updates: Partial<PendenciaWithDetails>) => void
  onEditPendencia: (pendencia: PendenciaWithDetails) => void
}

const columns: { id: KanbanColumn; title: string; description: string }[] = [
  {
    id: "A_FAZER",
    title: "A Fazer",
    description: "Pendências aguardando início"
  },
  {
    id: "FAZENDO",
    title: "Fazendo",
    description: "Pendências em andamento"
  },
  {
    id: "FEITO",
    title: "Feito",
    description: "Pendências concluídas"
  }
]

export function KanbanBoard({ pendencias, onUpdatePendencia, onEditPendencia }: KanbanBoardProps) {
  console.log('KanbanBoard recebeu pendencias:', pendencias)
  
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    
    // Find the pendencia being dragged
    const activePendencia = pendencias.find(p => p.id_pendencia_sinalizada.toString() === activeId.toString())
    if (!activePendencia) return

    // Determine the new column
    let newColumn: KanbanColumn
    if (columns.some(col => col.id === overId)) {
      newColumn = overId as KanbanColumn
    } else {
      // If dropped on a card, find which column it belongs to
      const targetPendencia = pendencias.find(p => p.id_pendencia_sinalizada.toString() === overId.toString())
      if (!targetPendencia) return
      newColumn = targetPendencia.kanban_status
    }

    // Update the pendencia status based on column
    let newStatus: 'SINALIZADA' | 'RESOLVIDA' | 'IGNORADA' = 'SINALIZADA'
    if (newColumn === 'FEITO') {
      newStatus = 'RESOLVIDA'
    }

    // Only update if the column actually changed
    if (activePendencia.kanban_status !== newColumn) {
      onUpdatePendencia(activePendencia.id_pendencia_sinalizada, {
        kanban_status: newColumn,
        status: newStatus,
        resolved_at: newStatus === 'RESOLVIDA' ? new Date().toISOString() : null
      })
    }

    setActiveId(null)
  }

  const getPendenciasByColumn = (columnId: KanbanColumn) => {
    console.log(`getPendenciasByColumn chamado para coluna: ${columnId}`)
    
    if (!pendencias || !Array.isArray(pendencias)) {
      console.error('pendencias não é um array:', pendencias)
      return []
    }
    
    // Garante que kanban_status está definido e é uma string
    const filtered = pendencias.filter(p => {
      if (!p) {
        console.warn('Item nulo encontrado em pendencias')
        return false
      }
      
      // Garante que o ID da pendência é uma string para comparação
      const pendenciaId = p.id_pendencia_sinalizada?.toString()
      if (!pendenciaId) return false
      
      // Normaliza o status para garantir comparação consistente
      const status = (p.kanban_status || 'A_FAZER').toString().toUpperCase().trim() as KanbanColumn
      const targetColumn = columnId.toString().toUpperCase().trim()
      
      console.log(`Verificando pendência ${pendenciaId} - status: ${status}, coluna: ${targetColumn}`)
      
      const matches = status === targetColumn
      console.log(`Pendência ${pendenciaId} ${matches ? 'corresponde' : 'não corresponde'} à coluna ${targetColumn}`)
      
      return matches
    })
    
    console.log(`Total de ${filtered.length} pendências encontradas para a coluna ${columnId}`)
    return filtered
  }

  const activePendencia = activeId ? pendencias.find(p => p.id_pendencia_sinalizada.toString() === activeId.toString()) : null

  // Verificar se há dados para exibir
  const hasData = pendencias && pendencias.length > 0
  console.log('Tem dados para exibir?', hasData)
  
  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhuma pendência encontrada</p>
          <p className="text-sm text-muted-foreground">Verifique os filtros ou tente novamente mais tarde.</p>
          <pre className="mt-4 rounded bg-muted p-4 text-left text-xs">
            {JSON.stringify({
              totalPendencias: pendencias?.length || 0,
              sample: pendencias?.[0] || 'Nenhuma pendência disponível'
            }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            pendencias={getPendenciasByColumn(column.id)}
            onEditPendencia={onEditPendencia}
          />
        ))}
        <DragOverlay>
          {activePendencia && (
            <div className="w-80">
              <PendenciaCard
                pendencia={activePendencia}
                onEdit={onEditPendencia}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
