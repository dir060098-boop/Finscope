export const fmt = (v) => Math.round(v || 0).toLocaleString('ru')
export const pct = (v) => `${(v || 0).toFixed(1)}%`
export const f2 = (v) => (v || 0).toFixed(2)

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--rl)', padding: '18px 20px', marginBottom: 14,
      ...style
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children }) {
  return <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{children}</div>
}

export function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text)', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function Badge({ status }) {
  const map = {
    good: { bg: '#E1F5EE', color: '#0F6E56', label: 'Норма' },
    warn: { bg: '#FAEEDA', color: '#854F0B', label: 'Допустимо' },
    bad: { bg: '#FCEBEB', color: '#A32D2D', label: 'Риск' },
  }
  const s = map[status] || map.bad
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

export function Grid({ cols = 2, children, style = {} }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14, marginBottom: 14, ...style }}>
      {children}
    </div>
  )
}

export function assess(val, low, high) {
  if (high !== undefined) return val >= low && val <= high ? 'good' : val >= low * 0.7 ? 'warn' : 'bad'
  return val >= low ? 'good' : val >= low * 0.7 ? 'warn' : 'bad'
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 10px', paddingBottom: 8, borderBottom: '0.5px solid var(--border)' }}>
      {children}
    </div>
  )
}

export function RecItem({ children, status = 'warn' }) {
  const colors = { good: 'var(--green)', warn: 'var(--amber)', bad: 'var(--orange)' }
  return (
    <div style={{ padding: '10px 14px', borderLeft: `3px solid ${colors[status]}`, marginBottom: 8, borderRadius: '0 var(--r) var(--r) 0', background: 'var(--bg2)', fontSize: 13, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}
