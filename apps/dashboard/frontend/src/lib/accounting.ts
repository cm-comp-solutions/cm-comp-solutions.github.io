// Valores em centavos. Cenário didático reproduzido do finance-demo.js do portfólio.
export const methods = ['PEPS', 'UEPS', 'Médio'] as const
export type Method = typeof methods[number]
export type Month = 1 | 2 | 3
export const months = [1, 2, 3] as const

export const accounts = {
  aporte: 'Integralização de capital',
  clientes: 'Recebimentos de clientes',
  fornecedores: 'Pagamentos a fornecedores',
  comercial: 'Despesas comerciais',
  administrativo: 'Despesas administrativas',
  equipamentos: 'Aquisição de equipamentos',
} as const

type CashAccount = keyof typeof accounts
export type Movement = { date: string; label: string; amount: number; group: string; balance: number }
export type StockEntry = {
  date: string
  label: string
  quantity: number
  cost: number
  balanceQuantity: number
  balanceValue: number
}

const stockEvents = [
  { date: '01-02', quantity: 100, unitCost: 10_000 },
  { date: '01-25', quantity: -30, unitCost: 0 },
  { date: '02-03', quantity: 100, unitCost: 12_000 },
  { date: '02-24', quantity: -40, unitCost: 0 },
  { date: '03-25', quantity: -50, unitCost: 0 },
]

const cashEvents: { date: string; account: CashAccount; amount: number; group: string }[] = [
  { date: '01-01', account: 'aporte', amount: 10_000_000, group: 'financiamento' },
  { date: '01-02', account: 'fornecedores', amount: -1_000_000, group: 'operacional' },
  { date: '01-10', account: 'equipamentos', amount: -1_200_000, group: 'investimento' },
  { date: '01-25', account: 'clientes', amount: 600_000, group: 'operacional' },
  { date: '02-03', account: 'fornecedores', amount: -600_000, group: 'operacional' },
  { date: '02-24', account: 'clientes', amount: 800_000, group: 'operacional' },
  { date: '03-25', account: 'clientes', amount: 800_000, group: 'operacional' },
  { date: '03-31', account: 'comercial', amount: -150_000, group: 'operacional' },
  { date: '03-31', account: 'administrativo', amount: -250_000, group: 'operacional' },
]

export const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0)
const monthOf = (date: string) => Number(date.slice(0, 2))
const salePrice = 20_000
export const periodLabel = (month?: Month) => month ? ['Janeiro', 'Fevereiro', 'Março'][month - 1] : 'Janeiro a março'
export const dayLabel = (date: string) => date.slice(3) + '/' + date.slice(0, 2)

function stockLedger(method: Method): StockEntry[] {
  let quantity = 0
  let value = 0
  const lots: { quantity: number; unitCost: number }[] = []

  return stockEvents.map(event => {
    let cost: number
    const purchased = event.quantity > 0
    if (purchased) {
      lots.push({ quantity: event.quantity, unitCost: event.unitCost })
      cost = event.quantity * event.unitCost
    } else if (method === 'Médio') {
      cost = Math.round((-event.quantity * value) / quantity)
    } else {
      cost = 0
      let units = -event.quantity
      while (units) {
        const index = method === 'PEPS' ? 0 : lots.length - 1
        const lot = lots[index]
        const taken = Math.min(units, lot.quantity)
        cost += taken * lot.unitCost
        lot.quantity -= taken
        units -= taken
        if (!lot.quantity) lots.splice(index, 1)
      }
    }
    value += purchased ? cost : -cost
    quantity += event.quantity
    return { date: event.date, label: purchased ? 'Compra de mercadorias' : 'Venda de mercadorias',
             quantity: event.quantity, cost, balanceQuantity: quantity, balanceValue: value }
  })
}

function withBalances(entries: Omit<Movement, 'balance'>[], opening = 0): Movement[] {
  let balance = opening
  return entries.map(entry => ({ ...entry, balance: balance += entry.amount }))
}

export function buildBooks(method: Method) {
  const stock = stockLedger(method)
  const cash = withBalances(cashEvents.map(event => ({ ...event, label: accounts[event.account] })))

  function period(from: Month, to: Month) {
    const entries = stock.filter(entry => monthOf(entry.date) >= from && monthOf(entry.date) <= to)
    const payments = cashEvents.filter(entry => monthOf(entry.date) >= from && monthOf(entry.date) <= to)
    const paid = (account: CashAccount) => total(payments.filter(p => p.account === account).map(p => p.amount))
    const units = total(entries.filter(e => e.quantity < 0).map(e => -e.quantity))
    const sales = units * salePrice
    const tax = sales / 10
    const purchases = total(entries.filter(e => e.quantity > 0).map(e => e.cost))
    const cost = total(entries.filter(e => e.quantity < 0).map(e => e.cost))
    const depreciation = to === 3 ? 60_000 : 0
    const net = sales - tax
    const gross = net - cost
    const operating = paid('clientes') + paid('fornecedores') + paid('comercial') + paid('administrativo')
    const profit = gross + paid('comercial') + paid('administrativo') - depreciation
    return { units, sales, tax, purchases, cost, net, gross, profit, depreciation, operating,
             collected: paid('clientes'), suppliersPaid: paid('fornecedores'), selling: paid('comercial'),
             admin: paid('administrativo'), invested: paid('equipamentos'), financing: paid('aporte') }
  }

  function balance(to: Month | 0) {
    const ledger = stock.filter(entry => monthOf(entry.date) <= to)
    const inventory = ledger.at(-1)?.balanceValue ?? 0
    const cashBalance = cash.filter(entry => monthOf(entry.date) <= to).at(-1)?.balance ?? 0
    const book = to ? period(1, to) : undefined
    const ar = book ? book.sales - book.collected : 0
    const ap = book ? book.purchases + book.suppliersPaid : 0
    const equipment = -(book?.invested ?? 0)
    const depreciation = book?.depreciation ?? 0
    const tax = book?.tax ?? 0
    const capital = book?.financing ?? 0
    const profit = book?.profit ?? 0
    const current = cashBalance + ar + inventory
    const fixed = equipment - depreciation
    const liabilities = ap + tax
    const equity = capital + profit
    return { inventory, cash: cashBalance, ar, ap, equipment, depreciation, tax, capital, profit, current, fixed,
             liabilities, equity, assets: current + fixed, liabilitiesEquity: liabilities + equity }
  }

  const close = balance(3)
  const forecast = withBalances([
    { date: '04-05', label: 'Recebimento de clientes em aberto', amount: close.ar, group: 'entradas' },
    { date: '04-10', label: 'Pagamento a fornecedores em aberto', amount: -close.ap, group: 'saidas' },
    { date: '04-15', label: 'Pagamento de tributos em aberto', amount: -close.tax, group: 'saidas' },
    { date: '04-18', label: 'Pagamento de novas compras', amount: -800_000, group: 'saidas' },
    { date: '04-25', label: 'Recebimento de novas vendas', amount: 1_200_000, group: 'entradas' },
    { date: '04-30', label: 'Pagamento de despesas', amount: -200_000, group: 'saidas' },
  ], close.cash)
  return { stock, cash, period, balance, forecast }
}

export type Books = ReturnType<typeof buildBooks>
