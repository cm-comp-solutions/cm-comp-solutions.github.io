import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Monitor, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { calendarDate, money, number, orderCode, queryParams, request, type Filters, type Order, type OrdersData } from '@/lib/data'

function OrderDetails({ order }: { order: Order }) {
  const items = [
    ['Produto', order.product],
    ['Data', calendarDate(order.ordered_on)],
    ['Categoria', order.category],
    ['Região', order.region],
    ['Canal', order.channel],
    ['Quantidade', number(order.quantity)],
    ['Receita bruta', money(order.gross_cents)],
    ['Desconto', money(order.discount_cents)],
    ['Receita líquida', money(order.net_cents)],
    ['Custo', money(order.cost_cents)],
    ['Margem bruta', money(order.net_cents - order.cost_cents)],
  ]
  return (
    <Dialog>
      <DialogTrigger asChild><button type="button" className="row-link">{orderCode(order.id)}</button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{orderCode(order.id)}</DialogTitle>
          <DialogDescription>Detalhes do pedido fictício</DialogDescription>
        </DialogHeader>
        <dl className="detail-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </DialogContent>
    </Dialog>
  )
}

const columns: ColumnDef<Order>[] = [
  { accessorKey: 'id', header: 'Pedido', cell: ({ row }) => <OrderDetails order={row.original} /> },
  { accessorKey: 'ordered_on', header: 'Data', cell: ({ row }) => calendarDate(row.original.ordered_on) },
  { accessorKey: 'category', header: 'Categoria' },
  { accessorKey: 'region', header: 'Região' },
  { accessorKey: 'channel', header: 'Canal', cell: ({ row }) => <span className="channel">
    {row.original.channel === 'Loja física' ? <Store aria-hidden="true" /> : <Monitor aria-hidden="true" />}
    {row.original.channel}</span> },
  { accessorKey: 'net_cents', header: 'Receita líquida', cell: ({ row }) => money(row.original.net_cents) },
]
const noRows: Order[] = []

interface Props {
  filters: Filters
  preview: boolean
  page: number
  sort: 'recent' | 'revenue'
  orderId: string
  onQuery: (changes: Record<string, string>) => void
  allHref: string
}

export default function Orders({ filters, preview, page, sort, orderId, onQuery, allHref }: Props) {
  const [search, setSearch] = useState(orderId)
  const params = queryParams(filters)
  const pageSize = preview ? 5 : 20
  params.set('page_size', String(pageSize))
  if (!preview) {
    params.set('page', String(page))
    params.set('sort', sort)
    if (orderId) params.set('order_id', orderId)
  }
  const result = useQuery({
    queryKey: ['orders', params.toString()],
    queryFn: ({ signal }) => request<OrdersData>('orders', params, signal),
  })
  const table = useReactTable({ data: result.data?.rows ?? noRows, columns, getCoreRowModel: getCoreRowModel() })
  const lastPage = Math.max(1, Math.ceil((result.data?.total ?? 0) / pageSize))

  function submit(event: FormEvent) {
    event.preventDefault()
    onQuery({ order_id: search.trim().replace(/^PED-/i, '').replace(/^0+/, ''), page: '' })
  }

  return (
    <section className="panel orders-panel" aria-label={preview ? 'Pedidos recentes' : 'Lista de pedidos'}>
      <div className="panel-head">
        <h2>{preview ? 'Pedidos recentes' : 'Lista de pedidos'}</h2>
        {preview && <Button variant="outline" size="sm" asChild><a href={allHref}>Ver todos</a></Button>}
      </div>
      {!preview && <form className="table-tools" onSubmit={submit}>
        <label htmlFor="order-search" className="sr-only">Número do pedido</label>
        <input id="order-search" placeholder="Ex. 300000" value={search} pattern="([Pp][Ee][Dd]-)?[0-9]{1,9}" onChange={event => setSearch(event.target.value)} />
        <Button size="sm" type="submit">Buscar pedido</Button>
        {orderId && <Button size="sm" variant="ghost" type="button" onClick={() => { setSearch(''); onQuery({ order_id: '', page: '' }) }}>Limpar busca</Button>}
        <label className="sr-only" htmlFor="order-sort">Ordenação</label>
        <select id="order-sort" value={sort} onChange={event => onQuery({ sort: event.target.value, page: '' })}>
          <option value="recent">Mais recentes</option>
          <option value="revenue">Maior receita</option>
        </select>
      </form>}
      {result.isPending ? <p className="table-status" role="status">Consultando pedidos…</p> : result.isError
        ? <div className="table-status" role="alert">{result.error.message} <Button variant="outline" size="sm" onClick={() => result.refetch()}>Tentar novamente</Button></div>
        : !result.data.rows.length && page <= lastPage
          ? <p className="table-status">Nenhum pedido encontrado.</p>
          : <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabela de pedidos">
            <table>
              <thead>{table.getHeaderGroups().map(group => <tr key={group.id}>
                {group.headers.map(header => <th key={header.id} scope="col">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}
              </tr>)}</thead>
              <tbody>{table.getRowModel().rows.map(row => <tr key={row.original.id}>
                {row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>)}</tbody>
            </table>
          </div>}
      {!preview && result.data && <div className="pagination">
        <span aria-live="polite">{number(result.data.total)} {result.data.total === 1 ? 'pedido' : 'pedidos'}</span>
        <div className="page-buttons">
          <Button aria-label="Página anterior" variant="outline" size="icon" disabled={page <= 1} onClick={() => onQuery({ page: String(Math.min(page - 1, lastPage)) })}><ChevronLeft /></Button>
          <span>Página {number(page)} de {number(lastPage)}</span>
          <Button aria-label="Próxima página" variant="outline" size="icon" disabled={page >= lastPage} onClick={() => onQuery({ page: String(page + 1) })}><ChevronRight /></Button>
        </div>
      </div>}
    </section>
  )
}
