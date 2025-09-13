// Mock data for development - based on the database schema
import { Pessoa, Conversa, PendenciaSinalizada, PendenciaWithDetails, IntentLabel } from './types';

export const mockPessoas: Pessoa[] = [
  {
    id_pessoa: 1,
    status: 'PACIENTE',
    nome_completo: 'Maria Silva Santos',
    data_nascimento: '1985-03-15',
    cpf: '123.456.789-01',
    origem: 'WHATSAPP',
    stage: 'CONVERTIDO',
    lead_score: 85,
    consent_marketing: true,
  },
  {
    id_pessoa: 2,
    status: 'LEAD',
    nome_completo: 'João Pedro Oliveira',
    data_nascimento: '1990-07-22',
    cpf: null,
    origem: 'WHATSAPP',
    stage: 'QUALIFICADO',
    lead_score: 65,
    consent_marketing: false,
  },
  {
    id_pessoa: 3,
    status: 'PACIENTE',
    nome_completo: 'Ana Carolina Ferreira',
    data_nascimento: '1978-11-08',
    cpf: '987.654.321-09',
    origem: 'TELEFONE',
    stage: 'CONVERTIDO',
    lead_score: 90,
    consent_marketing: true,
  },
  {
    id_pessoa: 4,
    status: 'LEAD',
    nome_completo: null,
    data_nascimento: null,
    cpf: null,
    origem: 'WHATSAPP',
    stage: 'NOVO',
    lead_score: 30,
    consent_marketing: false,
  },
];

export const mockConversas: Conversa[] = [
  {
    id_conversa: 1,
    id_pessoa: 1,
    canal: 'WHATSAPP',
    status: 'OPEN',
    started_at: '2024-01-15T09:30:00Z',
    ended_at: null,
    last_message_at: '2024-01-15T14:22:00Z',
    topic: 'Agendamento de consulta',
    resumo_conversa: 'Paciente solicita agendamento para consulta de rotina. Mencionou dores nas costas.',
  },
  {
    id_conversa: 2,
    id_pessoa: 2,
    canal: 'WHATSAPP',
    status: 'OPEN',
    started_at: '2024-01-14T16:45:00Z',
    ended_at: null,
    last_message_at: '2024-01-15T10:15:00Z',
    topic: 'Dúvidas sobre tratamento',
    resumo_conversa: 'Lead interessado em tratamento ortodôntico. Solicitou orçamento.',
  },
  {
    id_conversa: 3,
    id_pessoa: 3,
    canal: 'TELEFONE',
    status: 'CLOSED',
    started_at: '2024-01-13T11:20:00Z',
    ended_at: '2024-01-13T11:35:00Z',
    last_message_at: '2024-01-13T11:35:00Z',
    topic: 'Confirmação de pagamento',
    resumo_conversa: 'Paciente confirmou pagamento da consulta anterior.',
  },
  {
    id_conversa: 4,
    id_pessoa: 4,
    canal: 'WHATSAPP',
    status: 'OPEN',
    started_at: '2024-01-15T13:10:00Z',
    ended_at: null,
    last_message_at: '2024-01-15T13:45:00Z',
    topic: null,
    resumo_conversa: 'Contato inicial. Pessoa interessada em informações sobre a clínica.',
  },
];

export const mockIntentLabels: IntentLabel[] = [
  {
    intent_code: 'AGENDAR',
    description: 'Solicitação de agendamento de consulta',
    active: true,
    generate_pendencia: true,
    generate_pendencia_instructions: 'Verificar disponibilidade e agendar consulta',
  },
  {
    intent_code: 'PAGAMENTO',
    description: 'Questões relacionadas a pagamento',
    active: true,
    generate_pendencia: true,
    generate_pendencia_instructions: 'Verificar status do pagamento e orientar',
  },
  {
    intent_code: 'ORCAMENTO',
    description: 'Solicitação de orçamento',
    active: true,
    generate_pendencia: true,
    generate_pendencia_instructions: 'Preparar e enviar orçamento detalhado',
  },
  {
    intent_code: 'CANCELAMENTO',
    description: 'Solicitação de cancelamento',
    active: true,
    generate_pendencia: true,
    generate_pendencia_instructions: 'Processar cancelamento conforme política',
  },
  {
    intent_code: 'INFORMACAO',
    description: 'Solicitação de informações gerais',
    active: true,
    generate_pendencia: false,
    generate_pendencia_instructions: null,
  },
];

export const mockPendencias: PendenciaSinalizada[] = [
  {
    id_pendencia_sinalizada: 1,
    id_conversa: 1,
    id_mensagem_origem: 1,
    tipo: 'AGENDAR',
    descricao: 'Agendar consulta de rotina para Maria Silva - mencionou dores nas costas',
    prioridade: 3,
    sla_at: '2024-01-16T17:00:00Z',
    status: 'SINALIZADA',
    detected_at: '2024-01-15T14:22:00Z',
    resolved_at: null,
    resolution_note: null,
  },
  {
    id_pendencia_sinalizada: 2,
    id_conversa: 2,
    id_mensagem_origem: 2,
    tipo: 'ORCAMENTO',
    descricao: 'Enviar orçamento para tratamento ortodôntico - João Pedro Oliveira',
    prioridade: 4,
    sla_at: '2024-01-17T12:00:00Z',
    status: 'SINALIZADA',
    detected_at: '2024-01-15T10:15:00Z',
    resolved_at: null,
    resolution_note: null,
  },
  {
    id_pendencia_sinalizada: 3,
    id_conversa: 1,
    id_mensagem_origem: 3,
    tipo: 'PAGAMENTO',
    descricao: 'Verificar status do pagamento da consulta anterior - Maria Silva',
    prioridade: 2,
    sla_at: '2024-01-15T18:00:00Z',
    status: 'SINALIZADA',
    detected_at: '2024-01-15T11:30:00Z',
    resolved_at: null,
    resolution_note: null,
  },
  {
    id_pendencia_sinalizada: 4,
    id_conversa: 4,
    id_mensagem_origem: 4,
    tipo: 'INFORMACAO',
    descricao: 'Enviar informações sobre serviços da clínica para novo contato',
    prioridade: 1,
    sla_at: '2024-01-16T09:00:00Z',
    status: 'SINALIZADA',
    detected_at: '2024-01-15T13:45:00Z',
    resolved_at: null,
    resolution_note: null,
  },
  {
    id_pendencia_sinalizada: 5,
    id_conversa: 3,
    id_mensagem_origem: 5,
    tipo: 'PAGAMENTO',
    descricao: 'Pagamento confirmado - Ana Carolina Ferreira',
    prioridade: 1,
    sla_at: null,
    status: 'RESOLVIDA',
    detected_at: '2024-01-13T11:35:00Z',
    resolved_at: '2024-01-13T11:40:00Z',
    resolution_note: 'Pagamento confirmado pelo sistema',
  },
];

// Helper function to get pendencias with additional details
export const getPendenciasWithDetails = (): PendenciaWithDetails[] => {
  return mockPendencias.map(pendencia => {
    const conversa = mockConversas.find(c => c.id_conversa === pendencia.id_conversa);
    const pessoa = conversa ? mockPessoas.find(p => p.id_pessoa === conversa.id_pessoa) : undefined;
    
    // Map status to Kanban columns
    let kanban_status: 'A_FAZER' | 'FAZENDO' | 'FEITO';
    switch (pendencia.status) {
      case 'SINALIZADA':
        // High priority items go to "FAZENDO", others to "A_FAZER"
        kanban_status = pendencia.prioridade >= 3 ? 'FAZENDO' : 'A_FAZER';
        break;
      case 'RESOLVIDA':
      case 'IGNORADA':
        kanban_status = 'FEITO';
        break;
      default:
        kanban_status = 'A_FAZER';
    }

    return {
      ...pendencia,
      pessoa,
      conversa,
      kanban_status,
    };
  });
};

// Helper functions for the UI
export const getPriorityLabel = (prioridade: number): string => {
  const labels = {
    1: 'Muito Baixa',
    2: 'Baixa',
    3: 'Média',
    4: 'Alta',
    5: 'Muito Alta',
  };
  return labels[prioridade as keyof typeof labels] || 'Desconhecida';
};

export const getPriorityColor = (prioridade: number): string => {
  const colors = {
    1: 'bg-gray-100 text-gray-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-orange-100 text-orange-800',
    5: 'bg-red-100 text-red-800',
  };
  return colors[prioridade as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getStatusColor = (status: string): string => {
  const colors = {
    'SINALIZADA': 'bg-blue-100 text-blue-800',
    'RESOLVIDA': 'bg-green-100 text-green-800',
    'IGNORADA': 'bg-gray-100 text-gray-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getTipoLabel = (tipo: string): string => {
  const labels = {
    'AGENDAR': 'Agendamento',
    'PAGAMENTO': 'Pagamento',
    'ORCAMENTO': 'Orçamento',
    'CANCELAMENTO': 'Cancelamento',
    'INFORMACAO': 'Informação',
  };
  return labels[tipo as keyof typeof labels] || tipo;
};
