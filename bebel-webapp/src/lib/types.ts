// Types based on the database schema for the Bebel AI webapp

export interface Pessoa {
  id_pessoa: number;
  status: 'LEAD' | 'PACIENTE';
  nome_completo: string | null;
  data_nascimento: string | null;
  cpf: string | null;
  origem: string | null;
  stage: 'NOVO' | 'QUALIFICADO' | 'CONVERTIDO';
  lead_score: number;
  consent_marketing: boolean;
}

export interface Conversa {
  id_conversa: number;
  id_pessoa: number;
  canal: 'WHATSAPP' | 'TELEFONE' | 'EMAIL';
  status: 'OPEN' | 'CLOSED';
  started_at: string;
  ended_at: string | null;
  last_message_at: string | null;
  topic: string | null;
  resumo_conversa: string | null;
}

export interface Mensagem {
  id_mensagem: number;
  id_conversa: number;
  id_pessoa: number | null;
  canal: 'WHATSAPP' | 'TELEFONE' | 'EMAIL';
  direction: 'IN' | 'OUT';
  from_me: boolean;
  text: string | null;
  created_at_provider: string;
  created_at_ingest: string;
}

export interface PendenciaSinalizada {
  id_pendencia_sinalizada: number;
  id_conversa: number;
  id_mensagem_origem: number | null;
  tipo: string;
  descricao: string | null;
  prioridade: 1 | 2 | 3 | 4 | 5;
  sla_at: string | null;
  status: 'SINALIZADA' | 'RESOLVIDA' | 'IGNORADA';
  detected_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface IntentLabel {
  intent_code: string;
  description: string | null;
  active: boolean;
  generate_pendencia: boolean;
  generate_pendencia_instructions: string | null;
}

// UI specific types
export type KanbanColumn = 'A_FAZER' | 'FAZENDO' | 'FEITO';

export interface PendenciaWithDetails extends PendenciaSinalizada {
  pessoa?: Pessoa;
  conversa?: Conversa;
  kanban_status: KanbanColumn;
}

export interface FilterState {
  status: string | null;
  tipo: string | null;
  prioridade: number | null;
  responsavel: string | null;
}
