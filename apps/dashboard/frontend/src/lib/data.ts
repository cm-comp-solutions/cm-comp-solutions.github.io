export const dimensions = ['region', 'channel', 'category'] as const
export type Dimension = (typeof dimensions)[number]
export type Filter = 'year' | 'month' | Dimension
export type Filters = Partial<Record<Filter, string>>

export interface Meta {
  start: string
  end: string
  count: number
  options: Record<Dimension, string[]>
}

export interface OverviewData {
  totals: { orders: number; net_cents: number; margin_cents: number }
  series: { month: string; net_cents: number }[]
  categories: { category: string; net_cents: number }[]
}

export interface Order {
  id: number
  ordered_on: string
  category: string
  product: string
  region: string
  channel: string
  quantity: number
  gross_cents: number
  discount_cents: number
  net_cents: number
  cost_cents: number
}

export interface OrdersData {
  total: number
  rows: Order[]
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const integer = new Intl.NumberFormat('pt-BR')
const short = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const month = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export const money = (cents: number) => currency.format(cents / 100)
export const number = (value: number) => integer.format(value)
export const shortMoney = (cents: number) => 'R$ ' + short.format(cents / 100)
export const calendarDate = (iso: string) => iso.split('-').reverse().join('/')
export const monthLabel = (iso: string) => month.format(new Date(iso + '-01T00:00:00Z')).replace('.', '').replace(' de ', '/')
export const orderCode = (id: number) => 'PED-' + String(id).padStart(6, '0')

export async function request<T>(route: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  if (import.meta.env.PROD) {
    const { queryDatabase } = await import('./staticDatabase')
    return queryDatabase<T>(route, params, signal)
  }
  const response = await fetch('/api/' + route + '?' + params, { signal })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(typeof error?.detail === 'string' ? error.detail : 'Não foi possível consultar a base.')
  }
  return response.json()
}

export function queryParams(filters: Filters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== 'all') params.set(key, value)
  }
  return params
}
