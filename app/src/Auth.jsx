import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useTranslation } from 'react-i18next'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-lg w-80 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-emerald-400 text-center">{t('app_title')}</h1>
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="px-3 py-2 rounded bg-slate-700 text-white outline-none"
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="px-3 py-2 rounded bg-slate-700 text-white outline-none"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 text-white py-2 rounded font-semibold"
        >
          {loading ? '...' : isSignup ? t('signup') : t('login')}
        </button>
        <button
          type="button"
          onClick={() => setIsSignup(!isSignup)}
          className="text-slate-400 text-sm"
        >
          {isSignup ? `Already have an account? ${t('login')}` : `New here? ${t('signup')}`}
        </button>
      </form>
    </div>
  )
}

export default Auth