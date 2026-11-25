import { lazy, Suspense, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, CalendarDays, ChevronDown, Database, FileChartColumn, MapPin, Monitor, RotateCcw, ShoppingCart, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Orders from './Orders'
import { dimensions, money, monthLabel, number, queryParams, request, shortMoney, type Dimension, type Filter, type Filters, type Meta, type OverviewData } from '@/lib/data'

const Charts = lazy(() => import('./Charts'))
const Accounting = lazy(() => import('./Accounting'))
const fields = {
  region: { label: 'Região', all: 'Todas as regiões', Icon: MapPin },
  channel: { label: 'Canal', all: 'Todos os canais', Icon: Monitor },
  category: { label: 'Categoria', all: 'Todas as categorias', Icon: Tag },
}

function Sidebar({ orders, accounting, params, count }: { orders: boolean; accounting: boolean; params: string; count?: number }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={import.meta.env.BASE_URL + 'cm-logo.svg'} alt="" width="43" height="43" />
        <div><strong>CM Consultoria</strong><small>Inteligência de negócios</small></div>
      </div>
      <nav aria-label="Navegação principal">
        <a href={import.meta.env.BASE_URL + params} aria-current={!orders && !accounting ? 'page' : undefined}><BarChart3 size={21} aria-hidden="true" />Visão geral</a>
        <a href={import.meta.env.BASE_URL + '?view=pedidos' + (params ? '&' + params.slice(1) : '')} aria-current={orders ? 'page' : undefined}><ShoppingCart size={21} aria-hidden="true" />Pedidos</a>
        <a href={import.meta.env.BASE_URL + '?view=contabilidade'} aria-current={accounting ? 'page' : undefined}><FileChartColumn size={21} aria-hidden="true" />Relatórios contábeis</a>
      </nav>
      <footer className="sidebar-foot">{count ? number(count) + (count === 1 ? ' pedido simulado' : ' pedidos simulados') : 'Dados simulados'}</footer>
    </aside>
  )
}

function FilterBar({ meta, filters, setFilter, clear }: {
  meta: Meta
  filters: Filters
  setFilter: (key: Filter, value: string) => void
  clear: () => void
}) {
  const lastYear = Number(meta.end.slice(0, 4))
  const firstYear = Number(meta.start.slice(0, 4))
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(lastYear - index))
  const partial = meta.end.slice(5, 7) !== '12'
  const selection = (['month', ...dimensions] as const).filter(key => filters[key])

  return (
    <>
      <section className="panel filters" aria-label="Filtros do painel">
        <div className="field">
          <label htmlFor="year">Período</label>
          <div className="control">
            <CalendarDays aria-hidden="true" />
            <select id="year" value={filters.year} onChange={event => setFilter('year', event.target.value)}>
              {years.map((year, index) => (
                <option key={year} value={year}>{index === 0 && partial ? monthLabel(year + '-01') + ' – ' + monthLabel(meta.end.slice(0, 7)) : year}</option>
              ))}
              <option value="all">Todo o histórico</option>
            </select>
            <ChevronDown aria-hidden="true" />
          </div>
        </div>
        {dimensions.map(key => {
          const { label, all, Icon } = fields[key]
          return <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <div className="control">
              <Icon aria-hidden="true" />
              <select id={key} value={filters[key] ?? ''} onChange={event => setFilter(key, event.target.value)}>
                <option value="">{all}</option>
                {meta.options[key].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <ChevronDown aria-hidden="true" />
            </div>
          </div>
        })}
        <div className="clear-wrap"><Button variant="ghost" type="button" onClick={clear}><RotateCcw aria-hidden="true" />Limpar</Button></div>
      </section>
      {selection.length > 0 && <div className="selection" aria-label="Filtros ativos">
        {selection.map(key => {
          const value = filters[key] ?? ''
          const label = key === 'month' ? monthLabel(value) : value
          return <button type="button" key={key} onClick={() => setFilter(key, '')} aria-label={'Remover filtro ' + label}>
            {label}<X size={13} aria-hidden="true" />
          </button>
        })}
      </div>}
    </>
  )
}

function Kpis({ data }: { data: OverviewData }) {
  const { net_cents, margin_cents, orders } = data.totals
  const metrics = [
    { title: 'Receita líquida', value: money(net_cents), compact: shortMoney(net_cents), Icon: BarChart3 },
    { title: 'Margem bruta', value: money(margin_cents), compact: shortMoney(margin_cents), Icon: Database },
    { title: 'Pedidos', value: number(orders), Icon: ShoppingCart },
    { title: 'Ticket médio', value: orders ? money(net_cents / orders) : '—', Icon: Tag },
  ]
  return <section className="kpis" aria-label="Indicadores do período" aria-live="polite">
    {metrics.map(({ title, value, compact, Icon }) => <article className="panel kpi" key={title}>
      <span className="kpi-icon"><Icon size={22} aria-hidden="true" /></span>
      <div className="kpi-data">
        <p className="kpi-name">{title}</p>
        <p className="kpi-value">
          <span className="sr-only">{value}</span>
          <span aria-hidden="true" className={compact ? 'kpi-full' : undefined}>{value}</span>
          {compact && <span className="kpi-compact" aria-hidden="true">{compact}</span>}
        </p>
      </div>
    </article>)}
  </section>
}

function Overview({ filters, pick }: { filters: Filters; pick: (key: 'month' | 'category', value: string) => void }) {
  const params = queryParams(filters)
  const query = useQuery({
    queryKey: ['overview', params.toString()],
    queryFn: ({ signal }) => request<OverviewData>('overview', params, signal),
  })
  if (query.isPending) return <p role="status" className="message">Calculando indicadores…</p>
  if (query.isError) return <div className="alert" role="alert"><p>{query.error.message}</p><Button size="sm" variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div>

  return (
    <>
      <Kpis data={query.data} />
      <Suspense fallback={<p role="status" className="message">Carregando gráficos…</p>}>
        <Charts data={query.data} month={filters.month} category={filters.category} select={pick} />
      </Suspense>
    </>
  )
}

export default function App() {
  const [location, setLocation] = useState(window.location.pathname + window.location.search)
  useEffect(() => {
    const handlePop = () => setLocation(window.location.pathname + window.location.search)
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const url = new URL(location, window.location.origin)
  const params = url.searchParams
  const showOrders = url.pathname.endsWith('/pedidos') || params.get('view') === 'pedidos'
  const showAccounting = url.pathname.endsWith('/contabilidade') || params.get('view') === 'contabilidade'
  const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => request<Meta>('meta', new URLSearchParams(), signal), enabled: !showAccounting })
  const requestedYear = params.get('year')
  const startYear = meta.data?.start.slice(0, 4)
  const endYear = meta.data?.end.slice(0, 4)
  const yearInRange = requestedYear && startYear && endYear
    && /^20[0-9]{2}$/.test(requestedYear) && requestedYear >= startYear && requestedYear <= endYear
  const year = (requestedYear === 'all' || yearInRange ? requestedYear : endYear) ?? undefined
  const requestedMonth = params.get('month')
  const month = requestedMonth && /^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(requestedMonth) && (year === 'all' || requestedMonth.startsWith(year + '-'))
    ? requestedMonth : undefined
  function getDimension(key: Dimension) {
    const value = params.get(key)
    return value && meta.data?.options[key].includes(value) ? value : undefined
  }
  const filters = { year, month, region: getDimension('region'), channel: getDimension('channel'), category: getDimension('category') }
  const nav = queryParams(filters)
  if (year === 'all') nav.set('year', 'all')
  const navSuffix = nav.size ? '?' + nav : ''
  const page = Math.min(100_000, Math.max(1, Math.trunc(Number(params.get('page')) || 1)))
  const sort = params.get('sort') === 'revenue' ? 'revenue' : 'recent'
  const requestedOrder = params.get('order_id') ?? ''
  const orderId = /^[1-9][0-9]{0,8}$/.test(requestedOrder) ? requestedOrder : ''

  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const href = url.pathname + (next.size ? '?' + next.toString() : '')
    if (href === location) return
    window.history.pushState(null, '', href)
    setLocation(href)
  }

  function setFilter(key: Filter, value: string) {
    if (key === 'year') navigate({ year: value, month: '', page: '' })
    else navigate({ [key]: value, page: '' })
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <Sidebar orders={showOrders} accounting={showAccounting} params={navSuffix} count={meta.data?.count} />
      <main className="workspace" id="conteudo">
        <header className="page-top">
          <div>
            <h1>{showAccounting ? 'Relatórios contábeis' : showOrders ? 'Pedidos' : 'Desempenho comercial'}</h1>
            <p>{showAccounting ? 'Caso fictício do portfólio · janeiro a abril' : showOrders ? 'Consulte os pedidos do recorte selecionado.' : 'Receita, margem e pedidos por período, região e canal.'}</p>
          </div>
          <span className="dataset"><Database size={16} aria-hidden="true" />{showAccounting ? 'Cenário didático' : 'Base fictícia · SQLite'}</span>
        </header>
        {showAccounting ? <Suspense fallback={<p role="status" className="message">Carregando relatórios…</p>}>
          <Accounting params={params} update={navigate} />
        </Suspense> : <>
        {meta.isPending && <p role="status" className="message">Carregando a base…</p>}
        {meta.isError && <div className="alert" role="alert"><p>{meta.error.message}</p><Button variant="outline" size="sm" onClick={() => meta.refetch()}>Tentar novamente</Button></div>}
        {meta.data && <>
          <FilterBar meta={meta.data} filters={filters} setFilter={setFilter} clear={() => navigate({
            year: '', month: '', region: '', channel: '', category: '', page: '', order_id: '', sort: '',
          })} />
          {!showOrders && <Overview filters={filters} pick={(key, value) => setFilter(key, filters[key] === value ? '' : value)} />}
          <Orders key={orderId} filters={filters} preview={!showOrders} page={page} sort={sort} orderId={orderId}
            allHref={import.meta.env.BASE_URL + '?view=pedidos' + (navSuffix ? '&' + navSuffix.slice(1) : '')} onQuery={navigate} />
        </>}
        </>}
      </main>
    </div>
  )
}
