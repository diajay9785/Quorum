import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { presets } from './presets'
import { scoreTransaction } from './api'

const bandColors = {
  approve: 'bg-emerald-500',
  escalate: 'bg-yellow-500',
  block: 'bg-red-500',
}

function SimulatorPanel() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const runPreset = async (key) => {
    setLoading(key)
    setError('')
    setResult(null)

    try {
      const preset = presets[key]
      const response = await scoreTransaction(preset.transaction)
      setResult({ presetLabel: preset.label, ...response })
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-emerald-400">{t('simulator')}</h2>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(presets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => runPreset(key)}
            disabled={loading !== null}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium disabled:opacity-50"
          >
            {loading === key ? '...' : preset.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900 text-red-200 p-3 rounded text-sm">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="bg-slate-900 rounded-lg p-4 flex flex-col gap-2">
          <p className="text-slate-400 text-sm">Preset: {result.presetLabel}</p>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded text-white font-bold uppercase text-sm ${bandColors[result.band] || 'bg-slate-600'}`}>
              {result.band}
            </span>
            <span className="text-white font-mono">
              score: {result.score?.toFixed(4)}
            </span>
            {result.anomaly_flag && (
              <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded font-bold">
                ANOMALY
              </span>
            )}
          </div>
          {result.explanation?.text_en && (
            <p className="text-slate-300 text-sm italic">{result.explanation.text_en}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SimulatorPanel