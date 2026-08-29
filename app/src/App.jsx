import { useTranslation } from 'react-i18next'

function App() {
  const { t, i18n } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900">
      <h1 className="text-3xl font-bold text-emerald-400">{t('app_title')}</h1>
      <div className="flex gap-2">
        <button onClick={() => i18n.changeLanguage('en')} className="px-3 py-1 bg-slate-700 text-white rounded">EN</button>
        <button onClick={() => i18n.changeLanguage('hi')} className="px-3 py-1 bg-slate-700 text-white rounded">HI</button>
        <button onClick={() => i18n.changeLanguage('ta')} className="px-3 py-1 bg-slate-700 text-white rounded">TA</button>
      </div>
    </div>
  )
}

export default App