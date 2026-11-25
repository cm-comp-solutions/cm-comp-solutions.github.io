import { useMemo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ChartPanel } from './Charts'
import { Button } from '@/components/ui/button'
import { buildBooks, dayLabel, methods, months, periodLabel, type Method, type Month } from '@/lib/accounting'
import { cashReconciliation, forecastTrend, reports, summarize, type Point, type ReportId, type StatementRow } from '@/lib/accountingReports'
import { money, number, shortMoney } from '@/lib/data'

type Cell = ReactNode

function ReportTable({ title, headers, rows }: {
  title: string
  headers: string[]
  rows: { cells: Cell[]; subtotal?: boolean }[]
}) {
  return (
    <section className="panel orders-panel" aria-label={title}>
      <div className="panel-head"><h2>{title}</h2></div>
      {rows.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label={'Tabela: ' + title}>
        <table>
          <thead><tr>{headers.map(text => <th key={text} scope="col">{text}</th>)}</tr></thead>
          <tbody>{rows.map(({ cells, subtotal }, index) => (
            <tr key={index} className={subtotal ? 'statement-subtotal' : undefined}>
              {cells.map((value, column) => column === 0
                ? <th scope="row" key={column}>{value}</th>
                : <td key={column}>{value}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div> : <p className="table-status">Sem movimentos para este recorte.</p>}
    </section>
  )
}

function StatementTable({ title, rows }: { title: string; rows: StatementRow[] }) {
  return <ReportTable title={title} headers={['Conta', 'Valor']} rows={
    rows.map(item => ({ cells: [item.label, money(item.cents)], subtotal: item.subtotal }))
  } />
}

function isReport(value: string | null): value is ReportId {
  return value !== null && Object.hasOwn(reports, value)
}

export default function Accounting({ params, update }: {
  params: URLSearchParams
  update: (changes: Record<string, string>) => void
}) {
  const rawReport = params.get('relatorio')
  const id = isReport(rawReport) ? rawReport : 'geral'
  const report = reports[id]
  const rawMethod = params.get('custeio')
  const method = methods.find(value => value === rawMethod) ?? 'PEPS'
  const books = useMemo(() => buildBooks(method), [method])
  const forecast = id === 'previsto'
  const sales = id === 'vendas'
  const day = forecast ? books.forecast.find(event => event.date === params.get('dia'))?.date : undefined
  const month = forecast ? undefined : months.find(value => String(value) === params.get('mes'))
  const view = summarize(id, books, month, day)
  const focus = view.groups.find(point => point.id === params.get('grupo'))
  const trend: Point[] = forecast
    ? forecastTrend(books, focus?.id)
    : months.map(current => {
        const monthly = summarize(id, books, current)
        return { id: String(current), label: periodLabel(current), cents: focus ? monthly.groups.find(point => point.id === focus.id)?.cents ?? 0 : monthly.trendValue }
      })
  const breakdown: Point[] = sales ? months.map(current => ({
    id: String(current), label: periodLabel(current), cents: books.period(current, current).units,
  })) : view.groups
  const rows = focus ? view.rows.filter(item => item.group === focus.id) : view.rows
  const selectPeriod = (value: string) => forecast
    ? update({ dia: day === value ? '' : value })
    : update({ mes: String(month) === value ? '' : value })
  const selectGroup = (value: string) => update({
    grupo: focus?.id === value ? '' : value,
    ...(forecast && day && books.forecast.some(event => event.date === day && event.group !== value) ? { dia: '' } : {}),
  })
  const cashEntries = forecast
    ? books.forecast.filter(entry => (!day || entry.date === day) && (!focus || entry.group === focus.id))
    : books.cash.filter(entry => (!month || entry.date.startsWith('0' + month + '-')) && (!focus || entry.group === focus.id))
  const stockEntries = books.stock.filter(entry => (!month || entry.date.startsWith('0' + month + '-'))
    && (!focus || focus.id === 'saldo' || (focus.id === 'compras' ? entry.quantity > 0 : entry.quantity < 0)))
  const periodText = forecast ? 'Abril previsto' : periodLabel(month)
  const primaryTitle = focus ? focus.label + (forecast ? ' por movimento' : ' por mês') : report.trend
  const changeMonth = (value: string) => update({ mes: value })

  return (
    <>
      <nav className="panel report-nav" aria-label="Demonstrativos">
        {Object.entries(reports).map(([key, item]) => (
          <Button key={key} variant="ghost" size="sm" type="button" aria-current={key === id ? 'page' : undefined}
            onClick={() => { if (key !== id) update({ relatorio: key, grupo: '', dia: '' }) }}>{item.tab}</Button>
        ))}
      </nav>
      <div className="report-heading">
        <div><h2>{report.title}</h2><p>{periodText}{id === 'dre' ? ' · Regime de competência' : ''}</p></div>
        <div className="report-controls">
          <div className="field">
            <label htmlFor="accounting-period">{forecast ? 'Movimento' : 'Período'}</label>
            <select id="accounting-period" value={forecast ? day ?? '' : month ?? ''} onChange={event => {
              const value = event.target.value
              if (forecast) update({ dia: value, grupo: '' })
              else changeMonth(value)
            }}>
              <option value="">{forecast ? 'Abril completo' : 'Trimestre'}</option>
              {forecast ? books.forecast.map(event => <option key={event.date} value={event.date}>{dayLabel(event.date)}</option>)
                : months.map(month => <option key={month} value={month}>{periodLabel(month)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="accounting-method">Custeio</label>
            <select id="accounting-method" value={method} onChange={event => update({ custeio: event.target.value as Method })}>
              {methods.map(value => <option key={value}>{value}</option>)}
            </select>
          </div>
        </div>
      </div>
      {(focus || month || day) && <div className="selection" aria-label="Filtros ativos">
        {focus && <button type="button" onClick={() => update({ grupo: '' })} aria-label={'Remover grupo ' + focus.label}>{focus.label}<X size={13} aria-hidden="true" /></button>}
        {(month || day) && <button type="button" onClick={() => update({ mes: '', dia: '' })} aria-label="Limpar período selecionado">{day ? dayLabel(day) : periodLabel(month)}<X size={13} aria-hidden="true" /></button>}
      </div>}
      <section className="kpis accounting-kpis" aria-label="Indicadores contábeis" aria-live="polite">
        {view.cards.map(item => <article className="panel kpi" key={item.label}>
          <div className="kpi-data">
            <p className="kpi-name">{item.label}</p>
            <p className="kpi-value">
              <span className="sr-only">{money(item.cents)}</span>
              <span className="kpi-full" aria-hidden="true">{money(item.cents)}</span>
              <span className="kpi-compact" aria-hidden="true">{shortMoney(item.cents)}</span>
            </p>
          </div>
        </article>)}
        {sales && <article className="panel kpi"><div className="kpi-data"><p className="kpi-name">Unidades vendidas</p>
          <p className="kpi-value">{number(books.period(month ?? 1, month ?? 3).units)}</p></div></article>}
      </section>
      <div className="charts accounting-charts">
        <ChartPanel title={primaryTitle} points={trend} kind={forecast || id === 'dre' || id === 'realizado' ? 'columns' : 'trend'}
          seriesName={primaryTitle} active={forecast ? day : month && String(month)} select={selectPeriod} />
        <ChartPanel title={report.breakdown} points={breakdown} kind={sales ? 'columns' : 'ranking'}
          seriesName={report.breakdown} active={sales ? month && String(month) : focus?.id}
          select={sales ? selectPeriod : selectGroup} unit={sales ? 'quantity' : 'money'} />
      </div>
      <StatementTable title={focus ? 'Detalhamento · ' + focus.label : report.title + ' · detalhe'} rows={rows} />
      {id === 'estoque' && <ReportTable title={'Ficha de estoque · ' + method} headers={['Data', 'Movimento', 'Quantidade', 'Custo unitário', 'CMV', 'Saldo em unidades', 'Saldo em R$']}
        rows={stockEntries.map(item => ({ cells: [dayLabel(item.date), item.label, number(item.quantity), money(item.cost / Math.abs(item.quantity)),
          item.quantity < 0 ? money(item.cost) : '—', number(item.balanceQuantity), money(item.balanceValue)] }))} />}
      {(forecast || id === 'realizado') && <ReportTable title="Movimentação e saldo por data" headers={['Data', 'Movimento', 'Valor', 'Saldo após movimento']}
        rows={cashEntries.map(item => ({ cells: [dayLabel(item.date), item.label, money(item.amount), money(item.balance)] }))} />}
      {id === 'realizado' && (!focus || focus.id === 'operacional') && <StatementTable title="Conciliação do lucro ao caixa operacional" rows={cashReconciliation(books, month as Month | undefined)} />}
      {view.note && <p className="report-note">{view.note}</p>}
    </>
  )
}
