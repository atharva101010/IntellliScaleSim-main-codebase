import { useEffect, useState } from 'react'
import AuthSplitLayout from './AuthSplitLayout'
import { api } from '../../utils/api'

export default function ResetPassword() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const t = sp.get('token') || ''
    setToken(t)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err?.message ?? 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      formSide="left"
      tone="rose"
      messageTitle="Set a new password"
      messageSubtitle="Choose a strong password you can remember."
      messageCtaText="Back to Login"
      messageCtaTo="/login"
      formTitle="Reset Password"
    >
      {done ? (
        <p className="text-sm text-slate-700">Your password has been reset. You can now log in.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">New Password</label>
            <input
              className="mt-1 w-full rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="********"
              pattern="(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}"
              title="At least 8 characters, with at least one letter and one special character"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="w-full rounded-full bg-slate-900 text-white px-6 py-2.5 font-semibold shadow-sm hover:bg-slate-700 disabled:opacity-60">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  )
}
