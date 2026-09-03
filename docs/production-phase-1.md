# Produção — Fase 1

Checklist para o primeiro lançamento controlado do F10 Operations, Área do Cliente, Central de Ajuda, Trilhas e Service Requests.

## Escopo

A Fase 1 deve começar com a equipe interna e um grupo pequeno de clientes reais. O objetivo é validar operação, suporte, anexos privados, IA e fluxos de implementação antes de ampliar o acesso.

## 1. Backup e rollback

- Gerar backup completo do PostgreSQL antes das migrations.
- Confirmar retenção e backup dos buckets MinIO/S3.
- Manter o commit/build anterior disponível para rollback.
- Registrar o SHA publicado.

A migration `0066_help_training_content_source.sql` remove as trilhas de teste existentes. Isto é intencional porque o produto ainda não possui trilhas oficiais em produção. Depois da Fase 1 essa premissa deixa de ser válida.

## 2. Configuração obrigatória

- `DATABASE_URL`.
- `SUPPORT_RATE_LIMIT_SECRET` com pelo menos 32 caracteres.
- `ASSET_STORAGE=s3` e configuração completa de S3/MinIO.
- `SERVICE_REQUEST_S3_BUCKET`, diferente do bucket da Central de Ajuda.
- `SERVICE_REQUEST_SECRET_KEY` com pelo menos 32 caracteres.
- `AI_SECRETS_KEY` com pelo menos 32 caracteres quando as chaves forem salvas no painel.
- `HELP_PUBLIC_AI_SECRET` com pelo menos 32 caracteres para assistente público e tutor.
- Brevo e remetente configurados.
- `CUSTOMER_PORTAL_BASE_URL` em HTTPS.
- `TRAINING_BASE_URL` em HTTPS ou a mesma origem da Área do Cliente.

OpenAI e DeepSeek podem ter as credenciais salvas em **Configurações > Inteligência Artificial**. A transcrição de MP4/YouTube exige OpenAI; a estruturação do artigo e a geração da trilha passam pelo AI Gateway e usam o provedor/fallback definido no painel.

## 3. Inteligência Artificial

Antes da release:

1. testar a conexão dos provedores utilizados;
2. confirmar `IA da Central de Ajuda`;
3. confirmar `Edição e geração de conteúdo`;
4. confirmar `Geração de trilhas`;
5. revisar provedor, modelo, fallback e limites globais.

Uma trilha nova só pode nascer de conteúdo publicado. Ela reutiliza a publicação, o vídeo e os screenshots e grava apenas a orientação e o timestamp de início do vídeo.

## 4. Banco e build

```bash
npm ci
npm run db:migrate
npm run check
npm run build
npm run production:doctor
```

Nenhum `FAIL` dos doctors deve ser ignorado sem causa identificada e registrada.

## 5. Execução SSR

O projeto atual usa `adapter-node`. A aplicação completa não deve ser publicada com `pm2 serve dist`.

```bash
npm run build
HOST=127.0.0.1 PORT=5179 ORIGIN=https://f10.com.br node build
```

Com PM2, execute `build/index.js` como processo Node. O Nginx/Nginx Proxy Manager deve terminar HTTPS e encaminhar para a porta Node.

## 6. Smoke HTTP

Configure `OPERATIONS_BASE_URL`, `OPERATIONS_SMOKE_EMAIL` e `OPERATIONS_SMOKE_PASSWORD` para uma conta interna dedicada e execute:

```bash
npm run operations:smoke
```

O smoke cobre as rotas autenticadas principais, incluindo Configurações, IA, Trilhas, Tickets, Chat, Ajuda, tarefas e acesso remoto.

## 7. Homologação manual obrigatória

- Login/logout e recuperação de acesso.
- Criação, resposta, atribuição e fechamento de ticket.
- Chat com e sem IA e handoff humano.
- Criação de equipe e roteamento do suporte.
- CELL COIN ponta a ponta com anexos privados.
- NFSe ponta a ponta, incluindo segredo criptografado e revelação auditada.
- Download e substituição de anexos de Service Request.
- Envio de e-mail transacional.
- Importação de conteúdo por MP4.
- Importação por YouTube, se habilitada.
- Revisão de screenshots e publicação do conteúdo.
- Criação de trilha somente a partir de conteúdo publicado.
- Guia flutuante, fallback `Continuar trilha` e retomada.
- Vídeo iniciando no timestamp essencial, sem corte físico.
- Tutor contextual restrito ao conteúdo publicado.
- Convite e conclusão de trilha.
- Acesso remoto, se fizer parte da Fase 1.

## 8. Liberação

Sequência sugerida:

1. equipe F10;
2. 2 a 5 clientes controlados;
3. acompanhar erros, tickets, custos de IA e falhas de e-mail diariamente;
4. corrigir pontos encontrados sem ampliar a base;
5. ampliar somente depois de um período estável.

A Fase 1 não exige todas as automações futuras, mas exige armazenamento privado, criptografia, roteamento, e-mail, autenticação e rollback comprovadamente operacionais.
