
# DATA_DICTIONARY.md — Schema `bebel` (MVP1)
_Last updated: 2025-09-11_

## Scope
This data dictionary documents the **core tables used by MVP1 (Conversas + Pendências)** of the clinic/consulting webapp. It explains what each table is for, the most important columns, relationships, constraints, and typical queries used by the app and the n8n/LLM pipelines.

---

## Conventions
- Icons: 🔑 (PK), 🔗 (FK), 🧭 (index), ✅ (unique), ☑️ (check), ⏱ (trigger/job).
- Columns table format: **name** | **type** | **null** | **default** | **notes/usage**.
- Enum types like `bebel.canal_mensagem`, `bebel.msg_direction`, `bebel.pessoa_status`, `bebel.lead_stage` are referenced from the DB.
- Timezones: all timestamps are `timestamptz` unless otherwise noted.

---

## ER (lite) overview
- A **pessoa** may have many **conversas** per **canal** (e.g., WhatsApp).
- Each **conversa** has many **mensagens** and may accumulate **pendências**.
- AI pipelines write **message_analyses**, **message_intents**, **message_risks**, **message_quality_issues** per message.
- **intent_labels**, **risk_labels**, **quality_labels** are catalogs for classification/rule logic.
- **channel_identities** maps a `pessoa` to external channel identifiers (e.g., WhatsApp JID).
- **ai_jobs** orchestrates background LLM analyses.
- (Optional in MVP1.1) **agendamentos** link `pessoa` + `profissional` for appointments.

---

## Table of Contents
- [bebel.conversas](#tabela-bebelconversas)
- [bebel.mensagens](#tabela-bebelmensagens)
- [bebel.pendencia_sinalizada](#tabela-bebelpendencia_sinalizada)
- [bebel.pessoas](#tabela-bebelpessoas)
- [bebel.pessoas_contatos](#tabela-bebelpessoas_contatos)
- [bebel.channel_identities](#tabela-bebelchannel_identities)

- [bebel.message_analyses](#tabela-bebelmessage_analyses)
- [bebel.message_intents](#tabela-bebelmessage_intents)
- [bebel.message_risks](#tabela-bebelmessage_risks)
- [bebel.message_quality_issues](#tabela-bebelmessage_quality_issues)
- [bebel.intent_labels](#tabela-bebelintent_labels)
- [bebel.risk_labels](#tabela-bebelrisk_labels)
- [bebel.quality_labels](#tabela-bebelquality_labels)
- [bebel.ai_jobs](#tabela-bebelai_jobs)
- [bebel.agendamentos](#tabela-bebelagendamentos) *(MVP1.1)*
- [bebel.profissionais](#tabela-bebelprofissionais) *(MVP1.1)*
- [Typical Queries (Annex)](#annex-typical-queries)

---

## Tabela: `bebel.conversas`

**What it is**  
A conversation thread per person and channel. Stores status, time bounds, last activity and a short LLM summary for fast reading.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_conversa` | bigserial | no | — | Conversation PK |
| 🔗 `id_pessoa` | int8 | no | — | FK → `pessoas.id_pessoa` (CASCADE) |
| `canal` | bebel.canal_mensagem | no | — | E.g., WHATSAPP |
| `status` | varchar | no | `'OPEN'` | OPEN/CLOSED (string for flexibility) |
| `started_at` | timestamptz | no | `now()` | Start time |
| `ended_at` | timestamptz | yes | — | End time |
| `last_message_at` | timestamptz | yes | — | Inbox ordering, SLAs |
| `topic` | text | yes | — | Optional subject/topic |
| `resumo_conversa` | text | yes | — | Short LLM summary |

**Indexes**
- 🧭 `idx_conversas_lastmsg(last_message_at DESC)` — Inbox ordering
- 🧭 `idx_conversas_lookup(id_pessoa, canal, status)` — Fast filtering

**Relationships**
- 1:N with `mensagens`
- 1:N with `pendencia_sinalizada`

**Used by (app)**
- Conversations list; Conversation detail header and counters.

---

## Tabela: `bebel.mensagens`

**What it is**  
IN/OUT messages in a conversation, with provider stamps, payloads, and processing flags for AI jobs.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_mensagem` | bigserial | no | — | Message PK |
| 🔗 `id_conversa` | int8 | no | — | FK → `conversas.id_conversa` (CASCADE) |
| 🔗 `id_pessoa` | int8 | yes | — | Denormalized reference (SET NULL on delete) |
| `canal` | bebel.canal_mensagem | no | — | Channel |
| `direction` | bebel.msg_direction | no | — | IN (patient) / OUT (secretary) |
| `from_me` | bool | no | `false` | Origin marker |
| `sender_external_id` | varchar(191) | yes | — | External sender id (e.g., JID) |
| `message_external_id` | varchar(191) | yes | — | Provider message id |
| `text` | text | yes | — | Text content |
| `payload` | jsonb | yes | — | Raw provider payload |
| `media_url` / `media_mime` | text / varchar | yes | — | Media attachments |
| `reply_to_external_id` | varchar(191) | yes | — | Reply ref |
| `reaction` | varchar(16) | yes | — | Reactions |
| `event_type` | varchar(80) | yes | — | Source event (evo webhook) |
| `processed` | bool | no | `false` | AI pipeline progress flag |
| `process_before` | timestamptz | yes | — | Scheduling hint |
| `provider` | varchar(80) | yes | — | E.g., EVOLUTION |
| `instance_id` / `instance_name` | varchar | yes | — | Evo instance identifiers |
| `chat_external_id` | varchar(191) | yes | — | External chat id |
| `pushname` | varchar(150) | yes | — | WA display name |
| `created_at_provider` | timestamptz | no | — | Provider timestamp |
| `created_at_ingest` | timestamptz | no | `now()` | Ingest time |

**Indexes & Triggers**
- 🧭 `idx_msg_conversa_time(id_conversa, created_at_provider)` — Timeline
- 🧭 `ix_msg_by_conversa(id_conversa, id_mensagem)` — Fast paging
- ✅ `uq_mensagens_instance_msg(instance_id, message_external_id)` — Idempotency
- ⏱ AFTER INSERT → `fn_sync_conversa_lastmsg()` — updates `conversas.last_message_at`
- ⏱ AFTER INSERT → `fn_enqueue_msg_ai_job()` — enqueues LLM job

**Derived relationships**
- 1:N with `message_analyses`, `message_intents`, `message_risks`, `message_quality_issues`

**Used by (app)**
- Conversation timeline; message-level badges (intent/risk/quality).

---

## Tabela: `bebel.pendencia_sinalizada`

**What it is**  
LLM-detected “requests/tasks” extracted from conversations, with priority/SLA/status and uniqueness while open per (conversa + tipo).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_pendencia_sinalizada` | bigserial | no | — | PK |
| 🔗 `id_conversa` | int8 | no | — | FK → `conversas.id_conversa` |
| `id_mensagem_origem` | int8 | yes | — | Origin message (optional) |
| 🔗 `tipo` | text | no | — | FK → `intent_labels.intent_code` |
| `descricao` | text | yes | — | Human-friendly description |
| `prioridade` | int4 | yes | — | ☑️ CHECK 1..5 |
| `sla_at` | timestamptz | yes | — | Target deadline |
| `status` | text | no | `'SINALIZADA'` | SINALIZADA / RESOLVIDA / IGNORADA |
| `detected_at` | timestamptz | no | `now()` | Created timestamp |
| `resolved_at` | timestamptz | yes | — | Close timestamp |
| `resolution_note` | text | yes | — | Resolution notes |

**Indexes**
- 🧭 `ix_pendencia_sinalizada_tipo(tipo)`
- ✅ `ux_pendencia_sinalizada_open(id_conversa, tipo) WHERE status='SINALIZADA'`

**Used by (app)**
- Pendências List + Kanban; quick actions (Resolve/Ignore) and link to conversation.

---

## Tabela: `bebel.pessoas`

**What it is**  
People/leads registry with funnel stage, score and marketing consent.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_pessoa` | bigserial | no | — | PK |
| `status` | bebel.pessoa_status | no | `'LEAD'` | Relationship state (LEAD/PACIENTE/…) |
| `nome_completo` | varchar(150) | yes | — | Display name |
| `data_nascimento` | date | yes | — | DOB (PII) |
| `cpf` | varchar(14) | yes | — | Unique when PACIENTE |
| `origem` | varchar(80) | yes | — | Source channel |
| `utm` | jsonb | yes | — | Attribution |
| `stage` | bebel.lead_stage | no | `'NOVO'` | Funnel stage |
| `lead_score` | int4 | no | `0` | Simple lead scoring |
| `consent_marketing` | bool | no | `false` | Consent flag |
| `consent_updated_em` | timestamptz | yes | — | Consent last update |

**Index/Unique**
- ✅ `uq_pessoa_cpf_paciente(cpf) WHERE status='PACIENTE'`

**Used by (app)**
- Contact badge in conversation panel; person search and future CRM modules.

---

## Tabela: `bebel.pessoas_contatos`

**What it is**  
Normalized contacts per person (WhatsApp/phone/email/etc.) with a preferred flag.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_contato` | bigserial | no | — | PK |
| 🔗 `id_pessoa` | int8 | no | — | FK → `pessoas.id_pessoa` (CASCADE) |
| `tipo` | bebel.contato_tipo | no | — | WHATSAPP/TELEFONE/EMAIL/... |
| `valor` | varchar(180) | no | — | Raw value |
| `valor_norm` | varchar(180) | no | — | Normalized |
| `preferencial` | bool | no | `false` | Preferred contact |
| `criado_em` / `atualizado_em` | timestamptz | no | `now()` / `now()` | Audit |

**Indexes/Unique**
- 🧭 `idx_contatos_tipo_norm(tipo, valor_norm)`
- ✅ `pessoas_contatos_tipo_valor_norm_key(tipo, valor_norm)`
- ✅ `uq_contato_por_pessoa(id_pessoa, tipo, valor_norm)`

**Used by (app)**
- Preferred contact in the side panel; phone lookups from incoming messages.

---

## Tabela: `bebel.channel_identities`

**What it is**  
Maps people to external channel identifiers (e.g., WhatsApp JID), with optional provider/instance info.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_identity` | bigserial | no | — | PK |
| 🔗 `id_pessoa` | int8 | no | — | FK → `pessoas.id_pessoa` (CASCADE) |
| `canal` | bebel.canal_mensagem | no | — | Channel |
| `external_id` | varchar(191) | no | — | External/channel id |
| `display_name` | varchar(191) | yes | — | Channel display name |
| `provider` | varchar(80) | yes | — | Provider (e.g., EVOLUTION) |
| `instance_name` | varchar(120) | yes | — | Provider instance |

**Indexes/Unique**
- ✅ `channel_identities_canal_external_id_key(canal, external_id)`
- 🧭 `idx_channel_identities_pessoa(id_pessoa, canal)`

**Used by (app)**
- Identity resolution across channels; debug support info.


## Tabela: `bebel.message_analyses`

**What it is**  
Per-message analyses (sentiment, response_needed, summary, language_quality_score, details).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_msg_analysis` | bigserial | no | — | PK |
| 🔗 `id_mensagem` | int8 | no | — | FK → `mensagens.id_mensagem` (CASCADE) |
| `model` | varchar(80) | no | — | Model id |
| `analysis_type` | varchar(60) | no | — | Type |
| `sentiment` | varchar(20) | yes | — | — |
| `sentiment_score` | numeric(4,3) | yes | — | — |
| `response_needed` | bool | yes | — | — |
| `language_quality_score` | numeric(4,3) | yes | — | — |
| `summary` | text | yes | — | — |
| `details` | jsonb | yes | — | Extra |

**Keys/Indexes**
- ✅ Unique (`id_mensagem`,`analysis_type`,`model`)
- 🧭 `idx_msg_analyses_msg(id_mensagem)`, `ix_anl_by_msg_type(id_mensagem,analysis_type)`

**Used by (app)**
- Message tooltips; audit/debug of classifications.

---

## Tabela: `bebel.message_intents`

**What it is**  
Per-message intent labels with confidence.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_mensagem` | int8 | no | — | PK part (with `intent_code`) |
| 🔑 `intent_code` | varchar(60) | no | — | PK part; FK → `intent_labels.intent_code` |
| `confidence` | numeric(4,3) | yes | — | Confidence |

**Used by (app)**
- Intent chips in header/side panel; filtering/highlighting in timeline.

---

## Tabela: `bebel.message_risks`

**What it is**  
Per-message risk labels with detection flag and confidence; linked to catalog with severity (1..5).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_mensagem` | int8 | no | — | PK part |
| 🔑 `risk_code` | varchar(60) | no | — | PK part; FK → `risk_labels.risk_code` |
| `detected` | bool | no | `true` | Detection flag |
| `confidence` | numeric(4,3) | yes | — | Confidence |

**Used by (app)**
- Risk badges in timeline; severity rollups in side panel.

---

## Tabela: `bebel.message_quality_issues`

**What it is**  
Per-message quality issues (e.g., language problems).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_mensagem` | int8 | no | — | PK part |
| 🔑 `quality_code` | varchar(60) | no | — | PK part; FK → `quality_labels.quality_code` |
| `confidence` | numeric(4,3) | yes | — | Confidence |

**Used by (app)**
- Quality badges; coaching/review analytics.

---

## Tabela: `bebel.intent_labels`

**What it is**  
Catalog of intent codes, whether active and if they should open a pendência (with optional instructions).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `intent_code` | varchar(60) | no | — | PK |
| `description` | text | yes | — | — |
| `active` | bool | no | `true` | — |
| `generate_pendencia` | bool | no | `false` | If true, create pendência |
| `generate_pendencia_instructions` | text | yes | — | Guidance |

**Used by (app)**
- Intent mapping; pendência creation rules.

---

## Tabela: `bebel.risk_labels`

**What it is**  
Risk catalog with severity (1..5) and active flag.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `risk_code` | varchar(60) | no | — | PK |
| `severity` | int4 | no | — | ☑️ 1..5 |
| `description` | text | yes | — | — |
| `active` | bool | no | `true` | — |

**Used by (app)**
- Severity aggregation in conversation insights.

---

## Tabela: `bebel.quality_labels`

**What it is**  
Quality issue catalog (active/inactive).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `quality_code` | varchar(60) | no | — | PK |
| `description` | text | yes | — | — |
| `active` | bool | no | `true` | — |

---

## Tabela: `bebel.ai_jobs`

**What it is**  
Queue table for AI jobs by scope (MESSAGE/CONVERSATION), with status, priority, attempts, scheduling and errors.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_job` | bigserial | no | — | PK |
| `scope_type` | varchar(20) | no | — | MESSAGE / CONVERSATION |
| `id_scope` | int8 | no | — | Scope id |
| `analysis_type` | varchar(60) | no | — | Links to `ai_analysis_types` |
| `status` | varchar(20) | no | `'PENDING'` | PENDING/… |
| `priority` | int4 | no | `5` | Higher = more priority |
| `attempt_count` | int4 | no | `0` | Retry count |
| `last_error` | text | yes | — | Last failure |
| `scheduled_for` | timestamptz | yes | — | Deferred run |
| `created_at` / `updated_at` | timestamptz | no | `now()` / `now()` | Audit |

**Keys/Indexes**
- ✅ Unique (`scope_type`,`id_scope`,`analysis_type`)
- 🧭 `idx_ai_jobs_status(status, priority, scheduled_for NULLS FIRST, created_at)`

**Used by (app)**
- Optional operational dashboards; troubleshooting.

---

## Tabela: `bebel.agendamentos` *(MVP1.1 – optional)*

**What it is**  
Appointments per professional and person, with start/end window and status.

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_agendamento` | bigserial | no | — | PK |
| 🔗 `id_profissional` | int8 | no | — | FK → `profissionais.id_profissional` |
| 🔗 `id_pessoa` | int8 | no | — | FK → `pessoas.id_pessoa` |
| `inicio` / `fim` | timestamptz | no/yes | — | Start/End |
| `status` | public.ag_status | no | `'PENDENTE'` | Appointment status |
| `origem` | varchar(40) | yes | `'SISTEMA'` | Source |
| `observacoes` | text | yes | — | Notes |

**Keys/Indexes**
- ✅ Unique (`id_profissional`,`inicio`)
- 🧭 `idx_agenda_prof_inicio(id_profissional,inicio)`

---

## Tabela: `bebel.profissionais` *(MVP1.1 – optional)*

**What it is**  
Professionals registry (name, specialty, active flag).

**Key columns**
| column | type | null | default | notes |
|---|---|---:|---|---|
| 🔑 `id_profissional` | bigserial | no | — | PK |
| `nome_completo` | varchar(150) | no | — | — |
| `especialidade` | varchar(120) | yes | — | Specialty |
| `ativo` | bool | no | `true` | Active |

---

## Data Producers / Consumers
- **Producers**: n8n workflows (Evolution API webhooks), LLM analysis workers (message/conversation).
- **Consumers**: Webapp (Conversations, Pendências), future CRM/Agenda/Dashboard modules.
- **Triggers**: see `mensagens` AFTER INSERT triggers for updating conversation state and enqueuing AI jobs.

## PII / Security / Retention Notes
- PII present: `pessoas.nome_completo`, `pessoas.data_nascimento`, `pessoas.cpf`, contacts. Apply data minimization in logs/exports.
- Consider masking CPF and phone numbers in UI where not strictly needed.
- Audit fields (`criado_em`, `atualizado_em`, `created_at`, `updated_at`) should be used for retention and troubleshooting.

---

## ANNEX — Typical Queries

### Inbox (last 24h, sorted by last activity)
```sql
SELECT c.id_conversa,
       c.id_pessoa,
       c.canal,
       c.status,
       c.last_message_at,
       c.resumo_conversa
FROM bebel.conversas c
WHERE c.last_message_at >= now() - interval '24 hours'
ORDER BY c.last_message_at DESC;
```

### Conversation timeline (paged)
```sql
SELECT m.*
FROM bebel.mensagens m
WHERE m.id_conversa = $1
ORDER BY m.created_at_provider ASC
LIMIT $2 OFFSET $3;
```

### Count open pendências per conversation
```sql
SELECT p.id_conversa, count(*) AS open_count
FROM bebel.pendencia_sinalizada p
WHERE p.status = 'SINALIZADA'
GROUP BY p.id_conversa;
```

### Pendências list (filter by status/type/prioridade)
```sql
SELECT p.*
FROM bebel.pendencia_sinalizada p
WHERE ($1::text IS NULL OR p.status = $1)
  AND ($2::text IS NULL OR p.tipo = $2)
  AND ($3::int  IS NULL OR p.prioridade = $3)
ORDER BY coalesce(p.sla_at, p.detected_at) ASC, p.prioridade DESC;
```

### Resolve a pendência (close with note)
```sql
UPDATE bebel.pendencia_sinalizada
SET status = 'RESOLVIDA',
    resolved_at = now(),
    resolution_note = $2
WHERE id_pendencia_sinalizada = $1;
```

### Top intents in a conversation
```sql
SELECT mi.intent_code, count(*) AS freq, avg(coalesce(mi.confidence,0)) AS avg_conf
FROM bebel.message_intents mi
JOIN bebel.mensagens m ON m.id_mensagem = mi.id_mensagem
WHERE m.id_conversa = $1
GROUP BY mi.intent_code
ORDER BY freq DESC, avg_conf DESC;
```

### Risk severity rollup for a conversation
```sql
SELECT rl.severity, count(*) AS qtd
FROM bebel.message_risks mr
JOIN bebel.risk_labels rl ON rl.risk_code = mr.risk_code
JOIN bebel.mensagens m ON m.id_mensagem = mr.id_mensagem
WHERE m.id_conversa = $1
GROUP BY rl.severity
ORDER BY rl.severity DESC;
```

### Quality issues summary for a conversation
```sql
SELECT mqi.quality_code, count(*) AS qtd, avg(coalesce(mqi.confidence,0)) AS avg_conf
FROM bebel.message_quality_issues mqi
JOIN bebel.mensagens m ON m.id_mensagem = mqi.id_mensagem
WHERE m.id_conversa = $1
GROUP BY mqi.quality_code
ORDER BY qtd DESC;
```

### Person quick lookup by normalized WhatsApp/phone/email
```sql
SELECT p.*
FROM bebel.pessoas p
JOIN bebel.pessoas_contatos pc ON pc.id_pessoa = p.id_pessoa
WHERE pc.tipo = $1  -- e.g., 'WHATSAPP' | 'TELEFONE' | 'EMAIL'
  AND pc.valor_norm = $2;
```

### Channel identity reverse lookup (find person by external_id)
```sql
SELECT p.*, ci.canal, ci.external_id
FROM bebel.pessoas p
JOIN bebel.channel_identities ci ON ci.id_pessoa = p.id_pessoa
WHERE ci.canal = $1 AND ci.external_id = $2;
```

---

**End of document.**
