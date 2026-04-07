import { motion } from 'framer-motion'
import { ArrowRight, Activity, Receipt, Settings, ShieldCheck, Users, AlertTriangle, Zap, Lock, BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const reveal = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

const stepAnimation = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export default function AdminDashboard() {
  const systemMetrics = [
    { label: 'Total Users', value: '156', sublabel: '+12 this week', trend: 'up' },
    { label: 'Active Classes', value: '24', sublabel: 'Across platform', trend: 'neutral' },
    { label: 'Platform Load', value: '64%', sublabel: 'Normal operations', trend: 'neutral' },
  ]

  const adminWorkflow = [
    {
      step: 1,
      title: 'Monitor System',
      description: 'Track platform health, performance metrics, and alert thresholds.',
      icon: Activity,
      cta: 'View Status',
      link: '/admin/monitoring',
    },
    {
      step: 2,
      title: 'Manage Users',
      description: 'Control user roles, permissions, and enforce security policies.',
      icon: Users,
      cta: 'Manage Users',
      link: '/admin/users',
    },
    {
      step: 3,
      title: 'Scale Settings',
      description: 'Configure auto-scaling policies and resource allocation rules.',
      icon: Zap,
      cta: 'Configure',
      link: '/admin/autoscaling',
    },
    {
      step: 4,
      title: 'Audit Billing',
      description: 'Review costs, reconcile billings, and manage budget policies.',
      icon: Receipt,
      cta: 'Review',
      link: '/admin/billing',
    },
  ]

  const policyChecklist = [
    { policy: 'User access controls enforced', status: 'active' },
    { policy: 'Deployment resource limits applied', status: 'active' },
    { policy: 'Auto-scaling policies configured', status: 'active' },
    { policy: 'Billing alerts active', status: 'pending' },
    { policy: 'Security audit logs enabled', status: 'active' },
  ]

  return (
    <motion.div className="space-y-8" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      {/* Hero Section */}
      <motion.div variants={reveal} className="bg-gradient-to-br from-purple-50 to-slate-50 rounded-lg border border-purple-100 p-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-lg text-slate-600 mb-4">
            Operational control center for platform health, policy, and governance.
          </p>
          <p className="text-sm text-slate-500">
            Monitor system performance, manage users and permissions, configure scaling policies, and audit billing across the entire IntelliScaleSim platform.
          </p>
        </div>
      </motion.div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>System Health</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Stable
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">No critical incidents in the current window.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Monitoring</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Live
                <Activity className="h-5 w-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Telemetry pipeline and dashboards are active.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Billing Audits</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Ready
                <Receipt className="h-5 w-5 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Cost reporting and alerts are configured.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Platform Policy</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Enforced
                <Settings className="h-5 w-5 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Scaling and deployment controls are in effect.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Platform Metrics */}
      <motion.div variants={reveal}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-600" />
              Platform Metrics
            </CardTitle>
            <CardDescription>Key aggregated metrics across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {systemMetrics.map((metric) => (
                <div key={metric.label} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 font-medium">{metric.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</p>
                  <p className={`text-xs mt-2 ${metric.trend === 'up' ? 'text-green-600' : 'text-slate-500'}`}>
                    {metric.sublabel}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Administrative Workflow */}
      <motion.div variants={reveal}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Administrative Workflow
            </CardTitle>
            <CardDescription>Core responsibilities and operational steps for platform management.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {adminWorkflow.map((item) => {
                const IconComponent = item.icon
                return (
                  <motion.div key={item.step} variants={stepAnimation} className="relative">
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white text-sm font-semibold">
                          {item.step}
                        </div>
                        <IconComponent className="h-5 w-5 text-slate-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm mb-2">{item.title}</h3>
                      <p className="text-xs text-slate-600 mb-4 flex-1">{item.description}</p>
                      <Link to={item.link} className="mt-auto">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          {item.cta}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Policy Compliance */}
      <motion.div variants={reveal}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-500" />
              Policy Compliance
            </CardTitle>
            <CardDescription>Active security and governance policies across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {policyChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-b-0 last:pb-0">
                  <div className="mt-1">
                    {item.status === 'active' && (
                      <CheckCircle className="h-5 w-5 text-green-500 bg-green-50 rounded-full p-0.5" />
                    )}
                    {item.status === 'pending' && (
                      <AlertCircle className="h-5 w-5 text-yellow-500 bg-yellow-50 rounded-full p-0.5" />
                    )}
                    {item.status === 'inactive' && (
                      <AlertTriangle className="h-5 w-5 text-red-500 bg-red-50 rounded-full p-0.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.policy}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.status === 'active' && '✓ Active and enforced'}
                      {item.status === 'pending' && 'Requires attention'}
                      {item.status === 'inactive' && 'Inactive - review needed'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Administrative Actions */}
      <motion.div variants={reveal}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Direct access to critical administrative functions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/admin/monitoring">
              <Button variant="outline">
                System Monitoring
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="outline">
                Manage Users
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/admin/autoscaling">
              <Button variant="outline">
                Scaling Policies
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/admin/billing">
              <Button variant="outline">
                Billing Review
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
