CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'invited');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE permission_scope AS ENUM ('own', 'team', 'all');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE permission_effect AS ENUM ('allow', 'deny');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  scope permission_scope NOT NULL DEFAULT 'all',
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  effect permission_effect NOT NULL,
  scope permission_scope NOT NULL DEFAULT 'own',
  PRIMARY KEY (user_id, permission_code)
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_manager boolean NOT NULL DEFAULT false,
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  key text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at);

INSERT INTO roles (code, name, is_system)
VALUES
  ('SUPER_ADMIN', 'Super Admin', true),
  ('ADMIN', 'Admin', true),
  ('EMPLOYEE', 'Funcionário', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_system = EXCLUDED.is_system;

INSERT INTO permissions (code, name, description)
VALUES
  ('help.view', 'Visualizar Central de Ajuda', 'Permite visualizar os conteúdos da Central de Ajuda.'),
  ('help.edit', 'Editar Central de Ajuda', 'Permite criar e editar conteúdos da Central de Ajuda.'),
  ('help.publish', 'Publicar Central de Ajuda', 'Permite publicar conteúdos da Central de Ajuda.'),
  ('tasks.view', 'Visualizar tarefas', 'Permite visualizar tarefas dentro do escopo concedido.'),
  ('tasks.create', 'Criar tarefas', 'Permite criar tarefas.'),
  ('tasks.update', 'Atualizar tarefas', 'Permite atualizar tarefas dentro do escopo concedido.'),
  ('tasks.assign', 'Atribuir tarefas', 'Permite atribuir tarefas para outros usuários.'),
  ('tasks.manage', 'Administrar tarefas', 'Permite administrar projetos, status e configurações de tarefas.'),
  ('tickets.view', 'Visualizar tickets', 'Permite visualizar tickets dentro do escopo concedido.'),
  ('tickets.create', 'Criar tickets', 'Permite criar tickets.'),
  ('tickets.reply', 'Responder tickets', 'Permite responder tickets dentro do escopo concedido.'),
  ('tickets.assign', 'Atribuir tickets', 'Permite atribuir tickets para usuários e equipes.'),
  ('tickets.manage', 'Administrar tickets', 'Permite administrar filas, SLA e configurações de tickets.'),
  ('chat.view', 'Visualizar chat', 'Permite visualizar conversas dentro do escopo concedido.'),
  ('chat.respond', 'Responder chat', 'Permite responder conversas dentro do escopo concedido.'),
  ('chat.manage', 'Administrar chat', 'Permite administrar filas e configurações de atendimento.'),
  ('customers.view', 'Visualizar clientes', 'Permite visualizar clientes dentro do escopo concedido.'),
  ('customers.manage', 'Administrar clientes', 'Permite criar e alterar cadastros de clientes.'),
  ('users.view', 'Visualizar usuários', 'Permite visualizar usuários internos.'),
  ('users.manage', 'Administrar usuários', 'Permite criar, bloquear e alterar usuários internos.'),
  ('roles.manage', 'Administrar papéis', 'Permite administrar papéis e permissões sistêmicas.'),
  ('reports.view', 'Visualizar relatórios', 'Permite visualizar relatórios operacionais.'),
  ('audit.view', 'Visualizar auditoria', 'Permite visualizar logs de auditoria.'),
  ('integrations.view', 'Visualizar integrações', 'Permite visualizar integrações configuradas.'),
  ('integrations.manage', 'Administrar integrações', 'Permite alterar integrações do sistema.'),
  ('secrets.manage', 'Administrar segredos', 'Permite alterar chaves e credenciais sensíveis.'),
  ('remote.request', 'Solicitar acesso remoto', 'Permite solicitar autorização para acesso remoto.'),
  ('remote.use', 'Usar acesso remoto', 'Permite iniciar uma sessão remota autorizada.'),
  ('remote.manage', 'Administrar acesso remoto', 'Permite administrar políticas e integrações de acesso remoto.'),
  ('system.settings.manage', 'Administrar sistema', 'Permite alterar configurações críticas do sistema.')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, permissions.code, 'all'::permission_scope
FROM roles
CROSS JOIN permissions
WHERE roles.code = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, permissions.code, 'all'::permission_scope
FROM roles
CROSS JOIN permissions
WHERE roles.code = 'ADMIN'
  AND permissions.code NOT IN (
    'roles.manage',
    'audit.view',
    'integrations.manage',
    'secrets.manage',
    'remote.manage',
    'system.settings.manage'
  )
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, permission_data.code, permission_data.scope::permission_scope
FROM roles
CROSS JOIN (
  VALUES
    ('help.view', 'all'),
    ('tasks.view', 'own'),
    ('tasks.create', 'own'),
    ('tasks.update', 'own'),
    ('tickets.view', 'team'),
    ('tickets.create', 'own'),
    ('tickets.reply', 'team'),
    ('chat.view', 'team'),
    ('chat.respond', 'team'),
    ('customers.view', 'team'),
    ('remote.request', 'own'),
    ('remote.use', 'own')
) AS permission_data(code, scope)
WHERE roles.code = 'EMPLOYEE'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;
