import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useStore } from '../store'
import { Card, CardTitle, MetricCard, Grid, fmt } from './ui'
Chart.register(...registerables)

export default function CashflowTab() {
  const { periods, currentPeriodId } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  const cfRef = useRef(); const barRef = useRef()
  const charts = useRef({})

  useEffect(() => {
    if (!period) return
    const m = period.metrics || {}
    const f = period.financials || {}
    const destroy = k => { if (charts.current[k]) { charts.current[k].destroy(); delete charts.current[k] } }

    destroy('cf')
    if (cfRef.current) charts.current.cf = new Chart(cfRef.current, {
      type: 'bar',
      data: {
        labels: ['Операционный', 'Инвестиционный', 'Финансовый'],
        datasets: [
          { label: 'Поступления', data: [f.cf_op_in, f.cf_inv_in, f.cf_fin_in].map(v => Math.round(v||0)), backgroundColor: '#1D9E75', borderRadius: 4 },
          { label: 'Выплаты', data: [-(f.cf_op_out||0), -(f.cf_inv_out||0), -(f.cf_fin_out||0)].map(v => Math.round(v)), backgroundColor: '#D85A30', borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => fmt(v) } } } }
    })

    destroy('bar')
    const vals = [m.cf_operating, m.cf_investing, m.cf_financing, m.cf_net, m.fcf].map(v => Math.round(v||0))
    if (barRef.current) charts.current.bar = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: ['Опер. CF', 'Инвест. CF', 'Фин. CF', 'Чистый CF', 'FCF'],
        datasets: [{ data: vals, backgroundColor: vals.map(v => v >= 0 ? '#1D9E75' : '#D85A30'), borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmt(v) } } } }
    })

    return () => { Object.values(charts.current).forEach(c => c.destroy()); charts.current = {} }
  }, [period?.id])

  if (!period) return null
  const m = period.metrics || {}
  const f = period.financials || {}

  return (
    <div>
      <Grid cols={3}>
        <MetricCard label="Операционный CF" value={fmt(m.cf_operating)} sub="тыс. руб." color={m.cf_operating >= 0 ? 'var(--green)' : 'var(--orange)'} />
        <MetricCard label="Инвестиционный CF" value={fmt(m.cf_investing)} sub="тыс. руб." />
        <MetricCard label="Свободный CF (FCF)" value={fmt(m.fcf)} sub={m.fcf >= 0 ? 'положительный' : 'требует внимания'} color={m.fcf >= 0 ? 'var(--green)' : 'var(--orange)'} />
      </Grid>

      <Grid cols={2}>
        <Card><CardTitle>Поступления и выплаты</CardTitle><div style={{ height: 240 }}><canvas ref={cfRef} /></div></Card>
        <Card><CardTitle>Чистые потоки</CardTitle><div style={{ height: 240 }}><canvas ref={barRef} /></div></Card>
      </Grid>

      <Card>
        <CardTitle>Расчёт свободного денежного потока (FCF)</CardTitle>
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          {[
            { label: 'Операционный денежный поток', val: fmt(m.cf_operating), pos: m.cf_operating >= 0 },
            { label: '− CAPEX (капиталовложения)', val: '−' + fmt(f.capex || 0), pos: false, neg: true },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>{r.label}</span>
              <strong style={{ color: r.neg ? 'var(--orange)' : r.pos ? 'var(--green)' : 'var(--text)' }}>{r.val}</strong>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontWeight: 600, fontSize: 14 }}>
            <span>Свободный денежный поток (FCF)</span>
            <span style={{ color: m.fcf >= 0 ? 'var(--green)' : 'var(--orange)' }}>{fmt(m.fcf)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            {m.fcf >= 0
              ? 'FCF положительный — компания генерирует свободные средства после инвестиций.'
              : 'FCF отрицательный — компания тратит на инвестиции больше, чем зарабатывает операционно. Требует внимания.'}
          </div>
        </div>
      </Card>
    </div>
  )
}
