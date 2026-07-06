-- 应用级配置表(如 AI/LLM 接入),供管理端 UI 配置,覆盖 .env。
CREATE TABLE IF NOT EXISTS cap_app_settings (
  setting_key   VARCHAR(80)  NOT NULL,
  setting_value TEXT         NULL,
  updated_by    BIGINT UNSIGNED NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
