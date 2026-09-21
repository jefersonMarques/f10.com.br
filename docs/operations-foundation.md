# F10 Operations Foundation

A área interna utiliza o mesmo SvelteKit do site público e adiciona PostgreSQL como persistência operacional.

## Variáveis de ambiente

Use `.env.example` como referência e mantenha os valores reais somente no `.env` local ou no ambiente seguro do servidor.

```bash
DATABASE_URL=postgres://user:password@127.0.0.1:5432/f10_operations
DATABASE_POOL_MAX=10
```

Para habilitar o laboratório do agente de suporte:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
OPENAI_TIMEOUT_MS=25000
```

O agente utiliza a Responses API somente no servidor, com `store: false`. A chave nunca deve ser exposta ao navegador.

O agente no chat nativo possui feature flag independente e permanece desligado por padrão:

```bash
SUPPORT_AI_CHAT_ENABLED=false
SUPPORT_RATE_LIMIT_SECRET=use-um-segredo-aleatorio-com-32-ou-mais-caracteres
```

Para homologar o atendimento automático ponta a ponta, altere `SUPPORT_AI_CHAT_ENABLED=true`. O `operations:doctor` reprova a configuração quando o flag está ativo sem `OPENAI_API_KEY` ou sem um `SUPPORT_RATE_LIMIT_SECRET` válido.

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

`operations:doctor` valida banco, migrations, tabelas críticas, extensão `pg_trgm`, configuração opcional da OpenAI, configuração do agente no chat nativo, papéis, permissões e a existência de Super Admin ativo.

Por padrão, a ausência de `OPENAI_API_KEY` não reprova o doctor: o laboratório permanece acessível, mas qualquer tentativa de resposta falha de forma fechada para escalonamento. Para tornar OpenAI obrigatória no ambiente:

```bash
OPERATIONS_DOCTOR_REQUIRE_OPENAI=true
```

`operations:smoke` valida proteção de `/app`, login, rotas principais, Base de Conhecimento, importação, Pesquisa de Suporte, Insights, Chat, preview do cliente, laboratório de IA e logout. O smoke não envia perguntas à OpenAI e portanto não consome tokens.

## Base de Conhecimento estruturada

A fonte canônica do novo Help Center é formada por:

```text
help_contents
  └─ help_content_steps
       └─ help_step_blocks
            └─ help_assets
```

Cada conteúdo possui informações gerais e `ai_general_knowledge`. Cada passo possui `ai_knowledge`. Blocos de imagem e vídeo podem manter transcrição e resumo exclusivo para IA.

A publicação gera um snapshot com duas áreas separadas:

- `public`: somente dados destinados à apresentação para o cliente;
- `ai`: conhecimento interno, transcrições e contexto para o agente de suporte.

O conteúdo em edição pode voltar para rascunho sem alterar a última versão publicada.

Rotas atuais:

- `/app/help/content`: biblioteca estruturada;
- `/app/help/content/:contentId`: editor por passos;
- `/app/help/content/import`: importação em lote;
- `/app/help/search`: laboratório de pesquisa;
- `/app/help/insights`: telemetria e lacunas de conhecimento;
- `/app/chat/lab`: agente de suporte IA isolado;
- `/app/chat/preview`: simulação do futuro chat do cliente usando as APIs públicas reais.

A Central pública atual permanece inalterada até a homologação do novo modelo.

## Importação de conteúdo

A importação usa o formato versionado `f10-help-import` v1. O arquivo de exemplo está disponível em:

```text
/templates/f10-help-import-v1.example.json
```

A especificação e um prompt pronto para uso com outra IA estão em:

```text
docs/help-import-format.md
```

O formato suporta conteúdo geral, categoria, conhecimento exclusivo da IA, passos, texto, imagem, vídeo, transcrição, resumo de mídia, avisos e links.

Cada item importado precisa possuir `externalId` estável e uma `source`, por exemplo `movidesk`. A combinação é persistida em `help_contents` para impedir duplicação acidental da mesma origem.

A importação é transacional: conflito de slug, ID externo duplicado ou erro estrutural cancela o lote inteiro. Conteúdos importados entram sempre como `draft`; nunca são publicados automaticamente. Imagens e vídeos permanecem referenciados pelas URLs informadas no arquivo e não são copiados fisicamente nesta fase.

## Pesquisa e telemetria

A migration de busca habilita `pg_trgm` e mantém `help_search_documents` como projeção derivada dos snapshots publicados. O documento é atualizado automaticamente por trigger quando uma publicação de conteúdo é criada ou substituída.

As pesquisas são registradas em:

- `help_search_events`: texto original, texto normalizado, origem, quantidade de resultados e desfecho;
- `help_search_results`: resultados apresentados, posição, score e clique.

Os desfechos registram `ai_answered`, `escalated` e `ticket_id`. A busca pública futura deverá usar apenas `public_text`. Ambientes internos e o agente podem pesquisar também `ai_text`.

## Agente de suporte IA

O agente segue um fluxo RAG controlado:

1. a pergunta é registrada como busca com origem `chat_ai`;
2. somente documentos derivados da última publicação são recuperados;
3. conteúdo público e conhecimento privado da IA são enviados ao modelo como fontes;
4. o modelo responde usando Structured Outputs;
5. uma resposta só é aceita como resolvida quando o modelo indica ao menos uma fonte recuperada válida;
6. ausência de fonte, resposta sem citação, contexto insuficiente ou falha da OpenAI resultam em escalonamento;
7. a execução é persistida em `support_ai_runs`.

`support_ai_runs` mantém pergunta, resposta, resolução, modelo, identificador da resposta do provedor, snapshot das fontes, motivo de escalonamento/falha, tokens, latência e vínculo opcional com ticket. Isso permite auditar qualidade e custo antes de colocar o agente no widget público.

O prompt instrui o agente a não inventar procedimentos, telas, botões, políticas ou funcionalidades que não estejam sustentados pela Base publicada. Conteúdo marcado como conhecimento interno da IA pode orientar a resposta, mas não deve ser exposto como metadado ou nota interna.

## Agente conectado ao chat nativo

Quando `SUPPORT_AI_CHAT_ENABLED=true`, novas sessões de chat começam em estado `active`. A primeira mensagem e as mensagens seguintes podem ser respondidas pelo mesmo agente usado no laboratório.

Estados persistidos da sessão:

- `active`: IA pode responder;
- `escalated`: IA parou e a equipe precisa assumir;
- `human`: um funcionário assumiu a conversa e a IA não volta a responder;
- `disabled`: automação desligada para a sessão.

A sessão possui trava de processamento para evitar duas respostas simultâneas. Também existe limite de execuções por conversa. Se o feature flag for desligado, sessões ainda ativas deixam de executar a IA na próxima interação.

Quando a IA não encontra sustentação, falha tecnicamente ou atinge o limite operacional, ela registra o motivo, muda a sessão para `escalated`, mantém o ticket aberto e envia uma mensagem segura informando que o atendimento seguirá com a equipe.

Uma resposta humana pelo Chat, uma resposta pública pelo Ticket ou a atribuição do Ticket a um funcionário muda a sessão para `human`. A persistência da resposta automática também verifica o estado da sessão dentro da transação; portanto, uma resposta atrasada da IA é descartada se um humano tiver assumido enquanto o modelo estava processando.

`/app/chat/preview` existe para homologar esse fluxo ponta a ponta sem instalar o novo widget no site. O Movidesk permanece como canal público durante esta fase.

## Autorização

O modelo combina papéis e permissões individuais.

Papéis iniciais:

- `SUPER_ADMIN`: acesso sistêmico completo.
- `ADMIN`: administração operacional e de funcionários, sem segredos e configurações críticas.
- `EMPLOYEE`: conjunto mínimo de permissões operacionais.

Escopos disponíveis:

- `own`: apenas itens de responsabilidade do usuário;
- `team`: itens pertencentes às equipes do usuário;
- `all`: acesso global ao recurso.

Uma permissão individual com efeito `deny` remove a concessão herdada do papel. Uma permissão individual com efeito `allow` substitui o escopo herdado.

## Segurança inicial

- Senhas usam `scrypt` com salt aleatório.
- Tokens de sessão são aleatórios e somente o SHA-256 é persistido no banco.
- Sessões expiram em 12 horas e podem ser revogadas.
- O login possui bloqueio temporário por combinação de e-mail e origem após tentativas repetidas.
- Eventos de autenticação são registrados em `audit_logs`.
- A área `/app` deve permanecer fora do rastreamento de marketing do site público.
- Rascunhos de conhecimento não substituem a última publicação usada pela pesquisa ou pelo agente.
- Conteúdo importado nunca é publicado automaticamente.
- A chave da OpenAI é lida apenas no servidor.
- Respostas da OpenAI são solicitadas com `store: false`.
- O histórico administrativo do laboratório não é entregue a usuários sem escopo global de `chat.view`.
- Handoff humano impede respostas automáticas posteriores naquela sessão.
