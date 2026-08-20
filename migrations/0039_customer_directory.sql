ALTER TABLE customer_contacts
ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE INDEX IF NOT EXISTS customer_contacts_phone_idx
ON customer_contacts (phone)
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_contacts_whatsapp_idx
ON customer_contacts (whatsapp)
WHERE whatsapp IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_contacts_updated_idx
ON customer_contacts (updated_at DESC);
