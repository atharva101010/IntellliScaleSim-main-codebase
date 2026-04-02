import { useEffect, useRef, useState } from 'react'
import AuthSplitLayout from './AuthSplitLayout'
import { api } from '../../utils/api'

export default function VerifyEmail() {
  const [status, setStatus] = useState<'pending' | 'ok' | 'error' | 'awaiting'>('pending')
  const [message, setMessage] = useState('Verifying...')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return; // Guard against double-invoke in React StrictMode
    calledRef.current = true;
    const sp = new URLSearchParams(window.location.search)
    const token = sp.get('token')
    const e = sp.get('email') || ''
    const sent = sp.get('sent')
    if (token) {
      api.confirmVerifyEmail(token)
        .then(() => {
          setStatus('ok')
          setMessage('Your email has been verified. You can now sign in.')
        })
        .catch((e) => {
          setStatus('error')
          setMessage(e?.message ?? 'Verification failed')
        })
    } else if (sent || e) {
      setEmail(e)
      setStatus('awaiting')
      setMessage(e ? `We sent a verification link to ${e}.` : 'We sent a verification link to your email.')
    } else {
      setStatus('awaiting')
      setMessage('Enter your email to resend the verification link.')
    }
  }, [])

  const resend = async () => {
    if (!email) return
    setResending(true)
    setResent(false)
    try {
      await api.requestVerifyEmail(email)
      setResent(true)
    } catch (e) {
      setResent(false)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthSplitLayout
      formSide="left"
      tone="rose"
      messageTitle="Email verification"
      messageSubtitle="Thanks for confirming your email."
      messageCtaText="Back to Login"
      messageCtaTo="/login"
      formTitle="Verify Email"
    >
      {status === 'awaiting' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">{message}</p>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button type="button" onClick={resend} disabled={resending || !email}
              className="rounded-full bg-slate-900 text-white px-4 py-2 font-semibold shadow-sm hover:bg-slate-700 disabled:opacity-60">
              {resending ? 'Sending...' : 'Resend'}
            </button>
          </div>
          {resent && <p className="text-sm text-emerald-700">Verification email sent.</p>}
        </div>
      ) : (
        <p className={status === 'ok' ? 'text-sm text-emerald-700' : 'text-sm text-slate-700'}>{message}</p>
      )}
    </AuthSplitLayout>
  )
}
