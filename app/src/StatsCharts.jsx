import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_BASE = 'https://quorum-j7zr.onrender.com'

function StatsCharts() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/stats`).then((res) => setStats(res.data)).catch((err) => setError(err.response?.data?.detail || err.message))
  }, [])

  if (error) return <div style={{ background: '#4c1d24', color: '#fecaca', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>Error: {error}</div>
  if (!stats) return <p style={{ color: '#64748b' }}>Loading charts...</p>

  const bins = stats.test_report.calibration_bins
  const histogramData = bins.predicted_avg.map((avg, i) => ({ bin: avg.toFixed(2), count: bins.counts[i] }))
  const reliabilityData = bins.predicted_avg.map((avg, i) => ({ predicted: avg, actual: bins.actual_rate[i] }))

  return (
    <div style={{ background: '#1a1838', borderRadius: '14px', padding: '24px', border: '0.5px solid #383465', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#f1f5f9', margin: '0 0 14px' }}>Score Distribution</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2a55" />
            <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#211f45', border: '0.5px solid #383465', color: '#f1f5f9' }} />
            <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#f1f5f9', margin: '0 0 14px' }}>Reliability Diagram</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={reliabilityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2a55" />
            <XAxis dataKey="predicted" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#211f45', border: '0.5px solid #383465', color: '#f1f5f9' }} />
            <Line type="monotone" dataKey="actual" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24' }} />
            <Line type="monotone" dataKey="predicted" stroke="#475569" strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ color: '#64748b', fontSize: '11px', marginTop: '8px' }}>
          Amber = actual fraud rate per bin. Gray dashed = perfect calibration reference.
        </p>
      </div>
    </div>
  )
}

export default StatsCharts