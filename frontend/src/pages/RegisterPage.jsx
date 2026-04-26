import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, useStore } from '../store'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', company_name: '', industry: 'general' })
  const [loading, setLoading] = useState(false)
  const { setAuth, loadData } = useStore()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api.post('/auth/register', form)
      setAuth(null, r.data.access_token)
      await loadData()
      nav('/')
      toast.success('Добро пожаловать!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) })

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>FS</div>
        <h1 style={styles.h1}>Создать аккаунт</h1>
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>Ваше имя</label>
          <input style={styles.input} {...f('full_name')} required placeholder="Иванов Иван" />
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" {...f('email')} required placeholder="your@email.com" />
          <label style={styles.label}>Пароль</label>
          <input style={styles.input} type="password" {...f('password')} required placeholder="Минимум 8 символов" minLength={6} />
          <label style={styles.label}>Название компании</label>
          <input style={styles.input} {...f('company_name')} required placeholder="ООО Ромашка" />
          <label style={styles.label}>Отрасль</label>
          <select style={styles.input} {...f('industry')}>
            <option value="general">Общий / смешанный</option>
            <option value="trade">Торговля</option>
            <option value="manufacturing">Производство</option>
            <option value="service">Услуги</option>
            <option value="construction">Строительство</option>
          </select>
          <button style={styles.btn} disabled={loading}>{loading ? 'Создание...' : 'Зарегистрироваться'}</button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 16 }}>
          Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--blue)' }}>Войти</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  bg: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', padding: 16 },
  card: { background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '36px 32px', width: '100%', maxWidth: 420 },
  logo: { width: 44, height: 44, background: 'var(--blue)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 10 },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginTop: 4 },
  input: { padding: '9px 12px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' },
  btn: { marginTop: 12, padding: '11px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
