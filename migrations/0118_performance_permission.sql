-- Permite configurar o acesso à Performance independentemente dos demais relatórios.
INSERT INTO permissions (code, name, description)
VALUES ('performance.view', 'Visualizar Performance', 'Visualizar indicadores da equipe e histórico de presença.')
ON CONFLICT (code) DO NOTHING;

-- Preserva o acesso dos perfis existentes até que o gestor o altere.
INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT role_id, 'performance.view', scope
FROM role_permissions
WHERE permission_code = 'reports.view'
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- Mantém concessões e bloqueios individuais anteriores.
INSERT INTO user_permissions (user_id, permission_code, effect, scope)
SELECT user_id, 'performance.view', effect, scope
FROM user_permissions
WHERE permission_code = 'reports.view'
ON CONFLICT (user_id, permission_code) DO NOTHING;
