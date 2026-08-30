import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useTranslation } from 'react-i18next'

const PIPELINE_STEPS = ['Feature extraction', 'Ensemble scoring', 'Anomaly check', 'SHAP explanation']

function AmbientLeft() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STEPS.length)
    }, 2200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ position: 'absolute', left: '24px', top: '50px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {PIPELINE_STEPS.map((step, i) => (
        <div
          key={step}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1838',
            padding: '8px 14px', borderRadius: '8px', width: '180px',
            border: i === activeStep ? '1px solid #818cf8' : '1px solid transparent',
            boxShadow: i === activeStep ? '0 0 16px rgba(129,140,248,0.45)' : 'none',
            transition: 'all 0.5s ease',
          }}
        >
          {i < activeStep && <span style={{ color: '#4ade80', fontSize: '12px' }}>✓</span>}
          {i === activeStep && (
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
          )}
          <span style={{ fontSize: '12px', color: i <= activeStep ? '#e2e8f0' : '#64748b', fontWeight: 500 }}>{step}</span>
        </div>
      ))}
      <div style={{ marginTop: '10px', background: '#1a1838', padding: '10px 14px', borderRadius: '8px', width: '180px' }}>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 6px' }}>MODEL STATUS: LIVE</p>
        <div style={{ height: '5px', borderRadius: '4px', background: '#2d2a55', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '85%', background: 'linear-gradient(90deg,#6366f1,#c084fc)' }} />
        </div>
      </div>

      <div style={{
        position: 'absolute', top: '260px', left: '190px', width: '110px', padding: '10px',
        background: '#1a1a3a', borderRadius: '10px', border: '0.5px solid #818cf8',
        boxShadow: '0 0 20px rgba(129,140,248,0.35)', animation: 'floatA 3.2s ease-in-out infinite',
      }}>
        <div style={{ fontSize: '9px', color: '#a5b4fc', fontWeight: 500 }}>APPROVE</div>
        <div style={{ fontSize: '13px', color: '#f1f5f9', fontFamily: 'monospace', marginTop: '3px' }}>0.0313</div>
      </div>
    </div>
  )
}

function AmbientRight() {
  return (
    <div style={{ position: 'absolute', right: '24px', top: '70px', width: '220px' }}>
      <div style={{ background: '#1a1838', borderRadius: '10px', padding: '16px', boxShadow: '0 0 24px rgba(99,102,241,0.15)' }}>
        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0 0 8px', letterSpacing: '0.5px' }}>SCORE PROFILE</p>
        <div style={{ height: '6px', borderRadius: '4px', background: '#2d2a55', overflow: 'hidden', marginBottom: '4px' }}>
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg,#6366f1,#c084fc)' }} />
        </div>
        <p style={{ fontSize: '11px', color: '#e2e8f0', textAlign: 'right', margin: '0 0 16px' }}>100%</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Precision</span>
          <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 500 }}>84.9</span>
        </div>
        <div style={{ height: '4px', borderRadius: '4px', background: '#2d2a55', marginBottom: '12px' }}>
          <div style={{ height: '100%', width: '85%', background: '#818cf8', borderRadius: '4px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Autonomy</span>
          <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 500 }}>88.5</span>
        </div>
        <div style={{ height: '4px', borderRadius: '4px', background: '#2d2a55', marginBottom: '12px' }}>
          <div style={{ height: '100%', width: '88%', background: '#fbbf24', borderRadius: '4px' }} />
        </div>

        <p style={{ fontSize: '10px', color: '#94a3b8', margin: '12px 0 6px', letterSpacing: '0.5px' }}>SIGNALS</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#fb7185', fontSize: '12px' }}>⚠</span>
          <span style={{ fontSize: '11px', color: '#e2e8f0' }}>Unseen pattern flagged</span>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: '220px', left: '20px', width: '110px', padding: '10px',
        background: '#1a1a3a', borderRadius: '10px', border: '0.5px solid #fb7185',
        boxShadow: '0 0 20px rgba(251,113,133,0.35)', animation: 'floatC 3.6s ease-in-out infinite',
      }}>
        <div style={{ fontSize: '9px', color: '#fb7185', fontWeight: 500 }}>BLOCK</div>
        <div style={{ fontSize: '13px', color: '#f1f5f9', fontFamily: 'monospace', marginTop: '3px' }}>0.8651</div>
      </div>
    </div>
  )
}

function Auth({ onLogin }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      onLogin(data.session)
    }
  }

  return (
    <div
      style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        background: '#14122b',
        backgroundImage: 'linear-gradient(#221f45 1px,transparent 1px),linear-gradient(90deg,#221f45 1px,transparent 1px)',
        backgroundSize: '28px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <AmbientLeft />
      <AmbientRight />

      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative', width: '300px', padding: '32px', background: '#1a1838',
          borderRadius: '16px', border: '0.5px solid #383465',
          display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 0 40px rgba(99,102,241,0.12)',
          animation: 'slideUp 0.7s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '4px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#818cf8,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: '13px', color: '#1e1b4b' }}>Q</div>
          <span style={{ fontSize: '18px', fontWeight: 500, color: '#f1f5f9' }}>{t('app_title')}</span>
        </div>

        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px 12px', borderRadius: '8px', background: '#211f45', border: '0.5px solid #383465', color: '#f1f5f9', outline: 'none' }}
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px 12px', borderRadius: '8px', background: '#211f45', border: '0.5px solid #383465', color: '#f1f5f9', outline: 'none' }}
        />

        {error && <p style={{ color: '#fb7185', fontSize: '13px', margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px', borderRadius: '8px', background: '#6366f1', color: '#f1f5f9', fontWeight: 500, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '...' : isSignup ? t('signup') : t('login')}
        </button>

        <button
          type="button"
          onClick={() => setIsSignup(!isSignup)}
          style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', cursor: 'pointer' }}
        >
          {isSignup ? `Already have an account? ${t('login')}` : `New here? ${t('signup')}`}
        </button>
      </form>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatA { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes floatC { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(8px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}

export default Auth