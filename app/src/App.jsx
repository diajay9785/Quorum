import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useTranslation } from 'react-i18next'
import Auth from './Auth'
import SimulatorPanel from './SimulatorPanel'
import StatsCharts from './StatsCharts'

function App() {
  const { t, i18n } = useTranslation()
  const [session, setSession] = useState(null)

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

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 bg-slate-900 py-10 px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-emerald-400">{t('dashboard')}</h1>
      </div>
      <p className="text-slate-400 text-sm">Logged in as {session.user.email}</p>

      <div className="flex gap-2">
        <button onClick={() => i18n.changeLanguage('en')} className="px-3 py-1 bg-slate-700 text-white rounded">EN</button>
        <button onClick={() => i18n.changeLanguage('hi')} className="px-3 py-1 bg-slate-700 text-white rounded">HI</button>
        <button onClick={() => i18n.changeLanguage('ta')} className="px-3 py-1 bg-slate-700 text-white rounded">TA</button>
      </div>

      <SimulatorPanel />
      <StatsCharts />

      <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 bg-red-500 text-white rounded">
        {t('logout')}
      </button>
    </div>
  )
}

export default App