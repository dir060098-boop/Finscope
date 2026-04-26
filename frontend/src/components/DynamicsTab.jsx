import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useStore } from '../store'
import { Card, CardTitle, Grid, fmt } from './ui'
Chart.register(...registerables)

export default function DynamicsTab() {
  const { periods } = useStore()
  const revRef = useRef(); const liqRef = useRef()
  const roeRef = useRef(); const autoRef = useRef()
  const charts = useRef({})

  useEffect(() => {
    if (periods.length === 0) return
    const labels = periods.map(p => p.name)
    const ms = periods.map(p => p.metrics || {})
    const destroy = k => { if (charts.current[k]) { charts.current[k].destroy(); delete charts.current[k] } }

    destroy('rev')
    if (revRef.current) charts.current.rev = new Chart(revRef.current, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Выручка', data: periods.map(p => Math.round(p.financials?.revenue||0)), borderColor: '#3266ad', backgroundColor: '#3266ad18', fill: true, tension: 0.3, pointRadius: 4 },
        { label: 'Чистая прибыль', data: ms.map(m => Math.round(m.net_profit||0)), borderColor: '#1D9E75', backgroundColor: '#1D9E7518', fill: true, tension: 0.3, pointRadius: 4 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => fmt(v) } } } }
    })

    destroy('liq')
    if (liqRef.current) charts.current.liq = new Chart(liqRef.current, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Текущая ликвидность', data: ms.map(m => +((m.current_ratio||0).toFixed(2))), borderColor: '#3266ad', tension: 0.3, pointRadius: 4 },
        { label: 'Норма 1.5', data: ms.map(() => 1.5), borderColor: '#1D9E7566', borderDash: [4,4], pointRadius: 0 },
        { label: 'Быстрая', data: ms.map(m => +((m.quick_ratio||0).toFixed(2))), borderColor: '#BA7517', tension: 0.3, pointRadius: 4 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    })

    destroy('roe')
    if (roeRef.current) charts.current.roe = new Chart(roeRef.current, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'ROE %', data: ms.map(m => +((m.roe||0).toFixed(1))), borderColor: '#533490', tension: 0.3, pointRadius: 4 },
        { label: 'ROA %', data: ms.map(m => +((m.roa||0).toFixed(1))), borderColor: '#1D9E75', tension: 0.3, pointRadius: 4 },
        { label: 'ROS %', data: ms.map(m => +((m.net_margin||0).toFixed(1))), borderColor: '#D85A30', tension: 0.3, pointRadius: 4 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
    })

    destroy('auto')
    if (autoRef.current) charts.current.auto = new Chart(autoRef.current, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Автономия', data: ms.map(m => +((m.autonomy||0).toFixed(2))), borderColor: '#3266ad', tension: 0.3, pointRadius: 4, fill: false },
        { label: 'Норматив 0.5', data: ms.map(() => 0.5), borderColor: '#1D9E7566', borderDash: [4,4], pointRadius: 0 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { min: 0, max: 1 } } }
    })

    return () => { Object.values(charts.current).forEach(c => c.destroy()); charts.current = {} }
  }, [periods.map(p => p.id).join(',')])

  if (periods.length < 2) return (
    <Card>
      <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text2)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📈</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Нужно минимум 2 периода</div>
        <div style={{ fontSize: 13 }}>Добавьте ещё один период во вкладке «Ввод данных»</div>
      </div>
    </Card>
  )

  return (
    <div>
      <Card><CardTitle>Выручка и чистая прибыль по периодам</CardTitle><div style={{ height: 240 }}><canvas ref={revRef} /></div></Card>
      <Grid cols={2}>
        <Card><CardTitle>Ликвидность по периодам</CardTitle><div style={{ height: 200 }}><canvas ref={liqRef} /></div></Card>
        <Card><CardTitle>Рентабельность по периодам, %</CardTitle><div style={{ height: 200 }}><canvas ref={roeRef} /></div></Card>
      </Grid>
      <Card><CardTitle>Финансовая устойчивость (автономия)</CardTitle><div style={{ height: 200 }}><canvas ref={autoRef} /></div></Card>
    </div>
  )
}
