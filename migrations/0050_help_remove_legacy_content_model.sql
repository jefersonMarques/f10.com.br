DELETE FROM help_step_blocks
WHERE block_type = 'video';

ALTER TABLE help_contents
  DROP COLUMN legacy_article_id;

ALTER TABLE help_step_blocks
  ALTER COLUMN block_type TYPE text USING block_type::text;

DROP TYPE help_block_type;

CREATE TYPE help_block_type AS ENUM (
  'text',
  'image',
  'notice',
  'link',
  'file'
);

ALTER TABLE help_step_blocks
  ALTER COLUMN block_type TYPE help_block_type USING block_type::help_block_type;
