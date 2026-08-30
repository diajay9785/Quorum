import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API_BASE = 'https://quorum-j7zr.onrender.com'

function StatsCharts() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/stats`)
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message))
  }, [])

  if (error) {
    return (
      <div className="bg-red-900 text-red-200 p-3 rounded text-sm w-full max-w-2xl">
        Error loading stats: {error}
      </div>
    )
  }

  if (!stats) {
    return <p className="text-slate-400">Loading charts...</p>
  }

  const bins = stats.test_report.calibration_bins

  const histogramData = bins.predicted_avg.map((avg, i) => ({
    bin: avg.toFixed(2),
    count: bins.counts[i],
  }))

  const reliabilityData = bins.predicted_avg.map((avg, i) => ({
    predicted: avg,
    actual: bins.actual_rate[i],
  }))

  return (
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold text-emerald-400 mb-4">Score Distribution</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="bin" stroke="#94a3b8" label={{ value: 'Predicted score', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
            <Bar dataKey="count" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h2 className="text-xl font-bold text-emerald-400 mb-4">Reliability Diagram</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={reliabilityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="predicted" stroke="#94a3b8" label={{ value: 'Predicted probability', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
            <YAxis stroke="#94a3b8" label={{ value: 'Actual fraud rate', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
            <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
            <Line type="monotone" dataKey="predicted" stroke="#64748b" strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-slate-400 text-xs mt-2">
          Orange = actual fraud rate per bin. Gray dashed = perfect calibration reference (predicted = actual).
        </p>
      </div>
    </div>
  )
}

export default StatsCharts