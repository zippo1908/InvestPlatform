-- CapitalOS full-scope MySQL schema
-- Target: MySQL 8.0+, utf8mb4, InnoDB.
-- This schema uses CapitalOS-owned table and field names and synthetic demo domains.

CREATE DATABASE IF NOT EXISTS capitalos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE capitalos;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS cap_ui_action_events;
DROP TABLE IF EXISTS cap_audit_logs;
DROP TABLE IF EXISTS cap_option_sets;
DROP TABLE IF EXISTS cap_form_layouts;
DROP TABLE IF EXISTS cap_custom_field_definitions;
DROP TABLE IF EXISTS cap_import_export_tasks;
DROP TABLE IF EXISTS cap_report_snapshots;
DROP TABLE IF EXISTS cap_ai_messages;
DROP TABLE IF EXISTS cap_ai_sessions;
DROP TABLE IF EXISTS cap_ai_parse_outputs;
DROP TABLE IF EXISTS cap_ai_parse_jobs;
DROP TABLE IF EXISTS cap_research_links;
DROP TABLE IF EXISTS cap_research_notes;
DROP TABLE IF EXISTS cap_risk_updates;
DROP TABLE IF EXISTS cap_risk_incidents;
DROP TABLE IF EXISTS cap_risk_clauses;
DROP TABLE IF EXISTS cap_recycle_items;
DROP TABLE IF EXISTS cap_document_permissions;
DROP TABLE IF EXISTS cap_document_links;
DROP TABLE IF EXISTS cap_document_versions;
DROP TABLE IF EXISTS cap_documents;
DROP TABLE IF EXISTS cap_workflow_delegations;
DROP TABLE IF EXISTS cap_workflow_tasks;
DROP TABLE IF EXISTS cap_workflow_instances;
DROP TABLE IF EXISTS cap_workflow_steps;
DROP TABLE IF EXISTS cap_workflow_templates;
DROP TABLE IF EXISTS cap_messages;
DROP TABLE IF EXISTS cap_calendar_events;
DROP TABLE IF EXISTS cap_announcement_reads;
DROP TABLE IF EXISTS cap_announcements;
DROP TABLE IF EXISTS cap_meeting_actions;
DROP TABLE IF EXISTS cap_meetings;
DROP TABLE IF EXISTS cap_data_collection_items;
DROP TABLE IF EXISTS cap_data_collection_campaigns;
DROP TABLE IF EXISTS cap_portfolio_reports;
DROP TABLE IF EXISTS cap_fund_navs;
DROP TABLE IF EXISTS cap_fund_financial_reports;
DROP TABLE IF EXISTS cap_project_valuations;
DROP TABLE IF EXISTS cap_cashflows;
DROP TABLE IF EXISTS cap_equity_changes;
DROP TABLE IF EXISTS cap_investment_positions;
DROP TABLE IF EXISTS cap_project_stage_events;
DROP TABLE IF EXISTS cap_project_members;
DROP TABLE IF EXISTS cap_projects;
DROP TABLE IF EXISTS cap_investor_touchpoints;
DROP TABLE IF EXISTS cap_fund_commitments;
DROP TABLE IF EXISTS cap_investor_contacts;
DROP TABLE IF EXISTS cap_investors;
DROP TABLE IF EXISTS cap_fund_key_people;
DROP TABLE IF EXISTS cap_fund_management_orgs;
DROP TABLE IF EXISTS cap_funds;
DROP TABLE IF EXISTS cap_management_orgs;
DROP TABLE IF EXISTS cap_login_events;
DROP TABLE IF EXISTS cap_security_devices;
DROP TABLE IF EXISTS cap_user_preferences;
DROP TABLE IF EXISTS cap_user_roles;
DROP TABLE IF EXISTS cap_role_permissions;
DROP TABLE IF EXISTS cap_permissions;
DROP TABLE IF EXISTS cap_navigation_items;
DROP TABLE IF EXISTS cap_roles;
DROP TABLE IF EXISTS cap_users;
DROP TABLE IF EXISTS cap_organizations;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE cap_organizations (
  org_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_org_id BIGINT UNSIGNED NULL,
  org_code VARCHAR(64) NOT NULL,
  org_name VARCHAR(160) NOT NULL,
  org_type VARCHAR(40) NOT NULL DEFAULT 'department',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (org_id),
  UNIQUE KEY uk_cap_org_code (org_code),
  KEY idx_cap_org_parent (parent_org_id),
  CONSTRAINT fk_cap_org_parent
    FOREIGN KEY (parent_org_id) REFERENCES cap_organizations (org_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NULL,
  employee_no VARCHAR(64) NOT NULL,
  login_name VARCHAR(80) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  mobile_mask VARCHAR(40) NULL,
  password_hash VARCHAR(255) NULL,
  account_status ENUM('active','locked','disabled','pending') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  timezone_name VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  profile_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_cap_user_login (login_name),
  UNIQUE KEY uk_cap_user_email (email),
  UNIQUE KEY uk_cap_user_employee (employee_no),
  KEY idx_cap_user_org (org_id),
  CONSTRAINT fk_cap_user_org
    FOREIGN KEY (org_id) REFERENCES cap_organizations (org_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_roles (
  role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_code VARCHAR(80) NOT NULL,
  role_name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  data_scope ENUM('all','department','department_tree','owned','participated','custom') NOT NULL DEFAULT 'owned',
  is_system_role TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id),
  UNIQUE KEY uk_cap_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_navigation_items (
  nav_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_nav_item_id BIGINT UNSIGNED NULL,
  screen_code VARCHAR(80) NOT NULL,
  group_name VARCHAR(80) NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  route_key VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (nav_item_id),
  UNIQUE KEY uk_cap_nav_screen (screen_code),
  KEY idx_cap_nav_parent (parent_nav_item_id),
  CONSTRAINT fk_cap_nav_parent
    FOREIGN KEY (parent_nav_item_id) REFERENCES cap_navigation_items (nav_item_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_permissions (
  permission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nav_item_id BIGINT UNSIGNED NULL,
  permission_code VARCHAR(120) NOT NULL,
  permission_name VARCHAR(160) NOT NULL,
  permission_kind ENUM('menu','operation','data','field','document') NOT NULL,
  entity_type VARCHAR(80) NULL,
  action_code VARCHAR(60) NULL,
  field_key VARCHAR(120) NULL,
  document_action VARCHAR(60) NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (permission_id),
  UNIQUE KEY uk_cap_permission_code (permission_code),
  KEY idx_cap_perm_nav (nav_item_id),
  KEY idx_cap_perm_kind_entity (permission_kind, entity_type),
  CONSTRAINT fk_cap_perm_nav
    FOREIGN KEY (nav_item_id) REFERENCES cap_navigation_items (nav_item_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  effect ENUM('allow','deny') NOT NULL DEFAULT 'allow',
  condition_json JSON NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_cap_role_perm_permission (permission_id),
  CONSTRAINT fk_cap_role_perm_role
    FOREIGN KEY (role_id) REFERENCES cap_roles (role_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_role_perm_permission
    FOREIGN KEY (permission_id) REFERENCES cap_permissions (permission_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_cap_user_role_role (role_id),
  KEY idx_cap_user_role_assigned_by (assigned_by),
  CONSTRAINT fk_cap_user_role_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_user_role_role
    FOREIGN KEY (role_id) REFERENCES cap_roles (role_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_user_role_assigner
    FOREIGN KEY (assigned_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_user_preferences (
  preference_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  notification_json JSON NULL,
  favorite_nav_json JSON NULL,
  table_view_json JSON NULL,
  locale_code VARCHAR(20) NOT NULL DEFAULT 'zh-CN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (preference_id),
  UNIQUE KEY uk_cap_user_preference_user (user_id),
  CONSTRAINT fk_cap_user_preference_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_security_devices (
  device_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  device_label VARCHAR(120) NOT NULL,
  device_kind VARCHAR(60) NOT NULL,
  device_fingerprint_hash VARCHAR(255) NULL,
  last_seen_at DATETIME NULL,
  trust_status ENUM('trusted','review','revoked') NOT NULL DEFAULT 'review',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id),
  KEY idx_cap_device_user (user_id),
  CONSTRAINT fk_cap_device_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_login_events (
  login_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  login_name VARCHAR(80) NOT NULL,
  auth_method ENUM('password','otp','sso','recovery') NOT NULL DEFAULT 'password',
  outcome ENUM('success','failed','blocked') NOT NULL,
  ip_mask VARCHAR(80) NULL,
  device_label VARCHAR(120) NULL,
  risk_level ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  occurred_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (login_event_id),
  KEY idx_cap_login_user_time (user_id, occurred_at),
  KEY idx_cap_login_outcome (outcome),
  CONSTRAINT fk_cap_login_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_management_orgs (
  management_org_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_code VARCHAR(64) NOT NULL,
  org_name VARCHAR(180) NOT NULL,
  org_kind ENUM('general_partner','fund_manager','executive_partner','advisor','custodian','auditor','other') NOT NULL,
  registry_no_mask VARCHAR(80) NULL,
  city VARCHAR(80) NULL,
  contact_name VARCHAR(120) NULL,
  contact_email VARCHAR(160) NULL,
  status ENUM('active','inactive','under_review') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (management_org_id),
  UNIQUE KEY uk_cap_mgmt_org_code (org_code),
  KEY idx_cap_mgmt_org_kind (org_kind),
  KEY idx_cap_mgmt_org_created_by (created_by),
  CONSTRAINT fk_cap_mgmt_org_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_funds (
  fund_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  manager_org_id BIGINT UNSIGNED NULL,
  fund_code VARCHAR(64) NOT NULL,
  fund_name VARCHAR(180) NOT NULL,
  legal_name VARCHAR(220) NULL,
  fund_status ENUM('planning','raising','investing','harvesting','extended','closed') NOT NULL DEFAULT 'planning',
  raise_method ENUM('private','public','single_lp','parallel','other') NOT NULL DEFAULT 'private',
  base_currency CHAR(3) NOT NULL DEFAULT 'CNY',
  target_size DECIMAL(20,4) NOT NULL DEFAULT 0,
  committed_size DECIMAL(20,4) NOT NULL DEFAULT 0,
  paid_in_size DECIMAL(20,4) NOT NULL DEFAULT 0,
  net_asset_value DECIMAL(20,4) NOT NULL DEFAULT 0,
  unit_nav DECIMAL(20,6) NULL,
  term_months INT NULL,
  investment_strategy TEXT NULL,
  fee_terms_json JSON NULL,
  distribution_terms_json JSON NULL,
  governance_json JSON NULL,
  disclosure_json JSON NULL,
  established_on DATE NULL,
  final_close_on DATE NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (fund_id),
  UNIQUE KEY uk_cap_fund_code (fund_code),
  KEY idx_cap_fund_manager (manager_org_id),
  KEY idx_cap_fund_status (fund_status),
  KEY idx_cap_fund_created_by (created_by),
  CONSTRAINT fk_cap_fund_manager
    FOREIGN KEY (manager_org_id) REFERENCES cap_management_orgs (management_org_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_fund_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_fund_management_orgs (
  fund_id BIGINT UNSIGNED NOT NULL,
  management_org_id BIGINT UNSIGNED NOT NULL,
  relationship_kind ENUM('gp','manager','executive_partner','advisor','custodian','auditor','other') NOT NULL,
  started_on DATE NULL,
  ended_on DATE NULL,
  notes VARCHAR(500) NULL,
  PRIMARY KEY (fund_id, management_org_id, relationship_kind),
  KEY idx_cap_fund_org_org (management_org_id),
  CONSTRAINT fk_cap_fund_org_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_fund_org_org
    FOREIGN KEY (management_org_id) REFERENCES cap_management_orgs (management_org_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_fund_key_people (
  fund_key_person_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  person_name VARCHAR(120) NOT NULL,
  person_role ENUM('investment_committee','key_person','observer','advisor','auditor_contact','other') NOT NULL,
  vote_weight DECIMAL(8,4) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  started_on DATE NULL,
  ended_on DATE NULL,
  PRIMARY KEY (fund_key_person_id),
  KEY idx_cap_fund_person_fund (fund_id),
  KEY idx_cap_fund_person_user (user_id),
  CONSTRAINT fk_cap_fund_person_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_fund_person_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_investors (
  investor_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  investor_code VARCHAR(64) NOT NULL,
  investor_name VARCHAR(180) NOT NULL,
  investor_kind ENUM('institution','individual','fof','government_guidance','corporate','family_office','other') NOT NULL,
  qualification_status ENUM('qualified','pending','expired','blocked') NOT NULL DEFAULT 'pending',
  risk_rating ENUM('conservative','balanced','growth','professional') NOT NULL DEFAULT 'professional',
  city VARCHAR(80) NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'CN',
  disclosure_status ENUM('not_started','scheduled','sent','viewed','confirmed') NOT NULL DEFAULT 'not_started',
  owner_user_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (investor_id),
  UNIQUE KEY uk_cap_investor_code (investor_code),
  KEY idx_cap_investor_kind (investor_kind),
  KEY idx_cap_investor_owner (owner_user_id),
  KEY idx_cap_investor_creator (created_by),
  CONSTRAINT fk_cap_investor_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_investor_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_investor_contacts (
  contact_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  investor_id BIGINT UNSIGNED NOT NULL,
  contact_name VARCHAR(120) NOT NULL,
  title VARCHAR(120) NULL,
  email VARCHAR(160) NULL,
  mobile_mask VARCHAR(40) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (contact_id),
  KEY idx_cap_contact_investor (investor_id),
  CONSTRAINT fk_cap_contact_investor
    FOREIGN KEY (investor_id) REFERENCES cap_investors (investor_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_fund_commitments (
  commitment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NOT NULL,
  investor_id BIGINT UNSIGNED NOT NULL,
  commitment_code VARCHAR(80) NOT NULL,
  committed_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
  paid_in_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
  ownership_units DECIMAL(20,6) NULL,
  admission_date DATE NULL,
  status ENUM('draft','signed','active','defaulted','transferred','redeemed') NOT NULL DEFAULT 'draft',
  disclosure_status ENUM('not_due','scheduled','sent','viewed','confirmed') NOT NULL DEFAULT 'not_due',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (commitment_id),
  UNIQUE KEY uk_cap_commitment_code (commitment_code),
  UNIQUE KEY uk_cap_commitment_pair (fund_id, investor_id),
  KEY idx_cap_commitment_investor (investor_id),
  KEY idx_cap_commitment_creator (created_by),
  CONSTRAINT fk_cap_commitment_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_commitment_investor
    FOREIGN KEY (investor_id) REFERENCES cap_investors (investor_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_commitment_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_investor_touchpoints (
  touchpoint_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  investor_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  touchpoint_kind ENUM('call','meeting','email','disclosure','visit','other') NOT NULL,
  occurred_at DATETIME NOT NULL,
  subject VARCHAR(220) NOT NULL,
  summary TEXT NULL,
  next_step VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (touchpoint_id),
  KEY idx_cap_touchpoint_investor_time (investor_id, occurred_at),
  KEY idx_cap_touchpoint_contact (contact_id),
  KEY idx_cap_touchpoint_owner (owner_user_id),
  CONSTRAINT fk_cap_touchpoint_investor
    FOREIGN KEY (investor_id) REFERENCES cap_investors (investor_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_touchpoint_contact
    FOREIGN KEY (contact_id) REFERENCES cap_investor_contacts (contact_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_touchpoint_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_projects (
  project_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_code VARCHAR(64) NOT NULL,
  short_name VARCHAR(120) NOT NULL,
  legal_name VARCHAR(220) NULL,
  registry_code_mask VARCHAR(80) NULL,
  opportunity_status ENUM('sourced','screening','approved','term_sheet','diligence','committee','agreement','funded','portfolio','exit','archived') NOT NULL DEFAULT 'sourced',
  stage_label VARCHAR(80) NOT NULL DEFAULT 'sourced',
  industry_group VARCHAR(120) NULL,
  city VARCHAR(80) NULL,
  registered_location VARCHAR(160) NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  source_channel VARCHAR(120) NULL,
  summary TEXT NULL,
  thesis TEXT NULL,
  product_note TEXT NULL,
  highlight_note TEXT NULL,
  extra_json JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (project_id),
  UNIQUE KEY uk_cap_project_code (project_code),
  KEY idx_cap_project_status (opportunity_status),
  KEY idx_cap_project_owner (owner_user_id),
  KEY idx_cap_project_industry (industry_group),
  KEY idx_cap_project_creator (created_by),
  CONSTRAINT fk_cap_project_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_project_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_project_members (
  project_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  member_role ENUM('owner','participant','portfolio_owner','legal','finance','observer') NOT NULL DEFAULT 'participant',
  joined_on DATE NOT NULL,
  left_on DATE NULL,
  PRIMARY KEY (project_id, user_id, member_role),
  KEY idx_cap_project_member_user (user_id),
  CONSTRAINT fk_cap_project_member_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_project_member_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_project_stage_events (
  stage_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  from_stage VARCHAR(80) NULL,
  to_stage VARCHAR(80) NOT NULL,
  event_reason VARCHAR(220) NULL,
  event_at DATETIME NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stage_event_id),
  KEY idx_cap_stage_project_time (project_id, event_at),
  KEY idx_cap_stage_actor (actor_user_id),
  CONSTRAINT fk_cap_stage_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_stage_actor
    FOREIGN KEY (actor_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_investment_positions (
  investment_position_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  position_code VARCHAR(80) NOT NULL,
  round_label VARCHAR(80) NOT NULL,
  agreement_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
  first_payment_on DATE NULL,
  cumulative_paid_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
  current_ownership_ratio DECIMAL(9,6) NULL,
  latest_valuation DECIMAL(20,4) NULL,
  realized_return_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
  exit_status ENUM('none','partial','completed','written_off') NOT NULL DEFAULT 'none',
  investment_status ENUM('planned','approved','signed','funded','monitoring','exited') NOT NULL DEFAULT 'planned',
  owner_user_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (investment_position_id),
  UNIQUE KEY uk_cap_position_code (position_code),
  UNIQUE KEY uk_cap_position_pair_round (fund_id, project_id, round_label),
  KEY idx_cap_position_project (project_id),
  KEY idx_cap_position_status (investment_status),
  KEY idx_cap_position_owner (owner_user_id),
  KEY idx_cap_position_creator (created_by),
  CONSTRAINT fk_cap_position_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_position_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_position_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_position_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_equity_changes (
  equity_change_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  investment_position_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  fund_id BIGINT UNSIGNED NOT NULL,
  change_code VARCHAR(80) NOT NULL,
  change_reason VARCHAR(160) NOT NULL,
  agreement_date DATE NULL,
  approval_date DATE NULL,
  round_label VARCHAR(80) NOT NULL,
  is_lead_investor TINYINT(1) NOT NULL DEFAULT 0,
  investment_method ENUM('equity','convertible_note','safe','secondary','option','other') NOT NULL DEFAULT 'equity',
  pre_money_ratio DECIMAL(9,6) NULL,
  post_money_ratio DECIMAL(9,6) NULL,
  share_count_delta DECIMAL(20,6) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (equity_change_id),
  UNIQUE KEY uk_cap_equity_change_code (change_code),
  KEY idx_cap_equity_position (investment_position_id),
  KEY idx_cap_equity_project (project_id),
  KEY idx_cap_equity_fund (fund_id),
  KEY idx_cap_equity_creator (created_by),
  CONSTRAINT fk_cap_equity_position
    FOREIGN KEY (investment_position_id) REFERENCES cap_investment_positions (investment_position_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_equity_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_equity_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_equity_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_cashflows (
  cashflow_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NOT NULL,
  investor_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NULL,
  investment_position_id BIGINT UNSIGNED NULL,
  cashflow_code VARCHAR(80) NOT NULL,
  cashflow_kind ENUM('investor_call','investor_distribution','project_investment','project_return','management_fee','operating_expense','other') NOT NULL,
  direction ENUM('inflow','outflow') NOT NULL,
  amount DECIMAL(20,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  occurred_on DATE NOT NULL,
  settlement_status ENUM('planned','submitted','settled','reconciled','cancelled') NOT NULL DEFAULT 'planned',
  description VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (cashflow_id),
  UNIQUE KEY uk_cap_cashflow_code (cashflow_code),
  KEY idx_cap_cashflow_fund_date (fund_id, occurred_on),
  KEY idx_cap_cashflow_investor (investor_id),
  KEY idx_cap_cashflow_project (project_id),
  KEY idx_cap_cashflow_position (investment_position_id),
  KEY idx_cap_cashflow_creator (created_by),
  CONSTRAINT fk_cap_cashflow_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_cashflow_investor
    FOREIGN KEY (investor_id) REFERENCES cap_investors (investor_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_cashflow_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_cashflow_position
    FOREIGN KEY (investment_position_id) REFERENCES cap_investment_positions (investment_position_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_cashflow_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_project_valuations (
  project_valuation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  fund_id BIGINT UNSIGNED NULL,
  valuation_date DATE NOT NULL,
  valuation_method ENUM('latest_round','income','market','cost','hybrid','manual') NOT NULL DEFAULT 'manual',
  pre_money_value DECIMAL(20,4) NULL,
  post_money_value DECIMAL(20,4) NULL,
  holding_value DECIMAL(20,4) NULL,
  confidence_level ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_valuation_id),
  KEY idx_cap_project_value_project_date (project_id, valuation_date),
  KEY idx_cap_project_value_fund (fund_id),
  KEY idx_cap_project_value_creator (created_by),
  CONSTRAINT fk_cap_project_value_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_project_value_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_project_value_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_fund_financial_reports (
  fund_financial_report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NOT NULL,
  period_code VARCHAR(20) NOT NULL,
  report_kind ENUM('monthly','quarterly','annual','ad_hoc') NOT NULL,
  total_assets DECIMAL(20,4) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(20,4) NOT NULL DEFAULT 0,
  net_assets DECIMAL(20,4) NOT NULL DEFAULT 0,
  paid_in_capital DECIMAL(20,4) NOT NULL DEFAULT 0,
  distributed_amount DECIMAL(20,4) NOT NULL DEFAULT 0,
  report_status ENUM('draft','reviewing','approved','disclosed') NOT NULL DEFAULT 'draft',
  metrics_json JSON NULL,
  prepared_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (fund_financial_report_id),
  UNIQUE KEY uk_cap_fund_report_period (fund_id, period_code, report_kind),
  KEY idx_cap_fund_report_prepared_by (prepared_by),
  KEY idx_cap_fund_report_approved_by (approved_by),
  CONSTRAINT fk_cap_fund_report_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_fund_report_preparer
    FOREIGN KEY (prepared_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_fund_report_approver
    FOREIGN KEY (approved_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_fund_navs (
  fund_nav_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NOT NULL,
  nav_date DATE NOT NULL,
  net_asset_value DECIMAL(20,4) NOT NULL,
  unit_nav DECIMAL(20,6) NOT NULL,
  valuation_basis VARCHAR(160) NULL,
  disclosure_status ENUM('internal','scheduled','sent','confirmed') NOT NULL DEFAULT 'internal',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (fund_nav_id),
  UNIQUE KEY uk_cap_fund_nav_date (fund_id, nav_date),
  KEY idx_cap_fund_nav_creator (created_by),
  CONSTRAINT fk_cap_fund_nav_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_fund_nav_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_portfolio_reports (
  portfolio_report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  report_period VARCHAR(20) NOT NULL,
  report_frequency ENUM('monthly','quarterly','annual') NOT NULL,
  revenue_amount DECIMAL(20,4) NULL,
  net_profit_amount DECIMAL(20,4) NULL,
  cash_balance DECIMAL(20,4) NULL,
  employee_count INT NULL,
  valuation_amount DECIMAL(20,4) NULL,
  submission_status ENUM('not_requested','requested','submitted','reviewed','returned') NOT NULL DEFAULT 'not_requested',
  submitted_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  metrics_json JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (portfolio_report_id),
  UNIQUE KEY uk_cap_portfolio_project_period (project_id, report_period, report_frequency),
  KEY idx_cap_portfolio_status (submission_status),
  KEY idx_cap_portfolio_reviewer (reviewed_by),
  KEY idx_cap_portfolio_creator (created_by),
  CONSTRAINT fk_cap_portfolio_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_portfolio_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_portfolio_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_data_collection_campaigns (
  collection_campaign_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaign_code VARCHAR(80) NOT NULL,
  campaign_name VARCHAR(180) NOT NULL,
  period_code VARCHAR(20) NOT NULL,
  frequency ENUM('monthly','quarterly','annual','ad_hoc') NOT NULL,
  due_on DATE NOT NULL,
  send_mode ENUM('email','portal','mixed') NOT NULL DEFAULT 'mixed',
  status ENUM('draft','sent','collecting','closed','cancelled') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_campaign_id),
  UNIQUE KEY uk_cap_collection_code (campaign_code),
  KEY idx_cap_collection_period (period_code, status),
  KEY idx_cap_collection_creator (created_by),
  CONSTRAINT fk_cap_collection_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_data_collection_items (
  collection_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  collection_campaign_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  portfolio_report_id BIGINT UNSIGNED NULL,
  external_recipient_mask VARCHAR(160) NULL,
  send_status ENUM('queued','sent','bounced','reminded','cancelled') NOT NULL DEFAULT 'queued',
  fill_status ENUM('pending','in_progress','submitted','reviewed','reset') NOT NULL DEFAULT 'pending',
  last_sent_at DATETIME NULL,
  submitted_at DATETIME NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_item_id),
  UNIQUE KEY uk_cap_collection_item_project (collection_campaign_id, project_id),
  KEY idx_cap_collection_item_project (project_id),
  KEY idx_cap_collection_item_report (portfolio_report_id),
  CONSTRAINT fk_cap_collection_item_campaign
    FOREIGN KEY (collection_campaign_id) REFERENCES cap_data_collection_campaigns (collection_campaign_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_collection_item_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_collection_item_report
    FOREIGN KEY (portfolio_report_id) REFERENCES cap_portfolio_reports (portfolio_report_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_meetings (
  meeting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meeting_code VARCHAR(80) NOT NULL,
  meeting_title VARCHAR(220) NOT NULL,
  meeting_kind ENUM('investment_committee','board','shareholder','portfolio_review','internal_review','other') NOT NULL,
  project_id BIGINT UNSIGNED NULL,
  fund_id BIGINT UNSIGNED NULL,
  scheduled_at DATETIME NOT NULL,
  organizer_user_id BIGINT UNSIGNED NULL,
  decision_result ENUM('pending','approved','rejected','conditional','information_only') NOT NULL DEFAULT 'pending',
  ai_summary TEXT NULL,
  discussion_points_json JSON NULL,
  confirmation_status ENUM('ai_draft','human_confirmed','archived') NOT NULL DEFAULT 'ai_draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id),
  UNIQUE KEY uk_cap_meeting_code (meeting_code),
  KEY idx_cap_meeting_project (project_id),
  KEY idx_cap_meeting_fund (fund_id),
  KEY idx_cap_meeting_organizer (organizer_user_id),
  CONSTRAINT fk_cap_meeting_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_meeting_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_meeting_organizer
    FOREIGN KEY (organizer_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_meeting_actions (
  meeting_action_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meeting_id BIGINT UNSIGNED NOT NULL,
  action_title VARCHAR(220) NOT NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  due_on DATE NULL,
  action_status ENUM('open','in_progress','done','cancelled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_action_id),
  KEY idx_cap_meeting_action_meeting (meeting_id),
  KEY idx_cap_meeting_action_owner (owner_user_id),
  CONSTRAINT fk_cap_meeting_action_meeting
    FOREIGN KEY (meeting_id) REFERENCES cap_meetings (meeting_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_meeting_action_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_announcements (
  announcement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  announcement_code VARCHAR(80) NOT NULL,
  title VARCHAR(220) NOT NULL,
  body_text TEXT NOT NULL,
  audience_scope_json JSON NULL,
  publish_status ENUM('draft','scheduled','published','expired','withdrawn') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (announcement_id),
  UNIQUE KEY uk_cap_announcement_code (announcement_code),
  KEY idx_cap_announcement_status (publish_status, published_at),
  KEY idx_cap_announcement_creator (created_by),
  CONSTRAINT fk_cap_announcement_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_announcement_reads (
  announcement_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME NULL,
  delivery_status ENUM('delivered','read','dismissed') NOT NULL DEFAULT 'delivered',
  PRIMARY KEY (announcement_id, user_id),
  KEY idx_cap_announcement_read_user (user_id),
  CONSTRAINT fk_cap_announcement_read_announcement
    FOREIGN KEY (announcement_id) REFERENCES cap_announcements (announcement_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_announcement_read_user
    FOREIGN KEY (user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_calendar_events (
  calendar_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_code VARCHAR(80) NOT NULL,
  event_title VARCHAR(220) NOT NULL,
  event_kind ENUM('project','fund','workflow','meeting','personal','risk','other') NOT NULL,
  linked_entity_type VARCHAR(80) NULL,
  linked_entity_id BIGINT UNSIGNED NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  organizer_user_id BIGINT UNSIGNED NULL,
  location_text VARCHAR(220) NULL,
  visibility ENUM('private','department','company') NOT NULL DEFAULT 'department',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (calendar_event_id),
  UNIQUE KEY uk_cap_calendar_code (event_code),
  KEY idx_cap_calendar_time (starts_at, ends_at),
  KEY idx_cap_calendar_linked (linked_entity_type, linked_entity_id),
  KEY idx_cap_calendar_organizer (organizer_user_id),
  CONSTRAINT fk_cap_calendar_organizer
    FOREIGN KEY (organizer_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_messages (
  message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  sender_user_id BIGINT UNSIGNED NULL,
  message_code VARCHAR(80) NOT NULL,
  source_kind ENUM('workflow','risk','announcement','system','calendar','ai','document') NOT NULL,
  source_entity_type VARCHAR(80) NULL,
  source_entity_id BIGINT UNSIGNED NULL,
  title VARCHAR(220) NOT NULL,
  body_text TEXT NULL,
  message_box ENUM('unread','all','todo','done','request','cc') NOT NULL DEFAULT 'unread',
  read_at DATETIME NULL,
  action_status ENUM('none','pending','completed','dismissed') NOT NULL DEFAULT 'none',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id),
  UNIQUE KEY uk_cap_message_code (message_code),
  KEY idx_cap_message_recipient_box (recipient_user_id, message_box),
  KEY idx_cap_message_sender (sender_user_id),
  KEY idx_cap_message_source (source_kind, source_entity_type, source_entity_id),
  CONSTRAINT fk_cap_message_recipient
    FOREIGN KEY (recipient_user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_message_sender
    FOREIGN KEY (sender_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_workflow_templates (
  workflow_template_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_code VARCHAR(80) NOT NULL,
  template_name VARCHAR(160) NOT NULL,
  workflow_family ENUM('project','fund','office') NOT NULL,
  workflow_kind VARCHAR(80) NOT NULL,
  version_no INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  owner_org_id BIGINT UNSIGNED NULL,
  config_json JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workflow_template_id),
  UNIQUE KEY uk_cap_workflow_template_code_version (template_code, version_no),
  KEY idx_cap_workflow_template_family (workflow_family, workflow_kind),
  KEY idx_cap_workflow_template_owner_org (owner_org_id),
  KEY idx_cap_workflow_template_creator (created_by),
  CONSTRAINT fk_cap_workflow_template_owner_org
    FOREIGN KEY (owner_org_id) REFERENCES cap_organizations (org_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_workflow_template_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_workflow_steps (
  workflow_step_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_template_id BIGINT UNSIGNED NOT NULL,
  step_key VARCHAR(80) NOT NULL,
  step_name VARCHAR(160) NOT NULL,
  step_type ENUM('start','approval','review','finance_check','legal_check','archive','end') NOT NULL DEFAULT 'approval',
  sort_order INT NOT NULL DEFAULT 0,
  assignee_rule_json JSON NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workflow_step_id),
  UNIQUE KEY uk_cap_workflow_step_key (workflow_template_id, step_key),
  CONSTRAINT fk_cap_workflow_step_template
    FOREIGN KEY (workflow_template_id) REFERENCES cap_workflow_templates (workflow_template_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_workflow_instances (
  workflow_instance_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_template_id BIGINT UNSIGNED NOT NULL,
  instance_code VARCHAR(80) NOT NULL,
  title VARCHAR(220) NOT NULL,
  initiator_user_id BIGINT UNSIGNED NULL,
  related_project_id BIGINT UNSIGNED NULL,
  related_fund_id BIGINT UNSIGNED NULL,
  instance_status ENUM('draft','running','rejected','approved','cancelled','archived') NOT NULL DEFAULT 'draft',
  current_step_key VARCHAR(80) NULL,
  payload_json JSON NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (workflow_instance_id),
  UNIQUE KEY uk_cap_workflow_instance_code (instance_code),
  KEY idx_cap_workflow_instance_template (workflow_template_id),
  KEY idx_cap_workflow_instance_initiator (initiator_user_id),
  KEY idx_cap_workflow_instance_project (related_project_id),
  KEY idx_cap_workflow_instance_fund (related_fund_id),
  KEY idx_cap_workflow_instance_status (instance_status),
  CONSTRAINT fk_cap_workflow_instance_template
    FOREIGN KEY (workflow_template_id) REFERENCES cap_workflow_templates (workflow_template_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cap_workflow_instance_initiator
    FOREIGN KEY (initiator_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_workflow_instance_project
    FOREIGN KEY (related_project_id) REFERENCES cap_projects (project_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_workflow_instance_fund
    FOREIGN KEY (related_fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_workflow_tasks (
  workflow_task_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_instance_id BIGINT UNSIGNED NOT NULL,
  workflow_step_id BIGINT UNSIGNED NULL,
  task_code VARCHAR(80) NOT NULL,
  task_name VARCHAR(160) NOT NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  delegated_from_user_id BIGINT UNSIGNED NULL,
  task_status ENUM('pending','claimed','approved','rejected','transferred','cc','archived') NOT NULL DEFAULT 'pending',
  due_at DATETIME NULL,
  acted_at DATETIME NULL,
  action_comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workflow_task_id),
  UNIQUE KEY uk_cap_workflow_task_code (task_code),
  KEY idx_cap_workflow_task_instance (workflow_instance_id),
  KEY idx_cap_workflow_task_step (workflow_step_id),
  KEY idx_cap_workflow_task_assignee_status (assigned_user_id, task_status),
  KEY idx_cap_workflow_task_delegated_from (delegated_from_user_id),
  CONSTRAINT fk_cap_workflow_task_instance
    FOREIGN KEY (workflow_instance_id) REFERENCES cap_workflow_instances (workflow_instance_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_workflow_task_step
    FOREIGN KEY (workflow_step_id) REFERENCES cap_workflow_steps (workflow_step_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_workflow_task_assignee
    FOREIGN KEY (assigned_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_workflow_task_delegated_from
    FOREIGN KEY (delegated_from_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_workflow_delegations (
  delegation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  delegator_user_id BIGINT UNSIGNED NOT NULL,
  delegatee_user_id BIGINT UNSIGNED NOT NULL,
  workflow_family ENUM('project','fund','office','all') NOT NULL DEFAULT 'all',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (delegation_id),
  KEY idx_cap_delegation_delegator (delegator_user_id),
  KEY idx_cap_delegation_delegatee (delegatee_user_id),
  CONSTRAINT fk_cap_delegation_delegator
    FOREIGN KEY (delegator_user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_delegation_delegatee
    FOREIGN KEY (delegatee_user_id) REFERENCES cap_users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_documents (
  document_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_code VARCHAR(80) NOT NULL,
  title VARCHAR(220) NOT NULL,
  document_kind ENUM('project','fund','investor','workflow','shared','meeting','risk','research','other') NOT NULL,
  storage_uri VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  current_version_no INT NOT NULL DEFAULT 1,
  checksum_hash VARCHAR(255) NULL,
  access_level ENUM('private','team','company','restricted') NOT NULL DEFAULT 'team',
  watermark_policy ENUM('none','viewer','download','always') NOT NULL DEFAULT 'viewer',
  fulltext_status ENUM('queued','indexed','failed','skipped') NOT NULL DEFAULT 'queued',
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (document_id),
  UNIQUE KEY uk_cap_document_code (document_code),
  KEY idx_cap_document_kind (document_kind),
  KEY idx_cap_document_uploader (uploaded_by),
  CONSTRAINT fk_cap_document_uploader
    FOREIGN KEY (uploaded_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_document_versions (
  document_version_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  version_no INT NOT NULL,
  storage_uri VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  checksum_hash VARCHAR(255) NULL,
  change_note VARCHAR(500) NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  uploaded_at DATETIME NOT NULL,
  PRIMARY KEY (document_version_id),
  UNIQUE KEY uk_cap_document_version (document_id, version_no),
  KEY idx_cap_document_version_uploader (uploaded_by),
  CONSTRAINT fk_cap_document_version_document
    FOREIGN KEY (document_id) REFERENCES cap_documents (document_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_document_version_uploader
    FOREIGN KEY (uploaded_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_document_links (
  document_link_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  linked_entity_type VARCHAR(80) NOT NULL,
  linked_entity_id BIGINT UNSIGNED NOT NULL,
  link_purpose ENUM('source','attachment','archive','disclosure','evidence','output') NOT NULL DEFAULT 'attachment',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_link_id),
  UNIQUE KEY uk_cap_document_link (document_id, linked_entity_type, linked_entity_id, link_purpose),
  KEY idx_cap_document_link_entity (linked_entity_type, linked_entity_id),
  CONSTRAINT fk_cap_document_link_document
    FOREIGN KEY (document_id) REFERENCES cap_documents (document_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_document_permissions (
  document_permission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  grantee_kind ENUM('user','role','organization') NOT NULL,
  grantee_id BIGINT UNSIGNED NOT NULL,
  can_preview TINYINT(1) NOT NULL DEFAULT 1,
  can_download TINYINT(1) NOT NULL DEFAULT 0,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  can_share TINYINT(1) NOT NULL DEFAULT 0,
  watermark_required TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATETIME NULL,
  granted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_permission_id),
  UNIQUE KEY uk_cap_document_permission (document_id, grantee_kind, grantee_id),
  KEY idx_cap_document_permission_grantee (grantee_kind, grantee_id),
  KEY idx_cap_document_permission_granter (granted_by),
  CONSTRAINT fk_cap_document_permission_document
    FOREIGN KEY (document_id) REFERENCES cap_documents (document_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_document_permission_granter
    FOREIGN KEY (granted_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_recycle_items (
  recycle_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  object_type VARCHAR(80) NOT NULL,
  object_id BIGINT UNSIGNED NOT NULL,
  object_label VARCHAR(220) NOT NULL,
  delete_reason VARCHAR(500) NULL,
  recoverable_until DATETIME NULL,
  purge_status ENUM('recoverable','restored','purged','locked') NOT NULL DEFAULT 'recoverable',
  deleted_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NOT NULL,
  restored_by BIGINT UNSIGNED NULL,
  restored_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (recycle_item_id),
  KEY idx_cap_recycle_object (object_type, object_id),
  KEY idx_cap_recycle_status (purge_status),
  KEY idx_cap_recycle_deleted_by (deleted_by),
  KEY idx_cap_recycle_restored_by (restored_by),
  CONSTRAINT fk_cap_recycle_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_recycle_restored_by
    FOREIGN KEY (restored_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_risk_clauses (
  risk_clause_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fund_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  investment_position_id BIGINT UNSIGNED NULL,
  clause_code VARCHAR(80) NOT NULL,
  round_label VARCHAR(80) NULL,
  clause_kind ENUM('redemption','anti_dilution','veto','information_right','milestone','liquidation_preference','other') NOT NULL,
  clause_status ENUM('draft','active','triggered','waived','closed') NOT NULL DEFAULT 'draft',
  clause_summary VARCHAR(500) NOT NULL,
  clause_body TEXT NULL,
  reminder_on DATE NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (risk_clause_id),
  UNIQUE KEY uk_cap_risk_clause_code (clause_code),
  KEY idx_cap_risk_clause_project (project_id),
  KEY idx_cap_risk_clause_fund (fund_id),
  KEY idx_cap_risk_clause_position (investment_position_id),
  KEY idx_cap_risk_clause_owner (owner_user_id),
  KEY idx_cap_risk_clause_status (clause_status, reminder_on),
  KEY idx_cap_risk_clause_creator (created_by),
  CONSTRAINT fk_cap_risk_clause_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_risk_clause_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_risk_clause_position
    FOREIGN KEY (investment_position_id) REFERENCES cap_investment_positions (investment_position_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_risk_clause_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_risk_clause_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_risk_incidents (
  risk_incident_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NULL,
  fund_id BIGINT UNSIGNED NULL,
  incident_code VARCHAR(80) NOT NULL,
  incident_title VARCHAR(220) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  occurred_at DATETIME NOT NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  incident_status ENUM('open','mitigating','watching','resolved','closed') NOT NULL DEFAULT 'open',
  response_plan TEXT NULL,
  latest_progress TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (risk_incident_id),
  UNIQUE KEY uk_cap_risk_incident_code (incident_code),
  KEY idx_cap_risk_incident_project (project_id),
  KEY idx_cap_risk_incident_fund (fund_id),
  KEY idx_cap_risk_incident_owner (owner_user_id),
  KEY idx_cap_risk_incident_status (incident_status, severity),
  KEY idx_cap_risk_incident_creator (created_by),
  CONSTRAINT fk_cap_risk_incident_project
    FOREIGN KEY (project_id) REFERENCES cap_projects (project_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_risk_incident_fund
    FOREIGN KEY (fund_id) REFERENCES cap_funds (fund_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_risk_incident_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_risk_incident_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_risk_updates (
  risk_update_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  risk_incident_id BIGINT UNSIGNED NOT NULL,
  update_text TEXT NOT NULL,
  update_status ENUM('note','plan','progress','resolution') NOT NULL DEFAULT 'note',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (risk_update_id),
  KEY idx_cap_risk_update_incident (risk_incident_id),
  KEY idx_cap_risk_update_creator (created_by),
  CONSTRAINT fk_cap_risk_update_incident
    FOREIGN KEY (risk_incident_id) REFERENCES cap_risk_incidents (risk_incident_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_risk_update_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_research_notes (
  research_note_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  note_code VARCHAR(80) NOT NULL,
  note_title VARCHAR(220) NOT NULL,
  note_kind ENUM('market_clip','internal_report','expert_call','memo','knowledge_card') NOT NULL,
  source_name VARCHAR(180) NULL,
  source_url VARCHAR(500) NULL,
  tag_json JSON NULL,
  abstract_text TEXT NULL,
  ai_summary TEXT NULL,
  review_status ENUM('draft','reviewing','approved','archived') NOT NULL DEFAULT 'draft',
  owner_user_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (research_note_id),
  UNIQUE KEY uk_cap_research_note_code (note_code),
  KEY idx_cap_research_kind_status (note_kind, review_status),
  KEY idx_cap_research_owner (owner_user_id),
  KEY idx_cap_research_creator (created_by),
  CONSTRAINT fk_cap_research_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_research_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_research_links (
  research_link_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  research_note_id BIGINT UNSIGNED NOT NULL,
  linked_entity_type VARCHAR(80) NOT NULL,
  linked_entity_id BIGINT UNSIGNED NOT NULL,
  relevance_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (research_link_id),
  UNIQUE KEY uk_cap_research_link (research_note_id, linked_entity_type, linked_entity_id),
  KEY idx_cap_research_link_entity (linked_entity_type, linked_entity_id),
  CONSTRAINT fk_cap_research_link_note
    FOREIGN KEY (research_note_id) REFERENCES cap_research_notes (research_note_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_ai_parse_jobs (
  ai_parse_job_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_code VARCHAR(80) NOT NULL,
  job_name VARCHAR(180) NOT NULL,
  source_document_id BIGINT UNSIGNED NULL,
  source_text_hash VARCHAR(255) NULL,
  parse_kind ENUM('business_plan','meeting_minutes','contract','financial_report','research_report','question_answer') NOT NULL,
  requested_by BIGINT UNSIGNED NULL,
  job_status ENUM('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  error_summary VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ai_parse_job_id),
  UNIQUE KEY uk_cap_ai_job_code (job_code),
  KEY idx_cap_ai_job_document (source_document_id),
  KEY idx_cap_ai_job_requester (requested_by),
  KEY idx_cap_ai_job_status (job_status, parse_kind),
  CONSTRAINT fk_cap_ai_job_document
    FOREIGN KEY (source_document_id) REFERENCES cap_documents (document_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_ai_job_requester
    FOREIGN KEY (requested_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_ai_parse_outputs (
  ai_parse_output_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ai_parse_job_id BIGINT UNSIGNED NOT NULL,
  output_kind ENUM('summary','field_extraction','risk_clause','meeting_minutes','research_answer','workflow_payload') NOT NULL,
  target_entity_type VARCHAR(80) NULL,
  target_entity_id BIGINT UNSIGNED NULL,
  confidence_score DECIMAL(6,5) NULL,
  output_json JSON NULL,
  human_status ENUM('pending','accepted','edited','rejected') NOT NULL DEFAULT 'pending',
  confirmed_by BIGINT UNSIGNED NULL,
  confirmed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ai_parse_output_id),
  KEY idx_cap_ai_output_job (ai_parse_job_id),
  KEY idx_cap_ai_output_target (target_entity_type, target_entity_id),
  KEY idx_cap_ai_output_confirmer (confirmed_by),
  CONSTRAINT fk_cap_ai_output_job
    FOREIGN KEY (ai_parse_job_id) REFERENCES cap_ai_parse_jobs (ai_parse_job_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cap_ai_output_confirmer
    FOREIGN KEY (confirmed_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_ai_sessions (
  ai_session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_code VARCHAR(80) NOT NULL,
  session_title VARCHAR(220) NOT NULL,
  session_kind ENUM('workspace','research_qna','document_parse','meeting_assistant') NOT NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  linked_entity_type VARCHAR(80) NULL,
  linked_entity_id BIGINT UNSIGNED NULL,
  session_status ENUM('open','archived','deleted') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ai_session_id),
  UNIQUE KEY uk_cap_ai_session_code (session_code),
  KEY idx_cap_ai_session_owner (owner_user_id),
  KEY idx_cap_ai_session_linked (linked_entity_type, linked_entity_id),
  CONSTRAINT fk_cap_ai_session_owner
    FOREIGN KEY (owner_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_ai_messages (
  ai_message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ai_session_id BIGINT UNSIGNED NOT NULL,
  speaker ENUM('user','assistant','system') NOT NULL,
  message_body TEXT NOT NULL,
  citations_json JSON NULL,
  model_label VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ai_message_id),
  KEY idx_cap_ai_message_session (ai_session_id),
  CONSTRAINT fk_cap_ai_message_session
    FOREIGN KEY (ai_session_id) REFERENCES cap_ai_sessions (ai_session_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_report_snapshots (
  report_snapshot_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  snapshot_code VARCHAR(80) NOT NULL,
  snapshot_name VARCHAR(180) NOT NULL,
  report_scope ENUM('company','fund','project','industry','owner') NOT NULL DEFAULT 'company',
  scope_entity_id BIGINT UNSIGNED NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  irr_value DECIMAL(9,6) NULL,
  dpi_value DECIMAL(9,6) NULL,
  tvpi_value DECIMAL(9,6) NULL,
  moic_value DECIMAL(9,6) NULL,
  metrics_json JSON NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_snapshot_id),
  UNIQUE KEY uk_cap_report_snapshot_code (snapshot_code),
  KEY idx_cap_report_snapshot_scope (report_scope, scope_entity_id),
  KEY idx_cap_report_snapshot_period (period_start, period_end),
  KEY idx_cap_report_snapshot_creator (created_by),
  CONSTRAINT fk_cap_report_snapshot_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_import_export_tasks (
  import_export_task_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_code VARCHAR(80) NOT NULL,
  task_kind ENUM('import','export','template_download','error_report') NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  task_status ENUM('queued','validating','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  source_file_uri VARCHAR(500) NULL,
  result_file_uri VARCHAR(500) NULL,
  total_rows INT NOT NULL DEFAULT 0,
  success_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  error_summary TEXT NULL,
  requested_by BIGINT UNSIGNED NULL,
  requested_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (import_export_task_id),
  UNIQUE KEY uk_cap_import_export_code (task_code),
  KEY idx_cap_import_export_entity (entity_type, task_kind),
  KEY idx_cap_import_export_status (task_status),
  KEY idx_cap_import_export_requester (requested_by),
  CONSTRAINT fk_cap_import_export_requester
    FOREIGN KEY (requested_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_custom_field_definitions (
  custom_field_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(80) NOT NULL,
  field_key VARCHAR(120) NOT NULL,
  field_label VARCHAR(160) NOT NULL,
  data_type ENUM('text','number','date','datetime','select','multi_select','boolean','money','percent','json') NOT NULL,
  option_set_code VARCHAR(80) NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  is_searchable TINYINT(1) NOT NULL DEFAULT 0,
  validation_json JSON NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (custom_field_id),
  UNIQUE KEY uk_cap_custom_field (entity_type, field_key),
  KEY idx_cap_custom_field_creator (created_by),
  CONSTRAINT fk_cap_custom_field_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_form_layouts (
  form_layout_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  layout_code VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  layout_name VARCHAR(160) NOT NULL,
  screen_code VARCHAR(80) NULL,
  layout_json JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (form_layout_id),
  UNIQUE KEY uk_cap_form_layout_code (layout_code),
  KEY idx_cap_form_layout_entity (entity_type, screen_code),
  KEY idx_cap_form_layout_creator (created_by),
  CONSTRAINT fk_cap_form_layout_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_option_sets (
  option_set_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_set_code VARCHAR(80) NOT NULL,
  option_set_name VARCHAR(160) NOT NULL,
  options_json JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (option_set_id),
  UNIQUE KEY uk_cap_option_set_code (option_set_code),
  KEY idx_cap_option_set_creator (created_by),
  CONSTRAINT fk_cap_option_set_creator
    FOREIGN KEY (created_by) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_audit_logs (
  audit_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action_code VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  entity_label VARCHAR(220) NULL,
  request_id VARCHAR(120) NULL,
  ip_mask VARCHAR(80) NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  risk_level ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  occurred_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_log_id),
  KEY idx_cap_audit_actor_time (actor_user_id, occurred_at),
  KEY idx_cap_audit_entity (entity_type, entity_id),
  KEY idx_cap_audit_action (action_code),
  CONSTRAINT fk_cap_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cap_ui_action_events (
  ui_action_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  audit_log_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  action_code VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  entity_label VARCHAR(220) NULL,
  payload_json JSON NULL,
  result_json JSON NULL,
  event_status ENUM('succeeded','failed') NOT NULL DEFAULT 'succeeded',
  occurred_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ui_action_event_id),
  KEY idx_cap_ui_action_audit (audit_log_id),
  KEY idx_cap_ui_action_actor_time (actor_user_id, occurred_at),
  KEY idx_cap_ui_action_code (action_code),
  CONSTRAINT fk_cap_ui_action_audit
    FOREIGN KEY (audit_log_id) REFERENCES cap_audit_logs (audit_log_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cap_ui_action_actor
    FOREIGN KEY (actor_user_id) REFERENCES cap_users (user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
