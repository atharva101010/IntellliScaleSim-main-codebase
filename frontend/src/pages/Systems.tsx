import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Server, 
  Activity, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Network, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Container,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/utils/api'

interface SystemService {
  id: string
  name: string
  status: 'running' | 'stopped' | 'degraded' | 'error'
  uptime: string
  cpu: number
  memory: number
  lastCheck: string
}

interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_in: number
  network_out: number
  active_connections: number
  request_rate: number
  error_rate: number
}

const EMPTY_METRICS: SystemMetrics = {
  cpu_usage: 0,
  memory_usage: 0,
  disk_usage: 0,
  network_in: 0,
  network_out: 0,
  active_connections: 0,
  request_rate: 0,
  error_rate: 0,
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function Systems() {
  const [services, setServices] = useState<SystemService[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refreshData = async () => {
    setLoading(true)
    setError(null)
    try {
      const overview = await adminApi.getSystemsOverview()
      setServices(overview.services.map((service) => ({
        id: service.id,
        name: service.name,
        status: service.status,
        uptime: service.uptime,
        cpu: service.cpu,
        memory: service.memory,
        lastCheck: service.last_check,
      })))
      setMetrics(overview.metrics)
      setLastRefresh(new Date())
    } catch (err: any) {
      setError(err?.message || 'Failed to load systems overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'stopped':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="success">Running</Badge>
      case 'stopped':
        return <Badge variant="danger">Stopped</Badge>
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>
      case 'error':
        return <Badge variant="danger">Error</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500'
    if (usage < 75) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const runningCount = services.filter(s => s.status === 'running').length
  const totalCount = services.length
  const unhealthyCount = services.filter(s => s.status !== 'running').length
  const allHealthy = totalCount > 0 && unhealthyCount === 0 && !error

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">System Diagnostics</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor system health, services, and infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={fadeInUp} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </motion.div>
      )}

      {/* System Overview */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Services
            </CardDescription>
            <CardTitle className="text-2xl">
              {runningCount}/{totalCount}
              <span className={`text-sm font-normal ml-2 ${allHealthy ? 'text-green-600' : 'text-amber-600'}`}>
                {allHealthy ? 'Online' : 'Attention Needed'}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.cpu_usage.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getUsageColor(metrics.cpu_usage)} rounded-full transition-all`}
                style={{ width: `${metrics.cpu_usage}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              Memory Usage
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.memory_usage.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getUsageColor(metrics.memory_usage)} rounded-full transition-all`}
                style={{ width: `${metrics.memory_usage}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Usage
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.disk_usage.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getUsageColor(metrics.disk_usage)} rounded-full transition-all`}
                style={{ width: `${metrics.disk_usage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Network & Performance Metrics */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network In
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.network_in.toFixed(1)} MB</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network Out
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.network_out.toFixed(1)} MB</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Request Rate
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.request_rate} req/s</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Connections
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.active_connections}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Services Grid */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle>System Services</CardTitle>
            <CardDescription>Status and resource utilization of platform services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => (
                <div 
                  key={service.id}
                  className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(service.status)}
                      <span className="font-medium text-slate-900">{service.name}</span>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Uptime</span>
                      <span className="font-mono">{service.uptime}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-slate-600 mb-1">
                        <span>CPU</span>
                        <span>{service.cpu.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getUsageColor(service.cpu)} rounded-full`}
                          style={{ width: `${service.cpu}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-slate-600 mb-1">
                        <span>Memory</span>
                        <span>{service.memory.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getUsageColor(service.memory)} rounded-full`}
                          style={{ width: `${service.memory}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                      Restart
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                      Logs
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health Summary */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle>Health Summary</CardTitle>
            <CardDescription>Overall system health and recent events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-lg border ${allHealthy ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <CheckCircle className={`h-8 w-8 ${allHealthy ? 'text-green-500' : 'text-amber-500'}`} />
                <div>
                  <h3 className={`font-semibold ${allHealthy ? 'text-green-800' : 'text-amber-800'}`}>
                    {allHealthy ? 'All Systems Operational' : `${unhealthyCount} Service${unhealthyCount === 1 ? '' : 's'} Need Attention`}
                  </h3>
                  <p className={`text-sm ${allHealthy ? 'text-green-600' : 'text-amber-700'}`}>
                    {allHealthy
                      ? 'All monitored services are running within normal parameters'
                      : 'One or more services are degraded, stopped, or unreachable'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-slate-500" />
                    <span className="font-medium">Database</span>
                  </div>
                  <p className="text-sm text-slate-600">Storage currently at {metrics.disk_usage.toFixed(1)}% utilization.</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Container className="h-5 w-5 text-slate-500" />
                    <span className="font-medium">Containers</span>
                  </div>
                  <p className="text-sm text-slate-600">{runningCount} of {totalCount} platform services are currently running.</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-slate-500" />
                    <span className="font-medium">Monitoring</span>
                  </div>
                  <p className="text-sm text-slate-600">Error rate across services: {metrics.error_rate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
