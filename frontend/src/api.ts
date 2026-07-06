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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': '1',
      ...(options.headers ?? {}),
    },
  })

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

export function auditDetail(result: ApiResult): string {
  if (typeof result.audit_id === 'number') {
    return `已写入后端和审计日志 #${result.audit_id}`
  }
  return '后端接口已执行'
}
