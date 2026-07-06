export type ApiResult = {
  ok?: boolean
  audit_id?: number
  [key: string]: unknown
}

declare global {
  interface Window {
    __CAPITALOS_API_BASE__?: string
  }
}

export const API_BASE =
  window.__CAPITALOS_API_BASE__ ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:7997'

// 身份令牌:登录时存,之后每个请求带 Authorization: Bearer。
// 不再自报 X-User-Id —— 身份完全由后端从已签名 token 派生。
const TOKEN_KEY = 'capitalos-token'
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// 登录用户的真实权限码(RBAC)—— 前端据此隐藏/禁用无权操作,与后端闸门一致。
const PERMS_KEY = 'capitalos-perms'
export function setPerms(perms: string[] | null): void {
  if (perms) localStorage.setItem(PERMS_KEY, JSON.stringify(perms))
  else localStorage.removeItem(PERMS_KEY)
}
export function getPerms(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PERMS_KEY) || '[]')
  } catch {
    return []
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  // token 失效/缺失:清理并回登录页,避免停留在半登录状态。
  if (response.status === 401) {
    setToken(null)
    if (!location.hash.startsWith('#/login')) location.hash = '#/login'
    throw new Error('未认证或登录已过期,请重新登录')
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function apiGet<T = ApiResult>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T = ApiResult>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function apiPatch<T = ApiResult>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function apiDelete<T = ApiResult>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

// SSE 流式 POST:逐帧解析 `data: {...}`,把文本增量回调给 onDelta,实现边吞吐边渲染。
export async function streamPost(
  path: string,
  body: unknown,
  onDelta: (text: string) => void,
): Promise<void> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    setToken(null)
    if (!location.hash.startsWith('#/login')) location.hash = '#/login'
    throw new Error('未认证或登录已过期')
  }
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      let obj: { delta?: string; done?: boolean; error?: string }
      try {
        obj = JSON.parse(dataLine.slice(5).trim())
      } catch {
        continue
      }
      if (obj.error) throw new Error(obj.error)
      if (obj.delta) onDelta(obj.delta)
    }
  }
}

// 真文件下载:带鉴权拉取 → blob → 触发浏览器下载。
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (res.status === 401) {
    setToken(null)
    if (!location.hash.startsWith('#/login')) location.hash = '#/login'
    throw new Error('未认证或登录已过期')
  }
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function auditDetail(result: ApiResult): string {
  if (typeof result.audit_id === 'number') {
    return `已写入后端和审计日志 #${result.audit_id}`
  }
  return '后端接口已执行'
}
