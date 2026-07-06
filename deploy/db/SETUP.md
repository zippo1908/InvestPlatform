# 数据库一步到位搭建(CapitalOS)

从零把 MySQL 带到当前生产形态。所有命令假设 root 口令在 `~/.investplatform-mysql-root`。

## 顺序(照做即可)

```bash
cd /home/tinci/InvestPlatform/deploy
PASS=$(cat ~/.investplatform-mysql-root)
MYSQL="docker exec -i investplatform-mysql mysql -uroot -p$PASS"

# 0) MySQL 8 容器(生产自启)
docker run -d --name investplatform-mysql --restart unless-stopped \
  -p 127.0.0.1:3306:3306 \
  -e MYSQL_ROOT_PASSWORD="$PASS" -e MYSQL_DATABASE=capitalos \
  -v investplatform-mysql-data:/var/lib/mysql mysql:8

# 1) 表结构
$MYSQL              < db/schema.sql
# 2) 基础演示数据(用户/角色/权限/项目/基金…)
$MYSQL capitalos    < db/seed.sql
# 3) 多租户改造:给 23 张业务表加 tenant_id 并把现有数据回填到租户 1
$MYSQL capitalos    < db/patch_tenancy.sql
# 4) RBAC:给 managing_partner 补操作类权限
$MYSQL capitalos    < db/patch_auth.sql
# 4b) 流程编排步骤:给 3 个流程模板种入有序步骤(务必带 utf8mb4,否则中文乱码)
docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 \
  -uroot -p"$PASS" capitalos < db/patch_workflow_steps.sql
# 4c) 项目卡片补全:评论/财务/委派/决策四表 + demo 种子(务必带 utf8mb4)
docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 \
  -uroot -p"$PASS" capitalos < db/patch_project_card.sql
# 4d) 服务端 AI 解析任务表(cap_ai_jobs):关掉浏览器/换设备也能恢复解析
docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 \
  -uroot -p"$PASS" capitalos < db/patch_ai_jobs.sql

# 5) 账户与演示数据(bcrypt 口令 + demo.user;可选第二租户)
cd backend && . .venv/bin/activate && pip install -r requirements.txt
cd ../db && python setup_accounts.py --with-tenant2
```

## 每一步在改什么

| 步骤 | 文件 | 作用 | 幂等 |
|---|---|---|---|
| 1 | `schema.sql` | 62 张表结构 | 建库时一次 |
| 2 | `seed.sql` | 用户/角色/8 权限/角色映射/项目/基金/公告… | 一次 |
| 3 | `patch_tenancy.sql` | **多租户隔离基石**:23 张业务表加 `tenant_id`+索引,现有数据回填到租户 1(根公司 org=1) | 列已存在会报错,只跑一次 |
| 4 | `patch_auth.sql` | managing_partner 补 `project.edit`/`risk.manage`/`fund.export` | ✅ INSERT IGNORE |
| 4b | `patch_workflow_steps.sql` | 3 个流程模板的有序步骤(项目:立项→尽调→投决→归档 等),支撑审批自动流转 | ✅ 按 family 清后重插 |
| 4c | `patch_project_card.sql` | 项目卡片四表(评论/财务/委派/决策)+ 项目3 demo 种子 | ✅ IF NOT EXISTS + 按 project_id 重插 |
| 4d | `patch_ai_jobs.sql` | 服务端 AI 解析任务表 `cap_ai_jobs`(后端跑到底落库,前端轮询/换设备恢复) | ✅ IF NOT EXISTS |
| 5 | `setup_accounts.py` | 所有用户设 bcrypt 口令(默认 `demo-login`);建 `demo.user`(管理合伙人);`--with-tenant2` 种入 Meridian 第二租户(独立公司树,演示隔离) | ✅ 存在性判断 |

## 租户模型(隔离怎么生效)
- "租户" = 组织树的**根公司**(`cap_organizations.parent_org_id` 为 NULL 者)。
- 登录时后端沿 `parent_org_id` 上溯得到 `tenant_id`,写入 JWT。
- 所有读(列表/看板/ledger/dashboard)带 `WHERE tenant_id=%s`;所有写盖 `tenant_id`;
  按 id 的写(advance/edit/download…)加 `AND tenant_id=%s` 防跨租户 IDOR。
- 种子数据全属租户 1(CapitalOS Demo Group);`--with-tenant2` 的 Meridian 属另一租户,
  两者互不可见 —— 用来验证隔离。

## 演示账号(口令均 `demo-login`)
| 账号 | 角色 | 用途 |
|---|---|---|
| `demo.user` / `alex.gp` | 管理合伙人 | 全量操作(一键演示) |
| `nina.invest` | 投资经理 | 可建/改项目,不可建基金 |
| `casey.audit` | 只读审计 | 全部写操作 403(演示 RBAC) |
| `omar.fundops` | 基金运营 | 可建基金 |
| `lena.legal` | 风控法务 | 可管风险 |
| `mera.gp`(需 --with-tenant2) | 管理合伙人 | 第二租户,看不到租户 1 数据 |

> ⚠️ **生产上线前**:重置所有口令、更换 `.env` 的 `JWT_SECRET`、把 `CORS_ALLOW_ORIGINS`
> 收紧到具体域名、配置真实 `LLM_API_KEY`。
