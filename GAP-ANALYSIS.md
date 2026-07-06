# InvestPlatform / CapitalOS — 商业化 Gap 分析

> 审计视角:作为要**卖给大企业、买断价 10 万美金起(不含部署)** 的 B 端产品来审,
> 而非"demo 能不能跑"。方法:代码审计 + 数据层审计 + Playwright 实际驱动运行时
> + curl 安全探测,全部结论由**运行时观察**而非读代码得出。审计日期 2026-07-06。

## 一句话结论

**这是一个做得相当漂亮的"可点击原型(clickable prototype)",不是产品。**
UI 完成度高、数据模型(62 张表)设计得像模像样,但**三根支柱是空的:没有真鉴权、
写操作大面积未接线、AI 全是假的**。当前状态离"能交付给一家企业买断"有 6-9 个月
认真开发的距离。**现在卖 10 万美金 = 卖一个前端演示 + 一份数据库 schema。**

## 实测证据(都是我在跑起来的系统上亲手验证的)

### 🔴 阻断级(不修不能卖,任何一条都是 deal-breaker)

**1. 鉴权系统完全不存在——只是"长得像"**
- 任意密码登录任意账号:`{"account":"ceo_admin","password":"xxxx"}` → 返回
  `demo-session-token` + `roles:["managing_partner"]`。**密码字段根本没校验**
  (schema 里有 `password_hash` 列,登录代码从不查它)。
- **Token 是硬编码字符串** `"demo-session-token"`,后端从不校验它。
- **不带任何 token 直接拿数据**:`GET /api/projects`、`/api/dashboard` → 200。
- **身份靠客户端自报**:所有写端点用 `x_user_id` HTTP header 认身份,默认 =1。
  实测 `curl -H "x_user_id: 999"` 成功以 user 999 身份建了项目。
  → 任何人可冒充任何人、越权任何操作、审计日志被污染。
- 角色永远返回 `managing_partner`,**没有任何 RBAC 落地**(schema 有 8 个角色定义,
  代码零处使用)。

**2. 写操作大面积未接线,且静默失败**
- "新增项目"有一个 18 字段的精致表单(BP 上传/企业信息/融资轮次/AI 回填预览)。
  实测:填入"PLAYWRIGHT验证公司ZZZ"→ 点"提交审批"→ **数据库项目数纹丝不动
  (5→5),没有任何记录,也不报错**。用户以为提交成功了,其实什么都没发生。
- 唯一真正写库的路径是通用 `primary-action`,它**无视表单内容,建一条随机命名的
  垃圾记录**("Frontend Project A3F9")。
- → 核心业务动作(录项目/建基金/发起流程)要么不落库、要么落垃圾。

**3. AI 是 100% 假的**
- `requirements.txt` 无任何 LLM SDK,全代码库**零处调用任何模型 API**。
- "AI BP 解析""AI 大模型工作台""识别到 18 个字段建议、11 个高置信度"——全是写死的
  UI 文案 + 插一条 `cap_ai_parse_jobs` 状态记录。对一个卖点是 AI 的投资平台,
  这是核心价值的裸奔。

### 🟠 严重级(企业采购必查,过不了 POC)

**4. 没有多租户隔离**:schema 有 `org_id`/`parent_org_id`,但**查询零处按租户过滤**。
  一个买断客户的数据和另一个混在一张表,做不到 SaaS 也做不到安全的私有化多组织。
**5. 真正连库的屏只有 ~17%**:42 个"页面"里只有 7 个(项目/基金/公告/日历/消息/
  投资关系/股权变更)真查 MySQL,其余 35 个渲染 `data.ts` 里的**静态假数据**,
  刷新不变、跨会话不存。前端本质是 **1 个 2233 行的通用表格模板渲染了 42 次**。
**6. 导入/导出/高级筛选/批量操作是装饰**:实测"导出"不下载文件,只跳到另一个屏;
  没有真实的文件生成、筛选下推、批量写。
**7. 零自动化测试**:e2e 目录空,后端无测试。企业安全评审第一关就问这个。
**8. CORS = `*`**、无速率限制、无审计不可篡改性、SQL 全裸拼(虽用了参数化,但无 ORM/
  迁移框架,schema 演进靠手改 SQL)。

### 🟡 完成度/体验(有基础,但离商用有距离)

**9. 无分页**:所有列表硬编码 `LIMIT 100`,数据一多就截断且无提示。
**10. 无并发/乐观锁、无软删除一致性、无数据校验层**(金额/信用代码/枚举均不校验)。
**11. 部署即 nohup 进程**,无进程守护、无健康自愈、无可观测性(日志/指标/告警)。

## 值得肯定的(这些是真资产,别推翻重来)

- **信息架构与数据模型扎实**:62 张表覆盖募/投/管/退/投后/风控/文档/流程/审计,
  PE/VC 领域理解到位,是可以在其上真正建业务的骨架。
- **UI/UX 完成度高**:导航分组清晰、审计回执 toast、骨架屏/空态/错误态三态、
  角色切换、全局搜索——**外观已达可 demo 给客户的水准**。
- **审计意识**:几乎每个动作都写 `cap_audit_logs`(虽然身份来源不可信),
  框架在,补上真身份即有效。
- 通用"屏"抽象让**加页面很快**——适合快速铺功能,只是现在铺的是空壳。

## 待开发清单(按"能卖"的优先级排序)

### P0 — 不做就是虚假宣传(预计 6-10 周)
- [x] **真鉴权** ✅ 已完成(2026-07-06):`backend/auth.py` bcrypt 口令校验 + JWT(HS256,
      8h,secret 从 `.env` 强制≥16 位)。登录改为查 `password_hash` + `verify_password`,
      失败统一 401(不泄露账号存在性)且写审计;角色从 `cap_user_roles` 真实读取。
      新增 `enforce_auth` 中间件:所有 `/api/*`(除 login/health/db-ping)无有效 token
      一律 401 —— 兜底保证没有端点被漏掉。删除全部 13 处 `x_user_id` header 信任,
      写端点身份改由 `Depends(current_user)` 从 token 派生。前端 `api.ts` 存 JWT +
      每请求带 `Authorization: Bearer` + 401 自动踢回登录;删除硬编码 `X-User-Id:1`。
      **实测(curl+Playwright):错口令→401、无token→401、伪造header→401、篡改token→401、
      合法JWT→200、清token后导航受保护屏→自动回登录。** token 携带 user_id/org_id/roles,
      为 RBAC 与多租户提供可信上下文。
      > 演示口令:所有种子账号密码统一为 `demo-login`(alex.gp=管理合伙人 / nina.invest=
      > 投资经理 / lena.legal=风控法务 / ryan.research=研究员 …按角色可分别登录看 RBAC);
      > 另建 `demo.user`=管理合伙人保留一键演示。**生产部署必须重置全部口令 + 换 JWT_SECRET。**
- [x] **RBAC 落地** ✅ 已完成(2026-07-06):按 schema 里**既有的权限模型**接线(8 权限
      × cap_role_permissions 映射),而非自造。(1)登录解析 role→permission 写入 JWT(`perms`);
      (2)auth 新增 `require_permission(*codes)` 依赖工厂(权限闸门,403 先于资源查找);
      (3)写/审批端点按语义挂权限:建/推进项目→`project.edit`、风控→`risk.manage`、
      下载→`document.download`、导出→`report.export`、回收站→`system.manage`、建基金/
      工作流→角色集合;(4)前端从登录 `perms` 派生 **per-screen** `canWrite`,无权则禁用
      写按钮 + 显示"只读角色"提示(替换原来假的客户端角色下拉判断)。
      **实测(6 个角色 × 同操作矩阵,curl+Playwright):** 建项目 → MP/投资经理 200、审计/研究/
      基金/法务 403;风控 → 有 risk.manage 者到 404(资源不存在)、无者 403;建基金 → MP/
      基金运营 200、其余 403;读 → 全部 200。**UI:只读审计登录 → 所有写按钮灰化 + 顶部只读横幅;
      投资经理登录 → 同一「新增」按钮在项目屏可用、在基金屏禁用(per-screen 权限差异)。**
      > 补授:managing_partner 授予 project.edit/risk.manage/fund.export(资深合伙人可操作业务,
      > 但 system.manage 仍仅 system_admin)。对照账号:nina.invest(投资经理)/casey.audit(只读审计)/
      > omar.fundops(基金运营)/lena.legal(风控法务),密码均 demo-login。
      > 小遗留(非安全项):顶部角色下拉是展示态,未与登录角色联动;字段级脱敏未做。

### ✅ P0 安全三件套已完整(认证 / 隔离 / 授权)
真鉴权 + 多租户隔离 + RBAC 三层全部落地并端到端验证。**这是"能卖"的最低安全地基。**
后续可切快速迭代:写操作接线(35 屏)、菜单层次重构、分页、真 AI —— 属功能铺量,非安全阻断项。
- [ ] **写操作接线**:表单字段真正映射到 create/update API,提交成功/失败有明确反馈;
      删除或重写"垃圾随机记录"的 primary-action。
- [x] **多租户隔离** ✅ 已完成(2026-07-06):**原状是重大隐患** —— 62 表里只有 3 张业务表
      有 org_id,projects/risks/documents/investors 等核心表零租户列,即"所有客户数据混一张表"。
      做法:(1)租户 = 组织树的根公司(`resolve_tenant_id` 沿 parent_org_id 上溯),登录时
      写入 JWT(`tenant_id`);(2)迁移 `db/patch_tenancy.sql` 给 23 张业务表加 `tenant_id`+索引
      并回填现有数据到租户 1;(3)**读**:全部列表/看板/ledger/dashboard 聚合加 `WHERE tenant_id=%s`
      (LEDGER_QUERIES 14 屏注入租户参数,配置屏如角色/字段保持全局);(4)**写**:所有 INSERT
      盖 tenant_id(`_tenant_for_user` 从 token 可信 actor 反查);(5)**IDOR**:advance/risk/task/
      download/recycle 等按 id 的写操作 SELECT/UPDATE 全部加 `AND tenant_id=%s`,堵住跨租户改数据。
      **实测(建了第二家公司 Meridian 作对照租户,curl+Playwright):** 租户1 见 5 项目/3 基金、
      租户8 见 2 项目/1 基金,dashboard/ledger/funds 全按租户;租户8 推进租户1 项目(跨租户 IDOR)
      →404,推进自己项目→200;新建项目只落本租户,对方仍看不到;**同一 UI 换账号登录 → 完全不同的
      隔离数据集,零泄漏。**
      > 对照账号:`mera.gp`/`demo-login`(Meridian 租户)vs `demo.user`(CapitalOS 租户)。
      > 仍待补(非泄漏项,fail-closed):system-users 管理列表按租户过滤、org 层级树的跨部门可见性策略。

### P1 — POC 会被问到(预计 4-6 周)
- [x] **AI 能力做真** ✅(2026-07-06):原来 AI 100% 假(无 SDK、零模型调用)。现接入
      **OpenAI 兼容**大模型(一处配置换任意供应商:OpenAI/DeepSeek/Moonshot/Qwen/本地
      vLLM/Ollama)。
      - **配置位(调试友好)**:全部走 `deploy/.env` 的 `LLM_*` 段(ENABLED/BASE_URL/
        API_KEY/MODEL/TIMEOUT);`backend/llm.py` 顶部注释列了各家 base_url;
        `GET /api/ai/status` 直接看是否配好、指向哪个 model(**从不回显 key**)。
        填 key + `LLM_ENABLED=true` 即生效,无需改代码。
      - **真端点**:`POST /api/ai/parse-bp`(BP → 结构化项目字段,回填「新增项目」)、
        `POST /api/ai/summarize`(纪要/研究 → 摘要+要点+待办)、`POST /api/ai/analyze`
        (AI 工作台:自定义指令 + 材料 → 自由文本投资分析)。JSON 模式 + 鲁棒解析;
        未配置 fail-closed 503;parse-bp 写 cap_ai_parse_jobs + 审计。
      - **三个 AI 入口全部真接**:新增项目(BP 回填)· 纪要解析(摘要/要点/待办)·
        AI 工作台(指令驱动的自由分析)。均实拍 DeepSeek-V3。
      - **产品级流式体验**(2026-07-06):AI 工作台**与纪要解析**统一改为 SSE 流式 ——
        `POST /api/ai/analyze/stream`(llm.chat_stream 逐 token,StreamingResponse 转 SSE),
        前端 `streamPost` 逐帧解析累加,**边吞吐边渲染**;Markdown 用 marked + DOMPurify
        安全渲染(标题/列表/加粗/表格/代码;并剥离模型可能加的 ``` 围栏),配流式光标。
        **处理中动效**:`AiProcessing` 组件 —— GSAP 无限旋转图标 + 轮播状态文字(交叉淡入)
        + 脉冲点,让观众感知"正在处理";BP 回填、纪要解析、工作台三处均接。
        **实测:** answer 增量流入(0→12→44→75→113)、光标随流闪动;GSAP spinner 实时旋转
        (捕获 rotate(277°));纪要终态渲染核心摘要/关键要点/待办 三个 h2 + 6 li,非代码块。
      - **前端**:新增项目页 AI 面板改为「粘贴 BP → AI 解析 → 应用到表单」真流程;
        纪要解析屏(meeting-ai)改为「粘贴纪要 → AI 解析 → 核心摘要/关键要点/待办事项」真流程
        (待办对象 {task,responsible,deadline} 前端统一格式化)。
      - **真 key 全链路实拍**(硅基流动 DeepSeek-V3):BP → 云枢智能/工业机器人/北京海淀/B轮
        → 回填 → 提交 → 入库(HEX 校验中文);会议纪要 → 摘要+5要点+3待办(含负责人/时限);
        summarize 输出较长,LLM_TIMEOUT 提到 60s。
      - **实测(本地 OpenAI 兼容 mock 全链路 + Playwright):** status 正确反映配置;
        parse-bp 走 HTTP→模型→JSON 抽取(星睿半导体/半导体/上海/B轮/亮点/风险/置信度);
        UI 粘贴 BP → 解析 → 一键回填企业名/行业/城市/摘要 → 可提交入库。验证后已还原为
        未配置态(等用户填真实 key)。依赖零新增(仅标准库 urllib)。
- [~] **静态屏接真写操作(进行中,2026-07-06 一批)**:
      - **菜单层次重构** ✅:14 个扁平分组 → **6 个可折叠业务域**(工作台/投资业务/
        风控与文档/协作与流程/智能与报表/系统与账户)二级导航,默认只展开当前域;
        搜索时全展开。侧栏从"一长条"变"层次分明"。
      - **表单真写** ✅:project-add / fund-add 原来提交的是**写死值**且把无法填写的
        "BP 文件"设为必填(等于永远提交不了)。改为读取真实输入构建 payload、
        数字字段类型转换、只把实体名设必填、入库字段打"入库"标。**实测:UI 填「UI表单
        验证XYZ / 半导体 / 无锡」提交 → 该真值落 cap_projects。**
      - **列表屏主操作接线** ✅:研究库/内部研究→cap_research_notes、管理机构→
        cap_management_orgs、风险登记→cap_risk_incidents、投后填报→
        cap_data_collection_campaigns 四类此前落到 no-op else 的屏,现在真建记录(带
        tenant_id)。加上原有的项目/基金/公告/日历/投资人/工作流/文档,主操作真写覆盖
        约 15 类屏。**实测四屏均 ok=True 且入库。**
      - **detail 屏接真实体 + 编辑保存** ✅(2026-07-06 续批):原 detail 屏是纯静态
        (写死"澜舟机器人"、假行数据、按钮只记日志)。新增后端 `GET/PATCH /api/projects/{id}`
        与 `/api/funds/{id}`(单实体读 + 动态字段更新,均**租户内 + 权限校验**);前端 detail
        改为**实体选择器 → 加载真实主档 → 编辑 → 保存**(apiPatch)。覆盖 project-detail 与
        fund-detail 共 6 屏;投资人 detail 暂留静态。**实测(curl+Playwright):** GET 单项目
        真数据、跨租户 GET/PATCH→404、只读审计 PATCH→403、MP 编辑→200;UI 改「城市」点保存 →
        落 cap_projects(CHAR_LENGTH 校验中文值)。
      - 仍待做:投资持仓/权益变动需实体选择器(依赖已有 project/fund);detail 的关联记录/
        文档/审计 Tab 仍是静态上下文;投资人 detail 编辑。
- [x] **真导入/导出(CSV)** ✅(2026-07-06):原来导入/导出只建一条假"任务"记录,不产生
      文件也不解析。现在:`GET /api/export/{screen_id}` 导出真实 CSV(租户内、UTF-8 BOM
      供 Excel 认中文、写审计);`POST /api/import/projects` 接 CSV 文本 → 逐行校验 →
      真建项目(租户 + project.edit,返回成功数/错误行,支持中英列名回传)。前端:`apiDownload`
      触发真下载;列表工具栏「导出 CSV」直接下文件、「导入 CSV」传文件建记录并刷新列表。
      **实测(curl+Playwright):** 导出得带表头的真 CSV;UI 传 2 行 CSV → 列表 5→7 条、
      审计回执 import.projects、空名行报错;只读审计导入→403。
- [x] **分页** ✅(2026-07-06):ledger 端点去掉写死的 `LIMIT 100`(17 处),改 `page/
      page_size`(上限 200)+ 返回 `total`;子查询计数出总页数。前端 useBackendRows 带页码、
      ListPage 渲染分页条(共 N 条·第 x/y 页 + 上/下页)。**实测:** API page=1/2(size=2)
      返回不同批次、total=5;UI 分页条显示真实总数。仍待:服务端搜索/排序、其余非 ledger 列表。
- [ ] 自动化测试:关键流程 e2e + 后端 API 测试(采购安全评审必看)。

### P2 — 企业级硬要求(预计 4-6 周)
- [ ] 数据校验层(金额/信用代码/枚举/必填);乐观锁防并发覆盖。
- [ ] 迁移框架(Alembic 类)替代手改 SQL;审计日志防篡改。
- [~] **CORS 收紧、速率限制** ✅(2026-07-06):`allow_credentials=False`(Bearer 无 cookie,
      `*` 变合规,`CORS_ALLOW_ORIGINS` 可收紧到域名);进程内滑动窗口限流:登录 10/分/IP、
      `/api/ai/*` 30/分/IP,超限 429。**实测:连打 12 次登录 → 10×401 后转 429。**
      仍待:密钥管理(KMS)、依赖漏洞扫描。
- [~] **生产化:进程守护 + 健康检查 + 备份恢复** ✅(2026-07-06):
      - **systemd --user** 托管 `investplatform-backend`/`-frontend`(Restart=always +
        linger 开机自启);**实测 kill -9 后 6s 内自动恢复、/health 200**。MySQL 容器
        `--restart unless-stopped`。`deploy.sh` 自动改走 systemctl(不再 nohup 抢端口)。
      - **备份**:`tools/backup.sh`(mysqldump 单事务 → gzip,留 7 天),cron 每日 03:00;
        恢复步骤见 `deploy/RUNBOOK.md`。
      - **巡检自愈**:`tools/healthcheck.sh`,cron 每 5min,非 200(含挂死)重启并记日志。
      - 与 **AI Workbench 生产环境完全隔离**(独立 systemd 单元/端口/MySQL/cron 行),
        cron 追加时校验 workbench 4 条原有作业零删除。
      - 运维手册:`deploy/RUNBOOK.md`。仍待:集中式日志/指标/告警面板。
- [ ] SSO/LDAP 对接(大企业几乎必提)、操作审计报表、数据导出合规。

### 定价现实
- **按现状**:这是设计稿 + 数据模型,价值在"省掉了 IA/UI 设计和领域建模",
  对愿意自己接管开发的团队值 1-3 万美金源码授权,不到 10 万。
- **补完 P0+P1(约 3-4 个月认真开发)**:才具备"给一家企业私有化买断"的最低资格,
  10 万美金起才站得住;此时真正的护城河是**领域模型 + 真 AI 投研**,而非 UI。

## 附:审计方法留痕(可复现)
- 环境:MySQL 8.4(docker `investplatform-mysql`,127.0.0.1:3306,库 `capitalos`)、
  后端 FastAPI :7997、前端 :8089。root 密码见 `~/.investplatform-mysql-root`。
- 鉴权探测:`curl -X POST :7997/api/auth/login`(任意密码通过)、无 token GET 200、
  `x_user_id: 999` 越权写入。
- 写操作探测:Playwright 填 project-add 表单提交 → `SELECT COUNT(*) cap_projects`
  前后均 5(未落库);primary-action 建随机记录已清理。
- 连库比例:后端 `LEDGER_QUERIES` 仅 7 屏映射;前端 42 屏定义于 `data.ts`。
