-- CreateTable
CREATE TABLE "bl_ignored_rates" (
    "id" SERIAL NOT NULL,
    "connection_id" INTEGER NOT NULL,
    "site_id" INTEGER NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bl_ignored_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_rate_change_logs" (
    "id" SERIAL NOT NULL,
    "connection_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "group_name" TEXT NOT NULL,
    "old_rate" DOUBLE PRECISION,
    "new_rate" DOUBLE PRECISION NOT NULL,
    "action" TEXT NOT NULL,
    "source_detail" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_rate_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bl_ignored_rates_connection_id_idx" ON "bl_ignored_rates"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "bl_ignored_rates_connection_id_site_id_group_id_key" ON "bl_ignored_rates"("connection_id", "site_id", "group_id");

-- CreateIndex
CREATE INDEX "group_rate_change_logs_connection_id_group_id_created_at_idx" ON "group_rate_change_logs"("connection_id", "group_id", "created_at");

-- CreateIndex
CREATE INDEX "group_rate_change_logs_connection_id_created_at_idx" ON "group_rate_change_logs"("connection_id", "created_at");

-- AddForeignKey
ALTER TABLE "bl_ignored_rates" ADD CONSTRAINT "bl_ignored_rates_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_rate_change_logs" ADD CONSTRAINT "group_rate_change_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "bl_collected_changes_connection_id_site_id_entity_type_field_cr" RENAME TO "bl_collected_changes_connection_id_site_id_entity_type_fiel_idx";

-- RenameIndex
ALTER INDEX "bl_collected_model_prices_connection_id_site_id_channel_name_pl" RENAME TO "bl_collected_model_prices_connection_id_site_id_channel_nam_idx";

-- RenameIndex
ALTER INDEX "bl_source_bindings_connection_id_target_type_target_id_source_s" RENAME TO "bl_source_bindings_connection_id_target_type_target_id_sour_key";

-- RenameIndex
ALTER INDEX "upstream_monitor_rate_exclusions_connection_id_account_id_activ" RENAME TO "upstream_monitor_rate_exclusions_connection_id_account_id_a_idx";

-- RenameIndex
ALTER INDEX "upstream_monitor_rate_exclusions_connection_id_account_id_group" RENAME TO "upstream_monitor_rate_exclusions_connection_id_account_id_g_key";

-- RenameIndex
ALTER INDEX "upstream_monitor_rate_exclusions_connection_id_active_group_id_" RENAME TO "upstream_monitor_rate_exclusions_connection_id_active_group_idx";

-- RenameIndex
ALTER INDEX "upstream_monitor_rate_exclusions_connection_id_source_site_id_s" RENAME TO "upstream_monitor_rate_exclusions_connection_id_source_site__idx";

-- RenameIndex
ALTER INDEX "upstream_monitor_results_connection_id_account_id_created_at_id" RENAME TO "upstream_monitor_results_connection_id_account_id_created_a_idx";
