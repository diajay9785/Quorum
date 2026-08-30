import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import axios from 'axios'

const API_BASE = 'https://quorum-j7zr.onrender.com'

function AutonomyMeter() {
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchCounts() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers = { Authorization: `Bearer ${session?.access_token}` }
        const [approve, escalate, block] = await Promise.all([
          axios.get(`${API_BASE}/transactions`, { params: { band: 'approve' }, headers }),
          axios.get(`${API_BASE}/transactions`, { params: { band: 'escalate' }, headers }),
          axios.get(`${API_BASE}/transactions`, { params: { band: 'block' }, headers }),
        ])
        setCounts({ approve: approve.data.length, escalate: escalate.data.length, block: block.data.length })
      } catch (err) {
        setError(err.response?.data?.detail || err.message)
      }
    }
    fetchCounts()
  }, [])

  if (error) return <div style={{ background: '#4c1d24', color: '#fecaca', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>Error: {error}</div>
  if (!counts) return <p style={{ color: '#64748b' }}>Loading...</p>

  const total = counts.approve + counts.escalate + counts.block
  const autonomousPct = total > 0 ? (((counts.approve + counts.block) / total) * 100).toFixed(1) : 0
  const escalatedPct = total > 0 ? ((counts.escalate / total) * 100).toFixed(1) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      <div style={{ background: '#1a1838', borderRadius: '12px', padding: '16px', border: '0.5px solid #383465' }}>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px' }}>Handled automatically</p>
        <p style={{ fontSize: '28px', fontWeight: 500, color: '#a5b4fc', margin: 0 }}>{autonomousPct}%</p>
      </div>
      <div style={{ background: '#1a1838', borderRadius: '12px', padding: '16px', border: '0.5px solid #383465' }}>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px' }}>Escalated to human</p>
        <p style={{ fontSize: '28px', fontWeight: 500, color: '#fbbf24', margin: 0 }}>{escalatedPct}%</p>
      </div>
      <div style={{ background: '#1a1838', borderRadius: '12px', padding: '16px', border: '0.5px solid #383465' }}>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px' }}>Total scored</p>
        <p style={{ fontSize: '28px', fontWeight: 500, color: '#f1f5f9', margin: 0 }}>{total}</p>
      </div>
      <div style={{ gridColumn: 'span 3', display: 'flex', height: '6px', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ background: '#818cf8', width: `${(counts.approve / total) * 100}%` }} />
        <div style={{ background: '#fbbf24', width: `${(counts.escalate / total) * 100}%` }} />
        <div style={{ background: '#fb7185', width: `${(counts.block / total) * 100}%` }} />
      </div>
    </div>
  )
}

export default AutonomyMeter