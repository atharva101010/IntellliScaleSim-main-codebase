import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { token, user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-white font-semibold">IS</span>
            <span className="font-semibold tracking-tight">IntelliScaleSim</span>
          </Link>
        </div>
        <nav className="text-sm text-slate-600 flex items-center gap-3">
          {token ? (
            <>
              {user?.email && (
                <span className="hidden sm:inline text-slate-700">{user.email}</span>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center rounded-md bg-slate-900 text-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-800"
              >
                Logout
              </button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
