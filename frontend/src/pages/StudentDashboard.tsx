import { useEffect, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, ArrowRight, Clock3, PauseCircle, Server } from 'lucide-react'

import { dashboard, DashboardMetrics } from '../utils/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function StudentDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const data = await dashboard.getMetrics()
      setMetrics(data)
      setError(null)
    } catch (fetchError) {
      console.error('Failed to fetch dashboard metrics:', fetchError)
      setError('Unable to load dashboard metrics at the moment.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-slate-300">
        <CardHeader>
          <CardTitle>Dashboard Unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <motion.div className="space-y-8" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Student Console</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time orchestration and operational visibility</p>
        </div>
        <Badge variant={metrics?.system_status === 'healthy' ? 'success' : 'danger'} className="w-fit px-3 py-1 text-xs uppercase tracking-wider">
          System {metrics?.system_status || 'unknown'}
        </Badge>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Deployments"
          value={metrics?.total_containers || 0}
          icon={Server}
          description="All provisioned instances"
        />
        <MetricCard
          title="Running Instances"
          value={metrics?.running_containers || 0}
          icon={Activity}
          description="Active and reachable workloads"
        />
        <MetricCard
          title="Dormant States"
          value={metrics?.stopped_containers || 0}
          icon={PauseCircle}
          description="Stopped or paused workloads"
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeInUp} className="lg:col-span-8">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Load Test History</CardTitle>
                <CardDescription>Recent execution activity and latency overview</CardDescription>
              </div>
              <Badge variant="secondary">Live Feed</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics?.recent_load_tests?.length ? (
                metrics.recent_load_tests.map((test) => (
                  <div key={test.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Sequence {test.id}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                        {new Date(test.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                        {new Date(test.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Requests</div>
                        <div className="text-lg font-semibold text-slate-900">{test.requests}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Latency</div>
                        <div className="text-lg font-semibold text-slate-900">{test.avg_response_time?.toFixed(1) || '--'} ms</div>
                      </div>
                      <Link to="/student/loadtest" aria-label="Open load testing page">
                        <Button variant="outline" size="sm">
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="text-sm text-slate-500">No load tests recorded yet.</p>
                  <Link to="/student/loadtest" className="mt-4 inline-flex">
                    <Button size="sm">Start Load Test</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-6 lg:col-span-4">
          <Card className="border-slate-900 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-slate-300">Fast access to frequent workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickAction to="/student/loadtest" label="New Load Test" />
              <QuickAction to="/student/deployments" label="Deploy Instance" />
              <QuickAction to="/student/monitoring" label="System Monitoring" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Environment</CardTitle>
              <CardDescription>Current workspace profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <EnvironmentRow label="Cluster" value="sim-eu-west-1" />
              <EnvironmentRow label="Scaling" value="Reactive v2" />
              <EnvironmentRow label="Tier" value="Pro Developer" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="text-xs uppercase tracking-wide">{title}</CardDescription>
        <CardTitle className="flex items-center justify-between text-3xl font-semibold text-slate-900">
          {value}
          <Icon className="h-5 w-5 text-slate-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  )
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="block">
      <Button variant="outline" className="w-full justify-between border-slate-700 bg-transparent text-white hover:bg-slate-800 hover:text-white">
        <span>{label}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  )
}

function EnvironmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}
