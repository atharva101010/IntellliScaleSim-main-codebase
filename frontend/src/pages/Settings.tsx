import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Shield,
  Bell,
  Database,
  Server,
  Mail,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Globe,
  Key
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../hooks/useAuth'

interface PlatformSettings {
  general: {
    platform_name: string
    maintenance_mode: boolean
    registration_enabled: boolean
    email_verification_required: boolean
    max_containers_per_user: number
    default_container_timeout: number
  }
  security: {
    jwt_expiry_minutes: number
    password_min_length: number
    require_special_chars: boolean
    require_numbers: boolean
    max_login_attempts: number
    lockout_duration_minutes: number
    two_factor_enabled: boolean
  }
  scaling: {
    auto_scaling_enabled: boolean
    min_replicas: number
    max_replicas: number
    scale_up_threshold: number
    scale_down_threshold: number
    cooldown_period_seconds: number
  }
  notifications: {
    email_notifications_enabled: boolean
    slack_webhook_url: string
    alert_on_container_failure: boolean
    alert_on_scaling_event: boolean
    alert_on_high_resource_usage: boolean
    resource_threshold_percent: number
  }
  billing: {
    billing_enabled: boolean
    free_tier_hours: number
    cost_per_hour: number
    alert_threshold_percent: number
    auto_suspend_on_limit: boolean
  }
}

const defaultSettings: PlatformSettings = {
  general: {
    platform_name: 'IntelliScaleSim',
    maintenance_mode: false,
    registration_enabled: true,
    email_verification_required: true,
    max_containers_per_user: 10,
    default_container_timeout: 3600,
  },
  security: {
    jwt_expiry_minutes: 60,
    password_min_length: 8,
    require_special_chars: true,
    require_numbers: true,
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    two_factor_enabled: false,
  },
  scaling: {
    auto_scaling_enabled: true,
    min_replicas: 1,
    max_replicas: 10,
    scale_up_threshold: 80,
    scale_down_threshold: 20,
    cooldown_period_seconds: 300,
  },
  notifications: {
    email_notifications_enabled: true,
    slack_webhook_url: '',
    alert_on_container_failure: true,
    alert_on_scaling_event: true,
    alert_on_high_resource_usage: true,
    resource_threshold_percent: 85,
  },
  billing: {
    billing_enabled: true,
    free_tier_hours: 100,
    cost_per_hour: 0.05,
    alert_threshold_percent: 80,
    auto_suspend_on_limit: false,
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function Settings() {
  const { token } = useAuth()
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'scaling' | 'notifications' | 'billing'>('general')

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    }, 1000)
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings(defaultSettings)
      setMessage({ type: 'success', text: 'Settings reset to defaults' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'scaling', label: 'Auto-Scaling', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: Database },
  ] as const

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Platform Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure platform behavior, security, and policies</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>

      {/* Status Message */}
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Tabs */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Panel */}
        <motion.div variants={fadeInUp} className="lg:col-span-3">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic platform configuration and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Platform Name</label>
                  <input
                    type="text"
                    value={settings.general.platform_name}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, platform_name: e.target.value }
                    })}
                    className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Maintenance Mode</p>
                    <p className="text-sm text-slate-500">Disable all user access except admins</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.maintenance_mode}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, maintenance_mode: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">User Registration</p>
                    <p className="text-sm text-slate-500">Allow new users to register accounts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.registration_enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, registration_enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Email Verification Required</p>
                    <p className="text-sm text-slate-500">Require users to verify their email before accessing features</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.email_verification_required}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, email_verification_required: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Containers per User</label>
                    <input
                      type="number"
                      value={settings.general.max_containers_per_user}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, max_containers_per_user: parseInt(e.target.value) || 0 }
                      })}
                      min={1}
                      max={100}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Container Timeout (seconds)</label>
                    <input
                      type="number"
                      value={settings.general.default_container_timeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, default_container_timeout: parseInt(e.target.value) || 0 }
                      })}
                      min={60}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Authentication and access control configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">JWT Token Expiry (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.jwt_expiry_minutes}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, jwt_expiry_minutes: parseInt(e.target.value) || 0 }
                      })}
                      min={5}
                      max={1440}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Password Length</label>
                    <input
                      type="number"
                      value={settings.security.password_min_length}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, password_min_length: parseInt(e.target.value) || 0 }
                      })}
                      min={6}
                      max={32}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Require Special Characters</p>
                    <p className="text-sm text-slate-500">Passwords must contain special characters</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.require_special_chars}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, require_special_chars: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Require Numbers</p>
                    <p className="text-sm text-slate-500">Passwords must contain numbers</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.require_numbers}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, require_numbers: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Login Attempts</label>
                    <input
                      type="number"
                      value={settings.security.max_login_attempts}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, max_login_attempts: parseInt(e.target.value) || 0 }
                      })}
                      min={3}
                      max={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lockout Duration (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.lockout_duration_minutes}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, lockout_duration_minutes: parseInt(e.target.value) || 0 }
                      })}
                      min={5}
                      max={60}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                    <p className="text-sm text-slate-500">Require 2FA for all users</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.two_factor_enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, two_factor_enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'scaling' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  Auto-Scaling Settings
                </CardTitle>
                <CardDescription>Configure automatic scaling behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Enable Auto-Scaling</p>
                    <p className="text-sm text-slate-500">Automatically scale containers based on load</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.scaling.auto_scaling_enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        scaling: { ...settings.scaling, auto_scaling_enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Replicas</label>
                    <input
                      type="number"
                      value={settings.scaling.min_replicas}
                      onChange={(e) => setSettings({
                        ...settings,
                        scaling: { ...settings.scaling, min_replicas: parseInt(e.target.value) || 0 }
                      })}
                      min={1}
                      max={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Replicas</label>
                    <input
                      type="number"
                      value={settings.scaling.max_replicas}
                      onChange={(e) => setSettings({
                        ...settings,
                        scaling: { ...settings.scaling, max_replicas: parseInt(e.target.value) || 0 }
                      })}
                      min={1}
                      max={100}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scale Up Threshold (%)</label>
                    <input
                      type="number"
                      value={settings.scaling.scale_up_threshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        scaling: { ...settings.scaling, scale_up_threshold: parseInt(e.target.value) || 0 }
                      })}
                      min={50}
                      max={95}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scale Down Threshold (%)</label>
                    <input
                      type="number"
                      value={settings.scaling.scale_down_threshold}
                      onChange={(e) => setSettings({
                        ...settings,
                        scaling: { ...settings.scaling, scale_down_threshold: parseInt(e.target.value) || 0 }
                      })}
                      min={10}
                      max={50}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cooldown Period (seconds)</label>
                  <input
                    type="number"
                    value={settings.scaling.cooldown_period_seconds}
                    onChange={(e) => setSettings({
                      ...settings,
                      scaling: { ...settings.scaling, cooldown_period_seconds: parseInt(e.target.value) || 0 }
                    })}
                    min={60}
                    max={600}
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">Time to wait between scaling operations</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure alerts and notification channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Email Notifications</p>
                    <p className="text-sm text-slate-500">Send alerts via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email_notifications_enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, email_notifications_enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slack Webhook URL</label>
                  <input
                    type="url"
                    value={settings.notifications.slack_webhook_url}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, slack_webhook_url: e.target.value }
                    })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                </div>

                <div className="space-y-3">
                  <p className="font-medium text-slate-900">Alert Triggers</p>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">Container Failures</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.alert_on_container_failure}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, alert_on_container_failure: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">Scaling Events</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.alert_on_scaling_event}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, alert_on_scaling_event: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">High Resource Usage</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.alert_on_high_resource_usage}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, alert_on_high_resource_usage: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resource Alert Threshold (%)</label>
                  <input
                    type="number"
                    value={settings.notifications.resource_threshold_percent}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, resource_threshold_percent: parseInt(e.target.value) || 0 }
                    })}
                    min={50}
                    max={95}
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'billing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Billing Settings
                </CardTitle>
                <CardDescription>Configure billing and cost management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Enable Billing</p>
                    <p className="text-sm text-slate-500">Track and charge for resource usage</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.billing.billing_enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        billing: { ...settings.billing, billing_enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Free Tier Hours</label>
                    <input
                      type="number"
                      value={settings.billing.free_tier_hours}
                      onChange={(e) => setSettings({
                        ...settings,
                        billing: { ...settings.billing, free_tier_hours: parseInt(e.target.value) || 0 }
                      })}
                      min={0}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost per Hour ($)</label>
                    <input
                      type="number"
                      value={settings.billing.cost_per_hour}
                      onChange={(e) => setSettings({
                        ...settings,
                        billing: { ...settings.billing, cost_per_hour: parseFloat(e.target.value) || 0 }
                      })}
                      min={0}
                      step={0.01}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Budget Alert Threshold (%)</label>
                  <input
                    type="number"
                    value={settings.billing.alert_threshold_percent}
                    onChange={(e) => setSettings({
                      ...settings,
                      billing: { ...settings.billing, alert_threshold_percent: parseInt(e.target.value) || 0 }
                    })}
                    min={50}
                    max={100}
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">Alert users when they reach this percentage of their budget</p>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Auto-Suspend on Limit</p>
                    <p className="text-sm text-slate-500">Automatically suspend containers when budget is exceeded</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.billing.auto_suspend_on_limit}
                      onChange={(e) => setSettings({
                        ...settings,
                        billing: { ...settings.billing, auto_suspend_on_limit: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
