import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import axios from 'axios'

const API_BASE = 'https://quorum-j7zr.onrender.com'
const bandColors = { approve: '#a5b4fc', escalate: '#fbbf24', block: '#fb7185' }

function FlaggedQueue() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchFlagged() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers = { Authorization: `Bearer ${session?.access_token}` }
        const [escalated, blocked] = await Promise.all([
          axios.get(`${API_BASE}/transactions`, { params: { band: 'escalate' }, headers }),
          axios.get(`${API_BASE}/transactions`, { params: { band: 'block' }, headers }),
        ])
        const combined = [...escalated.data, ...blocked.data]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15)
        setRows(combined)
      } catch (err) {
        setError(err.response?.data?.detail || err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchFlagged()
  }, [])

  return (
    <div style={{ background: '#1a1838', borderRadius: '14px', padding: '24px', border: '0.5px solid #383465' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#f1f5f9', margin: '0 0 16px' }}>Flagged Queue</h2>
      {loading && <p style={{ color: '#64748b' }}>Loading...</p>}
      {error && <p style={{ color: '#fb7185', fontSize: '13px' }}>Error: {error}</p>}
      {!loading && !error && rows.length === 0 && <p style={{ color: '#64748b', fontSize: '13px' }}>No escalated or blocked transactions yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
        {rows.map((row) => (
          <div key={row.transaction_id + row.created_at} style={{ background: '#141330', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>#{row.transaction_id}</span>
              <span style={{ color: bandColors[row.band] || '#94a3b8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>{row.band}</span>
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '4px 0' }}>score: {row.score?.toFixed(4)}</p>
            {row.explanation?.text_en && <p style={{ color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>{row.explanation.text_en}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FlaggedQueue