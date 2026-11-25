import { dayLabel, periodLabel, total, type Books, type Month, type Movement } from './accounting'

export const reports = {
  geral: { tab: 'Visão geral', title: 'Indicadores do trimestre', trend: 'Receita por mês', breakdown: 'Indicadores do recorte' },
  dre: { tab: 'DRE', title: 'Demonstração do resultado', trend: 'Resultado por mês', breakdown: 'Composição da DRE' },
  balanco: { tab: 'Balanço', title: 'Balanço patrimonial', trend: 'Ativo total no fechamento', breakdown: 'Composição do balanço' },
  vendas: { tab: 'Vendas', title: 'Evolução das vendas', trend: 'Receita por mês', breakdown: 'Unidades vendidas por mês' },
  estoque: { tab: 'Estoque', title: 'Custos e estoque', trend: 'Estoque final por mês', breakdown: 'Composição do estoque' },
  realizado: { tab: 'Caixa realizado', title: 'Fluxo de caixa realizado', trend: 'Variação de caixa por mês', breakdown: 'Fluxo por atividade' },
  previsto: { tab: 'Caixa previsto', title: 'Fluxo de caixa previsto', trend: 'Movimentos de abril', breakdown: 'Entradas e saídas previstas' },
} as const

export type ReportId = keyof typeof reports
export type Point = { id: string; label: string; cents: number }
type Row = { label: string; cents: number; group?: string; subtotal?: boolean }
export type Statement = { cards: Row[]; rows: Row[]; groups: Point[]; trendValue: number; note?: string }

const row = (label: string, cents: number, group?: string, subtotal = false): Row => ({ label, cents, group, subtotal })
const group = (id: string, label: string, cents: number): Point => ({ id, label, cents })

export function summarize(id: ReportId, books: Books, month?: Month, day?: string): Statement {
  const end = month ?? 3
  const flow = books.period(month ?? 1, end)
  const close = books.balance(end)

  switch (id) {
    case 'geral': {
      const cards = [
        row('Receita bruta', flow.sales, 'receita'), row('Lucro líquido', flow.profit, 'lucro'),
        row('Compras', flow.purchases, 'compras'), row('Estoque final', close.inventory, 'estoque'),
      ]
      return { cards, rows: cards, groups: cards.map(item => group(item.group!, item.label, item.cents)), trendValue: flow.sales }
    }
    case 'dre':
      return {
        cards: [row('Receita líquida', flow.net), row('Lucro bruto', flow.gross), row('Lucro líquido', flow.profit)],
        groups: [
          group('receita', 'Vendas brutas', flow.sales), group('tributos', 'Tributos', -flow.tax),
          group('cmv', 'CMV', -flow.cost), group('despesas', 'Despesas', flow.selling + flow.admin - flow.depreciation),
          group('lucro', 'Lucro líquido', flow.profit),
        ],
        rows: [
          row('Receita bruta de vendas', flow.sales, 'receita', true), row('Vendas de mercadorias', flow.sales, 'receita'),
          row('Tributos sobre vendas', -flow.tax, 'tributos'), row('Receita líquida', flow.net, undefined, true),
          row('Custo das mercadorias vendidas', -flow.cost, 'cmv'), row('Lucro bruto', flow.gross, undefined, true),
          row('Despesas com vendas', flow.selling, 'despesas'), row('Despesas administrativas', flow.admin, 'despesas'),
          row('Depreciação administrativa', -flow.depreciation, 'despesas'), row('Resultado operacional', flow.profit, 'lucro', true),
          row('Resultado financeiro', 0, 'lucro'), row('Resultado antes de IRPJ e CSLL', flow.profit, 'lucro', true),
          row('IRPJ e CSLL', 0, 'lucro'), row('Lucro líquido do período', flow.profit, 'lucro', true),
        ],
        trendValue: flow.profit,
        note: 'Cenário didático por competência. Tributos sobre vendas de 10% em aberto. IRPJ e CSLL fora da simulação.',
      }
    case 'balanco':
      return {
        cards: [row('Ativo total', close.assets), row('Passivo exigível', close.liabilities), row('Patrimônio líquido', close.equity)],
        groups: [group('circulante', 'Ativo circulante', close.current), group('imobilizado', 'Ativo não circulante', close.fixed),
          group('passivo', 'Passivo', close.liabilities), group('patrimonio', 'Patrimônio líquido', close.equity)],
        rows: [
          row('Ativo circulante', close.current, 'circulante', true), row('Caixa e equivalentes', close.cash, 'circulante'),
          row('Clientes a receber', close.ar, 'circulante'), row('Estoques de mercadorias', close.inventory, 'circulante'),
          row('Ativo não circulante', close.fixed, 'imobilizado', true), row('Imobilizado — equipamentos', close.equipment, 'imobilizado'),
          row('Depreciação acumulada', -close.depreciation, 'imobilizado'), row('Total do ativo', close.assets, undefined, true),
          row('Passivo circulante', close.liabilities, 'passivo', true), row('Fornecedores', close.ap, 'passivo'),
          row('Tributos sobre vendas a recolher', close.tax, 'passivo'), row('Passivo não circulante', 0, 'passivo'),
          row('Patrimônio líquido', close.equity, 'patrimonio', true), row('Capital social integralizado', close.capital, 'patrimonio'),
          row('Resultado acumulado do período', close.profit, 'patrimonio'), row('Total do passivo e PL', close.liabilitiesEquity, undefined, true),
        ],
        trendValue: close.assets, note: 'Saldos no fechamento do mês selecionado. O trimestre mostra a posição de março.',
      }
    case 'vendas': {
      const relevant = month ? [month] : [1, 2, 3] as const
      return {
        cards: [row('Receita bruta', flow.sales), row('Receita líquida', flow.net)],
        groups: [],
        rows: relevant.map(current => {
          const sales = books.period(current, current)
          return row(periodLabel(current) + ' · ' + sales.units + ' unidades', sales.sales)
        }),
        trendValue: flow.sales,
      }
    }
    case 'estoque':
      return {
        cards: [row('Compras', flow.purchases), row('Custo das vendas', flow.cost), row('Estoque final', close.inventory)],
        groups: [group('compras', 'Compras', flow.purchases), group('cmv', 'CMV', -flow.cost), group('saldo', 'Estoque final', close.inventory)],
        rows: [row('Total de compras', flow.purchases, 'compras'), row('Custo das saídas', -flow.cost, 'cmv'),
          row('Estoque final', close.inventory, 'saldo', true)],
        trendValue: close.inventory,
        note: 'Estoque inicial zero e um produto. O custo médio móvel é arredondado a centavos por saída. UEPS aparece para comparação didática.',
      }
    case 'realizado': {
      const opening = books.balance(month ? (month - 1) as Month | 0 : 0).cash
      const netChange = flow.operating + flow.invested + flow.financing
      return {
        cards: [row('Caixa operacional', flow.operating), row('Variação líquida', netChange), row('Caixa final', close.cash)],
        groups: [group('operacional', 'Operacional', flow.operating), group('investimento', 'Investimento', flow.invested),
          group('financiamento', 'Financiamento', flow.financing)],
        rows: [
          row('Recebimentos de clientes', flow.collected, 'operacional'), row('Pagamentos a fornecedores', flow.suppliersPaid, 'operacional'),
          row('Despesas comerciais pagas', flow.selling, 'operacional'), row('Despesas administrativas pagas', flow.admin, 'operacional'),
          row('Caixa líquido operacional', flow.operating, 'operacional', true),
          row('Aquisição de equipamentos', flow.invested, 'investimento'), row('Caixa líquido de investimento', flow.invested, 'investimento', true),
          row('Integralização de capital', flow.financing, 'financiamento'), row('Caixa líquido de financiamento', flow.financing, 'financiamento', true),
          row('Variação líquida do caixa', netChange, undefined, true), row('Caixa inicial', opening), row('Caixa final', close.cash, undefined, true),
        ],
        trendValue: netChange,
        note: 'Fluxo pelo método direto. O cenário começa com saldos zerados em janeiro.',
      }
    }
    case 'previsto': {
      const entries = day ? books.forecast.filter(event => event.date === day) : books.forecast
      const sumGroup = (items: Movement[], key: string) => total(items.filter(item => item.group === key).map(item => item.amount))
      const change = total(books.forecast.map(event => event.amount))
      const projected = close.cash + change
      return {
        cards: [row('Caixa inicial previsto', close.cash), row('Variação prevista em abril', change), row('Caixa final previsto', projected)],
        groups: [group('entradas', 'Entradas', sumGroup(entries, 'entradas')), group('saidas', 'Saídas', sumGroup(entries, 'saidas'))],
        rows: day ? entries.map(event => row(event.label, event.amount, event.group)) : [
          row('Caixa inicial previsto', close.cash, undefined, true),
          ...entries.map(event => row(event.label, event.amount, event.group)),
          row('Caixa líquido operacional previsto', change, undefined, true),
          row('Investimentos previstos', 0), row('Financiamentos previstos', 0),
          row('Variação líquida prevista', change, undefined, true), row('Caixa final previsto', projected, undefined, true),
        ],
        trendValue: change,
        note: 'Projeção gerencial de abril. O saldo inicial vem de março e as novas compras e vendas são premissas fictícias.',
      }
    }
  }
}

export function cashReconciliation(books: Books, month?: Month): Row[] {
  const start = books.balance(month ? (month - 1) as Month | 0 : 0)
  const close = books.balance(month ?? 3)
  const flow = books.period(month ?? 1, month ?? 3)
  const rows = [
    row('Lucro líquido do período', flow.profit), row('Depreciação', flow.depreciation),
    row('Variação de clientes a receber', start.ar - close.ar), row('Variação de estoques', start.inventory - close.inventory),
    row('Variação de fornecedores', close.ap - start.ap), row('Variação de tributos a recolher', close.tax - start.tax),
  ]
  return [...rows, row('Caixa líquido operacional', total(rows.map(item => item.cents)), undefined, true)]
}

export function forecastTrend(books: Books, selected?: string): Point[] {
  return books.forecast.filter(item => !selected || item.group === selected).map(item => group(item.date, dayLabel(item.date), item.amount))
}

export type StatementRow = Row
