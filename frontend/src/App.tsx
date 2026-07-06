import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { gsap } from 'gsap'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BarChart,
  Bell,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Columns,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  Folder,
  GitBranch,
  Home,
  Layers,
  LineChart,
  Lock,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Trash,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import {
  announcements,
  calendarEvents,
  cashflows,
  chartSeries,
  customFields,
  dashboardMetrics,
  documents,
  equityChanges,
  financialRows,
  funds,
  importJobs,
  investments,
  investors,
  managementOrgs,
  messages,
  permissions,
  postDataRows,
  projects,
  recycleRows,
  researchRows,
  risks,
  roles,
  screens,
  stageNames,
  users,
  workflows,
} from './data'
import type { DataRow, Project, Screen } from './data'
import { apiGet, apiPost, auditDetail } from './api'
import type { ApiResult } from './api'

type Toast = {
  title: string
  detail: string
  action?: string
  entity?: string
  result?: ApiResult
}

type BackendReceipt = {
  title: string
  detail: string
  action: string
  entity: string
  auditId?: number
  eventId?: number
  at: string
}

type LedgerResponse = {
  ok: boolean
  source: string
  count: number
  items: Array<Record<string, unknown>>
}

async function runBackendAction(
  onToast: (toast: Toast) => void,
  title: string,
  payload: Record<string, unknown>,
) {
  try {
    const result = await apiPost('/api/actions', payload)
    onToast({
      title,
      detail: auditDetail(result),
      action: String(payload.action ?? 'api.actions'),
      entity: String(payload.entity_type ?? 'action'),
      result,
    })
    return true
  } catch (error) {
    onToast({ title: `${title}失败`, detail: error instanceof Error ? error.message : 'API 调用失败' })
    return false
  }
}

async function auditThenNavigate(
  onToast: (toast: Toast) => void,
  title: string,
  target: string,
  payload: Record<string, unknown>,
) {
  await runBackendAction(onToast, title, payload)
  goTo(target)
}

const appScreens = screens.filter((screen) => screen.id !== 'login')

const groupOrder = [
  '工作台',
  '协同工具',
  '流程中心',
  '项目管理',
  '基金管理',
  '投资人',
  '投后管理',
  '风险管理',
  '文档管理',
  'AI 数据库',
  '报表驾驶舱',
  '通用能力',
  '系统管理',
  '账户',
]

const groupIcons: Record<string, LucideIcon> = {
  工作台: Home,
  协同工具: Bell,
  流程中心: GitBranch,
  项目管理: Briefcase,
  基金管理: Database,
  投资人: Users,
  投后管理: LineChart,
  风险管理: Shield,
  文档管理: Folder,
  'AI 数据库': Bot,
  报表驾驶舱: BarChart,
  通用能力: Layers,
  系统管理: Settings,
  账户: User,
}

function readRoute() {
  const clean = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return clean || 'login'
}

function goTo(id: string) {
  window.location.hash = `/${id}`
}

function classNames(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function navShortLabel(title: string) {
  return Array.from(title.replace(/[\\s-]/g, '')).slice(0, 2).join('')
}

function receiptFromToast(toast: Toast): BackendReceipt | null {
  const result = toast.result
  const parsedAuditId = Number(toast.detail.match(/#(\d+)/)?.[1])
  const auditId = typeof result?.audit_id === 'number' ? result.audit_id : Number.isFinite(parsedAuditId) ? parsedAuditId : undefined
  const eventId = typeof result?.event_id === 'number' ? result.event_id : undefined
  const action = toast.action ?? (typeof result?.action === 'string' ? result.action : toast.title)
  const entity = toast.entity ?? (typeof result?.entity_type === 'string' ? result.entity_type : 'backend')

  if (!auditId && !eventId && !toast.action && !toast.result) {
    return null
  }

  return {
    title: toast.title,
    detail: toast.detail,
    action,
    entity,
    auditId,
    eventId,
    at: new Date().toLocaleTimeString(),
  }
}

function normalizeRows(items: Array<Record<string, unknown>>): DataRow[] {
  return items.map((item) =>
    Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        value === null || value === undefined ? '' : typeof value === 'number' || typeof value === 'string' ? value : String(value),
      ]),
    ),
  )
}

function mapBackendStage(stage: string) {
  const stageMap: Record<string, string> = {
    Sourced: '入库',
    Screening: '入库',
    'Project Approval': '立项',
    TS: 'TS',
    Diligence: '尽调',
    IC: '投决',
    Agreement: '投资协议',
    Funded: '打款',
    'Post Investment': '投后服务',
  }
  return stageMap[stage] ?? stage
}

function useBackendRows(screenId: string, fallbackRows: DataRow[]) {
  const [rows, setRows] = useState<DataRow[]>(fallbackRows)
  const [source, setSource] = useState<'loading' | 'mysql' | 'mock'>('loading')

  useEffect(() => {
    let active = true
    setRows(fallbackRows)
    setSource('loading')

    apiGet<LedgerResponse>(`/api/ledger/${screenId}`)
      .then((result) => {
        if (!active) return
        setRows(normalizeRows(result.items))
        setSource(result.source === 'mysql' ? 'mysql' : 'mock')
      })
      .catch(() => {
        if (!active) return
        setRows(fallbackRows)
        setSource('mock')
      })

    return () => {
      active = false
    }
  }, [screenId, fallbackRows])

  return { rows, source }
}

function App() {
  const [route, setRoute] = useState(readRoute)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('capitalos-session') === 'active')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860)
  const [role, setRole] = useState(roles[0])
  const [navSearch, setNavSearch] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [backendReceipt, setBackendReceipt] = useState<BackendReceipt | null>(null)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (toast) {
      const handle = window.setTimeout(() => setToast(null), 2600)
      return () => window.clearTimeout(handle)
    }
  }, [toast])

  useEffect(() => {
    apiGet<{ ok: boolean }>('/health')
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('error'))
  }, [])

  useLayoutEffect(() => {
    if (!pageRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.motion-item',
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out', stagger: 0.035 },
      )
    }, pageRef)

    return () => ctx.revert()
  }, [route, authed])

  const current = appScreens.find((screen) => screen.id === route) ?? appScreens[0]
  const canWrite = role !== '只读审计'
  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    const receipt = receiptFromToast(nextToast)
    if (receipt) {
      setBackendReceipt(receipt)
    }
  }

  const navGroups = useMemo(() => {
    const query = navSearch.trim().toLowerCase()
    return groupOrder
      .map((group) => ({
        group,
        items: appScreens.filter((screen) => {
          const haystack = `${screen.title} ${screen.description} ${screen.group}`.toLowerCase()
          return screen.group === group && (!query || haystack.includes(query))
        }),
      }))
      .filter((entry) => entry.items.length > 0)
  }, [navSearch])

  const showLogin = !authed || route === 'login'

  if (showLogin) {
    return (
      <LoginScreen
        onLogin={async (account, password) => {
          const result = await apiPost('/api/auth/login', { account, password })
          sessionStorage.setItem('capitalos-session', 'active')
          sessionStorage.setItem('capitalos-user-id', String((result.user as { id?: number } | undefined)?.id ?? 1))
          setAuthed(true)
          showToast({ title: '登录成功', detail: auditDetail(result), action: 'auth.login', entity: 'user', result })
          goTo('workbench')
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <aside className={classNames('sidebar', !sidebarOpen && 'sidebar-collapsed')} aria-label="主导航">
        <div className="brand-block">
          <button
            className="icon-button"
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={sidebarOpen ? '收起导航' : '展开导航'}
            title={sidebarOpen ? '收起导航' : '展开导航'}
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
          <div className="brand-copy">
            <span className="brand-mark">C</span>
            <div>
              <strong>CapitalOS</strong>
              <small>投资运营中台</small>
            </div>
          </div>
        </div>

        <label className="nav-search">
          <Search size={15} />
          <input
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
            placeholder="搜索页面"
            aria-label="搜索页面"
          />
        </label>

        <nav className="nav-groups">
          {navGroups.map(({ group, items }) => {
            const Icon = groupIcons[group] ?? Folder
            return (
              <section className="nav-group" key={group}>
                <div className="nav-group-title">
                  <Icon size={15} />
                  <span>{group}</span>
                </div>
                {items.map((screen) => (
                  <button
                    key={screen.id}
                    type="button"
                    data-testid={`nav-link-${screen.id}`}
                    className={classNames('nav-link', screen.id === current.id && 'is-active')}
                    title={screen.title}
                    aria-label={screen.title}
                    onClick={() => goTo(screen.id)}
                  >
                    <span className="nav-label">{screen.title}</span>
                    <span className="nav-short" aria-hidden="true">{navShortLabel(screen.title)}</span>
                    {screen.id === current.id && <ChevronRight size={15} />}
                  </button>
                ))}
              </section>
            )
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-only"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label="切换导航"
            >
              <Menu size={18} />
            </button>
            <div className="breadcrumbs">
              <span>{current.group}</span>
              <ChevronRight size={14} />
              <strong>{current.title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={classNames('api-status', backendStatus === 'connected' && 'is-online', backendStatus === 'error' && 'is-error')}>
              API {backendStatus === 'connected' ? '已连接' : backendStatus === 'error' ? '未连接' : '检查中'}
            </span>
            <label className="role-select">
              <span>角色</span>
              <select
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value
                  setRole(nextRole)
                  void runBackendAction(showToast, '角色已切换', {
                    action: 'auth.role.switch',
                    entity_type: 'role',
                    entity_label: nextRole,
                    after: { role: nextRole },
                  })
                }}
                aria-label="当前角色"
              >
                {roles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button
              className="icon-button"
              type="button"
              title="消息中心"
              onClick={() =>
                auditThenNavigate(showToast, '消息中心已打开', 'message-center', {
                  action: 'topbar.message_center.open',
                  entity_type: 'screen',
                  entity_label: '消息中心',
                  after: { target: 'message-center' },
                })
              }
            >
              <Bell size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              title="退出登录"
              onClick={async () => {
                await runBackendAction(showToast, '退出登录', {
                  action: 'auth.logout',
                  entity_type: 'auth',
                  entity_label: 'local-session',
                  after: { route: current.id },
                })
                sessionStorage.removeItem('capitalos-session')
                setAuthed(false)
                goTo('login')
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="page-scroll" ref={pageRef} key={current.id}>
          <PageHeader current={current} canWrite={canWrite} onToast={showToast} />
          {!canWrite && (
            <div className="permission-banner motion-item" role="note">
              <Lock size={16} />
              当前为只读审计角色：新增、编辑、删除、导出和二次鉴权操作会被禁用，敏感字段已脱敏。
            </div>
          )}
          <PageRenderer screen={current} canWrite={canWrite} onToast={showToast} />
        </main>
      </div>

      {toast && (
        <div className="toast" role="status">
          <CheckCircle size={18} />
          <div>
            <strong>{toast.title}</strong>
            <span>{toast.detail}</span>
          </div>
        </div>
      )}
      {backendReceipt && (
        <aside className="backend-receipt" aria-label="后端回执">
          <div>
            <CheckCircle size={17} />
            <strong>后端回执</strong>
          </div>
          <button type="button" className="link-button" onClick={() => setBackendReceipt(null)} aria-label="关闭后端回执">
            <X size={15} />
          </button>
          <dl>
            <dt>动作</dt>
            <dd>{backendReceipt.action}</dd>
            <dt>对象</dt>
            <dd>{backendReceipt.entity}</dd>
            <dt>审计</dt>
            <dd>{backendReceipt.auditId ? `#${backendReceipt.auditId}` : '未生成'}</dd>
            <dt>事件</dt>
            <dd>{backendReceipt.eventId ? `#${backendReceipt.eventId}` : '审计类接口'}</dd>
          </dl>
          <p>{backendReceipt.title} · {backendReceipt.at}</p>
        </aside>
      )}
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (account: string, password: string) => Promise<void> }) {
  const [account, setAccount] = useState('demo.user')
  const [secret, setSecret] = useState('demo-login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account.trim() || secret.trim().length < 4) {
      setError('请输入账号，并使用不少于 4 位的本地演示口令。')
      return
    }
    setPending(true)
    setError('')
    try {
      await onLogin(account, secret)
    } catch (error) {
      setError(error instanceof Error ? error.message : '后端登录接口调用失败。')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page" data-screen-id="login">
      <section className="login-copy motion-item">
        <span className="product-kicker">CapitalOS Full Scope</span>
        <h1 data-testid="screen-title">投资运营中台</h1>
        <p>覆盖募、投、管、退、投后、风控、文档、流程、AI 投研、报表与系统管理；写操作通过后端 API 落库并进入审计。</p>
        <div className="login-metrics">
          <MetricPill label="页面覆盖" value="41" />
          <MetricPill label="业务对象" value="24+" />
          <MetricPill label="权限角色" value="8" />
        </div>
      </section>

      <form className="login-card motion-item" onSubmit={submit}>
        <div>
          <span className="form-eyebrow">本地演示登录</span>
          <h2>进入工作台</h2>
        </div>
        <label>
          <span>账号 / 邮箱 / 工号</span>
          <input value={account} onChange={(event) => setAccount(event.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>登录口令</span>
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <div className="login-options">
          <label className="checkbox-line">
            <input type="checkbox" defaultChecked />
            <span>30 天内保持登录</span>
          </label>
          <button
            type="button"
            className="link-button"
            onClick={async () => {
              try {
                const result = await apiPost('/api/actions', {
                  action: 'auth.otp.request',
                  entity_type: 'auth',
                  entity_label: account,
                  after: { account, channel: 'sms' },
                })
                setNotice(`验证码请求已写入审计 #${result.audit_id ?? '-'}`)
              } catch (error) {
                setError(error instanceof Error ? error.message : '验证码接口调用失败。')
              }
            }}
          >
            短信验证码
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}
        <button type="submit" className="primary-button large-button" data-testid="login-submit" disabled={pending}>
          <Lock size={17} />
          {pending ? '登录中' : '登录'}
        </button>
        <p className="security-note">
          演示环境不连接原站登录，不保存真实账号口令；登录事件会写入当前后端数据库审计。
        </p>
      </form>
    </main>
  )
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function PageHeader({
  current,
  canWrite,
  onToast,
}: {
  current: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  return (
    <section className="page-header motion-item" data-screen-id={current.id}>
      <div>
        <span className="page-kicker">{current.group}</span>
        <h1 data-testid="screen-title">{current.title}</h1>
        <p>{current.description}</p>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            runBackendAction(onToast, '筛选已应用', {
              action: 'screen.filter.apply',
              entity_type: 'screen',
              entity_label: current.title,
              after: { screen_id: current.id, filter: 'advanced' },
            })
          }
        >
          <Filter size={16} />
          高级筛选
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            runBackendAction(onToast, '列配置已保存', {
              action: 'screen.columns.save',
              entity_type: 'screen',
              entity_label: current.title,
              after: { screen_id: current.id, columns: ['name', 'status', 'owner'] },
            })
          }
        >
          <Columns size={16} />
          显示列
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!canWrite}
          onClick={async () => {
            try {
              const result = await apiPost(`/api/screens/${current.id}/primary-action`)
              onToast({
                title: current.primaryAction,
                detail: auditDetail(result),
                action: `screen.${current.id}.primary_action`,
                entity: typeof result.affected_table === 'string' ? result.affected_table : 'screen',
                result,
              })
            } catch (error) {
              onToast({ title: '后端写入失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        >
          <Plus size={16} />
          {current.primaryAction}
        </button>
      </div>
    </section>
  )
}

function PageRenderer({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  if (screen.id === 'workbench') return <DashboardPage onToast={onToast} />
  if (screen.kind === 'ai') return <AiPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'board') return <BoardPage canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'form') return <FormPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'detail') return <DetailPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'flow') return <FlowPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'documents') return <DocumentsPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'risk') return <RiskPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'report') return <ReportPage onToast={onToast} />
  if (screen.kind === 'admin') return <AdminPage screen={screen} canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'settings') return <SettingsPage canWrite={canWrite} onToast={onToast} />
  if (screen.kind === 'recycle') return <RecyclePage canWrite={canWrite} onToast={onToast} />
  return <ListPage screen={screen} canWrite={canWrite} onToast={onToast} />
}

function DashboardPage({ onToast }: { onToast: (toast: Toast) => void }) {
  const stageCounts = stageNames.map((stage) => ({
    stage,
    count: projects.filter((project) => project.stage === stage).length,
  }))

  return (
    <div className="page-grid">
      <section className="metrics-row motion-item">
        {dashboardMetrics.map((metric) => (
          <article className={classNames('metric-card', `tone-${metric.tone}`)} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.trend}</small>
          </article>
        ))}
      </section>

      <section className="panel two-thirds motion-item">
        <PanelTitle
          icon={LineChart}
          title="项目阶段分布"
          action="查看项目池"
          onAction={() =>
            auditThenNavigate(onToast, '已打开项目池', 'project-board', {
              action: 'dashboard.project_board.open',
              entity_type: 'dashboard_widget',
              entity_label: '项目阶段分布',
              after: { target: 'project-board' },
            })
          }
        />
        <div className="pipeline-chart">
          {stageCounts.map((item, index) => (
            <div className="pipeline-bar" key={item.stage}>
              <span>{item.stage}</span>
              <div>
                <i style={{ height: `${22 + item.count * 28 + index * 2}px` }} />
              </div>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel motion-item">
        <PanelTitle
          icon={Clock}
          title="今日待办"
          action="进入消息中心"
          onAction={() =>
            auditThenNavigate(onToast, '已进入消息中心', 'message-center', {
              action: 'dashboard.message_center.open',
              entity_type: 'dashboard_widget',
              entity_label: '今日待办',
              after: { target: 'message-center' },
            })
          }
        />
        <TaskList rows={workflows} />
      </section>

      <section className="panel motion-item">
        <PanelTitle
          icon={Shield}
          title="风险热区"
          action="处理风险"
          onAction={() =>
            auditThenNavigate(onToast, '已打开风险处置', 'burst-risk', {
              action: 'dashboard.risk.open',
              entity_type: 'dashboard_widget',
              entity_label: '风险热区',
              after: { target: 'burst-risk' },
            })
          }
        />
        <RiskHeatmap onToast={onToast} />
      </section>

      <section className="panel two-thirds motion-item">
        <PanelTitle
          icon={Database}
          title="基金组合表现"
          action="基金列表"
          onAction={() =>
            auditThenNavigate(onToast, '已打开基金列表', 'fund-list', {
              action: 'dashboard.fund_list.open',
              entity_type: 'dashboard_widget',
              entity_label: '基金组合表现',
              after: { target: 'fund-list' },
            })
          }
        />
        <DataTable rows={funds} compact />
      </section>

      <section className="panel motion-item">
        <PanelTitle
          icon={Bot}
          title="AI 解析队列"
          action="打开 AI"
          onAction={() =>
            auditThenNavigate(onToast, 'AI 队列已打开', 'ai-workspace', {
              action: 'dashboard.ai_workspace.open',
              entity_type: 'dashboard_widget',
              entity_label: 'AI 解析队列',
              after: { target: 'ai-workspace' },
            })
          }
        />
        <div className="ai-queue">
          {['北辰储能 TS 条款抽取', '启明细胞会议纪要摘要', '成长一期披露包要点'].map((item, index) => (
            <div className="queue-item" key={item}>
              <span>{item}</span>
              <StatusBadge value={index === 0 ? '待人工确认' : index === 1 ? '解析中' : '已完成'} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AiPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const meeting = screen.id === 'meeting-ai'

  return (
    <div className="page-grid">
      <section className="panel motion-item">
        <PanelTitle icon={Upload} title={meeting ? '会议纪要上传' : '文件解析入口'} />
        <div className="upload-zone">
          <Upload size={34} />
          <strong>{meeting ? '拖入会议音频、纪要或投委会材料' : '拖入 BP、协议、财报或行业报告'}</strong>
          <span>支持 PDF、DOCX、PPTX、XLSX；解析任务通过后端登记，人工确认后才写入审计。</span>
          <button
            className="primary-button"
            type="button"
            disabled={!canWrite}
            onClick={async () => {
              try {
                const result = await apiPost(`/api/screens/${screen.id}/primary-action`)
                onToast({
                  title: '解析任务已创建',
                  detail: auditDetail(result),
                  action: 'ai.parse.create',
                  entity: 'cap_ai_parse_jobs',
                  result,
                })
              } catch (error) {
                onToast({ title: '后端写入失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
              }
            }}
          >
            <Bot size={16} />
            创建解析任务
          </button>
        </div>
      </section>

      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Bot} title={meeting ? '纪要解析结果' : 'AI 输出工作台'} />
        <div className="ai-result-grid">
          {[
            ['核心摘要', meeting ? '会议确认继续推进投决材料，补充临床路径和资金用途。' : '项目增长来自头部客户复购，毛利率提升但现金回款存在周期压力。'],
            ['关键条款', '优先清算权、反稀释、董事席位、信息权和回购触发条件需要法务复核。'],
            ['下一步计划', '2 个工作日内补齐底稿，形成审批流程附件，并同步风险条款提醒。'],
            ['来源引用', '第 3、7、12 页；会议 00:12:30 至 00:27:45；财务模型 Sheet B。'],
          ].map(([title, detail]) => (
            <article className="ai-result-card" key={title}>
              <span>{title}</span>
              <p>{detail}</p>
            </article>
          ))}
        </div>
        <div className="confirm-strip">
          <div>
            <strong>{confirmed ? '已人工确认，可入库' : '等待人工确认'}</strong>
            <span>未经确认的 AI 输出不会写入业务对象、文档关联或审计日志。</span>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={!canWrite}
            onClick={async () => {
              setConfirmed(true)
              try {
                const result = await apiPost('/api/actions', {
                  action: 'ai.output.confirm',
                  entity_type: 'ai_parse_output',
                  entity_id: 3,
                  entity_label: screen.title,
                  after: { human_status: 'accepted' },
                })
                onToast({ title: 'AI 结果已确认', detail: auditDetail(result) })
              } catch (error) {
                onToast({ title: '后端写入失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
              }
            }}
          >
            <CheckCircle size={16} />
            确认入库
          </button>
        </div>
      </section>

      <section className="panel motion-item">
        <PanelTitle icon={FileText} title="解析历史" />
        <TaskList
          rows={[
            { 流程名称: 'BP 解析', 类别: '项目', 当前节点: '人工确认', 关联对象: '矩阵医疗', 到期: '2026-07-02', 状态: '待确认' },
            { 流程名称: '协议条款抽取', 类别: '法务', 当前节点: '已入库', 关联对象: '北辰储能', 到期: '2026-07-01', 状态: '已完成' },
            { 流程名称: '会议摘要', 类别: '投决', 当前节点: '解析失败', 关联对象: '启明细胞', 到期: '2026-07-01', 状态: '失败' },
          ]}
        />
      </section>
    </div>
  )
}

function BoardPage({
  canWrite,
  onToast,
}: {
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const [boardView, setBoardView] = useState('all')
  const [boardProjects, setBoardProjects] = useState<Project[]>(projects)
  const [source, setSource] = useState<'loading' | 'mysql' | 'mock'>('loading')
  const boardViews = [
    { key: 'all', label: '全部项目' },
    { key: 'mine', label: '我的负责' },
    { key: 'risk', label: '风险优先' },
  ]
  const loadProjects = () => {
    setSource('loading')
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/projects')
      .then((result) => {
        setBoardProjects(
          result.items.map((item) => ({
            name: String(item.name ?? ''),
            company: String(item.name ?? ''),
            stage: mapBackendStage(String(item.stage ?? 'Sourced')),
            sector: String(item.sector ?? ''),
            city: String(item.city ?? ''),
            owner: String(item.owner ?? '-'),
            status: String(item.status ?? 'sourced'),
            fund: '后端项目池',
            amount: 0,
            risk: '中',
            nextStep: String(item.summary ?? '等待下一步动作'),
          })),
        )
        setSource('mysql')
      })
      .catch(() => {
        setBoardProjects(projects)
        setSource('mock')
      })
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <section className="board-panel motion-item">
      <div className="board-toolbar">
        <DataSourceBadge source={source} />
        <div className="segmented">
          {boardViews.map((item) => (
            <button
              className={classNames(boardView === item.key && 'is-selected')}
              key={item.key}
              type="button"
              onClick={() => {
                setBoardView(item.key)
                void runBackendAction(onToast, `${item.label}视图`, {
                  action: 'project_board.view.switch',
                  entity_type: 'project_board',
                  entity_label: item.label,
                  after: { view: item.key },
                })
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={!canWrite}
          onClick={async () => {
            try {
              const result = await apiPost('/api/projects/3/advance')
              onToast({ title: '阶段推进', detail: auditDetail(result), action: 'project.advance_stage', entity: 'cap_projects', result })
              loadProjects()
            } catch (error) {
              onToast({ title: '阶段推进失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        >
          <Send size={16} />
          批量推进
        </button>
      </div>
      <div className="kanban-board" data-testid="kanban-board">
        {stageNames.map((stage) => {
          const rows = boardProjects.filter((project) => project.stage === stage)
          return (
            <section className="kanban-column" key={stage} data-testid={`project-stage-${stage}`}>
              <header>
                <strong>{stage}</strong>
                <span>{rows.length}</span>
              </header>
              {rows.map((project, index) => (
                <ProjectCard project={project} key={`${stage}-${project.name}-${index}`} onToast={onToast} />
              ))}
              {rows.length === 0 && <div className="empty-card">暂无项目</div>}
            </section>
          )
        })}
      </div>
    </section>
  )
}

function ProjectCard({ project, onToast }: { project: Project; onToast: (toast: Toast) => void }) {
  return (
    <button
      type="button"
      className="project-card"
      onClick={() =>
        auditThenNavigate(onToast, '项目详情已打开', 'project-detail-overview', {
          action: 'project.card.open',
          entity_type: 'project',
          entity_label: project.name,
          after: { target: 'project-detail-overview', stage: project.stage },
        })
      }
    >
      <div>
        <strong>{project.name}</strong>
        <StatusBadge value={project.risk === '高' ? '高风险' : project.status} />
      </div>
      <span>{project.sector} · {project.city}</span>
      <small>{project.owner} / {project.fund}</small>
      <p>{project.nextStep}</p>
    </button>
  )
}

function FormPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const isFund = screen.id === 'fund-add'
  const groups: Array<[string, string[]]> = isFund
    ? [
        ['基础信息', ['基金简称', '基金全称', '备案编号', '管理人', '托管行', '组织形式']],
        ['规模期限', ['目标规模', '首关规模', '投资期', '退出期', '管理费率', '收益分配']],
        ['治理披露', ['投委会成员', '观察员', '关键人士', '关联交易规则', 'LP 披露频率', '审计安排']],
      ]
    : [
        ['BP 与 AI 回填', ['BP 文件', 'AI 解析状态', '企业简称', '企业全称', '统一信用代码', '项目亮点']],
        ['基础信息', ['负责人', '城市', '行业方向', '注册地', '融资轮次', '预估投资额']],
        ['描述字段', ['产品服务', '商业模式', '主要客户', '竞争优势', '风险摘要', '下一步计划']],
      ]

  return (
    <form
      className="form-layout motion-item"
      onSubmit={async (event) => {
        event.preventDefault()
        try {
          const result =
            screen.id === 'project-add'
              ? await apiPost('/api/projects', {
                  short_name: 'API Created Project',
                  legal_name: 'API Created Project Co',
                  industry_group: 'Enterprise Software',
                  city: 'Shanghai',
                  summary: 'Created from frontend form submit.',
                })
              : await apiPost('/api/funds', {
                  fund_name: 'API Created Fund',
                  legal_name: 'API Created Fund Partnership',
                  target_size: 100000000,
                  committed_size: 20000000,
                  paid_in_size: 5000000,
                  fund_status: 'raising',
                })
          onToast({
            title: `${screen.title}已提交`,
            detail: auditDetail(result),
            action: screen.id === 'project-add' ? 'project.create' : 'fund.create',
            entity: screen.id === 'project-add' ? 'cap_projects' : 'cap_funds',
            result,
          })
        } catch (error) {
          onToast({ title: '提交失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
        }
      }}
    >
      <section className="form-main">
        {groups.map(([group, fields]) => (
          <fieldset className="form-section" key={group}>
            <legend>{group}</legend>
            <div className="form-grid">
              {fields.map((field, index) => (
                <label key={field}>
                  <span>
                    {field}
                    {index < 3 && <i>必填</i>}
                  </span>
                  <input
                    required={index < 3}
                    readOnly={!canWrite}
                    placeholder={field.includes('文件') ? '选择或拖入附件' : `请输入${field}`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>
      <aside className="form-side">
        <PanelTitle icon={Bot} title="AI 回填预览" />
        <p>识别到 18 个字段建议，其中 11 个高置信度、5 个需人工复核、2 个不建议写入。</p>
        <div className="review-list">
          {['公司简称', '行业方向', '融资轮次', '核心风险'].map((item) => (
            <div key={item}>
              <CheckCircle size={15} />
              <span>{item}</span>
              <strong>可采纳</strong>
            </div>
          ))}
        </div>
        <button
          className="secondary-button full-width"
          type="button"
          disabled={!canWrite}
          onClick={() =>
            runBackendAction(onToast, 'AI 建议已应用', {
              action: 'form.ai_prefill.apply',
              entity_type: screen.id.includes('fund') ? 'fund' : 'project',
              entity_label: screen.title,
              after: { screen_id: screen.id, accepted_fields: 4 },
            })
          }
        >
          应用 AI 建议
        </button>
        <button
          className="secondary-button full-width"
          type="button"
          onClick={() =>
            runBackendAction(onToast, '草稿已保存', {
              action: 'form.draft.save',
              entity_type: screen.id.includes('fund') ? 'fund' : 'project',
              entity_label: screen.title,
              after: { screen_id: screen.id, draft: true },
            })
          }
        >
          保存草稿
        </button>
        <button className="primary-button full-width" type="submit" data-testid="form-submit" disabled={!canWrite}>
          提交审批
        </button>
      </aside>
    </form>
  )
}

function DetailPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const tabs = screen.tabs ?? ['概况', '记录', '文档', '审计']
  const [active, setActive] = useState(tabs[0])
  const rows = detailRows(screen.id)

  return (
    <div className="page-grid">
      <section className="panel detail-hero two-thirds motion-item">
        <div>
          <span className="page-kicker">{screen.group}</span>
          <h2>{screen.id.includes('fund') ? '成长一期基金' : screen.id.includes('investor') ? '华东产业母基金' : '澜舟机器人'}</h2>
          <p>主档、关联流程、文档、审计、权限和 AI 摘要全部使用同一对象上下文。</p>
        </div>
        <div className="detail-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              runBackendAction(onToast, '审计日志已打开', {
                action: 'detail.audit.open',
                entity_type: 'detail_page',
                entity_label: screen.title,
                after: { screen_id: screen.id },
              })
            }
          >
            <Eye size={16} />
            查看审计
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!canWrite}
            onClick={() =>
              runBackendAction(onToast, '关联记录已新增', {
                action: 'detail.related_record.create',
                entity_type: 'detail_page',
                entity_label: screen.title,
                after: { screen_id: screen.id, relation_type: 'note' },
              })
            }
          >
            <Plus size={16} />
            新增关联记录
          </button>
        </div>
      </section>

      <section className="panel motion-item">
        <PanelTitle icon={Clock} title="关键时间线" />
        <Timeline />
      </section>

      <section className="panel full-span motion-item">
        <div className="tabs" data-testid="detail-tabs">
          {tabs.map((tab) => (
            <button className={classNames(tab === active && 'is-selected')} key={tab} type="button" onClick={() => setActive(tab)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="tab-content">
          <div className="tab-summary">
            <strong>{active}</strong>
            <span>当前 Tab 保持对象上下文，支持权限、加载、空状态、审计和关联跳转。</span>
          </div>
          <DataTable rows={rows} />
        </div>
      </section>
    </div>
  )
}

function FlowPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const lanes = screen.id === 'flow-center' ? ['项目类', '基金类', '日常办公'] : screen.id === 'flow-project' ? ['立项', '尽调', '投决', '协议', '付款', '退出'] : screen.id === 'flow-fund' ? ['设立', '付款', 'LP 披露', '条款变更', '财报审批'] : ['用印', '报销', '请假', '采购', '人事']

  return (
    <div className="page-grid">
      <section className="panel full-span motion-item">
        <PanelTitle icon={GitBranch} title="流程模板与发起入口" />
        <div className="flow-lanes">
          {lanes.map((lane, index) => (
            <article className="flow-card" key={lane}>
              <span>{lane}</span>
              <strong>{3 + index} 个模板</strong>
              <p>发起、审批、驳回、转办、抄送、委托、附件、归档、审计全部可追踪。</p>
              <button
                className="secondary-button"
                type="button"
                disabled={!canWrite}
                onClick={async () => {
                  try {
                    const result = await apiPost('/api/workflow/instances', {
                      title: `${lane}流程-${screen.title}`,
                      workflow_family: screen.id === 'flow-fund' ? 'fund' : screen.id === 'flow-oa' ? 'office' : 'project',
                      payload: { lane, screen: screen.id },
                    })
                    onToast({
                      title: `${lane}流程已发起`,
                      detail: auditDetail(result),
                      action: 'workflow.start',
                      entity: 'cap_workflow_instances',
                      result,
                    })
                  } catch (error) {
                    onToast({ title: '流程发起失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
                  }
                }}
              >
                发起
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Clock} title="审批任务" />
        <DataTable rows={workflows} />
      </section>
      <section className="panel motion-item">
        <PanelTitle icon={User} title="委托设置" />
        <div className="delegate-card">
          <label>
            <span>委托给</span>
            <input readOnly={!canWrite} defaultValue="基金运营 / 赵岚" />
          </label>
          <label>
            <span>有效期</span>
            <input readOnly={!canWrite} defaultValue="2026-07-02 至 2026-07-12" />
          </label>
          <button
            className="primary-button full-width"
            type="button"
            disabled={!canWrite}
            onClick={() =>
              runBackendAction(onToast, '委托已保存', {
                action: 'workflow.delegation.save',
                entity_type: 'workflow_delegation',
                entity_label: screen.title,
                after: { workflow_family: screen.id, delegatee: 'fund_operator' },
              })
            }
          >
            保存委托
          </button>
        </div>
      </section>
    </div>
  )
}

function DocumentsPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const folders = ['项目文件', '基金文件', '共享文件', '流程文件', '回收站']
  const [activeFolder, setActiveFolder] = useState(screen.id === 'process-files' ? '流程文件' : '项目文件')

  return (
    <div className="document-layout motion-item">
      <aside className="doc-tree">
        {folders.map((item) => (
          <button
            className={classNames(activeFolder === item && 'is-selected')}
            key={item}
            type="button"
            onClick={() => {
              setActiveFolder(item)
              void runBackendAction(onToast, `${item}目录`, {
                action: 'document.folder.open',
                entity_type: 'document_folder',
                entity_label: item,
                after: { folder: item },
              })
            }}
          >
            <Folder size={16} />
            {item}
          </button>
        ))}
      </aside>
      <section className="panel doc-main">
        <PanelTitle
          icon={FileText}
          title={screen.id === 'process-files' ? '流程归档文件' : '文档中心'}
          action="二次鉴权"
          onAction={async () => {
            try {
              const result = await apiPost('/api/documents/1/download')
              onToast({ title: '二次鉴权通过', detail: auditDetail(result) })
            } catch (error) {
              onToast({ title: '二次鉴权失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        />
        <div className="doc-permissions">
          {['预览', '下载', '编辑', '删除', '分享', '水印', '版本', '审计'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <DataTable rows={documents} />
        <button
          className="primary-button"
          type="button"
          disabled={!canWrite}
          onClick={async () => {
            try {
              const result = await apiPost('/api/documents', {
                title: `${activeFolder}上传文件`,
                document_kind: activeFolder === '流程文件' ? 'workflow' : activeFolder === '基金文件' ? 'fund' : 'shared',
                file_name: 'frontend-upload-placeholder.pdf',
                storage_uri: `mock://documents/${activeFolder}/frontend-upload-placeholder.pdf`,
                file_size_bytes: 2048,
              })
              onToast({
                title: screen.primaryAction,
                detail: auditDetail(result),
                action: 'document.upload',
                entity: 'cap_documents',
                result,
              })
            } catch (error) {
              onToast({ title: '上传失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        >
          <Upload size={16} />
          {screen.primaryAction}
        </button>
      </section>
    </div>
  )
}

function RiskPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const clauseRows: DataRow[] = [
    { 基金简称: '双碳基金', 项目名称: '北辰储能', 轮次: 'B 轮', 条款状态: '待触发', 特殊条款: '回购权', 提醒日期: '2026-07-09', 责任人: '何璟' },
    { 基金简称: '医疗专项', 项目名称: '矩阵医疗', 轮次: 'C 轮', 条款状态: '跟踪中', 特殊条款: '临床节点', 提醒日期: '2026-07-12', 责任人: '林蔚' },
    { 基金简称: '成长一期', 项目名称: '澜舟机器人', 轮次: 'A+ 轮', 条款状态: '已关闭', 特殊条款: '信息权', 提醒日期: '2026-06-30', 责任人: '沈思' },
  ]
  const rows = screen.id === 'risk-clauses' ? clauseRows : risks

  return (
    <div className="page-grid">
      <section className="panel full-span motion-item">
        <PanelTitle icon={AlertTriangle} title={screen.title} />
        <div className="risk-summary">
          {['高风险 2', '临期 4', '待补充 5', '已关闭 11'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <DataTable rows={rows} />
        <button
          className="primary-button"
          type="button"
          disabled={!canWrite}
          onClick={async () => {
            try {
              const result = await apiPost('/api/risks/1/updates', {
                update_text: 'Frontend submitted mitigation progress.',
                update_status: 'progress',
              })
              onToast({ title: '风险记录已更新', detail: auditDetail(result) })
            } catch (error) {
              onToast({ title: '风险更新失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        >
          <Plus size={16} />
          {screen.primaryAction}
        </button>
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Shield} title="处置方案与审计" />
        <div className="audit-chain">
          {['登记风险', '责任人确认', '制定处置方案', '上传附件', '关闭并审计'].map((item) => (
            <div key={item}>
              <CheckCircle size={15} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel motion-item">
        <PanelTitle icon={Bell} title="提醒流转" />
        <p className="muted-copy">临期和高风险事项会进入工作台风险热区、消息中心待办、报表驾驶舱风险分析。</p>
      </section>
    </div>
  )
}

function ReportPage({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <div className="page-grid">
      <section className="metrics-row full-span motion-item">
        {[
          ['IRR', '18.6%', '+1.2%'],
          ['DPI', '0.22', '+0.04'],
          ['TVPI', '1.31', '+0.08'],
          ['MOIC', '1.42x', '+0.11x'],
        ].map(([label, value, trend]) => (
          <article className="metric-card tone-blue" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{trend}</small>
          </article>
        ))}
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle
          icon={BarChart}
          title="资金流与组合净值"
          action="导出报表"
          onAction={async () => {
            try {
              const result = await apiPost('/api/import-export/tasks', {
                task_kind: 'export',
                entity_type: 'report_dashboard',
              })
              onToast({ title: '导出任务已创建', detail: auditDetail(result) })
            } catch (error) {
              onToast({ title: '导出失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        />
        <MiniChart values={chartSeries} />
      </section>
      <section className="panel motion-item">
        <PanelTitle icon={Shield} title="风险热区" />
        <RiskHeatmap onToast={onToast} />
      </section>
      <section className="panel full-span motion-item">
        <PanelTitle icon={Database} title="财务指标明细" />
        <DataTable rows={financialRows} />
      </section>
    </div>
  )
}

function AdminPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const fallbackRows = useMemo(
    () => (screen.id === 'system-users' ? users : screen.id === 'roles-permissions' ? permissions : customFields),
    [screen.id],
  )
  const { rows, source } = useBackendRows(screen.id, fallbackRows)
  const orgs = ['总经理室', '投资一部', '医疗组', '基金运营', '风控法务', 'IR', '系统管理']
  const [activeOrg, setActiveOrg] = useState(orgs[0])

  return (
    <div className="page-grid">
      <section className="panel motion-item">
        <PanelTitle icon={Settings} title="组织与策略" />
        <div className="org-tree">
          {orgs.map((item) => (
            <button
              className={classNames(activeOrg === item && 'is-selected')}
              key={item}
              type="button"
              onClick={() => {
                setActiveOrg(item)
                void runBackendAction(onToast, `${item}已选中`, {
                  action: 'admin.org.select',
                  entity_type: 'organization_unit',
                  entity_label: item,
                  after: { screen_id: screen.id, org: item },
                })
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Users} title={screen.title} />
        <DataSourceBadge source={source} />
        <DataTable rows={rows} />
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={async () => {
              try {
                const result = await apiPost('/api/actions', {
                  action: 'permission.preview',
                  entity_type: 'role',
                  entity_label: screen.title,
                  after: { role: 'readonly_auditor' },
                })
                onToast({ title: '权限预览', detail: auditDetail(result) })
              } catch (error) {
                onToast({ title: '权限预览失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
              }
            }}
          >
            <Eye size={16} />
            预览权限
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!canWrite}
            onClick={() =>
              runBackendAction(onToast, screen.primaryAction, {
                action: 'admin.primary_action',
                entity_type: screen.id === 'system-users' ? 'user' : screen.id === 'roles-permissions' ? 'role' : 'custom_field',
                entity_label: screen.title,
                after: { screen_id: screen.id, org: activeOrg, action_label: screen.primaryAction },
              })
            }
          >
            <Plus size={16} />
            {screen.primaryAction}
          </button>
        </div>
      </section>
      <section className="panel full-span motion-item">
        <PanelTitle icon={Clock} title="审计日志" />
        <DataTable
          rows={[
            { 操作人: '系统管理员', 操作: '调整字段权限', 对象: screen.title, 结果: '成功', 时间: '2026-07-02 10:20' },
            { 操作人: '审计访客', 操作: '查看脱敏数据', 对象: '基金列表', 结果: '成功', 时间: '2026-07-02 09:52' },
            { 操作人: '基金运营', 操作: '导出财报', 对象: '成长一期', 结果: '等待审批', 时间: '2026-07-01 18:04' },
          ]}
        />
      </section>
    </div>
  )
}

function SettingsPage({
  canWrite,
  onToast,
}: {
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  return (
    <div className="page-grid">
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={User} title="个人资料" />
        <div className="form-grid">
          {['姓名', '部门', '手机', '邮箱', '默认首页', '常用菜单'].map((field) => (
            <label key={field}>
              <span>{field}</span>
              <input readOnly={!canWrite} defaultValue={field === '默认首页' ? '管理层工作台' : ''} placeholder={`请输入${field}`} />
            </label>
          ))}
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={!canWrite}
          onClick={async () => {
            try {
              const result = await apiPost('/api/settings/preferences', {
                notification_json: { workflow: true, risk: true },
                favorite_nav_json: ['workbench', 'project-list', 'report-dashboard'],
                table_view_json: { density: 'compact' },
              })
              onToast({ title: '偏好已保存', detail: auditDetail(result) })
            } catch (error) {
              onToast({ title: '偏好保存失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        >
          保存偏好
        </button>
      </section>
      <section className="panel motion-item">
        <PanelTitle icon={Lock} title="安全设备" />
        <div className="security-list">
          {['Windows Chrome / 当前设备', 'Mac Safari / 2026-06-28', '移动端扫码登录 / 2026-06-20'].map((item) => (
            <div key={item}>
              <CheckCircle size={15} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function RecyclePage({
  canWrite,
  onToast,
}: {
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const fallbackRows = useMemo(() => recycleRows, [])
  const { rows, source } = useBackendRows('recycle-bin', fallbackRows)

  return (
    <section className="panel motion-item">
      <PanelTitle icon={Trash} title="回收站对象" />
      <DataSourceBadge source={source} />
      <DataTable rows={rows} />
      <div className="button-row">
        <button
          className="primary-button"
          type="button"
          disabled={!canWrite}
          onClick={async () => {
            try {
              const result = await apiPost('/api/recycle/1/restore')
              onToast({ title: '已批量恢复', detail: auditDetail(result) })
            } catch (error) {
              onToast({ title: '恢复失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
            }
          }}
        >
          <CheckCircle size={16} />
          批量恢复
        </button>
        <button
          className="danger-button"
          type="button"
          disabled={!canWrite}
          onClick={() =>
            runBackendAction(onToast, '彻底删除已提交', {
              action: 'recycle.purge.submit',
              entity_type: 'recycle_item',
              entity_id: 1,
              entity_label: '批量回收站对象',
              after: { purge_mode: 'hard_delete', count: rows.length },
            })
          }
        >
          <Trash size={16} />
          彻底删除
        </button>
      </div>
    </section>
  )
}

function ListPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const fallbackRows = useMemo(() => listRows(screen.id), [screen.id])
  const { rows, source } = useBackendRows(screen.id, fallbackRows)

  return (
    <div className="page-grid">
      <section className="panel full-span motion-item">
        <PanelTitle icon={ListIcon(screen.id)} title={`${screen.title}台账`} />
        <DataSourceBadge source={source} />
        <ListControls canWrite={canWrite} onToast={onToast} screen={screen} />
        <DataTable rows={rows} />
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Clock} title="状态与审计" />
        <StateRail />
      </section>
      <section className="panel motion-item">
        <PanelTitle icon={Download} title="异步导入导出" />
        <p className="muted-copy">模板下载、导入校验、错误回写、导出排队、结果下载和操作审计均以任务方式呈现。</p>
        <button
          className="secondary-button full-width"
          type="button"
          disabled={!canWrite}
          onClick={() =>
            auditThenNavigate(onToast, '任务中心已打开', 'import-export', {
              action: 'list.import_export_center.open',
              entity_type: 'screen',
              entity_label: screen.title,
              after: { source_screen: screen.id, target: 'import-export' },
            })
          }
        >
          查看任务中心
        </button>
      </section>
    </div>
  )
}

function ListControls({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  return (
    <div className="list-controls">
      <label className="table-search">
        <Search size={15} />
        <input placeholder={`搜索${screen.title}`} aria-label={`搜索${screen.title}`} />
      </label>
      <button
        className="secondary-button"
        type="button"
        onClick={() =>
          runBackendAction(onToast, '筛选已保存', {
            action: 'list.filter.save',
            entity_type: 'screen',
            entity_label: screen.title,
            after: { screen_id: screen.id, filter: 'advanced' },
          })
        }
      >
        <Filter size={16} />
        高级筛选
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={!canWrite}
        onClick={async () => {
          try {
            const result = await apiPost('/api/import-export/tasks', {
              task_kind: 'import',
              entity_type: screen.id,
              source_file_uri: `mock://uploads/${screen.id}.xlsx`,
            })
            onToast({ title: '导入任务已创建', detail: auditDetail(result) })
          } catch (error) {
            onToast({ title: '导入失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
          }
        }}
      >
        <Upload size={16} />
        导入
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={!canWrite}
        onClick={async () => {
          try {
            const result = await apiPost('/api/import-export/tasks', {
              task_kind: 'export',
              entity_type: screen.id,
            })
            onToast({ title: '导出任务已创建', detail: auditDetail(result) })
          } catch (error) {
            onToast({ title: '导出失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
          }
        }}
      >
        <Download size={16} />
        导出
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={!canWrite}
        onClick={() =>
          runBackendAction(onToast, '批量操作已提交', {
            action: 'list.batch_operation.submit',
            entity_type: screen.id,
            entity_label: screen.title,
            after: { selected_scope: 'current_filter', operation: 'batch_update_status' },
          })
        }
      >
        <MoreHorizontal size={16} />
        批量操作
      </button>
    </div>
  )
}

function DataTable({ rows, compact = false }: { rows: DataRow[]; compact?: boolean }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const columns = Object.keys(rows[0] ?? {})
  const filtered = rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()))
  const allSelected = filtered.length > 0 && filtered.every((_, index) => selected.has(index))

  return (
    <div className={classNames('table-wrap', compact && 'is-compact')} data-testid="records-table">
      {!compact && (
        <div className="table-topline">
          <label className="table-search">
            <Search size={15} />
            <input
              data-testid="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="表内搜索"
              aria-label="表内搜索"
            />
          </label>
          <span>{selected.size} 条已选</span>
        </div>
      )}
      <table>
        <thead>
          <tr>
            {!compact && (
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelected(new Set(filtered.map((_, index) => index)))
                    } else {
                      setSelected(new Set())
                    }
                  }}
                  aria-label="全选"
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, rowIndex) => (
            <tr key={`${Object.values(row)[0]}-${rowIndex}`}>
              {!compact && (
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(rowIndex)}
                    onChange={(event) => {
                      const next = new Set(selected)
                      if (event.target.checked) next.add(rowIndex)
                      else next.delete(rowIndex)
                      setSelected(next)
                    }}
                    aria-label={`选择第 ${rowIndex + 1} 行`}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column}>
                  {column.includes('状态') || column.includes('风险') || column.includes('等级') ? (
                    <StatusBadge value={String(row[column])} />
                  ) : (
                    row[column]
                  )}
                </td>
              ))}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length + (compact ? 0 : 1)}>
                <div className="empty-state">暂无匹配记录，清空筛选后重试。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function PanelTitle({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon: LucideIcon
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="panel-title">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="link-button" type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const tone = value.includes('高') || value.includes('超期') || value.includes('失败')
    ? 'red'
    : value.includes('中') || value.includes('临期') || value.includes('待')
      ? 'amber'
      : value.includes('已') || value.includes('正常') || value.includes('允许')
        ? 'green'
        : 'blue'

  return <span className={classNames('status-badge', `status-${tone}`)}>{value}</span>
}

function DataSourceBadge({ source }: { source: 'loading' | 'mysql' | 'mock' }) {
  return (
    <div className={classNames('data-source-badge', source === 'mysql' && 'is-live', source === 'mock' && 'is-mock')}>
      <Database size={14} />
      <span>{source === 'loading' ? '正在读取 MySQL' : source === 'mysql' ? '数据源：MySQL 后端' : '数据源：Mock 回退'}</span>
    </div>
  )
}

function TaskList({ rows }: { rows: DataRow[] }) {
  return (
    <div className="task-list">
      {rows.slice(0, 5).map((row, index) => (
        <div className="task-row" key={`${row.流程名称}-${index}`}>
          <div>
            <strong>{row.流程名称}</strong>
            <span>{row.关联对象} · {row.当前节点}</span>
          </div>
          <StatusBadge value={String(row.状态)} />
        </div>
      ))}
    </div>
  )
}

function Timeline() {
  return (
    <div className="timeline">
      {[
        ['入库', '2026-05-18'],
        ['完成 TS', '2026-06-10'],
        ['尽调启动', '2026-06-18'],
        ['投决准备', '2026-07-06'],
      ].map(([label, date]) => (
        <div key={label}>
          <i />
          <span>{label}</span>
          <small>{date}</small>
        </div>
      ))}
    </div>
  )
}

function RiskHeatmap({ onToast }: { onToast?: (toast: Toast) => void }) {
  return (
    <div className="risk-heatmap">
      {risks.map((risk, index) => (
        <button
          className={classNames('risk-cell', index < 2 && 'is-hot')}
          key={String(risk.风险事件)}
          type="button"
          onClick={() => {
            if (onToast) {
              void auditThenNavigate(onToast, '风险事项已打开', 'burst-risk', {
                action: 'risk.heatmap.open',
                entity_type: 'risk_incident',
                entity_label: String(risk.风险事件),
                after: { risk_level: risk.等级, target: 'burst-risk' },
              })
              return
            }
            goTo('burst-risk')
          }}
        >
          <strong>{risk.等级}</strong>
          <span>{risk.关联项目}</span>
        </button>
      ))}
    </div>
  )
}

function MiniChart({ values }: { values: number[] }) {
  const max = Math.max(...values)
  return (
    <div className="mini-chart">
      {values.map((value, index) => (
        <div key={`${value}-${index}`}>
          <i style={{ height: `${(value / max) * 100}%` }} />
          <span>{index + 1}月</span>
        </div>
      ))}
    </div>
  )
}

function StateRail() {
  return (
    <div className="state-rail">
      {[
        ['加载态', '骨架屏保持表格列宽稳定'],
        ['空状态', '引导导入、新增或清空筛选'],
        ['错误态', '保留查询条件并支持重试'],
        ['权限态', '按钮与服务端能力一致'],
      ].map(([title, detail]) => (
        <article key={title}>
          <CheckCircle size={16} />
          <div>
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function ListIcon(id: string): LucideIcon {
  if (id.includes('calendar')) return Calendar
  if (id.includes('message')) return Bell
  if (id.includes('investment') || id.includes('fund')) return Database
  if (id.includes('research')) return Bot
  return FileText
}

function listRows(id: string): DataRow[] {
  if (id === 'announcements') return announcements
  if (id === 'calendar') return calendarEvents
  if (id === 'message-center') return messages
  if (id === 'project-list') {
    return projects.map((project) => ({
      项目名称: project.name,
      状态: project.status,
      负责人: project.owner,
      城市: project.city,
      行业方向: project.sector,
      阶段: project.stage,
      拟投金额: `${project.amount.toLocaleString()} 万`,
      风险: project.risk,
    }))
  }
  if (id === 'fund-list') return funds
  if (id === 'investment-info') return investments
  if (id === 'equity-change') return equityChanges
  if (id === 'investor-list') return investors
  if (id === 'manager-orgs') return managementOrgs
  if (id === 'post-data-collection') {
    return postDataRows.map((row) => ({
      项目名称: row.项目,
      收件邮箱: 'finance@example.local',
      期间: row.期间,
      发送时间: '2026-07-01 09:00',
      收集状态: row.状态,
      催收次数: row.状态 === '待确认' ? 2 : 0,
    }))
  }
  if (id === 'research-library' || id === 'internal-research') return researchRows
  if (id === 'import-export') return importJobs
  return announcements
}

function detailRows(id: string): DataRow[] {
  if (id === 'project-detail-investment') return investments
  if (id === 'project-detail-postdata') return postDataRows
  if (id === 'fund-detail-cashflow') return cashflows
  if (id === 'fund-detail-financials') return financialRows
  if (id === 'fund-detail-overview') return funds
  if (id === 'investor-detail') return investors
  return projects.slice(0, 5).map((project) => ({
    阶段: project.stage,
    项目名称: project.name,
    负责人: project.owner,
    关联基金: project.fund,
    当前动作: project.nextStep,
    风险: project.risk,
  }))
}

export default App
