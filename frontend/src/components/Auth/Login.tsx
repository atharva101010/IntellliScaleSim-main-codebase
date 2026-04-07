import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthSplitLayout from './AuthSplitLayout'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setRegistered(true)
      searchParams.delete('registered')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      nav('/')
    } catch (err: any) {
      const msg = err?.message ?? 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      formSide="left"
      tone="rose"
      messageTitle="Welcome to login"
      messageSubtitle="Don't have an account?"
      messageCtaText="Sign Up"
      messageCtaTo="/register"
      formTitle="Sign In"
      showSocialIcons
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Username or Email</label>
          <input
            className="mt-1 w-full rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
          <input
            className="mt-1 w-full rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="********"
          />
        </div>
        {registered && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Registration complete. Your account is active now, so you can sign in immediately.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-slate-600">
            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
            Remember Me
          </label>
          <Link to="/forgot-password" className="text-slate-600 hover:text-slate-900">Forgot Password</Link>
        </div>
        <button
          disabled={loading}
          className="w-full inline-flex justify-center items-center rounded-full bg-slate-900 text-white px-6 py-2.5 font-semibold shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="text-xs text-slate-500 text-center">
          No account? <Link to="/register" className="text-slate-700 hover:text-slate-900 font-medium">Sign Up</Link>
        </p>
      </form>
    </AuthSplitLayout>
  )
}
