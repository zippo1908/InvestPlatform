-- AI 尽调助手(DD = Due Diligence)——
-- 核心理念:用户不懂尽调,AI 是懂行的一方。AI 判材料类别、增量沉淀模块化尽调文档、
-- 主动指出缺口和红旗;AI 只产草稿,用户确认才落定。
-- ① dd_documents:已归档的尽调材料(用户在 analyze 预览后 commit 确认才入库)
-- ② dd_sections:六模块尽调文档(business/finance/legal/team/risk/other),
--    每项目每模块一行(UNIQUE),AI 增量融合生成,draft → 用户确认 confirmed。
-- 文件落 UPLOAD_DIR/dd_docs/(仿 postdata_docs);analyze 暂存于 UPLOAD_DIR/dd_tmp/。

CREATE TABLE IF NOT EXISTS dd_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,               -- FK 语义 cap_projects.project_id
  filename VARCHAR(300) NOT NULL,                    -- 原始文件名
  stored_name VARCHAR(300) NOT NULL,                 -- 落盘名(dd_docs/ 下)
  content_type VARCHAR(120) NULL,
  size_bytes INT NULL,
  module VARCHAR(16) NOT NULL DEFAULT 'other',       -- business|finance|legal|team|risk|other
  doc_label VARCHAR(64) NULL,                        -- AI 判的材料类型,如「审计报告」
  summary TEXT NULL,                                 -- AI 摘要(用户 commit 时可改)
  status VARCHAR(16) NOT NULL DEFAULT 'pending',     -- pending|confirmed
  uploaded_by VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dd_doc_project (project_id),
  KEY idx_dd_doc_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dd_sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,               -- FK 语义 cap_projects.project_id
  module VARCHAR(16) NOT NULL,                       -- business|finance|legal|team|risk|other
  content_md MEDIUMTEXT NULL,                        -- 模块尽调文档(md,关键事实句尾标【文件名】溯源)
  gaps_md TEXT NULL,                                 -- 缺口清单(md,每条附大白话为什么需要)
  flags_md TEXT NULL,                                -- 红旗/待人工核实项(md)
  status VARCHAR(16) NOT NULL DEFAULT 'draft',       -- draft|confirmed(新材料融入后自动回 draft)
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  confirmed_by VARCHAR(200) NULL,
  confirmed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dd_section (project_id, module),
  KEY idx_dd_sec_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
