"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, MessageSquare, User } from "lucide-react"
import { PendenciaWithDetails, Profissional } from "@/lib/types"
import { getTipoLabel, getPriorityLabel, getPriorityColor } from "@/lib/mock-data"

const formSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  prioridade: z.number().min(1).max(5),
  status: z.enum(["SINALIZADA", "RESOLVIDA", "IGNORADA"]),
  id_responsavel: z.number().optional(),
  resolution_note: z.string().optional(),
})

interface PendenciaModalProps {
  pendencia: PendenciaWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: number, updates: Partial<PendenciaWithDetails>) => void
}

export function PendenciaModal({ pendencia, open, onOpenChange, onSave }: PendenciaModalProps) {
  const [profissionais, setProfissionais] = React.useState<Profissional[]>([])
  const [isLoadingProfissionais, setIsLoadingProfissionais] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      prioridade: 3,
      status: "SINALIZADA",
      id_responsavel: undefined,
      resolution_note: "",
    },
  })

  // Carrega profissionais quando o modal abre
  React.useEffect(() => {
    if (open) {
      const loadProfissionais = async () => {
        try {
          setIsLoadingProfissionais(true)
          const response = await fetch('/api/profissionais')
          const data = await response.json()
          if (data.ok) {
            setProfissionais(data.data)
          }
        } catch (error) {
          console.error('Erro ao carregar profissionais:', error)
        } finally {
          setIsLoadingProfissionais(false)
        }
      }
      loadProfissionais()
    }
  }, [open])

  // Update form when pendencia changes
  React.useEffect(() => {
    if (pendencia) {
      form.reset({
        descricao: pendencia.descricao || "",
        prioridade: pendencia.prioridade,
        status: pendencia.status,
        id_responsavel: pendencia.id_responsavel || undefined,
        resolution_note: pendencia.resolution_note || "",
      })
    }
  }, [pendencia, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!pendencia) return

    const updates: Partial<PendenciaWithDetails> = {
      descricao: values.descricao,
      prioridade: values.prioridade as 1 | 2 | 3 | 4 | 5,
      status: values.status,
      id_responsavel: values.id_responsavel || null,
      resolution_note: values.resolution_note || null,
    }

    // Set resolved_at if status is RESOLVIDA
    if (values.status === "RESOLVIDA" && pendencia.status !== "RESOLVIDA") {
      updates.resolved_at = new Date().toISOString()
    } else if (values.status !== "RESOLVIDA") {
      updates.resolved_at = null
    }

    // Update kanban status based on status
    if (values.status === "RESOLVIDA" || values.status === "IGNORADA") {
      updates.kanban_status = "FEITO"
    } else {
      updates.kanban_status = values.prioridade >= 3 ? "FAZENDO" : "A_FAZER"
    }

    onSave(pendencia.id_pendencia_sinalizada, updates)
    onOpenChange(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!pendencia) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogTitle className="sr-only">Detalhes da Pendência</DialogTitle>
        <div className="space-y-4">
          {/* Top Bar with Person and Conversation Button */}
          <div className="flex items-center justify-between">
            {/* Person Info */}
            {pendencia.pessoa && (
              <div className="flex items-center gap-2 p-2 rounded-lg">
                <User className="h-10 w-10 text-gray-500" />
                <div>
                  <p className="font-medium">{pendencia.pessoa.nome_completo || 'Sem nome'}</p>
                  <p className="text-sm text-gray-500">
                    {pendencia.pessoa.status} • Score: {pendencia.pessoa.lead_score}
                  </p>
                </div>
              </div>
            )}

            {/* Conversation Button */}
            {pendencia.conversa && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Navigate to conversation:', pendencia.conversa?.id_conversa)
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1.5" /> Ver conversa
              </Button>
            )}
          </div>

          {/* Pendencia Info */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">
              {getTipoLabel(pendencia.tipo)}
            </Badge>
            <Badge 
              variant="secondary" 
              className={getPriorityColor(pendencia.prioridade)}
            >
              {getPriorityLabel(pendencia.prioridade)}
            </Badge>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Detectada em:
              </p>
              <p className="text-gray-500">{formatDate(pendencia.detected_at)}</p>
            </div>
            {pendencia.sla_at && (
              <div>
                <p className="font-medium">SLA:</p>
                <p className={`${new Date(pendencia.sla_at) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatDate(pendencia.sla_at)}
                  {new Date(pendencia.sla_at) < new Date() && ' (Vencido)'}
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva a pendência..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="prioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 - Muito Baixa</SelectItem>
                          <SelectItem value="2">2 - Baixa</SelectItem>
                          <SelectItem value="3">3 - Média</SelectItem>
                          <SelectItem value="4">4 - Alta</SelectItem>
                          <SelectItem value="5">5 - Muito Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SINALIZADA">Sinalizada</SelectItem>
                          <SelectItem value="RESOLVIDA">Resolvida</SelectItem>
                          <SelectItem value="IGNORADA">Ignorada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              

              <FormField
                control={form.control}
                name="id_responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      value={field.value === null ? "none" : field.value?.toString()}
                      disabled={isLoadingProfissionais}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingProfissionais ? "Carregando..." : "Selecione o responsável"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {profissionais.map((prof) => (
                          <SelectItem key={prof.id_profissional} value={prof.id_profissional.toString()}>
                            {prof.nome_completo} {prof.especialidade && `(${prof.especialidade})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="resolution_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota de Resolução (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione uma nota sobre a resolução..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
