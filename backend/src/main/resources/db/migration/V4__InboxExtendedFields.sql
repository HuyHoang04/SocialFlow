-- Add message_type to distinguish post comments from Messenger DMs
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'COMMENT';

-- Backfill existing rows
UPDATE inbox_messages SET message_type = 'COMMENT' WHERE message_type IS NULL;

-- Messenger conversation ID (groups all messages in a DM thread)
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255);

-- Platform user ID of the message author (used as recipient PSID for DM replies)
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS author_id VARCHAR(255);
