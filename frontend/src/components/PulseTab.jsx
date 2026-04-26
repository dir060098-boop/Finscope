import { useStore } from '../store'
import { Card, CardTitle, MetricCard, Grid, RecItem, fmt, pct, f2 } from './ui'

export default function PulseTab() {
  const { periods, currentPeriodId } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  if (!period) return null
  const m = period.metrics || {}
  const f = period.financials || {}

  const ratingColor = m.health_score >= 4 ? 'var(--green)' : m.health_score >= 3 ? 'var(--amber)' : 'var(--orange)'

  const risks = []
  if (m.current_ratio < 1.0) risks.push({ t: 'Критическая ликвидность', d: `Текущая ликвидность ${f2(m.current_ratio)} — риск неплатёжеспособности`, s: 'bad' })
  else if (m.current_ratio < 1.5) risks.push({ t: 'Ликвидность ниже нормы', d: `Текущая ликвидность ${f2(m.current_ratio)}, норма 1.5+`, s: 'warn' })
  if (m.autonomy < 0.3) risks.push({ t: 'Высокая долговая нагрузка', d: `Автономия ${pct(m.autonomy * 100)} — критическая зависимость от кредиторов`, s: 'bad' })
  else if (m.autonomy < 0.5) risks.push({ t: 'Зависимость от заёмных средств', d: `Автономия ${pct(m.autonomy * 100)}, рекомендуется > 50%`, s: 'warn' })
  if (m.net_margin < 0) risks.push({ t: 'Убыточность', d: `Чистая прибыль отрицательная: ${fmt(m.net_profit)} тыс. руб.`, s: 'bad' })
  if (m.receivables_days > 90) risks.push({ t: 'Высокая дебиторская задолженность', d: `ДЗ оборачивается за ${Math.round(m.receivables_days)} дней`, s: 'warn' })
  if (m.fcf < 0) risks.push({ t: 'Отрицательный FCF', d: `Свободный денежный поток: ${fmt(m.fcf)} тыс. руб.`, s: 'warn' })
  if (risks.length === 0) risks.push({ t: 'Явных рисков не выявлено', d: 'Ключевые показатели в допустимых пределах', s: 'good' })

  const checks = [
    { label: 'Ликвидность ≥ 1.5', ok: m.current_ratio >= 1.5, val: f2(m.current_ratio) },
    { label: 'Автономия ≥ 50%', ok: m.autonomy >= 0.5, val: pct(m.autonomy * 100) },
    { label: 'ROS ≥ 10%', ok: m.net_margin >= 10, val: pct(m.net_margin) },
    { label: 'ROE ≥ 15%', ok: m.roe >= 15, val: pct(m.roe) },
    { label: 'Оборачиваемость ≥ 1', ok: m.asset_turnover >= 1, val: f2(m.asset_turnover) + 'x' },
  ]

  return (
    <div>
      {/* Traffic lights */}
      <Grid cols={3}>
        {[
          { label: 'Ликвидность', val: f2(m.current_ratio), ok: m.current_ratio >= 1.5, hint: 'норма > 1.5' },
          { label: 'Рентабельность продаж', val: pct(m.net_margin), ok: m.net_margin >= 10, hint: 'норма > 10%' },
          { label: 'Финансовая устойчивость', val: pct(m.autonomy * 100), ok: m.autonomy >= 0.5, hint: 'норма > 50%' },
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--rl)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.ok ? 'var(--green)' : 'var(--orange)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.hint}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 15, color: t.ok ? 'var(--green)' : 'var(--orange)' }}>{t.val}</div>
          </div>
        ))}
      </Grid>

      {/* Key metrics */}
      <Grid cols={4} style={{ marginBottom: 14 }}>
        <MetricCard label="Выручка" value={fmt(f.revenue)} sub="тыс. руб." />
        <MetricCard label="Чистая прибыль" value={fmt(m.net_profit)} sub="тыс. руб." color={m.net_profit >= 0 ? 'var(--green)' : 'var(--orange)'} />
        <MetricCard label="ROE" value={pct(m.roe)} sub="норма >15%" color={m.roe >= 15 ? 'var(--green)' : 'var(--orange)'} />
        <MetricCard label="Деньги на счету" value={fmt(f.cash)} sub="тыс. руб." />
      </Grid>

      <Grid cols={2}>
        <Card>
          <CardTitle>Финансовый рейтинг</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${ratingColor}`, background: ratingColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: ratingColor, flexShrink: 0 }}>
              {m.health_score}/5
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: ratingColor }}>{m.health_label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{m.health_score} из 5 показателей в норме</div>
            </div>
          </div>
          {checks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.ok ? 'var(--green)' : 'var(--orange)' }} />
              <span style={{ flex: 1, color: 'var(--text2)' }}>{c.label}</span>
              <span style={{ fontWeight: 600 }}>{c.val}</span>
              <span style={{ color: c.ok ? 'var(--green)' : 'var(--orange)', fontSize: 12 }}>{c.ok ? '✓' : '✗'}</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardTitle>Ключевые риски</CardTitle>
          {risks.map((r, i) => (
            <RecItem key={i} status={r.s}>
              <strong>{r.t}</strong><br />
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>{r.d}</span>
            </RecItem>
          ))}
        </Card>
      </Grid>

      <Card>
        <CardTitle>Резюме периода — {period.name}</CardTitle>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text2)' }}>
          Выручка <strong style={{ color: 'var(--text)' }}>{fmt(f.revenue)} тыс. руб.</strong>, чистая прибыль <strong style={{ color: m.net_profit >= 0 ? 'var(--green)' : 'var(--orange)' }}>{fmt(m.net_profit)} тыс. руб.</strong>{' '}
          Рентабельность продаж {pct(m.net_margin)}, ROE {pct(m.roe)}, ROA {pct(m.roa)}.{' '}
          Текущая ликвидность {f2(m.current_ratio)} — {m.current_ratio >= 1.5 ? 'платёжеспособность обеспечена' : 'требует контроля'}.{' '}
          Коэффициент автономии {pct(m.autonomy * 100)} — {m.autonomy >= 0.5 ? 'финансовая независимость сохранена' : 'высокая зависимость от заёмных источников'}.{' '}
          Свободный денежный поток FCF = <strong style={{ color: m.fcf >= 0 ? 'var(--green)' : 'var(--orange)' }}>{fmt(m.fcf)} тыс. руб.</strong>
        </div>
      </Card>
    </div>
  )
}
