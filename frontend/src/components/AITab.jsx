import { useState, useRef, useEffect } from 'react'
import { useStore, api } from '../store'
import { Card, CardTitle } from './ui'
import toast from 'react-hot-toast'

export default function AITab() {
  const { periods, currentPeriodId } = useStore()
  const period = periods.find(p => p.id === currentPeriodId)
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const chatEndRef = useRef()

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const runAnalysis = async () => {
    if (!period) return
    setLoading(true)
    setAnalysis('')
    try {
      const r = await api.post('/ai/analysis', { period_id: period.id })
      setAnalysis(r.data.analysis)
    } catch {
      toast.error('Ошибка AI анализа. Проверьте ANTHROPIC_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || !period) return
    setChatInput('')
    const userMsg = { role: 'user', content: msg }
    setChatHistory(h => [...h, userMsg])
    setChatLoading(true)
    try {
      const r = await api.post('/ai/chat', {
        period_id: period.id,
        message: msg,
        history: chatHistory.slice(-8)
      })
      setChatHistory(h => [...h, { role: 'assistant', content: r.data.reply }])
    } catch {
      setChatHistory(h => [...h, { role: 'assistant', content: 'Ошибка подключения к AI.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const suggestions = [
    'Какие главные риски у компании прямо сейчас?',
    'Как улучшить рентабельность?',
    'Что делать с дебиторской задолженностью?',
    'Можем ли мы взять кредит безопасно?',
  ]

  return (
    <div>
      <Card>
        <CardTitle>Полный AI-анализ для учредителя</CardTitle>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
          Claude проанализирует все финансовые показатели и подготовит структурированный отчёт
        </p>
        <button onClick={runAnalysis} disabled={loading || !period}
          style={{ padding: '10px 24px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Анализирую...' : '🤖 Запустить анализ'}
        </button>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, color: 'var(--text2)', fontSize: 13 }}>
            <span>Claude изучает финансовые данные...</span>
          </div>
        )}

        {analysis && (
          <div style={{ marginTop: 20, background: 'var(--bg2)', borderRadius: 'var(--rl)', padding: '20px 22px', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            {analysis}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Чат по данным — задайте вопрос</CardTitle>

        {/* Suggestions */}
        {chatHistory.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setChatInput(s)}
                style={{ padding: '6px 12px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 20, background: 'none', color: 'var(--text2)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat history */}
        {chatHistory.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 14, padding: '4px 0' }}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ marginBottom: 12, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <div style={{
                  display: 'inline-block', maxWidth: '80%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '2px 14px 14px 14px',
                  background: msg.role === 'user' ? 'var(--blue)' : 'var(--bg2)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'left'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '8px 0', color: 'var(--text3)', fontSize: 13 }}>
                <span>●</span><span>●</span><span>●</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
            placeholder="Спросите о любом показателе, тренде или решении..."
            disabled={chatLoading || !period}
            style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--text)', outline: 'none' }}
          />
          <button onClick={sendChat} disabled={chatLoading || !chatInput.trim() || !period}
            style={{ padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, opacity: chatLoading ? 0.6 : 1 }}>
            →
          </button>
        </div>
      </Card>
    </div>
  )
}
