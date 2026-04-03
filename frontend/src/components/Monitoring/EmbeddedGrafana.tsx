import { useState, useEffect } from 'react'
import { getGrafanaBaseUrl } from '../../utils/runtimeUrls'

interface EmbeddedGrafanaProps {
    dashboardUid?: string
    panelId?: number
    height?: number | string
    refreshInterval?: number
    theme?: 'light' | 'dark'
    showControls?: boolean
}

export default function EmbeddedGrafana({
    dashboardUid = 'intelliscale-embedded',
    panelId,
    height = 400,
    refreshInterval = 5,
    theme = 'light',
    showControls = true
}: EmbeddedGrafanaProps) {
    const GRAFANA_URL = getGrafanaBaseUrl()
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

    // Construct Grafana iframe URL
    const buildGrafanaUrl = () => {
        const params = new URLSearchParams({
            orgId: '1',
            refresh: `${refreshInterval}s`,
            theme: theme,
            kiosk: 'tv', // Hide Grafana header/footer for embedding
        })

        // If panelId is specified, show just that panel
        if (panelId) {
            params.set('panelId', panelId.toString())
            params.set('fullscreen', 'true')
            return `${GRAFANA_URL}/d-solo/${dashboardUid}?${params.toString()}`
        }

        // Otherwise show the full dashboard
        return `${GRAFANA_URL}/d/${dashboardUid}?${params.toString()}`
    }

    const grafanaUrl = buildGrafanaUrl()

    const handleLoad = () => {
        setIsLoading(false)
        setHasError(false)
    }

    const handleError = () => {
        setIsLoading(false)
        setHasError(true)
    }

    const openInNewTab = () => {
        // Open full Grafana dashboard in new tab
        const fullUrl = `${GRAFANA_URL}/d/${dashboardUid}?orgId=1&refresh=${refreshInterval}s`
        window.open(fullUrl, '_blank')
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            {showControls && (
                <div className="bg-slate-900 px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">Analytics</span>
                            <div>
                                <h3 className="text-lg font-bold text-white">Live Metrics Dashboard</h3>
                                <p className="text-slate-300 text-sm">Powered by Grafana & Prometheus</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition"
                                title={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={openInNewTab}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition"
                                title="Open in Grafana"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div 
                className="relative bg-slate-50"
                style={{ height: isExpanded ? '80vh' : (typeof height === 'number' ? `${height}px` : height) }}
            >
                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                        <div className="text-center">
                            <div className="inline-block w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                            <p className="mt-3 text-slate-600">Loading dashboard...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                        <div className="text-center p-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                                <span className="text-3xl">!</span>
                            </div>
                            <h4 className="text-lg font-semibold text-slate-800 mb-2">Dashboard Unavailable</h4>
                            <p className="text-slate-600 mb-4">
                                Grafana dashboard could not be loaded. Make sure the monitoring services are running.
                            </p>
                            <div className="space-y-2">
                                <p className="text-sm text-slate-500">
                                    Run: <code className="bg-slate-200 px-2 py-1 rounded">docker-compose up -d</code>
                                </p>
                                <button
                                    onClick={() => { setHasError(false); setIsLoading(true); }}
                                    className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grafana Iframe */}
                <iframe
                    src={grafanaUrl}
                    onLoad={handleLoad}
                    onError={handleError}
                    className="w-full h-full border-0"
                    title="Grafana Dashboard"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
            </div>

            {/* Footer with quick stats */}
            {showControls && (
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-700 rounded-full animate-pulse"></div>
                            <span>Auto-refreshing every {refreshInterval}s</span>
                        </div>
                        <a
                            href={`${GRAFANA_URL}/d/${dashboardUid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 hover:text-slate-900 font-medium hover:underline"
                        >
                            Open full dashboard
                        </a>
                    </div>
                </div>
            )}
        </div>
    )
}

// Individual panel component for embedding specific metrics
export function GrafanaPanel({
    dashboardUid = 'intelliscale-embedded',
    panelId,
    title,
    height = 200
}: {
    dashboardUid?: string
    panelId: number
    title?: string
    height?: number
}) {
    const GRAFANA_URL = getGrafanaBaseUrl()
    const [isLoading, setIsLoading] = useState(true)

    const panelUrl = `${GRAFANA_URL}/d-solo/${dashboardUid}?orgId=1&panelId=${panelId}&refresh=5s&theme=light`

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {title && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
                </div>
            )}
            <div className="relative" style={{ height: `${height}px` }}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    </div>
                )}
                <iframe
                    src={panelUrl}
                    onLoad={() => setIsLoading(false)}
                    className="w-full h-full border-0"
                    title={title || `Panel ${panelId}`}
                />
            </div>
        </div>
    )
}

// Grid of metric panels
export function MetricsPanelGrid() {
    const panels = [
        { panelId: 1, title: 'Average CPU Usage' },
        { panelId: 2, title: 'Average Memory Usage' },
        { panelId: 3, title: 'Running Containers' },
        { panelId: 4, title: 'API Latency (p95)' },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {panels.map((panel) => (
                <GrafanaPanel
                    key={panel.panelId}
                    panelId={panel.panelId}
                    title={panel.title}
                    height={150}
                />
            ))}
        </div>
    )
}

