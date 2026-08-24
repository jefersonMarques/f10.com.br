UPDATE help_contents
SET
  status = 'draft',
  published_at = NULL,
  updated_at = now()
WHERE status = 'published';

DELETE FROM help_publications
WHERE entity_type = 'content';

TRUNCATE TABLE help_search_documents;
