import { useEffect, useMemo, useRef } from 'react'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { money, monthLabel, number, shortMoney, type OverviewData } from '@/lib/data'

use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])
const lilac = '#9266bf'
const orange = '#ed7b32'
const ink = '#34273c'
const gradient = (vertical: boolean, from = lilac, to = orange) => ({
  type: 'linear' as const, x: 0, y: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0,
  colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }],
})

interface MetricPoint {
  id: string
  label: string
  cents: number
}

function ChartCanvas({ option, choose, title }: { option: EChartsOption; choose: (index: number) => void; title: string }) {
  const element = useRef<HTMLDivElement>(null)
  const chart = useRef<EChartsType>(null)

  useEffect(() => {
    const host = element.current
    if (!host) return
    const instance = init(host)
    chart.current = instance
    const observer = new ResizeObserver(() => {
      if (!instance.isDisposed()) instance.resize()
    })
    observer.observe(host)
    return () => {
      observer.disconnect()
      instance.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    const instance = chart.current
    if (!instance) return
    instance.setOption(option, { notMerge: true })
    const onClick = ({ dataIndex }: { dataIndex: number }) => choose(dataIndex)
    instance.on('click', 'series', onClick)
    return () => {
      if (!instance.isDisposed()) instance.off('click', onClick)
    }
  }, [option, choose])

  return <div ref={element} className="chart-canvas" role="img" aria-label={title + '. Use Ver dados para explorar os valores.'} />
}

export function ChartPanel({ title, points, kind, active, select, unit = 'money', seriesName = 'Receita líquida' }: {
  title: string
  points: MetricPoint[]
  kind: 'trend' | 'ranking' | 'columns'
  unit?: 'money' | 'quantity'
  seriesName?: string
  active?: string
  select: (value: string) => void
}) {
  const option = useMemo<EChartsOption>(() => {
    const trend = kind === 'trend'
    const ranking = kind === 'ranking'
    const format = unit === 'money' ? money : number
    const compact = unit === 'money' ? shortMoney : number
    const labels = points.map(point => point.label)
    const values = points.map(point => ({
      value: point.cents,
      itemStyle: {
        color: active && point.id !== active ? '#bcb8c1' : gradient(!ranking, point.cents < 0 ? orange : lilac, point.cents < 0 ? lilac : orange),
        borderColor: point.id === active ? ink : 'transparent',
        borderWidth: point.id === active ? 2 : 0,
      },
      symbolSize: point.id === active ? 11 : 7,
    }))
    const axes = { color: '#67636d', fontSize: 11 }
    const categories = { type: 'category' as const, data: labels, axisTick: { show: false }, axisLabel: axes }
    const compactLabels = { ...axes, formatter: (value: number) => compact(value) }
    const scale = { type: 'value' as const, axisLabel: { ...compactLabels, hideOverlap: true }, splitLine: { lineStyle: { color: '#e8e6e9' } } }

    return {
      animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationDuration: 220,
      textStyle: { fontFamily: 'DM Sans Variable, sans-serif' },
      tooltip: { trigger: ranking ? 'item' : 'axis', renderMode: 'richText', confine: true, valueFormatter: value => format(Number(value)) },
      grid: { left: ranking ? 112 : 66, right: ranking ? 58 : 23, top: 14, bottom: 30 },
      xAxis: ranking
        ? { ...scale, splitLine: { show: points.some(point => point.cents < 0) } }
        : { ...categories, boundaryGap: !trend, axisLabel: { ...axes, hideOverlap: true, showMinLabel: true, showMaxLabel: true } },
      yAxis: ranking
        ? { ...categories, inverse: true, axisLabel: { ...axes, width: 106, overflow: 'truncate' }, axisLine: { show: false, onZero: false } }
        : { ...scale, minInterval: unit === 'quantity' ? 1 : undefined },
      series: trend
        ? [{ type: 'line', name: seriesName, data: values, symbol: 'circle', lineStyle: { color: gradient(false), width: 3 },
             areaStyle: { color: gradient(false, '#e6d6f5', '#ffd9bf'), opacity: 0.75 } }]
        : [{ type: 'bar', name: seriesName, data: values, barMaxWidth: ranking ? 22 : 56,
             itemStyle: { borderRadius: 4 },
             label: { show: !ranking || points.every(point => point.cents >= 0), position: ranking ? 'right' : 'top',
                      color: '#252329', fontSize: 11, formatter: item => compact(Number(item.value)) } }],
    }
  }, [points, active, kind, unit, seriesName])

  function chooseIndex(index: number) {
    const point = points[index]
    if (point) select(point.id)
  }

  return (
    <section className="panel chart-panel" aria-label={title}>
      <div className="panel-head">
        <h2>{title}</h2>
        <Dialog>
          <DialogTrigger asChild><Button type="button" variant="ghost" size="sm" disabled={!points.length}>Ver dados</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Selecione uma linha para filtrar o painel.</DialogDescription>
            </DialogHeader>
            <div className="chart-list">
              {points.map(point => (
                <DialogClose asChild key={point.id}>
                  <button type="button" aria-pressed={active === point.id} onClick={() => select(point.id)}>
                    <span>{point.label}</span><strong>{unit === 'money' ? money(point.cents) : number(point.cents)}</strong>
                  </button>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {points.length > 0
        ? <ChartCanvas option={option} choose={chooseIndex} title={title} />
        : <p className="chart-empty">Nenhum dado para os filtros selecionados.</p>}
    </section>
  )
}

export default function Charts({ data, month, category, select }: {
  data: OverviewData
  month?: string
  category?: string
  select: (key: 'month' | 'category', value: string) => void
}) {
  const points = useMemo(() => data.series.map(row => ({ id: row.month, label: monthLabel(row.month), cents: row.net_cents })), [data.series])
  const ranking = useMemo(() => data.categories.map(row => ({ id: row.category, label: row.category, cents: row.net_cents })), [data.categories])
  return (
    <div className="charts">
      <ChartPanel title="Evolução da receita" points={points} kind="trend" active={month} select={value => select('month', value)} />
      <ChartPanel title="Receita por categoria" points={ranking} kind="ranking" active={category} select={value => select('category', value)} />
    </div>
  )
}
