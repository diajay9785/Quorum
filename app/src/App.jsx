import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useTranslation } from 'react-i18next'
import Auth from './Auth'
import SimulatorPanel from './SimulatorPanel'
import ManualEntry from './ManualEntry'
import StatsCharts from './StatsCharts'
import FlaggedQueue from './FlaggedQueue'
import AutonomyMeter from './AutonomyMeter'
import AuditTrail from './AuditTrail'

function App() {
  const { t, i18n } = useTranslation()
  const [session, setSession] = useState(null)
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!session) {
    return <Auth onLogin={setSession} />
  }

  if (view === 'audit') {
    return <AuditTrail onBack={() => setView('dashboard')} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#14122b' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: '#1a1838', borderBottom: '0.5px solid #383465',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg,#818cf8,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: '12px', color: '#1e1b4b' }}>Q</div>
          <span style={{ fontSize: '16px', fontWeight: 500, color: '#f1f5f9' }}>{t('app_title')}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {['en', 'hi', 'ta'].map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '99px', cursor: 'pointer',
                border: i18n.language === lang ? 'none' : '0.5px solid #383465',
                background: i18n.language === lang ? '#312e81' : 'transparent',
                color: i18n.language === lang ? '#a5b4fc' : '#94a3b8',
              }}
            >
              {lang.toUpperCase()}
            </button>
          ))}
          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>{session.user.email}</span>
          <button
            onClick={() => setView('audit')}
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', background: '#211f45', color: '#e2e8f0', border: '0.5px solid #383465', cursor: 'pointer' }}
          >
            {t('audit_trail')}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', background: '#4c1d24', color: '#fb7185', border: 'none', cursor: 'pointer' }}
          >
            {t('logout')}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <AutonomyMeter />
        <SimulatorPanel />
        <ManualEntry />
        <StatsCharts />
        <FlaggedQueue />
      </div>
    </div>
  )
}

export default App