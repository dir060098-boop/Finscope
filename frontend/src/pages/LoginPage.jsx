import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, useStore } from '../store'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth, loadData } = useStore()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api.post('/auth/login', form)
      setAuth(null, r.data.access_token)
      await loadData()
      nav('/')
    } catch {
      toast.error('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>FS</div>
        <h1 style={styles.h1}>FinScope</h1>
        <p style={styles.sub}>Финансовый анализ для учредителей</p>
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="your@email.com" />
          <label style={styles.label}>Пароль</label>
          <input style={styles.input} type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="••••••••" />
          <button style={styles.btn} disabled={loading}>{loading ? 'Вход...' : 'Войти'}</button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 16 }}>
          Нет аккаунта? <Link to="/register" style={{ color: 'var(--blue)' }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  bg: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', padding: 16 },
  card: { background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '40px 36px', width: '100%', maxWidth: 400, textAlign: 'center' },
  logo: { width: 48, height: 48, background: 'var(--blue)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 13, color: 'var(--text2)', marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' },
  label: { fontSize: 12, color: 'var(--text2)', fontWeight: 500 },
  input: { padding: '9px 12px', fontSize: 14, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' },
  btn: { marginTop: 8, padding: '11px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 600 },
}
