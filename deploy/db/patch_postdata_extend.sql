-- issue #24/#26(用户反馈 #19/#21):投后数据收集扩展 ——
-- ① 关键财务指标补全八项口径:+营业成本、三费、经营性现金流净额、总负债
-- ② 运营信息(保存历史、可检索)
-- ③ 三会情况(股东会/董事会/监事会,最新+历史,决议文件关联文档)
-- ④ 投后文档存档(财务报表/经营情况分析/三会决议议案等)
ALTER TABLE cap_postdata_reports
  ADD COLUMN operating_cost DECIMAL(18,2) NULL AFTER revenue,
  ADD COLUMN expense_three DECIMAL(18,2) NULL AFTER operating_cost,
  ADD COLUMN operating_cash_flow DECIMAL(18,2) NULL AFTER net_profit,
  ADD COLUMN total_liabilities DECIMAL(18,2) NULL AFTER total_assets;

CREATE TABLE IF NOT EXISTS cap_postdata_operations (
  op_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  period_label VARCHAR(40) NOT NULL,
  content TEXT NOT NULL,
  recorded_on DATE NULL,
  created_by VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (op_id),
  KEY idx_pdop_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cap_postdata_documents (
  document_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  doc_kind VARCHAR(40) NOT NULL DEFAULT '其他',
  filename VARCHAR(300) NOT NULL,
  stored_name VARCHAR(300) NOT NULL,
  content_type VARCHAR(120) NULL,
  size_bytes INT NULL,
  uploaded_by VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  KEY idx_pddoc_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cap_postdata_meetings (
  meeting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  meeting_kind VARCHAR(20) NOT NULL,
  held_on DATE NULL,
  topic VARCHAR(300) NULL,
  document_id BIGINT UNSIGNED NULL,
  created_by VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id),
  KEY idx_pdmeet_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
