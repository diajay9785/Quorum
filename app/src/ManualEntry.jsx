import { useState } from 'react'
import { scoreTransaction } from './api'

const bandStyles = {
  approve: { bg: '#312e81', text: '#a5b4fc', border: '#818cf8' },
  escalate: { bg: '#422006', text: '#fbbf24', border: '#fbbf24' },
  block: { bg: '#4c1d24', text: '#fb7185', border: '#fb7185' },
}

const initialForm = {
  transaction_id: '', amount: '', merchant_category: 'dining',
  device_change_flag: 0, ip_change_flag: 0, hour_of_day: 12,
  user_txn_count_30d: '', time_since_last_txn_min: '',
}

const CATEGORIES = ['dining', 'grocery', 'fuel', 'electronics', 'travel', 'utilities', 'online_retail', 'jewelry', 'pharmacy', 'entertainment']

const inputStyle = {
  padding: '9px 12px', borderRadius: '8px', background: '#211f45',
  border: '0.5px solid #383465', color: '#f1f5f9', outline: 'none', fontSize: '13px',
}
const labelStyle = { fontSize: '11px', color: '#94a3b8' }

function ManualEntry() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const transaction = {
        transaction_id: parseInt(form.transaction_id, 10) || Date.now() % 1000000,
        amount: parseFloat(form.amount),
        merchant_category: form.merchant_category,
        device_change_flag: parseInt(form.device_change_flag, 10),
        ip_change_flag: parseInt(form.ip_change_flag, 10),
        hour_of_day: parseInt(form.hour_of_day, 10),
        user_txn_count_30d: parseInt(form.user_txn_count_30d, 10),
        time_since_last_txn_min: parseFloat(form.time_since_last_txn_min),
      }
      const response = await scoreTransaction(transaction)
      setResult(response)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#1a1838', borderRadius: '14px', padding: '24px', border: '0.5px solid #383465' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#f1f5f9', margin: '0 0 4px' }}>Try Your Own Transaction</h2>
      <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
        Type in any values you want — this is scored live by the real model, not a preset.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Transaction ID (optional)</label>
          <input type="number" value={form.transaction_id} onChange={(e) => handleChange('transaction_id', e.target.value)} placeholder="auto-generated" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Amount ($)</label>
          <input type="number" step="0.01" required value={form.amount} onChange={(e) => handleChange('amount', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Merchant Category</label>
          <select value={form.merchant_category} onChange={(e) => handleChange('merchant_category', e.target.value)} style={inputStyle}>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Hour of Day (0-23)</label>
          <input type="number" min="0" max="23" required value={form.hour_of_day} onChange={(e) => handleChange('hour_of_day', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Device Changed?</label>
          <select value={form.device_change_flag} onChange={(e) => handleChange('device_change_flag', e.target.value)} style={inputStyle}>
            <option value={0}>No</option><option value={1}>Yes</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>IP Changed?</label>
          <select value={form.ip_change_flag} onChange={(e) => handleChange('ip_change_flag', e.target.value)} style={inputStyle}>
            <option value={0}>No</option><option value={1}>Yes</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Transactions in Last 30 Days</label>
          <input type="number" required value={form.user_txn_count_30d} onChange={(e) => handleChange('user_txn_count_30d', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={labelStyle}>Minutes Since Last Transaction</label>
          <input type="number" step="0.1" required value={form.time_since_last_txn_min} onChange={(e) => handleChange('time_since_last_txn_min', e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" disabled={loading} style={{
          gridColumn: 'span 2', marginTop: '6px', padding: '11px', borderRadius: '8px',
          background: '#6366f1', color: '#f1f5f9', fontWeight: 500, fontSize: '14px',
          border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Scoring...' : 'Score This Transaction'}
        </button>
      </form>

      {error && <div style={{ marginTop: '12px', background: '#4c1d24', color: '#fecaca', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>Error: {error}</div>}

      {result && (
        <div style={{ marginTop: '12px', background: '#141330', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              background: bandStyles[result.band]?.bg, color: bandStyles[result.band]?.text,
              border: `0.5px solid ${bandStyles[result.band]?.border}`,
            }}>
              {result.band}
            </span>
            <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: '13px' }}>score: {result.score?.toFixed(4)}</span>
            {result.anomaly_flag && (
              <span style={{ padding: '3px 10px', borderRadius: '99px', background: '#3b0764', color: '#e9d5ff', fontSize: '10px', fontWeight: 600 }}>ANOMALY</span>
            )}
          </div>
          {result.explanation?.text_en && <p style={{ color: '#cbd5e1', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>{result.explanation.text_en}</p>}
        </div>
      )}
    </div>
  )
}

export default ManualEntry