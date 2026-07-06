-- 流程编排:给 3 个流程模板种入真实有序步骤(cap_workflow_steps 原本为空)。
-- 有了步骤,发起→首步任务,审批通过→自动流转下一步,末步通过→实例 approved,驳回→rejected。
-- 幂等:按 family 定位模板,先清该模板旧步骤再插入(可重复运行)。
-- 运行(务必带 --default-character-set=utf8mb4,否则中文会双重编码成乱码):
--   docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_workflow_steps.sql

SET @proj := (SELECT workflow_template_id FROM cap_workflow_templates WHERE workflow_family='project' ORDER BY workflow_template_id LIMIT 1);
SET @fund := (SELECT workflow_template_id FROM cap_workflow_templates WHERE workflow_family='fund'    ORDER BY workflow_template_id LIMIT 1);
SET @offc := (SELECT workflow_template_id FROM cap_workflow_templates WHERE workflow_family='office'  ORDER BY workflow_template_id LIMIT 1);

DELETE FROM cap_workflow_steps WHERE workflow_template_id IN (@proj, @fund, @offc);

-- 项目审批:立项 → 尽调 → 投决 → 归档
INSERT INTO cap_workflow_steps (workflow_template_id, step_key, step_name, step_type, sort_order, assignee_rule_json, is_required) VALUES
  (@proj, 'screening', '立项审查', 'approval', 1, JSON_OBJECT('role','investment_manager'), 1),
  (@proj, 'diligence', '尽调复核', 'review',   2, JSON_OBJECT('role','investment_manager'), 1),
  (@proj, 'ic',        '投决审批', 'approval', 3, JSON_OBJECT('role','managing_partner'),   1),
  (@proj, 'archive',   '归档',     'archive',  4, JSON_OBJECT('role','managing_partner'),   1);

-- 基金付款:付款申请 → 财务复核 → 合伙人审批 → 归档
INSERT INTO cap_workflow_steps (workflow_template_id, step_key, step_name, step_type, sort_order, assignee_rule_json, is_required) VALUES
  (@fund, 'apply',   '付款申请',   'approval',      1, JSON_OBJECT('role','fund_operator'),     1),
  (@fund, 'finance', '财务复核',   'finance_check', 2, JSON_OBJECT('role','fund_operator'),     1),
  (@fund, 'approve', '合伙人审批', 'approval',      3, JSON_OBJECT('role','managing_partner'), 1),
  (@fund, 'archive', '归档',       'archive',       4, JSON_OBJECT('role','managing_partner'), 1);

-- 用印流程:用印申请 → 法务审核 → 负责人审批 → 归档
INSERT INTO cap_workflow_steps (workflow_template_id, step_key, step_name, step_type, sort_order, assignee_rule_json, is_required) VALUES
  (@offc, 'apply',   '用印申请',   'approval',    1, JSON_OBJECT('role','fund_operator'),     1),
  (@offc, 'legal',   '法务审核',   'legal_check', 2, JSON_OBJECT('role','risk_legal'),        1),
  (@offc, 'approve', '负责人审批', 'approval',    3, JSON_OBJECT('role','managing_partner'), 1),
  (@offc, 'archive', '归档',       'archive',     4, JSON_OBJECT('role','managing_partner'), 1);
