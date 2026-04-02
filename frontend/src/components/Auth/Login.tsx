import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthSplitLayout from './AuthSplitLayout'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

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
      if (/verify/i.test(msg)) {
        setUnverified(true)
      } else {
        setUnverified(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const resendVerification = async () => {
    setResending(true)
    setResent(false)
    setError(null)
    try {
      const { api } = await import('../../utils/api')
      await api.requestVerifyEmail(email)
      setResent(true)
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend verification email')
    } finally {
      setResending(false)
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        {unverified && (
          <div className="text-sm text-slate-700 flex items-center justify-between">
            <span>Haven't verified your email yet?</span>
            <button type="button" onClick={resendVerification} disabled={resending}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100">
              {resending ? 'Sending...' : 'Resend link'}
            </button>
          </div>
        )}
        {resent && <p className="text-sm text-emerald-700">Verification email sent.</p>}
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
