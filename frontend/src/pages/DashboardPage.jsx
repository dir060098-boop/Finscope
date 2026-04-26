import { useEffect, useState } from 'react'
import { useStore, api } from '../store'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import PulseTab from '../components/PulseTab'
import PnlTab from '../components/PnlTab'
import RatiosTab from '../components/RatiosTab'
import CashflowTab from '../components/CashflowTab'
import DynamicsTab from '../components/DynamicsTab'
import ScenariosTab from '../components/ScenariosTab'
import AITab from '../components/AITab'
import InputTab from '../components/InputTab'

// register Chart.js
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const TABS = [
  { id: 'pulse', label: 'Пульс' },
  { id: 'pnl', label: 'ОПУ' },
  { id: 'ratios', label: 'Коэффициенты' },
  { id: 'cashflow', label: 'Кэш-флоу' },
  { id: 'dynamics', label: 'Динамика' },
  { id: 'scenarios', label: 'Сценарии' },
  { id: 'ai', label: 'AI-анализ' },
  { id: 'input', label: 'Ввод данных' },
]

export default function DashboardPage() {
  const { periods, currentPeriodId, loadData } = useStore()
  const [tab, setTab] = useState('pulse')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  const currentPeriod = periods.find(p => p.id === currentPeriodId)

  const downloadPdf = async () => {
    if (!currentPeriodId) return
    try {
      toast.loading('Генерация PDF...', { id: 'pdf' })
      const r = await api.get(`/periods/${currentPeriodId}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `FinScope_${currentPeriod?.name || 'report'}.pdf`
      a.click()
      toast.success('PDF готов', { id: 'pdf' })
    } catch {
      toast.error('Ошибка генерации PDF', { id: 'pdf' })
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)' }}>
      Загрузка данных...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg3)' }}>
      <Header onPdfClick={downloadPdf} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
        {/* Tab nav */}
        <div style={s.tabs}>
          {TABS.map(t => (
            <button key={t.id} style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* No periods state */}
        {periods.length === 0 && tab !== 'input' && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Нет данных</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Добавьте первый период с финансовыми данными</div>
            <button style={s.btnPrimary} onClick={() => setTab('input')}>Ввести данные →</button>
          </div>
        )}

        {/* Tabs */}
        {(periods.length > 0 || tab === 'input') && (
          <>
            {tab === 'pulse' && <PulseTab />}
            {tab === 'pnl' && <PnlTab />}
            {tab === 'ratios' && <RatiosTab />}
            {tab === 'cashflow' && <CashflowTab />}
            {tab === 'dynamics' && <DynamicsTab />}
            {tab === 'scenarios' && <ScenariosTab />}
            {tab === 'ai' && <AITab />}
            {tab === 'input' && <InputTab onSaved={() => setTab('pulse')} />}
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  tabs: { display: 'flex', gap: 3, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--rl)', padding: 4, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', color: 'var(--text2)', borderRadius: 10, whiteSpace: 'nowrap' },
  tabActive: { color: '#fff', background: 'var(--blue)' },
  btnPrimary: { padding: '10px 24px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 600 },
}
