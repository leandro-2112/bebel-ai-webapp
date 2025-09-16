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
}

export async function GET() {
  try {
    // Consulta SQL para buscar pendências no schema bebel
    const sql = `
      SELECT 
        id_pendencia_sinalizada,
        id_conversa,
        id_mensagem_origem,
        tipo,
        descricao,
        prioridade,
        sla_at,
        status,
        detected_at,
        resolved_at,
        resolution_note
      FROM bebel.pendencia_sinalizada
      ORDER BY detected_at DESC
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
        // Adiciona dados mock para pessoa/conversa por enquanto
        pessoa: {
          id_pessoa: 1,
          nome_completo: 'Cliente do Banco',
          status: 'LEAD',
          stage: 'NOVO',
          lead_score: 0,
          consent_marketing: false,
        },
        conversa: {
          id_conversa: pendencia.id_conversa,
          id_pessoa: 1,
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

// Endpoint para atualizar status de pendência
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, status, kanban_status } = body

    if (!id || !status) {
      return NextResponse.json({
        ok: false,
        error: 'ID e status são obrigatórios'
      }, { status: 400 })
    }

    // Determina resolved_at baseado no status
    const resolved_at = status === 'RESOLVIDA' ? new Date().toISOString() : null

    // Atualiza no banco
    const sql = `
      UPDATE bebel.pendencia_sinalizada 
      SET 
        status = $1,
        resolved_at = $2
      WHERE id_pendencia_sinalizada = $3
      RETURNING *
    `
    
    const { rows } = await query(sql, [status, resolved_at, id])
    
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
