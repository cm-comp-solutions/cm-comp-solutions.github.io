import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

type Job = { id: number; route: string; params: string }
let database: Promise<Database> | undefined

async function getDatabase(): Promise<Database> {
  if (!database) {
    database = (async () => {
      const [SQL, response] = await Promise.all([
        initSqlJs({ locateFile: () => wasmUrl }),
        fetch(import.meta.env.BASE_URL + 'comercial.sqlite3.gz'),
      ])
      if (!response.ok || !response.body) throw new Error('Não foi possível carregar os dados fictícios.')
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'))
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
      return new SQL.Database(bytes)
    })().catch(error => { database = undefined; throw error })
  }
  return database
}

function run(db: Database, sql: string, values: SqlValue[] = []) {
  const statement = db.prepare(sql)
  try {
    statement.bind(values)
    const rows: Record<string, SqlValue>[] = []
    while (statement.step()) rows.push(statement.getAsObject())
    return rows
  } finally {
    statement.free()
  }
}

function query(db: Database, route: string, params: URLSearchParams) {
  const dimensions = ['region', 'channel', 'category'] as const
  const conditions = (exclude = '') => {
    const clauses: string[] = []
    const values: SqlValue[] = []
    const year = params.get('year')
    const month = params.get('month')
    if (year && /^20\d{2}$/.test(year)) {
      clauses.push('ordered_on >= ? AND ordered_on < ?')
      values.push(year + '-01-01', String(Number(year) + 1) + '-01-01')
    }
    if (month && exclude !== 'month' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)
      clauses.push('ordered_on >= ? AND ordered_on < ?')
      values.push(month + '-01', next)
    }
    for (const key of dimensions) {
      const value = params.get(key)
      if (value && exclude !== key) { clauses.push(key + ' = ?'); values.push(value) }
    }
    const order = params.get('order_id')
    if (order && /^[1-9]\d{0,8}$/.test(order)) { clauses.push('id = ?'); values.push(Number(order)) }
    return { where: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '', values }
  }
  if (route === 'meta') {
    const row = run(db, 'SELECT min(ordered_on) start, max(ordered_on) end, count(*) count FROM orders')[0]
    const options = Object.fromEntries(dimensions.map(key => [key, run(db, 'SELECT DISTINCT ' + key + ' value FROM orders ORDER BY value').map(item => item.value)]))
    return { ...row, options }
  }
  if (route === 'overview') {
    const all = conditions()
    const month = conditions('month')
    const category = conditions('category')
    return {
      totals: run(db, 'SELECT count(*) orders, coalesce(sum(net_cents),0) net_cents, coalesce(sum(net_cents-cost_cents),0) margin_cents FROM orders' + all.where, all.values)[0],
      series: run(db, 'SELECT substr(ordered_on,1,7) month, sum(net_cents) net_cents FROM orders' + month.where + ' GROUP BY month ORDER BY month', month.values),
      categories: run(db, 'SELECT category, sum(net_cents) net_cents FROM orders' + category.where + ' GROUP BY category ORDER BY net_cents DESC, category', category.values),
    }
  }
  if (route === 'orders') {
    const filter = conditions()
    const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1))
    const pageSize = Math.max(1, Math.min(100, Number(params.get('page_size')) || 20))
    const orderBy = params.get('sort') === 'revenue' ? 'net_cents DESC, id DESC' : 'ordered_on DESC, id DESC'
    return {
      total: run(db, 'SELECT count(*) total FROM orders' + filter.where, filter.values)[0].total,
      page, page_size: pageSize,
      rows: run(db, 'SELECT id, ordered_on, category, product, region, channel, quantity, gross_cents, discount_cents, net_cents, cost_cents FROM orders' + filter.where + ' ORDER BY ' + orderBy + ' LIMIT ? OFFSET ?', [...filter.values, pageSize, (page - 1) * pageSize]),
    }
  }
  throw new Error('Consulta desconhecida.')
}

self.onmessage = async (event: MessageEvent<Job>) => {
  const { id, route, params } = event.data
  try {
    self.postMessage({ id, result: query(await getDatabase(), route, new URLSearchParams(params)) })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Erro ao consultar os dados.' })
  }
}
