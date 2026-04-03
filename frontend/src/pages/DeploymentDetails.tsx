import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Container, ContainerLogsResponse } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'

const statusColors = {
    running: 'bg-slate-100 text-slate-900',
    stopped: 'bg-slate-100 text-slate-700',
    pending: 'bg-slate-200 text-slate-900',
    error: 'bg-slate-300 text-slate-900',
}

export default function DeploymentDetails() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [container, setContainer] = useState<Container | null>(null)
    const [logs, setLogs] = useState<ContainerLogsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchContainer = async () => {
        if (!id) return

        setLoading(true)
        setError(null)

        try {
            const [containerData, logsData] = await Promise.all([
                api.getContainer(parseInt(id)),
                api.getContainerLogs(parseInt(id)),
            ])
            setContainer(containerData)
            setLogs(logsData)
        } catch (err: any) {
            setError(err?.message || 'Failed to load container details')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchContainer()
    }, [id])

    const handleStart = async () => {
        if (!id) return
        try {
            await api.startContainer(parseInt(id))
            fetchContainer()
        } catch (err: any) {
            alert(err?.message || 'Failed to start container')
        }
    }

    const handleStop = async () => {
        if (!id) return
        try {
            await api.stopContainer(parseInt(id))
            fetchContainer()
        } catch (err: any) {
            alert(err?.message || 'Failed to stop container')
        }
    }

    const handleDelete = async () => {
        if (!id) return
        if (!confirm('Are you sure you want to delete this container?')) return

        try {
            await api.deleteContainer(parseInt(id))
            const role = user?.role || 'student'
            navigate(`/${role}/deployments`)
        } catch (err: any) {
            alert(err?.message || 'Failed to delete container')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    <p className="text-slate-600 mt-3">Loading container details...</p>
                </div>
            </div>
        )
    }

    if (error || !container) {
        return (
            <div className="bg-slate-100 border border-slate-300 text-slate-900 px-6 py-4 rounded-lg">
                {error || 'Container not found'}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-slate-900">{container.name}</h2>
                    <p className="text-slate-600 font-mono text-sm mt-1">{container.image}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColors[container.status]}`}>
                    {container.status}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Container Information</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Container ID:</span>
                            <span className="font-mono text-sm font-semibold">#{container.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Image:</span>
                            <span className="font-mono text-sm font-semibold">{container.image}</span>
                        </div>
                        {container.port && (
                            <div className="flex justify-between">
                                <span className="text-slate-600">Port:</span>
                                <span className="font-semibold">{container.port}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-slate-600">Created:</span>
                            <span className="font-semibold">{format(new Date(container.created_at), 'PPpp')}</span>
                        </div>
                        {container.started_at && (
                            <div className="flex justify-between">
                                <span className="text-slate-600">Started:</span>
                                <span className="font-semibold">{format(new Date(container.started_at), 'PPpp')}</span>
                            </div>
                        )}
                        {container.stopped_at && (
                            <div className="flex justify-between">
                                <span className="text-slate-600">Stopped:</span>
                                <span className="font-semibold">{format(new Date(container.stopped_at), 'PPpp')}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Resource Limits</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-600">CPU</span>
                                <span className="font-semibold">{container.cpu_limit}m</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-slate-900 h-2 rounded-full"
                                    style={{ width: `${(container.cpu_limit / 4000) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-600">Memory</span>
                                <span className="font-semibold">{container.memory_limit}Mi</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-slate-900 h-2 rounded-full"
                                    style={{ width: `${(container.memory_limit / 8192) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {Object.keys(container.environment_vars || {}).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Environment Variables</h3>
                    <div className="space-y-2">
                        {Object.entries(container.environment_vars).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg font-mono text-sm">
                                <span className="font-bold text-slate-900">{key}</span>
                                <span className="text-slate-500">=</span>
                                <span className="text-slate-700">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Container Logs</h3>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    {logs?.logs.map((log, idx) => (
                        <div key={idx} className="text-slate-200">
                            {log}
                        </div>
                    )) || <div className="text-slate-500">No logs available</div>}
                </div>
            </div>

            <div className="flex gap-3">
                {container.status === 'running' ? (
                    <button
                        onClick={handleStop}
                        className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition"
                    >
                        Stop Container
                    </button>
                ) : container.status === 'stopped' ? (
                    <button
                        onClick={handleStart}
                        className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition"
                    >
                        Start Container
                    </button>
                ) : null}

                <button
                    onClick={handleDelete}
                    className="px-6 py-2.5 border border-slate-300 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
                >
                    Delete Container
                </button>
            </div>
        </div>
    )
}
