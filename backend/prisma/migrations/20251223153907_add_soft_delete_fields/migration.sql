-- AlterTable (with IF NOT EXISTS check)
DO $$ 
BEGIN
    -- Add deletedForUser column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserMessage' AND column_name = 'deletedForUser'
    ) THEN
        ALTER TABLE "UserMessage" ADD COLUMN "deletedForUser" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add deletedForEveryone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserMessage' AND column_name = 'deletedForEveryone'
    ) THEN
        ALTER TABLE "UserMessage" ADD COLUMN "deletedForEveryone" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- CreateIndex (with IF NOT EXISTS check)
CREATE INDEX IF NOT EXISTS "UserMessage_deletedForUser_idx" ON "UserMessage"("deletedForUser");

CREATE INDEX IF NOT EXISTS "UserMessage_deletedForEveryone_idx" ON "UserMessage"("deletedForEveryone");

