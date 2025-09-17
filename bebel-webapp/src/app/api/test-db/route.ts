import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Simple query to test the connection
    const result = await query('SELECT NOW() as current_time')
    
    if (!result) {
      throw new Error('No result returned from query')
    }
    
    console.log('Database connection successful:', result.rows[0])
    
    // Check if the pendencia_sinalizada table exists and has data
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'bebel' 
        AND table_name = 'pendencia_sinalizada'
      ) as table_exists`
    )
    
    const tableExists = tableCheck.rows[0]?.table_exists
    
    let rowCount = 0
    if (tableExists) {
      const countResult = await query('SELECT COUNT(*) FROM bebel.pendencia_sinalizada')
      rowCount = parseInt(countResult.rows[0].count, 10)
    }
    
    return NextResponse.json({
      success: true,
      currentTime: result.rows[0].current_time,
      tableExists,
      rowCount
    })
    
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
