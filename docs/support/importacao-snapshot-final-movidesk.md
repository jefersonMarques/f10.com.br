# Importação offline do snapshot final do Movidesk

Este procedimento importa os chamados históricos usando **somente** o arquivo
`/var/lib/f10/movidesk-final-snapshot/tickets.jsonl`. Não consulta novamente a
API do Movidesk.

## Proteção dos dados

- O snapshot deve permanecer imutável e com permissão restrita ao administrador.
- A prévia percorre todas as linhas e confere IDs, origem, status, inventário e total.
- Todos os comandos sem `--apply` são somente leitura e não exigem conexão ao banco.
- A escrita ocorre por transação de ticket e reaproveita `movidesk_ticket_imports` e
  `movidesk_ticket_action_imports`. Reexecutar não deve criar duplicados.
- Tickets `Canceled` entram como `closed`, mantendo o estado original em
  `movidesk_ticket_imports.source_base_status`.
- Chat (origem 5) é importado como `web_chat`. Quando a transcrição pode ser
  reconstruída, o original é preservado em
  `movidesk_chat_transcript_archives` e as mensagens são registradas por horário
  e autor; outros formatos mantêm a ação original.
- Todas as mensagens importadas são inicialmente internas. A origem e visibilidade
  histórica ficam na metadata, para revisão de acesso posterior.
- Contatos históricos novos não recebem e-mails de login. Ninguém obtém acesso
  ao portal, notificações ou pesquisas de satisfação durante o importador.
- Os anexos são referenciados na metadata, mas os arquivos binários não são
  transferidos pelo importador. O HTML original permanece no snapshot (com SHA-256
  nas ações). Preservar o snapshot é obrigatório até conclusão da migração de mídia.

## 1. Pré-requisitos

No servidor de produção:

```bash
cd /opt/f10.com.br
npm run prod
```

Verifique que as migrações `0103`, `0105` e `0106` estão aplicadas.
Antes de permitir qualquer escrita, crie um backup recuperável do PostgreSQL
pelo procedimento habitual da infraestrutura.

Não execute `scripts/import-movidesk-final-tickets.mjs`: esse arquivo ainda faz
consultas diretas à API e não importa o snapshot.

## 2. Validar todas as 31.085 linhas, sem escrita

```bash
cd /opt/f10.com.br
node scripts/import-movidesk-final-snapshot.mjs
```

Deve exibir `phase: "validated"`, `total: 31085`, contagens por estado,
origem, ações e chats. Qualquer divergência interrompe o processo.

## 3. Primeiro lote controlado

```bash
cd /opt/f10.com.br
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/import-movidesk-final-snapshot.mjs --apply --limit 10
```

O programa valida o snapshot inteiro antes do lote e registra os IDs no banco,
de forma que um novo processamento não duplique tickets.

A importação **não** atualiza o status de tickets já existentes. Verifique os
dez primeiros registros, especialmente o chat 43205, a visão do operador, os
participantes e o histórico, antes do processamento completo.

## 4. Importação total, retomável

```bash
cd /opt/f10.com.br
umask 077
nohup node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/import-movidesk-final-snapshot.mjs --apply --all \
  > /var/lib/f10/movidesk-final-snapshot/import.log 2>&1 \
  < /dev/null &
echo $!
```

Acompanhar:

```bash
tail -n 25 /var/lib/f10/movidesk-final-snapshot/import.log
```

Em caso de interrupção, execute novamente o comando `--apply --all`: os
vínculos do banco impedem duplicação de tickets e ações. A reconstrução de
chat usa arquivo de auditoria próprio, também idempotente.

Não execute duas instâncias da importação simultaneamente. O processo
interrompe após 10 erros de ticket e informa os IDs sem divulgar mensagens
ou e-mails dos clientes nos logs.

## 5. Conferência após a importação

No diretório da aplicação:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-movidesk-final-snapshot-import.mjs
```

O auditor específico compara os IDs do inventário com os mapeamentos e
a quantidade de ações de cada ticket, além de indicar chats reconstruídos e
pendências. Para verificar também as flags de acesso, execute separadamente
`scripts/audit-movidesk-ticket-import-integrity.mjs`. O auditor antigo pode
sinalizar divergências de visibilidade em mensagens históricas deliberadamente
mantidas internas. Não faça restauração automática de visibilidade sem revisão.

Conferir também o banco em modo leitura (por exemplo, via `psql`):

```sql
SELECT count(*) AS source_tickets
FROM movidesk_ticket_imports;

SELECT source_base_status, count(*)
FROM movidesk_ticket_imports
GROUP BY source_base_status
ORDER BY source_base_status;

SELECT count(*) AS source_actions
FROM movidesk_ticket_action_imports;

SELECT count(*) AS reconstructed_chats
FROM movidesk_chat_transcript_archives;
```

`source_tickets` inclui os importados anteriormente e os novos, portanto pode
ser maior que o total do snapshot se houver registros fora desse recorte.
Uma auditoria mais detalhada deverá comparar exatamente os IDs do inventário
com o mapeamento do banco e apontar chats com transcrição ainda não reconstruída.

## 6. Recuperação das ocorrências com IDs de ação repetidos

A importação final constatou 31.085 tickets e 21.070 transcrições reconstruídas,
mas 45 tickets contêm 48 ocorrências adicionais que reutilizam IDs de ações já
existentes. Nenhuma ação de ID distinto está ausente. As 48 ocorrências possuem
metadados diferentes; 29 alteram a descrição e algumas alteram autor e anexos.

A correção é **separada do importador original** e lê exclusivamente o snapshot
local. Não execute novamente a importação integral para resolver duplicidades.

1. Confirme backup PostgreSQL e a migração `0111_movidesk_duplicate_action_recovery.sql`.
2. Valide o snapshot completo sem escrita:

   `node scripts/recover-movidesk-duplicate-actions.mjs`

   Deve registrar `ticketsValidated: 31085`, `ticketsAffected: 45` e
   `duplicateOccurrences: 48`. Os contadores bloqueiam alterações se o inventário mudar.

3. Somente após autorização, aplique o lote controlado:

   `node --env-file-if-exists=.env --env-file-if-exists=.env.production scripts/recover-movidesk-duplicate-actions.mjs --apply --limit 3`

4. Execute a auditoria em modo somente leitura; enquanto faltarem ocorrências,
   `state: "requires_review"` é esperado.

5. Após aprovação, execute a recuperação completa:

   `node --env-file-if-exists=.env --env-file-if-exists=.env.production scripts/recover-movidesk-duplicate-actions.mjs --apply --all`

6. Repita `scripts/audit-movidesk-final-snapshot-import.mjs`. São esperados:
   `missingActions: 0`, `missingDuplicateOccurrences: 0`,
   `recoveredDuplicateOccurrences: 48`, `missingActionIds: 0`,
   `duplicateArchiveMismatches: 0`, `recoveredMessageAccessIssues: 0`.

A tabela `movidesk_ticket_action_occurrences` preserva o JSON textual e SHA-256
de cada ocorrência, junto ao índice de repetição. Alterações de data e estado
sem conteúdo distinto ficam arquivadas sem criar notas repetidas. Mensagens
com informações próprias são criadas como **internas**, com identificação estável.
Transcrições adicionais reconhecidas como chat são arquivadas para revisão manual.
Nenhum anexo binário é transferido, nenhuma sessão de chat é reaberta e
nenhuma notificação é enviada.

Se a auditoria detectar divergência, não repita o importador original e não faça
atualizações SQL manuais. A recuperação é transacional por ticket e verifica
o SHA-256 antes de considerar uma ocorrência já recuperada.

## Limitações e pós-importação

1. Importar os arquivos de anexos históricos para armazenamento próprio, sem
   depender de links Movidesk expirados.
2. Reconciliar empresas e contatos pelos identificadores históricos, sem
   vinculação por simples coincidência de nome ou e-mail.
3. Auditar e aprovar a visibilidade antes de liberar conteúdo para clientes.
4. Comparar a quantidade de chats reconstruídos com a quantidade de chats
   identificados na prévia.
5. O script não restaura automaticamente links externos de anexos, arquivos
   binários nem modelos de SLA legados.
