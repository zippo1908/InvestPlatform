-- 项目卡片补全:评论/协作 + 财务数据 + 委派代表 + 投资决策 四张表 + demo 种子。
-- 幂等:CREATE TABLE IF NOT EXISTS;种子按 project_id 先删后插(只动 1、3 两个 demo 项目)。
-- 运行(务必 utf8mb4,否则中文乱码):
--   docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_project_card.sql

-- 1) 评论 / 小组问答(项目卡片右侧协作面板)
CREATE TABLE IF NOT EXISTS cap_project_comments (
  project_comment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  comment_kind ENUM('comment','qa') NOT NULL DEFAULT 'comment',
  body_text TEXT NOT NULL,
  author_user_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  tenant_id BIGINT NOT NULL,
  INDEX idx_pc_project (project_id, tenant_id)
);

-- 2) 财务数据(被投企业分期财务)
CREATE TABLE IF NOT EXISTS cap_project_financials (
  project_financial_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  period_label VARCHAR(40) NOT NULL,
  revenue DECIMAL(18,2),
  gross_margin DECIMAL(6,4),
  net_profit DECIMAL(18,2),
  operating_cash_flow DECIMAL(18,2),
  headcount INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id BIGINT NOT NULL,
  INDEX idx_pf_project (project_id, tenant_id)
);

-- 3) 委派代表(我方派驻被投企业的董事/观察员席位)
CREATE TABLE IF NOT EXISTS cap_project_representatives (
  project_representative_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  rep_name VARCHAR(80) NOT NULL,
  seat_type ENUM('director','observer','other') NOT NULL DEFAULT 'director',
  appointed_on DATE,
  rep_status ENUM('active','resigned') NOT NULL DEFAULT 'active',
  note VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id BIGINT NOT NULL,
  INDEX idx_pr_project (project_id, tenant_id)
);

-- 4) 投资决策(投委会/立项决议记录)
CREATE TABLE IF NOT EXISTS cap_project_decisions (
  project_decision_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  decision_title VARCHAR(160) NOT NULL,
  decision_type ENUM('ic','pre_ic','follow_on','exit','other') NOT NULL DEFAULT 'ic',
  decision_result ENUM('approved','rejected','deferred') NOT NULL DEFAULT 'approved',
  decided_on DATE,
  resolution_note VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id BIGINT NOT NULL,
  INDEX idx_pd_project (project_id, tenant_id)
);

-- ── demo 种子(项目 3 = Lanzhou Robotics;租户 1)──
DELETE FROM cap_project_financials  WHERE project_id=3;
DELETE FROM cap_project_representatives WHERE project_id=3;
DELETE FROM cap_project_decisions   WHERE project_id=3;

INSERT INTO cap_project_financials (project_id, period_label, revenue, gross_margin, net_profit, operating_cash_flow, headcount, tenant_id) VALUES
  (3, '2023',   48000000, 0.5800, -12000000,  -8000000, 120, 1),
  (3, '2024',   96000000, 0.6100,  -4000000,  -2000000, 180, 1),
  (3, '2025H1', 72000000, 0.6300,   6000000,   3000000, 210, 1);

INSERT INTO cap_project_representatives (project_id, rep_name, seat_type, appointed_on, rep_status, note, tenant_id) VALUES
  (3, 'Nina Lin', 'director', '2026-06-30', 'active', '投资经理,持董事席位', 1),
  (3, 'Omar Zhao', 'observer', '2026-06-30', 'active', '基金运营,观察员', 1);

INSERT INTO cap_project_decisions (project_id, decision_title, decision_type, decision_result, decided_on, resolution_note, tenant_id) VALUES
  (3, '立项决议', 'pre_ic', 'approved', '2026-06-10', '同意立项并进入尽调,授权投资经理推进。', 1),
  (3, '投委会决议', 'ic', 'approved', '2026-06-28', '同意以 A+ 轮领投,金额上限 7200 万,持股约 7.8%。', 1);
