import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { presets } from './presets'
import { scoreTransaction } from './api'

const bandStyles = {
  approve: { bg: '#312e81', text: '#a5b4fc', border: '#818cf8' },
  escalate: { bg: '#422006', text: '#fbbf24', border: '#fbbf24' },
  block: { bg: '#4c1d24', text: '#fb7185', border: '#fb7185' },
}

const bandKeys = { approve: 'band_approve', escalate: 'band_escalate', block: 'band_block' }

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
      setResult({ presetLabelKey: preset.labelKey, ...response })
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ background: '#1a1838', borderRadius: '14px', padding: '24px', border: '0.5px solid #383465' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#f1f5f9', margin: '0 0 16px' }}>{t('simulator')}</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        {Object.entries(presets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => runPreset(key)}
            disabled={loading !== null}
            style={{
              padding: '9px 18px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
              background: '#211f45', color: '#e2e8f0', border: '0.5px solid #383465',
              cursor: 'pointer', opacity: loading !== null ? 0.5 : 1,
            }}
          >
            {loading === key ? '...' : t(preset.labelKey)}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#4c1d24', color: '#fecaca', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ background: '#141330', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('preset_label')}: {t(result.presetLabelKey)}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              background: bandStyles[result.band]?.bg, color: bandStyles[result.band]?.text,
              border: `0.5px solid ${bandStyles[result.band]?.border}`,
            }}>
              {t(bandKeys[result.band] || result.band)}
            </span>
            <span style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: '13px' }}>
              {t('score_label')}: {result.score?.toFixed(4)}
            </span>
            {result.anomaly_flag && (
              <span style={{ padding: '3px 10px', borderRadius: '99px', background: '#3b0764', color: '#e9d5ff', fontSize: '10px', fontWeight: 600 }}>
                {t('anomaly_badge')}
              </span>
            )}
          </div>
          {result.explanation?.text_en && (
            <p style={{ color: '#cbd5e1', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>{result.explanation.text_en}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SimulatorPanel