import axios from 'axios'
import { create } from 'zustand'

const BASE = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Global store ────────────────────────────────────
export const useStore = create((set, get) => ({
  user: null,
  company: null,
  periods: [],
  currentPeriodId: null,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, company: null, periods: [], currentPeriodId: null })
  },

  loadData: async () => {
    const [userR, compR, perR] = await Promise.all([
      api.get('/auth/me'),
      api.get('/company'),
      api.get('/periods'),
    ])
    const periods = perR.data
    set({
      user: userR.data,
      company: compR.data,
      periods,
      currentPeriodId: periods.length > 0 ? periods[periods.length - 1].id : null
    })
  },

  getCurrentPeriod: () => {
    const { periods, currentPeriodId } = get()
    return periods.find(p => p.id === currentPeriodId) || null
  },

  setPeriod: (id) => set({ currentPeriodId: id }),

  refreshPeriods: async () => {
    const r = await api.get('/periods')
    set({ periods: r.data })
  },
}))
