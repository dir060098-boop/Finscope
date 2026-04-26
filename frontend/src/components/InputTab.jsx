import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore, api } from '../store'
import { Card, CardTitle, SectionTitle, Grid } from './ui'
import toast from 'react-hot-toast'

const DEFAULTS = {
  fixed_assets:10000, intangibles:2500, inventory:3200, receivables:4100, cash:1800, other_current:600,
  equity_share:5000, retained_earnings:6000, lt_loans:4500, lt_other:0, st_loans:2000, payables:3200, st_other:1500,
  revenue:28000, cogs:18000, selling_exp:2200, admin_exp:2000, interest_exp:680, tax:1024, depreciation:800, capex:1200,
  cf_op_in:27000, cf_op_out:22000, cf_inv_in:500, cf_inv_out:1700, cf_fin_in:2000, cf_fin_out:1500
}

function FInput({ label, field, form, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
      <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</label>
      <input type="number" value={form[field] ?? 0}
        onChange={e => onChange(field, parseFloat(e.target.value) || 0)}
        style={{ padding: '7px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }} />
    </div>
  )
}

export default function InputTab({ onSaved }) {
  const { periods, currentPeriodId, refreshPeriods, setPeriod } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  const [mode, setMode] = useState('manual')
  const [form, setForm] = useState({ ...DEFAULTS })
  const [meta, setMeta] = useState({ name: '', comment: '', period_type: 'annual', industry: 'general' })
  const [saving, setSaving] = useState(false)
  const [uploadPreview, setUploadPreview] = useState(null)

  useEffect(() => {
    if (period?.financials) {
      const fin = period.financials
      setForm(Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, fin[k] ?? 0])))
      setMeta({ name: period.name, comment: period.comment || '', period_type: period.period_type, industry: 'general' })
    } else {
      setForm({ ...DEFAULTS })
      setMeta({ name: '', comment: '', period_type: 'annual', industry: 'general' })
    }
  }, [currentPeriodId])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { financials: form, comment: meta.comment }
      if (period) {
        if (meta.name) payload.name = meta.name
        await api.put(`/periods/${period.id}`, payload)
        toast.success('Данные сохранены')
      } else {
        const r = await api.post('/periods', { name: meta.name || 'Новый период', period_type: meta.period_type, comment: meta.comment, financials: form })
        await refreshPeriods()
        setPeriod(r.data.id)
        toast.success('Период создан')
      }
      await refreshPeriods()
      onSaved?.()
    } catch {
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await api.post('/import/preview', fd)
      setUploadPreview(r.data)
      toast.success(`Распознано ${r.data.mapped_fields} полей`)
    } catch {
      toast.error('Ошибка чтения файла')
    }
  }, [])

  const applyUpload = () => {
    if (!uploadPreview?.data) return
    const d = uploadPreview.data
    setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(d).filter(([k]) => k in DEFAULTS)) }))
    setMode('manual')
    toast.success('Данные загружены — проверьте и сохраните')
  }

  const downloadTemplate = () => {
    const lines = ['показатель,значение',
      'revenue,28000','cogs,18000','selling_exp,2200','admin_exp,2000','interest_exp,680','tax,1024','depreciation,800','capex,1200',
      'fixed_assets,10000','intangibles,2500','inventory,3200','receivables,4100','cash,1800','other_current,600',
      'equity_share,5000','retained_earnings,6000','lt_loans,4500','lt_other,0','st_loans,2000','payables,3200','st_other,1500',
      'cf_op_in,27000','cf_op_out,22000','cf_inv_in,500','cf_inv_out,1700','cf_fin_in,2000','cf_fin_out,1500']
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'finscope_template.csv'; a.click()
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }, multiple: false })

  const inp = (label, field) => <FInput key={field} label={label} field={field} form={form} onChange={set} />

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['manual', 'upload'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, border: `0.5px solid ${mode === m ? 'var(--blue)' : 'var(--border2)'}`, borderRadius: 'var(--r)', background: mode === m ? '#3266ad18' : 'none', color: mode === m ? 'var(--blue)' : 'var(--text2)' }}>
            {m === 'manual' ? 'Ручной ввод' : 'Загрузить Excel / CSV'}
          </button>
        ))}
      </div>

      {mode === 'upload' && (
        <Card>
          <CardTitle>Загрузка файла</CardTitle>
          <div {...getRootProps()} style={{ border: `1.5px dashed ${isDragActive ? 'var(--blue)' : 'var(--border2)'}`, borderRadius: 'var(--rl)', padding: '32px', textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#3266ad08' : 'none', transition: 'all .15s' }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{isDragActive ? 'Отпустите файл' : 'Перетащите файл или нажмите для выбора'}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Excel (.xlsx) или CSV (.csv)</div>
          </div>
          <button onClick={downloadTemplate} style={{ marginTop: 12, fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Скачать шаблон CSV
          </button>

          {uploadPreview && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Распознано {uploadPreview.mapped_fields} из {uploadPreview.total_fields} полей</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {Object.entries(uploadPreview.preview).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 11, background: 'var(--bg2)', border: '0.5px solid var(--border)', padding: '3px 8px', borderRadius: 6 }}>
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>
              <button onClick={applyUpload} style={{ padding: '9px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600 }}>
                Применить данные →
              </button>
            </div>
          )}
        </Card>
      )}

      {mode === 'manual' && (
        <>
          <Card>
            <CardTitle>Настройки периода</CardTitle>
            <Grid cols={3}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 5 }}>Название периода</label>
                <input value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} placeholder="2024 год / Q1 2024"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 5 }}>Тип периода</label>
                <select value={meta.period_type} onChange={e => setMeta(m => ({ ...m, period_type: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }}>
                  <option value="annual">Год</option>
                  <option value="quarter">Квартал</option>
                  <option value="month">Месяц</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 5 }}>Отрасль</label>
                <select value={meta.industry} onChange={e => setMeta(m => ({ ...m, industry: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }}>
                  <option value="general">Общий</option>
                  <option value="trade">Торговля</option>
                  <option value="manufacturing">Производство</option>
                  <option value="service">Услуги</option>
                  <option value="construction">Строительство</option>
                </select>
              </div>
            </Grid>
            <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, display: 'block', marginBottom: 5 }}>Комментарий бухгалтера (контекст для AI)</label>
            <textarea value={meta.comment} onChange={e => setMeta(m => ({ ...m, comment: e.target.value }))}
              placeholder="Опишите ключевые события: крупные сделки, изменения в структуре, форс-мажоры..."
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }} />
          </Card>

          <Grid cols={2}>
            <Card>
              <CardTitle>Баланс — активы (тыс. руб.)</CardTitle>
              <SectionTitle>Внеоборотные активы</SectionTitle>
              <Grid cols={2} style={{ gap: 8 }}>
                {inp('Основные средства', 'fixed_assets')}
                {inp('НМА и прочие внеоборотные', 'intangibles')}
              </Grid>
              <SectionTitle>Оборотные активы</SectionTitle>
              <Grid cols={2} style={{ gap: 8 }}>
                {inp('Запасы', 'inventory')}
                {inp('Дебиторская задолженность', 'receivables')}
                {inp('Денежные средства', 'cash')}
                {inp('Прочие оборотные', 'other_current')}
              </Grid>
            </Card>
            <Card>
              <CardTitle>Баланс — пассивы (тыс. руб.)</CardTitle>
              <SectionTitle>Капитал и резервы</SectionTitle>
              <Grid cols={2} style={{ gap: 8 }}>
                {inp('Уставный + добавочный кап.', 'equity_share')}
                {inp('Нераспределённая прибыль', 'retained_earnings')}
              </Grid>
              <SectionTitle>Долгосрочные обязательства</SectionTitle>
              <Grid cols={2} style={{ gap: 8 }}>
                {inp('Долгосрочные кредиты', 'lt_loans')}
                {inp('Прочие долгосрочные', 'lt_other')}
              </Grid>
              <SectionTitle>Краткосрочные обязательства</SectionTitle>
              <Grid cols={2} style={{ gap: 8 }}>
                {inp('Краткосрочные займы', 'st_loans')}
                {inp('Кредиторская задолженность', 'payables')}
                {inp('Прочие краткосрочные', 'st_other')}
              </Grid>
            </Card>
          </Grid>

          <Card>
            <CardTitle>Отчёт о прибылях и убытках (тыс. руб.)</CardTitle>
            <Grid cols={4} style={{ gap: 8 }}>
              {inp('Выручка', 'revenue')}
              {inp('Себестоимость', 'cogs')}
              {inp('Коммерческие расходы', 'selling_exp')}
              {inp('Управленческие расходы', 'admin_exp')}
              {inp('Проценты к уплате', 'interest_exp')}
              {inp('Налог на прибыль', 'tax')}
              {inp('Амортизация (для FCF)', 'depreciation')}
              {inp('CAPEX (капвложения)', 'capex')}
            </Grid>
          </Card>

          <Card>
            <CardTitle>Кэш-флоу (тыс. руб.)</CardTitle>
            <Grid cols={3} style={{ gap: 8 }}>
              {inp('Опер. поступления', 'cf_op_in')}
              {inp('Опер. выплаты', 'cf_op_out')}
              {inp('Инвест. поступления', 'cf_inv_in')}
              {inp('Инвест. выплаты', 'cf_inv_out')}
              {inp('Фин. поступления', 'cf_fin_in')}
              {inp('Фин. выплаты', 'cf_fin_out')}
            </Grid>
          </Card>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setForm({ ...DEFAULTS })}
              style={{ padding: '9px 18px', fontSize: 13, background: 'none', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--text2)' }}>
              Сбросить
            </button>
            <button onClick={save} disabled={saving}
              style={{ padding: '10px 28px', fontSize: 14, fontWeight: 600, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить и рассчитать →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
