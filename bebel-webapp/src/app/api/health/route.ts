// Endpoint para testar conexão com o banco
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Função que responde a requisições GET para /api/health
export async function GET() {
  try {
    // Testa a conexão fazendo uma consulta simples
    const { rows } = await query<{ test: number }>('SELECT 1 as test')
    
    // Se chegou até aqui, a conexão funcionou
    return NextResponse.json({ 
      ok: true, 
      message: 'Conexão com banco funcionando!',
      result: rows[0] 
    })
  } catch (err: any) {
    // Se deu erro, retorna detalhes do problema
    console.error('Erro na conexão com banco:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || String(err) 
    }, { status: 500 })
  }
}
