import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import axios from 'axios'

const API_BASE = 'https://quorum-j7zr.onrender.com'

const bandColors = {
  approve: 'text-emerald-400',
  escalate: 'text-yellow-400',
  block: 'text-red-400',
}

function AuditTrail({ onBack }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchAll() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const response = await axios.get(`${API_BASE}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const sorted = [...response.data].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
        setRows(sorted)
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
    <div className="min-h-screen flex flex-col items-center gap-6 bg-slate-900 py-10 px-4">
      <div className="flex items-center gap-4 w-full max-w-3xl justify-between">
        <h1 className="text-3xl font-bold text-emerald-400">Audit Trail</h1>
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 text-white rounded">
          Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-3xl">
        <input
          type="text"
          placeholder="Search by transaction ID or band..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded bg-slate-800 text-white outline-none"
        />
      </div>

      {loading && <p className="text-slate-400">Loading audit trail...</p>}
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}

      <div className="w-full max-w-3xl flex flex-col gap-3">
        {!loading && !error && filteredRows.length === 0 && (
          <p className="text-slate-400 text-sm">No matching records.</p>
        )}

        {filteredRows.map((row) => (
          <div key={row.transaction_id + row.created_at} className="bg-slate-800 rounded-lg p-4 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-white font-mono text-sm">#{row.transaction_id}</span>
              <span className={`font-bold uppercase text-xs ${bandColors[row.band] || 'text-slate-400'}`}>
                {row.band}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              score: {row.score?.toFixed(4)}
              {row.anomaly_flag && <span className="ml-2 text-purple-400 font-bold">ANOMALY</span>}
            </p>
            {row.created_at && (
              <p className="text-slate-500 text-xs">{new Date(row.created_at).toLocaleString()}</p>
            )}
            {row.explanation?.text_en && (
              <p className="text-slate-300 text-xs italic">{row.explanation.text_en}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AuditTrail