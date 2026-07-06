-- CapitalOS full-scope demo seed data.
-- ASCII-only mock data to avoid environment encoding issues.
-- All entities, emails, document URIs, and IDs are synthetic.

USE capitalos;

INSERT INTO cap_organizations (org_id, parent_org_id, org_code, org_name, org_type, sort_order, is_active) VALUES
  (1, NULL, 'CAP-HQ', 'CapitalOS Demo Group', 'company', 1, 1),
  (2, 1, 'CAP-EXEC', 'Executive Office', 'department', 10, 1),
  (3, 1, 'CAP-INV', 'Investment Team', 'department', 20, 1),
  (4, 1, 'CAP-FUNDOPS', 'Fund Operations', 'department', 30, 1),
  (5, 1, 'CAP-RISK', 'Risk And Legal', 'department', 40, 1),
  (6, 1, 'CAP-IR', 'Investor Relations', 'department', 50, 1),
  (7, 1, 'CAP-ADMIN', 'Platform Administration', 'department', 60, 1);

INSERT INTO cap_users (user_id, org_id, employee_no, login_name, display_name, email, mobile_mask, password_hash, account_status, last_login_at, profile_json) VALUES
  (1, 2, 'E0001', 'alex.gp', 'Alex Chen', 'alex.gp@capitalos.example', '138****0001', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:10:00', '{"title":"Managing Partner","avatarColor":"indigo"}'),
  (2, 3, 'E0002', 'nina.invest', 'Nina Lin', 'nina.invest@capitalos.example', '138****0002', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:16:00', '{"title":"Investment Manager","avatarColor":"teal"}'),
  (3, 4, 'E0003', 'omar.fundops', 'Omar Zhou', 'omar.fundops@capitalos.example', '138****0003', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-01 18:22:00', '{"title":"Fund Operator","avatarColor":"blue"}'),
  (4, 5, 'E0004', 'lena.legal', 'Lena Luo', 'lena.legal@capitalos.example', '138****0004', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-01 20:12:00', '{"title":"Risk Legal","avatarColor":"red"}'),
  (5, 6, 'E0005', 'iris.ir', 'Iris Gu', 'iris.ir@capitalos.example', '138****0005', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:05:00', '{"title":"Investor Relations","avatarColor":"cyan"}'),
  (6, 3, 'E0006', 'ryan.research', 'Ryan Ye', 'ryan.research@capitalos.example', '138****0006', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 08:45:00', '{"title":"Researcher","avatarColor":"purple"}'),
  (7, 7, 'E0007', 'sam.admin', 'Sam Meng', 'sam.admin@capitalos.example', '138****0007', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:20:00', '{"title":"System Administrator","avatarColor":"slate"}'),
  (8, 5, 'E0008', 'casey.audit', 'Casey Audit', 'casey.audit@capitalos.example', '138****0008', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 08:35:00', '{"title":"Read Only Auditor","avatarColor":"amber"}');

INSERT INTO cap_roles (role_id, role_code, role_name, description, data_scope, is_system_role, is_active) VALUES
  (1, 'system_admin', 'System Administrator', 'Maintains users, roles, forms, fields, workflow and audit.', 'all', 1, 1),
  (2, 'managing_partner', 'Managing Partner', 'Views cockpit, portfolio performance, reserves, risks and approvals.', 'all', 1, 1),
  (3, 'investment_manager', 'Investment Manager', 'Maintains projects and drives investment stages.', 'owned', 1, 1),
  (4, 'fund_operator', 'Fund Operator', 'Maintains funds, capital calls, cashflow, reports and disclosures.', 'department_tree', 1, 1),
  (5, 'risk_legal', 'Risk Legal', 'Reviews diligence, agreements, key clauses and risk incidents.', 'department_tree', 1, 1),
  (6, 'investor_relations', 'Investor Relations', 'Maintains investors, touchpoints and LP disclosures.', 'department', 1, 1),
  (7, 'researcher', 'Researcher', 'Maintains research library, internal notes and AI Q&A knowledge.', 'participated', 1, 1),
  (8, 'readonly_auditor', 'Read Only Auditor', 'Read-only access to masked records and audit trails.', 'custom', 1, 1);

INSERT INTO cap_user_roles (user_id, role_id, assigned_by) VALUES
  (1, 2, 7), (2, 3, 7), (3, 4, 7), (4, 5, 7),
  (5, 6, 7), (6, 7, 7), (7, 1, 7), (8, 8, 7);

INSERT INTO cap_navigation_items (nav_item_id, parent_nav_item_id, screen_code, group_name, item_name, route_key, sort_order, is_visible) VALUES
  (1, NULL, 'login', 'Entry', 'Login', 'auth.login', 1, 1),
  (2, NULL, 'workbench', 'Workspace', 'Executive Workbench', 'workspace.executive', 2, 1),
  (3, NULL, 'ai-workspace', 'Workspace', 'AI Workspace', 'workspace.ai', 3, 1),
  (4, NULL, 'announcements', 'Collaboration', 'Announcements', 'collab.announcements', 4, 1),
  (5, NULL, 'calendar', 'Collaboration', 'Calendar', 'collab.calendar', 5, 1),
  (6, NULL, 'message-center', 'Collaboration', 'Message Center', 'collab.messages', 6, 1),
  (7, NULL, 'flow-center', 'Workflow', 'Workflow Center', 'workflow.center', 7, 1),
  (8, NULL, 'flow-project', 'Workflow', 'Project Workflows', 'workflow.project', 8, 1),
  (9, NULL, 'flow-fund', 'Workflow', 'Fund Workflows', 'workflow.fund', 9, 1),
  (10, NULL, 'flow-oa', 'Workflow', 'Office Workflows', 'workflow.office', 10, 1),
  (11, NULL, 'project-board', 'Projects', 'Project Board', 'project.board', 11, 1),
  (12, NULL, 'project-list', 'Projects', 'Project List', 'project.list', 12, 1),
  (13, NULL, 'project-add', 'Projects', 'Add Project', 'project.add', 13, 1),
  (14, NULL, 'project-detail-overview', 'Projects', 'Project Detail Overview', 'project.detail.overview', 14, 1),
  (15, NULL, 'project-detail-investment', 'Projects', 'Project Investment Relation', 'project.detail.investment', 15, 1),
  (16, NULL, 'project-detail-postdata', 'Projects', 'Project Post Data', 'project.detail.postdata', 16, 1),
  (17, NULL, 'meeting-ai', 'Projects', 'Meeting AI', 'project.meeting.ai', 17, 1),
  (18, NULL, 'fund-list', 'Funds', 'Fund List', 'fund.list', 18, 1),
  (19, NULL, 'fund-add', 'Funds', 'Add Fund', 'fund.add', 19, 1),
  (20, NULL, 'fund-detail-overview', 'Funds', 'Fund Detail Overview', 'fund.detail.overview', 20, 1),
  (21, NULL, 'fund-detail-cashflow', 'Funds', 'Fund Cashflow', 'fund.detail.cashflow', 21, 1),
  (22, NULL, 'fund-detail-financials', 'Funds', 'Fund Financials', 'fund.detail.financials', 22, 1),
  (23, NULL, 'investment-info', 'Funds', 'Investment Ledger', 'investment.info', 23, 1),
  (24, NULL, 'equity-change', 'Funds', 'Equity Change', 'equity.change', 24, 1),
  (25, NULL, 'investor-list', 'Investors', 'Investor List', 'investor.list', 25, 1),
  (26, NULL, 'investor-detail', 'Investors', 'Investor Detail', 'investor.detail', 26, 1),
  (27, NULL, 'manager-orgs', 'Investors', 'Management Organizations', 'manager.orgs', 27, 1),
  (28, NULL, 'post-data-collection', 'Portfolio', 'Post Data Collection', 'portfolio.collection', 28, 1),
  (29, NULL, 'risk-clauses', 'Risk', 'Key Clauses', 'risk.clauses', 29, 1),
  (30, NULL, 'burst-risk', 'Risk', 'Risk Incidents', 'risk.incidents', 30, 1),
  (31, NULL, 'document-center', 'Documents', 'Document Center', 'document.center', 31, 1),
  (32, NULL, 'process-files', 'Documents', 'Workflow Files', 'document.process', 32, 1),
  (33, NULL, 'research-library', 'AI Data', 'Research Library', 'research.library', 33, 1),
  (34, NULL, 'internal-research', 'AI Data', 'Internal Research', 'research.internal', 34, 1),
  (35, NULL, 'report-dashboard', 'Reports', 'Report Dashboard', 'report.dashboard', 35, 1),
  (36, NULL, 'import-export', 'Common', 'Import Export Center', 'import.export', 36, 1),
  (37, NULL, 'system-users', 'System', 'Users And Organizations', 'system.users', 37, 1),
  (38, NULL, 'roles-permissions', 'System', 'Roles And Permissions', 'system.roles', 38, 1),
  (39, NULL, 'field-config', 'System', 'Fields And Forms', 'system.fields', 39, 1),
  (40, NULL, 'account-settings', 'Account', 'Account Settings', 'account.settings', 40, 1),
  (41, NULL, 'recycle-bin', 'System', 'Recycle Bin', 'system.recycle', 41, 1);

INSERT INTO cap_permissions (permission_id, nav_item_id, permission_code, permission_name, permission_kind, entity_type, action_code, description) VALUES
  (1, 12, 'project.view', 'View projects', 'operation', 'project', 'view', 'View project records'),
  (2, 12, 'project.edit', 'Edit projects', 'operation', 'project', 'edit', 'Edit project records'),
  (3, 18, 'fund.view', 'View funds', 'operation', 'fund', 'view', 'View fund records'),
  (4, 18, 'fund.export', 'Export funds', 'operation', 'fund', 'export', 'Export fund records through async task'),
  (5, 31, 'document.download', 'Download documents', 'document', 'document', 'download', 'Requires secondary authorization'),
  (6, 29, 'risk.manage', 'Manage risks', 'operation', 'risk', 'manage', 'Manage clauses and incidents'),
  (7, 37, 'system.manage', 'Manage system', 'operation', 'system', 'manage', 'Admin functions'),
  (8, 35, 'report.export', 'Export reports', 'operation', 'report', 'export', 'Export dashboard snapshot');

INSERT INTO cap_role_permissions (role_id, permission_id, effect, condition_json) VALUES
  (1, 1, 'allow', NULL), (1, 2, 'allow', NULL), (1, 3, 'allow', NULL), (1, 4, 'allow', NULL), (1, 5, 'allow', NULL), (1, 6, 'allow', NULL), (1, 7, 'allow', NULL), (1, 8, 'allow', NULL),
  (2, 1, 'allow', NULL), (2, 3, 'allow', NULL), (2, 5, 'allow', '{"secondary_auth":true}'), (2, 8, 'allow', NULL),
  (3, 1, 'allow', '{"scope":"owned"}'), (3, 2, 'allow', '{"scope":"owned"}'), (3, 5, 'allow', '{"secondary_auth":true}'),
  (4, 3, 'allow', NULL), (4, 4, 'allow', '{"approval_required":true}'),
  (5, 1, 'allow', NULL), (5, 5, 'allow', '{"secondary_auth":true}'), (5, 6, 'allow', NULL),
  (6, 3, 'allow', '{"mask_investor_sensitive":false}'),
  (7, 1, 'allow', '{"scope":"participated"}'),
  (8, 1, 'allow', '{"read_only":true}'), (8, 3, 'allow', '{"read_only":true}');

INSERT INTO cap_user_preferences (user_id, notification_json, favorite_nav_json, table_view_json) VALUES
  (1, '{"risk":true,"workflow":true}', '["workbench","report-dashboard","project-board"]', '{"project-list":["Project","Stage","Owner","Risk"]}'),
  (2, '{"risk":true,"workflow":true}', '["project-list","project-board","meeting-ai"]', '{"project-list":["Project","Stage","Next Step"]}');

INSERT INTO cap_security_devices (user_id, device_label, device_kind, device_fingerprint_hash, last_seen_at, trust_status) VALUES
  (1, 'Windows Chrome Current', 'browser', 'DEMO_HASH_001', '2026-07-02 09:10:00', 'trusted'),
  (7, 'Admin Workstation', 'browser', 'DEMO_HASH_007', '2026-07-02 09:20:00', 'trusted');

INSERT INTO cap_login_events (user_id, login_name, auth_method, outcome, ip_mask, device_label, risk_level, occurred_at) VALUES
  (1, 'alex.gp', 'password', 'success', '10.0.*.*', 'Windows Chrome Current', 'low', '2026-07-02 09:10:00'),
  (8, 'casey.audit', 'password', 'success', '10.0.*.*', 'Audit Browser', 'medium', '2026-07-02 08:35:00');

INSERT INTO cap_management_orgs (management_org_id, org_code, org_name, org_kind, registry_no_mask, city, contact_name, contact_email, status, created_by) VALUES
  (1, 'MGR-001', 'CapitalOS Fund Management Co', 'fund_manager', '9131****8821', 'Shanghai', 'Grace Tang', 'grace.tang@capitalos.example', 'active', 7),
  (2, 'GP-001', 'Growth Fund GP Partnership', 'general_partner', '9132****1097', 'Suzhou', 'Victor Zhao', 'victor.zhao@capitalos.example', 'active', 7),
  (3, 'CUST-001', 'Demo Custodian Bank', 'custodian', '9130****6729', 'Hangzhou', 'Cindy Qiu', 'cindy.qiu@capitalos.example', 'under_review', 7);

INSERT INTO cap_funds (fund_id, manager_org_id, fund_code, fund_name, legal_name, fund_status, raise_method, target_size, committed_size, paid_in_size, net_asset_value, unit_nav, term_months, investment_strategy, fee_terms_json, distribution_terms_json, governance_json, disclosure_json, established_on, final_close_on, created_by) VALUES
  (1, 1, 'FUND-GROWTH-I', 'Growth Fund I', 'Growth Fund I L.P.', 'investing', 'private', 2000000000.0000, 1860000000.0000, 1520000000.0000, 1680000000.0000, 1.186200, 96, 'Growth-stage hard technology and enterprise services.', '{"management_fee":"2%"}', '{"carry":"20% after hurdle"}', '{"ic":"5 members"}', '{"frequency":"quarterly"}', '2022-04-15', '2023-03-31', 3),
  (2, 1, 'FUND-CARBON-I', 'Carbon Fund I', 'Carbon Fund I L.P.', 'investing', 'private', 2200000000.0000, 2000000000.0000, 1330000000.0000, 1420000000.0000, 1.071000, 96, 'Energy transition and carbon reduction infrastructure.', '{"management_fee":"1.8%"}', '{"carry":"18%"}', '{"ic":"6 members"}', '{"frequency":"quarterly"}', '2023-06-01', '2024-05-31', 3),
  (3, 1, 'FUND-MED-I', 'Healthcare Special Fund', 'Healthcare Special Fund L.P.', 'investing', 'single_lp', 1200000000.0000, 1200000000.0000, 1070000000.0000, 1190000000.0000, 1.102000, 84, 'Medical devices, diagnostics, and digital health.', '{"management_fee":"1.5%"}', '{"carry":"15%"}', '{"ic":"4 members"}', '{"frequency":"quarterly"}', '2021-10-20', '2022-08-30', 3);

INSERT INTO cap_fund_management_orgs (fund_id, management_org_id, relationship_kind, started_on, notes) VALUES
  (1, 1, 'manager', '2022-04-15', 'Primary manager'),
  (1, 2, 'gp', '2022-04-15', 'General partner'),
  (1, 3, 'custodian', '2022-04-15', 'Custody service');

INSERT INTO cap_fund_key_people (fund_id, user_id, person_name, person_role, vote_weight, is_active, started_on) VALUES
  (1, 1, 'Alex Chen', 'investment_committee', 1.0000, 1, '2022-04-15'),
  (1, 2, 'Nina Lin', 'key_person', 1.0000, 1, '2022-04-15'),
  (2, 4, 'Lena Luo', 'observer', 0.0000, 1, '2023-06-01');

INSERT INTO cap_investors (investor_id, investor_code, investor_name, investor_kind, qualification_status, risk_rating, city, disclosure_status, owner_user_id, created_by) VALUES
  (1, 'LP-001', 'East Industry Mother Fund', 'government_guidance', 'qualified', 'professional', 'Shanghai', 'confirmed', 5, 5),
  (2, 'LP-002', 'Yangtze Technology Group', 'corporate', 'qualified', 'growth', 'Nanjing', 'sent', 5, 5),
  (3, 'LP-003', 'Future Family Office', 'family_office', 'qualified', 'balanced', 'Hangzhou', 'viewed', 5, 5);

INSERT INTO cap_investor_contacts (contact_id, investor_id, contact_name, title, email, mobile_mask, is_primary) VALUES
  (1, 1, 'Laura Zhao', 'Investment Director', 'laura.zhao@lp.example', '139****1001', 1),
  (2, 2, 'Eric Liu', 'CFO', 'eric.liu@lp.example', '139****1002', 1),
  (3, 3, 'Mia He', 'Principal', 'mia.he@lp.example', '139****1003', 1);

INSERT INTO cap_fund_commitments (commitment_id, fund_id, investor_id, commitment_code, committed_amount, paid_in_amount, ownership_units, admission_date, status, disclosure_status, created_by) VALUES
  (1, 1, 1, 'COM-001', 500000000.0000, 420000000.0000, 420000000.000000, '2022-04-15', 'active', 'confirmed', 3),
  (2, 1, 2, 'COM-002', 350000000.0000, 310000000.0000, 310000000.000000, '2022-04-15', 'active', 'sent', 3),
  (3, 2, 3, 'COM-003', 120000000.0000, 90000000.0000, 90000000.000000, '2023-06-01', 'active', 'viewed', 3);

INSERT INTO cap_investor_touchpoints (touchpoint_id, investor_id, contact_id, owner_user_id, touchpoint_kind, occurred_at, subject, summary, next_step) VALUES
  (1, 1, 1, 5, 'meeting', '2026-06-28 15:30:00', 'Q2 disclosure review', 'Reviewed fund performance and risk dashboard.', 'Send signed minutes'),
  (2, 2, 2, 5, 'email', '2026-07-01 11:20:00', 'Capital call reminder', 'Confirmed payment schedule.', 'Follow payment confirmation');

INSERT INTO cap_projects (project_id, project_code, short_name, legal_name, registry_code_mask, opportunity_status, stage_label, industry_group, city, registered_location, owner_user_id, source_channel, summary, thesis, product_note, highlight_note, created_by) VALUES
  (1, 'PRJ-001', 'Matrix Medical', 'Matrix Precision Medical Co', '9131****0001', 'approved', 'Project Approval', 'Medical Devices', 'Shanghai', 'Shanghai', 2, 'Partner Referral', 'AI medical device platform.', 'Regulatory path and hospital channel create entry barrier.', 'Diagnostic hardware plus software workflow.', 'Strong hospital pilots.', 2),
  (2, 'PRJ-002', 'Northstar Storage', 'Northstar Energy Storage Systems Co', '9132****0002', 'term_sheet', 'TS', 'Energy Storage', 'Changzhou', 'Jiangsu', 2, 'Industry Scan', 'Containerized storage system integrator.', 'Demand grows with grid flexibility.', 'BMS and thermal management stack.', 'Signed strategic customer.', 2),
  (3, 'PRJ-003', 'Lanzhou Robotics', 'Lanzhou Robotics Technology Co', '9144****0003', 'diligence', 'Diligence', 'Robotics', 'Shenzhen', 'Guangdong', 2, 'Research Sourcing', 'Embodied intelligence robot company.', 'Vertical scenarios increase monetization certainty.', 'Robot arm plus perception module.', 'Fast ARR growth.', 2),
  (4, 'PRJ-004', 'Qingqiong Chip', 'Qingqiong Semiconductor Co', '9132****0004', 'committee', 'IC', 'Semiconductor', 'Nanjing', 'Jiangsu', 2, 'Co-investor', 'Specialized inference chip company.', 'Domestic substitution and edge AI demand.', 'Chiplet architecture.', 'High risk around related-party disclosure.', 2),
  (5, 'PRJ-005', 'Starfield Agri', 'Starfield Agricultural Technology Co', '9151****0005', 'portfolio', 'Post Investment', 'AgriTech', 'Chengdu', 'Sichuan', 2, 'Existing Portfolio', 'Smart agriculture operation platform.', 'Rural digitization with service revenue.', 'Farm SaaS plus IoT gateway.', 'Needs cashflow recovery plan.', 2);

INSERT INTO cap_project_members (project_id, user_id, member_role, joined_on) VALUES
  (1, 2, 'owner', '2026-05-18'), (1, 4, 'legal', '2026-05-20'),
  (2, 2, 'owner', '2026-06-02'), (3, 2, 'owner', '2026-06-18'),
  (4, 4, 'legal', '2026-06-24'), (5, 2, 'portfolio_owner', '2025-11-01');

INSERT INTO cap_project_stage_events (project_id, from_stage, to_stage, event_reason, event_at, actor_user_id, notes) VALUES
  (1, 'Screening', 'Project Approval', 'Approved by weekly review', '2026-05-18 10:00:00', 2, 'Proceed to approval workflow'),
  (2, 'Approved', 'TS', 'Term sheet issued', '2026-06-10 14:00:00', 2, 'Update liquidation preference clause'),
  (3, 'TS', 'Diligence', 'Diligence started', '2026-06-18 09:30:00', 2, 'Legal and financial diligence in progress');

INSERT INTO cap_investment_positions (investment_position_id, fund_id, project_id, position_code, round_label, agreement_amount, first_payment_on, cumulative_paid_amount, current_ownership_ratio, latest_valuation, realized_return_amount, exit_status, investment_status, owner_user_id, created_by) VALUES
  (1, 1, 3, 'POS-001', 'A+', 72000000.0000, '2026-06-30', 54000000.0000, 0.078000, 920000000.0000, 0.0000, 'none', 'funded', 2, 2),
  (2, 2, 2, 'POS-002', 'B', 90000000.0000, '2026-07-01', 45000000.0000, 0.062000, 1450000000.0000, 0.0000, 'none', 'signed', 2, 2),
  (3, 3, 1, 'POS-003', 'C', 58000000.0000, '2026-06-20', 30000000.0000, 0.036000, 1100000000.0000, 0.0000, 'none', 'monitoring', 2, 2);

INSERT INTO cap_equity_changes (equity_change_id, investment_position_id, project_id, fund_id, change_code, change_reason, agreement_date, approval_date, round_label, is_lead_investor, investment_method, pre_money_ratio, post_money_ratio, share_count_delta, notes, created_by) VALUES
  (1, 1, 3, 1, 'EQ-001', 'Follow-on financing', '2026-06-28', '2026-06-25', 'A+', 0, 'equity', 0.059000, 0.078000, 250000.000000, 'Follow investment with existing syndicate.', 2),
  (2, 2, 2, 2, 'EQ-002', 'B round investment', '2026-06-18', '2026-06-12', 'B', 1, 'equity', 0.041000, 0.062000, 400000.000000, 'Lead investor economics.', 2);

INSERT INTO cap_cashflows (cashflow_id, fund_id, investor_id, project_id, investment_position_id, cashflow_code, cashflow_kind, direction, amount, currency, occurred_on, settlement_status, description, created_by) VALUES
  (1, 1, 1, NULL, NULL, 'CF-001', 'investor_call', 'inflow', 80000000.0000, 'CNY', '2026-06-28', 'reconciled', 'LP capital call', 3),
  (2, 2, NULL, 2, 2, 'CF-002', 'project_investment', 'outflow', 45000000.0000, 'CNY', '2026-07-01', 'submitted', 'Project payment pending custody review', 3),
  (3, 1, NULL, 3, 1, 'CF-003', 'project_return', 'inflow', 12600000.0000, 'CNY', '2026-07-01', 'settled', 'Project return allocation pending', 3);

INSERT INTO cap_project_valuations (project_valuation_id, project_id, fund_id, valuation_date, valuation_method, pre_money_value, post_money_value, holding_value, confidence_level, notes, created_by) VALUES
  (1, 3, 1, '2026-06-30', 'latest_round', 850000000.0000, 920000000.0000, 71760000.0000, 'high', 'Based on latest financing round.', 2),
  (2, 2, 2, '2026-06-30', 'latest_round', 1360000000.0000, 1450000000.0000, 89900000.0000, 'medium', 'Pending TS finalization.', 2);

INSERT INTO cap_fund_financial_reports (fund_financial_report_id, fund_id, period_code, report_kind, total_assets, total_liabilities, net_assets, paid_in_capital, distributed_amount, report_status, metrics_json, prepared_by, approved_by) VALUES
  (1, 1, '2026Q2', 'quarterly', 1710000000.0000, 30000000.0000, 1680000000.0000, 1520000000.0000, 210000000.0000, 'approved', '{"dpi":0.22,"tvpi":1.31,"moic":1.42}', 3, 1),
  (2, 2, '2026Q2', 'quarterly', 1450000000.0000, 30000000.0000, 1420000000.0000, 1330000000.0000, 80000000.0000, 'reviewing', '{"dpi":0.08,"tvpi":1.12,"moic":1.18}', 3, 1);

INSERT INTO cap_fund_navs (fund_nav_id, fund_id, nav_date, net_asset_value, unit_nav, valuation_basis, disclosure_status, created_by) VALUES
  (1, 1, '2026-06-30', 1680000000.0000, 1.186200, 'Quarterly valuation model', 'scheduled', 3),
  (2, 2, '2026-06-30', 1420000000.0000, 1.071000, 'Quarterly valuation model', 'internal', 3);

INSERT INTO cap_portfolio_reports (portfolio_report_id, project_id, report_period, report_frequency, revenue_amount, net_profit_amount, cash_balance, employee_count, valuation_amount, submission_status, submitted_at, reviewed_by, metrics_json, created_by) VALUES
  (1, 5, '2026-06', 'monthly', 11200000.0000, -900000.0000, 7400000.0000, 86, 480000000.0000, 'reviewed', '2026-07-01 10:00:00', 2, '{"burn_months":5}', 2),
  (2, 3, '2026-06', 'monthly', 28600000.0000, 3200000.0000, 63000000.0000, 214, 920000000.0000, 'reviewed', '2026-07-01 11:00:00', 2, '{"arr_growth":0.42}', 2),
  (3, 1, '2026-06', 'monthly', 7800000.0000, -2100000.0000, 34000000.0000, 132, 1100000000.0000, 'submitted', '2026-07-02 09:00:00', NULL, '{"clinical_status":"delayed"}', 2);

INSERT INTO cap_data_collection_campaigns (collection_campaign_id, campaign_code, campaign_name, period_code, frequency, due_on, send_mode, status, created_by) VALUES
  (1, 'COL-202606', 'June 2026 Portfolio Data Collection', '2026-06', 'monthly', '2026-07-05', 'mixed', 'collecting', 2);

INSERT INTO cap_data_collection_items (collection_item_id, collection_campaign_id, project_id, portfolio_report_id, external_recipient_mask, send_status, fill_status, last_sent_at, submitted_at, notes) VALUES
  (1, 1, 5, 1, 'finance@starfield.example', 'sent', 'reviewed', '2026-07-01 09:00:00', '2026-07-01 10:00:00', 'Reviewed by portfolio owner'),
  (2, 1, 1, 3, 'finance@matrix.example', 'reminded', 'submitted', '2026-07-02 09:00:00', '2026-07-02 09:00:00', 'Awaiting review');

INSERT INTO cap_meetings (meeting_id, meeting_code, meeting_title, meeting_kind, project_id, fund_id, scheduled_at, organizer_user_id, decision_result, ai_summary, discussion_points_json, confirmation_status) VALUES
  (1, 'MTG-001', 'Matrix Medical IC Meeting', 'investment_committee', 1, 3, '2026-07-06 14:00:00', 2, 'pending', 'AI draft: proceed with IC materials after clinical pathway supplement.', '["clinical plan","cash use","valuation"]', 'ai_draft'),
  (2, 'MTG-002', 'Growth Fund LP Review', 'portfolio_review', NULL, 1, '2026-07-09 16:00:00', 5, 'information_only', 'LP review materials prepared.', '["performance","risk","disclosure"]', 'human_confirmed');

INSERT INTO cap_meeting_actions (meeting_action_id, meeting_id, action_title, owner_user_id, due_on, action_status) VALUES
  (1, 1, 'Supplement clinical path memo', 2, '2026-07-04', 'open'),
  (2, 1, 'Prepare updated investment memo', 4, '2026-07-05', 'in_progress');

INSERT INTO cap_announcements (announcement_id, announcement_code, title, body_text, audience_scope_json, publish_status, published_at, created_by) VALUES
  (1, 'ANN-001', 'Portfolio monthly data window is open', 'Please submit June portfolio operating data before the due date.', '{"roles":["investment_manager","portfolio_manager"]}', 'published', '2026-07-01 09:00:00', 3),
  (2, 'ANN-002', 'Q2 IC materials archive reminder', 'Please archive Q2 IC materials and signed minutes.', '{"roles":["investment_manager","risk_legal"]}', 'published', '2026-06-30 10:00:00', 4);

INSERT INTO cap_announcement_reads (announcement_id, user_id, read_at, delivery_status) VALUES
  (1, 2, '2026-07-01 09:10:00', 'read'), (1, 3, NULL, 'delivered'), (2, 4, '2026-06-30 11:00:00', 'read');

INSERT INTO cap_calendar_events (calendar_event_id, event_code, event_title, event_kind, linked_entity_type, linked_entity_id, starts_at, ends_at, organizer_user_id, location_text, visibility) VALUES
  (1, 'EVT-001', 'Matrix Medical IC Meeting', 'meeting', 'project', 1, '2026-07-06 14:00:00', '2026-07-06 15:30:00', 2, 'Room A', 'department'),
  (2, 'EVT-002', 'Lanzhou Robotics Legal Diligence', 'project', 'project', 3, '2026-07-04 10:30:00', '2026-07-04 12:00:00', 4, 'Room B', 'department'),
  (3, 'EVT-003', 'Growth Fund LP Meeting', 'fund', 'fund', 1, '2026-07-09 16:00:00', '2026-07-09 17:00:00', 5, 'Online', 'company');

INSERT INTO cap_messages (message_id, recipient_user_id, sender_user_id, message_code, source_kind, source_entity_type, source_entity_id, title, body_text, message_box, action_status) VALUES
  (1, 3, 2, 'MSG-001', 'workflow', 'cashflow', 2, 'Payment approval pending', 'Northstar Storage payment is waiting for custody review.', 'todo', 'pending'),
  (2, 2, 4, 'MSG-002', 'risk', 'risk_incident', 1, 'High risk incident raised', 'Starfield Agri cash balance dropped below threshold.', 'unread', 'pending'),
  (3, 4, 2, 'MSG-003', 'document', 'document', 3, 'TS clause updated', 'Northstar Storage TS has a new liquidation preference clause.', 'cc', 'none');

INSERT INTO cap_workflow_templates (workflow_template_id, template_code, template_name, workflow_family, workflow_kind, version_no, is_active, owner_org_id, config_json, created_by) VALUES
  (1, 'WF-PRJ-APPROVAL', 'Project approval workflow', 'project', 'project_approval', 1, 1, 3, '{"archive":true}', 7),
  (2, 'WF-FUND-PAYMENT', 'Fund payment workflow', 'fund', 'fund_payment', 1, 1, 4, '{"archive":true}', 7),
  (3, 'WF-OA-SEAL', 'Office seal workflow', 'office', 'seal', 1, 1, 5, '{"archive":true}', 7);

INSERT INTO cap_workflow_steps (workflow_step_id, workflow_template_id, step_key, step_name, step_type, sort_order, assignee_rule_json, is_required) VALUES
  (1, 1, 'start', 'Start', 'start', 1, '{"role":"investment_manager"}', 1),
  (2, 1, 'legal_review', 'Legal Review', 'legal_check', 2, '{"role":"risk_legal"}', 1),
  (3, 1, 'archive', 'Archive', 'archive', 3, '{"role":"system_admin"}', 1),
  (4, 2, 'finance_check', 'Finance Check', 'finance_check', 1, '{"role":"fund_operator"}', 1),
  (5, 3, 'legal_review', 'Seal Review', 'legal_check', 1, '{"role":"risk_legal"}', 1);

INSERT INTO cap_workflow_instances (workflow_instance_id, workflow_template_id, instance_code, title, initiator_user_id, related_project_id, related_fund_id, instance_status, current_step_key, payload_json, started_at) VALUES
  (1, 1, 'WFI-001', 'Matrix Medical project approval', 2, 1, NULL, 'running', 'legal_review', '{"amount":58000000}', '2026-07-01 09:30:00'),
  (2, 2, 'WFI-002', 'Northstar Storage project payment', 3, 2, 2, 'running', 'finance_check', '{"amount":45000000}', '2026-07-01 11:00:00'),
  (3, 3, 'WFI-003', 'Seal request for TS amendment', 2, 2, NULL, 'running', 'legal_review', '{"document":"TS amendment"}', '2026-07-02 09:00:00');

INSERT INTO cap_workflow_tasks (workflow_task_id, workflow_instance_id, workflow_step_id, task_code, task_name, assigned_user_id, task_status, due_at, action_comment) VALUES
  (1, 1, 2, 'TASK-001', 'Review project approval package', 4, 'pending', '2026-07-05 18:00:00', NULL),
  (2, 2, 4, 'TASK-002', 'Verify custody payment', 3, 'pending', '2026-07-03 18:00:00', NULL),
  (3, 3, 5, 'TASK-003', 'Approve seal request', 4, 'pending', '2026-07-02 18:00:00', NULL);

INSERT INTO cap_workflow_delegations (delegation_id, delegator_user_id, delegatee_user_id, workflow_family, starts_at, ends_at, is_active, reason) VALUES
  (1, 4, 7, 'all', '2026-07-02 00:00:00', '2026-07-12 23:59:59', 1, 'Vacation coverage');

INSERT INTO cap_documents (document_id, document_code, title, document_kind, storage_uri, file_name, mime_type, file_size_bytes, current_version_no, checksum_hash, access_level, watermark_policy, fulltext_status, uploaded_by) VALUES
  (1, 'DOC-001', 'Matrix Medical BP', 'project', 'mock://documents/matrix-bp-v3.pdf', 'matrix-medical-bp-v3.pdf', 'application/pdf', 2457600, 3, 'DEMO_CHECKSUM_001', 'team', 'always', 'indexed', 2),
  (2, 'DOC-002', 'Growth Fund Q2 Disclosure Pack', 'fund', 'mock://documents/growth-q2-pack.zip', 'growth-fund-q2-disclosure.zip', 'application/zip', 5242880, 1, 'DEMO_CHECKSUM_002', 'restricted', 'download', 'indexed', 3),
  (3, 'DOC-003', 'Northstar Storage TS', 'workflow', 'mock://documents/northstar-ts-v5.docx', 'northstar-storage-ts-v5.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 524288, 5, 'DEMO_CHECKSUM_003', 'restricted', 'always', 'indexed', 4),
  (4, 'DOC-004', 'Hard Technology Weekly Report', 'research', 'mock://documents/hardtech-weekly.pptx', 'hardtech-weekly.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 1048576, 2, 'DEMO_CHECKSUM_004', 'company', 'viewer', 'indexed', 6);

INSERT INTO cap_document_versions (document_version_id, document_id, version_no, storage_uri, file_size_bytes, checksum_hash, change_note, uploaded_by, uploaded_at) VALUES
  (1, 1, 3, 'mock://documents/matrix-bp-v3.pdf', 2457600, 'DEMO_CHECKSUM_001', 'Updated financial plan.', 2, '2026-06-29 12:00:00'),
  (2, 3, 5, 'mock://documents/northstar-ts-v5.docx', 524288, 'DEMO_CHECKSUM_003', 'Updated liquidation preference.', 4, '2026-07-01 16:00:00');

INSERT INTO cap_document_links (document_link_id, document_id, linked_entity_type, linked_entity_id, link_purpose) VALUES
  (1, 1, 'project', 1, 'source'),
  (2, 2, 'fund', 1, 'disclosure'),
  (3, 3, 'workflow_instance', 3, 'archive'),
  (4, 4, 'research_note', 1, 'source');

INSERT INTO cap_document_permissions (document_permission_id, document_id, grantee_kind, grantee_id, can_preview, can_download, can_edit, can_delete, can_share, watermark_required, granted_by) VALUES
  (1, 1, 'role', 3, 1, 1, 1, 0, 1, 1, 7),
  (2, 2, 'role', 6, 1, 1, 0, 0, 1, 1, 7),
  (3, 3, 'role', 5, 1, 1, 1, 0, 0, 1, 7),
  (4, 4, 'role', 7, 1, 1, 1, 0, 1, 0, 7);

INSERT INTO cap_recycle_items (recycle_item_id, object_type, object_id, object_label, delete_reason, recoverable_until, purge_status, deleted_by, deleted_at) VALUES
  (1, 'document', 99, 'Old Matrix BP.pdf', 'Duplicate upload', '2026-07-25 00:00:00', 'recoverable', 2, '2026-06-25 10:00:00'),
  (2, 'workflow', 88, 'Expired disclosure task', 'Recreated with new template', '2026-07-20 00:00:00', 'recoverable', 7, '2026-06-20 15:00:00');

INSERT INTO cap_risk_clauses (risk_clause_id, fund_id, project_id, investment_position_id, clause_code, round_label, clause_kind, clause_status, clause_summary, clause_body, reminder_on, owner_user_id, created_by) VALUES
  (1, 2, 2, 2, 'RC-001', 'B', 'redemption', 'active', 'Redemption right if milestone is missed.', 'Milestone-based redemption right requires quarterly review.', '2026-07-09', 4, 4),
  (2, 3, 1, 3, 'RC-002', 'C', 'milestone', 'triggered', 'Clinical milestone delay clause.', 'Clinical approval timeline delay triggers reporting obligation.', '2026-07-12', 4, 4);

INSERT INTO cap_risk_incidents (risk_incident_id, project_id, fund_id, incident_code, incident_title, severity, occurred_at, owner_user_id, incident_status, response_plan, latest_progress, created_by) VALUES
  (1, 5, 1, 'RI-001', 'Cash balance below safety line', 'high', '2026-07-02 08:30:00', 2, 'mitigating', 'Weekly cash control and collection push.', 'Founder agreed to revised payment plan.', 2),
  (2, 4, 1, 'RI-002', 'Related-party disclosure incomplete', 'high', '2026-07-01 17:00:00', 4, 'watching', 'Request full disclosure package.', 'Legal review in progress.', 4);

INSERT INTO cap_risk_updates (risk_update_id, risk_incident_id, update_text, update_status, created_by) VALUES
  (1, 1, 'Requested weekly cash report and sales collection plan.', 'plan', 2),
  (2, 2, 'Received first batch of related-party files.', 'progress', 4);

INSERT INTO cap_research_notes (research_note_id, note_code, note_title, note_kind, source_name, source_url, tag_json, abstract_text, ai_summary, review_status, owner_user_id, created_by) VALUES
  (1, 'RES-001', 'Embodied AI supply chain quarterly tracking', 'market_clip', 'Internal interviews', 'mock://research/embodied-ai', '["robotics","sensor","control"]', 'Supply chain cost and bottleneck review.', 'AI summary: controller and sensor cost curves are improving.', 'approved', 6, 6),
  (2, 'RES-002', 'Energy storage system integrator margin split', 'internal_report', 'Expert call', 'mock://research/storage-margin', '["storage","battery"]', 'Margin bridge across integrators.', 'AI summary: thermal module is the key margin lever.', 'reviewing', 6, 6);

INSERT INTO cap_research_links (research_link_id, research_note_id, linked_entity_type, linked_entity_id, relevance_note) VALUES
  (1, 1, 'project', 3, 'Supports diligence on robotics supply chain.'),
  (2, 2, 'project', 2, 'Supports TS negotiation assumptions.');

INSERT INTO cap_ai_parse_jobs (ai_parse_job_id, job_code, job_name, source_document_id, source_text_hash, parse_kind, requested_by, job_status, started_at, completed_at) VALUES
  (1, 'AI-001', 'Matrix BP field extraction', 1, 'DEMO_TEXT_HASH_001', 'business_plan', 2, 'completed', '2026-07-02 09:00:00', '2026-07-02 09:02:00'),
  (2, 'AI-002', 'Northstar TS clause extraction', 3, 'DEMO_TEXT_HASH_002', 'contract', 4, 'completed', '2026-07-02 09:03:00', '2026-07-02 09:05:00'),
  (3, 'AI-003', 'Matrix IC meeting minutes', NULL, 'DEMO_TEXT_HASH_003', 'meeting_minutes', 2, 'running', '2026-07-02 10:00:00', NULL);

INSERT INTO cap_ai_parse_outputs (ai_parse_output_id, ai_parse_job_id, output_kind, target_entity_type, target_entity_id, confidence_score, output_json, human_status, confirmed_by, confirmed_at) VALUES
  (1, 1, 'field_extraction', 'project', 1, 0.92000, '{"company":"Matrix Medical","sector":"Medical Devices","round":"C"}', 'accepted', 2, '2026-07-02 09:10:00'),
  (2, 2, 'risk_clause', 'risk_clause', 1, 0.88000, '{"clause":"redemption","reminder":"2026-07-09"}', 'edited', 4, '2026-07-02 09:20:00'),
  (3, 3, 'meeting_minutes', 'meeting', 1, 0.61000, '{"summary":"draft output waiting for human confirmation"}', 'pending', NULL, NULL);

INSERT INTO cap_ai_sessions (ai_session_id, session_code, session_title, session_kind, owner_user_id, linked_entity_type, linked_entity_id, session_status) VALUES
  (1, 'AIS-001', 'Project diligence Q&A', 'research_qna', 2, 'project', 3, 'open'),
  (2, 'AIS-002', 'Disclosure material parser', 'document_parse', 3, 'fund', 1, 'open');

INSERT INTO cap_ai_messages (ai_message_id, ai_session_id, speaker, message_body, citations_json, model_label) VALUES
  (1, 1, 'user', 'Summarize robotics supply chain risk.', NULL, NULL),
  (2, 1, 'assistant', 'Controller availability and sensor pricing are the main watch points.', '["RES-001","DOC-004"]', 'mock-model'),
  (3, 2, 'assistant', 'Disclosure pack is complete except signed LP acknowledgement.', '["DOC-002"]', 'mock-model');

INSERT INTO cap_report_snapshots (report_snapshot_id, snapshot_code, snapshot_name, report_scope, scope_entity_id, period_start, period_end, irr_value, dpi_value, tvpi_value, moic_value, metrics_json, created_by) VALUES
  (1, 'RPT-2026Q2', 'Company dashboard 2026 Q2', 'company', NULL, '2026-04-01', '2026-06-30', 0.186000, 0.220000, 1.310000, 1.420000, '{"industry":{"Robotics":0.24,"Healthcare":0.18,"Energy":0.22},"risk_hotspots":6}', 1);

INSERT INTO cap_import_export_tasks (import_export_task_id, task_code, task_kind, entity_type, task_status, source_file_uri, result_file_uri, total_rows, success_rows, failed_rows, error_summary, requested_by, requested_at, completed_at) VALUES
  (1, 'IET-001', 'import', 'project', 'failed', 'mock://imports/projects.xlsx', 'mock://imports/projects-errors.xlsx', 49, 43, 6, 'Six rows failed validation.', 2, '2026-07-02 09:30:00', '2026-07-02 09:33:00'),
  (2, 'IET-002', 'export', 'fund_cashflow', 'completed', NULL, 'mock://exports/fund-cashflow.csv', 128, 128, 0, NULL, 3, '2026-07-01 17:12:00', '2026-07-01 17:20:00');

INSERT INTO cap_custom_field_definitions (custom_field_id, entity_type, field_key, field_label, data_type, option_set_code, is_required, is_searchable, validation_json, display_order, created_by) VALUES
  (1, 'project', 'esg_rating', 'ESG Rating', 'select', 'esg_rating', 0, 1, '{"allowed":["A","B","C"]}', 10, 7),
  (2, 'fund', 'state_filing_no', 'State Filing Number', 'text', NULL, 1, 1, '{"maxLength":80}', 20, 7),
  (3, 'document', 'secondary_auth_level', 'Secondary Auth Level', 'select', 'auth_level', 1, 1, '{"allowed":["normal","strict"]}', 30, 7);

INSERT INTO cap_form_layouts (form_layout_id, layout_code, entity_type, layout_name, screen_code, layout_json, is_active, created_by) VALUES
  (1, 'LAYOUT-PROJECT-ADD', 'project', 'Project add form', 'project-add', '{"sections":["AI Prefill","Basic","Description","Attachments"]}', 1, 7),
  (2, 'LAYOUT-FUND-ADD', 'fund', 'Fund add form', 'fund-add', '{"sections":["Basic","Scale","Governance","Disclosure"]}', 1, 7);

INSERT INTO cap_option_sets (option_set_id, option_set_code, option_set_name, options_json, is_active, created_by) VALUES
  (1, 'project_stage', 'Project Stage Options', '["Sourced","Approved","TS","Diligence","IC","Agreement","Funded","Portfolio"]', 1, 7),
  (2, 'risk_level', 'Risk Level Options', '["low","medium","high","critical"]', 1, 7),
  (3, 'auth_level', 'Document Auth Level Options', '["normal","strict"]', 1, 7);

INSERT INTO cap_audit_logs (audit_log_id, actor_user_id, action_code, entity_type, entity_id, entity_label, request_id, ip_mask, before_json, after_json, risk_level, occurred_at) VALUES
  (1, 7, 'permission.update', 'role', 8, 'Read Only Auditor', 'REQ-001', '10.0.*.*', '{"can_export":true}', '{"can_export":false}', 'medium', '2026-07-02 09:40:00'),
  (2, 2, 'project.create', 'project', 1, 'Matrix Medical', 'REQ-002', '10.0.*.*', NULL, '{"stage":"Project Approval"}', 'low', '2026-07-02 09:42:00'),
  (3, 4, 'document.download', 'document', 3, 'Northstar Storage TS', 'REQ-003', '10.0.*.*', '{"secondary_auth":false}', '{"secondary_auth":true}', 'high', '2026-07-02 09:50:00');
