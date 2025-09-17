// Endpoint para buscar pendências do banco
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { 
  PendenciaWithDetails, 
  Pessoa, 
  Conversa, 
  Profissional 
} from '@/lib/types'

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

export async function GET(request: Request) {
  console.log('=== Iniciando requisição GET para /api/pendencias ===');
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tipo = searchParams.get('tipo');
    const prioridade = searchParams.get('prioridade');
    const responsavel = searchParams.get('responsavel');
    
    console.log('Parâmetros da URL:', { status, tipo, prioridade, responsavel });

    // Construir a consulta SQL com filtros dinâmicos
    let whereClauses: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1
    
    if (status) {
      whereClauses.push(`p.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (tipo) {
      whereClauses.push(`p.tipo = $${paramIndex}`)
      queryParams.push(tipo)
      paramIndex++
    }

    if (prioridade) {
      whereClauses.push(`p.prioridade = $${paramIndex}`)
      queryParams.push(parseInt(prioridade))
      paramIndex++
    }

    if (responsavel) {
      if (responsavel === 'none') {
        whereClauses.push('p.id_responsavel IS NULL')
      } else if (responsavel !== 'all') {
        whereClauses.push(`p.id_responsavel = $${paramIndex}`)
        const responsavelId = parseInt(responsavel)
        queryParams.push(responsavelId)
        paramIndex++
      }
    }

    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : ''
      
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
      ${whereClause}
      ORDER BY p.detected_at DESC
      LIMIT 50
    `
    
    console.log('SQL gerado:', sql.replace(/\s+/g, ' ').trim())
    console.log('Parâmetros da consulta:', queryParams)
    
    console.log('Executando consulta SQL...');
    const result = await query<PendenciaDB>(sql, queryParams);
    
    if (!result) {
      console.error('Erro: Resultado da consulta é undefined');
      return NextResponse.json({ error: 'Erro ao executar a consulta' }, { status: 500 });
    }
    
    const { rows } = result;
    console.log('Resultados encontrados:', rows.length);
    
    if (rows.length === 0) {
      console.log('Nenhuma pendência encontrada com os filtros atuais');
      // Vamos executar uma consulta sem filtros para ver se existem pendências
      const allRows = await query<PendenciaDB>('SELECT * FROM bebel.pendencia_sinalizada LIMIT 1');
      console.log('Total de pendências na tabela (amostra de 1):', allRows?.rows.length || 0);
    }
    
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
      
      console.log(`Pendência ${pendencia.id_pendencia_sinalizada}:`, {
        status: pendencia.status,
        prioridade: pendencia.prioridade,
        kanban_status,
        responsavel: pendencia.id_responsavel
      })

      // Criar objeto da pessoa com todos os campos obrigatórios
      const pessoa: Pessoa = pendencia.id_pessoa ? {
        id_pessoa: pendencia.id_pessoa,
        nome_completo: pendencia.pessoa_nome || 'Cliente',
        status: (pendencia.pessoa_status as 'LEAD' | 'PACIENTE') || 'LEAD',
        stage: pendencia.stage as 'NOVO' | 'QUALIFICADO' | 'CONVERTIDO' || 'NOVO',
        lead_score: pendencia.lead_score || 0,
        consent_marketing: pendencia.consent_marketing || false,
        // Campos obrigatórios com valores padrão
        data_nascimento: null,
        cpf: null,
        origem: null
      } : {
        id_pessoa: 0,
        nome_completo: 'Cliente não identificado',
        status: 'LEAD',
        stage: 'NOVO',
        lead_score: 0,
        consent_marketing: false,
        data_nascimento: null,
        cpf: null,
        origem: null
      };

      // Criar objeto da conversa com todos os campos obrigatórios
      const conversa: Conversa = {
        id_conversa: pendencia.id_conversa,
        id_pessoa: pendencia.id_pessoa || 0,
        canal: 'WHATSAPP',
        status: 'OPEN',
        started_at: pendencia.detected_at,
        resumo_conversa: 'Conversa relacionada à pendência',
        // Campos obrigatórios com valores padrão
        ended_at: null,
        last_message_at: null,
        topic: null
      };

      // Criar objeto do responsável (pode ser null)
      const responsavel = pendencia.id_responsavel ? {
        id_profissional: pendencia.id_responsavel,
        nome_completo: pendencia.responsavel_nome || 'Responsável não encontrado',
        especialidade: pendencia.responsavel_especialidade || null
      } : null;

      // Garantir que a prioridade esteja dentro do intervalo válido (1-5)
      const prioridadeValida = pendencia.prioridade >= 1 && pendencia.prioridade <= 5 
        ? pendencia.prioridade as 1 | 2 | 3 | 4 | 5 
        : 3; // Valor padrão se estiver fora do intervalo
      
      // Montar o objeto final com todos os campos necessários
      const formatted: PendenciaWithDetails = {
        ...pendencia,
        // Garantir que todos os campos opcionais tenham valores padrão
        id_mensagem_origem: pendencia.id_mensagem_origem || null,
        descricao: pendencia.descricao || null,
        sla_at: pendencia.sla_at || null,
        resolved_at: pendencia.resolved_at || null,
        resolution_note: pendencia.resolution_note || null,
        // Garantir que a prioridade esteja no formato correto
        prioridade: prioridadeValida,
        // Campos necessários para o Kanban
        kanban_status,
        // Relacionamentos
        responsavel,
        pessoa,
        conversa,
        // Garantir que o tipo seja uma string não nula
        tipo: pendencia.tipo || 'OUTRO'
      };
      
      console.log('Dados transformados:', formatted);
      return formatted;
    })
    
    console.log('Dados transformados:', pendenciasFormatadas)
    
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
  console.log('=== Iniciando requisição POST para /api/pendencias ===');
  try {
    const body = await request.json()
    console.log('Dados recebidos:', body);
    
    const { id, status, descricao, prioridade, id_responsavel, resolution_note } = body

    if (!id) {
      console.error('Erro: ID não fornecido');
      return NextResponse.json(
        { ok: false, error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // Determina resolved_at baseado no status
    const resolved_at = status === 'RESOLVIDA' ? new Date().toISOString() : null

    // Monta a query dinamicamente baseado nos campos fornecidos
    const updates: string[] = []
    const values: any[] = []
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
    
    console.log('Executando atualização no banco de dados...');
    console.log('SQL:', sql);
    console.log('Valores:', values);
    
    const result = await query(sql, values);
    
    if (!result) {
      console.error('Erro: Nenhum resultado retornado da consulta');
      return NextResponse.json(
        { ok: false, error: 'Erro ao executar a atualização' },
        { status: 500 }
      );
    }
    
    const { rows } = result;
    
    if (rows.length === 0) {
      console.error('Erro: Nenhuma linha afetada pela atualização');
      return NextResponse.json(
        { ok: false, error: 'Pendência não encontrada' },
        { status: 404 }
      );
    }

    console.log('Pendência atualizada com sucesso:', rows[0]);
    return NextResponse.json({
      ok: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Erro ao processar requisição POST:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
