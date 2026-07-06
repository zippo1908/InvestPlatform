-- 服务端 AI 解析任务:让解析在后端跑到底并落库,前端关掉/换设备回来也能轮询取回。
-- 幂等:CREATE TABLE IF NOT EXISTS。
-- 运行:docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_ai_jobs.sql

CREATE TABLE IF NOT EXISTS cap_ai_jobs (
  ai_job_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  screen_id VARCHAR(64) NOT NULL,
  job_kind VARCHAR(32) NOT NULL DEFAULT 'analyze',
  instruction TEXT,
  input_preview VARCHAR(500),
  status ENUM('running','done','error') NOT NULL DEFAULT 'running',
  result_text MEDIUMTEXT,
  error_text VARCHAR(500),
  model VARCHAR(120),
  owner_user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  tenant_id BIGINT NOT NULL,
  INDEX idx_ai_jobs_owner (owner_user_id, screen_id, tenant_id, ai_job_id)
);
