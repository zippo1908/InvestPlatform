# 开发者账号(页面反馈标注)

用于让指定的人在任意页面**圈组件、提修改意见**,收集后由管理员一键推到 GitHub Issue。
这个账号**只有反馈标注权限**——数据只读、不能做任何业务写操作。

## 账号信息(默认,**上线前务必改口令**)

| 项 | 值 |
|---|---|
| 登录名 | `developer` |
| 默认口令 | `demo-login` ⚠️ 仅演示,生产请立即重置 |
| 角色 | `developer`(唯一权限位:`feedback.annotate`) |
| 能做 | 登录、浏览所有页面(只读)、右下角「反馈」浮层提交/标注、拾取组件 |
| 不能做 | 任何业务写(建/改/删项目基金、推进阶段、导出…均 403) |

> 反馈的「汇总 / 推 GitHub」仍只对 `system_admin` / `managing_partner` 开放;
> `developer` 只负责**提交**,推送到 GitHub 由管理员在汇总页做。

## 如何配置(从零)

前置:已按 `deploy/db/SETUP.md` 建好库,并跑过 `patch_feedback.sql`(建 `feedback.annotate` 权限位)。

```bash
cd /home/tinci/InvestPlatform/deploy
PASS=$(cat ~/.investplatform-mysql-root)
MYSQL="docker exec -i investplatform-mysql mysql --default-character-set=utf8mb4 -uroot -p$PASS capitalos"

# 1) 建 developer 角色 + 授 feedback.annotate(幂等)
$MYSQL < db/patch_developer_role.sql
# 2) 建 developer 账号并分派该角色(口令 = demo-login;幂等)
cd backend && . .venv/bin/activate && cd ../db && python setup_accounts.py
```

## 改口令 / 换人

- **改口令**(生产必做):
  ```bash
  cd deploy/backend && . .venv/bin/activate
  python -c "import bcrypt,sys;print(bcrypt.hashpw(sys.argv[1].encode(),bcrypt.gensalt()).decode())" '你的新口令'
  # 把输出的 hash 更新进库:
  docker exec -i investplatform-mysql mysql -uroot -p$(cat ~/.investplatform-mysql-root) capitalos \
    -e "UPDATE cap_users SET password_hash='粘贴hash' WHERE login_name='developer';"
  ```
- **给真人开标注权**:不必共用 developer 账号,给其账号加 `developer` 角色即可:
  ```sql
  INSERT IGNORE INTO cap_user_roles (user_id, role_id)
  SELECT (SELECT user_id FROM cap_users WHERE login_name='某人'),
         (SELECT role_id FROM cap_roles WHERE role_code='developer');
  ```
  该用户**重新登录**后才会拿到 `feedback.annotate`(JWT 刷新)。

## GitHub 推送配置

管理员在「汇总」页点「推到 GitHub」会调 GitHub REST 建 issue。需要:
- `GITHUB_TOKEN`(env,推荐)或 `~/.git-credentials` 里的 token(需 issues 写权限);
- `GITHUB_REPO`(env,默认 `zippo1908/InvestPlatform`)。

> ⚠️ 注意:已登录会话改了角色/权限后,**需要重新登录**才会在 JWT 里生效。
