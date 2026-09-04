-- Remove a estrutura experimental criada pela antiga branch agent/f10-agenda.
-- Mantém intacta a agenda atual baseada em scheduling_invitations (migration 0034).

DROP INDEX IF EXISTS scheduling_invitations_event_unique;

ALTER TABLE scheduling_invitations
  DROP COLUMN IF EXISTS event_id;

DROP TABLE IF EXISTS scheduling_event_google_calendar_links;
DROP TABLE IF EXISTS scheduling_event_participants;
DROP TABLE IF EXISTS scheduling_events;

DROP TYPE IF EXISTS scheduling_event_participant_kind;
DROP TYPE IF EXISTS scheduling_event_status;

ALTER TABLE google_calendar_preferences
  ALTER COLUMN sync_scheduling_to_google SET DEFAULT true;

DELETE FROM schema_migrations
WHERE name = '0062_f10_scheduling_events.sql';
