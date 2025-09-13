"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PendenciaWithDetails, type KanbanColumn } from "@/lib/types"
import { PendenciaCard } from "@/components/pendencias/pendencia-card"

interface KanbanColumnProps {
  column: {
    id: KanbanColumn
    title: string
    description: string
  }
  pendencias: PendenciaWithDetails[]
  onEditPendencia: (pendencia: PendenciaWithDetails) => void
}

export function KanbanColumn({ column, pendencias, onEditPendencia }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const getColumnColor = (columnId: KanbanColumn) => {
    switch (columnId) {
      case "A_FAZER":
        return "border-blue-200 bg-blue-50/50"
      case "FAZENDO":
        return "border-yellow-200 bg-yellow-50/50"
      case "FEITO":
        return "border-green-200 bg-green-50/50"
      default:
        return "border-gray-200 bg-gray-50/50"
    }
  }

  const getBadgeColor = (columnId: KanbanColumn) => {
    switch (columnId) {
      case "A_FAZER":
        return "bg-blue-100 text-blue-800"
      case "FAZENDO":
        return "bg-yellow-100 text-yellow-800"
      case "FEITO":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className={`w-80 flex-shrink-0 ${getColumnColor(column.id)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
          <Badge variant="secondary" className={getBadgeColor(column.id)}>
            {pendencias.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{column.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          ref={setNodeRef}
          className="space-y-3 min-h-[200px]"
        >
          <SortableContext
            items={pendencias.map(p => p.id_pendencia_sinalizada.toString())}
            strategy={verticalListSortingStrategy}
          >
            {pendencias.map((pendencia) => (
              <PendenciaCard
                key={pendencia.id_pendencia_sinalizada}
                pendencia={pendencia}
                onEdit={onEditPendencia}
              />
            ))}
          </SortableContext>
          
          {pendencias.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
              Nenhuma pendência
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
