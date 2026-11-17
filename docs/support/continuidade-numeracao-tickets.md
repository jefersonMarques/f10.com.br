# Ticket number continuity and legacy lookup

## Current state

- `tickets.id` is the stable UUID used by internal routes and ticket relationships.
- `tickets.ticket_number` is the current unique sequential number.
- `movidesk_ticket_imports.source_ticket_id` preserves the original Movidesk number.
- The ticket workspace can search for the current number and the Movidesk number, including closed tickets.
- Ticket numbers already sent by email must not become untraceable after renumbering.

## Read-only number audit

```bash
cd /opt/f10.com.br
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-ticket-number-reconciliation.mjs
```

The report includes the maximum Movidesk number, current collisions, native F10 tickets in the legacy range, and an estimated safe start for new numbers. It does not change records or sequences.

## Safeguards for a future renumbering

1. Preserve every ticket UUID and the existing Movidesk import mapping.
2. Record **old F10 number → ticket UUID → new number** before changing any number. A bare old number can collide with a Movidesk number, so keep the source/origin as well.
3. Keep old number aliases accessible in operator search and customer ticket history, subject to access checks. Numeric ambiguity must return clearly identified candidates rather than silently opening the wrong ticket.
4. Preserve existing UUID-based email links and identify integrations, exports, or notifications that store only a numeric ticket identifier.
5. Execute the change in a guarded transaction, with verified backup, uniqueness validation, and sequence adjustment. Confirm final results after the migration.
6. Do not run renumbering SQL until the read-only audit is reviewed.

## Historical action anomalies

The final reconciliation reported 40 failed tickets plus one from an earlier batch. Snapshot inspection found 45 tickets with duplicate action IDs; 20 have conflicting internal/public action types and 25 have the same type but different content. **Do not collapse or automatically overwrite these actions.** Audit the imported message mapping and retain both variants with distinct provenance before any repair. Four duplicate-action tickets completed without errors and still require a content-integrity review.
