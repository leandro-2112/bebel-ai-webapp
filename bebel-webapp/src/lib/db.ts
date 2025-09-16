// Helper para conexão com PostgreSQL
import { Pool } from 'pg'

// Pega a URL de conexão das variáveis de ambiente
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL não configurada. Verifique o arquivo .env.local')
}

// Cria um pool de conexões (mais eficiente que conexões individuais)
export const pool = new Pool({
  connectionString,
  // Desabilita SSL já que o servidor não suporta
  ssl: false
})

// Função helper para fazer consultas no banco
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return { rows: res.rows as T[] }
  } finally {
    // Sempre libera a conexão de volta para o pool
    client.release()
  }
}