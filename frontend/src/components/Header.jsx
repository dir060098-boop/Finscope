import { useState } from 'react'
import { useStore, api } from '../store'
import toast from 'react-hot-toast'

export default function Header({ onPdfClick }) {
  const { user, company, periods, currentPeriodId, setPeriod, logout, refreshPeriods } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')

  const addPeriod = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/periods', { name: newName.trim() })
      await refreshPeriods()
      setShowAdd(false)
      setNewName('')
      toast.success(`Период "${newName}" создан`)
    } catch {
      toast.error('Ошибка создания периода')
    }
  }

  return (
    <div style={s.hdr}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={s.logo}>FS</div>
        <div>
          <div style={s.title}>FinScope</div>
          <div style={s.sub}>{company?.name || '...'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <select style={s.select} value={currentPeriodId || ''}
          onChange={e => setPeriod(Number(e.target.value))}>
          {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {showAdd ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={s.input} autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPeriod()} placeholder="2024 год" />
            <button style={s.btnBlue} onClick={addPeriod}>OK</button>
            <button style={s.btnGhost} onClick={() => setShowAdd(false)}>✕</button>
          </div>
        ) : (
          <button style={s.btnGhost} onClick={() => setShowAdd(true)}>+ Период</button>
        )}

        <button style={s.btnBlue} onClick={onPdfClick}>PDF</button>

        <button style={s.btnGhost} onClick={() => { logout(); window.location.href = '/login' }}
          title={user?.email}>Выйти</button>
      </div>
    </div>
  )
}

const s = {
  hdr: { background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 },
  logo: { width: 32, height: 32, background: 'var(--blue)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  title: { fontSize: 15, fontWeight: 600 },
  sub: { fontSize: 11, color: 'var(--text2)' },
  select: { padding: '6px 10px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', minWidth: 130 },
  input: { padding: '6px 10px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', width: 120 },
  btnBlue: { padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)' },
  btnGhost: { padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'none', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--text)' },
}
