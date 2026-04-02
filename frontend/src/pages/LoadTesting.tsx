import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Container {
    id: number
    name: string
    localhost_url?: string | null
    port?: number | null
}

interface LoadTestConfig {
    containerId: number | null
    totalRequests: number
    concurrency: number
    durationSeconds: number
}

interface LoadTestStatus {
    id: number
    status: string
    requests_sent?: number
    requests_completed?: number
    requests_failed?: number
    progress_percent?: number
    error_message?: string | null
    avg_response_time_ms?: number
    peak_cpu_percent?: number
    peak_memory_mb?: number
    created_at?: string
}

interface LiveMetric {
    timestamp: string
    cpu_percent: number
    cpu: number
    memory_mb: number
    memory: number
    requests_completed: number
    completed: number
    requests_failed: number
    failed: number
    progress: number
    active: number
}

interface TestResult {
    id: string
    timestamp: string
    container: string
    status: string
    requests: number
    completed: number
    failed: number
    avg_response_time: number
    peak_cpu: number
    peak_memory: number
}

export default function LoadTesting() {
    const [containers, setContainers] = useState<Container[]>([])
    const [config, setConfig] = useState<LoadTestConfig>({
        containerId: null,
        totalRequests: 100,
        concurrency: 10,
        durationSeconds: 30
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isRunning, setIsRunning] = useState(false)
    const [currentTest, setCurrentTest] = useState<LoadTestStatus | null>(null)
    const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([])
    const [eventSource, setEventSource] = useState<EventSource | null>(null)
    const [testHistory, setTestHistory] = useState<TestResult[]>([])
    const [showHistory, setShowHistory] = useState(false)

    const ACTIVE_TEST_KEY = 'active_load_test_id'
    const HISTORY_KEY = 'load_test_history'

    useEffect(() => {
        fetchContainers()
        checkForRunningTest()
        loadTestHistory()
    }, [])

    const fetchContainers = async () => {
        try {
            const response = await api.listContainers('running')
            setContainers(response.containers || [])
        } catch (error) {
            console.error('Failed to fetch containers:', error)
        }
    }

    const loadTestHistory = () => {
        try {
            const saved = localStorage.getItem(HISTORY_KEY)
            if (saved) {
                setTestHistory(JSON.parse(saved))
            }
        } catch (error) {
            console.error('Failed to load test history:', error)
        }
    }

    const saveTestToHistory = (test: LoadTestStatus, containerName: string) => {
        const result: TestResult = {
            id: test.id.toString(),
            timestamp: new Date().toLocaleString(),
            container: containerName,
            status: test.status,
            requests: config.totalRequests,
            completed: test.requests_completed || 0,
            failed: test.requests_failed || 0,
            avg_response_time: test.avg_response_time_ms || 0,
            peak_cpu: test.peak_cpu_percent || 0,
            peak_memory: test.peak_memory_mb || 0
        }
        
        const updated = [result, ...testHistory].slice(0, 50)
        setTestHistory(updated)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    }

    const checkForRunningTest = async () => {
        const testId = sessionStorage.getItem(ACTIVE_TEST_KEY)
        if (testId) {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`/api/loadtest/${testId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.status === 'running' || data.status === 'pending') {
                        setIsRunning(true)
                        setCurrentTest(data)
                        setupSSE(parseInt(testId))
                        pollTestStatus(parseInt(testId))
                    } else {
                        sessionStorage.removeItem(ACTIVE_TEST_KEY)
                    }
                }
            } catch (error) {
                console.error('Failed to restore running test:', error)
                sessionStorage.removeItem(ACTIVE_TEST_KEY)
            }
        }
    }

    const validateConfig = (): boolean => {
        const newErrors: Record<string, string> = {}
        if (!config.containerId) newErrors.container = 'Please select a container'
        if (config.totalRequests > 1000) newErrors.requests = 'Maximum 1000 requests'
        if (config.concurrency > 50) newErrors.concurrency = 'Maximum 50 concurrent'
        if (config.durationSeconds > 300) newErrors.duration = 'Maximum 300 seconds'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const startLoadTest = async () => {
        if (!validateConfig()) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/loadtest/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    container_id: config.containerId,
                    total_requests: config.totalRequests,
                    concurrency: config.concurrency,
                    duration_seconds: config.durationSeconds
                })
            })

            if (!response.ok) {
                const error = await response.json()
                alert(error.detail || 'Failed to start load test')
                return
            }

            const data = await response.json()
            setIsRunning(true)
            setLiveMetrics([])
            sessionStorage.setItem(ACTIVE_TEST_KEY, data.id.toString())
            pollTestStatus(data.id)
            setupSSE(data.id)
        } catch (error: any) {
            alert(error.message || 'An unexpected error occurred')
        }
    }

    const pollTestStatus = async (testId: number) => {
        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`/api/loadtest/${testId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await response.json()
                setCurrentTest(data)
                
                if (['completed', 'failed', 'cancelled'].includes(data.status)) {
                    clearInterval(interval)
                    const containerName = containers.find(c => c.id === config.containerId)?.name || 'Unknown'
                    saveTestToHistory(data, containerName)
                    setIsRunning(false)
                    sessionStorage.removeItem(ACTIVE_TEST_KEY)
                }
            } catch (error) {
                console.error('Failed to fetch test status:', error)
            }
        }, 2000)
    }

    const setupSSE = (testId: number) => {
        const token = localStorage.getItem('token')
        const es = new EventSource(`/api/loadtest/${testId}/metrics/stream?token=${token}`)
        es.onmessage = (event) => {
            const metric = JSON.parse(event.data)
            setLiveMetrics(prev => [...prev.slice(-50), metric])
        }
        setEventSource(es)
    }

    const clearHistory = () => {
        if (confirm('Clear all test history?')) {
            setTestHistory([])
            localStorage.removeItem(HISTORY_KEY)
        }
    }

    if (showHistory) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Load Test History</h1>
                            <p className="text-gray-600">Previous test results and performance data</p>
                        </div>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                        >
                            ← Back
                        </button>
                    </div>

                    {testHistory.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                            <p className="text-lg">No test history yet. Run your first load test!</p>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={clearHistory}
                                className="mb-4 px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                            >
                                Clear History
                            </button>
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Timestamp</th>
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Container</th>
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Status</th>
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Requests</th>
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Response Time (avg)</th>
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Peak CPU</th>
                                            <th className="text-left py-4 px-6 font-bold text-gray-900">Peak Memory</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {testHistory.map((result) => (
                                            <tr key={result.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-4 px-6 text-gray-700">{result.timestamp}</td>
                                                <td className="py-4 px-6 text-gray-700 font-semibold">🚀 {result.container}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        result.status === 'completed'
                                                            ? 'bg-green-100 text-green-800'
                                                            : result.status === 'failed'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {result.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 font-bold text-gray-900">
                                                    {result.completed}/{result.requests}
                                                </td>
                                                <td className="py-4 px-6 text-gray-700">{result.avg_response_time.toFixed(0)}ms</td>
                                                <td className="py-4 px-6 font-bold text-gray-900">{result.peak_cpu.toFixed(1)}%</td>
                                                <td className="py-4 px-6 font-bold text-gray-900">{result.peak_memory.toFixed(0)}MB</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">⚡ Load Testing</h1>
                        <p className="text-gray-600">Simulate traffic and measure performance</p>
                    </div>
                    {testHistory.length > 0 && (
                        <button
                            onClick={() => setShowHistory(true)}
                            className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900"
                        >
                            📊 View History ({testHistory.length})
                        </button>
                    )}
                </div>

                {!isRunning ? (
                    <div className="bg-white rounded-lg shadow p-8 space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900">Configure Test</h2>

                        {/* Container Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Container</label>
                            <select
                                value={config.containerId || ''}
                                onChange={(e) => setConfig({ ...config, containerId: parseInt(e.target.value) })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a running container...</option>
                                {containers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        🚀 {c.name} ({c.localhost_url || `localhost:${c.port}`})
                                    </option>
                                ))}
                            </select>
                            {errors.container && <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.container}</p>}
                        </div>

                        {/* Configuration Grid */}
                        <div className="grid grid-cols-3 gap-6">
                            {/* Total Requests */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Requests</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={config.totalRequests}
                                    onChange={(e) => setConfig({ ...config, totalRequests: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)) })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 font-bold text-2xl text-center text-gray-900"
                                />
                                {errors.requests && <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.requests}</p>}
                            </div>

                            {/* Concurrency */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Concurrency</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={config.concurrency}
                                    onChange={(e) => setConfig({ ...config, concurrency: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 font-bold text-2xl text-center text-gray-900"
                                />
                                {errors.concurrency && <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.concurrency}</p>}
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (seconds)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="300"
                                    value={config.durationSeconds}
                                    onChange={(e) => setConfig({ ...config, durationSeconds: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 font-bold text-2xl text-center text-gray-900"
                                />
                                {errors.duration && <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {errors.duration}</p>}
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-900 font-semibold">
                                💡 System will target {Math.floor(config.totalRequests / config.durationSeconds)} req/sec to reach {config.totalRequests} requests in {config.durationSeconds}s
                            </p>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={startLoadTest}
                            disabled={!config.containerId}
                            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            🚀 Start Load Test
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Status Section */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Test Running...</h2>
                                    <p className="text-gray-600">{currentTest?.requests_completed || 0} / {config.totalRequests} requests completed</p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-bold">
                                        {(currentTest?.progress_percent || 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${currentTest?.progress_percent || 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Live Metrics Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow p-4">
                                <p className="text-sm text-gray-600 font-semibold">CPU</p>
                                <p className="text-3xl font-bold text-violet-600 mt-2">
                                    {(liveMetrics[liveMetrics.length - 1]?.cpu || 0).toFixed(1)}%
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-4">
                                <p className="text-sm text-gray-600 font-semibold">Memory</p>
                                <p className="text-3xl font-bold text-cyan-600 mt-2">
                                    {(liveMetrics[liveMetrics.length - 1]?.memory || 0).toFixed(0)}MB
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-4">
                                <p className="text-sm text-gray-600 font-semibold">Completed</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {currentTest?.requests_completed || 0}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-4">
                                <p className="text-sm text-gray-600 font-semibold">Failed</p>
                                <p className="text-3xl font-bold text-red-600 mt-2">
                                    {currentTest?.requests_failed || 0}
                                </p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">CPU & Memory Usage</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={liveMetrics}>
                                        <defs>
                                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fill="url(#colorCpu)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Requests Over Time</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={liveMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                                        <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="Failed" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Summary */}
                        {currentTest && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Test Summary</h3>
                                <div className="grid grid-cols-3 gap-6 text-sm">
                                    <div>
                                        <p className="text-gray-600 font-semibold">Average Response Time</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">{(currentTest.avg_response_time_ms || 0).toFixed(0)}ms</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 font-semibold">Peak CPU Usage</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">{(currentTest.peak_cpu_percent || 0).toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 font-semibold">Peak Memory</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">{(currentTest.peak_memory_mb || 0).toFixed(0)}MB</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
