INSERT INTO roles (code, name, is_system)
VALUES ('VIEWER', 'Consulta', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_system = EXCLUDED.is_system;

DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE code = 'VIEWER');

INSERT INTO role_permissions (role_id, permission_code, scope)
SELECT roles.id, permission_data.code, permission_data.scope::permission_scope
FROM roles
CROSS JOIN (
  VALUES
    ('help.view', 'all'),
    ('tickets.view', 'all'),
    ('customers.view', 'all'),
    ('reports.view', 'all')
) AS permission_data(code, scope)
WHERE roles.code = 'VIEWER'
ON CONFLICT (role_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;
