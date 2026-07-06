-- 页面留言标注:非开发用户在任意页面标注「哪个组件/哪个功能要改」,收集后可一键推到 GitHub Issue。
-- 幂等:CREATE TABLE IF NOT EXISTS。
-- 运行:docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_feedback.sql

CREATE TABLE IF NOT EXISTS cap_feedback_annotations (
  feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  screen_id VARCHAR(80),
  screen_title VARCHAR(160),
  page_url VARCHAR(300),
  component_label VARCHAR(300),                 -- 拾取到的组件描述(data-testid / 文案 / 标签)
  screenshot_path VARCHAR(300),                 -- 一键截图文件相对路径(存 deploy/backend/feedback_shots/)
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

-- 门槛:新增 feedback.annotate 能力位,只授给「开发者账号」角色(system_admin / managing_partner)。
-- 想要专门的开发者角色,可新建角色只授这一个 perm。幂等:NOT EXISTS 守卫。
INSERT INTO cap_permissions (permission_code, permission_name, permission_kind, entity_type, action_code)
SELECT 'feedback.annotate', '页面反馈标注', 'operation', 'feedback', 'annotate'
WHERE NOT EXISTS (SELECT 1 FROM cap_permissions WHERE permission_code='feedback.annotate');

INSERT INTO cap_role_permissions (role_id, permission_id, effect)
SELECT r.role_id, p.permission_id, 'allow'
FROM cap_roles r JOIN cap_permissions p ON p.permission_code='feedback.annotate'
WHERE r.role_code IN ('system_admin', 'managing_partner')
  AND NOT EXISTS (SELECT 1 FROM cap_role_permissions rp WHERE rp.role_id=r.role_id AND rp.permission_id=p.permission_id);
