ALTER TABLE "announcement_rules"
  ADD COLUMN IF NOT EXISTS "target_group_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
