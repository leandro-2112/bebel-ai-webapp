// Endpoint para buscar profissionais
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface Profissional {
  id_profissional: number
  nome_completo: string
  especialidade?: string
  ativo: boolean
  fg_padrao_pendencia: boolean
}

export async function GET() {
  try {
    // Busca todos os profissionais ativos
    const sql = `
      SELECT 
        id_profissional,
        nome_completo,
        especialidade,
        ativo,
        fg_padrao_pendencia
      FROM bebel.profissionais 
      WHERE ativo = true
      ORDER BY 
        fg_padrao_pendencia DESC,  -- Profissional padrão primeiro
        nome_completo ASC
    `
    
    const { rows } = await query<Profissional>(sql)
    
    // Encontra o profissional padrão
    const profissionalPadrao = rows.find(p => p.fg_padrao_pendencia === true)
    
    return NextResponse.json({ 
      ok: true, 
      data: rows,
      profissional_padrao: profissionalPadrao || null,
      count: rows.length 
    })
  } catch (err: any) {
    console.error('Erro ao buscar profissionais:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || String(err) 
    }, { status: 500 })
  }
}
