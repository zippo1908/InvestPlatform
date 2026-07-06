-- 项目卡片 section 种子:三会(cap_meetings + actions)与日程(cap_calendar_events)demo 数据。
-- 表本身是既有 schema,这里只补项目3的行。幂等:按 project_id / event_code 先删后插。
-- 运行(务必 utf8mb4):
--   docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_project_sections.sql

-- ── 三会(投委会 / 董事会 / 股东会)──
DELETE FROM cap_meeting_actions WHERE meeting_id IN (SELECT meeting_id FROM cap_meetings WHERE project_id=3);
DELETE FROM cap_meetings WHERE project_id=3;

INSERT INTO cap_meetings (meeting_code, meeting_title, meeting_kind, project_id, scheduled_at, decision_result, ai_summary, confirmation_status) VALUES
  ('MTG-P3-IC', '兰州机器人 A+ 轮投委会', 'investment_committee', 3, '2026-06-28 14:00:00', 'approved',        '投委会同意以 A+ 轮领投,金额上限 7200 万,持股约 7.8%。', 'human_confirmed'),
  ('MTG-P3-BD', '兰州机器人 2026Q2 董事会', 'board',              3, '2026-07-05 10:00:00', 'information_only', '汇报量产进度与现金流,审议并通过下一季度预算。',        'ai_draft'),
  ('MTG-P3-SH', '兰州机器人临时股东会',    'shareholder',         3, '2026-07-10 15:00:00', 'pending',          '审议增资扩股与期权池调整方案,待表决。',              'ai_draft');

INSERT INTO cap_meeting_actions (meeting_id, action_title, due_on, action_status)
SELECT meeting_id, '完成 A+ 轮打款(5400 万)', '2026-07-15', 'in_progress' FROM cap_meetings WHERE meeting_code='MTG-P3-IC'
UNION ALL
SELECT meeting_id, '委派董事进入被投企业董事会', '2026-07-08', 'done' FROM cap_meetings WHERE meeting_code='MTG-P3-IC'
UNION ALL
SELECT meeting_id, '准备下季度预算材料', '2026-07-03', 'open' FROM cap_meetings WHERE meeting_code='MTG-P3-BD';

-- ── 日程(项目相关事件;既有一条 Legal Diligence,补两条)──
DELETE FROM cap_calendar_events WHERE event_code IN ('CAL-P3-1', 'CAL-P3-2');
INSERT INTO cap_calendar_events (event_code, event_title, event_kind, linked_entity_type, linked_entity_id, starts_at, ends_at, location_text, visibility, tenant_id) VALUES
  ('CAL-P3-1', '兰州机器人 2026Q2 董事会', 'meeting', 'project', 3, '2026-07-05 10:00:00', '2026-07-05 11:30:00', '线上会议', 'department', 1),
  ('CAL-P3-2', '兰州机器人现场尽调回访',   'project', 'project', 3, '2026-07-12 09:00:00', '2026-07-12 17:00:00', '深圳',     'department', 1);
