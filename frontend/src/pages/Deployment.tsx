import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Container } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import DeployModal from '../components/Deployment/DeployModal'
import ContainerCard from '../components/Deployment/ContainerCard'

export default function Deployment() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [containers, setContainers] = useState<Container[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('')

    const fetchContainers = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await api.listContainers(statusFilter || undefined)
            setContainers(response.containers)
        } catch (err: any) {
            setError(err?.message || 'Failed to load containers')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchContainers()
    }, [statusFilter])

    const handleStart = async (id: number) => {
        try {
            await api.startContainer(id)
            fetchContainers()
        } catch (err: any) {
            alert(err?.message || 'Failed to start container')
        }
    }

    const handleStop = async (id: number) => {
        try {
            await api.stopContainer(id)
            fetchContainers()
        } catch (err: any) {
            alert(err?.message || 'Failed to stop container')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this container?')) return

        try {
            await api.deleteContainer(id)
            fetchContainers()
        } catch (err: any) {
            alert(err?.message || 'Failed to delete container')
        }
    }

    const handleViewDetails = (id: number) => {
        const role = user?.role || 'student'
        navigate(`/${role}/deployments/${id}`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Container Deployments</h2>
                    <p className="text-slate-600 mt-1">Manage your simulated container deployments</p>
                </div>
                <button
                    onClick={() => setIsDeployModalOpen(true)}
                    className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition shadow-sm"
                >
                    + Deploy New Container
                </button>
            </div>

            <div className="flex gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="pending">Pending</option>
                    <option value="error">Error</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                        <p className="text-slate-600 mt-3">Loading containers...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-slate-100 border border-slate-300 text-slate-900 px-6 py-4 rounded-lg">
                    {error}
                </div>
            ) : containers.length === 0 ? (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No containers yet</h3>
                    <p className="text-slate-600 mb-6">Deploy your first container to get started</p>
                    <button
                        onClick={() => setIsDeployModalOpen(true)}
                        className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition"
                    >
                        Deploy Container
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {containers.map((container) => (
                        <ContainerCard
                            key={container.id}
                            container={container}
                            onStart={handleStart}
                            onStop={handleStop}
                            onDelete={handleDelete}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </div>
            )}

            <DeployModal
                isOpen={isDeployModalOpen}
                onClose={() => setIsDeployModalOpen(false)}
                onSuccess={fetchContainers}
            />
        </div>
    )
}
