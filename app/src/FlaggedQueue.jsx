import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './supabaseClient'
import axios from 'axios'

const API_BASE = 'https://quorum-j7zr.onrender.com'

const bandColors = {
  approve: 'text-emerald-400',
  escalate: 'text-yellow-400',
  block: 'text-red-400',
}

function FlaggedQueue() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchFlagged() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const [escalated, blocked] = await Promise.all([
          axios.get(`${API_BASE}/transactions`, {
            params: { band: 'escalate' },
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/transactions`, {
            params: { band: 'block' },
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const combined = [...escalated.data, ...blocked.data]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 15)

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
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-emerald-400">Flagged Queue</h2>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-slate-400 text-sm">No escalated or blocked transactions yet.</p>
      )}

      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.transaction_id + row.created_at} className="bg-slate-900 rounded p-3 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-white font-mono text-sm">#{row.transaction_id}</span>
              <span className={`font-bold uppercase text-xs ${bandColors[row.band] || 'text-slate-400'}`}>
                {row.band}
              </span>
            </div>
            <p className="text-slate-400 text-xs">score: {row.score?.toFixed(4)}</p>
            {row.explanation?.text_en && (
              <p className="text-slate-300 text-xs italic">{row.explanation.text_en}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FlaggedQueue