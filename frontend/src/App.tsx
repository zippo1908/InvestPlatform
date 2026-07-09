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
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns,
  Database,
  Download,
  Eye,
  FileText,
  Folder,
  GitBranch,
  Home,
  LineChart,
  Crosshair,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Paperclip,
  Palette,
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
  equityChanges,
  financialRows,
  funds,
  importJobs,
  investments,
  investors,
  managementOrgs,
  messages,
  permissions,
  pipelineDistribution,
  postDataRows,
  projects,
  researchRows,
  risks,
  roles,
  screens,
  stageNames,
  users,
} from './data'
import type { DataRow, Project, Screen } from './data'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import html2canvas from 'html2canvas'
import { API_BASE, apiDelete, apiDownload, apiGet, apiPatch, apiPost, apiPut, auditDetail, getPerms, getRoles, getToken, getUserName, setPerms, setRoles, setUserName, streamPost, setToken } from './api'

marked.setOptions({ breaks: true, gfm: true })

// 有些模型会把整段输出用 ```markdown ... ``` 包裹,去掉外层围栏再解析,避免整体被当代码块。
function stripCodeFence(text: string): string {
  const t = text.trim()
  if (t.startsWith('```')) {
    return t.replace(/^```[a-zA-Z]*\r?\n?/, '').replace(/```\s*$/, '')
  }
  return text
}

// 安全的 Markdown 渲染:marked 解析 + DOMPurify 消毒(防 LLM 输出里的注入)。
function Markdown({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(stripCodeFence(text), { async: false }) as string), [text])
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
}

// 处理中动效:GSAP 无限旋转 spinner + 轮播状态文字(交叉淡入),让观众感知"正在处理"。
function AiProcessing({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0)
  const spinRef = useRef<SVGSVGElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setIdx((v) => (v + 1) % messages.length), 1500)
    return () => window.clearInterval(timer)
  }, [messages.length])

  useEffect(() => {
    if (!spinRef.current) return
    const tween = gsap.to(spinRef.current, { rotation: 360, transformOrigin: '50% 50%', repeat: -1, duration: 0.9, ease: 'none' })
    return () => { tween.kill() }
  }, [])

  useEffect(() => {
    if (textRef.current) gsap.fromTo(textRef.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' })
  }, [idx])

  return (
    <div className="ai-processing" data-testid="ai-processing">
      <Bot ref={spinRef} size={30} className="ai-processing-spin" />
      <span className="ai-processing-text" ref={textRef}>{messages[idx]}</span>
      <div className="ai-processing-dots"><i /><i /><i /></div>
    </div>
  )
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 数字滚动:把 "92.1 亿" / "128" / "+7.8%" 里的数值从 0 缓动到目标,保留前后缀。
function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const m = value.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/)
    if (!m || prefersReducedMotion()) { el.textContent = value; return }
    const prefix = m[1]; const numStr = m[2]; const suffix = m[3]
    const target = parseFloat(numStr.replace(/,/g, ''))
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0
    const useGroup = numStr.includes(',')
    const obj = { v: 0 }
    const tw = gsap.to(obj, {
      v: target, duration: 1.1, ease: 'power2.out',
      onUpdate: () => {
        const shown = obj.v.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: useGroup })
        el.textContent = `${prefix}${shown}${suffix}`
      },
    })
    return () => { tw.kill() }
  }, [value])
  return <strong ref={ref} className={className}>{value}</strong>
}

const MEETING_MSGS = ['正在通读会议纪要…', '提取关键决策与结论…', '识别待办与负责人…', '整理风险提示…', '生成结构化摘要…']
const WORKSPACE_MSGS = ['正在通读材料…', '套用投资分析框架…', '提炼要点与风险…', '组织结论与建议…']
const BP_MSGS = ['正在读取 BP…', '识别企业与行业…', '提取融资与亮点…', '评估核心风险…', '生成回填建议…']
const MEETING_INSTRUCTION =
  '请把以下会议纪要整理为 Markdown,包含三个小标题:## 核心摘要(一段话)、## 关键要点(无序列表)、## 待办事项(无序列表,每条注明负责人与时限)。直接输出 Markdown 正文,不要用代码块或 ``` 包裹。'

// 屏 → 该屏写操作所需权限(与后端 require_permission/require_roles 口径一致)。
// 命中任一权限即可写;返回空数组表示"任意编辑类权限"皆可。
const EDITOR_PERMS = ['project.edit', 'risk.manage', 'fund.export', 'document.download', 'report.export', 'system.manage']
function requiredPermsForScreen(screenId: string): string[] {
  if (screenId.startsWith('project')) return ['project.edit']
  if (screenId.startsWith('fund') || screenId === 'investment-info' || screenId === 'equity-change') return ['fund.export']
  if (screenId === 'burst-risk' || screenId === 'risk-clauses') return ['risk.manage']
  if (screenId === 'document-center' || screenId === 'process-files') return ['document.download']
  if (screenId === 'import-export') return ['report.export', 'fund.export']
  if (['system-users', 'roles-permissions', 'field-config'].includes(screenId)) return ['system.manage']
  // 回收站恢复:后端限 system_admin/managing_partner;前端用编辑类权限放行(后端最终裁决)。
  return EDITOR_PERMS
}
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

// 二级导航:顶层「域」聚合原有分组,把 14 个扁平分组收敛为 6 个业务域,层次分明。
const navDomains: { domain: string; groups: string[] }[] = [
  { domain: '工作台', groups: ['工作台'] },
  { domain: '投资业务', groups: ['项目管理', '基金管理', '投资人', '投后管理'] },
  { domain: '风控与文档', groups: ['风险管理', '文档管理'] },
  { domain: '协作与流程', groups: ['协同工具', '流程中心'] },
  { domain: '智能与报表', groups: ['AI 数据库', '报表驾驶舱'] },
  { domain: '系统与账户', groups: ['通用能力', '系统管理', '账户'] },
]
const domainIcons: Record<string, LucideIcon> = {
  工作台: Home,
  投资业务: Briefcase,
  风控与文档: Shield,
  协作与流程: GitBranch,
  智能与报表: Bot,
  系统与账户: Settings,
}


function readRoute() {
  const clean = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return clean || 'login'
}

function goTo(id: string) {
  window.location.hash = `/${id}`
}

// 带实体 id 的导航(如从列表行打开某条记录的详情):#/screen?id=5
function goToEntity(screenId: string, entityId: number) {
  window.location.hash = `/${screenId}?id=${entityId}`
}

// 从当前 hash 读 ?id=(detail 屏用它预选实体)
function readRouteId(): number | null {
  const q = window.location.hash.split('?')[1]
  if (!q) return null
  const m = new URLSearchParams(q).get('id')
  return m ? Number(m) : null
}

// 列表屏 → 对应详情屏(用于行点击打开)
const LIST_DETAIL_TARGET: Record<string, string> = {
  'project-list': 'project-detail-overview',
  'fund-list': 'fund-detail-overview',
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

const PAGE_SIZE = 20

function useBackendRows(screenId: string, fallbackRows: DataRow[], page = 1, reloadKey = 0, q = '') {
  const [rows, setRows] = useState<DataRow[]>(fallbackRows)
  const [source, setSource] = useState<'loading' | 'mysql' | 'mock'>('loading')
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setRows(fallbackRows)
    setSource('loading')

    apiGet<LedgerResponse & { total?: number }>(`/api/ledger/${screenId}?page=${page}&page_size=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      .then((result) => {
        if (!active) return
        setRows(normalizeRows(result.items))
        setSource(result.source === 'mysql' ? 'mysql' : 'mock')
        setTotal(typeof result.total === 'number' ? result.total : null)
      })
      .catch(() => {
        if (!active) return
        setRows(fallbackRows)
        setSource('mock')
        setTotal(null)
      })

    return () => {
      active = false
    }
  }, [screenId, fallbackRows, page, reloadKey, q])

  return { rows, source, total, pageSize: PAGE_SIZE }
}

// 页面标注/反馈工具:浮层按钮 → 面板(自动带当前页 + 组件拾取器 + 分类 + 意见)→ 入库;
// 管理员可在「汇总」页一键把某条反馈推成 GitHub Issue。
const FEEDBACK_CATS: Array<{ key: string; label: string }> = [
  { key: 'ui', label: '界面/视觉' }, { key: 'interaction', label: '交互' }, { key: 'data', label: '数据/字段' },
  { key: 'copy', label: '文案' }, { key: 'flow', label: '流程' }, { key: 'perf', label: '性能' }, { key: 'other', label: '其他' },
]
const FB_STATUS_CN: Record<string, string> = { new: '待处理', pushed: '已推 GitHub', resolved: '已解决', dismissed: '已忽略' }

function describeElement(el: Element): string {
  const holder = el.closest('[data-testid]') as HTMLElement | null
  const testid = holder?.dataset?.testid
  const aria = el.getAttribute('aria-label')
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36)
  const tag = el.tagName.toLowerCase()
  if (testid) return `${text ? `「${text}」` : ''}[${testid}]`
  if (aria) return `${aria} <${tag}>`
  return `${text ? `「${text}」` : ''}<${tag}>`
}

function FeedbackWidget({ onToast }: { onToast: (t: Toast) => void }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'submit' | 'review'>('submit')
  const isAdmin = getRoles().some((r) => r === 'system_admin' || r === 'managing_partner')
  const [component, setComponent] = useState('')
  const [category, setCategory] = useState('ui')
  const [message, setMessage] = useState('')
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [withShot, setWithShot] = useState(true) // 一键截图(默认开)
  const [attachments, setAttachments] = useState<Array<{ name: string; data_url: string }>>([]) // 手动上传附件(反馈 #8)
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [shotView, setShotView] = useState<Record<number, string>>({}) // 已加载的截图 objectURL
  const [attList, setAttList] = useState<Record<number, Array<{ id: number; file_name: string; mime_type: string }>>>({}) // 汇总页展开的附件列表

  // 组件拾取:进入后 hover 高亮、点击捕获描述并退出;排除工具自身。
  useEffect(() => {
    if (!picking) return
    let hovered: HTMLElement | null = null
    const clear = () => { if (hovered) { hovered.style.outline = ''; hovered.style.outlineOffset = ''; hovered = null } }
    const onMove = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t || t.closest('.fb-widget')) return
      if (hovered !== t) { clear(); hovered = t; t.style.outline = '2px solid var(--accent)'; t.style.outlineOffset = '1px' }
    }
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('.fb-widget')) return
      e.preventDefault(); e.stopPropagation()
      setComponent(describeElement(t)); clear(); setPicking(false)
    }
    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)
    document.body.style.cursor = 'crosshair'
    return () => { clear(); document.removeEventListener('mousemove', onMove, true); document.removeEventListener('click', onClick, true); document.body.style.cursor = '' }
  }, [picking])

  useEffect(() => {
    if (!open || tab !== 'review' || !isAdmin) return
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/feedback').then((r) => setItems(r.items ?? [])).catch(() => setItems([]))
  }, [open, tab, isAdmin, reloadKey])

  // 一键截图:抓当前视口(忽略反馈工具自身),压到 jpeg。失败不阻断提交。
  const captureShot = async (): Promise<string | undefined> => {
    try {
      const canvas = await html2canvas(document.body, {
        ignoreElements: (el) => (el as HTMLElement).classList?.contains('fb-widget'),
        x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight,
        scale: 0.7, backgroundColor: '#f8fafc', logging: false, useCORS: true,
      })
      return canvas.toDataURL('image/jpeg', 0.7)
    } catch (e) { console.warn('[feedback] 截图失败:', e); return undefined }
  }

  // 读取手动上传附件为 data URL(限图片/PDF,单个 ≤12MB,最多 6 个)。
  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const picked: Array<{ name: string; data_url: string }> = []
    for (const file of Array.from(files)) {
      if (file.size > 12 * 1024 * 1024) { onToast({ title: '附件过大', detail: `${file.name} 超过 12MB,已跳过` }); continue }
      const data_url = await new Promise<string>((res) => {
        const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => res(''); fr.readAsDataURL(file)
      })
      if (data_url) picked.push({ name: file.name, data_url })
    }
    setAttachments((prev) => [...prev, ...picked].slice(0, 6))
  }

  const submit = async () => {
    if (!message.trim()) return
    setBusy(true)
    try {
      const screen_id = location.hash.replace(/^#\//, '').split('?')[0] || 'unknown'
      const screen_title = document.querySelector('[data-testid="screen-title"]')?.textContent?.trim() || screen_id
      const screenshot = withShot ? await captureShot() : undefined
      await apiPost('/api/feedback', { message: message.trim(), component_label: component || undefined, category, screen_id, screen_title, page_url: location.href.slice(0, 300), screenshot, attachments: attachments.length ? attachments : undefined })
      const extras = [screenshot ? '含截图' : '', attachments.length ? `含 ${attachments.length} 个附件` : ''].filter(Boolean).join('、')
      onToast({ title: '反馈已提交', detail: `已收集${extras ? `(${extras})` : ''},开发会从「汇总」整理并同步 GitHub` })
      setMessage(''); setComponent(''); setAttachments([])
    } catch (error) {
      onToast({ title: '提交失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally { setBusy(false) }
  }

  // 汇总页:展开某条反馈的手动附件列表(再点收起)。
  const loadAttachments = async (id: number) => {
    if (attList[id]) { setAttList((m) => { const n = { ...m }; delete n[id]; return n }); return }
    try {
      const r = await apiGet<{ items: Array<{ id: number; file_name: string; mime_type: string }> }>(`/api/feedback/${id}/attachments`)
      setAttList((m) => ({ ...m, [id]: r.items ?? [] }))
    } catch { onToast({ title: '附件加载失败', detail: '' }) }
  }
  const downloadAttachment = async (fid: number, att: { id: number; file_name: string }) => {
    try { await apiDownload(`/api/feedback/${fid}/attachments/${att.id}`, att.file_name || `attachment-${att.id}`) }
    catch (e) { onToast({ title: '下载失败', detail: e instanceof Error ? e.message : '' }) }
  }

  const pushAll = async () => {
    try {
      const r = await apiPost<{ pushed: number; failed: number }>('/api/feedback/push-github-batch', {})
      onToast({ title: `已批量推送 ${r.pushed} 条`, detail: r.failed ? `${r.failed} 条失败` : '全部已建 GitHub Issue' })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '批量推送失败', detail: error instanceof Error ? error.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'API 调用失败' })
    }
  }
  const loadShot = async (id: number) => {
    if (shotView[id]) { setShotView((m) => { const n = { ...m }; delete n[id]; return n }); return } // 再点收起
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/feedback/${id}/screenshot`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      setShotView((m) => ({ ...m, [id]: url }))
    } catch { onToast({ title: '截图加载失败', detail: '可能未附带截图' }) }
  }

  const pushGithub = async (id: number) => {
    try {
      const r = await apiPost<{ github_issue_url?: string }>(`/api/feedback/${id}/push-github`, {})
      onToast({ title: '已推送到 GitHub', detail: r.github_issue_url || '已创建 Issue' })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '推送失败', detail: error instanceof Error ? error.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'API 调用失败' })
    }
  }
  const setStatus = async (id: number, status: string) => {
    try { await apiPatch(`/api/feedback/${id}`, { status }); setReloadKey((k) => k + 1) } catch { /* ignore */ }
  }

  return (
    <div className="fb-widget">
      {!open && (
        <button type="button" className="fb-fab" data-testid="feedback-fab" onClick={() => setOpen(true)} title="反馈 / 标注此页面">
          <MessageSquare size={18} /> 反馈
        </button>
      )}
      {open && (
        <div className="fb-panel" data-testid="feedback-panel">
          <div className="fb-head">
            <strong>页面反馈 / 标注</strong>
            <button type="button" className="icon-button" onClick={() => { setOpen(false); setPicking(false) }} aria-label="关闭"><X size={16} /></button>
          </div>
          {isAdmin && (
            <div className="subtab-bar">
              <button type="button" className={classNames('subtab', tab === 'submit' && 'is-active')} onClick={() => setTab('submit')}>提交反馈</button>
              <button type="button" className={classNames('subtab', tab === 'review' && 'is-active')} onClick={() => setTab('review')}>汇总 / 推 GitHub</button>
            </div>
          )}
          {tab === 'submit' ? (
            <div className="fb-form">
              <p className="muted-note">当前页:{document.querySelector('[data-testid="screen-title"]')?.textContent?.trim() || location.hash}</p>
              <label className="fb-field">
                <span>组件(可选,点「选择」在页面上直接圈)</span>
                <div className="fb-pick-row">
                  <input value={component} onChange={(e) => setComponent(e.target.value)} placeholder="如:估值表 / 保存按钮" data-testid="feedback-component" />
                  <button type="button" className={classNames('secondary-button', picking && 'is-picking')} onClick={() => setPicking((v) => !v)} data-testid="feedback-pick">
                    <Crosshair size={14} /> {picking ? '点击页面元素…' : '选择'}
                  </button>
                </div>
              </label>
              <label className="fb-field">
                <span>类别</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="feedback-category">
                  {FEEDBACK_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </label>
              <label className="fb-field">
                <span>修改意见</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="描述这个页面/组件哪里需要调整…" data-testid="feedback-message" />
              </label>
              <label className="fb-check">
                <input type="checkbox" checked={withShot} onChange={(e) => setWithShot(e.target.checked)} data-testid="feedback-withshot" />
                <span>附带当前页面截图</span>
              </label>
              <label className="fb-field">
                <span>附件(可选,图片/PDF,最多 6 个)</span>
                <input type="file" multiple accept="image/*,application/pdf" data-testid="feedback-files"
                  onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = '' }} />
              </label>
              {attachments.length > 0 && (
                <div className="fb-attachments" data-testid="feedback-attachments">
                  {attachments.map((a, i) => (
                    <span key={i} className="fb-att-chip">
                      {a.name}
                      <button type="button" className="fb-att-remove" aria-label="移除附件" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <button type="button" className="primary-button full-width" disabled={busy || !message.trim()} onClick={submit} data-testid="feedback-submit">
                <Send size={15} /> {busy ? (withShot ? '截图并提交…' : '提交中…') : '提交反馈'}
              </button>
            </div>
          ) : (
            <div className="fb-review" data-testid="feedback-review">
              {items.some((f) => f.status === 'new') && (
                <button type="button" className="secondary-button full-width" onClick={pushAll} data-testid="feedback-pushall">
                  <Send size={14} /> 批量推送待处理({items.filter((f) => f.status === 'new').length})
                </button>
              )}
              {items.length === 0 ? <p className="muted-note">暂无反馈</p> : items.map((f) => (
                <div className="fb-item" key={String(f.id)}>
                  <div className="fb-item-head">
                    <span className="fb-cat">{FEEDBACK_CATS.find((c) => c.key === f.category)?.label ?? String(f.category)}</span>
                    <span className={classNames('fb-status', `is-${f.status}`)}>{FB_STATUS_CN[String(f.status)] ?? String(f.status)}</span>
                  </div>
                  <p className="fb-msg">{String(f.message)}</p>
                  <div className="fb-meta">{String(f.screen_title ?? '')} · {f.component_label ? String(f.component_label) : '未指定组件'} · {String(f.author ?? '')}</div>
                  {shotView[Number(f.id)] && <img className="fb-shot" src={shotView[Number(f.id)]} alt="反馈截图" />}
                  {attList[Number(f.id)] && (
                    <div className="fb-att-list" data-testid={`fb-att-list-${f.id}`}>
                      {attList[Number(f.id)].length === 0 ? <span className="muted-note">无附件</span> : attList[Number(f.id)].map((a) => (
                        <button key={a.id} type="button" className="fb-att-chip" onClick={() => downloadAttachment(Number(f.id), a)} title="下载/预览">
                          <Paperclip size={12} /> {a.file_name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="fb-actions">
                    {f.screenshot_path ? (
                      <button type="button" className="link-button" onClick={() => loadShot(Number(f.id))} data-testid={`fb-shot-${f.id}`}>
                        {shotView[Number(f.id)] ? '收起截图' : '看截图'}
                      </button>
                    ) : null}
                    {Number(f.attachment_count) > 0 && (
                      <button type="button" className="link-button" onClick={() => loadAttachments(Number(f.id))} data-testid={`fb-att-${f.id}`}>
                        {attList[Number(f.id)] ? '收起附件' : `附件 ${Number(f.attachment_count)}`}
                      </button>
                    )}
                    {f.github_issue_url ? (
                      <a className="link-button" href={String(f.github_issue_url)} target="_blank" rel="noreferrer">查看 Issue #{String(f.github_issue_number)}</a>
                    ) : (
                      <button type="button" className="link-button" onClick={() => pushGithub(Number(f.id))} data-testid={`fb-push-${f.id}`}>推到 GitHub</button>
                    )}
                    {f.status !== 'resolved' && <button type="button" className="link-button" onClick={() => setStatus(Number(f.id), 'resolved')}>标记已解决</button>}
                    {f.status !== 'dismissed' && <button type="button" className="link-button danger" onClick={() => setStatus(Number(f.id), 'dismissed')}>忽略</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 主题:模块加载时同步套用已存主题,避免首屏闪一下默认色。
if (typeof document !== 'undefined') {
  const saved = localStorage.getItem('capitalos-theme')
  if (saved) document.documentElement.setAttribute('data-theme', saved)
}

// 品牌标识:图形符号(六边形=材料/化学质感)+ 向上光芒,主色走 --brand(默认=主题色)。
function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="32" height="32">
        <defs>
          <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--brand, var(--accent))" />
            <stop offset="1" stopColor="var(--brand-2, var(--accent-2))" />
          </linearGradient>
        </defs>
        <polygon points="16,2.4 27.4,9 27.4,23 16,29.6 4.6,23 4.6,9" fill="url(#bm-g)" />
        <path d="M16 9.5 L21.2 22 L16 19.2 L10.8 22 Z" fill="#fff" opacity="0.96" />
      </svg>
    </span>
  )
}

// 全局命令面板(Cmd/Ctrl+K):搜页面 + 项目/基金/投资人,键盘上下选择、回车跳转。
type CmdItem = { type: string; label: string; sub: string; run: () => void }
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [ents, setEnts] = useState<{ projects: Array<Record<string, unknown>>; funds: Array<Record<string, unknown>>; investors: Array<Record<string, unknown>> }>({ projects: [], funds: [], investors: [] })
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQ(''); setSel(0)
    Promise.all([
      apiGet<{ items: Array<Record<string, unknown>> }>('/api/projects').catch(() => ({ items: [] })),
      apiGet<{ items: Array<Record<string, unknown>> }>('/api/funds').catch(() => ({ items: [] })),
      apiGet<{ items: Array<Record<string, unknown>> }>('/api/investors').catch(() => ({ items: [] })),
    ]).then(([p, f, i]) => setEnts({ projects: p.items ?? [], funds: f.items ?? [], investors: i.items ?? [] }))
    const t = window.setTimeout(() => inputRef.current?.focus(), 30)
    if (panelRef.current && !prefersReducedMotion()) {
      gsap.fromTo(panelRef.current, { autoAlpha: 0, y: -16, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out' })
    }
    return () => window.clearTimeout(t)
  }, [open])

  const items: CmdItem[] = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const hit = (s: string) => !kw || s.toLowerCase().includes(kw)
    const list: CmdItem[] = []
    appScreens.filter((s) => hit(s.title) || hit(s.group)).slice(0, kw ? 8 : 6).forEach((s) =>
      list.push({ type: '页面', label: s.title, sub: s.group, run: () => { goTo(s.id); onClose() } }))
    ents.projects.filter((p) => hit(String(p.name))).slice(0, 6).forEach((p) =>
      list.push({ type: '项目', label: String(p.name), sub: String(p.sector ?? p.stage ?? ''), run: () => { goToEntity('project-detail-overview', Number(p.id)); onClose() } }))
    ents.funds.filter((f) => hit(String(f.name))).slice(0, 6).forEach((f) =>
      list.push({ type: '基金', label: String(f.name), sub: String(f.status ?? ''), run: () => { goToEntity('fund-detail-overview', Number(f.id)); onClose() } }))
    ents.investors.filter((i) => hit(String(i.name))).slice(0, 6).forEach((i) =>
      list.push({ type: '投资人', label: String(i.name), sub: String(i.investor_kind ?? ''), run: () => { goToEntity('investor-detail', Number(i.id)); onClose() } }))
    return list
  }, [q, ents, onClose])

  useEffect(() => { if (sel >= items.length) setSel(0) }, [items.length, sel])

  const onKey = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); items[sel]?.run() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  if (!open) return null
  return (
    <div className="cmdk-overlay" onClick={onClose} data-testid="cmdk">
      <div className="cmdk-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <Search size={17} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="搜索页面、项目、基金、投资人…" data-testid="cmdk-input" />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-results" data-testid="cmdk-results">
          {items.length === 0 ? (
            <p className="muted-note" style={{ padding: '14px' }}>无匹配结果</p>
          ) : items.map((it, i) => (
            <button key={`${it.type}-${it.label}-${i}`} type="button"
              className={classNames('cmdk-item', i === sel && 'is-active')}
              onMouseEnter={() => setSel(i)} onClick={() => it.run()}>
              <span className="cmdk-type">{it.type}</span>
              <span className="cmdk-label">{it.label}</span>
              {it.sub && <span className="cmdk-sub">{it.sub}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState(readRoute)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('capitalos-session') === 'active')
  const [perms, setPermsState] = useState<string[]>(() => getPerms())
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('capitalos-theme') || 'teal')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('capitalos-theme', theme)
  }, [theme])
  // 品牌:clean=纯净版(仅 CapitalOS 文字,无图形标) / tinci=TINCI 版(六边形符号 + TINCI 字标)
  const [brand, setBrand] = useState<string>(() => localStorage.getItem('capitalos-brand') || 'clean')
  useEffect(() => { localStorage.setItem('capitalos-brand', brand) }, [brand])
  // 全局命令面板快捷键:Cmd/Ctrl+K 开关。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setCmdkOpen((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [role, setRole] = useState(roles[0])
  const [navSearch] = useState('') // 侧栏 nav 内联过滤已由命令面板取代;保留空串走默认展开逻辑
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
  // 真实 RBAC:当前屏的写权限由登录用户的实际权限码决定(与后端一致),
  // 而非客户端角色下拉。无权 → 隐藏/禁用写操作并提示只读。
  const canWrite = requiredPermsForScreen(current.id).some((p) => perms.includes(p))
  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    const receipt = receiptFromToast(nextToast)
    if (receipt) {
      setBackendReceipt(receipt)
    }
  }

  // 二级导航:域 → 分组 → 屏。搜索时只保留命中项,并自动展开命中的域。
  const navTree = useMemo(() => {
    const query = navSearch.trim().toLowerCase()
    return navDomains
      .map((d) => ({
        domain: d.domain,
        groups: d.groups
          .map((group) => ({
            group,
            items: appScreens.filter((screen) => {
              const haystack = `${screen.title} ${screen.description} ${screen.group}`.toLowerCase()
              return screen.group === group && (!query || haystack.includes(query))
            }),
          }))
          .filter((g) => g.items.length > 0),
      }))
      .filter((d) => d.groups.length > 0)
  }, [navSearch])

  // 折叠状态:默认只展开当前屏所在的域,其余收起,保持侧栏干净。
  // collapsedDomains[domain]: true=收起 / false=展开 / 缺省=按是否活跃域。搜索时强制全展开。
  const activeDomain = navDomains.find((d) => d.groups.includes(current.group))?.domain
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({})
  const openIgnoringSearch = (domain: string) =>
    collapsedDomains[domain] === false || (collapsedDomains[domain] === undefined && domain === activeDomain)
  const isDomainOpen = (domain: string) => navSearch.trim() !== '' || openIgnoringSearch(domain)
  const toggleDomain = (domain: string) =>
    setCollapsedDomains((prev) => {
      const openNow = prev[domain] === false || (prev[domain] === undefined && domain === activeDomain)
      return { ...prev, [domain]: openNow } // openNow→收起(true);否则展开(false)
    })

  const showLogin = !authed || route === 'login'

  if (showLogin) {
    return (
      <LoginScreen
        onLogin={async (account, password) => {
          const result = await apiPost('/api/auth/login', { account, password })
          setToken(String((result as { token?: string }).token ?? ''))
          const loginPerms = ((result.user as { perms?: string[] } | undefined)?.perms) ?? []
          setPerms(loginPerms)
          setPermsState(loginPerms)
          const loginRoles = ((result.user as { roles?: string[] } | undefined)?.roles) ?? []
          setRoles(loginRoles)
          sessionStorage.setItem('capitalos-session', 'active')
          sessionStorage.setItem('capitalos-user-id', String((result.user as { id?: number } | undefined)?.id ?? 1))
          setUserName(((result.user as { display_name?: string } | undefined)?.display_name) ?? null)
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
            {brand === 'tinci' && <BrandMark />}
            <div>
              <strong className={brand === 'tinci' ? 'brand-wordmark' : undefined}>{brand === 'tinci' ? 'TINCI' : 'CapitalOS'}</strong>
              <small>{brand === 'tinci' ? '投资运营中台 · CapitalOS' : '投资运营中台'}</small>
            </div>
          </div>
        </div>

        {/* 命令面板入口:点开或按 ⌘K / Ctrl+K,搜页面 + 项目/基金/投资人 */}
        <button type="button" className="nav-search nav-search-btn" onClick={() => setCmdkOpen(true)} data-testid="cmdk-trigger" aria-label="打开命令面板">
          <Search size={15} />
          <span className="nav-search-ph">搜索页面 / 项目 / 基金…</span>
          <kbd>{navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        <nav className="nav-groups">
          {navTree.map(({ domain, groups }) => {
            const DomainIcon = domainIcons[domain] ?? Folder
            const open = isDomainOpen(domain)
            const domainActive = domain === activeDomain
            return (
              <div className={classNames('nav-domain', open && 'is-open')} key={domain}>
                <button
                  type="button"
                  className={classNames('nav-domain-title', domainActive && 'is-active')}
                  onClick={() => toggleDomain(domain)}
                  aria-expanded={open}
                >
                  <DomainIcon size={16} />
                  <span className="nav-domain-name">{domain}</span>
                  <ChevronRight size={14} className={classNames('nav-domain-caret', open && 'is-open')} />
                </button>
                {open && (
                  <div className="nav-domain-body">
                    {groups.map(({ group, items }) => {
                      const showGroupLabel = domain !== group // 单分组域(如「工作台」)不重复标题
                      return (
                        <section className="nav-group" key={group}>
                          {showGroupLabel && <div className="nav-group-title"><span>{group}</span></div>}
                          {items.map((screen) => (
                            <button
                              key={screen.id}
                              type="button"
                              data-testid={`nav-link-${screen.id}`}
                              className={classNames('nav-link', screen.id === current.id && 'is-active')}
                              title={screen.title}
                              aria-label={screen.title}
                              onClick={() => { goTo(screen.id); if (window.innerWidth <= 860) setSidebarOpen(false) }}
                            >
                              <span className="nav-label">{screen.title}</span>
                              <span className="nav-short" aria-hidden="true">{navShortLabel(screen.title)}</span>
                              {screen.id === current.id && <ChevronRight size={15} />}
                            </button>
                          ))}
                        </section>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className={classNames('icon-button', 'nav-reopen', !sidebarOpen && 'is-shown')}
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label="展开导航"
              title="展开导航"
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
            <button
              className="icon-button theme-toggle"
              type="button"
              data-testid="theme-toggle"
              title={theme === 'blue' ? '主题:蓝橙(点切换青绿)' : '主题:青绿(点切换蓝橙)'}
              aria-label="切换主题"
              onClick={() => setTheme((t) => (t === 'blue' ? 'teal' : 'blue'))}
            >
              <Palette size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              data-testid="brand-toggle"
              title={brand === 'tinci' ? '品牌:TINCI(点切纯净版 CapitalOS)' : '品牌:纯净版(点切 TINCI)'}
              aria-label="切换品牌标识"
              onClick={() => setBrand((b) => (b === 'tinci' ? 'clean' : 'tinci'))}
            >
              <Briefcase size={17} />
            </button>
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
                setToken(null)
                setPerms(null)
                setPermsState([])
                setRoles(null)
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

      {/* 门槛:仅持 feedback.annotate 能力位的「开发者账号」可见反馈工具 */}
      {getPerms().includes('feedback.annotate') && <FeedbackWidget onToast={showToast} />}
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />

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
        {/* 「高级筛选」原为只发审计不过滤的占位钮 → 移除(台账已有服务端搜索 q + 表内搜索)。 */}
        {/* 「显示列」已下沉到台账表格工具条(可勾选列 + localStorage 持久化),此处不再放解耦占位钮。 */}
        {/* 文档/AI 屏的顶部通用主操作只会建占位记录,易与面板里真实入口混淆 → 隐藏。 */}
        {current.kind !== 'documents' && current.kind !== 'ai' && (
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
        )}
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
  // 反馈 #12:投资关系入口与「权益变动」台账屏都渲染记录台账。
  if (screen.id === 'project-detail-investment' || screen.id === 'equity-change') return <EquityLedgerPage screen={screen} canWrite={canWrite} onToast={onToast} />
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
  const stageCounts = pipelineDistribution
  const maxCount = Math.max(1, ...stageCounts.map((s) => s.count))
  // 今日待办 + AI 解析队列:接真数据(cap_workflow_tasks / cap_ai_jobs)。
  const [todo, setTodo] = useState<Array<Record<string, unknown>>>([])
  const [aiQueue, setAiQueue] = useState<Array<Record<string, unknown>>>([])
  useEffect(() => { apiGet<{ items: Array<Record<string, unknown>> }>('/api/workflow/tasks').then((r) => setTodo(r.items ?? [])).catch(() => setTodo([])) }, [])
  useEffect(() => { apiGet<{ items: Array<Record<string, unknown>> }>('/api/ai/jobs').then((r) => setAiQueue(r.items ?? [])).catch(() => setAiQueue([])) }, [])
  // 柱状图入场:柱子从底部 scaleY 0→1 依次长出(GSAP)。
  const chartRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!chartRef.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('.pipeline-bar i', { scaleY: 0, transformOrigin: 'bottom', duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.15 })
    }, chartRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="page-grid">
      <section className="metrics-row motion-item">
        {dashboardMetrics.map((metric) => (
          <article className={classNames('metric-card', `tone-${metric.tone}`)} key={metric.label}>
            <span>{metric.label}</span>
            <CountUp value={metric.value} />
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
        <div className="pipeline-chart" ref={chartRef}>
          {stageCounts.map((item) => (
            <div className="pipeline-bar" key={item.stage}>
              <span>{item.stage}</span>
              <div>
                <i style={{ height: `${Math.round(20 + (item.count / maxCount) * 130)}px` }} />
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
        {todo.length === 0 ? (
          <p className="muted-note">暂无待办审批</p>
        ) : (
          <TaskList rows={todo.slice(0, 6).map((t) => ({
            流程名称: String(t.task_name ?? ''),
            关联对象: String(t.instance_title ?? ''),
            当前节点: WF_STATUS_CN[String(t.instance_status)] ?? String(t.instance_status ?? ''),
            状态: WF_STATUS_CN[String(t.task_status)] ?? String(t.task_status ?? ''),
          }))} />
        )}
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
          {aiQueue.length === 0 ? (
            <p className="muted-note">暂无解析任务</p>
          ) : aiQueue.slice(0, 6).map((j) => (
            <div className="queue-item" key={String(j.id)}>
              <span>{(j.job_kind === 'meeting' ? '纪要 · ' : '材料 · ') + (String(j.input_preview ?? '').slice(0, 18) || '解析任务')}</span>
              <StatusBadge value={j.status === 'done' ? '已完成' : j.status === 'error' ? '失败' : '解析中'} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// AI 接入配置面板(管理员):DB 覆盖 .env,保存即生效,密钥不回显。
function AiConfigPanel({ onToast }: { onToast: (toast: Toast) => void }) {
  type Cfg = { enabled?: boolean; base_url?: string; model?: string; has_api_key?: boolean; timeout?: number }
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [form, setForm] = useState({ enabled: false, base_url: '', model: '', api_key: '', timeout: 30 })
  const [busy, setBusy] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const load = () =>
    apiGet<Cfg>('/api/ai/config')
      .then((c) => {
        setCfg(c)
        setForm((f) => ({ ...f, enabled: !!c.enabled, base_url: c.base_url || '', model: c.model || '', timeout: c.timeout || 30 }))
      })
      .catch(() => undefined)
  useEffect(() => { void load() }, [])

  const save = async () => {
    setBusy(true)
    try {
      const body: Record<string, unknown> = { enabled: form.enabled, base_url: form.base_url, model: form.model, timeout: Number(form.timeout) }
      if (form.api_key.trim()) body.api_key = form.api_key.trim()
      await apiPost('/api/ai/config', body)
      setForm((f) => ({ ...f, api_key: '' }))
      onToast({ title: 'AI 配置已保存', detail: '已即时生效', action: 'ai.config.update', entity: 'app_setting' })
      void load()
    } catch (error) {
      onToast({ title: '保存失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setBusy(true); setTestResult(null)
    try {
      const r = await apiPost<{ model: string; reply: string }>('/api/ai/config/test')
      setTestResult(`✅ ${r.model}:${r.reply}`)
    } catch (error) {
      setTestResult('❌ ' + (error instanceof Error ? error.message : '测试失败'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel full-span motion-item">
      <PanelTitle icon={Settings} title="AI 接入配置(管理员)" />
      <p className="muted-copy">配置大模型接入(OpenAI 兼容),保存即生效。密钥不回显、留空表示不修改。当前:{cfg?.has_api_key ? '已配置密钥 ✓' : '未配置密钥'}。</p>
      <div className="form-grid detail-edit-grid">
        <label><span>状态</span>
          <select value={form.enabled ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.value === '1' }))}>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
        </label>
        <label><span>Base URL</span><input value={form.base_url} onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))} placeholder="https://api.siliconflow.cn/v1" /></label>
        <label><span>模型</span><input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="deepseek-ai/DeepSeek-V3" /></label>
        <label><span>API Key(留空不改)</span><input type="password" value={form.api_key} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} placeholder={cfg?.has_api_key ? '••• 已设置' : '未设置'} /></label>
        <label><span>超时(秒)</span><input type="number" value={form.timeout} onChange={(e) => setForm((f) => ({ ...f, timeout: Number(e.target.value) }))} /></label>
      </div>
      <div className="button-row" style={{ marginTop: 12, alignItems: 'center' }}>
        <button className="primary-button" type="button" disabled={busy} onClick={save}>保存配置</button>
        <button className="secondary-button" type="button" disabled={busy} onClick={test}>连通性测试</button>
        {testResult && <span style={{ fontSize: 13 }}>{testResult}</span>}
      </div>
    </section>
  )
}

// AI 解析改为「服务端异步任务」:POST 建 job → 后端线程跑到底并落库 → 前端轮询取回。
// 关掉浏览器/换设备回来都能通过 job_id / latest 恢复(不再依赖前端进程存活)。
type AiJob = { job_id: number; status: 'running' | 'done' | 'error'; result_text: string | null; error_text: string | null; model: string | null }

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
  const workspace = screen.id === 'ai-workspace' // 通用工作台:自定义指令 + 自由文本分析
  // 纪要解析与工作台统一走 SSE 流式 Markdown:边吞吐边渲染,配处理中动效。
  const [text, setText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const matFileRef = useRef<HTMLInputElement>(null)
  const [instruction, setInstruction] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]) // 真实解析历史(cap_ai_jobs)
  const jobIdRef = useRef<number | null>(null)          // 当前解析任务 id(服务端)
  const streamRef = useRef<AbortController | null>(null) // 当前 SSE 尾随连接(切屏/清空时中断)

  // 自动草稿:把「材料 + 指令 + 结果 + 任务id」按屏本地留存,回本屏自动恢复;
  // 结果可切换为可编辑草稿;清空交给显式按钮,不在自动逻辑里误删。
  const draftKey = `capitalos-ai-draft-${screen.id}`
  const restoredRef = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const d = JSON.parse(raw) as { text?: string; instruction?: string; answer?: string | null; savedAt?: string; jobId?: number }
        if (d.text) setText(d.text)
        if (d.instruction) setInstruction(d.instruction)
        if (d.answer) setAnswer(d.answer)
        if (d.savedAt) setSavedAt(d.savedAt)
        if (d.jobId) jobIdRef.current = d.jobId
      }
    } catch { /* 坏草稿忽略 */ }
    restoredRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])
  // 解析历史:挂载 + 每次任务忙闲切换(=有任务完成)后刷新真实记录。
  useEffect(() => {
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/ai/jobs').then((r) => setHistory(r.items ?? [])).catch(() => setHistory([]))
  }, [aiBusy])
  useEffect(() => {
    if (!restoredRef.current) return
    if (!text && !instruction && !answer) return // 全空不主动写/删,清空由按钮负责
    const ts = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    try {
      const raw = localStorage.getItem(draftKey)
      const prev = raw ? JSON.parse(raw) : {}
      // 合并保留 jobId,避免正文/结果变化时把任务 id 冲掉(否则重挂无法按 id 恢复)。
      localStorage.setItem(draftKey, JSON.stringify({ ...prev, text, instruction, answer, savedAt: ts }))
    } catch { /* 配额满忽略 */ }
    setSavedAt(ts)
  }, [text, instruction, answer, draftKey])
  // 每帧把结果并入 localStorage 草稿(合并保留 text/instruction),组件卸载后仍会执行。
  const persistAnswer = (ans: string) => {
    try {
      const raw = localStorage.getItem(draftKey)
      const d = raw ? JSON.parse(raw) : {}
      const ts = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      localStorage.setItem(draftKey, JSON.stringify({ ...d, answer: ans, savedAt: ts }))
    } catch { /* 配额满忽略 */ }
  }

  // 把任务 id 并入草稿,便于关掉浏览器/重挂后恢复。
  const persistJobId = (id: number | null) => {
    try {
      const raw = localStorage.getItem(draftKey)
      const d = raw ? JSON.parse(raw) : {}
      localStorage.setItem(draftKey, JSON.stringify({ ...d, jobId: id }))
    } catch { /* 忽略 */ }
  }

  // 混合方案:SSE 尾随服务端任务 —— 连着时低延迟增量,断开(切页签/刷新/换设备)后
  // 任务仍在后端跑;重新进入本屏时重连,从当前进度接着看。
  const streamJob = (id: number) => {
    streamRef.current?.abort()
    const ac = new AbortController()
    streamRef.current = ac
    jobIdRef.current = id
    persistJobId(id)
    setAiBusy(true); setAiError(null)
    let acc = ''
    // tail 首帧会补齐已生成部分,故先清空本地结果由流重新填充,避免重复拼接。
    setAnswer('')
    streamPost(`/api/ai/jobs/${id}/stream`, {}, (delta) => {
      acc += delta
      setAnswer(acc)
      persistAnswer(acc)
    }, ac.signal)
      .then(async () => {
        if (ac.signal.aborted) return
        // 流正常结束:确认任务真的完成(而非网络中断)——仍在跑就重连。
        try {
          const job = await apiGet<AiJob>(`/api/ai/jobs/${id}`)
          if (jobIdRef.current !== id) return
          if (job.status === 'running') { streamJob(id); return }
          setAiBusy(false)
          if (job.status === 'error') setAiError(job.error_text || 'AI 任务失败')
          else onToast({ title: 'AI 解析完成', detail: `模型 ${job.model ?? ''} 已返回`, action: 'ai.analyze', entity: 'cap_ai_jobs' })
        } catch { setAiBusy(false) }
      })
      .catch((error) => {
        if (ac.signal.aborted) return
        setAiBusy(false)
        setAiError(error instanceof Error ? error.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'AI 流中断')
      })
  }

  // 挂载时恢复:优先本地 jobId;没有则查本屏 latest(换设备)。running→重连流;done→直接展示。
  useEffect(() => {
    let ignore = false
    const adopt = async (id: number) => {
      if (ignore) return
      try {
        const job = await apiGet<AiJob>(`/api/ai/jobs/${id}`)
        if (ignore) return
        jobIdRef.current = id
        if (job.status === 'running') { streamJob(id) }
        else { setAnswer(job.result_text ?? ''); if (job.result_text) persistAnswer(job.result_text); if (job.status === 'error') setAiError(job.error_text || 'AI 任务失败') }
      } catch { /* 任务已不存在,忽略 */ }
    }
    if (jobIdRef.current) {
      void adopt(jobIdRef.current)
    } else {
      apiGet<{ job: AiJob | null }>(`/api/ai/jobs/latest?screen_id=${encodeURIComponent(screen.id)}`)
        .then((r) => { if (!ignore && r.job) { persistJobId(r.job.job_id); void adopt(r.job.job_id) } })
        .catch(() => undefined)
    }
    return () => { ignore = true; streamRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.id])

  const clearDraft = () => {
    streamRef.current?.abort()
    jobIdRef.current = null
    setText(''); setInstruction(''); setAnswer(null); setEditing(false); setSavedAt(null); setAiError(null)
    localStorage.removeItem(draftKey)
  }

  const run = async () => {
    if (!text.trim()) return
    setConfirmed(false); setAiError(null); setAnswer(''); setAiBusy(true)
    try {
      // 纪要用固定结构化指令;工作台用自定义指令。发起服务端任务,后端跑到底;前端 SSE 尾随。
      const instr = workspace ? instruction : MEETING_INSTRUCTION
      const r = await apiPost<{ job_id: number }>('/api/ai/jobs', { screen_id: screen.id, text, instruction: instr, job_kind: workspace ? 'analyze' : 'meeting' })
      streamJob(r.job_id)
    } catch (error) {
      setAiBusy(false)
      setAiError(error instanceof Error ? error.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'AI 调用失败')
    }
  }

  return (
    <div className="page-grid">
      <section className="panel motion-item">
        <PanelTitle icon={Upload} title={workspace ? '材料与分析指令' : meeting ? '会议纪要输入' : '材料解析输入'} />
        <div className="upload-zone">
          <strong>{workspace ? '自定义指令 + 材料,做通用投资分析' : meeting ? '粘贴会议纪要 / 投委会记录文本' : '粘贴 BP、协议、财报或行业报告文本'}</strong>
          <span>
            {workspace
              ? '写一句分析指令(可留空用默认),粘贴材料,大模型给出投资视角的自由分析。'
              : '由后端配置的大模型生成结构化摘要、关键要点与待办事项；人工确认后才写入审计。'}
          </span>
          {workspace && (
            <input
              className="ai-bp-input"
              style={{ minHeight: 'auto' }}
              placeholder="分析指令,如:评估这家公司的投资价值与主要风险(留空用默认)"
              value={instruction}
              readOnly={!canWrite}
              onChange={(event) => setInstruction(event.target.value)}
            />
          )}
          <textarea
            className="ai-bp-input"
            placeholder={workspace ? '在此粘贴待分析材料,或上传 txt/md 文件…' : meeting ? '在此粘贴会议纪要,或上传 txt/md 文件…' : '在此粘贴材料正文…'}
            value={text}
            readOnly={!canWrite}
            onChange={(event) => setText(event.target.value)}
            rows={7}
          />
          <input
            ref={matFileRef}
            type="file"
            accept=".txt,.md,.markdown,.pdf,.docx"
            style={{ display: 'none' }}
            onChange={async (event) => {
              const f = event.target.files?.[0]
              event.target.value = ''
              if (!f) return
              if (f.size > 20 * 1024 * 1024) { onToast({ title: '文件过大', detail: '上限 20MB' }); return }
              setExtracting(true)
              try {
                // 统一走后端抽取:txt/md 直读、PDF 用 pypdf、docx 用 python-docx。
                const fd = new FormData()
                fd.append('file', f)
                const token = getToken()
                const res = await fetch(`${API_BASE}/api/ai/extract-text`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
                if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
                const out = await res.json() as { text: string; chars: number; file_name: string }
                setText(out.text)
                onToast({ title: '已解析并载入', detail: `${out.file_name}(${out.chars} 字),可直接分析` })
              } catch (error) {
                const msg = error instanceof Error ? error.message : '解析失败'
                onToast({ title: '文件解析失败', detail: msg.replace(/^\{"detail":"?|"?\}$/g, '') })
              } finally {
                setExtracting(false)
              }
            }}
          />
          <div className="button-row" style={{ marginTop: 10 }}>
            <button className="primary-button" type="button" disabled={!canWrite || aiBusy || !text.trim()} onClick={run}>
              <Bot size={16} />
              {aiBusy ? (workspace ? 'AI 分析中…' : 'AI 解析中…') : (workspace ? '运行分析' : 'AI 解析')}
            </button>
            <button className="secondary-button" type="button" disabled={!canWrite || aiBusy || extracting} onClick={() => matFileRef.current?.click()} title="支持 txt/md/PDF/Word(.docx),自动抽取文本到材料框">
              <Upload size={16} /> {extracting ? '解析文件中…' : '上传材料文件'}
            </button>
          </div>
          {aiError && (
            <div className="ai-hint is-error">
              <AlertTriangle size={14} />
              <span>{aiError}</span>
            </div>
          )}
        </div>
      </section>

      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Bot} title={meeting ? '纪要解析结果(真模型)' : 'AI 输出工作台(真模型)'} />
        {(answer || savedAt) && (
          <div className="ai-answer-tools" data-testid="ai-draft-bar">
            {answer != null && !aiBusy && (
              <button type="button" className="link-button" disabled={!canWrite} onClick={() => setEditing((e) => !e)}>
                {editing ? '预览' : '编辑结果'}
              </button>
            )}
            <button type="button" className="link-button danger" disabled={aiBusy} onClick={clearDraft}>清空草稿</button>
            {savedAt && <span className="muted-note" data-testid="ai-draft-saved">草稿已自动保存 · {savedAt}(切页签不丢)</span>}
          </div>
        )}
        {aiBusy && !answer ? (
          <AiProcessing messages={meeting ? MEETING_MSGS : WORKSPACE_MSGS} />
        ) : editing && answer != null ? (
          <textarea
            className="ai-bp-input"
            data-testid="ai-answer-edit"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={14}
            aria-label="编辑解析结果"
          />
        ) : answer ? (
          <div className="ai-answer" data-testid="ai-answer">
            <Markdown text={answer} />
            {aiBusy && <span className="stream-cursor" aria-hidden="true" />}
          </div>
        ) : (
          <p className="muted-copy">
            {meeting ? '粘贴会议纪要并点「AI 解析」,摘要/要点/待办将流式生成。' : '填写指令与材料并点「运行分析」,分析结果将流式生成。'}
          </p>
        )}
        <div className="confirm-strip">
          <div>
            <strong>{confirmed ? '已人工确认，可入库' : '等待人工确认'}</strong>
            <span>未经确认的 AI 输出不会写入业务对象、文档关联或审计日志。</span>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={!canWrite || !answer || aiBusy}
            onClick={async () => {
              setConfirmed(true)
              try {
                const res = await apiPost('/api/actions', {
                  action: 'ai.output.confirm',
                  entity_type: 'ai_parse_output',
                  entity_label: screen.title,
                  after: { human_status: 'accepted', excerpt: (answer ?? '').slice(0, 200) },
                })
                onToast({ title: 'AI 结果已确认', detail: auditDetail(res) })
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
        {history.length === 0 ? (
          <p className="muted-note">暂无解析记录。运行一次分析后会在这里留痕(真实任务)。</p>
        ) : (
          <DataTable
            compact
            rows={history.map((j) => ({
              类型: j.job_kind === 'meeting' ? '纪要解析' : '材料分析',
              摘要: (String(j.input_preview ?? '').slice(0, 22) || '—'),
              状态: j.status === 'done' ? '已完成' : j.status === 'error' ? '失败' : '进行中',
              时间: j.updated_at ? String(j.updated_at).replace('T', ' ').slice(0, 16) : '',
            }))}
          />
        )}
      </section>

      {workspace && getRoles().some((r) => r === 'system_admin' || r === 'managing_partner') && <AiConfigPanel onToast={onToast} />}
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
            // 真实风险:由项目未结风险事件的最高严重度派生(无未结事件=低)。
            risk: item.risk_level === 3 ? '高' : item.risk_level === 2 ? '中' : '低',
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
          // 视图真过滤:全部 / 我的负责(owner=当前用户)/ 风险优先(高风险)。
          const rows = boardProjects.filter((project) =>
            project.stage === stage &&
            (boardView === 'all'
              ? true
              : boardView === 'mine'
                ? String(project.owner ?? '').trim() === getUserName().trim()
                : String(project.risk ?? '') === '高'),
          )
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
  const formRef = useRef<HTMLFormElement>(null)
  // AI 解析(仅项目):BP 文本 → 真模型 → 结构化字段 → 一键回填表单。
  const [bpText, setBpText] = useState('')
  const [aiFields, setAiFields] = useState<Record<string, unknown> | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const bpFileRef = useRef<HTMLInputElement>(null)

  const uploadBpFile = async (f: File) => {
    if (f.size > 20 * 1024 * 1024) { onToast({ title: '文件过大', detail: '上限 20MB' }); return }
    setExtracting(true); setAiError(null)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/ai/extract-text`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      const out = await res.json() as { text: string; chars: number; file_name: string }
      setBpText(out.text)
      onToast({ title: '已解析 BP 文件', detail: `${out.file_name}(${out.chars} 字),点「AI 解析」抽字段` })
    } catch (error) {
      setAiError((error instanceof Error ? error.message : '解析失败').replace(/^\{"detail":"?|"?\}$/g, ''))
    } finally {
      setExtracting(false)
    }
  }

  const runAiParse = async () => {
    if (!bpText.trim()) return
    setAiBusy(true); setAiError(null); setAiFields(null)
    try {
      const res = await apiPost<{ fields: Record<string, unknown>; model: string }>('/api/ai/parse-bp', { text: bpText })
      setAiFields(res.fields)
      onToast({ title: 'AI 解析完成', detail: `模型 ${res.model} 已返回结构化字段`, action: 'ai.parse_bp', entity: 'ai_parse_job' })
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 调用失败')
    } finally {
      setAiBusy(false)
    }
  }

  const applyAi = () => {
    if (!aiFields || !formRef.current) return
    const setInput = (name: string, value: unknown) => {
      const el = formRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`)
      if (el && value != null && String(value) !== '') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        setter?.call(el, String(value))
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    setInput('short_name', aiFields.short_name)
    setInput('legal_name', aiFields.legal_name)
    setInput('industry_group', aiFields.industry_group)
    setInput('city', aiFields.city)
    setInput('summary', aiFields.summary)
    onToast({ title: 'AI 建议已回填', detail: '已写入企业名/行业/城市/摘要等字段,可再手工调整', action: 'form.ai_prefill.apply', entity: 'project' })
  }

  // 字段 → 后端 payload 键的映射(有键的字段会真正入库;无键的仅展示)。
  // required 只标在实体名上,避免 BP 文件等无法填写的字段卡住提交。
  type Field = { label: string; key?: string; kind?: 'number'; required?: boolean; placeholder?: string }
  const groups: Array<[string, Field[]]> = isFund
    ? [
        ['基础信息', [
          { label: '基金简称', key: 'fund_name', required: true },
          { label: '基金全称', key: 'legal_name' },
          { label: '备案编号' }, { label: '管理人' }, { label: '托管行' }, { label: '组织形式' },
        ]],
        ['规模期限', [
          { label: '目标规模', key: 'target_size', kind: 'number', placeholder: '如 500000000' },
          { label: '首关规模', key: 'committed_size', kind: 'number' },
          { label: '实缴总额', key: 'paid_in_size', kind: 'number' },
          { label: '投资期' }, { label: '退出期' }, { label: '管理费率' },
        ]],
        ['治理披露', [
          { label: '投委会成员' }, { label: '观察员' }, { label: '关键人士' },
          { label: '关联交易规则' }, { label: 'LP 披露频率' }, { label: '审计安排' },
        ]],
      ]
    : [
        ['基础信息', [
          { label: '企业简称', key: 'short_name', required: true },
          { label: '企业全称', key: 'legal_name' },
          { label: '行业方向', key: 'industry_group' },
          { label: '城市', key: 'city' },
          { label: '统一信用代码' }, { label: '注册地' },
        ]],
        ['描述字段', [
          { label: '项目亮点 / 摘要', key: 'summary' },
          { label: '产品服务' }, { label: '商业模式' }, { label: '主要客户' },
          { label: '竞争优势' }, { label: '下一步计划' },
        ]],
      ]

  // BP 解析草稿:解析耗时长,切页签会丢 → 自动把 BP 正文 + AI 抽取结果按屏留存,回本屏自动恢复。
  const bpDraftKey = `capitalos-bp-draft-${screen.id}`
  const bpRestoredRef = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(bpDraftKey)
      if (raw) {
        const d = JSON.parse(raw) as { bpText?: string; aiFields?: Record<string, unknown> | null }
        if (d.bpText) setBpText(d.bpText)
        if (d.aiFields) setAiFields(d.aiFields)
      }
    } catch { /* 坏草稿忽略 */ }
    bpRestoredRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpDraftKey])
  useEffect(() => {
    if (!bpRestoredRef.current) return
    if (!bpText && !aiFields) return // 全空不主动写/删
    try { localStorage.setItem(bpDraftKey, JSON.stringify({ bpText, aiFields })) } catch { /* 配额满忽略 */ }
  }, [bpText, aiFields, bpDraftKey])

  // 草稿:把有 key 的字段本地存草稿,下次进同一张表单自动回填;提交成功后清除。
  const draftKey = `capitalos-draft-${screen.id}`
  const setInputValue = (name: string, value: string) => {
    const el = formRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"], textarea[name="${name}"]`)
    if (!el) return
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    setter?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  useEffect(() => {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as Record<string, string>
      // 等 DOM 就绪再回填。
      requestAnimationFrame(() => {
        let n = 0
        for (const [k, v] of Object.entries(draft)) { if (v) { setInputValue(k, v); n++ } }
        if (n) onToast({ title: '已恢复上次草稿', detail: `${n} 个字段来自本地草稿,可继续编辑或直接提交` })
      })
    } catch { /* 坏草稿忽略 */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])
  const saveDraft = () => {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    const draft: Record<string, string> = {}
    for (const f of groups.flatMap(([, fs]) => fs)) {
      if (!f.key) continue
      const v = String(fd.get(f.key) ?? '').trim()
      if (v) draft[f.key] = v
    }
    if (!Object.keys(draft).length) { onToast({ title: '草稿为空', detail: '先填写至少一个入库字段再保存' }); return }
    localStorage.setItem(draftKey, JSON.stringify(draft))
    onToast({ title: '草稿已保存(本地)', detail: `${Object.keys(draft).length} 个字段已存在本浏览器,下次进入本表单自动回填` })
  }

  return (
    <form
      ref={formRef}
      className="form-layout motion-item"
      onSubmit={async (event) => {
        event.preventDefault()
        // 从表单真实输入构建 payload(只取有 key 的字段),数字字段做类型转换。
        const fd = new FormData(event.currentTarget)
        const allFields = groups.flatMap(([, fields]) => fields)
        const payload: Record<string, unknown> = {}
        for (const f of allFields) {
          if (!f.key) continue
          const raw = String(fd.get(f.key) ?? '').trim()
          if (raw === '') continue
          payload[f.key] = f.kind === 'number' ? Number(raw) : raw
        }
        try {
          const result = screen.id === 'project-add'
            ? await apiPost('/api/projects', payload)
            : await apiPost('/api/funds', payload)
          localStorage.removeItem(draftKey)  // 提交成功即清草稿,避免下次误回填旧数据
          localStorage.removeItem(bpDraftKey)  // BP 解析草稿同样清除
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
              {fields.map((field) => (
                <label key={field.label}>
                  <span>
                    {field.label}
                    {field.required && <i>必填</i>}
                    {field.key && !field.required && <i className="field-persisted">入库</i>}
                  </span>
                  <input
                    name={field.key}
                    type={field.kind === 'number' ? 'number' : 'text'}
                    required={field.required}
                    readOnly={!canWrite}
                    placeholder={field.placeholder ?? `请输入${field.label}`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>
      <aside className="form-side">
        <PanelTitle icon={Bot} title="AI 回填(真模型)" />
        {isFund ? (
          <p>基金主档暂无 AI 抽取;项目「新增项目」支持粘贴 BP 文本由大模型抽取字段。</p>
        ) : (
          <>
            <p>上传或粘贴 BP / 项目介绍,由后端配置的大模型抽取结构化字段,一键回填左侧表单。</p>
            <input
              ref={bpFileRef}
              type="file"
              accept=".txt,.md,.markdown,.pdf,.docx"
              style={{ display: 'none' }}
              onChange={(event) => { const f = event.target.files?.[0]; event.target.value = ''; if (f) void uploadBpFile(f) }}
            />
            <button className="secondary-button full-width" type="button" disabled={!canWrite || aiBusy || extracting} onClick={() => bpFileRef.current?.click()} title="支持 txt/md/PDF/Word(.docx)">
              <Upload size={15} />
              {extracting ? '解析文件中…' : '上传 BP 文件'}
            </button>
            <textarea
              className="ai-bp-input"
              placeholder="上传 BP 文件后自动填入,或在此粘贴商业计划书 / 项目介绍…"
              value={bpText}
              readOnly={!canWrite}
              onChange={(event) => setBpText(event.target.value)}
              rows={5}
            />
            <button className="secondary-button full-width" type="button" disabled={!canWrite || aiBusy || !bpText.trim()} onClick={runAiParse}>
              <Bot size={15} />
              {aiBusy ? 'AI 解析中…' : 'AI 解析'}
            </button>
            {aiBusy && !aiFields && <AiProcessing messages={BP_MSGS} />}
            {aiError && (
              <div className="ai-hint is-error">
                <AlertTriangle size={14} />
                <span>{aiError}</span>
              </div>
            )}
            {aiFields && (
              <>
                <div className="review-list">
                  {[
                    ['企业简称', aiFields.short_name],
                    ['行业方向', aiFields.industry_group],
                    ['城市', aiFields.city],
                    ['融资轮次', aiFields.funding_round],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <CheckCircle size={15} />
                      <span>{String(label)}</span>
                      <strong>{val ? String(val) : '—'}</strong>
                    </div>
                  ))}
                </div>
                <button className="secondary-button full-width" type="button" disabled={!canWrite} onClick={applyAi}>
                  应用到表单
                </button>
                <p className="muted-note" data-testid="bp-draft-hint">解析结果已自动保存,切换页签也不会丢;提交后自动清除。</p>
              </>
            )}
          </>
        )}
        <button
          className="secondary-button full-width"
          type="button"
          onClick={saveDraft}
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

// detail 屏可编辑的主档字段(与后端 PATCH 白名单一致)。long=多行文本。
type DetailField = { key: string; label: string; kind?: 'number'; long?: boolean }
const DETAIL_FIELDS: Record<'project' | 'fund', DetailField[]> = {
  project: [
    { key: 'short_name', label: '企业简称' },
    { key: 'legal_name', label: '企业全称' },
    { key: 'industry_group', label: '行业方向' },
    { key: 'city', label: '城市' },
    { key: 'registered_location', label: '公司注册地' },
    { key: 'registry_code_mask', label: '统一信用代码' },
    { key: 'source_channel', label: '来源渠道' },
    { key: 'summary', label: '项目简介', long: true },
    { key: 'highlight_note', label: '项目亮点', long: true },
    { key: 'product_note', label: '主要产品', long: true },
    { key: 'thesis', label: '投资逻辑', long: true },
  ],
  fund: [
    { key: 'fund_name', label: '基金简称' },
    { key: 'legal_name', label: '基金全称' },
    { key: 'fund_status', label: '状态' },
    { key: 'target_size', label: '目标规模', kind: 'number' },
    { key: 'committed_size', label: '认缴规模', kind: 'number' },
    { key: 'paid_in_size', label: '实缴总额', kind: 'number' },
    { key: 'net_asset_value', label: '净资产', kind: 'number' },
  ],
}

// 项目所处阶段(顶部进度条):入库 → … → 完全退出。
const STAGE_STEPS = ['入库', 'NDA', 'TS', '立项', '投决', '领投', '投后', '部分退出', '完全退出']
// 后端 stage_label / opportunity_status → 阶段条下标(尽量匹配,匹配不到落到「入库」)。
const STAGE_INDEX: Record<string, number> = {
  sourced: 0, 入库: 0, screening: 1, nda: 1, ts: 2, term_sheet: 2,
  diligence: 3, 立项: 3, approved: 4, ic: 4, 投决: 4, invested: 5, 领投: 5, lead: 5,
  portfolio: 6, 投后: 6, post_investment: 6, partial_exit: 7, 部分退出: 7,
  exited: 8, 完全退出: 8, full_exit: 8,
}
function stageIndexOf(project: Record<string, string>): number {
  const raw = (project.stage_label || project.opportunity_status || '').trim().toLowerCase()
  if (raw in STAGE_INDEX) return STAGE_INDEX[raw]
  // 中文直配
  const cn = (project.stage_label || '').trim()
  const i = STAGE_STEPS.indexOf(cn)
  return i >= 0 ? i : 0
}
// 项目「基本情况」tab 的分组。
const PROJECT_BASIC_GROUPS: Array<[string, string[]]> = [
  ['基础信息', ['short_name', 'legal_name', 'industry_group', 'city', 'registered_location', 'registry_code_mask', 'source_channel']],
  ['项目描述', ['summary', 'highlight_note', 'product_note', 'thesis']],
]
const PROJECT_SUBTABS = ['基本情况', '投资汇总', '财务数据', '委派代表', '投资决策', 'AI 备忘录'] as const
type ProjectSubtab = (typeof PROJECT_SUBTABS)[number]
// 顶部 section 导航(对照反馈截图那一行)。概况=卡片主视图;其余为各专题 section。
const PROJECT_SECTIONS = ['概况', '日程', '基金投资情况', '权益变动', '三会', '现金流', '估值', '投后数据', '协议条款(AI)'] as const
const _n = (v: unknown): number | null => (v == null || v === '' ? null : Number(v))
const CF_KIND_CN: Record<string, string> = { project_return: '项目回款', capital_call: '出资', investment: '投资打款', management_fee: '管理费', distribution: '分配', expense: '费用' }
const CF_DIR_CN: Record<string, string> = { inflow: '流入', outflow: '流出' }
const SETTLE_CN: Record<string, string> = { settled: '已结算', pending: '待结算', failed: '失败' }
const INV_STATUS_CN: Record<string, string> = { funded: '已出资', committed: '已认缴', exited: '已退出', writeoff: '已减记' }
const VAL_METHOD_CN: Record<string, string> = { latest_round: '最新一轮', dcf: 'DCF', comparable: '可比公司', cost: '成本法', option: '期权定价' }
const MEETING_KIND_CN: Record<string, string> = { investment_committee: '投委会', board: '董事会', shareholder: '股东会', portfolio_review: '投后评审', internal_review: '内部评审', other: '其他' }
const MEETING_RESULT_CN: Record<string, string> = { pending: '待决', approved: '通过', rejected: '否决', conditional: '有条件通过', information_only: '仅通报' }
const CONFIRM_CN: Record<string, string> = { ai_draft: 'AI 草稿', human_confirmed: '人工确认', archived: '已归档' }
const EVENT_KIND_CN: Record<string, string> = { project: '项目', fund: '基金', meeting: '会议', workflow: '流程', personal: '个人', risk: '风控', other: '其他' }
const dtmin = (v: unknown): string => (v ? String(v).replace('T', ' ').slice(0, 16) : '—') // ISO → YYYY-MM-DD HH:MM
const CLAUSE_KIND_CN: Record<string, string> = { redemption: '回购', anti_dilution: '反稀释', veto: '一票否决', information_right: '信息权', milestone: '里程碑', liquidation_preference: '优先清算', other: '其他' }
const CLAUSE_STATUS_CN: Record<string, string> = { draft: '待确认', active: '生效', triggered: '已触发', waived: '已豁免', closed: '已关闭' }
// 各 section → 端点 + 行映射(转中文键给 DataTable)。仅列出接真数据的 section。
const SECTION_DATA: Record<string, { path: string; map: (r: Record<string, unknown>) => DataRow }> = {
  基金投资情况: {
    path: 'funds-investment',
    map: (r) => ({ 基金: String(r.fund_name ?? '—'), 轮次: String(r.round_label ?? '—'), 认购金额: wan(_n(r.agreement_amount)), 已打款: wan(_n(r.cumulative_paid_amount)), 持股比例: pct(_n(r.current_ownership_ratio)), 首次打款: r.first_payment_on ? String(r.first_payment_on) : '—', 状态: INV_STATUS_CN[String(r.investment_status)] ?? String(r.investment_status ?? '—') }),
  },
  权益变动: {
    path: 'equity-changes',
    map: (r) => ({ 事由: String(r.change_reason ?? '—'), 轮次: String(r.round_label ?? '—'), 是否领投: r.is_lead_investor ? '是' : '否', 投前持股: pct(_n(r.pre_money_ratio)), 投后持股: pct(_n(r.post_money_ratio)), 份额变动: _n(r.share_count_delta) == null ? '—' : Number(r.share_count_delta).toLocaleString('zh-CN', { maximumFractionDigits: 0 }), 协议日期: r.agreement_date ? String(r.agreement_date) : '—' }),
  },
  现金流: {
    path: 'cashflows',
    map: (r) => ({ 类型: CF_KIND_CN[String(r.cashflow_kind)] ?? String(r.cashflow_kind ?? '—'), 方向: CF_DIR_CN[String(r.direction)] ?? String(r.direction ?? '—'), 金额: wan(_n(r.amount)), 币种: String(r.currency ?? '—'), 日期: r.occurred_on ? String(r.occurred_on) : '—', 结算: SETTLE_CN[String(r.settlement_status)] ?? String(r.settlement_status ?? '—'), 说明: String(r.description ?? '—') }),
  },
  估值: {
    path: 'valuations',
    map: (r) => ({ 估值日期: r.valuation_date ? String(r.valuation_date) : '—', 方法: VAL_METHOD_CN[String(r.valuation_method)] ?? String(r.valuation_method ?? '—'), 投前估值: wan(_n(r.pre_money_value)), 投后估值: wan(_n(r.post_money_value)), 持有估值: wan(_n(r.holding_value)), 备注: String(r.notes ?? '—') }),
  },
  投后数据: {
    path: 'financials',
    map: (r) => ({ 期间: String(r.period_label ?? ''), 营业收入: wan(_n(r.revenue)), 毛利率: r.gross_margin == null ? '—' : `${(Number(r.gross_margin) * 100).toFixed(1)}%`, 净利润: wan(_n(r.net_profit)), 经营现金流: wan(_n(r.operating_cash_flow)), 员工数: r.headcount == null ? '—' : Number(r.headcount) }),
  },
  三会: {
    path: 'meetings',
    map: (r) => ({ 会议: String(r.meeting_title ?? '—'), 类型: MEETING_KIND_CN[String(r.meeting_kind)] ?? String(r.meeting_kind ?? '—'), 时间: dtmin(r.scheduled_at), 决议: MEETING_RESULT_CN[String(r.decision_result)] ?? String(r.decision_result ?? '—'), 确认状态: CONFIRM_CN[String(r.confirmation_status)] ?? String(r.confirmation_status ?? '—'), 行动项: r.action_count == null ? 0 : Number(r.action_count), 纪要摘要: String(r.ai_summary ?? '—') }),
  },
  日程: {
    path: 'schedule',
    map: (r) => ({ 事项: String(r.event_title ?? '—'), 类型: EVENT_KIND_CN[String(r.event_kind)] ?? String(r.event_kind ?? '—'), 开始: dtmin(r.starts_at), 结束: dtmin(r.ends_at), 地点: String(r.location_text ?? '—') }),
  },
}

// ── 基金详情:阶段/section/基本情况 与项目同构 ──
const FUND_STAGES = ['筹备', '募集', '投资', '收获', '延长', '清算']
const FUND_STAGE_INDEX: Record<string, number> = { planning: 0, raising: 1, investing: 2, harvesting: 3, extended: 4, closed: 5 }
const FUND_STATUS_CN: Record<string, string> = { planning: '筹备', raising: '募集', investing: '投资', harvesting: '收获', extended: '延长', closed: '清算' }
const FUND_SECTIONS = ['概况', '组合项目', 'LP出资', '现金流', '财报', '日程'] as const
const FUND_BASIC_GROUPS: Array<[string, string[]]> = [
  ['基础信息', ['fund_name', 'legal_name', 'fund_status']],
  ['规模期限', ['target_size', 'committed_size', 'paid_in_size', 'net_asset_value']],
]
const COMMIT_STATUS_CN: Record<string, string> = { active: '在册', exited: '已退出', defaulted: '违约', transferred: '已转让' }
const DISCLOSURE_CN: Record<string, string> = { confirmed: '已确认', sent: '已发送', pending: '待披露', none: '未披露' }
const REPORT_KIND_CN: Record<string, string> = { quarterly: '季报', annual: '年报', monthly: '月报', interim: '中期', semiannual: '半年报' }
const REPORT_STATUS_CN: Record<string, string> = { approved: '已审批', draft: '草稿', submitted: '已提交', published: '已发布' }
const FUND_SECTION_DATA: Record<string, { path: string; map: (r: Record<string, unknown>) => DataRow }> = {
  组合项目: {
    path: 'portfolio',
    map: (r) => ({ 项目: String(r.short_name ?? '—'), 轮次: String(r.round_label ?? '—'), 认购金额: wan(_n(r.agreement_amount)), 已打款: wan(_n(r.cumulative_paid_amount)), 持股比例: pct(_n(r.current_ownership_ratio)), 最新估值: wan(_n(r.latest_valuation)), 状态: INV_STATUS_CN[String(r.investment_status)] ?? String(r.investment_status ?? '—') }),
  },
  LP出资: {
    path: 'commitments',
    map: (r) => ({ LP: String(r.investor_name ?? '—'), 认缴: wan(_n(r.committed_amount)), 实缴: wan(_n(r.paid_in_amount)), 入伙日期: r.admission_date ? String(r.admission_date) : '—', 状态: COMMIT_STATUS_CN[String(r.status)] ?? String(r.status ?? '—'), 披露: DISCLOSURE_CN[String(r.disclosure_status)] ?? String(r.disclosure_status ?? '—') }),
  },
  现金流: SECTION_DATA.现金流,
  财报: {
    path: 'reports',
    map: (r) => ({ 期间: String(r.period_code ?? '—'), 类型: REPORT_KIND_CN[String(r.report_kind)] ?? String(r.report_kind ?? '—'), 总资产: wan(_n(r.total_assets)), 总负债: wan(_n(r.total_liabilities)), 净资产: wan(_n(r.net_assets)), 实缴资本: wan(_n(r.paid_in_capital)), 已分配: wan(_n(r.distributed_amount)), 状态: REPORT_STATUS_CN[String(r.report_status)] ?? String(r.report_status ?? '—') }),
  },
  日程: { path: 'schedule', map: SECTION_DATA.日程.map },
}

// ── 投资人详情:同构页 ──
const INVESTOR_SECTIONS = ['概况', '出资承诺', '联系人', '触点记录'] as const
const INVESTOR_KIND_CN: Record<string, string> = { government_guidance: '政府引导基金', corporate: '产业/企业', family_office: '家族办公室', financial: '金融机构', insurance: '保险资金', individual: '个人', other: '其他' }
const QUAL_CN: Record<string, string> = { qualified: '合格投资者', pending: '待认定', rejected: '不合格', expired: '已过期' }
const RISK_RATING_CN: Record<string, string> = { low: '低', medium: '中', high: '高', conservative: '保守', balanced: '平衡', aggressive: '进取', professional: '专业投资者', retail: '普通投资者', qualified: '合格' }
const TOUCHPOINT_CN: Record<string, string> = { meeting: '会议', call: '电话', email: '邮件', roadshow: '路演', site_visit: '实地走访', other: '其他' }
const INVESTOR_SECTION_DATA: Record<string, { path: string; map: (r: Record<string, unknown>) => DataRow }> = {
  出资承诺: {
    path: 'commitments',
    map: (r) => ({ 基金: String(r.fund_name ?? '—'), 认缴: wan(_n(r.committed_amount)), 实缴: wan(_n(r.paid_in_amount)), 入伙日期: r.admission_date ? String(r.admission_date) : '—', 状态: COMMIT_STATUS_CN[String(r.status)] ?? String(r.status ?? '—'), 披露: DISCLOSURE_CN[String(r.disclosure_status)] ?? String(r.disclosure_status ?? '—') }),
  },
  联系人: {
    path: 'contacts',
    map: (r) => ({ 姓名: String(r.contact_name ?? '—'), 职务: String(r.title ?? '—'), 邮箱: String(r.email ?? '—'), 手机: String(r.mobile_mask ?? '—'), 主要联系人: r.is_primary ? '是' : '否' }),
  },
  触点记录: {
    path: 'touchpoints',
    map: (r) => ({ 类型: TOUCHPOINT_CN[String(r.touchpoint_kind)] ?? String(r.touchpoint_kind ?? '—'), 时间: dtmin(r.occurred_at), 主题: String(r.subject ?? '—'), 摘要: String(r.summary ?? '—'), 下一步: String(r.next_step ?? '—') }),
  },
}
const SEAT_CN: Record<string, string> = { director: '董事', observer: '观察员', other: '其他' }
const REP_STATUS_CN: Record<string, string> = { active: '在任', resigned: '已卸任' }
const DECISION_TYPE_CN: Record<string, string> = { ic: '投委会', pre_ic: '立项', follow_on: '追加', exit: '退出', other: '其他' }
const DECISION_RESULT_CN: Record<string, string> = { approved: '通过', rejected: '否决', deferred: '暂缓' }
// 数据 tab → 端点路径 + 行映射(转成中文键给 DataTable 渲染)。
const TAB_DATA: Record<string, { path: string; map: (r: Record<string, unknown>) => DataRow }> = {
  财务数据: {
    path: 'financials',
    map: (r) => ({
      期间: String(r.period_label ?? ''),
      营业收入: r.revenue == null ? '—' : `${(Number(r.revenue) / 1e4).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 万`,
      毛利率: r.gross_margin == null ? '—' : `${(Number(r.gross_margin) * 100).toFixed(1)}%`,
      净利润: r.net_profit == null ? '—' : `${(Number(r.net_profit) / 1e4).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 万`,
      经营现金流: r.operating_cash_flow == null ? '—' : `${(Number(r.operating_cash_flow) / 1e4).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 万`,
      员工数: r.headcount == null ? '—' : Number(r.headcount),
    }),
  },
  委派代表: {
    path: 'representatives',
    map: (r) => ({
      姓名: String(r.rep_name ?? ''),
      席位: SEAT_CN[String(r.seat_type)] ?? String(r.seat_type ?? ''),
      委派日期: r.appointed_on ? String(r.appointed_on) : '—',
      状态: REP_STATUS_CN[String(r.rep_status)] ?? String(r.rep_status ?? ''),
      备注: String(r.note ?? '—'),
    }),
  },
  投资决策: {
    path: 'decisions',
    map: (r) => ({
      决议: String(r.decision_title ?? ''),
      类型: DECISION_TYPE_CN[String(r.decision_type)] ?? String(r.decision_type ?? ''),
      结果: DECISION_RESULT_CN[String(r.decision_result)] ?? String(r.decision_result ?? ''),
      决议日期: r.decided_on ? String(r.decided_on) : '—',
      说明: String(r.resolution_note ?? '—'),
    }),
  },
}
type InvestSummary = {
  has_position: boolean
  performance: { DPI: number | null; MOIC: number | null; IRR: number | null }
  investment: { agreement_total: number | null; paid_total: number | null; first_payment_on: string | null; ownership_ratio: number | null; latest_valuation: number | null; round_label: string | null; investment_status: string | null }
  realized: { realized_total: number | null; exit_status: string | null }
}
// 金额(元)→ 万,保留 1 位;空显示 —。
const wan = (v: number | null | undefined): string => (v == null ? '—' : `${(v / 1e4).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 万`)
const pct = (v: number | null | undefined): string => (v == null ? '—' : `${(v * 100).toFixed(2)}%`)
const num = (v: number | null | undefined): string => (v == null ? '—' : String(v))

// 亮点:AI 一键生成投资备忘录(IC Memo)—— 基于项目全量真实数据,流式渲染 Markdown。
function ProjectMemoPanel({ projectId, canWrite, onToast }: { projectId: number | null; canWrite: boolean; onToast: (t: Toast) => void }) {
  const [busy, setBusy] = useState(false)        // AI 生成中
  const [memo, setMemo] = useState('')           // 已提交的现行备忘录(查看态)
  const [editing, setEditing] = useState(false)  // 编辑态
  const [draft, setDraft] = useState('')         // 编辑区文本
  const [hasSavedDraft, setHasSavedDraft] = useState(false) // 服务端存有未提交草稿
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const acRef = useRef<AbortController | null>(null)
  const editingRef = useRef(false); editingRef.current = editing

  // 载入现行备忘录 + 是否有草稿。切换项目时重置编辑态。
  useEffect(() => {
    acRef.current?.abort()
    setEditing(false); setDraft(''); setMemo(''); setErr(null); setHasSavedDraft(false)
    if (projectId == null) return
    let alive = true
    apiGet<{ memo: { content: string } | null }>(`/api/projects/${projectId}/memo`)
      .then((r) => { if (alive) setMemo(r.memo?.content || '') })
      .catch(() => {})
    if (canWrite) {
      apiGet<{ draft: { content?: string } | null }>(`/api/projects/${projectId}/drafts/ai_memo`)
        .then((r) => { if (alive) setHasSavedDraft(!!r.draft?.content) })
        .catch(() => {})
    }
    return () => { alive = false }
  }, [projectId, canWrite])
  useEffect(() => () => acRef.current?.abort(), [])

  // AI 生成:进入编辑态,流式写入编辑区,生成后用户再改。
  const generate = async () => {
    if (projectId == null) return
    setBusy(true); setErr(null); setEditing(true); setDraft('')
    try {
      const r = await apiPost<{ job_id: number }>(`/api/projects/${projectId}/ai-memo`, {})
      acRef.current?.abort()
      const ac = new AbortController(); acRef.current = ac
      let acc = ''
      await streamPost(`/api/ai/jobs/${r.job_id}/stream`, {}, (delta) => { acc += delta; setDraft(acc) }, ac.signal)
    } catch (e) {
      if (!acRef.current?.signal.aborted) setErr(e instanceof Error ? e.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'AI 调用失败')
    } finally { setBusy(false) }
  }

  const enterEdit = async () => {
    // 有草稿则恢复草稿,否则以现行备忘录起编。
    let start = memo
    try {
      const r = await apiGet<{ draft: { content?: string } | null }>(`/api/projects/${projectId}/drafts/ai_memo`)
      if (r.draft?.content) start = r.draft.content
    } catch { /* 忽略,用现行备忘录起编 */ }
    setDraft(start); setEditing(true)
  }
  const saveDraft = async () => {
    if (projectId == null) return
    setSaving(true)
    try { await apiPut(`/api/projects/${projectId}/drafts/ai_memo`, { draft: { content: draft } }); setHasSavedDraft(true); onToast({ title: '草稿已保存', detail: '未提交,下次可继续编辑' }) }
    catch (e) { onToast({ title: '保存草稿失败', detail: e instanceof Error ? e.message : '' }) }
    finally { setSaving(false) }
  }
  const submit = async () => {
    if (projectId == null || !draft.trim()) return
    setSaving(true)
    try {
      await apiPut(`/api/projects/${projectId}/memo`, { content: draft })
      await apiDelete(`/api/projects/${projectId}/drafts/ai_memo`).catch(() => {})
      setMemo(draft); setEditing(false); setHasSavedDraft(false)
      onToast({ title: '备忘录已提交', detail: '已保存为现行版本' })
    } catch (e) { onToast({ title: '提交失败', detail: e instanceof Error ? e.message : '' }) }
    finally { setSaving(false) }
  }
  const reset = () => { setDraft(memo); onToast({ title: '已重置', detail: '编辑区已恢复为现行版本' }) }
  const cancel = () => { acRef.current?.abort(); setBusy(false); setEditing(false); setDraft('') }

  return (
    <div data-testid="memo-panel">
      <div className="button-row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="primary-button" type="button" disabled={!canWrite || busy || projectId == null} onClick={generate} data-testid="memo-generate">
          <Bot size={16} /> {busy ? 'AI 撰写中…' : memo || editing ? 'AI 重新生成' : 'AI 生成投资备忘录'}
        </button>
        {!editing && memo && canWrite && (
          <button className="secondary-button" type="button" onClick={enterEdit} data-testid="memo-edit">修改</button>
        )}
        {!editing && memo && (
          <button className="secondary-button" type="button" onClick={() => { navigator.clipboard?.writeText(memo); onToast({ title: '已复制', detail: '备忘录 Markdown 已复制到剪贴板' }) }}>复制</button>
        )}
        {editing && (
          <>
            <button className="primary-button" type="button" disabled={saving || busy || !draft.trim()} onClick={submit} data-testid="memo-submit">提交</button>
            <button className="secondary-button" type="button" disabled={saving || busy} onClick={saveDraft} data-testid="memo-save-draft">保存草稿</button>
            <button className="secondary-button" type="button" disabled={saving || busy} onClick={reset}>重置</button>
            <button className="secondary-button" type="button" disabled={saving} onClick={cancel}>取消</button>
          </>
        )}
        {!editing && hasSavedDraft && canWrite && (
          <button className="secondary-button" type="button" onClick={enterEdit} data-testid="memo-resume-draft">继续编辑草稿</button>
        )}
      </div>
      {editing ? (
        <textarea
          className="memo-editor"
          data-testid="memo-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="在此编辑投资备忘录(Markdown)。可先点「AI 重新生成」让模型起草,再修改。"
          style={{ width: '100%', minHeight: 360, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 1.6, padding: 12, resize: 'vertical' }}
        />
      ) : busy ? (
        <AiProcessing messages={['读取项目全量数据…', '分析财务与估值…', '梳理风险与条款…', '撰写投委会备忘录…']} />
      ) : memo ? (
        <div className="ai-answer" data-testid="memo-body"><Markdown text={memo} /></div>
      ) : err ? (
        <p className="muted-note">{err}</p>
      ) : (
        <p className="muted-note">基于本项目的卡片 / 投资汇总 / 财务 / 决策 / 委派等真实数据,一键生成结构化投资备忘录(IC Memo);生成后可修改、保存草稿、提交为现行版本。</p>
      )}
    </div>
  )
}

// 协议条款(AI):粘贴协议文本 → 大模型抽取关键条款入库 → 表格展示(cap_risk_clauses)。
function ProjectClausesSection({ projectId, canWrite, onToast }: { projectId: number | null; canWrite: boolean; onToast: (t: Toast) => void }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    if (projectId == null) { setRows([]); return }
    let ignore = false
    apiGet<{ items: Array<Record<string, unknown>> }>(`/api/projects/${projectId}/clauses`)
      .then((r) => { if (!ignore) setRows(r.items ?? []) })
      .catch(() => { if (!ignore) setRows([]) })
    return () => { ignore = true }
  }, [projectId, reloadKey])
  const extract = async () => {
    if (!text.trim() || projectId == null) return
    setBusy(true)
    try {
      const r = await apiPost<{ inserted: number }>(`/api/projects/${projectId}/clauses/extract`, { text })
      onToast({ title: `已抽取 ${r.inserted} 条条款`, detail: '大模型结构化入库,见下方列表', action: 'project.clauses.extract', entity: 'cap_risk_clauses' })
      setText(''); setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '抽取失败', detail: error instanceof Error ? error.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'API 调用失败' })
    } finally { setBusy(false) }
  }
  const tableRows: DataRow[] = rows.map((r) => ({
    类型: CLAUSE_KIND_CN[String(r.clause_kind)] ?? String(r.clause_kind ?? '—'),
    轮次: String(r.round_label ?? '—'),
    摘要: String(r.clause_summary ?? '—'),
    状态: CLAUSE_STATUS_CN[String(r.clause_status)] ?? String(r.clause_status ?? '—'),
  }))
  return (
    <section className="panel full-span motion-item" data-testid="section-clauses">
      <PanelTitle icon={Bot} title="协议条款(AI)" />
      <div className="upload-zone" style={{ marginBottom: 14 }}>
        <textarea className="ai-bp-input" placeholder="粘贴投资协议 / 条款清单文本,AI 抽取优先清算、反稀释、回购、一票否决、信息权等关键条款并入库…"
          value={text} readOnly={!canWrite} onChange={(e) => setText(e.target.value)} rows={5} data-testid="clause-input" />
        <div className="button-row" style={{ marginTop: 10 }}>
          <button className="primary-button" type="button" disabled={!canWrite || busy || !text.trim()} onClick={extract} data-testid="clause-extract">
            <Bot size={15} /> {busy ? 'AI 抽取中…' : 'AI 抽取条款'}
          </button>
        </div>
      </div>
      {tableRows.length === 0 ? (
        <p className="muted-note">暂无已抽取条款。粘贴协议文本点「AI 抽取条款」即可结构化入库。</p>
      ) : (
        <DataTable rows={tableRows} compact />
      )}
    </section>
  )
}

// 项目卡片右侧协作面板:评论 / 小组问答(真写 cap_project_comments)。
function ProjectCommentPanel({ projectId, canWrite, onToast }: { projectId: number | null; canWrite: boolean; onToast: (t: Toast) => void }) {
  const [tab, setTab] = useState<'comment' | 'qa'>('comment')
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    if (projectId == null) { setItems([]); return }
    let ignore = false
    apiGet<{ items: Array<Record<string, unknown>> }>(`/api/projects/${projectId}/comments`)
      .then((r) => { if (!ignore) setItems(r.items ?? []) })
      .catch(() => { if (!ignore) setItems([]) })
    return () => { ignore = true }
  }, [projectId, reloadKey])
  const shown = items.filter((c) => String(c.comment_kind) === tab)
  const send = async () => {
    if (!input.trim() || projectId == null) return
    setBusy(true)
    try {
      await apiPost(`/api/projects/${projectId}/comments`, { body_text: input.trim(), comment_kind: tab })
      setInput(''); setReloadKey((k) => k + 1)
      onToast({ title: tab === 'qa' ? '已提问' : '已评论', detail: '已记录到项目协作与审计' })
    } catch (error) {
      onToast({ title: '发送失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally { setBusy(false) }
  }
  return (
    <section className="panel one-third motion-item">
      <div className="subtab-bar">
        <button type="button" className={classNames('subtab', tab === 'comment' && 'is-active')} onClick={() => setTab('comment')}>评论</button>
        <button type="button" className={classNames('subtab', tab === 'qa' && 'is-active')} onClick={() => setTab('qa')}>小组问答</button>
      </div>
      <div className="comment-compose">
        <textarea value={input} placeholder={tab === 'qa' ? '向小组提个问题…' : '写下你的评论…'} readOnly={!canWrite}
          onChange={(e) => setInput(e.target.value)} rows={3} data-testid="comment-input" />
        <button type="button" className="primary-button" disabled={!canWrite || busy || !input.trim() || projectId == null} data-testid="comment-send" onClick={send}>
          <Bot size={15} /> {busy ? '发送中…' : (tab === 'qa' ? '提问' : '评论')}
        </button>
      </div>
      <div className="comment-list" data-testid="comment-list">
        {shown.length === 0 ? <p className="muted-note">暂无{tab === 'qa' ? '问答' : '评论'}</p> : shown.map((c) => (
          <div className="comment-item" key={String(c.id)}>
            <div className="comment-head"><strong>{String(c.author ?? '匿名')}</strong><span>{c.created_at ? String(c.created_at).replace('T', ' ').slice(0, 16) : ''}</span></div>
            <p>{String(c.body_text ?? '')}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 权益变动台账(反馈 #12/#13):跨项目记录表与项目内页签共用 ──
const EQUITY_REASONS = ['首次投资', '追加投资', '退出', '被动稀释(再融资)']
const EQUITY_REASON_TONE: Record<string, string> = { 首次投资: 'magenta', 追加投资: 'teal', 退出: 'blue', '被动稀释(再融资)': 'orange' }

type EquityRow = {
  equity_change_id: number
  project_id: number
  project_name?: string
  fund_id: number | null
  fund_name: string
  change_reason: string
  agreement_date: string | null
  approval_date: string | null
  round_label: string
  is_lead_investor: number
  investment_method: string
  investment_method_label: string | null
  pre_money_ratio: string | number | null
  post_money_ratio: string | number | null
  co_investors: string | null
  notes: string | null
}

// 股比:库里存小数(0.078),展示为「7.8 %」;空值一律「—」。
function eqPct(v: unknown): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return `${+(n * 100).toFixed(2)} %`
}

function eqMethod(row: EquityRow): string {
  return row.investment_method_label || ({ equity: '增资', convertible_note: '可转债', safe: 'SAFE', secondary: '老股转让', option: '期权', other: '—' }[row.investment_method] ?? '—')
}

type EquityOption = { id: number; name: string }

function EquityChangeModal({ initial, projectId, projOpts, fundOpts, onClose, onSaved, onToast }: {
  initial: EquityRow | null   // null = 新增
  projectId?: number          // 项目内页签:项目固定
  projOpts: EquityOption[]
  fundOpts: EquityOption[]
  onClose: () => void
  onSaved: () => void
  onToast: (toast: Toast) => void
}) {
  const [form, setForm] = useState(() => ({
    project_id: initial ? String(initial.project_id) : projectId != null ? String(projectId) : '',
    fund_id: initial?.fund_id ? String(initial.fund_id) : '',
    change_reason: initial?.change_reason ?? '首次投资',
    agreement_date: initial?.agreement_date ?? '',
    approval_date: initial?.approval_date ?? '',
    round_label: initial?.round_label && initial.round_label !== '-' ? initial.round_label : '',
    is_lead_investor: initial ? Boolean(initial.is_lead_investor) : false,
    investment_method_label: initial ? (initial.investment_method_label ?? '') : '',
    pre_pct: initial?.pre_money_ratio != null ? String(+(Number(initial.pre_money_ratio) * 100).toFixed(4)) : '',
    post_pct: initial?.post_money_ratio != null ? String(+(Number(initial.post_money_ratio) * 100).toFixed(4)) : '',
    co_investors: initial?.co_investors ?? '',
    notes: initial?.notes ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))
  const reasonOptions = EQUITY_REASONS.includes(form.change_reason) || !form.change_reason ? EQUITY_REASONS : [form.change_reason, ...EQUITY_REASONS]

  const save = async () => {
    if (!initial && !form.project_id) { onToast({ title: '请选择项目', detail: '新增权益变动需先选定所属项目' }); return }
    if (!form.change_reason.trim()) { onToast({ title: '请选择股权变更原因', detail: '该字段必填' }); return }
    const num = (s: string) => { const n = Number(s); return s.trim() === '' || Number.isNaN(n) ? null : +(n / 100).toFixed(6) }
    const payload: Record<string, unknown> = {
      fund_id: form.fund_id ? Number(form.fund_id) : null,
      change_reason: form.change_reason.trim(),
      agreement_date: form.agreement_date || null,
      approval_date: form.approval_date || null,
      round_label: form.round_label.trim() || '-',
      is_lead_investor: form.is_lead_investor,
      investment_method_label: form.investment_method_label.trim() || null,
      pre_money_ratio: num(form.pre_pct),
      post_money_ratio: num(form.post_pct),
      co_investors: form.co_investors.trim() || null,
      notes: form.notes.trim() || null,
    }
    setSaving(true)
    try {
      if (initial) {
        await apiPatch(`/api/equity-changes/${initial.equity_change_id}`, payload)
        onToast({ title: '权益变动已更新', detail: '修改已写入台账', action: 'equity_change.update', entity: 'cap_equity_changes' })
      } else {
        await apiPost('/api/equity-changes', { ...payload, project_id: Number(form.project_id) })
        onToast({ title: '权益变动已新增', detail: '记录已写入台账', action: 'equity_change.create', entity: 'cap_equity_changes' })
      }
      onSaved()
      onClose()
    } catch (error) {
      onToast({ title: initial ? '更新失败' : '新增失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="eq-modal-backdrop" onClick={onClose} data-testid="equity-modal">
      <div className="eq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eq-modal-head">
          <h3>{initial ? '编辑权益变动' : '新增权益变动'}</h3>
          <button type="button" className="icon-button" aria-label="关闭" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          {projectId == null && (
            <label>
              <span>项目{!initial && <i>必填</i>}</span>
              {initial ? (
                <input value={initial.project_name ?? String(initial.project_id)} readOnly />
              ) : (
                <select value={form.project_id} onChange={(e) => set('project_id', e.target.value)} data-testid="eq-project">
                  <option value="">请选择项目</option>
                  {projOpts.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              )}
            </label>
          )}
          <label>
            <span>投资主体(基金)</span>
            <select value={form.fund_id} onChange={(e) => set('fund_id', e.target.value)} data-testid="eq-fund">
              <option value="">—</option>
              {fundOpts.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
            </select>
          </label>
          <label>
            <span>股权变更原因<i>必填</i></span>
            <select value={form.change_reason} onChange={(e) => set('change_reason', e.target.value)} data-testid="eq-reason">
              {reasonOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>
            <span>协议时间</span>
            <input type="date" value={form.agreement_date} onChange={(e) => set('agreement_date', e.target.value)} />
          </label>
          <label>
            <span>投决会通过时间</span>
            <input type="date" value={form.approval_date} onChange={(e) => set('approval_date', e.target.value)} />
          </label>
          <label>
            <span>轮次</span>
            <input value={form.round_label} onChange={(e) => set('round_label', e.target.value)} placeholder="如 A / B+ / Pre-IPO" />
          </label>
          <label>
            <span>是否领投</span>
            <select value={form.is_lead_investor ? '1' : '0'} onChange={(e) => set('is_lead_investor', e.target.value === '1')}>
              <option value="1">是</option>
              <option value="0">否</option>
            </select>
          </label>
          <label>
            <span>投资方式</span>
            <input value={form.investment_method_label} onChange={(e) => set('investment_method_label', e.target.value)} placeholder="如 增资+可转债+老股转让" />
          </label>
          <label>
            <span>交易前股比(%)</span>
            <input type="number" step="0.01" min="0" value={form.pre_pct} onChange={(e) => set('pre_pct', e.target.value)} placeholder="如 9.09" />
          </label>
          <label>
            <span>交易后占比(%)</span>
            <input type="number" step="0.01" min="0" value={form.post_pct} onChange={(e) => set('post_pct', e.target.value)} placeholder="如 7.79" />
          </label>
          <label>
            <span>本轮其他投资机构</span>
            <input value={form.co_investors} onChange={(e) => set('co_investors', e.target.value)} placeholder="多家用顿号分隔" />
          </label>
          <label className="span-2">
            <span>备注</span>
            <input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>
        <div className="button-row eq-modal-actions">
          <button type="button" className="primary-button" disabled={saving} onClick={save} data-testid="eq-save">
            <CheckCircle size={15} /> {saving ? '保存中…' : '保存'}
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}

// 极简 CSV:导出加 BOM;导入支持双引号包裹(含逗号/换行的值)。
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cell = '', row: string[] = [], inQuote = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuote) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else inQuote = false }
      else cell += c
    } else if (c === '"') inQuote = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

function EquityChangeTable({ projectId, canWrite, onToast }: {
  projectId?: number
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  const [rows, setRows] = useState<EquityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)
  const ledger = projectId == null

  // 关键字回车检索(反馈 #10 参考格式:输入关键字回车);项目内由「筛选」展开。
  const [kw, setKw] = useState('')
  const [q, setQ] = useState('')
  const [showFilter, setShowFilter] = useState(ledger)
  const [sortAsc, setSortAsc] = useState(false) // 协议时间排序,默认最新在前
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<EquityRow | 'new' | null>(null)
  const [colMenu, setColMenu] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)
  const [projOpts, setProjOpts] = useState<EquityOption[]>([])
  const [fundOpts, setFundOpts] = useState<EquityOption[]>([])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    const path = projectId != null ? `/api/projects/${projectId}/equity-changes` : '/api/equity-changes'
    apiGet<{ items: EquityRow[] }>(path)
      .then((r) => { if (!ignore) { setRows(r.items ?? []); setSelected(new Set()) } })
      .catch(() => !ignore && setRows([]))
      .finally(() => !ignore && setLoading(false))
    return () => { ignore = true }
  }, [projectId, reloadKey])

  useEffect(() => {
    let ignore = false
    if (ledger) {
      apiGet<{ items: Array<Record<string, unknown>> }>('/api/projects')
        .then((r) => !ignore && setProjOpts((r.items ?? []).map((p) => ({ id: Number(p.id), name: String(p.short_name ?? p.id) }))))
        .catch(() => undefined)
    }
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/funds')
      .then((r) => !ignore && setFundOpts((r.items ?? []).map((f) => ({ id: Number(f.id), name: String(f.fund_name ?? f.id) }))))
      .catch(() => undefined)
    return () => { ignore = true }
  }, [ledger])

  const allColumns = [
    ...(ledger ? ['项目名称'] : []),
    '投资主体', '股权变更原因', '协议时间', '投决会通过时间', '轮次', '是否领投', '投资方式',
    '交易前股比', '交易后占比', '本轮其他投资机构',
  ]
  const columns = allColumns.filter((c) => !hidden.has(c))
  const cellOf = (r: EquityRow, col: string): string => {
    switch (col) {
      case '项目名称': return String(r.project_name ?? r.project_id)
      case '投资主体': return r.fund_name === '-' ? '—' : String(r.fund_name ?? '—')
      case '股权变更原因': return String(r.change_reason ?? '—')
      case '协议时间': return r.agreement_date ? String(r.agreement_date) : '—'
      case '投决会通过时间': return r.approval_date ? String(r.approval_date) : '—'
      case '轮次': return r.round_label && r.round_label !== '-' ? String(r.round_label) : '—'
      case '是否领投': return r.is_lead_investor ? '是' : '否'
      case '投资方式': return eqMethod(r)
      case '交易前股比': return eqPct(r.pre_money_ratio)
      case '交易后占比': return eqPct(r.post_money_ratio)
      case '本轮其他投资机构': return r.co_investors ? String(r.co_investors) : '—'
      default: return '—'
    }
  }

  const dq = q.trim().toLowerCase()
  const filtered = dq
    ? rows.filter((r) => allColumns.map((c) => cellOf(r, c)).concat(r.notes ?? '').join(' ').toLowerCase().includes(dq))
    : rows
  const sorted = [...filtered].sort((a, b) => {
    const av = a.agreement_date ?? '', bv = b.agreement_date ?? ''
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const curPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((curPage - 1) * pageSize, curPage * pageSize)
  const pageIds = pageRows.map((r) => r.equity_change_id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  const doSearch = () => { setQ(kw.trim()); setPage(1) }

  const removeOne = async (r: EquityRow) => {
    if (!window.confirm(`确认删除该权益变动记录(${cellOf(r, '股权变更原因')} / ${cellOf(r, '协议时间')})?`)) return
    try {
      await apiDelete(`/api/equity-changes/${r.equity_change_id}`)
      onToast({ title: '已删除权益变动', detail: '记录已移除(软删,可在回收站恢复)', action: 'equity_change.delete', entity: 'cap_equity_changes' })
      reload()
    } catch (error) {
      onToast({ title: '删除失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    }
  }

  const removeSelected = async () => {
    const ids = [...selected]
    if (!ids.length || !window.confirm(`确认删除选中的 ${ids.length} 条记录?`)) return
    let ok = 0, fail = 0
    for (const id of ids) {
      try { await apiDelete(`/api/equity-changes/${id}`); ok++ } catch { fail++ }
    }
    onToast({ title: `批量删除完成:成功 ${ok} 条${fail ? `,失败 ${fail} 条` : ''}`, detail: '记录已移除(软删)', action: 'equity_change.delete', entity: 'cap_equity_changes' })
    reload()
  }

  const exportCsv = () => {
    const header = [...columns, '备注']
    const lines = [header.map(csvCell).join(',')]
    for (const r of sorted) lines.push([...columns.map((c) => { const v = cellOf(r, c); return v === '—' ? '' : v }), r.notes ?? ''].map(csvCell).join(','))
    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = ledger ? '权益变动台账.csv' : `权益变动-项目${projectId}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    onToast({ title: '已导出 CSV', detail: `${sorted.length} 条权益变动记录` })
  }

  const importCsv = async (file: File) => {
    const grid = parseCsv(await file.text())
    if (grid.length < 2) { onToast({ title: '导入失败', detail: 'CSV 里没有数据行(第一行应为表头)' }); return }
    const header = grid[0].map((h) => h.trim())
    const idx = (name: string) => header.indexOf(name)
    if (ledger && idx('项目名称') < 0) { onToast({ title: '导入失败', detail: '缺少「项目名称」列' }); return }
    if (idx('股权变更原因') < 0) { onToast({ title: '导入失败', detail: '缺少「股权变更原因」列' }); return }
    const projByName = new Map(projOpts.map((p) => [p.name, p.id]))
    const fundByName = new Map(fundOpts.map((f) => [f.name, f.id]))
    const cell = (row: string[], name: string) => { const i = idx(name); return i >= 0 ? (row[i] ?? '').trim() : '' }
    const pctNum = (s: string) => { const n = Number(s.replace('%', '').trim()); return s.trim() === '' || Number.isNaN(n) ? null : +(n / 100).toFixed(6) }
    let ok = 0
    const errors: string[] = []
    for (let i = 1; i < grid.length; i++) {
      const row = grid[i]
      const pid = ledger ? projByName.get(cell(row, '项目名称')) : projectId
      if (!pid) { errors.push(`第 ${i + 1} 行:项目「${cell(row, '项目名称')}」不存在`); continue }
      if (!cell(row, '股权变更原因')) { errors.push(`第 ${i + 1} 行:股权变更原因为空`); continue }
      const fundName = cell(row, '投资主体')
      try {
        await apiPost('/api/equity-changes', {
          project_id: pid,
          fund_id: fundName ? (fundByName.get(fundName) ?? null) : null,
          change_reason: cell(row, '股权变更原因'),
          agreement_date: cell(row, '协议时间') || null,
          approval_date: cell(row, '投决会通过时间') || null,
          round_label: cell(row, '轮次') || '-',
          is_lead_investor: cell(row, '是否领投') === '是',
          investment_method_label: cell(row, '投资方式') || null,
          pre_money_ratio: pctNum(cell(row, '交易前股比')),
          post_money_ratio: pctNum(cell(row, '交易后占比')),
          co_investors: cell(row, '本轮其他投资机构') || null,
          notes: cell(row, '备注') || null,
        })
        ok++
      } catch (error) {
        errors.push(`第 ${i + 1} 行:${error instanceof Error ? error.message : '写入失败'}`)
      }
    }
    onToast({
      title: `导入完成:新增 ${ok} 条${errors.length ? `,${errors.length} 行有误` : ''}`,
      detail: errors.slice(0, 5).join('\n') || '全部行写入成功',
      action: 'equity_change.import',
      entity: 'cap_equity_changes',
    })
    reload()
  }

  return (
    <div className="equity-table" data-testid={ledger ? 'equity-ledger' : 'equity-section'}>
      <div className="list-controls">
        {showFilter && (
          <>
            <label className="table-search">
              <Search size={15} />
              <input
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
                placeholder="输入关键字回车"
                aria-label="检索权益变动"
                data-testid="equity-search"
              />
            </label>
            {dq && <span className="muted-note">匹配 {filtered.length} / {rows.length} 条</span>}
          </>
        )}
        <button type="button" className="primary-button" disabled={!canWrite} onClick={() => setEditing('new')} data-testid="equity-add">
          <Plus size={15} /> 新增
        </button>
        {!ledger && (
          <button type="button" className="secondary-button" onClick={() => { setShowFilter((v) => !v); if (showFilter) { setKw(''); setQ('') } }}>
            <Search size={15} /> 筛选
          </button>
        )}
        <div className="col-config">
          <button type="button" className="secondary-button" onClick={() => setColMenu((v) => !v)} data-testid="equity-cols">
            <Columns size={14} /> 显示列 ({columns.length}/{allColumns.length})
          </button>
          {colMenu && (
            <div className="col-config-menu">
              {allColumns.map((col) => (
                <label key={col}>
                  <input
                    type="checkbox"
                    checked={!hidden.has(col)}
                    onChange={() => setHidden((prev) => {
                      const next = new Set(prev)
                      if (next.has(col)) next.delete(col)
                      else if (allColumns.length - next.size > 1) next.add(col)
                      return next
                    })}
                  />
                  <span>{col}</span>
                </label>
              ))}
              <button type="button" className="link-button" onClick={() => setHidden(new Set())}>重置为全部显示</button>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = '' }}
        />
        <button type="button" className="secondary-button" disabled={!canWrite} onClick={() => fileRef.current?.click()} title="按导出的 CSV 表头批量导入">
          <Upload size={15} /> 导入
        </button>
        <button type="button" className="secondary-button" onClick={exportCsv}>
          <Download size={15} /> 导出
        </button>
        <button type="button" className="danger-button" disabled={!canWrite || selected.size === 0} onClick={removeSelected} data-testid="equity-batch-delete">
          <Trash size={14} /> 删除{selected.size ? ` (${selected.size})` : ''}
        </button>
      </div>
      {loading ? (
        <p className="muted-note">加载中…</p>
      ) : sorted.length === 0 ? (
        <p className="muted-note">{dq ? `没有匹配「${q}」的记录。` : '暂无权益变动记录。'}</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => setSelected((prev) => {
                        const next = new Set(prev)
                        pageIds.forEach((id) => { if (e.target.checked) next.add(id); else next.delete(id) })
                        return next
                      })}
                      aria-label="全选本页"
                    />
                  </th>
                  <th>序号</th>
                  {columns.map((col) => col === '协议时间' ? (
                    <th key={col} className="eq-sortable" onClick={() => setSortAsc((v) => !v)} title="点击切换排序">
                      协议时间 {sortAsc ? '▲' : '▼'}
                    </th>
                  ) : (
                    <th key={col}>{col}</th>
                  ))}
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.equity_change_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.equity_change_id)}
                        onChange={(e) => setSelected((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(r.equity_change_id)
                          else next.delete(r.equity_change_id)
                          return next
                        })}
                        aria-label={`选择第 ${i + 1} 行`}
                      />
                    </td>
                    <td>{(curPage - 1) * pageSize + i + 1}</td>
                    {columns.map((col) => {
                      if (col === '项目名称') {
                        return (
                          <td key={col}>
                            <button type="button" className="link-button eq-project-link" onClick={() => goToEntity('project-detail-overview', r.project_id)}>
                              {cellOf(r, col)}
                            </button>
                          </td>
                        )
                      }
                      if (col === '股权变更原因') {
                        const v = cellOf(r, col)
                        return <td key={col}><span className={`eq-tag tone-${EQUITY_REASON_TONE[v] ?? 'gray'}`}>{v}</span></td>
                      }
                      if (col === '是否领投') {
                        const lead = Boolean(r.is_lead_investor)
                        return <td key={col}><span className={`eq-tag ${lead ? 'tone-magenta' : 'tone-teal'}`}>{lead ? '是' : '否'}</span></td>
                      }
                      return <td key={col}>{cellOf(r, col)}</td>
                    })}
                    <td className="eq-row-actions">
                      <button type="button" className="link-button" disabled={!canWrite} onClick={() => setEditing(r)} data-testid={`equity-edit-${r.equity_change_id}`}>编辑</button>
                      <span className="eq-action-sep">|</span>
                      <button type="button" className="link-button eq-danger-link" disabled={!canWrite} onClick={() => void removeOne(r)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="eq-pagination">
            <button type="button" className="secondary-button" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} aria-label="上一页">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, n) => n + 1).slice(Math.max(0, curPage - 3), curPage + 2).map((n) => (
              <button key={n} type="button" className={classNames('secondary-button eq-page-btn', n === curPage && 'is-active')} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" className="secondary-button" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)} aria-label="下一页">
              <ChevronRight size={15} />
            </button>
            <span className="muted-note">
              共 {sorted.length} 条,每页显示
              <select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} aria-label="每页条数">
                {[10, 20, 50].map((n) => <option key={n} value={String(n)}>{n}</option>)}
              </select>
              条
            </span>
          </div>
        </>
      )}
      {editing !== null && (
        <EquityChangeModal
          initial={editing === 'new' ? null : editing}
          projectId={projectId}
          projOpts={projOpts}
          fundOpts={fundOpts}
          onClose={() => setEditing(null)}
          onSaved={reload}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// #12:投资关系入口 = 跨项目权益变动记录台账(参照系统同构)。
function EquityLedgerPage({ screen, canWrite, onToast }: { screen: Screen; canWrite: boolean; onToast: (toast: Toast) => void }) {
  return (
    <div className="page-grid">
      <section className="panel detail-hero full-span motion-item">
        <div>
          <span className="page-kicker">{screen.group}</span>
          <h2>{screen.title}</h2>
          <p>跨项目的投资/权益变动记录台账,点项目名称进入该项目卡片。</p>
        </div>
      </section>
      <section className="panel full-span motion-item">
        <EquityChangeTable canWrite={canWrite} onToast={onToast} />
      </section>
    </div>
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
  const kind: 'project' | 'fund' | null = screen.id.startsWith('project-detail')
    ? 'project'
    : screen.id.startsWith('fund-detail')
      ? 'fund'
      : null

  // 投资人 detail 走真数据同构页;其它非 project/fund detail 仍用静态面板。
  if (screen.id.startsWith('investor-detail')) return <InvestorDetailPage canWrite={canWrite} onToast={onToast} />
  if (kind === null) return <StaticDetailPage screen={screen} canWrite={canWrite} onToast={onToast} />

  const listPath = kind === 'project' ? '/api/projects' : '/api/funds'
  const fields = DETAIL_FIELDS[kind]
  const nameKey = fields[0].key

  const [entities, setEntities] = useState<Array<Record<string, unknown>>>([])
  const [selectedId, setSelectedId] = useState<number | null>(() => readRouteId()) // 支持从列表行 ?id= 预选
  const [form, setForm] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<Record<string, unknown>>({}) // 原始详情(阶段/入库时间/负责人等非编辑字段)
  const [loadedAt, setLoadedAt] = useState<string | null>(null) // 乐观锁:加载时的 updated_at
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<string>('概况') // 顶部 section 导航(项目/基金通用)
  const [sectionRows, setSectionRows] = useState<DataRow[]>([])
  const [sectionLoading, setSectionLoading] = useState(false)
  const [subtab, setSubtab] = useState<ProjectSubtab>('基本情况') // 项目卡片二级 tab
  const [editingBasic, setEditingBasic] = useState(false)        // 基本情况编辑态(反馈 #6)
  const [basicBaseline, setBasicBaseline] = useState<Record<string, string>>({}) // 进入编辑时的服务端值,供重置/取消
  const [hasBasicDraft, setHasBasicDraft] = useState(false)      // 服务端存有未提交草稿
  const [savingBasicDraft, setSavingBasicDraft] = useState(false)
  const [view, setView] = useState<'list' | 'detail'>(() => (readRouteId() != null ? 'detail' : 'list')) // 清单页 / 明细页
  const [dirQuery, setDirQuery] = useState('') // 清单页关键字检索(反馈 issue #10)
  const [summary, setSummary] = useState<InvestSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const sectionMap = kind === 'fund' ? FUND_SECTION_DATA : SECTION_DATA

  // 顶部各专题 section 按需拉取(项目/基金各自的 SECTION_DATA)。
  useEffect(() => {
    if (kind == null || selectedId == null) return
    if (kind === 'project' && section === '权益变动') { setSectionRows([]); return } // #13:该 section 由 EquityChangeTable 自取数
    const spec = sectionMap[section]
    if (!spec) { setSectionRows([]); return }
    let ignore = false
    setSectionLoading(true); setSectionRows([])
    apiGet<{ items: Array<Record<string, unknown>> }>(`${listPath}/${selectedId}/${spec.path}`)
      .then((r) => { if (!ignore) setSectionRows((r.items ?? []).map(spec.map)) })
      .catch(() => { if (!ignore) setSectionRows([]) })
      .finally(() => { if (!ignore) setSectionLoading(false) })
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, section, selectedId, listPath])

  // 阶段流向条入场:圆点弹入 + 箭头从左画出(GSAP)。
  const stageRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !stageRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.stage-flow .stage-node', { autoAlpha: 0, y: 10, scale: 0.8, duration: 0.4, ease: 'back.out(1.7)', stagger: 0.045, delay: 0.12 })
      gsap.from('.stage-flow .stage-arrow', { scaleX: 0, transformOrigin: 'left center', duration: 0.3, ease: 'power2.out', stagger: 0.045, delay: 0.18 })
      // 当前阶段圆点持续轻微脉冲,引导视线到"项目所处阶段"。
      gsap.to('.stage-node.is-current .stage-node-dot', { scale: 1.12, repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut', delay: 0.7 })
    }, stageRef)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, section, kind])

  const [tabRows, setTabRows] = useState<DataRow[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])
  const [showHistory, setShowHistory] = useState(false)

  // 投资汇总:切到该 tab 时按需拉取聚合(cap_investment_positions)。
  useEffect(() => {
    if (kind !== 'project' || subtab !== '投资汇总' || selectedId == null) return
    let ignore = false
    setSummaryLoading(true); setSummary(null)
    apiGet<InvestSummary>(`${listPath}/${selectedId}/summary`)
      .then((s) => { if (!ignore) setSummary(s) })
      .catch(() => { if (!ignore) setSummary(null) })
      .finally(() => { if (!ignore) setSummaryLoading(false) })
    return () => { ignore = true }
  }, [kind, subtab, selectedId, listPath])

  // 财务数据 / 委派代表 / 投资决策:切到该 tab 时拉取并映射成中文表格行。
  useEffect(() => {
    if (kind !== 'project' || selectedId == null) return
    const spec = TAB_DATA[subtab]
    if (!spec) { setTabRows([]); return }
    let ignore = false
    setTabLoading(true); setTabRows([])
    apiGet<{ items: Array<Record<string, unknown>> }>(`${listPath}/${selectedId}/${spec.path}`)
      .then((r) => { if (!ignore) setTabRows((r.items ?? []).map(spec.map)) })
      .catch(() => { if (!ignore) setTabRows([]) })
      .finally(() => { if (!ignore) setTabLoading(false) })
    return () => { ignore = true }
  }, [kind, subtab, selectedId, listPath])

  // 历史:展开时拉审计。
  useEffect(() => {
    if (kind !== 'project' || !showHistory || selectedId == null) return
    let ignore = false
    apiGet<{ items: Array<Record<string, unknown>> }>(`${listPath}/${selectedId}/history`)
      .then((r) => { if (!ignore) setHistory(r.items ?? []) })
      .catch(() => { if (!ignore) setHistory([]) })
    return () => { ignore = true }
  }, [kind, showHistory, selectedId, listPath])

  // 路由带 ?id= 时预选该实体(从列表行「打开」进来);换屏回到概况 section。
  useEffect(() => {
    const urlId = readRouteId()
    if (urlId != null) setSelectedId(urlId)
    setSection('概况')
    setView(urlId != null ? 'detail' : 'list') // 带 ?id= 进来直达明细,否则先看清单
    setDirQuery('')
  }, [screen.id])

  // 载入实体列表(供选择)。
  useEffect(() => {
    let ignore = false
    setLoading(true)
    apiGet<{ items: Array<Record<string, unknown>> }>(listPath)
      .then((res) => {
        if (ignore) return
        setEntities(res.items ?? [])
        setSelectedId((prev) => prev ?? (res.items?.[0]?.id as number | undefined) ?? null)
      })
      .catch(() => !ignore && setEntities([]))
      .finally(() => !ignore && setLoading(false))
    return () => { ignore = true }
  }, [listPath])

  // 载入选中实体的详情 → 填充可编辑表单。
  useEffect(() => {
    if (selectedId == null) return
    let ignore = false
    apiGet<Record<string, unknown>>(`${listPath}/${selectedId}`)
      .then((detail) => {
        if (ignore) return
        const next: Record<string, string> = {}
        for (const f of fields) next[f.key] = detail[f.key] == null ? '' : String(detail[f.key])
        setForm(next)
        setDetail(detail)
        setLoadedAt(detail.updated_at ? String(detail.updated_at) : null)
      })
      .catch(() => undefined)
    return () => { ignore = true }
  }, [selectedId, listPath])

  const save = async (): Promise<boolean> => {
    if (selectedId == null) return false
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      for (const f of fields) {
        const v = form[f.key]?.trim() ?? ''
        if (v !== '') body[f.key] = f.kind === 'number' ? Number(v) : v
      }
      if (loadedAt) body.expected_updated_at = loadedAt // 乐观锁:提交加载时的版本
      const result = await apiPatch(`${listPath}/${selectedId}`, body)
      onToast({
        title: '主档已保存',
        detail: auditDetail(result),
        action: `${kind}.update`,
        entity: kind === 'project' ? 'cap_projects' : 'cap_funds',
        result,
      })
      // 刷新列表里的名称显示,并重取最新 updated_at(否则同一页再存会误报冲突)
      setEntities((prev) => prev.map((e) => (e.id === selectedId ? { ...e, [nameKey]: form[nameKey] } : e)))
      apiGet<Record<string, unknown>>(`${listPath}/${selectedId}`)
        .then((d) => setLoadedAt(d.updated_at ? String(d.updated_at) : null))
        .catch(() => undefined)
      return true
    } catch (error) {
      onToast({ title: '保存失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
      return false
    } finally {
      setSaving(false)
    }
  }

  // ── 基本情况编辑态:修改 → 保存草稿/提交/重置(反馈 #6)────────────────
  const basicKeys = PROJECT_BASIC_GROUPS.flatMap(([, keys]) => keys)
  const basicSubset = (src: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const k of basicKeys) out[k] = src[k] ?? ''
    return out
  }
  // 切换项目/退出卡片时收起编辑态,并检查是否有草稿。
  useEffect(() => {
    setEditingBasic(false); setHasBasicDraft(false)
    if (kind !== 'project' || selectedId == null || !canWrite) return
    let alive = true
    apiGet<{ draft: Record<string, string> | null }>(`${listPath}/${selectedId}/drafts/basic_info`)
      .then((r) => { if (alive) setHasBasicDraft(!!r.draft && Object.keys(r.draft).length > 0) })
      .catch(() => {})
    return () => { alive = false }
  }, [selectedId, kind, canWrite, listPath])

  const enterEditBasic = async (useDraft: boolean) => {
    setBasicBaseline(basicSubset(form)) // 当前服务端值作为重置基线
    if (useDraft) {
      try {
        const r = await apiGet<{ draft: Record<string, string> | null }>(`${listPath}/${selectedId}/drafts/basic_info`)
        if (r.draft) setForm((prev) => ({ ...prev, ...r.draft }))
      } catch { /* 用现值起编 */ }
    }
    setEditingBasic(true)
  }
  const saveBasicDraft = async () => {
    if (selectedId == null) return
    setSavingBasicDraft(true)
    try {
      await apiPut(`${listPath}/${selectedId}/drafts/basic_info`, { draft: basicSubset(form) })
      setHasBasicDraft(true)
      onToast({ title: '草稿已保存', detail: '未提交,下次可继续编辑' })
    } catch (e) { onToast({ title: '保存草稿失败', detail: e instanceof Error ? e.message : '' }) }
    finally { setSavingBasicDraft(false) }
  }
  const submitBasic = async () => {
    const ok = await save()
    if (ok) {
      await apiDelete(`${listPath}/${selectedId}/drafts/basic_info`).catch(() => {})
      setEditingBasic(false); setHasBasicDraft(false)
    }
  }
  const resetBasic = () => { setForm((prev) => ({ ...prev, ...basicBaseline })); onToast({ title: '已重置', detail: '基本情况已恢复为保存前的值' }) }
  const cancelBasic = () => { setForm((prev) => ({ ...prev, ...basicBaseline })); setEditingBasic(false) }

  const advance = async () => {
    if (selectedId == null) return
    setSaving(true)
    try {
      const result = await apiPost<{ stage?: string }>(`${listPath}/${selectedId}/advance`)
      onToast({ title: `阶段已推进${result.stage ? ' → ' + result.stage : ''}`, detail: auditDetail(result), action: 'project.advance', entity: 'cap_projects', result })
      // 重取详情反映新阶段(阶段进度条 + 项目卡片头部据此刷新)
      const d = await apiGet<Record<string, unknown>>(`${listPath}/${selectedId}`)
      setDetail(d)
      setLoadedAt(d.updated_at ? String(d.updated_at) : null)
    } catch (error) {
      onToast({ title: '推进失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (selectedId == null) return
    const label = form[nameKey] || `#${selectedId}`
    if (!window.confirm(`确认删除「${label}」?删除后可在「回收站」恢复。`)) return
    setSaving(true)
    try {
      const result = await apiDelete(`${listPath}/${selectedId}`)
      onToast({ title: '已删除(可在回收站恢复)', detail: auditDetail(result), action: `${kind}.delete`, entity: kind === 'project' ? 'cap_projects' : 'cap_funds', result })
      // 从列表移除并切到下一个
      const rest = entities.filter((e) => e.id !== selectedId)
      setEntities(rest)
      setSelectedId((rest[0]?.id as number | undefined) ?? null)
      if (rest.length === 0) setForm({})
    } catch (error) {
      onToast({ title: '删除失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setSaving(false)
    }
  }

  const entityName = form[nameKey] || (loading ? '加载中…' : '（无数据）')
  const fieldByKey = Object.fromEntries(fields.map((f) => [f.key, f])) as Record<string, DetailField>
  const curStage = stageIndexOf({ stage_label: String(detail.stage_label ?? ''), opportunity_status: String(detail.opportunity_status ?? '') })
  const fundStatus = String(form.fund_status ?? detail.fund_status ?? '')
  const fundStage = FUND_STAGE_INDEX[fundStatus] ?? 0

  const dirLabel = kind === 'project' ? '项目' : '基金'

  // 清单页:卡片网格(自动换行),点一个进该对象明细;顶部关键字检索(名称/阶段/行业/城市全字段匹配)。
  if (view === 'list') {
    const dq = dirQuery.trim().toLowerCase()
    const matched = dq
      ? entities.filter((e) => Object.values(e).join(' ').toLowerCase().includes(dq))
      : entities
    return (
      <div className="page-grid">
        <section className="panel detail-hero full-span motion-item">
          <div>
            <span className="page-kicker">{screen.group}</span>
            <h2>{dirLabel}清单</h2>
            <p>选择一个{dirLabel}查看主档、阶段、投资情况、投后数据等全部信息。</p>
          </div>
        </section>
        <section className="panel full-span motion-item">
          <div className="list-controls">
            <label className="table-search">
              <Search size={15} />
              <input
                value={dirQuery}
                onChange={(e) => setDirQuery(e.target.value)}
                placeholder={`输入${dirLabel}关键字检索(名称 / 阶段 / 行业 / 城市)`}
                aria-label={`检索${dirLabel}`}
                data-testid="entity-picker-search"
              />
            </label>
            {dq ? <span className="muted-note">匹配 {matched.length} / {entities.length} 个{dirLabel}</span> : null}
          </div>
          {loading ? (
            <p className="muted-note">加载中…</p>
          ) : entities.length === 0 ? (
            <p className="muted-note">暂无{dirLabel}。</p>
          ) : matched.length === 0 ? (
            <p className="muted-note">没有匹配「{dirQuery.trim()}」的{dirLabel},换个关键字试试。</p>
          ) : (
            <div className="entity-picker-grid" data-testid="entity-picker">
              {matched.map((e) => (
                <button
                  key={String(e.id)}
                  type="button"
                  className="entity-picker-card"
                  onClick={() => { setSelectedId(Number(e.id)); setView('detail') }}
                  data-testid={`entity-picker-card-${e.id}`}
                >
                  <strong>{String(e[nameKey] ?? e.name ?? e.id)}</strong>
                  <span className="entity-picker-meta">{String(e.stage_label ?? e.fund_status ?? '—')}</span>
                  <span className="entity-picker-sub">{[e.sector, e.city].filter(Boolean).map(String).join(' · ') || '—'}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="page-grid" ref={stageRef}>
      {/* 返回清单页 */}
      <div className="full-span entity-detail-back">
        <button type="button" className="secondary-button" onClick={() => setView('list')} data-testid="entity-back-to-list">
          <ChevronLeft size={16} /> {dirLabel}清单
        </button>
      </div>
      <section className="panel detail-hero full-span motion-item">
        <div>
          <span className="page-kicker">{screen.group}</span>
          <h2>{entityName}</h2>
          <p>从左侧{dirLabel}目录选择对象,右侧加载其后端数据;修改并保存直接落库(租户内 + 权限校验)。</p>
        </div>
        <div className="detail-actions">
          {kind === 'project' && (
            <button
              type="button"
              className="secondary-button"
              disabled={!canWrite || saving || selectedId == null}
              data-testid="detail-advance"
              onClick={advance}
            >
              <GitBranch size={16} />
              推进阶段
            </button>
          )}
          <button
            type="button"
            className="danger-button"
            disabled={!canWrite || saving || selectedId == null}
            data-testid="detail-delete"
            onClick={del}
          >
            <Trash size={16} />
            删除
          </button>
        </div>
      </section>

      {kind === 'project' ? (
        <>
          {/* 顶部 section 导航(概况/日程/基金投资情况/…/协议条款AI) */}
          <section className="panel full-span motion-item section-tabbar">
            <div className="subtab-bar" data-testid="project-sections">
              {PROJECT_SECTIONS.map((s) => (
                <button key={s} type="button" className={classNames('subtab', section === s && 'is-active')} onClick={() => setSection(s)}>{s}</button>
              ))}
            </div>
          </section>

          {section === '概况' ? (
          <>
          {/* 项目所处阶段进度条 */}
          <section className="panel full-span motion-item">
            <PanelTitle icon={GitBranch} title="项目所处阶段" />
            <div className="stage-flow" data-testid="stage-bar">
              {STAGE_STEPS.flatMap((s, i) => {
                const node = (
                  <div key={`n-${i}`} className={classNames('stage-node', i < curStage && 'is-done', i === curStage && 'is-current')}>
                    <span className="stage-node-dot">{i < curStage ? '✓' : i + 1}</span>
                    <span className="stage-node-name">{s}</span>
                  </div>
                )
                // 节点之间插入带箭头的连接线,表现流向(左→右);已过节点的入线高亮。
                return i === 0 ? [node] : [
                  <span key={`a-${i}`} className={classNames('stage-arrow', i <= curStage && 'is-filled')} aria-hidden="true" />,
                  node,
                ]
              })}
            </div>
          </section>

          {/* 项目卡片头部字段 */}
          <section className="panel full-span motion-item">
            <PanelTitle icon={FileText} title="项目卡片" />
            <div className="project-card-grid" data-testid="project-card">
              <div><span>企业简称</span><strong>{form.short_name || '—'}</strong></div>
              <div><span>企业全称</span><strong>{form.legal_name || '—'}</strong></div>
              <div><span>项目进度</span><strong><StatusBadge value={String(detail.stage_label ?? '—')} /></strong></div>
              <div><span>项目入库时间</span><strong>{detail.created_at ? String(detail.created_at).slice(0, 10) : '—'}</strong></div>
              <div><span>统一信用代码</span><strong>{form.registry_code_mask || '—'}</strong></div>
              <div><span>项目负责人</span><strong>{String(detail.owner ?? '—')}</strong></div>
              <div><span>行业方向</span><strong>{form.industry_group || '—'}</strong></div>
              <div><span>项目所在城市</span><strong>{form.city || '—'}</strong></div>
            </div>
          </section>

          {/* 二级 tabs */}
          <section className="panel two-thirds motion-item">
            <div className="subtab-bar" data-testid="project-subtabs">
              {PROJECT_SUBTABS.map((t) => (
                <button key={t} type="button" className={classNames('subtab', subtab === t && 'is-active')} onClick={() => setSubtab(t)}>{t}</button>
              ))}
            </div>

            {subtab === '基本情况' && (
              <div data-testid="subtab-basic">
                {PROJECT_BASIC_GROUPS.map(([group, keys]) => (
                  <fieldset className="form-section" key={group}>
                    <legend>{group}</legend>
                    <div className="form-grid detail-edit-grid">
                      {keys.map((k) => {
                        const f = fieldByKey[k]
                        if (!f) return null
                        return (
                          <label key={k} className={f.long ? 'span-2' : undefined}>
                            <span>{f.label}</span>
                            {f.long ? (
                              <textarea value={form[k] ?? ''} readOnly={!canWrite || !editingBasic} data-field={k} rows={3}
                                onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))} />
                            ) : (
                              <input type="text" value={form[k] ?? ''} readOnly={!canWrite || !editingBasic} data-field={k}
                                onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))} />
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
                <div className="button-row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
                  {!editingBasic ? (
                    <>
                      <button type="button" className="primary-button" disabled={!canWrite || selectedId == null} data-testid="detail-edit" onClick={() => enterEditBasic(false)}>
                        <CheckCircle size={16} /> 修改
                      </button>
                      {hasBasicDraft && canWrite && (
                        <button type="button" className="secondary-button" data-testid="detail-resume-draft" onClick={() => enterEditBasic(true)}>继续编辑草稿</button>
                      )}
                    </>
                  ) : (
                    <>
                      <button type="button" className="primary-button" disabled={saving || savingBasicDraft} data-testid="detail-submit" onClick={submitBasic}>
                        <CheckCircle size={16} /> {saving ? '提交中…' : '提交'}
                      </button>
                      <button type="button" className="secondary-button" disabled={saving || savingBasicDraft} data-testid="detail-save-draft" onClick={saveBasicDraft}>
                        {savingBasicDraft ? '保存中…' : '保存草稿'}
                      </button>
                      <button type="button" className="secondary-button" disabled={saving || savingBasicDraft} onClick={resetBasic}>重置</button>
                      <button type="button" className="secondary-button" disabled={saving} onClick={cancelBasic}>取消</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {subtab === '投资汇总' && (
              <div data-testid="subtab-summary">
                {summaryLoading ? (
                  <p className="muted-note">投资汇总加载中…</p>
                ) : !summary ? (
                  <p className="muted-note">投资汇总加载失败</p>
                ) : !summary.has_position ? (
                  <p className="muted-note">该项目暂无投资持仓记录(cap_investment_positions),投资汇总为空。</p>
                ) : (
                  <>
                    <fieldset className="form-section"><legend>业绩指标</legend>
                      <div className="metric-grid">
                        <div><span>DPI</span><CountUp value={num(summary.performance.DPI)} /></div>
                        <div><span>MOIC</span><CountUp value={num(summary.performance.MOIC)} /></div>
                        <div><span>IRR</span><CountUp value={summary.performance.IRR == null ? '—' : pct(summary.performance.IRR)} /></div>
                      </div>
                    </fieldset>
                    <fieldset className="form-section"><legend>投资信息</legend>
                      <div className="metric-grid">
                        <div><span>累计协议签署金额</span><CountUp value={wan(summary.investment.agreement_total)} /></div>
                        <div><span>累计打款金额</span><CountUp value={wan(summary.investment.paid_total)} /></div>
                        <div><span>首次打款时间</span><strong>{summary.investment.first_payment_on ?? '—'}</strong></div>
                        <div><span>最新持股比例</span><CountUp value={pct(summary.investment.ownership_ratio)} /></div>
                        <div><span>项目最新投后估值</span><CountUp value={wan(summary.investment.latest_valuation)} /></div>
                        <div><span>投资轮次</span><strong>{summary.investment.round_label ?? '—'}</strong></div>
                        <div><span>投资状态</span><strong>{summary.investment.investment_status ?? '—'}</strong></div>
                      </div>
                    </fieldset>
                    <fieldset className="form-section"><legend>回款信息</legend>
                      <div className="metric-grid">
                        <div><span>累计退出收益</span><CountUp value={wan(summary.realized.realized_total)} /></div>
                        <div><span>退出状态</span><strong>{summary.realized.exit_status ?? '—'}</strong></div>
                      </div>
                    </fieldset>
                  </>
                )}
              </div>
            )}

            {TAB_DATA[subtab] && (
              <div data-testid="subtab-data">
                {tabLoading ? (
                  <p className="muted-note">加载中…</p>
                ) : tabRows.length === 0 ? (
                  <p className="muted-note">该项目暂无{subtab}记录。</p>
                ) : (
                  <DataTable rows={tabRows} compact />
                )}
              </div>
            )}

            {subtab === 'AI 备忘录' && (
              <ProjectMemoPanel projectId={selectedId} canWrite={canWrite} onToast={onToast} />
            )}

            {/* 底部操作:下载 WORD/PDF / 历史 */}
            <div className="button-row card-footer">
              <button type="button" className="secondary-button" data-testid="detail-export-docx" disabled={selectedId == null}
                onClick={() => selectedId != null && apiDownload(`${listPath}/${selectedId}/export.docx`, `${entityName}-项目卡片.docx`).catch((e) => onToast({ title: '下载失败', detail: e instanceof Error ? e.message : 'API 调用失败' }))}>
                <FileText size={16} /> 下载 WORD
              </button>
              <button type="button" className="secondary-button" data-testid="detail-export-pdf" disabled={selectedId == null}
                onClick={() => selectedId != null && apiDownload(`${listPath}/${selectedId}/export.pdf`, `${entityName}-项目卡片.pdf`).catch((e) => onToast({ title: '下载失败', detail: e instanceof Error ? e.message : 'API 调用失败' }))}>
                <FileText size={16} /> 下载 PDF
              </button>
              <button type="button" className="secondary-button" data-testid="detail-history" onClick={() => setShowHistory((v) => !v)}>
                <Clock size={16} /> {showHistory ? '收起历史' : '历史'}
              </button>
            </div>
            {showHistory && (
              <div className="history-list" data-testid="history-list">
                {history.length === 0 ? <p className="muted-note">暂无历史记录</p> : history.map((h, i) => (
                  <div className="history-row" key={i}>
                    <span className="history-action">{String(h.action_code ?? '')}</span>
                    <span className="history-meta">{String(h.actor ?? '系统')} · {h.occurred_at ? String(h.occurred_at).replace('T', ' ').slice(0, 19) : ''}</span>
                    {h.entity_label ? <span className="history-label">{String(h.entity_label)}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <ProjectCommentPanel projectId={selectedId} canWrite={canWrite} onToast={onToast} />
          </>
          ) : section === '协议条款(AI)' ? (
            <ProjectClausesSection projectId={selectedId} canWrite={canWrite} onToast={onToast} />
          ) : section === '权益变动' && selectedId != null ? (
            <section className="panel full-span motion-item" data-testid="section-equity">
              <PanelTitle icon={FileText} title="权益变动" />
              <EquityChangeTable projectId={selectedId} canWrite={canWrite} onToast={onToast} />
            </section>
          ) : SECTION_DATA[section] ? (
            <section className="panel full-span motion-item" data-testid="section-data">
              <PanelTitle icon={FileText} title={section} />
              {sectionLoading ? (
                <p className="muted-note">加载中…</p>
              ) : sectionRows.length === 0 ? (
                <p className="muted-note">该项目暂无{section}记录。</p>
              ) : (
                <DataTable rows={sectionRows} compact />
              )}
            </section>
          ) : (
            <section className="panel full-span motion-item" data-testid="section-placeholder">
              <PanelTitle icon={FileText} title={section} />
              <p className="muted-note">「{section}」结构已就位,数据接入在下一批。</p>
            </section>
          )}
        </>
      ) : (
        <>
          {/* 基金顶部 section 导航(与项目同构) */}
          <section className="panel full-span motion-item section-tabbar">
            <div className="subtab-bar" data-testid="fund-sections">
              {FUND_SECTIONS.map((s) => (
                <button key={s} type="button" className={classNames('subtab', section === s && 'is-active')} onClick={() => setSection(s)}>{s}</button>
              ))}
            </div>
          </section>

          {section === '概况' ? (
            <>
              {/* 基金生命周期流向条 */}
              <section className="panel full-span motion-item">
                <PanelTitle icon={GitBranch} title="基金所处阶段" />
                <div className="stage-flow" data-testid="fund-stage-bar">
                  {FUND_STAGES.flatMap((s, i) => {
                    const node = (
                      <div key={`fn-${i}`} className={classNames('stage-node', i < fundStage && 'is-done', i === fundStage && 'is-current')}>
                        <span className="stage-node-dot">{i < fundStage ? '✓' : i + 1}</span>
                        <span className="stage-node-name">{s}</span>
                      </div>
                    )
                    return i === 0 ? [node] : [
                      <span key={`fa-${i}`} className={classNames('stage-arrow', i <= fundStage && 'is-filled')} aria-hidden="true" />,
                      node,
                    ]
                  })}
                </div>
              </section>

              {/* 基金卡片头部 */}
              <section className="panel full-span motion-item">
                <PanelTitle icon={FileText} title="基金卡片" />
                <div className="project-card-grid" data-testid="fund-card">
                  <div><span>基金简称</span><strong>{form.fund_name || '—'}</strong></div>
                  <div><span>基金全称</span><strong>{form.legal_name || '—'}</strong></div>
                  <div><span>状态</span><strong><StatusBadge value={FUND_STATUS_CN[fundStatus] ?? fundStatus ?? '—'} /></strong></div>
                  <div><span>目标规模</span><strong>{wan(_n(form.target_size))}</strong></div>
                  <div><span>认缴规模</span><strong>{wan(_n(form.committed_size))}</strong></div>
                  <div><span>实缴总额</span><strong>{wan(_n(form.paid_in_size))}</strong></div>
                  <div><span>净资产</span><strong>{wan(_n(form.net_asset_value))}</strong></div>
                </div>
              </section>

              {/* 基本情况(可编辑) */}
              <section className="panel full-span motion-item">
                <div data-testid="fund-basic">
                  {FUND_BASIC_GROUPS.map(([group, keys]) => (
                    <fieldset className="form-section" key={group}>
                      <legend>{group}</legend>
                      <div className="form-grid detail-edit-grid">
                        {keys.map((k) => {
                          const f = fieldByKey[k]
                          if (!f) return null
                          return (
                            <label key={k}>
                              <span>{f.label}</span>
                              <input type={f.kind === 'number' ? 'number' : 'text'} value={form[k] ?? ''} readOnly={!canWrite} data-field={k}
                                onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))} />
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  ))}
                  <div className="button-row" style={{ marginTop: 14 }}>
                    <button type="button" className="primary-button" disabled={!canWrite || saving || selectedId == null} data-testid="detail-save" onClick={save}>
                      <CheckCircle size={16} /> {saving ? '保存中…' : '修改'}
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : sectionMap[section] ? (
            <section className="panel full-span motion-item" data-testid="section-data">
              <PanelTitle icon={FileText} title={section} />
              {sectionLoading ? (
                <p className="muted-note">加载中…</p>
              ) : sectionRows.length === 0 ? (
                <p className="muted-note">该基金暂无{section}记录。</p>
              ) : (
                <DataTable rows={sectionRows} compact />
              )}
            </section>
          ) : (
            <section className="panel full-span motion-item" data-testid="section-placeholder">
              <PanelTitle icon={FileText} title={section} />
              <p className="muted-note">「{section}」结构已就位。</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// 投资人详情:同构页(选择器 + 卡片 + section:出资承诺/联系人/触点记录,全真数据)。
function InvestorDetailPage({ canWrite, onToast }: { canWrite: boolean; onToast: (t: Toast) => void }) {
  void canWrite; void onToast
  const [entities, setEntities] = useState<Array<Record<string, unknown>>>([])
  const [selectedId, setSelectedId] = useState<number | null>(() => readRouteId())
  const [detail, setDetail] = useState<Record<string, unknown>>({})
  const [section, setSection] = useState<string>('概况')
  const [rows, setRows] = useState<DataRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/investors')
      .then((r) => { setEntities(r.items ?? []); setSelectedId((prev) => prev ?? (r.items?.[0]?.id as number | undefined) ?? null) })
      .catch(() => setEntities([]))
  }, [])
  useEffect(() => {
    if (selectedId == null) return
    let ignore = false
    apiGet<Record<string, unknown>>(`/api/investors/${selectedId}`).then((d) => { if (!ignore) setDetail(d) }).catch(() => undefined)
    return () => { ignore = true }
  }, [selectedId])
  useEffect(() => {
    if (selectedId == null) return
    const spec = INVESTOR_SECTION_DATA[section]
    if (!spec) { setRows([]); return }
    let ignore = false
    setLoading(true); setRows([])
    apiGet<{ items: Array<Record<string, unknown>> }>(`/api/investors/${selectedId}/${spec.path}`)
      .then((r) => { if (!ignore) setRows((r.items ?? []).map(spec.map)) })
      .catch(() => { if (!ignore) setRows([]) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [section, selectedId])

  const name = String(detail.investor_name ?? (entities.find((e) => e.id === selectedId)?.name) ?? '—')
  return (
    <div className="page-grid">
      <section className="panel detail-hero full-span motion-item">
        <div>
          <span className="page-kicker">投资人</span>
          <h2>{name}</h2>
          <p>真实主档:选择投资人后加载出资承诺、联系人、触点记录(租户内)。</p>
        </div>
        <div className="detail-actions">
          <label className="detail-picker">
            <span>选择投资人</span>
            <select value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))} data-testid="investor-picker">
              {entities.map((e) => <option key={String(e.id)} value={String(e.id)}>{String(e.name)}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="panel full-span motion-item section-tabbar">
        <div className="subtab-bar" data-testid="investor-sections">
          {INVESTOR_SECTIONS.map((s) => (
            <button key={s} type="button" className={classNames('subtab', section === s && 'is-active')} onClick={() => setSection(s)}>{s}</button>
          ))}
        </div>
      </section>

      {section === '概况' ? (
        <section className="panel full-span motion-item">
          <PanelTitle icon={User} title="投资人卡片" />
          <div className="project-card-grid" data-testid="investor-card">
            <div><span>名称</span><strong>{name}</strong></div>
            <div><span>类型</span><strong>{INVESTOR_KIND_CN[String(detail.investor_kind)] ?? String(detail.investor_kind ?? '—')}</strong></div>
            <div><span>合格状态</span><strong><StatusBadge value={QUAL_CN[String(detail.qualification_status)] ?? String(detail.qualification_status ?? '—')} /></strong></div>
            <div><span>风险等级</span><strong>{RISK_RATING_CN[String(detail.risk_rating)] ?? String(detail.risk_rating ?? '—')}</strong></div>
            <div><span>城市</span><strong>{String(detail.city ?? '—')}</strong></div>
            <div><span>披露状态</span><strong>{DISCLOSURE_CN[String(detail.disclosure_status)] ?? String(detail.disclosure_status ?? '—')}</strong></div>
            <div><span>负责人</span><strong>{String(detail.owner ?? '—')}</strong></div>
            <div><span>编号</span><strong>{String(detail.investor_code ?? '—')}</strong></div>
          </div>
          {detail.notes ? <p className="muted-note" style={{ marginTop: 12 }}>备注:{String(detail.notes)}</p> : null}
        </section>
      ) : (
        <section className="panel full-span motion-item" data-testid="investor-section-data">
          <PanelTitle icon={FileText} title={section} />
          {loading ? <p className="muted-note">加载中…</p> : rows.length === 0 ? <p className="muted-note">该投资人暂无{section}记录。</p> : <DataTable rows={rows} compact />}
        </section>
      )}
    </div>
  )
}

// 非 project/fund 的 detail 屏(其它静态上下文,如管理机构)保留原面板。
function StaticDetailPage({
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
          <h2>{screen.id.includes('investor') ? '华东产业母基金' : screen.title}</h2>
          <p>主档、关联流程、文档、审计、权限和 AI 摘要全部使用同一对象上下文。</p>
        </div>
        <div className="detail-actions">
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

const FAMILY_LABEL: Record<string, string> = { project: '项目', fund: '基金', office: '办公', all: '全部' }

// 审批委托:把某类工作流的审批权在一段时间内委托给同租户另一人(真写 cap_workflow_delegations)。
function DelegationPanel({ canWrite, onToast, defaultFamily }: { canWrite: boolean; onToast: (t: Toast) => void; defaultFamily: string }) {
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([])
  const [dels, setDels] = useState<Array<Record<string, unknown>>>([])
  const [form, setForm] = useState({ delegatee: '', family: defaultFamily, starts: '', ends: '', reason: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => { apiGet<{ items: Array<{ id: number; name: string }> }>('/api/users/simple').then((r) => setUsers(r.items || [])).catch(() => undefined) }, [])
  useEffect(() => { apiGet<{ items: Array<Record<string, unknown>> }>('/api/delegations').then((r) => setDels(r.items || [])).catch(() => undefined) }, [reloadKey])

  const save = async () => {
    if (!form.delegatee) { onToast({ title: '请选择受托人', detail: '委托必须指定受托人' }); return }
    setBusy(true)
    try {
      await apiPost('/api/delegations', {
        delegatee_user_id: Number(form.delegatee),
        workflow_family: form.family,
        starts_at: form.starts || undefined,
        ends_at: form.ends || undefined,
        reason: form.reason || undefined,
      })
      onToast({ title: '委托已设置', detail: '审批权已按期委托', action: 'workflow.delegation.create', entity: 'cap_workflow_delegations' })
      setForm((f) => ({ ...f, delegatee: '', reason: '' }))
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '设置失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally { setBusy(false) }
  }
  const revoke = async (id: number) => {
    try { await apiPost(`/api/delegations/${id}/revoke`); onToast({ title: '委托已撤销', detail: '该委托已停用' }); setReloadKey((k) => k + 1) }
    catch (error) { onToast({ title: '撤销失败', detail: error instanceof Error ? error.message : 'API 调用失败' }) }
  }

  return (
    <section className="panel motion-item">
      <PanelTitle icon={User} title="审批委托" />
      <div className="delegate-card">
        <label><span>委托给</span>
          <select value={form.delegatee} onChange={(e) => setForm((f) => ({ ...f, delegatee: e.target.value }))} disabled={!canWrite}>
            <option value="">选择受托人…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label><span>工作流类型</span>
          <select value={form.family} onChange={(e) => setForm((f) => ({ ...f, family: e.target.value }))} disabled={!canWrite}>
            {Object.entries(FAMILY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label><span>开始</span><input type="date" value={form.starts} onChange={(e) => setForm((f) => ({ ...f, starts: e.target.value }))} disabled={!canWrite} /></label>
        <label><span>结束</span><input type="date" value={form.ends} onChange={(e) => setForm((f) => ({ ...f, ends: e.target.value }))} disabled={!canWrite} /></label>
        <label><span>事由</span><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} disabled={!canWrite} placeholder="如:出差期间代批" /></label>
        <button className="primary-button full-width" type="button" disabled={!canWrite || busy} onClick={save} data-testid="delegate-save">{busy ? '提交中…' : '设置委托'}</button>
      </div>
      {dels.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 12 }} data-testid="delegation-list">
          <table>
            <thead><tr><th>委托人</th><th>受托人</th><th>类型</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {dels.map((d, i) => (
                <tr key={i}>
                  <td>{String(d.delegator ?? '')}</td>
                  <td>{String(d.delegatee ?? '')}</td>
                  <td>{FAMILY_LABEL[String(d.workflow_family)] || String(d.workflow_family)}</td>
                  <td>{Number(d.is_active) ? '生效中' : '已撤销'}</td>
                  <td>{Number(d.is_active) ? <button className="link-button" type="button" onClick={() => revoke(Number(d.id))}>撤销</button> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

type WfTemplate = { id: number; workflow_family: string; template_name: string; steps: Array<{ step_key: string; step_name: string; step_type: string; sort_order: number }> }
type WfTask = { id: number; task_name: string; task_status: string; due_at: string | null; instance_title: string; instance_status: string; assignee: string | null }
const WF_STATUS_CN: Record<string, string> = { running: '进行中', approved: '已通过', rejected: '已驳回', pending: '待办', transferred: '已转办', archived: '已归档', cancelled: '已取消', draft: '草稿' }

function FlowPage({
  screen,
  canWrite,
  onToast,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
}) {
  // flow-center 展示全部家族;子屏只展示对应家族。
  const familyFilter = screen.id === 'flow-fund' ? 'fund' : screen.id === 'flow-oa' ? 'office' : screen.id === 'flow-project' ? 'project' : null
  const [templates, setTemplates] = useState<WfTemplate[]>([])
  const [tasks, setTasks] = useState<WfTask[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [busyTask, setBusyTask] = useState<number | null>(null)

  useEffect(() => { apiGet<{ items: WfTemplate[] }>('/api/workflow/templates').then((r) => setTemplates(r.items ?? [])).catch(() => setTemplates([])) }, [])
  useEffect(() => { apiGet<{ items: WfTask[] }>('/api/workflow/tasks').then((r) => setTasks(r.items ?? [])).catch(() => setTasks([])) }, [reloadKey])

  const shownTemplates = familyFilter ? templates.filter((t) => t.workflow_family === familyFilter) : templates
  const shownTasks = tasks // 后端已按租户过滤;此处展示全部,含流转历史

  const startFlow = async (t: WfTemplate) => {
    try {
      const result = await apiPost('/api/workflow/instances', {
        title: `${t.template_name}·${new Date().toLocaleDateString('zh-CN')}`,
        workflow_family: t.workflow_family,
        payload: { template_id: t.id, screen: screen.id },
      })
      onToast({ title: `${t.template_name}已发起`, detail: auditDetail(result), action: 'workflow.start', entity: 'cap_workflow_instances', result })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '流程发起失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    }
  }

  const actOn = async (task: WfTask, action: 'approve' | 'reject' | 'transfer') => {
    const verb = action === 'approve' ? '通过' : action === 'reject' ? '驳回' : '转办'
    const comment = window.prompt(`「${task.task_name}」${verb}意见(可留空):`, '')
    if (comment === null) return // 取消
    setBusyTask(task.id)
    try {
      const result = await apiPost<{ instance_status?: string; next_step?: string | null }>(`/api/workflow/tasks/${task.id}/action`, { action, comment: comment || undefined })
      const tail = action === 'approve'
        ? (result.next_step ? `→ 下一步「${result.next_step}」` : '流程已闭环(通过)')
        : action === 'reject' ? '流程已终止(驳回)' : '已转办'
      onToast({ title: `${verb}成功`, detail: `${auditDetail(result)};${tail}`, action: `workflow.${action}`, entity: 'cap_workflow_tasks', result })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: `${verb}失败`, detail: error instanceof Error ? error.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'API 调用失败' })
    } finally {
      setBusyTask(null)
    }
  }

  return (
    <div className="page-grid">
      <section className="panel full-span motion-item">
        <PanelTitle icon={GitBranch} title="流程模板与发起入口" />
        <div className="flow-lanes">
          {shownTemplates.length === 0 && <p className="muted-note">暂无流程模板</p>}
          {shownTemplates.map((t) => (
            <article className="flow-card" key={t.id} data-testid={`flow-template-${t.workflow_family}`}>
              <span>{{ project: '项目类', fund: '基金类', office: '日常办公' }[t.workflow_family] ?? t.workflow_family}</span>
              <strong>{t.template_name}</strong>
              {/* 真实步骤链,替代写死的「N 个模板」 */}
              <ol className="flow-steps">
                {t.steps.map((s) => (<li key={s.step_key}>{s.step_name}</li>))}
              </ol>
              <button className="secondary-button" type="button" disabled={!canWrite} data-testid={`flow-start-${t.workflow_family}`} onClick={() => startFlow(t)}>
                发起
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Clock} title="审批任务" />
        <div className="table-wrap" data-testid="wf-task-table">
          <table>
            <thead>
              <tr><th>流程</th><th>当前任务</th><th>任务状态</th><th>实例状态</th><th>经办</th><th>操作</th></tr>
            </thead>
            <tbody>
              {shownTasks.length === 0 && <tr><td colSpan={6} className="muted-note">暂无审批任务,先从上方模板发起</td></tr>}
              {shownTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.instance_title}</td>
                  <td>{task.task_name}</td>
                  <td><StatusBadge value={WF_STATUS_CN[task.task_status] ?? task.task_status} /></td>
                  <td><StatusBadge value={WF_STATUS_CN[task.instance_status] ?? task.instance_status} /></td>
                  <td>{task.assignee ?? '—'}</td>
                  <td>
                    {task.task_status === 'pending' ? (
                      <div className="row-actions">
                        <button type="button" className="link-button" disabled={!canWrite || busyTask === task.id} onClick={() => actOn(task, 'approve')}>通过</button>
                        <button type="button" className="link-button danger" disabled={!canWrite || busyTask === task.id} onClick={() => actOn(task, 'reject')}>驳回</button>
                        <button type="button" className="link-button" disabled={!canWrite || busyTask === task.id} onClick={() => actOn(task, 'transfer')}>转办</button>
                      </div>
                    ) : <span className="muted-note">已处理</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <DelegationPanel
        canWrite={canWrite}
        onToast={onToast}
        defaultFamily={screen.id === 'flow-project' ? 'project' : screen.id === 'flow-fund' ? 'fund' : screen.id === 'flow-oa' ? 'office' : 'all'}
      />
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
  const kind = screen.id === 'process-files' ? 'workflow' : 'shared'
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/documents')
      .then((r) => { if (active) setDocs(r.items ?? []) })
      .catch(() => { if (active) setDocs([]) })
    return () => { active = false }
  }, [reloadKey])

  const uploadViaForm = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/files/upload`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      const up = await res.json() as { storage_uri: string; file_name: string; mime_type: string; size: number }
      // 2) 用真 storage_uri 建文档记录
      const result = await apiPost('/api/documents', {
        title: up.file_name,
        document_kind: kind,
        file_name: up.file_name,
        storage_uri: up.storage_uri,
        file_size_bytes: up.size,
      })
      onToast({ title: '已上传', detail: auditDetail(result), action: 'document.upload', entity: 'cap_documents', result })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '上传失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setUploading(false)
    }
  }

  const download = async (doc: Record<string, unknown>) => {
    const uri = String(doc.storage_uri ?? '')
    if (uri.startsWith('file://')) {
      try {
        await apiDownload(`/api/files/download?uri=${encodeURIComponent(uri)}`, String(doc.file_name ?? 'file'))
        // 记一次下载审计
        void apiPost(`/api/documents/${doc.id}/download`).catch(() => undefined)
      } catch (error) {
        onToast({ title: '下载失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
      }
    } else {
      onToast({ title: '该文档为占位/外链', detail: '仅新上传的真实文件可下载(file://)' })
    }
  }

  return (
    <section className="panel doc-main motion-item">
      <PanelTitle icon={FileText} title={screen.id === 'process-files' ? '流程归档文件' : '文档中心'} />
      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadViaForm(f); e.target.value = '' }}
      />
      <div className="button-row" style={{ marginBottom: 12 }}>
        <button className="primary-button" type="button" disabled={!canWrite || uploading} onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {uploading ? '上传中…' : '上传文件'}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>标题</th><th>文件名</th><th>类型</th><th>版本</th><th>操作</th></tr></thead>
          <tbody>
            {docs.map((d, i) => {
              const real = String(d.storage_uri ?? '').startsWith('file://')
              return (
                <tr key={i}>
                  <td>{String(d.title ?? '')}</td>
                  <td>{String(d.file_name ?? '')}</td>
                  <td>{String(d.document_kind ?? '')}</td>
                  <td>v{String(d.current_version_no ?? 1)}</td>
                  <td>
                    <button className="link-button" type="button" onClick={() => download(d)} disabled={!real} title={real ? '下载真实文件' : '占位/外链文档不可下载'}>
                      <Download size={14} /> 下载
                    </button>
                  </td>
                </tr>
              )
            })}
            {docs.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)', padding: 16 }}>暂无文档,点「上传文件」添加。</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
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
  const isIncident = screen.id === 'burst-risk'
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isIncident) return
    let active = true
    apiGet<{ items: Array<Record<string, unknown>> }>('/api/risks').then((r) => { if (active) setIncidents(r.items ?? []) }).catch(() => undefined)
    return () => { active = false }
  }, [isIncident, reloadKey])

  const addUpdate = async (id: number, title: string) => {
    const text = window.prompt(`为「${title}」登记处置进展:`)
    if (!text || !text.trim()) return
    try {
      const result = await apiPost(`/api/risks/${id}/updates`, { update_text: text.trim(), update_status: 'progress' })
      onToast({ title: '进展已登记', detail: auditDetail(result), action: 'risk.update', entity: 'cap_risk_incidents', result })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '登记失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    }
  }

  return (
    <div className="page-grid">
      <section className="panel full-span motion-item">
        <PanelTitle icon={AlertTriangle} title={screen.title} />
        {isIncident ? (
          <div className="table-wrap" data-testid="risk-table">
            <table>
              <thead><tr><th>风险事项</th><th>严重度</th><th>状态</th><th>最新进展</th><th>关联项目</th><th>操作</th></tr></thead>
              <tbody>
                {incidents.map((r, i) => (
                  <tr key={i}>
                    <td>{String(r.title ?? '')}</td>
                    <td><StatusBadge value={String(r.severity ?? '')} /></td>
                    <td><StatusBadge value={String(r.status ?? '')} /></td>
                    <td>{String(r.latest_progress ?? '—')}</td>
                    <td>{String(r.project ?? '—')}</td>
                    <td>
                      <button className="link-button" type="button" disabled={!canWrite} onClick={() => addUpdate(Number(r.id), String(r.title ?? r.id))}>
                        <Plus size={14} /> 登记进展
                      </button>
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--muted)', padding: 16 }}>暂无风险事件</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="risk-summary">
              {['待触发条款', '跟踪中', '已关闭'].map((item) => (<span key={item}>{item}</span>))}
            </div>
            <DataTable rows={clauseRows} />
          </>
        )}
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
  const [reloadKey, setReloadKey] = useState(0)
  const { rows, source } = useBackendRows(screen.id, fallbackRows, 1, reloadKey)
  const [orgs, setOrgs] = useState<Array<{ id: number; name: string }>>([])
  const [activeOrg, setActiveOrg] = useState<{ id: number; name: string } | null>(null)
  const [roles, setRoles] = useState<Array<Record<string, unknown>>>([])
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]) // 真实审计(cap_audit_logs)
  const [creating, setCreating] = useState(false)
  const [showPerms, setShowPerms] = useState(false)
  const [uForm, setUForm] = useState({ login_name: '', display_name: '', email: '', org_id: 0, role_code: '' })
  const [rForm, setRForm] = useState({ role_code: '', role_name: '', description: '' })

  useEffect(() => { apiGet<{ items: Array<Record<string, unknown>> }>('/api/audit/recent').then((r) => setAudit(r.items ?? [])).catch(() => setAudit([])) }, [reloadKey])
  useEffect(() => { apiGet<{ items: Array<{ id: number; name: string }> }>('/api/admin/orgs').then((r) => setOrgs(r.items ?? [])).catch(() => setOrgs([])) }, [])
  useEffect(() => { apiGet<{ items: Array<Record<string, unknown>> }>('/api/admin/roles').then((r) => setRoles(r.items ?? [])).catch(() => setRoles([])) }, [reloadKey])

  const isUsers = screen.id === 'system-users'
  const isRoles = screen.id === 'roles-permissions'
  const canCreate = isUsers || isRoles
  // 组织树真过滤:选了具体部门 → 按台账「部门」列过滤(仅人员屏)。
  const shownRows = isUsers && activeOrg ? rows.filter((r) => String(r.部门 ?? '') === activeOrg.name) : rows

  const createUser = async () => {
    if (!uForm.login_name.trim() || !uForm.display_name.trim() || !uForm.org_id || !uForm.role_code) { onToast({ title: '请填全', detail: '登录名/姓名/部门/角色必填' }); return }
    try {
      const r = await apiPost<{ default_password?: string }>('/api/admin/users', uForm)
      onToast({ title: '用户已创建', detail: r.default_password ? `默认口令 ${r.default_password}(请提醒改)` : '已创建' })
      setCreating(false); setUForm({ login_name: '', display_name: '', email: '', org_id: 0, role_code: '' }); setReloadKey((k) => k + 1)
    } catch (e) { onToast({ title: '创建失败', detail: e instanceof Error ? e.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'API 调用失败' }) }
  }
  const createRole = async () => {
    if (!rForm.role_code.trim() || !rForm.role_name.trim()) { onToast({ title: '请填全', detail: '角色代码/名称必填' }); return }
    try {
      await apiPost('/api/admin/roles', rForm)
      onToast({ title: '角色已创建', detail: '空权限,可再授权' })
      setCreating(false); setRForm({ role_code: '', role_name: '', description: '' }); setReloadKey((k) => k + 1)
    } catch (e) { onToast({ title: '创建失败', detail: e instanceof Error ? e.message.replace(/^\{"detail":"?|"?\}$/g, '') : 'API 调用失败' }) }
  }

  return (
    <div className="page-grid">
      <section className="panel motion-item">
        <PanelTitle icon={Settings} title="组织与策略" />
        <div className="org-tree" data-testid="admin-org-tree">
          <button className={classNames(activeOrg === null && 'is-selected')} type="button" onClick={() => setActiveOrg(null)}>全部</button>
          {orgs.map((o) => (
            <button className={classNames(activeOrg?.id === o.id && 'is-selected')} key={o.id} type="button" onClick={() => setActiveOrg(o)}>
              {o.name}
            </button>
          ))}
        </div>
        {isUsers && activeOrg && <p className="muted-note" style={{ marginTop: 8 }}>已按「{activeOrg.name}」过滤人员</p>}
      </section>
      <section className="panel two-thirds motion-item">
        <PanelTitle icon={Users} title={screen.title} />
        <DataSourceBadge source={source} />
        <DataTable rows={shownRows} />

        {showPerms && (
          <div className="perm-preview" data-testid="admin-perm-preview">
            <strong>角色权限一览(真实)</strong>
            {roles.map((r) => (
              <div className="perm-role" key={String(r.role_code)}>
                <span>{String(r.role_name)}<i>{String(r.role_code)}</i></span>
                <span className="perm-codes">{(r.permissions as string[] | undefined)?.length ? (r.permissions as string[]).join(' · ') : '(无权限)'}</span>
              </div>
            ))}
          </div>
        )}

        {creating && isUsers && (
          <div className="admin-create-form" data-testid="admin-create-user">
            <div className="form-grid">
              <label><span>登录名</span><input value={uForm.login_name} onChange={(e) => setUForm({ ...uForm, login_name: e.target.value })} data-testid="nu-login" /></label>
              <label><span>姓名</span><input value={uForm.display_name} onChange={(e) => setUForm({ ...uForm, display_name: e.target.value })} data-testid="nu-name" /></label>
              <label><span>邮箱(可选)</span><input value={uForm.email} onChange={(e) => setUForm({ ...uForm, email: e.target.value })} /></label>
              <label><span>部门</span><select value={uForm.org_id} onChange={(e) => setUForm({ ...uForm, org_id: Number(e.target.value) })} data-testid="nu-org"><option value={0}>选择部门</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
              <label><span>角色</span><select value={uForm.role_code} onChange={(e) => setUForm({ ...uForm, role_code: e.target.value })} data-testid="nu-role"><option value="">选择角色</option>{roles.map((r) => <option key={String(r.role_code)} value={String(r.role_code)}>{String(r.role_name)}</option>)}</select></label>
            </div>
            <div className="button-row" style={{ marginTop: 10 }}>
              <button className="primary-button" type="button" onClick={createUser} data-testid="nu-submit"><CheckCircle size={15} /> 创建用户</button>
              <button className="secondary-button" type="button" onClick={() => setCreating(false)}>取消</button>
            </div>
            <p className="muted-note">默认口令 demo-login,创建后请提醒本人修改。</p>
          </div>
        )}
        {creating && isRoles && (
          <div className="admin-create-form" data-testid="admin-create-role">
            <div className="form-grid">
              <label><span>角色代码(英文)</span><input value={rForm.role_code} onChange={(e) => setRForm({ ...rForm, role_code: e.target.value })} placeholder="如 auditor_lite" data-testid="nr-code" /></label>
              <label><span>角色名称</span><input value={rForm.role_name} onChange={(e) => setRForm({ ...rForm, role_name: e.target.value })} data-testid="nr-name" /></label>
              <label className="span-2"><span>说明</span><input value={rForm.description} onChange={(e) => setRForm({ ...rForm, description: e.target.value })} /></label>
            </div>
            <div className="button-row" style={{ marginTop: 10 }}>
              <button className="primary-button" type="button" onClick={createRole} data-testid="nr-submit"><CheckCircle size={15} /> 创建角色</button>
              <button className="secondary-button" type="button" onClick={() => setCreating(false)}>取消</button>
            </div>
          </div>
        )}

        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => setShowPerms((v) => !v)} data-testid="admin-preview-perms">
            <Eye size={16} /> {showPerms ? '收起权限' : '预览权限'}
          </button>
          {canCreate ? (
            <button className="primary-button" type="button" disabled={!canWrite} data-testid="admin-primary" onClick={() => setCreating((v) => !v)}>
              <Plus size={16} /> {screen.primaryAction}
            </button>
          ) : (
            <button className="secondary-button" type="button" disabled title="自定义字段管理规划中" onClick={() => onToast({ title: '规划中', detail: '自定义字段管理即将上线' })}>
              <Plus size={16} /> {screen.primaryAction}
            </button>
          )}
        </div>
      </section>
      <section className="panel full-span motion-item">
        <PanelTitle icon={Clock} title="审计日志(实时)" />
        {audit.length === 0 ? (
          <p className="muted-note">暂无审计记录。</p>
        ) : (
          <DataTable
            rows={audit.map((a) => ({
              操作人: String(a.actor ?? '系统'),
              操作: String(a.action_code ?? ''),
              对象: String(a.entity_label ?? a.entity_type ?? ''),
              风险: a.risk_level === 'high' ? '高' : a.risk_level === 'medium' ? '中' : '低',
              时间: a.occurred_at ? String(a.occurred_at).replace('T', ' ').slice(0, 19) : '',
            }))}
          />
        )}
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
  const [rows, setRows] = useState<DataRow[]>([])
  const [source, setSource] = useState<'loading' | 'mysql' | 'mock'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setSource('loading')
    apiGet<LedgerResponse>('/api/ledger/recycle-bin?page=1&page_size=50')
      .then((r) => { if (active) { setRows(normalizeRows(r.items)); setSource(r.source === 'mysql' ? 'mysql' : 'mock') } })
      .catch(() => { if (active) { setRows([]); setSource('mock') } })
    return () => { active = false }
  }, [reloadKey])

  const restore = async (id: number) => {
    setBusyId(id)
    try {
      const result = await apiPost(`/api/recycle/${id}/restore`)
      onToast({ title: '已恢复', detail: auditDetail(result), action: 'recycle.restore', entity: 'cap_recycle_items', result })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '恢复失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setBusyId(null)
    }
  }

  const purge = async (id: number, label: string) => {
    if (!window.confirm(`彻底删除「${label}」?此操作不可恢复。`)) return
    setBusyId(id)
    try {
      const result = await apiPost(`/api/recycle/${id}/purge`)
      onToast({ title: '已彻底删除', detail: auditDetail(result), action: 'recycle.purge', entity: 'cap_recycle_items', result })
      setReloadKey((k) => k + 1)
    } catch (error) {
      onToast({ title: '彻底删除失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    } finally {
      setBusyId(null)
    }
  }

  const cols = rows[0] ? Object.keys(rows[0]).filter((c) => !c.startsWith('__')) : []

  return (
    <section className="panel motion-item">
      <PanelTitle icon={Trash} title="回收站对象" />
      <DataSourceBadge source={source} />
      <div className="table-wrap" data-testid="recycle-table">
        <table>
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}<th>操作</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const id = Number(r['__id'])
              const recoverable = String(r['状态']) === 'recoverable'
              return (
                <tr key={i}>
                  {cols.map((c) => <td key={c}>{String(r[c] ?? '')}</td>)}
                  <td style={{ display: 'flex', gap: 8 }}>
                    {recoverable ? (
                      <>
                        <button className="secondary-button" type="button" disabled={!canWrite || busyId === id} onClick={() => restore(id)}>
                          <CheckCircle size={14} /> {busyId === id ? '处理中…' : '恢复'}
                        </button>
                        <button className="danger-button" type="button" disabled={!canWrite || busyId === id} onClick={() => purge(id, String(r['对象'] ?? id))}>
                          <Trash size={14} /> 彻底删除
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && source !== 'loading' && (
              <tr><td colSpan={cols.length + 1} style={{ color: 'var(--muted)', padding: 16 }}>回收站为空</td></tr>
            )}
          </tbody>
        </table>
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
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [q, setQ] = useState('')
  useEffect(() => { setPage(1); setQ('') }, [screen.id]) // 换屏回到第一页 + 清搜索
  const { rows, source, total, pageSize } = useBackendRows(screen.id, fallbackRows, page, reloadKey, q)
  const totalPages = total != null ? Math.max(1, Math.ceil(total / pageSize)) : null

  // 支持批量删除的列表(有软删除端点的实体)
  const DELETE_BASE: Record<string, string> = { 'project-list': '/api/projects', 'fund-list': '/api/funds' }
  const deleteBase = canWrite ? DELETE_BASE[screen.id] : undefined
  const batchDelete = async (ids: number[]) => {
    if (!deleteBase || ids.length === 0) return
    if (!window.confirm(`确认删除选中的 ${ids.length} 条?可在「回收站」恢复。`)) return
    const results = await Promise.allSettled(ids.map((id) => apiDelete(`${deleteBase}/${id}`)))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    onToast({ title: `批量删除:成功 ${ok}${fail ? `,失败 ${fail}` : ''}`, detail: '已移入回收站', action: 'batch.delete', entity: deleteBase })
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="page-grid">
      <section className="panel full-span motion-item">
        <PanelTitle icon={ListIcon(screen.id)} title={`${screen.title}台账`} />
        <DataSourceBadge source={source} />
        <ListControls canWrite={canWrite} onToast={onToast} screen={screen} onImported={() => { setPage(1); setReloadKey((k) => k + 1) }} onSearch={(kw) => { setPage(1); setQ(kw) }} />
        <DataTable
          rows={rows}
          storageKey={screen.id}
          onRowOpen={LIST_DETAIL_TARGET[screen.id] ? (id) => goToEntity(LIST_DETAIL_TARGET[screen.id], id) : undefined}
          onBatchDelete={deleteBase ? batchDelete : undefined}
        />
        {totalPages != null && (
          <div className="pager" data-testid="pager">
            <span className="pager-info">共 {total} 条 · 第 {page}/{totalPages} 页</span>
            <div className="pager-btns">
              <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</button>
              <button type="button" className="secondary-button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
            </div>
          </div>
        )}
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
  onImported,
  onSearch,
}: {
  screen: Screen
  canWrite: boolean
  onToast: (toast: Toast) => void
  onImported?: () => void
  onSearch?: (q: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [kw, setKw] = useState('')
  const canImport = screen.id === 'project-list' || screen.id === 'project-board' // 导入目前落到项目表
  // 新增按钮跳转到对应的独立新建页(反馈 issue #11)。
  const addTarget = ({ 'project-list': 'project-add', 'project-board': 'project-add', 'fund-list': 'fund-add' } as Record<string, string>)[screen.id]

  const doImport = async (file: File) => {
    try {
      const text = await file.text()
      const result = await apiPost<{ created: number; errors: unknown[] }>('/api/import/projects', { csv_text: text })
      const errCount = Array.isArray(result.errors) ? result.errors.length : 0
      onToast({
        title: `导入完成:新增 ${result.created} 条${errCount ? `,${errCount} 行有误` : ''}`,
        detail: auditDetail(result),
        action: 'import.projects',
        entity: 'cap_projects',
        result,
      })
      onImported?.()
    } catch (error) {
      onToast({ title: '导入失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
    }
  }

  return (
    <div className="list-controls">
      <label className="table-search">
        <Search size={15} />
        <input
          placeholder={`搜索${screen.title}(回车全库检索)`}
          aria-label={`搜索${screen.title}`}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch?.(kw.trim()) }}
        />
      </label>
      <button
        className="secondary-button"
        type="button"
        onClick={() => onSearch?.(kw.trim())}
      >
        <Search size={16} />
        搜索
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void doImport(file)
          event.target.value = ''
        }}
      />
      <button
        className="secondary-button"
        type="button"
        disabled={!canWrite || !canImport}
        title={canImport ? '上传 CSV 批量建项目' : '该模块暂不支持 CSV 导入'}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={16} />
        导入 CSV
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={async () => {
          try {
            await apiDownload(`/api/export/${screen.id}`, `${screen.id}.csv`)
            onToast({ title: '已导出 CSV', detail: `${screen.title}台账已下载` })
          } catch (error) {
            onToast({ title: '导出失败', detail: error instanceof Error ? error.message : 'API 调用失败' })
          }
        }}
      >
        <Download size={16} />
        导出 CSV
      </button>
      {addTarget && (
        <button
          className="primary-button"
          type="button"
          disabled={!canWrite}
          onClick={() => goTo(addTarget)}
          data-testid="list-add-entity"
        >
          <Plus size={16} />
          {screen.id === 'fund-list' ? '新增基金' : '新增项目'}
        </button>
      )}
      {/* 「批量操作」原为只发审计不干实事的占位钮 → 移除(台账勾选行后有真实「批量删除」)。 */}
    </div>
  )
}

function DataTable({ rows, compact = false, onRowOpen, onBatchDelete, storageKey }: { rows: DataRow[]; compact?: boolean; onRowOpen?: (id: number) => void; onBatchDelete?: (ids: number[]) => void; storageKey?: string }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const allColumns = Object.keys(rows[0] ?? {}).filter((c) => !c.startsWith('__')) // __ 前缀为隐藏元数据(如 __id)
  // 列配置持久化:按屏(storageKey)记住被隐藏的列,存 localStorage,跨会话生效。
  const colKey = storageKey ? `capitalos-cols-${storageKey}` : null
  const [hidden, setHidden] = useState<Set<string>>(() => {
    if (!colKey) return new Set()
    try { return new Set(JSON.parse(localStorage.getItem(colKey) || '[]') as string[]) } catch { return new Set() }
  })
  const [colMenu, setColMenu] = useState(false)
  const toggleColumn = (col: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else if (allColumns.length - next.size > 1) next.add(col) // 至少保留一列
      if (colKey) localStorage.setItem(colKey, JSON.stringify([...next]))
      return next
    })
  }
  const columns = allColumns.filter((c) => !hidden.has(c))
  const filtered = rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()))
  const allSelected = filtered.length > 0 && filtered.every((_, index) => selected.has(index))
  const canOpen = !!onRowOpen && rows.some((r) => r['__id'] != null && r['__id'] !== '')
  const canBatch = !!onBatchDelete && rows.some((r) => r['__id'] != null && r['__id'] !== '')
  const selectedIds = [...selected].map((i) => filtered[i]?.['__id']).filter((v) => v != null && v !== '').map(Number)

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
          {canBatch && selectedIds.length > 0 && (
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                onBatchDelete?.(selectedIds)
                setSelected(new Set())
              }}
            >
              <Trash size={14} /> 批量删除 ({selectedIds.length})
            </button>
          )}
          {colKey && allColumns.length > 1 && (
            <div className="col-config">
              <button type="button" className="secondary-button" data-testid="col-config-btn" onClick={() => setColMenu((v) => !v)}>
                <Columns size={14} /> 显示列 ({columns.length}/{allColumns.length})
              </button>
              {colMenu && (
                <div className="col-config-menu" data-testid="col-config-menu">
                  {allColumns.map((col) => (
                    <label key={col}>
                      <input type="checkbox" checked={!hidden.has(col)} onChange={() => toggleColumn(col)} />
                      <span>{col}</span>
                    </label>
                  ))}
                  <button type="button" className="link-button" onClick={() => { setHidden(new Set()); if (colKey) localStorage.removeItem(colKey) }}>重置为全部显示</button>
                </div>
              )}
            </div>
          )}
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
            {canOpen && <th>操作</th>}
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
              {canOpen && (
                <td>
                  {row['__id'] != null && row['__id'] !== '' ? (
                    <button type="button" className="link-button" onClick={() => onRowOpen?.(Number(row['__id']))}>
                      打开 <ChevronRight size={14} />
                    </button>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length + (compact ? 0 : 1) + (canOpen ? 1 : 0)}>
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
