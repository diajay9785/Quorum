import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import axios from 'axios'

const API_BASE = 'https://quorum-j7zr.onrender.com'
const bandColors = { approve: '#a5b4fc', escalate: '#fbbf24', block: '#fb7185' }

function AuditTrail({ onBack }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchAll() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await axios.get(`${API_BASE}/transactions`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
        setRows([...response.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      } catch (err) {
        setError(err.response?.data?.detail || err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const filteredRows = rows.filter((row) =>
    String(row.transaction_id).toLowerCase().includes(search.toLowerCase()) ||
    row.band?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#14122b', padding: '32px 20px' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#f1f5f9', margin: 0 }}>Audit Trail</h1>
          <button onClick={onBack} style={{ padding: '8px 16px', borderRadius: '8px', background: '#211f45', color: '#e2e8f0', border: '0.5px solid #383465', cursor: 'pointer', fontSize: '13px' }}>
            Back to Dashboard
          </button>
        </div>

        <input
          type="text" placeholder="Search by transaction ID or band..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', background: '#1a1838', border: '0.5px solid #383465', color: '#f1f5f9', outline: 'none', fontSize: '13px' }}
        />

        {loading && <p style={{ color: '#64748b' }}>Loading audit trail...</p>}
        {error && <p style={{ color: '#fb7185', fontSize: '13px' }}>Error: {error}</p>}
        {!loading && !error && filteredRows.length === 0 && <p style={{ color: '#64748b', fontSize: '13px' }}>No matching records.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredRows.map((row) => (
            <div key={row.transaction_id + row.created_at} style={{ background: '#1a1838', borderRadius: '10px', padding: '14px', border: '0.5px solid #383465' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>#{row.transaction_id}</span>
                <span style={{ color: bandColors[row.band] || '#94a3b8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>{row.band}</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '11px', margin: '4px 0' }}>
                score: {row.score?.toFixed(4)}
                {row.anomaly_flag && <span style={{ color: '#c084fc', fontWeight: 600, marginLeft: '8px' }}>ANOMALY</span>}
              </p>
              {row.created_at && <p style={{ color: '#475569', fontSize: '11px', margin: '2px 0' }}>{new Date(row.created_at).toLocaleString()}</p>}
              {row.explanation?.text_en && <p style={{ color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic', margin: '4px 0 0' }}>{row.explanation.text_en}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AuditTrail