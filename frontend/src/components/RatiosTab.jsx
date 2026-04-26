import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useStore } from '../store'
import { Card, CardTitle, Badge, Grid, f2, pct, assess } from './ui'
Chart.register(...registerables)

const TH = ({ children }) => <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', borderBottom: '0.5px solid var(--border)' }}>{children}</th>
const TD = ({ children, bold }) => <td style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--border)', fontWeight: bold ? 600 : 400 }}>{children}</td>

function Row({ name, val, norm, st }) {
  return (
    <tr>
      <TD>{name}</TD>
      <TD bold>{val}</TD>
      <TD><span style={{ color: 'var(--text2)', fontSize: 12 }}>{norm}</span></TD>
      <TD><Badge status={st} /></TD>
    </tr>
  )
}

export default function RatiosTab() {
  const { periods, currentPeriodId } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  const radarRef = useRef()
  const charts = useRef({})

  useEffect(() => {
    if (!period) return
    const m = period.metrics || {}
    if (charts.current.radar) charts.current.radar.destroy()
    if (radarRef.current) {
      charts.current.radar = new Chart(radarRef.current, {
        type: 'radar',
        data: {
          labels: ['Тек. ликв./2', 'Быстрая/1', 'Автономия/0.7', 'Покрытие ВА/1.2', 'Оборач./1.5'],
          datasets: [
            { label: 'Факт', data: [Math.min((m.current_ratio||0)/2,2), Math.min(m.quick_ratio||0,2), Math.min((m.autonomy||0)/0.7,2), Math.min((m.fixed_assets_coverage||0)/1.2,2), Math.min((m.asset_turnover||0)/1.5,2)], backgroundColor: '#3266ad22', borderColor: '#3266ad', pointBackgroundColor: '#3266ad', borderWidth: 2 },
            { label: 'Норма', data: [1,1,1,1,1], backgroundColor: 'transparent', borderColor: '#1D9E7588', borderDash: [4,4], pointRadius: 0, borderWidth: 1 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 2, ticks: { stepSize: 0.5, font: { size: 10 } } } }, plugins: { legend: { position: 'top' } } }
      })
    }
    return () => { if (charts.current.radar) charts.current.radar.destroy() }
  }, [period?.id])

  if (!period) return null
  const m = period.metrics || {}

  const tblStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }

  return (
    <Grid cols={2}>
      <div>
        <Card>
          <CardTitle>Ликвидность</CardTitle>
          <table style={tblStyle}><thead><tr><TH>Показатель</TH><TH>Значение</TH><TH>Норматив</TH><TH>Статус</TH></tr></thead>
            <tbody>
              <Row name="Текущая ликвидность" val={f2(m.current_ratio)} norm="1.5–2.5" st={assess(m.current_ratio,1.5,2.5)} />
              <Row name="Быстрая ликвидность" val={f2(m.quick_ratio)} norm="0.7–1.0" st={assess(m.quick_ratio,0.7,1.5)} />
              <Row name="Абсолютная ликвидность" val={f2(m.absolute_ratio)} norm="0.1–0.3" st={assess(m.absolute_ratio,0.1,0.5)} />
            </tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Финансовая устойчивость</CardTitle>
          <table style={tblStyle}><thead><tr><TH>Показатель</TH><TH>Значение</TH><TH>Норматив</TH><TH>Статус</TH></tr></thead>
            <tbody>
              <Row name="Коэффициент автономии" val={f2(m.autonomy)} norm="≥ 0.5" st={assess(m.autonomy,0.5)} />
              <Row name="Долг / Капитал" val={f2(m.debt_to_equity)} norm="≤ 1.0" st={m.debt_to_equity<=1?'good':m.debt_to_equity<=1.5?'warn':'bad'} />
              <Row name="Покрытие внеоб. активов" val={f2(m.fixed_assets_coverage)} norm="≥ 1.0" st={assess(m.fixed_assets_coverage,1)} />
              <Row name="Обеспеченность СОС" val={f2(m.working_capital_ratio)} norm="≥ 0.1" st={assess(m.working_capital_ratio,0.1)} />
            </tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Деловая активность</CardTitle>
          <table style={tblStyle}><thead><tr><TH>Показатель</TH><TH>Значение</TH><TH>Норматив</TH><TH>Статус</TH></tr></thead>
            <tbody>
              <Row name="Оборачиваемость активов" val={f2(m.asset_turnover)+'x'} norm="> 1.0" st={assess(m.asset_turnover,1)} />
              <Row name="Дни дебиторки" val={Math.round(m.receivables_days||0)+' дн.'} norm="< 60 дн." st={m.receivables_days<=60?'good':m.receivables_days<=90?'warn':'bad'} />
              <Row name="Дни запасов" val={Math.round(m.inventory_days||0)+' дн.'} norm="< 60 дн." st={m.inventory_days<=60?'good':m.inventory_days<=90?'warn':'bad'} />
              <Row name="Дни кредиторки" val={Math.round(m.payables_days||0)+' дн.'} norm="30–90 дн." st={(m.payables_days>=30&&m.payables_days<=90)?'good':'warn'} />
            </tbody>
          </table>
        </Card>
      </div>
      <div>
        <Card>
          <CardTitle>Радар коэффициентов</CardTitle>
          <div style={{ height: 300 }}><canvas ref={radarRef} /></div>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7, color: 'var(--text2)' }}>
            Текущая ликвидность {f2(m.current_ratio)} — {m.current_ratio>=1.5?'в норме':'ниже нормы'}.{' '}
            Автономия {pct(m.autonomy*100)} — {m.autonomy>=0.5?'финансовая независимость обеспечена':'высокая зависимость от заёмных источников'}.{' '}
            ДЗ оборачивается за {Math.round(m.receivables_days||0)} дней, запасы — за {Math.round(m.inventory_days||0)} дней.
          </div>
        </Card>
        <Card>
          <CardTitle>Модель Дюпона — разложение ROE</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '14px', background: 'var(--bg2)', borderRadius: 'var(--r)', fontSize: 14 }}>
            {[
              { val: pct(m.net_margin), lbl: 'Рент. продаж', color: '#3266ad' },
              { op: '×' },
              { val: f2(m.asset_turnover), lbl: 'Оборач. активов', color: '#1D9E75' },
              { op: '×' },
              { val: f2(m.financial_leverage), lbl: 'Фин. леверидж', color: '#BA7517' },
              { op: '=' },
              { val: pct(m.roe), lbl: 'ROE', color: '#3266ad', highlight: true },
            ].map((item, i) => item.op
              ? <span key={i} style={{ fontSize: 20, color: 'var(--text3)' }}>{item.op}</span>
              : <div key={i} style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--r)', border: item.highlight ? `2px solid ${item.color}` : '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{item.lbl}</div>
                </div>
            )}
          </div>
        </Card>
      </div>
    </Grid>
  )
}
