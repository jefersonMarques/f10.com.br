# F10 Operations Foundation

A área interna utiliza o mesmo SvelteKit do site público e adiciona PostgreSQL como persistência operacional.

## Variáveis de ambiente

```bash
DATABASE_URL=postgres://user:password@127.0.0.1:5432/f10_operations
DATABASE_POOL_MAX=10
```

Para criar o primeiro Super Admin:

```bash
BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@f10.com.br
BOOTSTRAP_SUPER_ADMIN_NAME="Administrador F10"
BOOTSTRAP_SUPER_ADMIN_PASSWORD="uma-senha-forte-com-14-ou-mais-caracteres"
```

`BOOTSTRAP_SUPER_ADMIN_FORCE_PASSWORD=true` só deve ser usado quando houver intenção explícita de redefinir a senha de uma conta já existente.

## Inicialização

Depois de instalar as dependências do projeto:

```bash
npm run db:migrate
npm run admin:bootstrap
```

No servidor, as variáveis podem ser carregadas antes dos comandos ou fornecidas pelo ambiente do processo. Segredos não devem ser versionados no Git.

## Validação do ambiente

Depois das migrations e do bootstrap, valide banco, migrations, tabelas críticas, papéis e permissões:

```bash
DATABASE_URL="postgres://..." npm run operations:doctor
```

O comando é somente leitura. Por padrão também exige ao menos um `SUPER_ADMIN` ativo. Para diagnosticar um banco antes do bootstrap:

```bash
OPERATIONS_DOCTOR_REQUIRE_SUPER_ADMIN=false \
DATABASE_URL="postgres://..." \
npm run operations:doctor
```

Com a aplicação de homologação em execução, valide autenticação e as rotas principais:

```bash
OPERATIONS_BASE_URL="https://homolog.example.com" \
OPERATIONS_SMOKE_EMAIL="admin@f10.com.br" \
OPERATIONS_SMOKE_PASSWORD="..." \
npm run operations:smoke
```

O smoke test cria uma sessão temporária, verifica as rotas protegidas e executa logout ao final.

O roteiro manual completo está em `docs/operations-test-plan.md`.

## Autorização

O modelo combina papéis e permissões individuais.

Papéis iniciais:

- `SUPER_ADMIN`: acesso sistêmico completo.
- `ADMIN`: administração operacional e de funcionários, sem segredos e configurações críticas.
- `EMPLOYEE`: conjunto mínimo de permissões operacionais.

Escopos disponíveis:

- `own`: apenas itens de responsabilidade do usuário.
- `team`: itens pertencentes às equipes do usuário.
- `all`: acesso global ao recurso.

Uma permissão individual com efeito `deny` remove a concessão herdada do papel. Uma permissão individual com efeito `allow` substitui o escopo herdado.

## Segurança inicial

- Senhas usam `scrypt` com salt aleatório.
- Tokens de sessão são aleatórios e somente o SHA-256 é persistido no banco.
- Sessões expiram em 12 horas e podem ser revogadas.
- O login possui bloqueio temporário por combinação de e-mail e origem após tentativas repetidas.
- Eventos de autenticação são registrados em `audit_logs`.
- A área `/app` deve permanecer fora do rastreamento de marketing do site público.
