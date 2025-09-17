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
    if (!pendencias || !Array.isArray(pendencias)) {
      return []
    }
    
    // Garante que kanban_status está definido e é uma string
    return pendencias.filter(p => {
      if (!p) return false
      
      // Garante que o ID da pendência é uma string para comparação
      const pendenciaId = p.id_pendencia_sinalizada?.toString()
      if (!pendenciaId) return false
      
      // Garante que kanban_status é uma string e usa valor padrão se não existir
      const status = (p.kanban_status || 'A_FAZER').toUpperCase() as KanbanColumn
      
      return status === columnId
    })
  }

  const activePendencia = activeId ? pendencias.find(p => p.id_pendencia_sinalizada.toString() === activeId.toString()) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnPendencias = getPendenciasByColumn(column.id)
          return (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              pendencias={columnPendencias}
              onEditPendencia={onEditPendencia}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activePendencia ? (
          <div className="w-80">
            <PendenciaCard
              pendencia={activePendencia}
              onEdit={onEditPendencia}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
