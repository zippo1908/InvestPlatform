# InvestPlatform / CapitalOS — 运维手册(生产化)

> 与 AI Workbench(`tinci_ai_workbench_mvp`,tinci-backend:8003,生产)**完全隔离**:
> 独立 systemd 单元、独立端口(7997/8089)、独立 MySQL 容器、独立 cron 行。
> 任何进程操作只按 `investplatform-*` / InvestPlatform 路径,**禁止** `pkill uvicorn`
> 这类宽泛匹配。

## 架构与端口
- MySQL 8.4:docker 容器 `investplatform-mysql`,`127.0.0.1:3306`,`--restart unless-stopped`
  - root 口令:`/home/tinci/.investplatform-mysql-root`(chmod 600)
- 后端 FastAPI:`investplatform-backend.service` → `0.0.0.0:7997`
- 前端静态:`investplatform-frontend.service` → `0.0.0.0:8089`(serve `deploy/frontend/dist`)

## 安装 systemd 单元(首次)
```bash
cp deploy/systemd/investplatform-*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now investplatform-backend investplatform-frontend
loginctl enable-linger tinci   # 开机自启
```

## 进程托管(systemd --user,已 enable + linger)
```bash
systemctl --user status  investplatform-backend investplatform-frontend
systemctl --user restart investplatform-backend      # 改后端代码后
systemctl --user restart investplatform-frontend
journalctl --user -u investplatform-backend -n 100   # 日志(也写 backend/backend.log)
```
- `Restart=always`(崩溃 3s 自拉);linger=yes(开机自启)。已验证 kill -9 后自动恢复。
- `deploy/deploy.sh {start|stop|restart|status}` 检测到 systemd 单元后自动走 systemctl,
  不再 nohup(避免抢端口)。

## 发布
- 后端改动:`systemctl --user restart investplatform-backend`
- 前端改动:`cd frontend && npm run build && rm -rf ../deploy/frontend/dist && cp -r dist
  ../deploy/frontend/dist`(http.server 直读目录,**无需重启前端**)

## ⚠️ 部署同步纪律(防 FTP/覆盖事故)
> 曾发生:FTP 传错位置,用本地旧版覆盖了服务器 `deploy/`,丢失未提交的后端代码。
- **服务器是权威源**。首选:直接在服务器改 → `git commit` → `git push`(凭据已存,静默推送)。
- **必须用 FTP 时**:先在本地 `git pull` 把远端最新拉下来,再上传;否则旧版会覆盖服务器新代码。
- **提交前务必核对暂存清单**:`git diff --cached --name-only` 要包含**所有**改动文件,
  尤其 `deploy/backend/app.py`——别只提交前端(曾漏提交后端,一次覆盖就丢了)。
- Windows FTP 客户端会把文件转成 CRLF 换行 → git 全标 "modified"。修复:
  `git checkout HEAD -- <未改过的文件>` 还原为 LF;或 `git add --renormalize .`。

## 备份 / 恢复
- 自动:cron 每日 03:00(北京)`tools/backup.sh` → `deploy/backups/capitalos-*.sql.gz`,留 7 天
- 手动备份:`deploy/tools/backup.sh`
- 恢复:
  ```bash
  gunzip -c deploy/backups/capitalos-YYYYmmdd-HHMMSS.sql.gz | \
    docker exec -i investplatform-mysql mysql -uroot -p"$(cat ~/.investplatform-mysql-root)" capitalos
  ```

## 巡检 / 自愈
- cron 每 5 分钟 `tools/healthcheck.sh`:后端/前端返回非 200(含挂死)→ 重启对应服务,
  异常写 `deploy/healthcheck.log`。与 systemd 的崩溃自拉互补(它还能抓"进程在但无响应")。

## 安全
- **鉴权**:bcrypt + JWT(`JWT_SECRET` 在 `.env`);登录失败/无 token → 401。
- **限流**(进程内滑动窗口,防暴破/控 AI 成本):登录 10 次/分/IP、`/api/ai/*` 30 次/分/IP,
  超限 429。
- **多租户 + RBAC**:所有读写按 tenant_id 隔离 + 角色/权限校验(见 GAP-ANALYSIS.md)。
- **CORS**:Bearer 鉴权无 cookie,`allow_credentials=False`;生产建议把
  `CORS_ALLOW_ORIGINS`(`.env`)从 `*` 收紧到具体域名。
- **AI key**:仅在 gitignored 的 `deploy/.env`(`LLM_*`);`GET /api/ai/status` 不回显 key。
- `.env` chmod 600,已 gitignore。

## 故障速查
- 后端 5xx / 起不来:`journalctl --user -u investplatform-backend -n 80`;多为 .env(DB/JWT)
  或 MySQL 容器未起(`docker start investplatform-mysql`)。
- 前端 8089 起不来:多为端口被旧进程占用 → `ss -ltnp | grep 8089` 找 PID 清掉后
  `systemctl --user restart investplatform-frontend`。
- AI 报 503:`.env` 未配 `LLM_ENABLED=true`/key;报 502/超时:上游慢,`LLM_TIMEOUT` 调大。
