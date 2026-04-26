import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { useStore, api } from '../store'
import { Card, CardTitle, MetricCard, Grid, fmt, pct, f2 } from './ui'
Chart.register(...registerables)

export default function ScenariosTab() {
  const { periods, currentPeriodId } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  const [params, setParams] = useState({ revenue_change_pct: 0, cogs_change_pct: 0, opex_change_pct: 0, extra_loan: 0, loan_rate_pct: 15 })
  const [result, setResult] = useState(null)
  const scenRef = useRef()
  const charts = useRef({})

  const recalc = async (p) => {
    if (!period) return
    try {
      const r = await api.post('/scenarios', { period_id: period.id, ...p })
      setResult(r.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { if (period) recalc(params) }, [period?.id])

  const update = (key, val) => {
    const np = { ...params, [key]: parseFloat(val) }
    setParams(np)
    recalc(np)
  }

  useEffect(() => {
    if (!result) return
    if (charts.current.scen) charts.current.scen.destroy()
    const b = result.base; const s = result.scenario
    if (scenRef.current) {
      charts.current.scen = new Chart(scenRef.current, {
        type: 'bar',
        data: {
          labels: ['Выручка', 'Вал. прибыль', 'EBIT', 'Чистая прибыль'],
          datasets: [
            { label: 'Факт', data: [b.revenue, b.gross_profit, b.ebit, b.net_profit].map(v => Math.round(v||0)), backgroundColor: '#3266ad', borderRadius: 4 },
            { label: 'Сценарий', data: [s.revenue, s.gross_profit, s.ebit, s.net_profit].map(v => Math.round(v||0)), backgroundColor: '#BA7517', borderRadius: 4 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => fmt(v) } } } }
      })
    }
  }, [result])

  const sliders = [
    { key: 'revenue_change_pct', label: 'Изменение выручки', min: -50, max: 50, step: 1, fmt: v => (v > 0 ? '+' : '') + v + '%' },
    { key: 'cogs_change_pct', label: 'Изменение себестоимости', min: -30, max: 30, step: 1, fmt: v => (v > 0 ? '+' : '') + v + '%' },
    { key: 'opex_change_pct', label: 'Изменение операц. расходов', min: -30, max: 30, step: 1, fmt: v => (v > 0 ? '+' : '') + v + '%' },
    { key: 'extra_loan', label: 'Дополнительный кредит', min: 0, max: 20000, step: 500, fmt: v => fmt(v) + ' тыс.' },
    { key: 'loan_rate_pct', label: 'Ставка по кредиту', min: 5, max: 30, step: 1, fmt: v => v + '%' },
  ]

  return (
    <div>
      <Card>
        <CardTitle>Сценарный анализ — что если?</CardTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Двигайте слайдеры — результаты пересчитываются автоматически</p>
        {sliders.map(sl => (
          <div key={sl.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: 'var(--text2)', minWidth: 210, flexShrink: 0 }}>{sl.label}</label>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={params[sl.key]}
              onChange={e => update(sl.key, e.target.value)}
              style={{ flex: 1, accentColor: 'var(--blue)', height: 4 }} />
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: 'right', color: 'var(--blue)' }}>{sl.fmt(params[sl.key])}</span>
          </div>
        ))}
      </Card>

      {result && (
        <>
          <Grid cols={4}>
            {[
              { label: 'Выручка', b: result.base.revenue, s: result.scenario.revenue, fmt: v => fmt(v) },
              { label: 'Чистая прибыль', b: result.base.net_profit, s: result.scenario.net_profit, fmt: v => fmt(v) },
              { label: 'ROE', b: result.base.roe, s: result.scenario.roe, fmt: v => pct(v) },
              { label: 'Ликвидность', b: result.base.current_ratio, s: result.scenario.current_ratio, fmt: v => f2(v) },
            ].map((item, i) => {
              const up = item.s >= item.b
              return <MetricCard key={i} label={item.label} value={item.fmt(item.s)}
                sub={up ? '▲ лучше факта' : '▼ хуже факта'} color={up ? 'var(--green)' : 'var(--orange)'} />
            })}
          </Grid>

          <Grid cols={2}>
            <Card>
              <CardTitle>Факт vs сценарий</CardTitle>
              <div style={{ height: 240 }}><canvas ref={scenRef} /></div>
            </Card>
            <Card>
              <CardTitle>Влияние на коэффициенты</CardTitle>
              {[
                { n: 'Рентабельность продаж', b: pct(result.base.net_margin), s: pct(result.scenario.net_margin), up: result.scenario.net_margin >= result.base.net_margin },
                { n: 'ROE', b: pct(result.base.roe), s: pct(result.scenario.roe), up: result.scenario.roe >= result.base.roe },
                { n: 'Текущая ликвидность', b: f2(result.base.current_ratio), s: f2(result.scenario.current_ratio), up: result.scenario.current_ratio >= result.base.current_ratio },
                { n: 'Автономия', b: pct(result.base.autonomy*100), s: pct(result.scenario.autonomy*100), up: result.scenario.autonomy >= result.base.autonomy },
                { n: 'FCF', b: fmt(result.base.fcf), s: fmt(result.scenario.fcf), up: result.scenario.fcf >= result.base.fcf },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ flex: 1, color: 'var(--text2)' }}>{r.n}</span>
                  <span style={{ color: 'var(--text3)', textDecoration: 'line-through', fontSize: 12 }}>{r.b}</span>
                  <span style={{ fontWeight: 600 }}>→ {r.s}</span>
                  <span style={{ color: r.up ? 'var(--green)' : 'var(--orange)', fontSize: 12 }}>{r.up ? '▲' : '▼'}</span>
                </div>
              ))}
            </Card>
          </Grid>
        </>
      )}
    </div>
  )
}
