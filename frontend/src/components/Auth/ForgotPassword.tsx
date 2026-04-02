import { useState } from 'react'
import AuthSplitLayout from './AuthSplitLayout'
import { api } from '../../utils/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      formSide="left"
      tone="rose"
      messageTitle="Reset your password"
      messageSubtitle="We'll email you a link to set a new one."
      messageCtaText="Back to Login"
      messageCtaTo="/login"
      formTitle="Forgot Password"
    >
      {sent ? (
        <p className="text-sm text-slate-700">If an account exists for {email}, a reset link has been sent.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
            <input
              className="mt-1 w-full rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="w-full rounded-full bg-slate-900 text-white px-6 py-2.5 font-semibold shadow-sm hover:bg-slate-700 disabled:opacity-60">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  )
}
