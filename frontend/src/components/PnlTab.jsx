import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useStore } from '../store'
import { Card, CardTitle, MetricCard, Grid, fmt, pct } from './ui'
Chart.register(...registerables)

export default function PnlTab() {
  const { periods, currentPeriodId } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  const wfRef = useRef(); const costsRef = useRef(); const compRef = useRef()
  const charts = useRef({})

  useEffect(() => {
    if (!period) return
    const m = period.metrics || {}
    const f = period.financials || {}
    const destroy = k => { if (charts.current[k]) { charts.current[k].destroy(); delete charts.current[k] } }

    destroy('wf')
    const wfV = [f.revenue, -f.cogs, m.gross_profit, -f.selling_exp, -f.admin_exp, m.ebit, -f.interest_exp, -f.tax, m.net_profit]
    const wfL = ['Выручка', '−Себест.', 'Вал.приб.', '−Коммерч.', '−Управл.', 'EBIT', '−Проценты', '−Налог', 'Чист.приб.']
    if (wfRef.current) charts.current.wf = new Chart(wfRef.current, {
      type: 'bar',
      data: { labels: wfL, datasets: [{ data: wfV.map(v => Math.round(Math.abs(v || 0))), backgroundColor: wfV.map(v => (v || 0) >= 0 ? '#1D9E75' : '#D85A30'), borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 30 } }, y: { ticks: { callback: v => fmt(v) } } } }
    })

    destroy('costs')
    const cL = ['Себестоимость', 'Коммерч.', 'Управл.', 'Проценты', 'Налог']
    const cV = [f.cogs, f.selling_exp, f.admin_exp, f.interest_exp, f.tax].map(v => Math.round(v || 0))
    if (costsRef.current) charts.current.costs = new Chart(costsRef.current, {
      type: 'doughnut',
      data: { labels: cL, datasets: [{ data: cV, backgroundColor: ['#D85A30','#BA7517','#73726c','#3266ad','#533490'], borderWidth: 2, borderColor: 'transparent' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, cutout: '55%' }
    })

    destroy('comp')
    if (compRef.current) charts.current.comp = new Chart(compRef.current, {
      type: 'bar',
      data: {
        labels: periods.map(p => p.name),
        datasets: [
          { label: 'Выручка', data: periods.map(p => Math.round(p.financials?.revenue || 0)), backgroundColor: '#3266ad44', borderColor: '#3266ad', borderWidth: 2 },
          { label: 'Чистая прибыль', data: periods.map(p => Math.round(p.metrics?.net_profit || 0)), backgroundColor: '#1D9E7544', borderColor: '#1D9E75', borderWidth: 2 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => fmt(v) } } } }
    })

    return () => { Object.values(charts.current).forEach(c => c.destroy()); charts.current = {} }
  }, [period?.id, periods.length])

  if (!period) return null
  const m = period.metrics || {}
  const f = period.financials || {}

  return (
    <div>
      <Grid cols={4}>
        <MetricCard label="Выручка" value={fmt(f.revenue)} sub="тыс. руб." />
        <MetricCard label="Валовая прибыль" value={fmt(m.gross_profit)} sub={pct(m.gross_margin) + ' маржа'} />
        <MetricCard label="EBIT" value={fmt(m.ebit)} sub={pct(m.ebit_margin) + ' маржа'} />
        <MetricCard label="Чистая прибыль" value={fmt(m.net_profit)} sub="тыс. руб." color={m.net_profit >= 0 ? 'var(--green)' : 'var(--orange)'} />
      </Grid>
      <Grid cols={2}>
        <Card><CardTitle>Водопад прибыли</CardTitle><div style={{ height: 260 }}><canvas ref={wfRef} /></div></Card>
        <Card><CardTitle>Структура затрат</CardTitle><div style={{ height: 260 }}><canvas ref={costsRef} /></div></Card>
      </Grid>
      <Card>
        <CardTitle>Сравнение всех периодов</CardTitle>
        <div style={{ height: 220 }}><canvas ref={compRef} /></div>
      </Card>
      <Card>
        <CardTitle>Комментарий</CardTitle>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text2)' }}>
          Выручка <strong style={{ color: 'var(--text)' }}>{fmt(f.revenue)} тыс. руб.</strong> Себестоимость составляет {pct(f.revenue > 0 ? f.cogs / f.revenue * 100 : 0)} от выручки.
          Валовая рентабельность: {pct(m.gross_margin)}. Операционная маржа (EBIT): {pct(m.ebit_margin)}.
          Чистая прибыль: <strong style={{ color: m.net_profit >= 0 ? 'var(--green)' : 'var(--orange)' }}>{fmt(m.net_profit)} тыс. руб.</strong>
        </div>
      </Card>
    </div>
  )
}
