-- =========================================================
-- 0) CORE (catálogo de tenants) - Fica FORA do schema da app
-- =========================================================
CREATE SCHEMA IF NOT EXISTS core;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
    CREATE TYPE core.tenant_status AS ENUM ('ACTIVE','SUSPENDED','TRIAL','DELETED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS core.tenants (
  id                  bigserial PRIMARY KEY,
  slug                citext UNIQUE NOT NULL,
  name                text NOT NULL,
  status              core.tenant_status NOT NULL DEFAULT 'ACTIVE',
  plan_code           text,
  billing_customer_id text,
  trial_ends_at       timestamptz,
  settings            jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits              jsonb NOT NULL DEFAULT '{}'::jsonb,
  kms_key_id          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE TABLE IF NOT EXISTS core.tenant_api_keys (
  id            bigserial PRIMARY KEY,
  tenant_id     bigint NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  key_prefix    text NOT NULL,
  key_hash      bytea NOT NULL,
  label         text,
  expires_at    timestamptz,
  last_used_at  timestamptz,
  is_revoked    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tenant_api_keys_tenant ON core.tenant_api_keys (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_api_keys_prefix_per_tenant
  ON core.tenant_api_keys (tenant_id, key_prefix);

CREATE OR REPLACE FUNCTION core.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS tg_tenants_updated_at ON core.tenants;
CREATE TRIGGER tg_tenants_updated_at
BEFORE UPDATE ON core.tenants
FOR EACH ROW EXECUTE FUNCTION core.tg_set_updated_at();

-- (Opcional) seed de um tenant para desenvolvimento:
-- INSERT INTO core.tenants (slug, name) VALUES ('demo', 'Tenant Demo')
-- ON CONFLICT (slug) DO NOTHING;


-- =========================================================
-- 1) RESET DO SCHEMA DA APP (APAGA TODOS OS DADOS!)
-- =========================================================
DROP SCHEMA IF EXISTS bebel CASCADE;
CREATE SCHEMA bebel;


-- =========================================================
-- 2) ENUMS DO DOMÍNIO (do seu DDL)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canal_mensagem') THEN
    CREATE TYPE bebel."canal_mensagem" AS ENUM ('WHATSAPP','INSTAGRAM','SMS','EMAIL','TELEGRAM','FACEBOOK','OUTRO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contato_tipo') THEN
    CREATE TYPE bebel."contato_tipo" AS ENUM ('WHATSAPP','TELEFONE','EMAIL','INSTAGRAM','FACEBOOK','TELEGRAM','OUTRO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'msg_direction') THEN
    CREATE TYPE bebel."msg_direction" AS ENUM ('IN','OUT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pessoa_status') THEN
    CREATE TYPE bebel."pessoa_status" AS ENUM ('LEAD','PACIENTE','INATIVO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_stage') THEN
    CREATE TYPE bebel."lead_stage" AS ENUM ('NOVO','QUALIFICANDO','QUALIFICADO','CONVERTIDO','DESCARTADO');
  END IF;
END$$;


-- =========================================================
-- 3) FUNÇÕES (recriadas antes das tabelas com triggers)
-- =========================================================
-- (pequeno utilitário de updated_at para pendências)
CREATE OR REPLACE FUNCTION bebel.fn_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- Sincroniza last_message_at da conversa
CREATE OR REPLACE FUNCTION bebel.fn_sync_conversa_lastmsg()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE bebel.conversas
     SET last_message_at = GREATEST(COALESCE(last_message_at, '-infinity'::timestamptz), NEW.created_at_provider),
         atualizado_em   = now()
   WHERE tenant_id = NEW.tenant_id
     AND id_conversa = NEW.id_conversa;
  RETURN NEW;
END$$;

-- Enfileira job de análise de mensagens
CREATE OR REPLACE FUNCTION bebel.fn_enqueue_msg_ai_job()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.text IS NOT NULL AND NEW.text <> '' THEN
    INSERT INTO bebel.ai_jobs (tenant_id, scope_type, id_scope, analysis_type, priority)
    VALUES (NEW.tenant_id, 'MESSAGE', NEW.id_mensagem, 'msg_basic_v1', 5)
    ON CONFLICT (tenant_id, scope_type, id_scope, analysis_type) DO NOTHING;
  END IF;
  RETURN NEW;
END$$;


-- =========================================================
-- 4) TABELAS DE CATÁLOGO/ROTULOS (globais POR TENANT)
-- =========================================================
-- Em muitos cenários, labels poderiam ser globais.
-- Aqui mantemos POR TENANT para isolar customizações.
CREATE TABLE bebel.ai_analysis_types (
  tenant_id    bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  analysis_type varchar(60) NOT NULL,
  description  text,
  PRIMARY KEY (tenant_id, analysis_type)
);

CREATE TABLE bebel.intent_labels (
  tenant_id           bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  intent_code         varchar(60) NOT NULL,
  description         text,
  active              boolean NOT NULL DEFAULT true,
  generate_pendencia  boolean NOT NULL DEFAULT false,
  generate_pendencia_instructions text,
  PRIMARY KEY (tenant_id, intent_code)
);

CREATE TABLE bebel.quality_labels (
  tenant_id   bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  quality_code varchar(60) NOT NULL,
  description  text,
  active       boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, quality_code)
);

CREATE TABLE bebel.risk_labels (
  tenant_id   bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  risk_code   varchar(60) NOT NULL,
  severity    int NOT NULL CHECK (severity BETWEEN 1 AND 5),
  description text,
  active      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, risk_code)
);


-- =========================================================
-- 5) ENTIDADES PRINCIPAIS
-- =========================================================

-- Pessoas
CREATE TABLE bebel.pessoas (
  tenant_id          bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  id_pessoa          bigserial,
  status             bebel."pessoa_status" NOT NULL DEFAULT 'LEAD',
  nome_completo      varchar(150),
  data_nascimento    date,
  cpf                varchar(14),
  observacoes        text,
  origem             varchar(80),
  utm                jsonb,
  criado_em          timestamptz DEFAULT now(),
  atualizado_em      timestamptz DEFAULT now(),
  stage              bebel."lead_stage" NOT NULL DEFAULT 'NOVO',
  lead_score         int NOT NULL DEFAULT 0,
  consent_marketing  boolean NOT NULL DEFAULT false,
  consent_updated_em timestamptz,
  PRIMARY KEY (tenant_id, id_pessoa)
);
-- único por tenant, e só para PACIENTE
CREATE UNIQUE INDEX uq_pessoa_cpf_paciente_per_tenant
  ON bebel.pessoas (tenant_id, cpf)
  WHERE cpf IS NOT NULL AND status = 'PACIENTE';

-- Contatos da pessoa
CREATE TABLE bebel.pessoas_contatos (
  tenant_id     bigint NOT NULL,
  id_contato    bigserial,
  id_pessoa     bigint NOT NULL,
  tipo          bebel."contato_tipo" NOT NULL,
  valor         varchar(180) NOT NULL,
  valor_norm    varchar(180) NOT NULL,
  preferencial  boolean NOT NULL DEFAULT false,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id_contato),
  FOREIGN KEY (tenant_id, id_pessoa)
    REFERENCES bebel.pessoas (tenant_id, id_pessoa) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_contato_por_pessoa_per_tenant
  ON bebel.pessoas_contatos (tenant_id, id_pessoa, tipo, valor_norm);
CREATE UNIQUE INDEX uq_pessoas_contatos_tipo_valor_norm_per_tenant
  ON bebel.pessoas_contatos (tenant_id, tipo, valor_norm);
CREATE INDEX idx_contatos_tipo_norm_per_tenant
  ON bebel.pessoas_contatos (tenant_id, tipo, valor_norm);

-- Tags da pessoa
CREATE TABLE bebel.pessoas_tags (
  tenant_id  bigint NOT NULL,
  id_tag     bigserial,
  id_pessoa  bigint NOT NULL,
  tag        varchar(60) NOT NULL,
  criado_em  timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id_tag),
  UNIQUE (tenant_id, id_pessoa, tag),
  FOREIGN KEY (tenant_id, id_pessoa)
    REFERENCES bebel.pessoas (tenant_id, id_pessoa) ON DELETE CASCADE
);

-- Profissionais
CREATE TABLE bebel.profissionais (
  tenant_id     bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  id_profissional bigserial,
  nome_completo varchar(150) NOT NULL,
  especialidade varchar(120),
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id_profissional)
);

-- Identidades de canal
CREATE TABLE bebel.channel_identities (
  tenant_id    bigint NOT NULL,
  id_identity  bigserial,
  id_pessoa    bigint NOT NULL,
  canal        bebel."canal_mensagem" NOT NULL,
  external_id  varchar(191) NOT NULL,
  display_name varchar(191),
  provider     varchar(80),
  instance_name varchar(120),
  criado_em    timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id_identity),
  UNIQUE (tenant_id, canal, external_id),
  FOREIGN KEY (tenant_id, id_pessoa)
    REFERENCES bebel.pessoas (tenant_id, id_pessoa) ON DELETE CASCADE
);
CREATE INDEX idx_channel_identities_pessoa_per_tenant
  ON bebel.channel_identities (tenant_id, id_pessoa, canal);

-- Conversas
CREATE TABLE bebel.conversas (
  tenant_id       bigint NOT NULL,
  id_conversa     bigserial,
  id_pessoa       bigint NOT NULL,
  canal           bebel."canal_mensagem" NOT NULL,
  status          varchar NOT NULL DEFAULT 'OPEN',
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  last_message_at timestamptz,
  topic           text,
  meta            jsonb,
  origem          varchar(80),
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now(),
  resumo_conversa text,
  PRIMARY KEY (tenant_id, id_conversa),
  FOREIGN KEY (tenant_id, id_pessoa)
    REFERENCES bebel.pessoas (tenant_id, id_pessoa) ON DELETE CASCADE
);
CREATE INDEX idx_conversas_lastmsg_per_tenant
  ON bebel.conversas (tenant_id, last_message_at DESC);
CREATE INDEX idx_conversas_lookup_per_tenant
  ON bebel.conversas (tenant_id, id_pessoa, canal, status);

-- Mensagens
CREATE TABLE bebel.mensagens (
  tenant_id             bigint NOT NULL,
  id_mensagem           bigserial,
  id_conversa           bigint NOT NULL,
  id_pessoa             bigint,
  canal                 bebel."canal_mensagem" NOT NULL,
  "direction"           bebel."msg_direction" NOT NULL,
  from_me               boolean NOT NULL DEFAULT false,
  sender_external_id    varchar(191),
  message_external_id   varchar(191),
  "text"                text,
  payload               jsonb,
  media_url             text,
  media_mime            varchar(120),
  reply_to_external_id  varchar(191),
  reaction              varchar(16),
  event_type            varchar(80),
  processed             boolean NOT NULL DEFAULT false,
  process_before        timestamptz,
  provider              varchar(80),
  instance_id           varchar(120),
  instance_name         varchar(120),
  chat_external_id      varchar(191),
  pushname              varchar(150),
  created_at_provider   timestamptz NOT NULL,
  created_at_ingest     timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz,
  PRIMARY KEY (tenant_id, id_mensagem),
  FOREIGN KEY (tenant_id, id_conversa)
    REFERENCES bebel.conversas (tenant_id, id_conversa) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, id_pessoa)
    REFERENCES bebel.pessoas (tenant_id, id_pessoa) ON DELETE SET NULL
);
CREATE INDEX idx_msg_conversa_time_per_tenant
  ON bebel.mensagens (tenant_id, id_conversa, created_at_provider);
CREATE INDEX idx_msg_lookup_ext_per_tenant
  ON bebel.mensagens (tenant_id, canal, message_external_id);
CREATE INDEX idx_msg_process_queue_per_tenant
  ON bebel.mensagens (tenant_id, processed, process_before);
CREATE INDEX ix_msg_by_conversa_per_tenant
  ON bebel.mensagens (tenant_id, id_conversa, id_mensagem);
CREATE UNIQUE INDEX uq_mensagens_instance_msg_per_tenant
  ON bebel.mensagens (tenant_id, instance_id, message_external_id);

-- TRIGGERS de mensagens
DROP TRIGGER IF EXISTS tg_mensagens_after_ins ON bebel.mensagens;
CREATE TRIGGER tg_mensagens_after_ins
AFTER INSERT ON bebel.mensagens
FOR EACH ROW EXECUTE FUNCTION bebel.fn_sync_conversa_lastmsg();

DROP TRIGGER IF EXISTS tg_mensagens_ai_queue ON bebel.mensagens;
CREATE TRIGGER tg_mensagens_ai_queue
AFTER INSERT ON bebel.mensagens
FOR EACH ROW EXECUTE FUNCTION bebel.fn_enqueue_msg_ai_job();

-- Análises de mensagem
CREATE TABLE bebel.message_analyses (
  tenant_id      bigint NOT NULL,
  id_msg_analysis bigserial,
  id_mensagem    bigint NOT NULL,
  model          varchar(80) NOT NULL,
  analysis_type  varchar(60) NOT NULL,
  sentiment      varchar(20),
  sentiment_score numeric(4,3),
  response_needed boolean,
  language_quality_score numeric(4,3),
  summary        text,
  details        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id_msg_analysis),
  UNIQUE (tenant_id, id_mensagem, analysis_type, model),
  FOREIGN KEY (tenant_id, id_mensagem)
    REFERENCES bebel.mensagens (tenant_id, id_mensagem) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, analysis_type)
    REFERENCES bebel.ai_analysis_types (tenant_id, analysis_type)
);
CREATE INDEX idx_msg_analyses_msg_per_tenant
  ON bebel.message_analyses (tenant_id, id_mensagem);
CREATE INDEX ix_anl_by_msg_type_per_tenant
  ON bebel.message_analyses (tenant_id, id_mensagem, analysis_type);

-- Intents de mensagem
CREATE TABLE bebel.message_intents (
  tenant_id   bigint NOT NULL,
  id_mensagem bigint NOT NULL,
  intent_code varchar(60) NOT NULL,
  confidence  numeric(4,3),
  PRIMARY KEY (tenant_id, id_mensagem, intent_code),
  FOREIGN KEY (tenant_id, id_mensagem)
    REFERENCES bebel.mensagens (tenant_id, id_mensagem) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, intent_code)
    REFERENCES bebel.intent_labels (tenant_id, intent_code)
);

-- Quality issues
CREATE TABLE bebel.message_quality_issues (
  tenant_id   bigint NOT NULL,
  id_mensagem bigint NOT NULL,
  quality_code varchar(60) NOT NULL,
  confidence   numeric(4,3),
  PRIMARY KEY (tenant_id, id_mensagem, quality_code),
  FOREIGN KEY (tenant_id, id_mensagem)
    REFERENCES bebel.mensagens (tenant_id, id_mensagem) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, quality_code)
    REFERENCES bebel.quality_labels (tenant_id, quality_code)
);

-- Risks
CREATE TABLE bebel.message_risks (
  tenant_id   bigint NOT NULL,
  id_mensagem bigint NOT NULL,
  risk_code   varchar(60) NOT NULL,
  detected    boolean NOT NULL DEFAULT true,
  confidence  numeric(4,3),
  PRIMARY KEY (tenant_id, id_mensagem, risk_code),
  FOREIGN KEY (tenant_id, id_mensagem)
    REFERENCES bebel.mensagens (tenant_id, id_mensagem) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, risk_code)
    REFERENCES bebel.risk_labels (tenant_id, risk_code)
);

-- Pendência sinalizada
CREATE TABLE bebel.pendencia_sinalizada (
  tenant_id              bigint NOT NULL,
  id_pendencia_sinalizada bigserial,
  id_conversa            bigint NOT NULL,
  id_mensagem_origem     bigint,
  tipo                   text NOT NULL,
  descricao              text,
  prioridade             int CHECK (prioridade BETWEEN 1 AND 5),
  sla_at                 timestamptz,
  status                 text NOT NULL DEFAULT 'SINALIZADA'
                           CHECK (status IN ('SINALIZADA','RESOLVIDA','IGNORADA')),
  detected_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at            timestamptz,
  resolution_note        text,

  PRIMARY KEY (tenant_id, id_pendencia_sinalizada),

  -- FKs (assumindo PKs compostas nessas tabelas)
  FOREIGN KEY (tenant_id, id_conversa)
    REFERENCES bebel.conversas (tenant_id, id_conversa),

  FOREIGN KEY (tenant_id, tipo)
    REFERENCES bebel.intent_labels (tenant_id, intent_code)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Índices
CREATE INDEX ix_pendencia_sinalizada_tipo_per_tenant
  ON bebel.pendencia_sinalizada (tenant_id, tipo);

-- O "único enquanto SINALIZADA" deve ser um índice parcial separado
CREATE UNIQUE INDEX ux_pendencia_sinalizada_open_per_tenant
  ON bebel.pendencia_sinalizada (tenant_id, id_conversa, tipo)
  WHERE status = 'SINALIZADA';

-- ##############

-- AI jobs
CREATE TABLE bebel.ai_jobs (
  tenant_id     bigint NOT NULL,
  id_job        bigserial,
  scope_type    varchar(20) NOT NULL,
  id_scope      bigint NOT NULL,
  analysis_type varchar(60) NOT NULL,
  status        varchar(20) NOT NULL DEFAULT 'PENDING',
  priority      int NOT NULL DEFAULT 5,
  attempt_count int NOT NULL DEFAULT 0,
  last_error    text,
  scheduled_for timestamptz DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id_job),
  UNIQUE (tenant_id, scope_type, id_scope, analysis_type),
  FOREIGN KEY (tenant_id, analysis_type)
    REFERENCES bebel.ai_analysis_types (tenant_id, analysis_type)
);
CREATE INDEX idx_ai_jobs_status_per_tenant
  ON bebel.ai_jobs (tenant_id, status, priority, scheduled_for NULLS FIRST, created_at);

-- Alerts
CREATE TABLE bebel.alerts (
  tenant_id   bigint NOT NULL REFERENCES core.tenants(id) ON DELETE RESTRICT,
  id_alert    bigserial,
  scope_type  varchar(20) NOT NULL,
  id_scope    bigint NOT NULL,
  alert_code  varchar(60) NOT NULL,
  severity    int NOT NULL DEFAULT 3,
  payload     jsonb,
  status      varchar(20) NOT NULL DEFAULT 'OPEN',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id_alert)
);
CREATE UNIQUE INDEX uq_alerts_open_per_tenant
  ON bebel.alerts (tenant_id, scope_type, id_scope, alert_code)
  WHERE status = 'OPEN';



-- Aplica RLS e cria (se não existirem) as 2 políticas padrão em TODAS as tabelas
-- do schema bebel que tenham a coluna tenant_id.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'bebel' AND column_name = 'tenant_id'
  LOOP
    -- Habilita RLS
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.table_schema, r.table_name);

    -- Política de SELECT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = r.table_schema
        AND tablename  = r.table_name
        AND policyname = 'sel_tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY sel_tenant_isolation ON %I.%I
           FOR SELECT USING (tenant_id = current_setting(''app.tenant_id'')::bigint);',
        r.table_schema, r.table_name
      );
    END IF;

    -- Política de ALL (INSERT/UPDATE/DELETE)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = r.table_schema
        AND tablename  = r.table_name
        AND policyname = 'wr_tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY wr_tenant_isolation ON %I.%I
           FOR ALL USING (tenant_id = current_setting(''app.tenant_id'')::bigint)
           WITH CHECK (tenant_id = current_setting(''app.tenant_id'')::bigint);',
        r.table_schema, r.table_name
      );
    END IF;

  END LOOP;
END
$$;

