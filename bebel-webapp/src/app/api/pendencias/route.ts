// Endpoint para buscar pendências do banco
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Tipos para as pendências vindas do banco
interface PendenciaDB {
  id_pendencia_sinalizada: number
  id_conversa: number
  id_mensagem_origem?: number
  tipo: string
  descricao?: string
  prioridade: number
  sla_at?: string
  status: 'SINALIZADA' | 'RESOLVIDA' | 'IGNORADA'
  detected_at: string
  resolved_at?: string
  resolution_note?: string
  id_responsavel?: number
  responsavel_nome?: string
  responsavel_especialidade?: string
  
  // Novos campos da pessoa
  id_pessoa?: number
  pessoa_nome?: string
  pessoa_status?: string
  stage?: string
  lead_score?: number
  consent_marketing?: boolean
}

export async function GET() {
  try {
    // Consulta SQL para buscar pendências com dados do responsável e da pessoa
    const sql = `
      SELECT 
        p.id_pendencia_sinalizada,
        p.id_conversa,
        p.id_mensagem_origem,
        p.tipo,
        p.descricao,
        p.prioridade,
        p.sla_at,
        p.status,
        p.detected_at,
        p.resolved_at,
        p.resolution_note,
        p.id_responsavel,
        prof.nome_completo as responsavel_nome,
        prof.especialidade as responsavel_especialidade,
        pes.id_pessoa,
        pes.nome_completo as pessoa_nome,
        pes.status as pessoa_status,
        pes.stage,
        pes.lead_score,
        pes.consent_marketing
      FROM bebel.pendencia_sinalizada p
      LEFT JOIN bebel.profissionais prof ON p.id_responsavel = prof.id_profissional
      LEFT JOIN bebel.conversas c ON p.id_conversa = c.id_conversa
      LEFT JOIN bebel.pessoas pes ON c.id_pessoa = pes.id_pessoa
      ORDER BY p.detected_at DESC
      LIMIT 50
    `
    
    const { rows } = await query<PendenciaDB>(sql)
    
    // Transforma os dados do banco no formato esperado pelo frontend
    const pendenciasFormatadas = rows.map(pendencia => {
      // Mapeia status para colunas do Kanban
      let kanban_status: 'A_FAZER' | 'FAZENDO' | 'FEITO'
      switch (pendencia.status) {
        case 'SINALIZADA':
          kanban_status = pendencia.prioridade >= 3 ? 'FAZENDO' : 'A_FAZER'
          break
        case 'RESOLVIDA':
        case 'IGNORADA':
          kanban_status = 'FEITO'
          break
        default:
          kanban_status = 'A_FAZER'
      }

      return {
        ...pendencia,
        kanban_status,
        // Dados do responsável vindos do banco
        responsavel: pendencia.id_responsavel ? {
          id_profissional: pendencia.id_responsavel,
          nome_completo: pendencia.responsavel_nome || 'Responsável não encontrado',
          especialidade: pendencia.responsavel_especialidade || null
        } : null,
        // Dados da pessoa/conversa
        pessoa: pendencia.id_pessoa ? {
          id_pessoa: pendencia.id_pessoa,
          nome_completo: pendencia.pessoa_nome || 'Cliente',
          status: pendencia.pessoa_status || 'LEAD',
          stage: pendencia.stage || 'NOVO',
          lead_score: pendencia.lead_score || 0,
          consent_marketing: pendencia.consent_marketing || false,
        } : {
          id_pessoa: 0,
          nome_completo: 'Cliente',
          status: 'LEAD',
          stage: 'NOVO',
          lead_score: 0,
          consent_marketing: false
        },
        conversa: {
          id_conversa: pendencia.id_conversa,
          id_pessoa: pendencia.id_pessoa || 0,
          canal: 'WHATSAPP' as const,
          status: 'OPEN' as const,
          started_at: pendencia.detected_at,
          resumo_conversa: 'Conversa relacionada à pendência'
        }
      }
    })
    
    return NextResponse.json({ 
      ok: true, 
      data: pendenciasFormatadas,
      count: rows.length 
    })
  } catch (err: any) {
    console.error('Erro ao buscar pendências:', err)
    
    // Fallback: retorna dados mock se der erro
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err),
      hint: 'Verifique se a tabela bebel.pendencia_sinalizada existe e se os nomes das colunas estão corretos.',
      fallback: 'Usando dados mock por enquanto'
    }, { status: 500 })
  }
}

// Endpoint para atualizar pendência
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, status, descricao, prioridade, id_responsavel, resolution_note } = body

    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'ID é obrigatório'
      }, { status: 400 })
    }

    // Determina resolved_at baseado no status
    const resolved_at = status === 'RESOLVIDA' ? new Date().toISOString() : null

    // Monta a query dinamicamente baseado nos campos fornecidos
    const updates = []
    const values = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++
    }

    if (descricao !== undefined) {
      updates.push(`descricao = $${paramIndex}`)
      values.push(descricao)
      paramIndex++
    }

    if (prioridade !== undefined) {
      updates.push(`prioridade = $${paramIndex}`)
      values.push(prioridade)
      paramIndex++
    }

    if (id_responsavel !== undefined) {
      updates.push(`id_responsavel = $${paramIndex}`)
      values.push(id_responsavel)
      paramIndex++
    }

    if (resolution_note !== undefined) {
      updates.push(`resolution_note = $${paramIndex}`)
      values.push(resolution_note)
      paramIndex++
    }

    if (resolved_at !== undefined) {
      updates.push(`resolved_at = $${paramIndex}`)
      values.push(resolved_at)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'Nenhum campo para atualizar foi fornecido'
      }, { status: 400 })
    }

    // Adiciona o ID como último parâmetro
    values.push(id)

    const sql = `
      UPDATE bebel.pendencia_sinalizada 
      SET ${updates.join(', ')}
      WHERE id_pendencia_sinalizada = $${paramIndex}
      RETURNING *
    `
    
    const { rows } = await query(sql, values)
    
    if (rows.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'Pendência não encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Status atualizado com sucesso',
      data: rows[0]
    })
  } catch (err: any) {
    console.error('Erro ao atualizar pendência:', err)
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err)
    }, { status: 500 })
  }
}
