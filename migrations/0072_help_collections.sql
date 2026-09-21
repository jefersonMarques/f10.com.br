CREATE TABLE IF NOT EXISTS "help_collections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "sort_order" integer DEFAULT 10 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "help_collections_slug_unique"
  ON "help_collections" ("slug");

CREATE INDEX IF NOT EXISTS "help_collections_active_order_idx"
  ON "help_collections" ("active", "sort_order");

CREATE TABLE IF NOT EXISTS "help_collection_items" (
  "collection_id" uuid NOT NULL REFERENCES "help_collections"("id") ON DELETE CASCADE,
  "content_id" uuid NOT NULL REFERENCES "help_contents"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 10 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "help_collection_items_pk" PRIMARY KEY ("collection_id", "content_id")
);

CREATE INDEX IF NOT EXISTS "help_collection_items_collection_order_idx"
  ON "help_collection_items" ("collection_id", "sort_order");

CREATE INDEX IF NOT EXISTS "help_collection_items_content_idx"
  ON "help_collection_items" ("content_id");
