-- =====================================================================
-- i18n-20260712-chinese-demo.sql
-- 用途:把线上库(capitalos)中残留的英文演示文案翻译成中文。
--       译名与 frontend/src/data.ts、frontend/db/seed.sql 的中文基准保持一致。
-- 执行方法(先备份!):
--   docker exec -i investplatform-mysql mysql -uroot -p"$(cat /home/tinci/.investplatform-mysql-root)" \
--     --default-character-set=utf8mb4 capitalos < deploy/db/i18n-20260712-chinese-demo.sql
-- 安全性 / 幂等性:
--   * 每条 UPDATE 都用 主键(或唯一定位键)+ 旧英文值 双重条件;
--     用户手工改过的行不会被覆盖,重跑无害(第二次全部命中 0 行)。
--   * 仅翻译用户可见文案;枚举代码列(opportunity_status、*_status、*_kind、
--     direction、severity、risk_level、message_box、data_scope、role_code、
--     login_name、email、编码、文件名、JSON key)一律不动。
--   * cap_audit_logs 为追加型日志(用户不可编辑),按 entity_label 旧值精确匹配
--     批量更新,不逐条列主键。
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 组织
-- ---------------------------------------------------------------------
UPDATE cap_organizations SET org_name='CapitalOS 演示集团' WHERE org_id=1 AND org_name='CapitalOS Demo Group';
UPDATE cap_organizations SET org_name='高管办公室'       WHERE org_id=2 AND org_name='Executive Office';
UPDATE cap_organizations SET org_name='投资部'           WHERE org_id=3 AND org_name='Investment Team';
UPDATE cap_organizations SET org_name='基金运营部'       WHERE org_id=4 AND org_name='Fund Operations';
UPDATE cap_organizations SET org_name='风控法务部'       WHERE org_id=5 AND org_name='Risk And Legal';
UPDATE cap_organizations SET org_name='投资人关系部'     WHERE org_id=6 AND org_name='Investor Relations';
UPDATE cap_organizations SET org_name='平台管理部'       WHERE org_id=7 AND org_name='Platform Administration';
UPDATE cap_organizations SET org_name='经纬资本集团'     WHERE org_id=8 AND org_name='Meridian Capital Group';
UPDATE cap_organizations SET org_name='经纬投资部'       WHERE org_id=9 AND org_name='Meridian Investment';

-- ---------------------------------------------------------------------
-- 用户(display_name + profile_json.title;login_name/email 不动)
-- ---------------------------------------------------------------------
UPDATE cap_users SET display_name='陈嘉'     WHERE user_id=1  AND display_name='Alex Chen';
UPDATE cap_users SET display_name='林蔚'     WHERE user_id=2  AND display_name='Nina Lin';
UPDATE cap_users SET display_name='周旻'     WHERE user_id=3  AND display_name='Omar Zhou';
UPDATE cap_users SET display_name='罗澜'     WHERE user_id=4  AND display_name='Lena Luo';
UPDATE cap_users SET display_name='顾漪'     WHERE user_id=5  AND display_name='Iris Gu';
UPDATE cap_users SET display_name='叶锐'     WHERE user_id=6  AND display_name='Ryan Ye';
UPDATE cap_users SET display_name='孟森'     WHERE user_id=7  AND display_name='Sam Meng';
UPDATE cap_users SET display_name='审计专员' WHERE user_id=8  AND display_name='Casey Audit';
UPDATE cap_users SET display_name='演示用户' WHERE user_id=9  AND display_name='Demo User';
UPDATE cap_users SET display_name='经纬合伙人' WHERE user_id=10 AND display_name='Meridian Partner';
UPDATE cap_users SET display_name='开发者(反馈)' WHERE user_id=11 AND display_name='Developer (Feedback)';

UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','管理合伙人')     WHERE user_id=1 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Managing Partner';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','投资经理')       WHERE user_id=2 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Investment Manager';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','基金运营')       WHERE user_id=3 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Fund Operator';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','风控法务')       WHERE user_id=4 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Risk Legal';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','IR 投资人关系')  WHERE user_id=5 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Investor Relations';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','研究员')         WHERE user_id=6 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Researcher';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','系统管理员')     WHERE user_id=7 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='System Administrator';
UPDATE cap_users SET profile_json=JSON_SET(profile_json,'$.title','只读审计')       WHERE user_id=8 AND JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.title'))='Read Only Auditor';

-- ---------------------------------------------------------------------
-- 角色(role_name/description 翻译;role_code 不动)
-- ---------------------------------------------------------------------
UPDATE cap_roles SET role_name='系统管理员',   description='维护用户、角色、表单、字段、流程与审计。'       WHERE role_id=1 AND role_name='System Administrator';
UPDATE cap_roles SET role_name='管理合伙人',   description='查看驾驶舱、组合表现、储备项目、风险与审批。'   WHERE role_id=2 AND role_name='Managing Partner';
UPDATE cap_roles SET role_name='投资经理',     description='维护项目并推进投资阶段。'                       WHERE role_id=3 AND role_name='Investment Manager';
UPDATE cap_roles SET role_name='基金运营',     description='维护基金、实缴出资、现金流、财报与披露。'       WHERE role_id=4 AND role_name='Fund Operator';
UPDATE cap_roles SET role_name='风控法务',     description='审核尽调、协议、关键条款与风险事件。'           WHERE role_id=5 AND role_name='Risk Legal';
UPDATE cap_roles SET role_name='IR 投资人关系', description='维护投资人、沟通记录与 LP 披露。'              WHERE role_id=6 AND role_name='Investor Relations';
UPDATE cap_roles SET role_name='研究员',       description='维护行研智库、内部笔记与 AI 问答知识。'         WHERE role_id=7 AND role_name='Researcher';
UPDATE cap_roles SET role_name='只读审计',     description='只读访问脱敏记录与审计轨迹。'                   WHERE role_id=8 AND role_name='Read Only Auditor';

-- ---------------------------------------------------------------------
-- 导航菜单
-- ---------------------------------------------------------------------
UPDATE cap_navigation_items SET group_name='入口',       item_name='登录页'             WHERE nav_item_id=1  AND item_name='Login';
UPDATE cap_navigation_items SET group_name='工作台',     item_name='管理层工作台'       WHERE nav_item_id=2  AND item_name='Executive Workbench';
UPDATE cap_navigation_items SET group_name='工作台',     item_name='AI 大模型工作台'    WHERE nav_item_id=3  AND item_name='AI Workspace';
UPDATE cap_navigation_items SET group_name='协同工具',   item_name='通知公告'           WHERE nav_item_id=4  AND item_name='Announcements';
UPDATE cap_navigation_items SET group_name='协同工具',   item_name='日程事件'           WHERE nav_item_id=5  AND item_name='Calendar';
UPDATE cap_navigation_items SET group_name='协同工具',   item_name='消息中心'           WHERE nav_item_id=6  AND item_name='Message Center';
UPDATE cap_navigation_items SET group_name='流程中心',   item_name='流程中心总览'       WHERE nav_item_id=7  AND item_name='Workflow Center';
UPDATE cap_navigation_items SET group_name='流程中心',   item_name='项目类流程'         WHERE nav_item_id=8  AND item_name='Project Workflows';
UPDATE cap_navigation_items SET group_name='流程中心',   item_name='基金类流程'         WHERE nav_item_id=9  AND item_name='Fund Workflows';
UPDATE cap_navigation_items SET group_name='流程中心',   item_name='日常办公流程'       WHERE nav_item_id=10 AND item_name='Office Workflows';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='项目池看板'         WHERE nav_item_id=11 AND item_name='Project Board';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='项目列表'           WHERE nav_item_id=12 AND item_name='Project List';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='新增项目'           WHERE nav_item_id=13 AND item_name='Add Project';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='项目详情-概况'      WHERE nav_item_id=14 AND item_name='Project Detail Overview';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='投资关系'           WHERE nav_item_id=15 AND item_name='Project Investment Relation';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='项目详情-投后数据'  WHERE nav_item_id=16 AND item_name='Project Post Data';
UPDATE cap_navigation_items SET group_name='项目管理',   item_name='纪要解析'           WHERE nav_item_id=17 AND item_name='Meeting AI';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='基金列表'           WHERE nav_item_id=18 AND item_name='Fund List';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='新增基金'           WHERE nav_item_id=19 AND item_name='Add Fund';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='基金详情-概况'      WHERE nav_item_id=20 AND item_name='Fund Detail Overview';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='基金详情-现金流'    WHERE nav_item_id=21 AND item_name='Fund Cashflow';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='基金详情-财报数据'  WHERE nav_item_id=22 AND item_name='Fund Financials';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='投资信息'           WHERE nav_item_id=23 AND item_name='Investment Ledger';
UPDATE cap_navigation_items SET group_name='基金管理',   item_name='权益变动'           WHERE nav_item_id=24 AND item_name='Equity Change';
UPDATE cap_navigation_items SET group_name='投资人',     item_name='投资人列表'         WHERE nav_item_id=25 AND item_name='Investor List';
UPDATE cap_navigation_items SET group_name='投资人',     item_name='投资人详情'         WHERE nav_item_id=26 AND item_name='Investor Detail';
UPDATE cap_navigation_items SET group_name='投资人',     item_name='管理机构'           WHERE nav_item_id=27 AND item_name='Management Organizations';
UPDATE cap_navigation_items SET group_name='投后管理',   item_name='投后数据收集'       WHERE nav_item_id=28 AND item_name='Post Data Collection';
UPDATE cap_navigation_items SET group_name='风险管理',   item_name='项目关键条款'       WHERE nav_item_id=29 AND item_name='Key Clauses';
UPDATE cap_navigation_items SET group_name='风险管理',   item_name='突发风险事务'       WHERE nav_item_id=30 AND item_name='Risk Incidents';
UPDATE cap_navigation_items SET group_name='文档管理',   item_name='文档中心'           WHERE nav_item_id=31 AND item_name='Document Center';
UPDATE cap_navigation_items SET group_name='文档管理',   item_name='流程文件'           WHERE nav_item_id=32 AND item_name='Workflow Files';
UPDATE cap_navigation_items SET group_name='AI 数据库',  item_name='行研智库'           WHERE nav_item_id=33 AND item_name='Research Library';
UPDATE cap_navigation_items SET group_name='AI 数据库',  item_name='内部产研'           WHERE nav_item_id=34 AND item_name='Internal Research';
UPDATE cap_navigation_items SET group_name='报表驾驶舱', item_name='报表驾驶舱'         WHERE nav_item_id=35 AND item_name='Report Dashboard';
UPDATE cap_navigation_items SET group_name='通用能力',   item_name='导入导出中心'       WHERE nav_item_id=36 AND item_name='Import Export Center';
UPDATE cap_navigation_items SET group_name='系统管理',   item_name='用户与组织'         WHERE nav_item_id=37 AND item_name='Users And Organizations';
UPDATE cap_navigation_items SET group_name='系统管理',   item_name='角色与权限'         WHERE nav_item_id=38 AND item_name='Roles And Permissions';
UPDATE cap_navigation_items SET group_name='系统管理',   item_name='字段与表单配置'     WHERE nav_item_id=39 AND item_name='Fields And Forms';
UPDATE cap_navigation_items SET group_name='账户',       item_name='账户与偏好设置'     WHERE nav_item_id=40 AND item_name='Account Settings';
UPDATE cap_navigation_items SET group_name='系统管理',   item_name='回收站'             WHERE nav_item_id=41 AND item_name='Recycle Bin';

-- ---------------------------------------------------------------------
-- 权限(permission_code 不动)
-- ---------------------------------------------------------------------
UPDATE cap_permissions SET permission_name='查看项目', description='查看项目档案'             WHERE permission_id=1 AND permission_name='View projects';
UPDATE cap_permissions SET permission_name='编辑项目', description='编辑项目档案'             WHERE permission_id=2 AND permission_name='Edit projects';
UPDATE cap_permissions SET permission_name='查看基金', description='查看基金档案'             WHERE permission_id=3 AND permission_name='View funds';
UPDATE cap_permissions SET permission_name='导出基金', description='通过异步任务导出基金数据' WHERE permission_id=4 AND permission_name='Export funds';
UPDATE cap_permissions SET permission_name='下载文档', description='需要二次鉴权'             WHERE permission_id=5 AND permission_name='Download documents';
UPDATE cap_permissions SET permission_name='管理风险', description='管理条款与风险事件'       WHERE permission_id=6 AND permission_name='Manage risks';
UPDATE cap_permissions SET permission_name='系统管理', description='管理员功能'               WHERE permission_id=7 AND permission_name='Manage system';
UPDATE cap_permissions SET permission_name='导出报表', description='导出驾驶舱快照'           WHERE permission_id=8 AND permission_name='Export reports';

-- ---------------------------------------------------------------------
-- 用户偏好(表格列名;favorite_nav_json 为 screen code,不动)
-- ---------------------------------------------------------------------
UPDATE cap_user_preferences SET table_view_json='{"project-list":["项目","阶段","负责人","风险"]}' WHERE user_id=1 AND table_view_json LIKE '%"Owner"%';
UPDATE cap_user_preferences SET table_view_json='{"project-list":["项目","阶段","下一步"]}'        WHERE user_id=2 AND table_view_json LIKE '%"Next Step"%';

-- ---------------------------------------------------------------------
-- 安全设备 / 登录事件(设备标签;'deploy frontend' 为技术标签不动)
-- ---------------------------------------------------------------------
UPDATE cap_security_devices SET device_label='Windows Chrome 常用设备' WHERE user_id=1 AND device_label='Windows Chrome Current';
UPDATE cap_security_devices SET device_label='管理员工作站'            WHERE user_id=7 AND device_label='Admin Workstation';
UPDATE cap_login_events SET device_label='Windows Chrome 常用设备' WHERE login_event_id=1 AND device_label='Windows Chrome Current';
UPDATE cap_login_events SET device_label='审计浏览器'              WHERE login_event_id=2 AND device_label='Audit Browser';

-- ---------------------------------------------------------------------
-- 管理机构
-- ---------------------------------------------------------------------
UPDATE cap_management_orgs SET org_name='天启私募基金管理有限公司' WHERE management_org_id=1 AND org_name='CapitalOS Fund Management Co';
UPDATE cap_management_orgs SET org_name='成长一期 GP 合伙企业'     WHERE management_org_id=2 AND org_name='Growth Fund GP Partnership';
UPDATE cap_management_orgs SET org_name='演示托管银行'             WHERE management_org_id=3 AND org_name='Demo Custodian Bank';
UPDATE cap_management_orgs SET city='上海' WHERE management_org_id=1 AND city='Shanghai';
UPDATE cap_management_orgs SET city='苏州' WHERE management_org_id=2 AND city='Suzhou';
UPDATE cap_management_orgs SET city='杭州' WHERE management_org_id=3 AND city='Hangzhou';
UPDATE cap_management_orgs SET contact_name='顾言' WHERE management_org_id=1 AND contact_name='Grace Tang';
UPDATE cap_management_orgs SET contact_name='赵临' WHERE management_org_id=2 AND contact_name='Victor Zhao';
UPDATE cap_management_orgs SET contact_name='邱宁' WHERE management_org_id=3 AND contact_name='Cindy Qiu';

-- ---------------------------------------------------------------------
-- 基金(fund_code / fund_status / raise_method 不动)
-- ---------------------------------------------------------------------
UPDATE cap_funds SET fund_name='成长一期基金' WHERE fund_id=1 AND fund_name='Growth Fund I';
UPDATE cap_funds SET fund_name='双碳一期基金' WHERE fund_id=2 AND fund_name='Carbon Fund I';
UPDATE cap_funds SET fund_name='医疗专项基金' WHERE fund_id=3 AND fund_name='Healthcare Special Fund';
UPDATE cap_funds SET fund_name='经纬一期基金' WHERE fund_id=4 AND fund_name='Meridian Fund I';
UPDATE cap_funds SET legal_name='成长一期基金(有限合伙)' WHERE fund_id=1 AND legal_name='Growth Fund I L.P.';
UPDATE cap_funds SET legal_name='双碳一期基金(有限合伙)' WHERE fund_id=2 AND legal_name='Carbon Fund I L.P.';
UPDATE cap_funds SET legal_name='医疗专项基金(有限合伙)' WHERE fund_id=3 AND legal_name='Healthcare Special Fund L.P.';
UPDATE cap_funds SET legal_name='经纬一期基金(有限合伙)' WHERE fund_id=4 AND legal_name='Meridian Fund I LP';
UPDATE cap_funds SET investment_strategy='成长期硬科技与企业服务。'       WHERE fund_id=1 AND investment_strategy='Growth-stage hard technology and enterprise services.';
UPDATE cap_funds SET investment_strategy='能源转型与碳减排基础设施。'     WHERE fund_id=2 AND investment_strategy='Energy transition and carbon reduction infrastructure.';
UPDATE cap_funds SET investment_strategy='医疗器械、诊断与数字医疗。'     WHERE fund_id=3 AND investment_strategy='Medical devices, diagnostics, and digital health.';
UPDATE cap_funds SET distribution_terms_json=JSON_SET(distribution_terms_json,'$.carry','门槛收益后 20%') WHERE fund_id=1 AND JSON_UNQUOTE(JSON_EXTRACT(distribution_terms_json,'$.carry'))='20% after hurdle';
UPDATE cap_funds SET governance_json=JSON_SET(governance_json,'$.ic','5 人') WHERE fund_id=1 AND JSON_UNQUOTE(JSON_EXTRACT(governance_json,'$.ic'))='5 members';
UPDATE cap_funds SET governance_json=JSON_SET(governance_json,'$.ic','6 人') WHERE fund_id=2 AND JSON_UNQUOTE(JSON_EXTRACT(governance_json,'$.ic'))='6 members';
UPDATE cap_funds SET governance_json=JSON_SET(governance_json,'$.ic','4 人') WHERE fund_id=3 AND JSON_UNQUOTE(JSON_EXTRACT(governance_json,'$.ic'))='4 members';

UPDATE cap_fund_management_orgs SET notes='主要管理人' WHERE fund_id=1 AND management_org_id=1 AND notes='Primary manager';
UPDATE cap_fund_management_orgs SET notes='普通合伙人' WHERE fund_id=1 AND management_org_id=2 AND notes='General partner';
UPDATE cap_fund_management_orgs SET notes='托管服务'   WHERE fund_id=1 AND management_org_id=3 AND notes='Custody service';

UPDATE cap_fund_key_people SET person_name='陈嘉' WHERE fund_id=1 AND user_id=1 AND person_name='Alex Chen';
UPDATE cap_fund_key_people SET person_name='林蔚' WHERE fund_id=1 AND user_id=2 AND person_name='Nina Lin';
UPDATE cap_fund_key_people SET person_name='罗澜' WHERE fund_id=2 AND user_id=4 AND person_name='Lena Luo';

-- ---------------------------------------------------------------------
-- 投资人 / 联系人 / 沟通记录
-- ---------------------------------------------------------------------
UPDATE cap_investors SET investor_name='华东产业母基金'     WHERE investor_id=1 AND investor_name='East Industry Mother Fund';
UPDATE cap_investors SET investor_name='长三角科技集团'     WHERE investor_id=2 AND investor_name='Yangtze Technology Group';
UPDATE cap_investors SET investor_name='未来成长家族办公室' WHERE investor_id=3 AND investor_name='Future Family Office';
UPDATE cap_investors SET city='上海' WHERE investor_id=1 AND city='Shanghai';
UPDATE cap_investors SET city='南京' WHERE investor_id=2 AND city='Nanjing';
UPDATE cap_investors SET city='杭州' WHERE investor_id=3 AND city='Hangzhou';

UPDATE cap_investor_contacts SET contact_name='赵岚', title='投资总监'   WHERE contact_id=1 AND contact_name='Laura Zhao';
UPDATE cap_investor_contacts SET contact_name='刘展', title='财务总监'   WHERE contact_id=2 AND contact_name='Eric Liu';
UPDATE cap_investor_contacts SET contact_name='何舟', title='投资副总裁' WHERE contact_id=3 AND contact_name='Mia He';

UPDATE cap_investor_touchpoints SET subject='Q2 披露材料评审' WHERE touchpoint_id=1 AND subject='Q2 disclosure review';
UPDATE cap_investor_touchpoints SET summary='回顾基金业绩与风险看板。' WHERE touchpoint_id=1 AND summary='Reviewed fund performance and risk dashboard.';
UPDATE cap_investor_touchpoints SET next_step='发送签署版会议纪要' WHERE touchpoint_id=1 AND next_step='Send signed minutes';
UPDATE cap_investor_touchpoints SET subject='实缴出资提醒' WHERE touchpoint_id=2 AND subject='Capital call reminder';
UPDATE cap_investor_touchpoints SET summary='确认打款时间安排。' WHERE touchpoint_id=2 AND summary='Confirmed payment schedule.';
UPDATE cap_investor_touchpoints SET next_step='跟进到账确认' WHERE touchpoint_id=2 AND next_step='Follow payment confirmation';

-- ---------------------------------------------------------------------
-- 项目(opportunity_status 枚举不动;stage_label 按映射翻译)
-- 线上 project 1 的 stage_label 已推进为 'TS',无需翻译。
-- ---------------------------------------------------------------------
UPDATE cap_projects SET short_name='矩阵医疗'   WHERE project_id=1 AND short_name='Matrix Medical';
UPDATE cap_projects SET short_name='北辰储能'   WHERE project_id=2 AND short_name='Northstar Storage';
UPDATE cap_projects SET short_name='澜舟机器人' WHERE project_id=3 AND short_name='Lanzhou Robotics';
UPDATE cap_projects SET short_name='青穹芯片'   WHERE project_id=4 AND short_name='Qingqiong Chip';
UPDATE cap_projects SET short_name='星禾农业'   WHERE project_id=5 AND short_name='Starfield Agri';
UPDATE cap_projects SET short_name='经纬一号'   WHERE project_id=7 AND short_name='Meridian Alpha';
UPDATE cap_projects SET short_name='经纬二号'   WHERE project_id=8 AND short_name='Meridian Beta';

UPDATE cap_projects SET legal_name='矩阵精准医疗股份有限公司' WHERE project_id=1 AND legal_name='Matrix Precision Medical Co';
UPDATE cap_projects SET legal_name='北辰储能系统有限公司'     WHERE project_id=2 AND legal_name='Northstar Energy Storage Systems Co';
UPDATE cap_projects SET legal_name='澜舟机器人科技有限公司'   WHERE project_id=3 AND legal_name='Lanzhou Robotics Technology Co';
UPDATE cap_projects SET legal_name='青穹半导体有限公司'       WHERE project_id=4 AND legal_name='Qingqiong Semiconductor Co';
UPDATE cap_projects SET legal_name='星禾农业科技有限公司'     WHERE project_id=5 AND legal_name='Starfield Agricultural Technology Co';
UPDATE cap_projects SET legal_name='经纬一号有限公司'         WHERE project_id=7 AND legal_name='Meridian Alpha Co';
UPDATE cap_projects SET legal_name='经纬二号有限公司'         WHERE project_id=8 AND legal_name='Meridian Beta Co';

UPDATE cap_projects SET stage_label='尽调' WHERE project_id=3 AND stage_label='Diligence';
UPDATE cap_projects SET stage_label='投决' WHERE project_id=4 AND stage_label='IC';
UPDATE cap_projects SET stage_label='投后' WHERE project_id=5 AND stage_label='Post Investment';
UPDATE cap_projects SET stage_label='初筛' WHERE project_id=7 AND stage_label='Screening';
UPDATE cap_projects SET stage_label='初筛' WHERE project_id=8 AND stage_label='Screening';

UPDATE cap_projects SET industry_group='医疗器械'   WHERE project_id=1 AND industry_group='Medical Devices';
UPDATE cap_projects SET industry_group='新能源储能' WHERE project_id=2 AND industry_group='Energy Storage';
UPDATE cap_projects SET industry_group='机器人'     WHERE project_id=3 AND industry_group='Robotics';
UPDATE cap_projects SET industry_group='半导体'     WHERE project_id=4 AND industry_group='Semiconductor';
UPDATE cap_projects SET industry_group='农业科技'   WHERE project_id=5 AND industry_group='AgriTech';
UPDATE cap_projects SET industry_group='金融科技'   WHERE project_id=7 AND industry_group='Fintech';
UPDATE cap_projects SET industry_group='生物科技'   WHERE project_id=8 AND industry_group='Biotech';

UPDATE cap_projects SET city='上海' WHERE project_id=1 AND city='Shanghai';
UPDATE cap_projects SET city='常州' WHERE project_id=2 AND city='Changzhou';
UPDATE cap_projects SET city='深圳' WHERE project_id=3 AND city='Shenzhen';
UPDATE cap_projects SET city='南京' WHERE project_id=4 AND city='Nanjing';
UPDATE cap_projects SET city='成都' WHERE project_id=5 AND city='Chengdu';
UPDATE cap_projects SET city='北京' WHERE project_id=7 AND city='Beijing';
UPDATE cap_projects SET city='苏州' WHERE project_id=8 AND city='Suzhou';

UPDATE cap_projects SET registered_location='上海' WHERE project_id=1 AND registered_location='Shanghai';
UPDATE cap_projects SET registered_location='江苏' WHERE project_id=2 AND registered_location='Jiangsu';
UPDATE cap_projects SET registered_location='广东' WHERE project_id=3 AND registered_location='Guangdong';
UPDATE cap_projects SET registered_location='江苏' WHERE project_id=4 AND registered_location='Jiangsu';
UPDATE cap_projects SET registered_location='四川' WHERE project_id=5 AND registered_location='Sichuan';

UPDATE cap_projects SET source_channel='合伙人推荐'     WHERE project_id=1 AND source_channel='Partner Referral';
UPDATE cap_projects SET source_channel='行业扫描'       WHERE project_id=2 AND source_channel='Industry Scan';
UPDATE cap_projects SET source_channel='研究挖掘'       WHERE project_id=3 AND source_channel='Research Sourcing';
UPDATE cap_projects SET source_channel='联合投资方推荐' WHERE project_id=4 AND source_channel='Co-investor';
UPDATE cap_projects SET source_channel='存量被投企业'   WHERE project_id=5 AND source_channel='Existing Portfolio';

UPDATE cap_projects SET summary='医疗器械成长期投资。'         WHERE project_id=1 AND summary='Medical device growth-stage investment.';
UPDATE cap_projects SET summary='AI 医疗器械平台。'            WHERE project_id=1 AND summary='AI medical device platform.';
UPDATE cap_projects SET summary='集装箱式储能系统集成商。'     WHERE project_id=2 AND summary='Containerized storage system integrator.';
UPDATE cap_projects SET summary='具身智能机器人公司。'         WHERE project_id=3 AND summary='Embodied intelligence robot company.';
UPDATE cap_projects SET summary='专用推理芯片公司。'           WHERE project_id=4 AND summary='Specialized inference chip company.';
UPDATE cap_projects SET summary='智慧农业运营平台。'           WHERE project_id=5 AND summary='Smart agriculture operation platform.';

UPDATE cap_projects SET thesis='注册审批路径与医院渠道构成进入壁垒。' WHERE project_id=1 AND thesis='Regulatory path and hospital channel create entry barrier.';
UPDATE cap_projects SET thesis='电网灵活性需求带动增长。'             WHERE project_id=2 AND thesis='Demand grows with grid flexibility.';
UPDATE cap_projects SET thesis='垂直场景提升变现确定性。'             WHERE project_id=3 AND thesis='Vertical scenarios increase monetization certainty.';
UPDATE cap_projects SET thesis='国产替代与边缘 AI 需求。'             WHERE project_id=4 AND thesis='Domestic substitution and edge AI demand.';
UPDATE cap_projects SET thesis='农村数字化叠加服务收入。'             WHERE project_id=5 AND thesis='Rural digitization with service revenue.';

UPDATE cap_projects SET product_note='诊断硬件加软件工作流。'   WHERE project_id=1 AND product_note='Diagnostic hardware plus software workflow.';
UPDATE cap_projects SET product_note='BMS 与热管理技术栈。'     WHERE project_id=2 AND product_note='BMS and thermal management stack.';
UPDATE cap_projects SET product_note='机械臂加感知模块。'       WHERE project_id=3 AND product_note='Robot arm plus perception module.';
UPDATE cap_projects SET product_note='Chiplet 架构。'           WHERE project_id=4 AND product_note='Chiplet architecture.';
UPDATE cap_projects SET product_note='农场 SaaS 加物联网网关。' WHERE project_id=5 AND product_note='Farm SaaS plus IoT gateway.';

UPDATE cap_projects SET highlight_note='医院试点进展良好。'       WHERE project_id=1 AND highlight_note='Strong hospital pilots.';
UPDATE cap_projects SET highlight_note='已签约战略客户。'         WHERE project_id=2 AND highlight_note='Signed strategic customer.';
UPDATE cap_projects SET highlight_note='ARR 增长迅速。'           WHERE project_id=3 AND highlight_note='Fast ARR growth.';
UPDATE cap_projects SET highlight_note='关联交易披露风险较高。'   WHERE project_id=4 AND highlight_note='High risk around related-party disclosure.';
UPDATE cap_projects SET highlight_note='需要现金流修复方案。'     WHERE project_id=5 AND highlight_note='Needs cashflow recovery plan.';

-- ---------------------------------------------------------------------
-- 项目阶段事件(from/to 按阶段映射:Sourced→入库 Screening→初筛
-- Project Approval/Approved→立项 TS→TS Diligence→尽调)
-- ---------------------------------------------------------------------
UPDATE cap_project_stage_events SET from_stage='初筛' WHERE stage_event_id=1  AND from_stage='Screening';
UPDATE cap_project_stage_events SET to_stage='立项'   WHERE stage_event_id=1  AND to_stage='Project Approval';
UPDATE cap_project_stage_events SET event_reason='周会评审通过' WHERE stage_event_id=1 AND event_reason='Approved by weekly review';
UPDATE cap_project_stage_events SET notes='进入立项审批流程'    WHERE stage_event_id=1 AND notes='Proceed to approval workflow';
UPDATE cap_project_stage_events SET from_stage='立项' WHERE stage_event_id=2  AND from_stage='Approved';
UPDATE cap_project_stage_events SET event_reason='已出具 TS'    WHERE stage_event_id=2 AND event_reason='Term sheet issued';
UPDATE cap_project_stage_events SET notes='更新清算优先权条款'  WHERE stage_event_id=2 AND notes='Update liquidation preference clause';
UPDATE cap_project_stage_events SET to_stage='尽调'   WHERE stage_event_id=3  AND to_stage='Diligence';
UPDATE cap_project_stage_events SET event_reason='尽调启动'     WHERE stage_event_id=3 AND event_reason='Diligence started';
UPDATE cap_project_stage_events SET notes='法务与财务尽调进行中' WHERE stage_event_id=3 AND notes='Legal and financial diligence in progress';
UPDATE cap_project_stage_events SET from_stage='入库' WHERE stage_event_id=4  AND from_stage='Sourced';
UPDATE cap_project_stage_events SET to_stage='初筛'   WHERE stage_event_id=4  AND to_stage='Screening';
UPDATE cap_project_stage_events SET event_reason='通过前端操作推进' WHERE stage_event_id=4 AND event_reason='Advanced through API';
UPDATE cap_project_stage_events SET notes='由前端操作推进阶段'      WHERE stage_event_id=4 AND notes='Stage advanced from frontend action';
UPDATE cap_project_stage_events SET from_stage='立项' WHERE stage_event_id=13 AND from_stage='Project Approval';
UPDATE cap_project_stage_events SET event_reason='通过前端操作推进' WHERE stage_event_id=13 AND event_reason='Advanced through API';
UPDATE cap_project_stage_events SET notes='由前端操作推进阶段'      WHERE stage_event_id=13 AND notes='Stage advanced from frontend action';

-- 项目委派代表(项目卡片-委派)
UPDATE cap_project_representatives SET rep_name='林蔚' WHERE project_representative_id=1 AND rep_name='Nina Lin';
UPDATE cap_project_representatives SET rep_name='周旻' WHERE project_representative_id=2 AND rep_name='Omar Zhao';

-- ---------------------------------------------------------------------
-- 权益变动(change_reason 仅取:首次投资/追加投资/退出/被动稀释(再融资))
-- ---------------------------------------------------------------------
UPDATE cap_equity_changes SET change_reason='追加投资' WHERE equity_change_id=1 AND change_reason='Follow-on financing';
UPDATE cap_equity_changes SET change_reason='首次投资' WHERE equity_change_id=2 AND change_reason='B round investment';
UPDATE cap_equity_changes SET notes='与现有联合投资方跟投。' WHERE equity_change_id=1 AND notes='Follow investment with existing syndicate.';
UPDATE cap_equity_changes SET notes='领投方权益条款。'       WHERE equity_change_id=2 AND notes='Lead investor economics.';

-- ---------------------------------------------------------------------
-- 现金流 / 估值 / 净值
-- ---------------------------------------------------------------------
UPDATE cap_cashflows SET description='LP 实缴出资'       WHERE cashflow_id=1 AND description='LP capital call';
UPDATE cap_cashflows SET description='项目打款待托管复核' WHERE cashflow_id=2 AND description='Project payment pending custody review';
UPDATE cap_cashflows SET description='项目回款待分配'     WHERE cashflow_id=3 AND description='Project return allocation pending';

UPDATE cap_project_valuations SET notes='基于最新一轮融资。' WHERE project_valuation_id=1 AND notes='Based on latest financing round.';
UPDATE cap_project_valuations SET notes='TS 定稿前暂估。'    WHERE project_valuation_id=2 AND notes='Pending TS finalization.';

UPDATE cap_fund_navs SET valuation_basis='季度估值模型' WHERE fund_nav_id=1 AND valuation_basis='Quarterly valuation model';
UPDATE cap_fund_navs SET valuation_basis='季度估值模型' WHERE fund_nav_id=2 AND valuation_basis='Quarterly valuation model';

-- ---------------------------------------------------------------------
-- 投后数据收集
-- ---------------------------------------------------------------------
UPDATE cap_data_collection_campaigns SET campaign_name='2026 年 6 月投后数据收集' WHERE collection_campaign_id=1 AND campaign_name='June 2026 Portfolio Data Collection';
UPDATE cap_data_collection_items SET notes='投后负责人已复核' WHERE collection_item_id=1 AND notes='Reviewed by portfolio owner';
UPDATE cap_data_collection_items SET notes='待复核'           WHERE collection_item_id=2 AND notes='Awaiting review';

-- ---------------------------------------------------------------------
-- 会议 / 会议行动项(meeting 3-5、日程 4-5 为线上补丁数据,
-- 项目名"兰州机器人"统一为基准译名"澜舟机器人")
-- ---------------------------------------------------------------------
UPDATE cap_meetings SET meeting_title='矩阵医疗投决会'        WHERE meeting_id=1 AND meeting_title='Matrix Medical IC Meeting';
UPDATE cap_meetings SET meeting_title='成长一期基金 LP 例会'  WHERE meeting_id=2 AND meeting_title='Growth Fund LP Review';
UPDATE cap_meetings SET ai_summary='AI 草稿:补充临床路径材料后推进上会。' WHERE meeting_id=1 AND ai_summary='AI draft: proceed with IC materials after clinical pathway supplement.';
UPDATE cap_meetings SET ai_summary='LP 例会材料已准备就绪。'               WHERE meeting_id=2 AND ai_summary='LP review materials prepared.';
UPDATE cap_meetings SET discussion_points_json='["临床计划","资金用途","估值"]'   WHERE meeting_id=1 AND discussion_points_json LIKE '%clinical plan%';
UPDATE cap_meetings SET discussion_points_json='["业绩表现","风险","信息披露"]'   WHERE meeting_id=2 AND discussion_points_json LIKE '%performance%';
UPDATE cap_meetings SET meeting_title=REPLACE(meeting_title,'兰州机器人','澜舟机器人') WHERE meeting_id IN (3,4,5) AND meeting_title LIKE '%兰州机器人%';

UPDATE cap_meeting_actions SET action_title='补充临床路径备忘录' WHERE meeting_action_id=1 AND action_title='Supplement clinical path memo';
UPDATE cap_meeting_actions SET action_title='更新投资备忘录'     WHERE meeting_action_id=2 AND action_title='Prepare updated investment memo';

-- ---------------------------------------------------------------------
-- 公告 / 日程 / 消息
-- ---------------------------------------------------------------------
UPDATE cap_announcements SET title='投后月报填报窗口开放', body_text='请在截止日期前提交 6 月投后经营数据。' WHERE announcement_id=1 AND title='Portfolio monthly data window is open';
UPDATE cap_announcements SET title='Q2 投委会材料归档提醒', body_text='请归档 Q2 投委会材料与签署版会议纪要。' WHERE announcement_id=2 AND title='Q2 IC materials archive reminder';

UPDATE cap_calendar_events SET event_title='矩阵医疗投决会'       WHERE calendar_event_id=1 AND event_title='Matrix Medical IC Meeting';
UPDATE cap_calendar_events SET event_title='澜舟机器人法务尽调'   WHERE calendar_event_id=2 AND event_title='Lanzhou Robotics Legal Diligence';
UPDATE cap_calendar_events SET event_title='成长一期基金 LP 例会' WHERE calendar_event_id=3 AND event_title='Growth Fund LP Meeting';
UPDATE cap_calendar_events SET location_text='A会议室' WHERE calendar_event_id=1 AND location_text='Room A';
UPDATE cap_calendar_events SET location_text='B会议室' WHERE calendar_event_id=2 AND location_text='Room B';
UPDATE cap_calendar_events SET location_text='线上'    WHERE calendar_event_id=3 AND location_text='Online';
UPDATE cap_calendar_events SET event_title=REPLACE(event_title,'兰州机器人','澜舟机器人') WHERE calendar_event_id IN (4,5) AND event_title LIKE '%兰州机器人%';

UPDATE cap_messages SET title='付款审批待处理', body_text='北辰储能打款正在等待托管复核。' WHERE message_id=1 AND title='Payment approval pending';
UPDATE cap_messages SET title='高风险事件提报', body_text='星禾农业现金余额跌破安全线。'   WHERE message_id=2 AND title='High risk incident raised';
UPDATE cap_messages SET title='TS 条款更新',   body_text='北辰储能 TS 新增清算优先权条款。' WHERE message_id=3 AND title='TS clause updated';

-- ---------------------------------------------------------------------
-- 流程(线上 workflow_steps 已是中文,无需处理)
-- ---------------------------------------------------------------------
UPDATE cap_workflow_templates SET template_name='项目立项审批流程' WHERE workflow_template_id=1 AND template_name='Project approval workflow';
UPDATE cap_workflow_templates SET template_name='基金付款审批流程' WHERE workflow_template_id=2 AND template_name='Fund payment workflow';
UPDATE cap_workflow_templates SET template_name='用印审批流程'     WHERE workflow_template_id=3 AND template_name='Office seal workflow';

UPDATE cap_workflow_instances SET title='矩阵医疗项目立项审批' WHERE workflow_instance_id=1 AND title='Matrix Medical project approval';
UPDATE cap_workflow_instances SET title='北辰储能项目打款'     WHERE workflow_instance_id=2 AND title='Northstar Storage project payment';
UPDATE cap_workflow_instances SET title='TS 修订用印申请'      WHERE workflow_instance_id=3 AND title='Seal request for TS amendment';
UPDATE cap_workflow_instances SET payload_json=JSON_SET(payload_json,'$.document','TS 修订件') WHERE workflow_instance_id=3 AND JSON_UNQUOTE(JSON_EXTRACT(payload_json,'$.document'))='TS amendment';

UPDATE cap_workflow_tasks SET task_name='审核立项材料包' WHERE workflow_task_id=1 AND task_name='Review project approval package';
UPDATE cap_workflow_tasks SET task_name='核验托管打款'   WHERE workflow_task_id=2 AND task_name='Verify custody payment';
UPDATE cap_workflow_tasks SET task_name='审批用印申请'   WHERE workflow_task_id=3 AND task_name='Approve seal request';
UPDATE cap_workflow_tasks SET task_name='立项审查(项目立项审批流程)' WHERE workflow_task_id=11 AND task_name='立项审查(Project approval workflow)';

UPDATE cap_workflow_delegations SET reason='休假期间代审' WHERE delegation_id=1 AND reason='Vacation coverage';

-- ---------------------------------------------------------------------
-- 文档(title 翻译;file_name/storage_uri/checksum 不动)
-- ---------------------------------------------------------------------
UPDATE cap_documents SET title='矩阵医疗 BP'            WHERE document_id=1 AND title='Matrix Medical BP';
UPDATE cap_documents SET title='成长一期基金 Q2 披露包' WHERE document_id=2 AND title='Growth Fund Q2 Disclosure Pack';
UPDATE cap_documents SET title='北辰储能 TS'            WHERE document_id=3 AND title='Northstar Storage TS';
UPDATE cap_documents SET title='硬科技赛道周报'         WHERE document_id=4 AND title='Hard Technology Weekly Report';

UPDATE cap_document_versions SET change_note='更新财务计划。'       WHERE document_version_id=1 AND change_note='Updated financial plan.';
UPDATE cap_document_versions SET change_note='更新清算优先权条款。' WHERE document_version_id=2 AND change_note='Updated liquidation preference.';
UPDATE cap_document_versions SET change_note='前端初次上传'         WHERE document_version_id=3 AND change_note='Initial frontend upload';

-- ---------------------------------------------------------------------
-- 回收站
-- ---------------------------------------------------------------------
UPDATE cap_recycle_items SET object_label='矩阵医疗旧版 BP.pdf', delete_reason='重复上传'       WHERE recycle_item_id=1 AND object_label='Old Matrix BP.pdf';
UPDATE cap_recycle_items SET object_label='成长一期过期披露任务', delete_reason='已用新模板重建' WHERE recycle_item_id=2 AND object_label='Expired disclosure task';

-- ---------------------------------------------------------------------
-- 风险条款 / 风险事件
-- ---------------------------------------------------------------------
UPDATE cap_risk_clauses SET clause_summary='里程碑未达成触发回购权。' WHERE risk_clause_id=1 AND clause_summary='Redemption right if milestone is missed.';
UPDATE cap_risk_clauses SET clause_body='基于里程碑的回购权需每季度复核。' WHERE risk_clause_id=1 AND clause_body='Milestone-based redemption right requires quarterly review.';
UPDATE cap_risk_clauses SET clause_summary='临床里程碑延期条款。' WHERE risk_clause_id=2 AND clause_summary='Clinical milestone delay clause.';
UPDATE cap_risk_clauses SET clause_body='临床审批时间延期触发报告义务。' WHERE risk_clause_id=2 AND clause_body='Clinical approval timeline delay triggers reporting obligation.';

UPDATE cap_risk_incidents SET incident_title='现金余额低于安全线'   WHERE risk_incident_id=1 AND incident_title='Cash balance below safety line';
UPDATE cap_risk_incidents SET response_plan='每周现金管控并推动回款。' WHERE risk_incident_id=1 AND response_plan='Weekly cash control and collection push.';
UPDATE cap_risk_incidents SET latest_progress='创始人已同意修订后的回款计划。' WHERE risk_incident_id=1 AND latest_progress='Founder agreed to revised payment plan.';
UPDATE cap_risk_incidents SET incident_title='关联交易披露不完整'   WHERE risk_incident_id=2 AND incident_title='Related-party disclosure incomplete';
UPDATE cap_risk_incidents SET response_plan='要求提供完整披露材料包。' WHERE risk_incident_id=2 AND response_plan='Request full disclosure package.';
UPDATE cap_risk_incidents SET latest_progress='法务审查进行中。' WHERE risk_incident_id=2 AND latest_progress='Legal review in progress.';

-- ---------------------------------------------------------------------
-- 研究笔记 / 关联
-- ---------------------------------------------------------------------
UPDATE cap_research_notes SET note_title='具身智能供应链季度跟踪' WHERE research_note_id=1 AND note_title='Embodied AI supply chain quarterly tracking';
UPDATE cap_research_notes SET source_name='内部访谈' WHERE research_note_id=1 AND source_name='Internal interviews';
UPDATE cap_research_notes SET abstract_text='供应链成本与瓶颈梳理。' WHERE research_note_id=1 AND abstract_text='Supply chain cost and bottleneck review.';
UPDATE cap_research_notes SET ai_summary='AI 摘要:控制器与传感器成本曲线持续改善。' WHERE research_note_id=1 AND ai_summary='AI summary: controller and sensor cost curves are improving.';
UPDATE cap_research_notes SET tag_json='["机器人","传感器","控制器"]' WHERE research_note_id=1 AND tag_json LIKE '%robotics%';
UPDATE cap_research_notes SET note_title='储能系统集成商毛利拆解' WHERE research_note_id=2 AND note_title='Energy storage system integrator margin split';
UPDATE cap_research_notes SET source_name='专家访谈' WHERE research_note_id=2 AND source_name='Expert call';
UPDATE cap_research_notes SET abstract_text='各集成商毛利桥对比。' WHERE research_note_id=2 AND abstract_text='Margin bridge across integrators.';
UPDATE cap_research_notes SET ai_summary='AI 摘要:热管理模块是关键毛利杠杆。' WHERE research_note_id=2 AND ai_summary='AI summary: thermal module is the key margin lever.';
UPDATE cap_research_notes SET tag_json='["储能","电芯"]' WHERE research_note_id=2 AND tag_json LIKE '%storage%';

UPDATE cap_research_links SET relevance_note='支撑机器人供应链尽调。' WHERE research_link_id=1 AND relevance_note='Supports diligence on robotics supply chain.';
UPDATE cap_research_links SET relevance_note='支撑 TS 谈判假设。'     WHERE research_link_id=2 AND relevance_note='Supports TS negotiation assumptions.';

-- ---------------------------------------------------------------------
-- AI 解析 / AI 会话
-- ---------------------------------------------------------------------
UPDATE cap_ai_parse_jobs SET job_name='矩阵医疗 BP 字段抽取'  WHERE ai_parse_job_id=1 AND job_name='Matrix BP field extraction';
UPDATE cap_ai_parse_jobs SET job_name='北辰储能 TS 条款抽取'  WHERE ai_parse_job_id=2 AND job_name='Northstar TS clause extraction';
UPDATE cap_ai_parse_jobs SET job_name='矩阵医疗投决会纪要'    WHERE ai_parse_job_id=3 AND job_name='Matrix IC meeting minutes';

UPDATE cap_ai_parse_outputs SET output_json=JSON_SET(output_json,'$.company','矩阵医疗') WHERE ai_parse_output_id=1 AND JSON_UNQUOTE(JSON_EXTRACT(output_json,'$.company'))='Matrix Medical';
UPDATE cap_ai_parse_outputs SET output_json=JSON_SET(output_json,'$.sector','医疗器械')  WHERE ai_parse_output_id=1 AND JSON_UNQUOTE(JSON_EXTRACT(output_json,'$.sector'))='Medical Devices';
UPDATE cap_ai_parse_outputs SET output_json=JSON_SET(output_json,'$.summary','草稿产出,等待人工确认') WHERE ai_parse_output_id=3 AND JSON_UNQUOTE(JSON_EXTRACT(output_json,'$.summary'))='draft output waiting for human confirmation';

UPDATE cap_ai_sessions SET session_title='项目尽调问答' WHERE ai_session_id=1 AND session_title='Project diligence Q&A';
UPDATE cap_ai_sessions SET session_title='披露材料解析' WHERE ai_session_id=2 AND session_title='Disclosure material parser';

UPDATE cap_ai_messages SET message_body='总结机器人供应链风险。' WHERE ai_message_id=1 AND message_body='Summarize robotics supply chain risk.';
UPDATE cap_ai_messages SET message_body='控制器供应与传感器价格是主要关注点。' WHERE ai_message_id=2 AND message_body='Controller availability and sensor pricing are the main watch points.';
UPDATE cap_ai_messages SET message_body='披露包已齐备,仅缺 LP 签署回执。' WHERE ai_message_id=3 AND message_body='Disclosure pack is complete except signed LP acknowledgement.';

-- ---------------------------------------------------------------------
-- 报表快照 / 导入导出 / 字段与表单 / 选项集
-- ---------------------------------------------------------------------
UPDATE cap_report_snapshots SET snapshot_name='公司驾驶舱 2026 Q2' WHERE report_snapshot_id=1 AND snapshot_name='Company dashboard 2026 Q2';

UPDATE cap_import_export_tasks SET error_summary='6 行校验失败。' WHERE import_export_task_id=1 AND error_summary='Six rows failed validation.';

UPDATE cap_custom_field_definitions SET field_label='ESG 评级'     WHERE custom_field_id=1 AND field_label='ESG Rating';
UPDATE cap_custom_field_definitions SET field_label='国资备案编号' WHERE custom_field_id=2 AND field_label='State Filing Number';
UPDATE cap_custom_field_definitions SET field_label='二次鉴权级别' WHERE custom_field_id=3 AND field_label='Secondary Auth Level';

UPDATE cap_form_layouts SET layout_name='新增项目表单' WHERE form_layout_id=1 AND layout_name='Project add form';
UPDATE cap_form_layouts SET layout_name='新增基金表单' WHERE form_layout_id=2 AND layout_name='Fund add form';
UPDATE cap_form_layouts SET layout_json='{"sections":["AI 预填","基础信息","描述","附件"]}' WHERE form_layout_id=1 AND layout_json LIKE '%AI Prefill%';
UPDATE cap_form_layouts SET layout_json='{"sections":["基础信息","规模","治理","披露"]}'    WHERE form_layout_id=2 AND layout_json LIKE '%Governance%';

UPDATE cap_option_sets SET option_set_name='项目阶段选项'     WHERE option_set_id=1 AND option_set_name='Project Stage Options';
UPDATE cap_option_sets SET option_set_name='风险等级选项'     WHERE option_set_id=2 AND option_set_name='Risk Level Options';
UPDATE cap_option_sets SET option_set_name='文档鉴权级别选项' WHERE option_set_id=3 AND option_set_name='Document Auth Level Options';
-- 阶段选项为用户可见文案(risk_level/auth_level 选项为小写代码,不动)
UPDATE cap_option_sets SET options_json='["入库","立项","TS","尽调","投决","投资协议","打款","投后服务"]' WHERE option_set_id=1 AND options_json LIKE '%Sourced%';

-- ---------------------------------------------------------------------
-- 审计日志 entity_label(追加型日志,按旧值精确匹配批量更新;
-- 测试残留(RBACtest/reject-test 等)与乱码历史行不动)
-- ---------------------------------------------------------------------
UPDATE cap_audit_logs SET entity_label='演示用户'       WHERE entity_label='Demo User';
UPDATE cap_audit_logs SET entity_label='审计专员'       WHERE entity_label='Casey Audit';
UPDATE cap_audit_logs SET entity_label='孟森'           WHERE entity_label='Sam Meng';
UPDATE cap_audit_logs SET entity_label='林蔚'           WHERE entity_label='Nina Lin';
UPDATE cap_audit_logs SET entity_label='叶锐'           WHERE entity_label='Ryan Ye';
UPDATE cap_audit_logs SET entity_label='罗澜'           WHERE entity_label='Lena Luo';
UPDATE cap_audit_logs SET entity_label='周旻'           WHERE entity_label='Omar Zhou';
UPDATE cap_audit_logs SET entity_label='经纬合伙人'     WHERE entity_label='Meridian Partner';
UPDATE cap_audit_logs SET entity_label='经纬一号'       WHERE entity_label='Meridian Alpha';
UPDATE cap_audit_logs SET entity_label='经纬三号'       WHERE entity_label='Meridian Gamma';
UPDATE cap_audit_logs SET entity_label='开发者(反馈)' WHERE entity_label='Developer (Feedback)';
UPDATE cap_audit_logs SET entity_label='矩阵医疗'       WHERE entity_label='Matrix Medical';
UPDATE cap_audit_logs SET entity_label='北辰储能'       WHERE entity_label='Northstar Storage';
UPDATE cap_audit_logs SET entity_label='澜舟机器人'     WHERE entity_label='Lanzhou Robotics';
UPDATE cap_audit_logs SET entity_label='星禾农业'       WHERE entity_label='Starfield Agri';
UPDATE cap_audit_logs SET entity_label='成长一期基金'   WHERE entity_label='Growth Fund I';
UPDATE cap_audit_logs SET entity_label='北辰储能 TS'    WHERE entity_label='Northstar Storage TS';
UPDATE cap_audit_logs SET entity_label='只读审计'       WHERE entity_label='Read Only Auditor';
UPDATE cap_audit_logs SET entity_label='追加投资'       WHERE entity_label='Follow-on financing';
UPDATE cap_audit_logs SET entity_label='关联交易披露不完整' WHERE entity_label='Related-party disclosure incomplete';
UPDATE cap_audit_logs SET entity_label='前端演示项目 4EE5'       WHERE entity_label='Frontend Project 4EE5';
UPDATE cap_audit_logs SET entity_label='前端演示机构 4f7ac7'     WHERE entity_label='Frontend Manager 4f7ac7';
UPDATE cap_audit_logs SET entity_label='前端演示收集任务 4e41ab' WHERE entity_label='Frontend Campaign 4e41ab';
UPDATE cap_audit_logs SET entity_label='前端演示风险 acba89'     WHERE entity_label='Frontend Risk acba89';
UPDATE cap_audit_logs SET entity_label='前端演示研报 654637'     WHERE entity_label='Frontend Research 654637';
UPDATE cap_audit_logs SET entity_label='立项审查(项目立项审批流程)' WHERE entity_label='立项审查(Project approval workflow)';
UPDATE cap_audit_logs SET entity_label='项目立项审批流程·2026/7/6'   WHERE entity_label='Project approval workflow·2026/7/6';
UPDATE cap_audit_logs SET entity_label='CSV 导入 2 行' WHERE entity_label='CSV import 2 rows';
UPDATE cap_audit_logs SET entity_label='SMTP 配置'     WHERE entity_label='SMTP config';
UPDATE cap_audit_logs SET entity_label='LLM 配置'      WHERE entity_label='LLM config';

-- 完成。重跑本脚本无副作用(所有条件第二次执行均命中 0 行)。
