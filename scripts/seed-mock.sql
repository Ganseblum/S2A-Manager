-- ================================================================
-- Mock 数据种子脚本 v3 - 修复 PL/pgSQL RETURNING 多行问题
-- ================================================================

DELETE FROM group_rate_change_logs;
DELETE FROM bl_ignored_rates;
DELETE FROM bl_collected_group_rates;
DELETE FROM bl_collected_model_prices;
DELETE FROM bl_collected_changes;
DELETE FROM bl_collection_runs;
DELETE FROM bl_source_bindings;
DELETE FROM bl_collection_sites;

-- 1. 采集源
INSERT INTO bl_collection_sites (connection_id, name, base_url, site_type, email, password_enc, auth_mode, enabled, interval_min, created_at, updated_at)
VALUES
  (1, 'A站点-主站', 'https://a.example.com', 'sub2api', 'a@test.com', 'enc_pass_1', 'password', true, 60, now(), now()),
  (1, 'B站点-备站', 'https://b.example.com', 'sub2api', 'b@test.com', 'enc_pass_2', 'password', true, 60, now(), now()),
  (1, 'C站点-测试', 'https://c.example.com', 'sub2api', 'c@test.com', 'enc_pass_3', 'password', true, 120, now(), now());

-- 2. 采集运行记录（逐条插入，方便取 RETURNING id）
DO $$
DECLARE
  a_id INT; b_id INT; c_id INT;
  r1 INT; r2 INT; r3 INT;
BEGIN
  SELECT id INTO a_id FROM bl_collection_sites WHERE name = 'A站点-主站';
  SELECT id INTO b_id FROM bl_collection_sites WHERE name = 'B站点-备站';
  SELECT id INTO c_id FROM bl_collection_sites WHERE name = 'C站点-测试';

  INSERT INTO bl_collection_runs (connection_id, site_id, status, group_count, model_count, change_count, started_at, finished_at)
  VALUES (1, a_id, 'success', 5, 12, 2, now() - interval '1 hour', now() - interval '58 minutes')
  RETURNING id INTO r1;

  INSERT INTO bl_collection_runs (connection_id, site_id, status, group_count, model_count, change_count, started_at, finished_at)
  VALUES (1, b_id, 'success', 4, 10, 1, now() - interval '55 minutes', now() - interval '53 minutes')
  RETURNING id INTO r2;

  INSERT INTO bl_collection_runs (connection_id, site_id, status, group_count, model_count, change_count, started_at, finished_at)
  VALUES (1, c_id, 'success', 3, 8,  0, now() - interval '50 minutes', now() - interval '48 minutes')
  RETURNING id INTO r3;

  -- 3. 分组绑定
  INSERT INTO bl_source_bindings (connection_id, target_type, target_id, source_site_id, source_site_name, source_group_id, source_group_name, created_at, updated_at)
  VALUES
    (1, 'group', 10, a_id, 'A站点-主站', 'group_a', 'GPT-4o', now(), now()),
    (1, 'group', 20, a_id, 'A站点-主站', 'group_b', 'Claude-3.5', now(), now()),
    (1, 'group', 10, b_id, 'B站点-备站', 'group_a', 'GPT-4o', now(), now()),
    (1, 'group', 30, b_id, 'B站点-备站', 'group_c', 'Gemini-Pro', now(), now()),
    (1, 'group', 40, c_id, 'C站点-测试', 'group_d', 'DeepSeek-V3', now(), now()),
    (1, 'group', 50, c_id, 'C站点-测试', 'group_e', 'Qwen-Plus', now(), now());

  -- 4. 采集倍率
  INSERT INTO bl_collected_group_rates (connection_id, site_id, run_id, group_id, name, platform, rate_multiplier, effective_rate, collected_at)
  VALUES
    (1, a_id, r1, 'group_a', 'GPT-4o', 'openai', 1.2, 1.2, now()),
    (1, a_id, r1, 'group_b', 'Claude-3.5', 'anthropic', 0.9, 0.9, now()),
    (1, a_id, r1, 'group_x', 'GPT-3.5-Turbo', 'openai', 0.6, 0.6, now()),
    (1, a_id, r1, 'group_y', 'Claude-Haiku', 'anthropic', 0.45, 0.45, now()),
    (1, a_id, r1, 'group_z', 'Llama-3-70B', 'meta', 0.8, 0.8, now()),
    (1, b_id, r2, 'group_a', 'GPT-4o', 'openai', 1.15, 1.15, now()),
    (1, b_id, r2, 'group_c', 'Gemini-Pro', 'google', 1.0, 1.0, now()),
    (1, b_id, r2, 'group_m', 'Mixtral-8x7B', 'mistral', 0.7, 0.7, now()),
    (1, b_id, r2, 'group_n', 'Command-R+', 'cohere', 0.75, 0.75, now()),
    (1, c_id, r3, 'group_d', 'DeepSeek-V3', 'deepseek', 0.55, 0.55, now()),
    (1, c_id, r3, 'group_e', 'Qwen-Plus', 'alibaba', 0.65, 0.65, now()),
    (1, c_id, r3, 'group_p', 'Ernie-4.0', 'baidu', 0.9, 0.9, now());
END $$;

-- 5. 忽略倍率
INSERT INTO bl_ignored_rates (connection_id, site_id, group_id, created_at)
SELECT 1, id, 'group_x', now() FROM bl_collection_sites WHERE name = 'A站点-主站';
INSERT INTO bl_ignored_rates (connection_id, site_id, group_id, created_at)
SELECT 1, id, 'group_y', now() FROM bl_collection_sites WHERE name = 'A站点-主站';
INSERT INTO bl_ignored_rates (connection_id, site_id, group_id, created_at)
SELECT 1, id, 'group_m', now() FROM bl_collection_sites WHERE name = 'B站点-备站';
INSERT INTO bl_ignored_rates (connection_id, site_id, group_id, created_at)
SELECT 1, id, 'group_n', now() FROM bl_collection_sites WHERE name = 'B站点-备站';
INSERT INTO bl_ignored_rates (connection_id, site_id, group_id, created_at)
SELECT 1, id, 'group_p', now() FROM bl_collection_sites WHERE name = 'C站点-测试';

-- 6. 操作日志
INSERT INTO group_rate_change_logs (connection_id, group_id, group_name, old_rate, new_rate, action, source_detail, created_at)
VALUES
  (1, 10, 'GPT-4o', 1.0, 1.2, 'manual_update', '手动编辑分组', now() - interval '3 hours'),
  (1, 10, 'GPT-4o', 1.2, 1.25, 'apply_rule', '采集源 A站点-主站 / GPT-4o (#group_a)', now() - interval '2 hours'),
  (1, 20, 'Claude-3.5', 1.0, 0.9, 'manual_rate_update', '手动更新倍率', now() - interval '2.5 hours'),
  (1, 20, 'Claude-3.5', 0.9, 0.92, 'apply_rule', '采集源 A站点-主站 / Claude-3.5 (#group_b)', now() - interval '1.5 hours'),
  (1, 30, 'Gemini-Pro', 1.0, 1.0, 'manual_sync', '采集源 B站点-备站 / Gemini-Pro (#group_c)', now() - interval '4 hours'),
  (1, 40, 'DeepSeek-V3', 0.5, 0.55, 'apply_rule', '采集源 C站点-测试 / DeepSeek-V3 (#group_d)', now() - interval '1 hour'),
  (1, 50, 'Qwen-Plus', 0.6, 0.65, 'manual_update', '手动编辑分组', now() - interval '5 hours'),
  (1, 10, 'GPT-4o', 1.25, 1.18, 'apply_rule', '采集源 B站点-备站 / GPT-4o (#group_a)', now() - interval '30 minutes'),
  (1, 30, 'Gemini-Pro', 1.0, 1.05, 'apply_rule', '采集源 B站点-备站 / Gemini-Pro (#group_c)', now() - interval '20 minutes'),
  (1, 40, 'DeepSeek-V3', 0.55, 0.58, 'auto_sync', '采集源 C站点-测试 / DeepSeek-V3 (#group_d)', now() - interval '10 minutes');
