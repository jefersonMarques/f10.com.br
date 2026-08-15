# F10 Operations Foundation

A área interna utiliza o mesmo SvelteKit do site público e adiciona PostgreSQL como persistência operacional.

## Variáveis de ambiente

Use `.env.example` como referência e mantenha os valores reais somente no `.env` local ou no ambiente seguro do servidor.

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

Para o smoke test HTTP:

```bash
OPERATIONS_BASE_URL=https://app.f10.com.br
OPERATIONS_SMOKE_EMAIL=admin@f10.com.br
OPERATIONS_SMOKE_PASSWORD="senha-da-conta-de-homologacao"
```

Os comandos operacionais usam `--env-file-if-exists=.env`. Portanto, carregam automaticamente o `.env` quando ele existe, mas continuam funcionando quando as variáveis são fornecidas diretamente pelo ambiente do processo. Variáveis já definidas no ambiente têm precedência sobre os valores do `.env`.

## Inicialização

Depois de instalar as dependências do projeto:

```bash
npm run db:migrate
npm run admin:bootstrap
npm run operations:doctor
```

Com a aplicação em execução, valide as rotas internas:

```bash
npm run operations:smoke
```

No servidor, segredos devem preferencialmente ser fornecidos pelo ambiente do processo ou arquivo protegido fora do repositório. Segredos não devem ser versionados no Git.

## Validação operacional

`operations:doctor` valida banco, migrations, tabelas críticas, papéis, permissões e a existência de Super Admin ativo.

```bash
npm run operations:doctor
```

`operations:smoke` valida proteção de `/app`, login, rotas principais e logout usando a conta de homologação configurada nas variáveis `OPERATIONS_SMOKE_*`.

```bash
npm run operations:smoke
```

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
