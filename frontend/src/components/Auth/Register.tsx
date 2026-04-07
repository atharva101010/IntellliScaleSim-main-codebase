import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthSplitLayout from './AuthSplitLayout'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student'|'teacher'|'admin'>('student')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(name, email, password, role)
      nav('/login?registered=1')
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      formSide="right"
      tone="rose"
      messageTitle="Welcome Back"
      messageSubtitle="Already have an account?"
      messageCtaText="Sign In"
      messageCtaTo="/login"
      formTitle="Sign Up"
      showSocialIcons
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</label>
          <input
            className="mt-1 w-full rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Jane Doe"
          />
        </div>
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
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
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
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</label>
          <select
            className="mt-1 w-full rounded-full bg-slate-50 border border-slate-200 shadow-sm focus:border-slate-900 focus:ring-slate-500 px-4 py-2.5"
            value={role}
            onChange={e => setRole(e.target.value as any)}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full inline-flex justify-center items-center rounded-full bg-slate-900 text-white px-6 py-2.5 font-semibold shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Sign Up'}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Already have an account? <Link to="/login" className="text-slate-700 hover:text-slate-900 font-medium">Sign In</Link>
        </p>
      </form>
    </AuthSplitLayout>
  )
}
