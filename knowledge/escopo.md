# MVP1 – WebApp de Gestão de Clínica (Conversas + Pendências)

## 🎯 Objetivo
Construir um webapp SaaS para clínicas e consultórios que centralize:
1. **Gestão de Conversas** (via WhatsApp e outros canais futuramente).
2. **Gestão de Pendências** (extraídas automaticamente das conversas).

O foco do MVP1 é ser o **braço direito da secretária**, permitindo visualizar e organizar mensagens e pendências em tempo real.

---

## 🖥️ Estrutura Geral do App
- Layout **responsivo** (desktop e mobile).
- **Menu lateral recolhível** com módulos:
  - Conversas
  - Pendências
  - (futuros: Leads, Agenda, Dashboard)
- **Topbar** com:
  - Nome da clínica / logo
  - Usuário logado
  - Busca global

---

## 📌 Módulo 1: Conversas

### Tela 1: Lista de Conversas
- **Layout**: lista em colunas (estilo inbox do WhatsApp - fixo na esquerda, enquanto o módulo está aberto).
- **Elementos por item da lista**:
  - Nome do paciente (`pessoas.nome_completo` ou telefone se vazio).
  - Última mensagem (`mensagens.text`).
  - Resumo da conversa (`conversas.resumo_conversa`).
  - Status: `OPEN` / `CLOSED`.
  - Badges:
    - 🔴 Pendências abertas vinculadas.
    - ⚠️ Risco detectado.
    - 🟡 Problema de qualidade detectado.
  - Timestamp da última mensagem (`conversas.last_message_at`).

- **Filtros e buscas**:
  - Por nome / telefone.
  - Por status.
  - Por data.

---

### Tela 2: Detalhe da Conversa - após selecionar uma conversa
- **Header**:
  - Nome do paciente.
  - Status da conversa.
  - Botão “ver pendências associadas”.

- **Timeline de mensagens**:
  - Balões tipo chat.
  - Indicação de **direção**: IN (paciente) / OUT (secretária).
  - Campos exibidos: texto, mídia (quando disponível), horário (`mensagens.created_at_provider`).
  - Ícones opcionais: reações, reply.

- **Painel lateral direito **:
  - Resumo da conversa (`conversation_analyses.conversation_summary`).
  - Intents detectadas (`message_intents.intent_code`).
  - Riscos e issues.
  - Pendências abertas daquela conversa (link para tela de pendências).

---

## 📌 Módulo 2: Pendências

### Tela 1: Kanban de Pendências
- **Layout padrão (Colunas kanban)**:
  - Colunas: (A fazer, Fazendo, Feito). Cards arrastáveis entre as colunas
  - Layout cards:
    - Tipo (`pendencia_sinalizada.tipo` → ex: AGENDAR, PAGAMENTO).
    - Descrição (`pendencia_sinalizada.descricao`).
    - Status (SINALIZADA - pode ser na coluna a fazer ou fazendo, RESOLVIDA - coluna feito, IGNORADA - coluna feito, mas com um ícone para indicar que foi ignorada).
    - Data de criação (`pendencia_sinalizada.detected_at`).
    - Botão/link → “abrir conversa associada”.
  - Ao clicar no card, abre um modal para editar e salvar os detalhes

### Tela 2: Modal de Detalhes da Pendência
- Modal para editar todos os detalhes da pendência

- **Filtros**:
  - Por status.
  - Por tipo de pendência.
  - Por prioridade.
  - Por responsável.

---


#### Footer (input desativado no MVP1)
- MVP1 **não envia mensagens**; apenas leitura/organização.
- Nota: “Envio e automações via n8n (futuro).”

#### Usabilidade / UX
- **Header sticky** com resumo + intents + estado; painel lateral colapsável.
- **Pendências primeiro** no painel (ação imediata).
- **Tooltips** nos badges (intent/risco/qualidade).
- **Estados vazios**: mensagens claras (“Sem pendências abertas”, “Sem análise disponível”, etc.).
- **Acessibilidade**: foco visível, áreas clicáveis ≥ 40px, contraste adequado.

#### Dados / Consultas (referência)
- **Conversa**: `conversas` → `id_conversa`, `id_pessoa`, `status`, `last_message_at`, `resumo_conversa`.
- **Mensagens**: `mensagens` por `id_conversa` (ordenar por `created_at_provider`).
- **Intents por mensagem**: `message_intents` → `id_mensagem`, `intent_code`, `confidence`.
- **Riscos/Qualidade por mensagem**: `message_risks`, `message_quality_issues` (+ labels).
- **Pendências**: `pendencia_sinalizada` por `id_conversa` (tipo, descrição, prioridade, sla_at, status).
- **Insights LLM**: `conversation_analyses` → KPIs, summary, recommended_actions.
- **Pessoa/contatos**: `pessoas`, `pessoas_contatos`.
- **IDs de canal**: `channel_identities`.
- **Agendamentos (opc.)**: `agendamentos` por `id_pessoa` (próximos 7 dias).

#### Critérios de Aceite (MVP1)
- [ ] Painel lateral com **Pendências** (resolver/ignorar) e **Insights** (KPIs + resumo + ações).
- [ ] Badges de intent/risco/qualidade nas mensagens, com tooltip.
- [ ] Chip de intent no header filtra/destaca a timeline.
- [ ] Link “ver tudo” em Pendências abre o módulo de Pendências filtrado.
- [ ] Dados do contato aparecem no painel (placeholders quando faltarem).
- [ ] (Opcional) Agenda rápida com próximos agendamentos.


# Stack recomendada:
## Frontend (SPA/SSR)
- Next.js 14 (App Router) + TypeScript
- UI: Tailwind CSS + shadcn/ui (Radix por baixo)
- Tabela/Kanban: TanStack Table + dnd-kit (drag & drop fluido)
- Data-fetch/cache: TanStack Query (React Query)
- Form/validação: React Hook Form + Zod
- Virtualização (muitas mensagens): @tanstack/react-virtual
- i18n e datas: next-intl + date-fns (tz)
- A11y: Radix + eslint-plugin-jsx-a11y
- Motivo: performance (SSR/SSG), DX ótima, fácil de repartir em microfronts mais tarde.

## Backend API (BFF + serviços)
- NestJS (Node + TS) como API principal
- ORM: Drizzle ORM (tipagem forte, migrações claras) ou Prisma (se sua equipe preferir)
- Banco: Postgres 16 (já é sua base); habilite pg_stat_statements e considere pgvector (embeddings futuros)


# Esqueleto inicial (alto nível):
apps/
  web/            # Next.js (App Router)
  api/            # NestJS (REST + WS)
  workers/        # Jobs BullMQ + LISTEN/NOTIFY
packages/
  ui/             # componentes shadcn/ui compartilhados
  config/         # eslint, tsconfig, tailwind, zod schemas
  db/             # drizzle schemas + migrations
infrastructure/
  compose/        # docker-compose.*.yml (dev/stage/prod)
  k8s/            # manifests/helm (futuro)