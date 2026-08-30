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
        const token = session?.access_token
        const headers = { Authorization: `Bearer ${token}` }

        const [approve, escalate, block] = await Promise.all([
          axios.get(`${API_BASE}/transactions`, { params: { band: 'approve' }, headers }),
          axios.get(`${API_BASE}/transactions`, { params: { band: 'escalate' }, headers }),
          axios.get(`${API_BASE}/transactions`, { params: { band: 'block' }, headers }),
        ])

        setCounts({
          approve: approve.data.length,
          escalate: escalate.data.length,
          block: block.data.length,
        })
      } catch (err) {
        setError(err.response?.data?.detail || err.message)
      }
    }

    fetchCounts()
  }, [])

  if (error) {
    return <div className="bg-red-900 text-red-200 p-3 rounded text-sm w-full max-w-2xl">Error: {error}</div>
  }

  if (!counts) {
    return <p className="text-slate-400">Loading autonomy meter...</p>
  }

  const total = counts.approve + counts.escalate + counts.block
  const autonomousPct = total > 0 ? (((counts.approve + counts.block) / total) * 100).toFixed(1) : 0
  const escalatedPct = total > 0 ? ((counts.escalate / total) * 100).toFixed(1) : 0

  return (
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-emerald-400">Autonomy Meter</h2>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-white">{autonomousPct}%</p>
          <p className="text-slate-400 text-sm">Handled automatically</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-yellow-400">{escalatedPct}%</p>
          <p className="text-slate-400 text-sm">Escalated to human</p>
        </div>
      </div>

      <div className="flex h-4 rounded overflow-hidden">
        <div className="bg-emerald-500" style={{ width: `${(counts.approve / total) * 100}%` }} />
        <div className="bg-yellow-500" style={{ width: `${(counts.escalate / total) * 100}%` }} />
        <div className="bg-red-500" style={{ width: `${(counts.block / total) * 100}%` }} />
      </div>

      <div className="flex justify-between text-xs text-slate-400">
        <span>Approve: {counts.approve}</span>
        <span>Escalate: {counts.escalate}</span>
        <span>Block: {counts.block}</span>
      </div>
    </div>
  )
}

export default AutonomyMeter