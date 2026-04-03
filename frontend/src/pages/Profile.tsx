import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

interface UserProfile {
    id: number
    name: string
    email: string
    role: string
    is_verified: boolean
    created_at: string
}

interface ProfileStats {
    total_containers: number
    running_containers: number
    total_load_tests: number
    total_scaling_policies: number
    active_scaling_policies: number
}

interface Preferences {
    theme: 'light' | 'dark' | 'system'
    notifications_enabled: boolean
    dashboard_refresh_rate: number
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8001'

export default function Profile() {
    const { user, token } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [stats, setStats] = useState<ProfileStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    // Edit states
    const [editingProfile, setEditingProfile] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', email: '' })
    
    // Password change states
    const [changingPassword, setChangingPassword] = useState(false)
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    })
    
    // Preferences (stored locally)
    const [preferences, setPreferences] = useState<Preferences>(() => {
        const saved = localStorage.getItem('user_preferences')
        return saved ? JSON.parse(saved) : {
            theme: 'light',
            notifications_enabled: true,
            dashboard_refresh_rate: 5
        }
    })

    useEffect(() => {
        fetchProfile()
        fetchStats()
    }, [])

    useEffect(() => {
        localStorage.setItem('user_preferences', JSON.stringify(preferences))
        // Apply theme
        if (preferences.theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [preferences])

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setProfile(data)
                setEditForm({ name: data.name, email: data.email })
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/profile/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)
        
        try {
            const response = await fetch(`${API_BASE}/profile/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            })
            
            if (response.ok) {
                const data = await response.json()
                setProfile(data)
                setEditingProfile(false)
                setMessage({ type: 'success', text: 'Profile updated successfully!' })
            } else {
                const error = await response.json()
                setMessage({ type: 'error', text: error.detail || 'Failed to update profile' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' })
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' })
            return
        }
        
        if (passwordForm.new_password.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
            return
        }
        
        setSaving(true)
        setMessage(null)
        
        try {
            const response = await fetch(`${API_BASE}/profile/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: passwordForm.current_password,
                    new_password: passwordForm.new_password
                })
            })
            
            if (response.ok) {
                setChangingPassword(false)
                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                setMessage({ type: 'success', text: 'Password changed successfully!' })
            } else {
                const error = await response.json()
                setMessage({ type: 'error', text: error.detail || 'Failed to change password' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' })
        } finally {
            setSaving(false)
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-slate-900 text-white border-slate-900'
            case 'teacher': return 'bg-slate-200 text-slate-900 border-slate-300'
            default: return 'bg-slate-100 text-slate-800 border-slate-200'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-600">Loading profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
                <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg border ${
                    message.type === 'success' 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span>{message.text}</span>
                    </div>
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 h-24"></div>
                <div className="px-6 pb-6">
                    <div className="flex items-end gap-4 -mt-12">
                        <div className="w-24 h-24 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200">
                            {profile ? getInitials(profile.name) : '?'}
                        </div>
                        <div className="flex-1 pb-2">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-slate-900">{profile?.name}</h2>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor(profile?.role || 'student')}`}>
                                    {profile?.role?.charAt(0).toUpperCase()}{profile?.role?.slice(1)}
                                </span>
                                {profile?.is_verified && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Verified
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600">{profile?.email}</p>
                        </div>
                        {!editingProfile && (
                            <button
                                onClick={() => setEditingProfile(true)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Edit Profile Form */}
                    {editingProfile && (
                        <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingProfile(false)
                                        setEditForm({ name: profile?.name || '', email: profile?.email || '' })
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Total Containers" value={stats.total_containers} icon="containers" />
                    <StatCard label="Running" value={stats.running_containers} icon="running" />
                    <StatCard label="Load Tests" value={stats.total_load_tests} icon="tests" />
                    <StatCard label="Scaling Policies" value={stats.total_scaling_policies} icon="policies" />
                    <StatCard label="Active Policies" value={stats.active_scaling_policies} icon="active" />
                </div>
            )}

            {/* Security Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Security</h3>
                        <p className="text-sm text-slate-600">Manage your password and security settings</p>
                    </div>
                    {!changingPassword && (
                        <button
                            onClick={() => setChangingPassword(true)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                        >
                            Change Password
                        </button>
                    )}
                </div>

                {changingPassword && (
                    <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-slate-200">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={passwordForm.current_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                                {saving ? 'Changing...' : 'Update Password'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setChangingPassword(false)
                                    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                                }}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {!changingPassword && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Your account is secured with a password</span>
                    </div>
                )}
            </div>

            {/* Preferences Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Preferences</h3>
                <p className="text-sm text-slate-600 mb-4">Customize your dashboard experience</p>

                <div className="space-y-4">
                    {/* Theme Selection */}
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                        <div>
                            <p className="font-medium text-slate-900">Theme</p>
                            <p className="text-sm text-slate-500">Choose your preferred color scheme</p>
                        </div>
                        <select
                            value={preferences.theme}
                            onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'system' })}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                        <div>
                            <p className="font-medium text-slate-900">Notifications</p>
                            <p className="text-sm text-slate-500">Receive alerts about scaling events and test results</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.notifications_enabled}
                                onChange={(e) => setPreferences({ ...preferences, notifications_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                        </label>
                    </div>

                    {/* Dashboard Refresh Rate */}
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="font-medium text-slate-900">Dashboard Refresh Rate</p>
                            <p className="text-sm text-slate-500">How often to refresh monitoring data</p>
                        </div>
                        <select
                            value={preferences.dashboard_refresh_rate}
                            onChange={(e) => setPreferences({ ...preferences, dashboard_refresh_rate: parseInt(e.target.value) })}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                        >
                            <option value={3}>3 seconds</option>
                            <option value={5}>5 seconds</option>
                            <option value={10}>10 seconds</option>
                            <option value={30}>30 seconds</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Account Info */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Account Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500">Account ID</span>
                        <p className="font-mono text-slate-900">{profile?.id}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">Member Since</span>
                        <p className="text-slate-900">
                            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
    const renderIcon = () => {
        const iconClass = "w-5 h-5 text-slate-500";
        switch(icon) {
            case 'containers':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                );
            case 'running':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" fill="currentColor" className="text-slate-700" />
                    </svg>
                );
            case 'tests':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                );
            case 'policies':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                );
            case 'active':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            default:
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                );
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
            <div className="w-8 h-8 mx-auto rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                {renderIcon()}
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
        </div>
    )
}
