"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MessageSquare, User, GripVertical } from "lucide-react"
import { PendenciaWithDetails } from "@/lib/types"
import { getPriorityLabel, getPriorityColor, getTipoLabel } from "@/lib/mock-data"

interface PendenciaCardProps {
  pendencia: PendenciaWithDetails
  onEdit: (pendencia: PendenciaWithDetails) => void
  isDragging?: boolean
}

export function PendenciaCard({ pendencia, onEdit, isDragging = false }: PendenciaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: pendencia.id_pendencia_sinalizada.toString(),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOverdue = pendencia.sla_at && new Date(pendencia.sla_at) < new Date()

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer transition-all hover:shadow-md py-1 ${
        isDragging || isSortableDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${isOverdue ? '' : ''} flex flex-col h-full min-h-[140px]`}
      onClick={() => onEdit(pendencia)}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Seção superior fixa - Badges e Texto */}
        <div className="flex-shrink-0 p-2.5 pb-0">
          <div className="flex justify-between items-start gap-1.5 mb-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs h-5 px-2 py-0 border-muted-foreground/30">
                {getTipoLabel(pendencia.tipo)}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs h-5 px-2 py-0 ${getPriorityColor(pendencia.prioridade)}`}
              >
                {getPriorityLabel(pendencia.prioridade)}
              </Badge>
            </div>
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -mt-1 -mr-1 hover:bg-accent rounded flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
  
          <div>
            <p className="text-sm font-normal line-clamp-3 text-foreground mb-2 p-2">
              {pendencia.descricao || 'Sem descrição'}
            </p>
  
            {pendencia.pessoa && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-1">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{pendencia.pessoa.nome_completo || 'Sem nome'}</span>
              </div>
            )}
          </div>
        </div>
  
        {/* Espaço flexível que empurra o conteúdo inferior para baixo */}
        <div className="flex-grow p-1"></div>

  
        {/* Seção inferior fixa - Data e botão */}
        <div className="flex-shrink-0 flex items-center justify-between text-xs p-2.5 pt-2 border-t border-muted/30">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 flex-shrink-1" />
            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
              {formatDate(pendencia.detected_at)}
              {isOverdue && ' '}
            </span>
          </div>
          
          {pendencia.conversa && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs -mr-2 text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Navigate to conversation
                console.log('Navigate to conversation:', pendencia.conversa?.id_conversa)
              }}
            >
              <MessageSquare className="h-3 w-3 mr-1.0" /> Ver conversa
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
