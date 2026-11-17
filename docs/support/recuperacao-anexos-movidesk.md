# Recuperação de anexos históricos do Movidesk

A importação original registrou as referências dos anexos, mas não transferiu os arquivos binários. O script recupera os arquivos pela API do Movidesk, salva no MinIO atual e associa cada arquivo à mensagem já importada no F10.

Não recria tickets, mensagens ou clientes. Não altera status, responsáveis nem visibilidade. Não precisa de migração de banco ou alteração de frontend.

## Pré-requisitos

- Snapshot: `/var/lib/f10/movidesk-final-snapshot/tickets.jsonl`
- Projeto: `/opt/f10.com.br`
- Tabelas das migrações 0025 e 0103
- Variáveis existentes: `DATABASE_URL`, `ASSET_STORAGE=s3`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` e `MOVIDESK_KB_API_TOKEN` ou `MOVIDESK_API_TOKEN`
- Backup recuperável do PostgreSQL antes da primeira execução com escrita

## Primeiro teste — ticket 42746

Após disponibilizar a alteração no projeto:

```bash
cd /opt/f10.com.br

node scripts/recover-movidesk-ticket-attachments.mjs --ticket 42746

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --ticket 42746 --apply
```

O primeiro comando apenas lê o snapshot e deve identificar **11 PDFs na ação 1**, sem escrita. O segundo baixa pelo hash do Movidesk, envia ao MinIO e registra os vínculos em `ticket_message_attachments`.

A execução com `--apply` deve ocorrer apenas após conferir a prévia e o backup.

## Verificação no banco

```sql
SELECT
  i.source_ticket_id,
  a.source_action_id,
  count(att.id) AS imported_attachments,
  min(m.external_metadata->>'attachmentsImported') AS import_marker
FROM movidesk_ticket_imports i
JOIN movidesk_ticket_action_imports a
  ON a.source_ticket_id = i.source_ticket_id
JOIN ticket_messages m ON m.id = a.message_id
LEFT JOIN ticket_message_attachments att ON att.message_id = m.id
WHERE i.source_ticket_id = '42746'
GROUP BY i.source_ticket_id, a.source_action_id
ORDER BY a.source_action_id;
```

Após sucesso, a ação 1 deve ter 11 anexos. Verifique também na interface do operador se todos podem ser abertos ou baixados.

## Processamento por lotes

Prévia dos primeiros 100 tickets do snapshot:

```bash
node scripts/recover-movidesk-ticket-attachments.mjs --all --limit 100
```

Reprocessamento dos primeiros 100 tickets:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --all --limit 100 --apply
```

Processamento completo após validação:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --all --apply
```

O reprocessador respeita o limite de 10 chamadas por minuto do Movidesk e o cabeçalho `Retry-After`. Falhas temporárias são tentadas novamente. Arquivos já registrados são ignorados na próxima execução, permitindo retomada sem duplicação.

Erros individuais são exibidos com `state=failed`; a execução termina com código 2 se restarem falhas ou ações ausentes. O token não aparece nos logs.

As chaves seguem o padrão atual `support/tickets/{ticketId}/{messageId}/`. Uma mesma origem referenciada em mensagens diferentes pode ocupar mais espaço no MinIO, evitando catálogo adicional e migrações.

O limite é de 100 MB por arquivo para evitar consumo ilimitado de memória. Arquivos maiores serão relatados para tratamento posterior. As rotas existentes continuam controlando acesso aos anexos.
