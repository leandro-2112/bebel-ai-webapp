// Endpoint para executar migrações do banco
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'add_responsavel_column') {
      // 1. Adiciona a coluna id_responsavel
      await query(`
        ALTER TABLE bebel.pendencia_sinalizada 
        ADD COLUMN IF NOT EXISTS id_responsavel BIGINT
      `)

      // 2. Busca o profissional padrão
      const { rows: profissionais } = await query(`
        SELECT id_profissional 
        FROM bebel.profissionais 
        WHERE fg_padrao_pendencia = true 
        LIMIT 1
      `)

      if (profissionais.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'Nenhum profissional padrão encontrado'
        }, { status: 400 })
      }

      const profissionalPadraoId = profissionais[0].id_profissional

      // 3. Atualiza pendências sem responsável para usar o padrão
      const { rows: updated } = await query(`
        UPDATE bebel.pendencia_sinalizada 
        SET id_responsavel = $1 
        WHERE id_responsavel IS NULL
        RETURNING id_pendencia_sinalizada
      `, [profissionalPadraoId])

      // 4. Adiciona constraint de foreign key
      await query(`
        ALTER TABLE bebel.pendencia_sinalizada 
        ADD CONSTRAINT IF NOT EXISTS fk_pendencia_responsavel 
        FOREIGN KEY (id_responsavel) 
        REFERENCES bebel.profissionais(id_profissional)
      `)

      return NextResponse.json({
        ok: true,
        message: 'Coluna id_responsavel adicionada com sucesso',
        profissional_padrao_id: profissionalPadraoId,
        pendencias_atualizadas: updated.length
      })
    }

    return NextResponse.json({
      ok: false,
      error: 'Ação não reconhecida'
    }, { status: 400 })

  } catch (err: any) {
    console.error('Erro na migração:', err)
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err)
    }, { status: 500 })
  }
}
