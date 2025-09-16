// Endpoint para listar tabelas disponíveis no banco
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    
    if (table) {
      // Mostra estrutura de uma tabela específica
      const sql = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'bebel' 
        AND table_name = $1
        ORDER BY ordinal_position
      `
      
      const { rows } = await query(sql, [table])
      
      return NextResponse.json({ 
        ok: true, 
        table_name: table,
        columns: rows,
        schema: 'bebel'
      })
    } else {
      // Lista todas as tabelas no schema bebel
      const sql = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'bebel'
        ORDER BY table_name
      `
      
      const { rows } = await query<{ table_name: string }>(sql)
      
      return NextResponse.json({ 
        ok: true, 
        tables: rows.map(row => row.table_name),
        count: rows.length,
        schema: 'bebel'
      })
    }
  } catch (err: any) {
    console.error('Erro ao listar tabelas:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || String(err) 
    }, { status: 500 })
  }
}
