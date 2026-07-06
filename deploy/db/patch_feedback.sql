-- 页面留言标注:非开发用户在任意页面标注「哪个组件/哪个功能要改」,收集后可一键推到 GitHub Issue。
-- 幂等:CREATE TABLE IF NOT EXISTS。
-- 运行:docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_feedback.sql

CREATE TABLE IF NOT EXISTS cap_feedback_annotations (
  feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  screen_id VARCHAR(80),
  screen_title VARCHAR(160),
  page_url VARCHAR(300),
  component_label VARCHAR(300),                 -- 拾取到的组件描述(data-testid / 文案 / 标签)
  category VARCHAR(40) NOT NULL DEFAULT 'other', -- ui/interaction/data/copy/flow/perf/other
  message TEXT NOT NULL,
  status ENUM('new','pushed','resolved','dismissed') NOT NULL DEFAULT 'new',
  github_issue_number INT,
  github_issue_url VARCHAR(300),
  author_user_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  tenant_id BIGINT NOT NULL,
  INDEX idx_fb (tenant_id, status, feedback_id)
);
