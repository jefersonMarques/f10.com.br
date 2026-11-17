# Recover Movidesk ticket attachments

The historical ticket importer stores attachment names in message metadata but does not download the binaries. This script restores files to the existing F10 MinIO storage and associates them with existing ticket messages. It does not import tickets, reassign customers, alter statuses, or change message visibility.

## Requirements

- Existing snapshot: /var/lib/f10/movidesk-final-snapshot/tickets.jsonl
- Project: /opt/f10.com.br
- Existing PostgreSQL migration 0103 and attachment table from migration 0025
- Environment variables: DATABASE_URL, ASSET_STORAGE=s3, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, and MOVIDESK_KB_API_TOKEN or MOVIDESK_API_TOKEN
- PostgreSQL backup before applying database changes

## Ticket 42746: first run

Run from the project directory after updating the branch:

```bash
cd /opt/f10.com.br

node scripts/recover-movidesk-ticket-attachments.mjs --ticket 42746

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --ticket 42746 --apply
```

The preview reads the snapshot only. It should report 11 attachments belonging to action 1. The apply command downloads using the Movidesk attachment hash, stores the binaries in MinIO, and adds rows to ticket_message_attachments for the original F10 message.

Only run the apply command after checking that the preview matches the desired ticket and a database backup exists. No new migrations are required.

## Verify ticket 42746

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

For action 1, expect 11 attachments after a successful recovery. Open the ticket in the operator interface and check that the PDF files open or download.

## Follow-up batches

Preview the full snapshot without writing:

```bash
node scripts/recover-movidesk-ticket-attachments.mjs --all --limit 100
```

Run a controlled batch:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --all --limit 100 --apply
```

Run the full snapshot once the initial batch has been verified:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --all --apply
```

The script respects the documented Movidesk limit of 10 requests/minute, follows Retry-After for throttling, and retries temporary failures. A rerun skips attachment records already inserted into the database. Partial failures are reported with state=failed and cause an exit status of 2. The script never includes the API token in its logs.

Stored keys use the existing F10 convention under support/tickets/{ticketId}/{messageId}/. A small amount of duplicated MinIO storage may occur when a historical source attachment is referenced by different messages; this avoids schema changes and maintains the existing attachment viewer.

There is a 100 MB per-file memory limit to prevent unbounded downloads. Larger files are reported as failures for subsequent manual handling. The script retains the existing F10 authorization checks when files are served to operators or customers.
