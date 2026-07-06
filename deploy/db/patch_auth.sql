-- P0 RBAC:给 managing_partner 补齐操作类权限(资深合伙人可操作业务,但 system.manage 仍仅 system_admin)。
-- 幂等:INSERT IGNORE 依赖 (role_id, permission_id) 主键去重。
INSERT IGNORE INTO cap_role_permissions (role_id, permission_id, effect)
SELECT r.role_id, p.permission_id, 'allow'
FROM cap_roles r CROSS JOIN cap_permissions p
WHERE r.role_code = 'managing_partner'
  AND p.permission_code IN ('project.edit', 'risk.manage', 'fund.export');
