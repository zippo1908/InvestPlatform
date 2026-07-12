-- CapitalOS 全量演示种子数据(中文文案)。
-- 枚举代码、登录名、邮箱、编码、文件名保持 ASCII;用户可见文案为中文(需 utf8mb4)。
-- 所有实体、邮箱、文档 URI 与 ID 均为虚构演示数据。

USE capitalos;

INSERT INTO cap_organizations (org_id, parent_org_id, org_code, org_name, org_type, sort_order, is_active) VALUES
  (1, NULL, 'CAP-HQ', 'CapitalOS 演示集团', 'company', 1, 1),
  (2, 1, 'CAP-EXEC', '高管办公室', 'department', 10, 1),
  (3, 1, 'CAP-INV', '投资部', 'department', 20, 1),
  (4, 1, 'CAP-FUNDOPS', '基金运营部', 'department', 30, 1),
  (5, 1, 'CAP-RISK', '风控法务部', 'department', 40, 1),
  (6, 1, 'CAP-IR', '投资人关系部', 'department', 50, 1),
  (7, 1, 'CAP-ADMIN', '平台管理部', 'department', 60, 1);

INSERT INTO cap_users (user_id, org_id, employee_no, login_name, display_name, email, mobile_mask, password_hash, account_status, last_login_at, profile_json) VALUES
  (1, 2, 'E0001', 'alex.gp', '陈嘉', 'alex.gp@capitalos.example', '138****0001', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:10:00', '{"title":"管理合伙人","avatarColor":"indigo"}'),
  (2, 3, 'E0002', 'nina.invest', '林蔚', 'nina.invest@capitalos.example', '138****0002', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:16:00', '{"title":"投资经理","avatarColor":"teal"}'),
  (3, 4, 'E0003', 'omar.fundops', '周旻', 'omar.fundops@capitalos.example', '138****0003', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-01 18:22:00', '{"title":"基金运营","avatarColor":"blue"}'),
  (4, 5, 'E0004', 'lena.legal', '罗澜', 'lena.legal@capitalos.example', '138****0004', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-01 20:12:00', '{"title":"风控法务","avatarColor":"red"}'),
  (5, 6, 'E0005', 'iris.ir', '顾漪', 'iris.ir@capitalos.example', '138****0005', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:05:00', '{"title":"IR 投资人关系","avatarColor":"cyan"}'),
  (6, 3, 'E0006', 'ryan.research', '叶锐', 'ryan.research@capitalos.example', '138****0006', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 08:45:00', '{"title":"研究员","avatarColor":"purple"}'),
  (7, 7, 'E0007', 'sam.admin', '孟森', 'sam.admin@capitalos.example', '138****0007', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 09:20:00', '{"title":"系统管理员","avatarColor":"slate"}'),
  (8, 5, 'E0008', 'casey.audit', '审计专员', 'casey.audit@capitalos.example', '138****0008', 'DEMO_DISABLED_HASH_NOT_A_PASSWORD', 'active', '2026-07-02 08:35:00', '{"title":"只读审计","avatarColor":"amber"}');

INSERT INTO cap_roles (role_id, role_code, role_name, description, data_scope, is_system_role, is_active) VALUES
  (1, 'system_admin', '系统管理员', '维护用户、角色、表单、字段、流程与审计。', 'all', 1, 1),
  (2, 'managing_partner', '管理合伙人', '查看驾驶舱、组合表现、储备项目、风险与审批。', 'all', 1, 1),
  (3, 'investment_manager', '投资经理', '维护项目并推进投资阶段。', 'owned', 1, 1),
  (4, 'fund_operator', '基金运营', '维护基金、实缴出资、现金流、财报与披露。', 'department_tree', 1, 1),
  (5, 'risk_legal', '风控法务', '审核尽调、协议、关键条款与风险事件。', 'department_tree', 1, 1),
  (6, 'investor_relations', 'IR 投资人关系', '维护投资人、沟通记录与 LP 披露。', 'department', 1, 1),
  (7, 'researcher', '研究员', '维护行研智库、内部笔记与 AI 问答知识。', 'participated', 1, 1),
  (8, 'readonly_auditor', '只读审计', '只读访问脱敏记录与审计轨迹。', 'custom', 1, 1);

INSERT INTO cap_user_roles (user_id, role_id, assigned_by) VALUES
  (1, 2, 7), (2, 3, 7), (3, 4, 7), (4, 5, 7),
  (5, 6, 7), (6, 7, 7), (7, 1, 7), (8, 8, 7);

INSERT INTO cap_navigation_items (nav_item_id, parent_nav_item_id, screen_code, group_name, item_name, route_key, sort_order, is_visible) VALUES
  (1, NULL, 'login', '入口', '登录页', 'auth.login', 1, 1),
  (2, NULL, 'workbench', '工作台', '管理层工作台', 'workspace.executive', 2, 1),
  (3, NULL, 'ai-workspace', '工作台', 'AI 大模型工作台', 'workspace.ai', 3, 1),
  (4, NULL, 'announcements', '协同工具', '通知公告', 'collab.announcements', 4, 1),
  (5, NULL, 'calendar', '协同工具', '日程事件', 'collab.calendar', 5, 1),
  (6, NULL, 'message-center', '协同工具', '消息中心', 'collab.messages', 6, 1),
  (7, NULL, 'flow-center', '流程中心', '流程中心总览', 'workflow.center', 7, 1),
  (8, NULL, 'flow-project', '流程中心', '项目类流程', 'workflow.project', 8, 1),
  (9, NULL, 'flow-fund', '流程中心', '基金类流程', 'workflow.fund', 9, 1),
  (10, NULL, 'flow-oa', '流程中心', '日常办公流程', 'workflow.office', 10, 1),
  (11, NULL, 'project-board', '项目管理', '项目池看板', 'project.board', 11, 1),
  (12, NULL, 'project-list', '项目管理', '项目列表', 'project.list', 12, 1),
  (13, NULL, 'project-add', '项目管理', '新增项目', 'project.add', 13, 1),
  (14, NULL, 'project-detail-overview', '项目管理', '项目详情-概况', 'project.detail.overview', 14, 1),
  (15, NULL, 'project-detail-investment', '项目管理', '投资关系', 'project.detail.investment', 15, 1),
  (16, NULL, 'project-detail-postdata', '项目管理', '项目详情-投后数据', 'project.detail.postdata', 16, 1),
  (17, NULL, 'meeting-ai', '项目管理', '纪要解析', 'project.meeting.ai', 17, 1),
  (18, NULL, 'fund-list', '基金管理', '基金列表', 'fund.list', 18, 1),
  (19, NULL, 'fund-add', '基金管理', '新增基金', 'fund.add', 19, 1),
  (20, NULL, 'fund-detail-overview', '基金管理', '基金详情-概况', 'fund.detail.overview', 20, 1),
  (21, NULL, 'fund-detail-cashflow', '基金管理', '基金详情-现金流', 'fund.detail.cashflow', 21, 1),
  (22, NULL, 'fund-detail-financials', '基金管理', '基金详情-财报数据', 'fund.detail.financials', 22, 1),
  (23, NULL, 'investment-info', '基金管理', '投资信息', 'investment.info', 23, 1),
  (24, NULL, 'equity-change', '基金管理', '权益变动', 'equity.change', 24, 1),
  (25, NULL, 'investor-list', '投资人', '投资人列表', 'investor.list', 25, 1),
  (26, NULL, 'investor-detail', '投资人', '投资人详情', 'investor.detail', 26, 1),
  (27, NULL, 'manager-orgs', '投资人', '管理机构', 'manager.orgs', 27, 1),
  (28, NULL, 'post-data-collection', '投后管理', '投后数据收集', 'portfolio.collection', 28, 1),
  (29, NULL, 'risk-clauses', '风险管理', '项目关键条款', 'risk.clauses', 29, 1),
  (30, NULL, 'burst-risk', '风险管理', '突发风险事务', 'risk.incidents', 30, 1),
  (31, NULL, 'document-center', '文档管理', '文档中心', 'document.center', 31, 1),
  (32, NULL, 'process-files', '文档管理', '流程文件', 'document.process', 32, 1),
  (33, NULL, 'research-library', 'AI 数据库', '行研智库', 'research.library', 33, 1),
  (34, NULL, 'internal-research', 'AI 数据库', '内部产研', 'research.internal', 34, 1),
  (35, NULL, 'report-dashboard', '报表驾驶舱', '报表驾驶舱', 'report.dashboard', 35, 1),
  (36, NULL, 'import-export', '通用能力', '导入导出中心', 'import.export', 36, 1),
  (37, NULL, 'system-users', '系统管理', '用户与组织', 'system.users', 37, 1),
  (38, NULL, 'roles-permissions', '系统管理', '角色与权限', 'system.roles', 38, 1),
  (39, NULL, 'field-config', '系统管理', '字段与表单配置', 'system.fields', 39, 1),
  (40, NULL, 'account-settings', '账户', '账户与偏好设置', 'account.settings', 40, 1),
  (41, NULL, 'recycle-bin', '系统管理', '回收站', 'system.recycle', 41, 1);

INSERT INTO cap_permissions (permission_id, nav_item_id, permission_code, permission_name, permission_kind, entity_type, action_code, description) VALUES
  (1, 12, 'project.view', '查看项目', 'operation', 'project', 'view', '查看项目档案'),
  (2, 12, 'project.edit', '编辑项目', 'operation', 'project', 'edit', '编辑项目档案'),
  (3, 18, 'fund.view', '查看基金', 'operation', 'fund', 'view', '查看基金档案'),
  (4, 18, 'fund.export', '导出基金', 'operation', 'fund', 'export', '通过异步任务导出基金数据'),
  (5, 31, 'document.download', '下载文档', 'document', 'document', 'download', '需要二次鉴权'),
  (6, 29, 'risk.manage', '管理风险', 'operation', 'risk', 'manage', '管理条款与风险事件'),
  (7, 37, 'system.manage', '系统管理', 'operation', 'system', 'manage', '管理员功能'),
  (8, 35, 'report.export', '导出报表', 'operation', 'report', 'export', '导出驾驶舱快照');

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
  (1, '{"risk":true,"workflow":true}', '["workbench","report-dashboard","project-board"]', '{"project-list":["项目","阶段","负责人","风险"]}'),
  (2, '{"risk":true,"workflow":true}', '["project-list","project-board","meeting-ai"]', '{"project-list":["项目","阶段","下一步"]}');

INSERT INTO cap_security_devices (user_id, device_label, device_kind, device_fingerprint_hash, last_seen_at, trust_status) VALUES
  (1, 'Windows Chrome 常用设备', 'browser', 'DEMO_HASH_001', '2026-07-02 09:10:00', 'trusted'),
  (7, '管理员工作站', 'browser', 'DEMO_HASH_007', '2026-07-02 09:20:00', 'trusted');

INSERT INTO cap_login_events (user_id, login_name, auth_method, outcome, ip_mask, device_label, risk_level, occurred_at) VALUES
  (1, 'alex.gp', 'password', 'success', '10.0.*.*', 'Windows Chrome 常用设备', 'low', '2026-07-02 09:10:00'),
  (8, 'casey.audit', 'password', 'success', '10.0.*.*', '审计浏览器', 'medium', '2026-07-02 08:35:00');

INSERT INTO cap_management_orgs (management_org_id, org_code, org_name, org_kind, registry_no_mask, city, contact_name, contact_email, status, created_by) VALUES
  (1, 'MGR-001', '天启私募基金管理有限公司', 'fund_manager', '9131****8821', '上海', '顾言', 'grace.tang@capitalos.example', 'active', 7),
  (2, 'GP-001', '成长一期 GP 合伙企业', 'general_partner', '9132****1097', '苏州', '赵临', 'victor.zhao@capitalos.example', 'active', 7),
  (3, 'CUST-001', '演示托管银行', 'custodian', '9130****6729', '杭州', '邱宁', 'cindy.qiu@capitalos.example', 'under_review', 7);

INSERT INTO cap_funds (fund_id, manager_org_id, fund_code, fund_name, legal_name, fund_status, raise_method, target_size, committed_size, paid_in_size, net_asset_value, unit_nav, term_months, investment_strategy, fee_terms_json, distribution_terms_json, governance_json, disclosure_json, established_on, final_close_on, created_by) VALUES
  (1, 1, 'FUND-GROWTH-I', '成长一期基金', '成长一期基金(有限合伙)', 'investing', 'private', 2000000000.0000, 1860000000.0000, 1520000000.0000, 1680000000.0000, 1.186200, 96, '成长期硬科技与企业服务。', '{"management_fee":"2%"}', '{"carry":"门槛收益后 20%"}', '{"ic":"5 人"}', '{"frequency":"quarterly"}', '2022-04-15', '2023-03-31', 3),
  (2, 1, 'FUND-CARBON-I', '双碳一期基金', '双碳一期基金(有限合伙)', 'investing', 'private', 2200000000.0000, 2000000000.0000, 1330000000.0000, 1420000000.0000, 1.071000, 96, '能源转型与碳减排基础设施。', '{"management_fee":"1.8%"}', '{"carry":"18%"}', '{"ic":"6 人"}', '{"frequency":"quarterly"}', '2023-06-01', '2024-05-31', 3),
  (3, 1, 'FUND-MED-I', '医疗专项基金', '医疗专项基金(有限合伙)', 'investing', 'single_lp', 1200000000.0000, 1200000000.0000, 1070000000.0000, 1190000000.0000, 1.102000, 84, '医疗器械、诊断与数字医疗。', '{"management_fee":"1.5%"}', '{"carry":"15%"}', '{"ic":"4 人"}', '{"frequency":"quarterly"}', '2021-10-20', '2022-08-30', 3);

INSERT INTO cap_fund_management_orgs (fund_id, management_org_id, relationship_kind, started_on, notes) VALUES
  (1, 1, 'manager', '2022-04-15', '主要管理人'),
  (1, 2, 'gp', '2022-04-15', '普通合伙人'),
  (1, 3, 'custodian', '2022-04-15', '托管服务');

INSERT INTO cap_fund_key_people (fund_id, user_id, person_name, person_role, vote_weight, is_active, started_on) VALUES
  (1, 1, '陈嘉', 'investment_committee', 1.0000, 1, '2022-04-15'),
  (1, 2, '林蔚', 'key_person', 1.0000, 1, '2022-04-15'),
  (2, 4, '罗澜', 'observer', 0.0000, 1, '2023-06-01');

INSERT INTO cap_investors (investor_id, investor_code, investor_name, investor_kind, qualification_status, risk_rating, city, disclosure_status, owner_user_id, created_by) VALUES
  (1, 'LP-001', '华东产业母基金', 'government_guidance', 'qualified', 'professional', '上海', 'confirmed', 5, 5),
  (2, 'LP-002', '长三角科技集团', 'corporate', 'qualified', 'growth', '南京', 'sent', 5, 5),
  (3, 'LP-003', '未来成长家族办公室', 'family_office', 'qualified', 'balanced', '杭州', 'viewed', 5, 5);

INSERT INTO cap_investor_contacts (contact_id, investor_id, contact_name, title, email, mobile_mask, is_primary) VALUES
  (1, 1, '赵岚', '投资总监', 'laura.zhao@lp.example', '139****1001', 1),
  (2, 2, '刘展', '财务总监', 'eric.liu@lp.example', '139****1002', 1),
  (3, 3, '何舟', '投资副总裁', 'mia.he@lp.example', '139****1003', 1);

INSERT INTO cap_fund_commitments (commitment_id, fund_id, investor_id, commitment_code, committed_amount, paid_in_amount, ownership_units, admission_date, status, disclosure_status, created_by) VALUES
  (1, 1, 1, 'COM-001', 500000000.0000, 420000000.0000, 420000000.000000, '2022-04-15', 'active', 'confirmed', 3),
  (2, 1, 2, 'COM-002', 350000000.0000, 310000000.0000, 310000000.000000, '2022-04-15', 'active', 'sent', 3),
  (3, 2, 3, 'COM-003', 120000000.0000, 90000000.0000, 90000000.000000, '2023-06-01', 'active', 'viewed', 3);

INSERT INTO cap_investor_touchpoints (touchpoint_id, investor_id, contact_id, owner_user_id, touchpoint_kind, occurred_at, subject, summary, next_step) VALUES
  (1, 1, 1, 5, 'meeting', '2026-06-28 15:30:00', 'Q2 披露材料评审', '回顾基金业绩与风险看板。', '发送签署版会议纪要'),
  (2, 2, 2, 5, 'email', '2026-07-01 11:20:00', '实缴出资提醒', '确认打款时间安排。', '跟进到账确认');

INSERT INTO cap_projects (project_id, project_code, short_name, legal_name, registry_code_mask, opportunity_status, stage_label, industry_group, city, registered_location, owner_user_id, source_channel, summary, thesis, product_note, highlight_note, created_by) VALUES
  (1, 'PRJ-001', '矩阵医疗', '矩阵精准医疗股份有限公司', '9131****0001', 'approved', '立项', '医疗器械', '上海', '上海', 2, '合伙人推荐', 'AI 医疗器械平台。', '注册审批路径与医院渠道构成进入壁垒。', '诊断硬件加软件工作流。', '医院试点进展良好。', 2),
  (2, 'PRJ-002', '北辰储能', '北辰储能系统有限公司', '9132****0002', 'term_sheet', 'TS', '新能源储能', '常州', '江苏', 2, '行业扫描', '集装箱式储能系统集成商。', '电网灵活性需求带动增长。', 'BMS 与热管理技术栈。', '已签约战略客户。', 2),
  (3, 'PRJ-003', '澜舟机器人', '澜舟机器人科技有限公司', '9144****0003', 'diligence', '尽调', '机器人', '深圳', '广东', 2, '研究挖掘', '具身智能机器人公司。', '垂直场景提升变现确定性。', '机械臂加感知模块。', 'ARR 增长迅速。', 2),
  (4, 'PRJ-004', '青穹芯片', '青穹半导体有限公司', '9132****0004', 'committee', '投决', '半导体', '南京', '江苏', 2, '联合投资方推荐', '专用推理芯片公司。', '国产替代与边缘 AI 需求。', 'Chiplet 架构。', '关联交易披露风险较高。', 2),
  (5, 'PRJ-005', '星禾农业', '星禾农业科技有限公司', '9151****0005', 'portfolio', '投后', '农业科技', '成都', '四川', 2, '存量被投企业', '智慧农业运营平台。', '农村数字化叠加服务收入。', '农场 SaaS 加物联网网关。', '需要现金流修复方案。', 2);

INSERT INTO cap_project_members (project_id, user_id, member_role, joined_on) VALUES
  (1, 2, 'owner', '2026-05-18'), (1, 4, 'legal', '2026-05-20'),
  (2, 2, 'owner', '2026-06-02'), (3, 2, 'owner', '2026-06-18'),
  (4, 4, 'legal', '2026-06-24'), (5, 2, 'portfolio_owner', '2025-11-01');

INSERT INTO cap_project_stage_events (project_id, from_stage, to_stage, event_reason, event_at, actor_user_id, notes) VALUES
  (1, '初筛', '立项', '周会评审通过', '2026-05-18 10:00:00', 2, '进入立项审批流程'),
  (2, '立项', 'TS', '已出具 TS', '2026-06-10 14:00:00', 2, '更新清算优先权条款'),
  (3, 'TS', '尽调', '尽调启动', '2026-06-18 09:30:00', 2, '法务与财务尽调进行中');

INSERT INTO cap_investment_positions (investment_position_id, fund_id, project_id, position_code, round_label, agreement_amount, first_payment_on, cumulative_paid_amount, current_ownership_ratio, latest_valuation, realized_return_amount, exit_status, investment_status, owner_user_id, created_by) VALUES
  (1, 1, 3, 'POS-001', 'A+', 72000000.0000, '2026-06-30', 54000000.0000, 0.078000, 920000000.0000, 0.0000, 'none', 'funded', 2, 2),
  (2, 2, 2, 'POS-002', 'B', 90000000.0000, '2026-07-01', 45000000.0000, 0.062000, 1450000000.0000, 0.0000, 'none', 'signed', 2, 2),
  (3, 3, 1, 'POS-003', 'C', 58000000.0000, '2026-06-20', 30000000.0000, 0.036000, 1100000000.0000, 0.0000, 'none', 'monitoring', 2, 2);

INSERT INTO cap_equity_changes (equity_change_id, investment_position_id, project_id, fund_id, change_code, change_reason, agreement_date, approval_date, round_label, is_lead_investor, investment_method, pre_money_ratio, post_money_ratio, share_count_delta, notes, created_by) VALUES
  (1, 1, 3, 1, 'EQ-001', '追加投资', '2026-06-28', '2026-06-25', 'A+', 0, 'equity', 0.059000, 0.078000, 250000.000000, '与现有联合投资方跟投。', 2),
  (2, 2, 2, 2, 'EQ-002', '首次投资', '2026-06-18', '2026-06-12', 'B', 1, 'equity', 0.041000, 0.062000, 400000.000000, '领投方权益条款。', 2);

INSERT INTO cap_cashflows (cashflow_id, fund_id, investor_id, project_id, investment_position_id, cashflow_code, cashflow_kind, direction, amount, currency, occurred_on, settlement_status, description, created_by) VALUES
  (1, 1, 1, NULL, NULL, 'CF-001', 'investor_call', 'inflow', 80000000.0000, 'CNY', '2026-06-28', 'reconciled', 'LP 实缴出资', 3),
  (2, 2, NULL, 2, 2, 'CF-002', 'project_investment', 'outflow', 45000000.0000, 'CNY', '2026-07-01', 'submitted', '项目打款待托管复核', 3),
  (3, 1, NULL, 3, 1, 'CF-003', 'project_return', 'inflow', 12600000.0000, 'CNY', '2026-07-01', 'settled', '项目回款待分配', 3);

INSERT INTO cap_project_valuations (project_valuation_id, project_id, fund_id, valuation_date, valuation_method, pre_money_value, post_money_value, holding_value, confidence_level, notes, created_by) VALUES
  (1, 3, 1, '2026-06-30', 'latest_round', 850000000.0000, 920000000.0000, 71760000.0000, 'high', '基于最新一轮融资。', 2),
  (2, 2, 2, '2026-06-30', 'latest_round', 1360000000.0000, 1450000000.0000, 89900000.0000, 'medium', 'TS 定稿前暂估。', 2);

INSERT INTO cap_fund_financial_reports (fund_financial_report_id, fund_id, period_code, report_kind, total_assets, total_liabilities, net_assets, paid_in_capital, distributed_amount, report_status, metrics_json, prepared_by, approved_by) VALUES
  (1, 1, '2026Q2', 'quarterly', 1710000000.0000, 30000000.0000, 1680000000.0000, 1520000000.0000, 210000000.0000, 'approved', '{"dpi":0.22,"tvpi":1.31,"moic":1.42}', 3, 1),
  (2, 2, '2026Q2', 'quarterly', 1450000000.0000, 30000000.0000, 1420000000.0000, 1330000000.0000, 80000000.0000, 'reviewing', '{"dpi":0.08,"tvpi":1.12,"moic":1.18}', 3, 1);

INSERT INTO cap_fund_navs (fund_nav_id, fund_id, nav_date, net_asset_value, unit_nav, valuation_basis, disclosure_status, created_by) VALUES
  (1, 1, '2026-06-30', 1680000000.0000, 1.186200, '季度估值模型', 'scheduled', 3),
  (2, 2, '2026-06-30', 1420000000.0000, 1.071000, '季度估值模型', 'internal', 3);

INSERT INTO cap_portfolio_reports (portfolio_report_id, project_id, report_period, report_frequency, revenue_amount, net_profit_amount, cash_balance, employee_count, valuation_amount, submission_status, submitted_at, reviewed_by, metrics_json, created_by) VALUES
  (1, 5, '2026-06', 'monthly', 11200000.0000, -900000.0000, 7400000.0000, 86, 480000000.0000, 'reviewed', '2026-07-01 10:00:00', 2, '{"burn_months":5}', 2),
  (2, 3, '2026-06', 'monthly', 28600000.0000, 3200000.0000, 63000000.0000, 214, 920000000.0000, 'reviewed', '2026-07-01 11:00:00', 2, '{"arr_growth":0.42}', 2),
  (3, 1, '2026-06', 'monthly', 7800000.0000, -2100000.0000, 34000000.0000, 132, 1100000000.0000, 'submitted', '2026-07-02 09:00:00', NULL, '{"clinical_status":"delayed"}', 2);

INSERT INTO cap_data_collection_campaigns (collection_campaign_id, campaign_code, campaign_name, period_code, frequency, due_on, send_mode, status, created_by) VALUES
  (1, 'COL-202606', '2026 年 6 月投后数据收集', '2026-06', 'monthly', '2026-07-05', 'mixed', 'collecting', 2);

INSERT INTO cap_data_collection_items (collection_item_id, collection_campaign_id, project_id, portfolio_report_id, external_recipient_mask, send_status, fill_status, last_sent_at, submitted_at, notes) VALUES
  (1, 1, 5, 1, 'finance@starfield.example', 'sent', 'reviewed', '2026-07-01 09:00:00', '2026-07-01 10:00:00', '投后负责人已复核'),
  (2, 1, 1, 3, 'finance@matrix.example', 'reminded', 'submitted', '2026-07-02 09:00:00', '2026-07-02 09:00:00', '待复核');

INSERT INTO cap_meetings (meeting_id, meeting_code, meeting_title, meeting_kind, project_id, fund_id, scheduled_at, organizer_user_id, decision_result, ai_summary, discussion_points_json, confirmation_status) VALUES
  (1, 'MTG-001', '矩阵医疗投决会', 'investment_committee', 1, 3, '2026-07-06 14:00:00', 2, 'pending', 'AI 草稿:补充临床路径材料后推进上会。', '["临床计划","资金用途","估值"]', 'ai_draft'),
  (2, 'MTG-002', '成长一期基金 LP 例会', 'portfolio_review', NULL, 1, '2026-07-09 16:00:00', 5, 'information_only', 'LP 例会材料已准备就绪。', '["业绩表现","风险","信息披露"]', 'human_confirmed');

INSERT INTO cap_meeting_actions (meeting_action_id, meeting_id, action_title, owner_user_id, due_on, action_status) VALUES
  (1, 1, '补充临床路径备忘录', 2, '2026-07-04', 'open'),
  (2, 1, '更新投资备忘录', 4, '2026-07-05', 'in_progress');

INSERT INTO cap_announcements (announcement_id, announcement_code, title, body_text, audience_scope_json, publish_status, published_at, created_by) VALUES
  (1, 'ANN-001', '投后月报填报窗口开放', '请在截止日期前提交 6 月投后经营数据。', '{"roles":["investment_manager","portfolio_manager"]}', 'published', '2026-07-01 09:00:00', 3),
  (2, 'ANN-002', 'Q2 投委会材料归档提醒', '请归档 Q2 投委会材料与签署版会议纪要。', '{"roles":["investment_manager","risk_legal"]}', 'published', '2026-06-30 10:00:00', 4);

INSERT INTO cap_announcement_reads (announcement_id, user_id, read_at, delivery_status) VALUES
  (1, 2, '2026-07-01 09:10:00', 'read'), (1, 3, NULL, 'delivered'), (2, 4, '2026-06-30 11:00:00', 'read');

INSERT INTO cap_calendar_events (calendar_event_id, event_code, event_title, event_kind, linked_entity_type, linked_entity_id, starts_at, ends_at, organizer_user_id, location_text, visibility) VALUES
  (1, 'EVT-001', '矩阵医疗投决会', 'meeting', 'project', 1, '2026-07-06 14:00:00', '2026-07-06 15:30:00', 2, 'A会议室', 'department'),
  (2, 'EVT-002', '澜舟机器人法务尽调', 'project', 'project', 3, '2026-07-04 10:30:00', '2026-07-04 12:00:00', 4, 'B会议室', 'department'),
  (3, 'EVT-003', '成长一期基金 LP 例会', 'fund', 'fund', 1, '2026-07-09 16:00:00', '2026-07-09 17:00:00', 5, '线上', 'company');

INSERT INTO cap_messages (message_id, recipient_user_id, sender_user_id, message_code, source_kind, source_entity_type, source_entity_id, title, body_text, message_box, action_status) VALUES
  (1, 3, 2, 'MSG-001', 'workflow', 'cashflow', 2, '付款审批待处理', '北辰储能打款正在等待托管复核。', 'todo', 'pending'),
  (2, 2, 4, 'MSG-002', 'risk', 'risk_incident', 1, '高风险事件提报', '星禾农业现金余额跌破安全线。', 'unread', 'pending'),
  (3, 4, 2, 'MSG-003', 'document', 'document', 3, 'TS 条款更新', '北辰储能 TS 新增清算优先权条款。', 'cc', 'none');

INSERT INTO cap_workflow_templates (workflow_template_id, template_code, template_name, workflow_family, workflow_kind, version_no, is_active, owner_org_id, config_json, created_by) VALUES
  (1, 'WF-PRJ-APPROVAL', '项目立项审批流程', 'project', 'project_approval', 1, 1, 3, '{"archive":true}', 7),
  (2, 'WF-FUND-PAYMENT', '基金付款审批流程', 'fund', 'fund_payment', 1, 1, 4, '{"archive":true}', 7),
  (3, 'WF-OA-SEAL', '用印审批流程', 'office', 'seal', 1, 1, 5, '{"archive":true}', 7);

INSERT INTO cap_workflow_steps (workflow_step_id, workflow_template_id, step_key, step_name, step_type, sort_order, assignee_rule_json, is_required) VALUES
  (1, 1, 'start', '发起', 'start', 1, '{"role":"investment_manager"}', 1),
  (2, 1, 'legal_review', '法务审核', 'legal_check', 2, '{"role":"risk_legal"}', 1),
  (3, 1, 'archive', '归档', 'archive', 3, '{"role":"system_admin"}', 1),
  (4, 2, 'finance_check', '财务复核', 'finance_check', 1, '{"role":"fund_operator"}', 1),
  (5, 3, 'legal_review', '用印审核', 'legal_check', 1, '{"role":"risk_legal"}', 1);

INSERT INTO cap_workflow_instances (workflow_instance_id, workflow_template_id, instance_code, title, initiator_user_id, related_project_id, related_fund_id, instance_status, current_step_key, payload_json, started_at) VALUES
  (1, 1, 'WFI-001', '矩阵医疗项目立项审批', 2, 1, NULL, 'running', 'legal_review', '{"amount":58000000}', '2026-07-01 09:30:00'),
  (2, 2, 'WFI-002', '北辰储能项目打款', 3, 2, 2, 'running', 'finance_check', '{"amount":45000000}', '2026-07-01 11:00:00'),
  (3, 3, 'WFI-003', 'TS 修订用印申请', 2, 2, NULL, 'running', 'legal_review', '{"document":"TS 修订件"}', '2026-07-02 09:00:00');

INSERT INTO cap_workflow_tasks (workflow_task_id, workflow_instance_id, workflow_step_id, task_code, task_name, assigned_user_id, task_status, due_at, action_comment) VALUES
  (1, 1, 2, 'TASK-001', '审核立项材料包', 4, 'pending', '2026-07-05 18:00:00', NULL),
  (2, 2, 4, 'TASK-002', '核验托管打款', 3, 'pending', '2026-07-03 18:00:00', NULL),
  (3, 3, 5, 'TASK-003', '审批用印申请', 4, 'pending', '2026-07-02 18:00:00', NULL);

INSERT INTO cap_workflow_delegations (delegation_id, delegator_user_id, delegatee_user_id, workflow_family, starts_at, ends_at, is_active, reason) VALUES
  (1, 4, 7, 'all', '2026-07-02 00:00:00', '2026-07-12 23:59:59', 1, '休假期间代审');

INSERT INTO cap_documents (document_id, document_code, title, document_kind, storage_uri, file_name, mime_type, file_size_bytes, current_version_no, checksum_hash, access_level, watermark_policy, fulltext_status, uploaded_by) VALUES
  (1, 'DOC-001', '矩阵医疗 BP', 'project', 'mock://documents/matrix-bp-v3.pdf', 'matrix-medical-bp-v3.pdf', 'application/pdf', 2457600, 3, 'DEMO_CHECKSUM_001', 'team', 'always', 'indexed', 2),
  (2, 'DOC-002', '成长一期基金 Q2 披露包', 'fund', 'mock://documents/growth-q2-pack.zip', 'growth-fund-q2-disclosure.zip', 'application/zip', 5242880, 1, 'DEMO_CHECKSUM_002', 'restricted', 'download', 'indexed', 3),
  (3, 'DOC-003', '北辰储能 TS', 'workflow', 'mock://documents/northstar-ts-v5.docx', 'northstar-storage-ts-v5.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 524288, 5, 'DEMO_CHECKSUM_003', 'restricted', 'always', 'indexed', 4),
  (4, 'DOC-004', '硬科技赛道周报', 'research', 'mock://documents/hardtech-weekly.pptx', 'hardtech-weekly.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 1048576, 2, 'DEMO_CHECKSUM_004', 'company', 'viewer', 'indexed', 6);

INSERT INTO cap_document_versions (document_version_id, document_id, version_no, storage_uri, file_size_bytes, checksum_hash, change_note, uploaded_by, uploaded_at) VALUES
  (1, 1, 3, 'mock://documents/matrix-bp-v3.pdf', 2457600, 'DEMO_CHECKSUM_001', '更新财务计划。', 2, '2026-06-29 12:00:00'),
  (2, 3, 5, 'mock://documents/northstar-ts-v5.docx', 524288, 'DEMO_CHECKSUM_003', '更新清算优先权条款。', 4, '2026-07-01 16:00:00');

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
  (1, 'document', 99, '矩阵医疗旧版 BP.pdf', '重复上传', '2026-07-25 00:00:00', 'recoverable', 2, '2026-06-25 10:00:00'),
  (2, 'workflow', 88, '成长一期过期披露任务', '已用新模板重建', '2026-07-20 00:00:00', 'recoverable', 7, '2026-06-20 15:00:00');

INSERT INTO cap_risk_clauses (risk_clause_id, fund_id, project_id, investment_position_id, clause_code, round_label, clause_kind, clause_status, clause_summary, clause_body, reminder_on, owner_user_id, created_by) VALUES
  (1, 2, 2, 2, 'RC-001', 'B', 'redemption', 'active', '里程碑未达成触发回购权。', '基于里程碑的回购权需每季度复核。', '2026-07-09', 4, 4),
  (2, 3, 1, 3, 'RC-002', 'C', 'milestone', 'triggered', '临床里程碑延期条款。', '临床审批时间延期触发报告义务。', '2026-07-12', 4, 4);

INSERT INTO cap_risk_incidents (risk_incident_id, project_id, fund_id, incident_code, incident_title, severity, occurred_at, owner_user_id, incident_status, response_plan, latest_progress, created_by) VALUES
  (1, 5, 1, 'RI-001', '现金余额低于安全线', 'high', '2026-07-02 08:30:00', 2, 'mitigating', '每周现金管控并推动回款。', '创始人已同意修订后的回款计划。', 2),
  (2, 4, 1, 'RI-002', '关联交易披露不完整', 'high', '2026-07-01 17:00:00', 4, 'watching', '要求提供完整披露材料包。', '法务审查进行中。', 4);

INSERT INTO cap_risk_updates (risk_update_id, risk_incident_id, update_text, update_status, created_by) VALUES
  (1, 1, '已要求提供周度现金报表与销售回款计划。', 'plan', 2),
  (2, 2, '已收到第一批关联方文件。', 'progress', 4);

INSERT INTO cap_research_notes (research_note_id, note_code, note_title, note_kind, source_name, source_url, tag_json, abstract_text, ai_summary, review_status, owner_user_id, created_by) VALUES
  (1, 'RES-001', '具身智能供应链季度跟踪', 'market_clip', '内部访谈', 'mock://research/embodied-ai', '["机器人","传感器","控制器"]', '供应链成本与瓶颈梳理。', 'AI 摘要:控制器与传感器成本曲线持续改善。', 'approved', 6, 6),
  (2, 'RES-002', '储能系统集成商毛利拆解', 'internal_report', '专家访谈', 'mock://research/storage-margin', '["储能","电芯"]', '各集成商毛利桥对比。', 'AI 摘要:热管理模块是关键毛利杠杆。', 'reviewing', 6, 6);

INSERT INTO cap_research_links (research_link_id, research_note_id, linked_entity_type, linked_entity_id, relevance_note) VALUES
  (1, 1, 'project', 3, '支撑机器人供应链尽调。'),
  (2, 2, 'project', 2, '支撑 TS 谈判假设。');

INSERT INTO cap_ai_parse_jobs (ai_parse_job_id, job_code, job_name, source_document_id, source_text_hash, parse_kind, requested_by, job_status, started_at, completed_at) VALUES
  (1, 'AI-001', '矩阵医疗 BP 字段抽取', 1, 'DEMO_TEXT_HASH_001', 'business_plan', 2, 'completed', '2026-07-02 09:00:00', '2026-07-02 09:02:00'),
  (2, 'AI-002', '北辰储能 TS 条款抽取', 3, 'DEMO_TEXT_HASH_002', 'contract', 4, 'completed', '2026-07-02 09:03:00', '2026-07-02 09:05:00'),
  (3, 'AI-003', '矩阵医疗投决会纪要', NULL, 'DEMO_TEXT_HASH_003', 'meeting_minutes', 2, 'running', '2026-07-02 10:00:00', NULL);

INSERT INTO cap_ai_parse_outputs (ai_parse_output_id, ai_parse_job_id, output_kind, target_entity_type, target_entity_id, confidence_score, output_json, human_status, confirmed_by, confirmed_at) VALUES
  (1, 1, 'field_extraction', 'project', 1, 0.92000, '{"company":"矩阵医疗","sector":"医疗器械","round":"C"}', 'accepted', 2, '2026-07-02 09:10:00'),
  (2, 2, 'risk_clause', 'risk_clause', 1, 0.88000, '{"clause":"redemption","reminder":"2026-07-09"}', 'edited', 4, '2026-07-02 09:20:00'),
  (3, 3, 'meeting_minutes', 'meeting', 1, 0.61000, '{"summary":"草稿产出,等待人工确认"}', 'pending', NULL, NULL);

INSERT INTO cap_ai_sessions (ai_session_id, session_code, session_title, session_kind, owner_user_id, linked_entity_type, linked_entity_id, session_status) VALUES
  (1, 'AIS-001', '项目尽调问答', 'research_qna', 2, 'project', 3, 'open'),
  (2, 'AIS-002', '披露材料解析', 'document_parse', 3, 'fund', 1, 'open');

INSERT INTO cap_ai_messages (ai_message_id, ai_session_id, speaker, message_body, citations_json, model_label) VALUES
  (1, 1, 'user', '总结机器人供应链风险。', NULL, NULL),
  (2, 1, 'assistant', '控制器供应与传感器价格是主要关注点。', '["RES-001","DOC-004"]', 'mock-model'),
  (3, 2, 'assistant', '披露包已齐备,仅缺 LP 签署回执。', '["DOC-002"]', 'mock-model');

INSERT INTO cap_report_snapshots (report_snapshot_id, snapshot_code, snapshot_name, report_scope, scope_entity_id, period_start, period_end, irr_value, dpi_value, tvpi_value, moic_value, metrics_json, created_by) VALUES
  (1, 'RPT-2026Q2', '公司驾驶舱 2026 Q2', 'company', NULL, '2026-04-01', '2026-06-30', 0.186000, 0.220000, 1.310000, 1.420000, '{"industry":{"Robotics":0.24,"Healthcare":0.18,"Energy":0.22},"risk_hotspots":6}', 1);

INSERT INTO cap_import_export_tasks (import_export_task_id, task_code, task_kind, entity_type, task_status, source_file_uri, result_file_uri, total_rows, success_rows, failed_rows, error_summary, requested_by, requested_at, completed_at) VALUES
  (1, 'IET-001', 'import', 'project', 'failed', 'mock://imports/projects.xlsx', 'mock://imports/projects-errors.xlsx', 49, 43, 6, '6 行校验失败。', 2, '2026-07-02 09:30:00', '2026-07-02 09:33:00'),
  (2, 'IET-002', 'export', 'fund_cashflow', 'completed', NULL, 'mock://exports/fund-cashflow.csv', 128, 128, 0, NULL, 3, '2026-07-01 17:12:00', '2026-07-01 17:20:00');

INSERT INTO cap_custom_field_definitions (custom_field_id, entity_type, field_key, field_label, data_type, option_set_code, is_required, is_searchable, validation_json, display_order, created_by) VALUES
  (1, 'project', 'esg_rating', 'ESG 评级', 'select', 'esg_rating', 0, 1, '{"allowed":["A","B","C"]}', 10, 7),
  (2, 'fund', 'state_filing_no', '国资备案编号', 'text', NULL, 1, 1, '{"maxLength":80}', 20, 7),
  (3, 'document', 'secondary_auth_level', '二次鉴权级别', 'select', 'auth_level', 1, 1, '{"allowed":["normal","strict"]}', 30, 7);

INSERT INTO cap_form_layouts (form_layout_id, layout_code, entity_type, layout_name, screen_code, layout_json, is_active, created_by) VALUES
  (1, 'LAYOUT-PROJECT-ADD', 'project', '新增项目表单', 'project-add', '{"sections":["AI 预填","基础信息","描述","附件"]}', 1, 7),
  (2, 'LAYOUT-FUND-ADD', 'fund', '新增基金表单', 'fund-add', '{"sections":["基础信息","规模","治理","披露"]}', 1, 7);

INSERT INTO cap_option_sets (option_set_id, option_set_code, option_set_name, options_json, is_active, created_by) VALUES
  (1, 'project_stage', '项目阶段选项', '["入库","立项","TS","尽调","投决","投资协议","打款","投后服务"]', 1, 7),
  (2, 'risk_level', '风险等级选项', '["low","medium","high","critical"]', 1, 7),
  (3, 'auth_level', '文档鉴权级别选项', '["normal","strict"]', 1, 7);

INSERT INTO cap_audit_logs (audit_log_id, actor_user_id, action_code, entity_type, entity_id, entity_label, request_id, ip_mask, before_json, after_json, risk_level, occurred_at) VALUES
  (1, 7, 'permission.update', 'role', 8, '只读审计', 'REQ-001', '10.0.*.*', '{"can_export":true}', '{"can_export":false}', 'medium', '2026-07-02 09:40:00'),
  (2, 2, 'project.create', 'project', 1, '矩阵医疗', 'REQ-002', '10.0.*.*', NULL, '{"stage":"立项"}', 'low', '2026-07-02 09:42:00'),
  (3, 4, 'document.download', 'document', 3, '北辰储能 TS', 'REQ-003', '10.0.*.*', '{"secondary_auth":false}', '{"secondary_auth":true}', 'high', '2026-07-02 09:50:00');
