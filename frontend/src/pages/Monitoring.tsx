import { useState, useEffect } from 'react'
import { monitoring, ContainerStats, MonitoringOverview, API_BASE } from '../utils/api'
import EmbeddedGrafana from '../components/Monitoring/EmbeddedGrafana'
import axios from 'axios'
import { getGrafanaBaseUrl, getServiceBaseUrl } from '../utils/runtimeUrls'

interface ScalingEvent {
    id: number
    policy_id: number
    container_id: number
    action: string
    trigger_metric: string
    metric_value: number
    replica_count_before: number
    replica_count_after: number
    created_at: string
}

export default function Monitoring() {
    const [overview, setOverview] = useState<MonitoringOverview | null>(null)
    const [scalingEvents, setScalingEvents] = useState<ScalingEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showGrafana, setShowGrafana] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
    const [metricsHistory, setMetricsHistory] = useState<{ timestamp: Date; cpu: number; memory: number; containers: number }[]>([])

    const fetchData = async () => {
        try {
            const data = await monitoring.getOverview()
            setOverview(data)
            setLastUpdate(new Date())
            setError(null)
            
            // Track metrics history for mini charts
            setMetricsHistory(prev => {
                const newEntry = {
                    timestamp: new Date(),
                    cpu: data.total_cpu_percent,
                    memory: data.total_memory_usage_mb,
                    containers: data.running_containers
                }
                const updated = [...prev, newEntry].slice(-20) // Keep last 20 data points
                return updated
            })
        } catch (err: any) {
            console.error('Error fetching monitoring data:', err)
            setError(err?.message || 'Failed to fetch monitoring data')
        } finally {
            setLoading(false)
        }
    }

    const fetchScalingEvents = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_BASE}/autoscaling/events?limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setScalingEvents(response.data)
        } catch (err) {
            console.error('Error fetching scaling events:', err)
        }
    }

    useEffect(() => {
        fetchData()
        fetchScalingEvents()

        // Auto-refresh every 3 seconds
        const dataInterval = setInterval(fetchData, 3000)
        const eventsInterval = setInterval(fetchScalingEvents, 5000)

        return () => {
            clearInterval(dataInterval)
            clearInterval(eventsInterval)
        }
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-600">Loading metrics...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
                <p className="text-slate-900">{error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Real-Time Monitoring</h1>
                    <p className="text-slate-600 mt-1">Live container metrics, auto-scaling events & Grafana dashboards</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 bg-slate-700 rounded-full animate-pulse"></div>
                        <span>Live</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-mono text-xs">{lastUpdate.toLocaleTimeString()}</span>
                    </div>
                    <button
                        onClick={() => setShowGrafana(!showGrafana)}
                        className={`px-4 py-2 font-semibold rounded-lg transition ${
                            showGrafana 
                                ? 'bg-slate-900 text-white hover:bg-slate-700' 
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        {showGrafana ? 'Hide Grafana' : 'Show Grafana'}
                    </button>
                    <a
                        href={`${getGrafanaBaseUrl()}/d/intelliscale-embedded/intelliscalesim-embedded-dashboard?orgId=1&refresh=5s`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-all duration-200"
                    >
                        <span>Open in Grafana</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* Overview Cards - Enhanced with mini sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Containers"
                    value={overview?.total_containers || 0}
                    subtitle={`${overview?.running_containers || 0} running`}
                    icon="containers"
                    color="slate"
                    trend={metricsHistory.length > 1 ? metricsHistory[metricsHistory.length - 1].containers - metricsHistory[metricsHistory.length - 2].containers : 0}
                />
                <MetricCard
                    title="CPU Usage"
                    value={`${overview?.total_cpu_percent.toFixed(1) || 0}%`}
                    subtitle="System total"
                    icon="cpu"
                    color="slate"
                    history={metricsHistory.map(m => m.cpu)}
                />
                <MetricCard
                    title="Memory Usage"
                    value={`${overview?.total_memory_usage_mb.toFixed(0) || 0} MB`}
                    subtitle="Total allocated"
                    icon="memory"
                    color="slate"
                    history={metricsHistory.map(m => m.memory)}
                />
                <MetricCard
                    title="Scaling Events"
                    value={scalingEvents.length}
                    subtitle="Recent activity"
                    icon="events"
                    color="slate"
                    trend={scalingEvents.filter(e => new Date(e.created_at) > new Date(Date.now() - 60000)).length}
                />
            </div>

            {/* Auto-Scaling Activity Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scaling Events Timeline */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Auto-Scaling Activity</h3>
                            {scalingEvents.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-900">
                                    {scalingEvents.length} events
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Real-time scaling events</p>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                        {scalingEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-500">No scaling events yet</p>
                                <p className="text-xs text-slate-400 mt-1">Events will appear when auto-scaling triggers</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {scalingEvents.map((event) => (
                                    <ScalingEventItem key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Embedded Grafana Dashboard */}
                <div className="lg:col-span-2">
                    {showGrafana ? (
                        <EmbeddedGrafana 
                            dashboardUid="intelliscale-embedded"
                            height={400}
                            refreshInterval={5}
                            theme="light"
                        />
                    ) : (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 h-[400px] flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <p className="text-slate-600 font-medium">Grafana Dashboard Hidden</p>
                                <p className="text-sm text-slate-500 mt-1">Click "Show Grafana" to view detailed metrics</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Container Metrics */}
            {overview?.containers_stats && overview.containers_stats.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Container Metrics</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {overview.containers_stats.map((stats) => (
                            <ContainerMetricsCard key={stats.id} stats={stats} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Running Containers</h3>
                    <p className="text-slate-600">Deploy a container to see real-time metrics</p>
                </div>
            )}

            {/* Quick Links */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Monitoring Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href={getServiceBaseUrl(9090)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-md transition"
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Prometheus</p>
                            <p className="text-sm text-slate-500">Query metrics directly</p>
                        </div>
                    </a>
                    <a
                        href={getGrafanaBaseUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-md transition"
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Grafana</p>
                            <p className="text-sm text-slate-500">Full dashboard access</p>
                        </div>
                    </a>
                    <a
                        href={getServiceBaseUrl(8080)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-md transition"
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">cAdvisor</p>
                            <p className="text-sm text-slate-500">Container metrics</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    )
}

// Enhanced Metric Card with mini sparkline
function MetricCard({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color, 
    history = [], 
    trend 
}: { 
    title: string; 
    value: string | number; 
    subtitle: string; 
    icon: string; 
    color: string; 
    history?: number[]; 
    trend?: number;
}) {
    // Consistent slate color scheme
    const colorClasses = 'border-slate-200 bg-white'
    const accentColor = 'text-slate-900'

    // Icon SVGs based on type
    const renderIcon = () => {
        const iconClass = "w-5 h-5 text-slate-500";
        switch(icon) {
            case 'containers':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                );
            case 'cpu':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                );
            case 'memory':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                );
            case 'events':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                );
            default:
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                );
        }
    };

    // Mini sparkline SVG
    const renderSparkline = () => {
        if (history.length < 2) return null;
        const max = Math.max(...history) || 1;
        const points = history.map((v, i) => {
            const x = (i / (history.length - 1)) * 60;
            const y = 20 - (v / max) * 18;
            return `${x},${y}`;
        }).join(' ');
        
        return (
            <svg className="w-16 h-5 text-slate-400" viewBox="0 0 60 20">
                <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points={points}
                />
            </svg>
        );
    };

    return (
        <div className={`rounded-xl border ${colorClasses} p-4 shadow-sm`}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                        {renderIcon()}
                    </div>
                    <div className={`text-2xl font-bold ${accentColor}`}>{value}</div>
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                </div>
                <div className="text-right">
                    {history.length > 1 && renderSparkline()}
                    {trend !== undefined && trend !== 0 && (
                        <div className={`text-xs font-medium mt-1 ${trend > 0 ? 'text-slate-600' : 'text-slate-600'}`}>
                            {trend > 0 ? '+' : ''}{trend}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">{title}</p>
        </div>
    )
}

// Scaling Event Item
function ScalingEventItem({ event }: { event: { id: number; action: string; trigger_metric: string; metric_value: number; replica_count_before: number; replica_count_after: number; created_at: string } }) {
    const isScaleUp = event.action === 'scale_up';
    const timeAgo = getTimeAgo(new Date(event.created_at));
    
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isScaleUp ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-700'
            }`}>
                {isScaleUp ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                        {isScaleUp ? 'Scale Up' : 'Scale Down'}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                    {event.trigger_metric}: {event.metric_value.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">
                    Replicas: {event.replica_count_before}{' -> '}{event.replica_count_after}
                </p>
            </div>
        </div>
    );
}

function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function ContainerMetricsCard({ stats }: { stats: ContainerStats }) {
    const getCPUColor = (percent: number) => {
        if (percent >= 80) return 'bg-slate-900'
        if (percent >= 50) return 'bg-slate-700'
        return 'bg-slate-500'
    }

    const getMemoryColor = (percent: number) => {
        if (percent >= 80) return 'bg-slate-900'
        if (percent >= 50) return 'bg-slate-700'
        return 'bg-slate-500'
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{stats.name}</h3>
                    <p className="text-sm text-slate-500 font-mono">{stats.container_id?.substring(0, 12)}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-900">
                    {stats.status}
                </span>
            </div>

            <div className="space-y-4">
                {/* CPU Usage */}
                <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-slate-700">CPU Usage</span>
                        <span className="font-bold text-slate-900">{stats.cpu_percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${getCPUColor(stats.cpu_percent)}`}
                            style={{ width: `${Math.min(stats.cpu_percent, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Memory Usage */}
                <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-slate-700">Memory Usage</span>
                        <span className="font-bold text-slate-900">
                            {stats.memory_usage_mb.toFixed(0)} MB / {stats.memory_limit_mb.toFixed(0)} MB
                            ({stats.memory_percent.toFixed(1)}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${getMemoryColor(stats.memory_percent)}`}
                            style={{ width: `${Math.min(stats.memory_percent, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Network Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Network RX</div>
                        <div className="font-semibold text-slate-800">{stats.network_rx_mb.toFixed(2)} MB</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Network TX</div>
                        <div className="font-semibold text-slate-800">{stats.network_tx_mb.toFixed(2)} MB</div>
                    </div>
                </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
                Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
            </div>
        </div>
    )
}



