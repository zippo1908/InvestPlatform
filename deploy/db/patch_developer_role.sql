-- 独立「开发者」角色:只有 feedback.annotate 能力位,用于收集页面反馈标注,
-- 不含任何业务写权限(数据只读 + 只能提交反馈)。给真人配置时,把 developer 角色授给其账号即可。
-- 依赖:先跑 patch_feedback.sql(它建了 feedback.annotate 权限位)。账号本身在 setup_accounts.py 里创建。
-- 运行(utf8mb4):docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos < db/patch_developer_role.sql
-- 幂等:NOT EXISTS 守卫。

INSERT INTO cap_roles (role_code, role_name, description, data_scope, is_system_role, is_active)
SELECT 'developer', '开发者(反馈标注)', '仅用于页面反馈标注:可提交/标注意见,不含任何业务写权限。', 'owned', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM cap_roles WHERE role_code='developer');

INSERT INTO cap_role_permissions (role_id, permission_id, effect)
SELECT r.role_id, p.permission_id, 'allow'
FROM cap_roles r JOIN cap_permissions p ON p.permission_code='feedback.annotate'
WHERE r.role_code='developer'
  AND NOT EXISTS (SELECT 1 FROM cap_role_permissions rp WHERE rp.role_id=r.role_id AND rp.permission_id=p.permission_id);
