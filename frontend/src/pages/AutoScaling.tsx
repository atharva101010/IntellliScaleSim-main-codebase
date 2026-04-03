import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'

interface ScalingPolicy {
    id: number
    container_id: number
    enabled: boolean
    scale_up_cpu_threshold: number
    scale_up_memory_threshold: number
    scale_down_cpu_threshold: number
    scale_down_memory_threshold: number
    min_replicas: number
    max_replicas: number
    cooldown_period: number
    evaluation_period: number
    created_at: string
    last_scaled_at: string | null
}

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

interface Container {
    id: number
    name: string
    status: string
}

export default function AutoScaling() {
    const { token } = useAuth()
    const [policies, setPolicies] = useState<ScalingPolicy[]>([])
    const [events, setEvents] = useState<ScalingEvent[]>([])
    const [containers, setContainers] = useState<Container[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const [formData, setFormData] = useState({
        container_id: '',
        scale_up_cpu_threshold: 80,
        scale_up_memory_threshold: 80,
        scale_down_cpu_threshold: 30,
        scale_down_memory_threshold: 30,
        min_replicas: 1,
        max_replicas: 8,
        cooldown_period: 300,
        evaluation_period: 60
    })

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

    const extractApiErrorMessage = (error: any): string => {
        const detail = error?.response?.data?.detail ?? error?.response?.data ?? error?.message

        if (Array.isArray(detail)) {
            const entries = detail
                .map((item: any) => {
                    if (typeof item === 'string') return item
                    if (item?.msg) {
                        const loc = Array.isArray(item.loc) ? ` (${item.loc.join('.')})` : ''
                        return `${item.msg}${loc}`
                    }
                    return JSON.stringify(item)
                })
                .filter(Boolean)
            return entries.join('; ') || 'Failed to create policy'
        }

        if (typeof detail === 'string') {
            return detail
        }

        if (detail && typeof detail === 'object') {
            if (typeof detail.message === 'string') return detail.message
            if (typeof detail.msg === 'string') return detail.msg
            return JSON.stringify(detail)
        }

        return 'Failed to create policy'
    }

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            await Promise.all([
                fetchContainers(),
                fetchPolicies(),
                fetchEvents()
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchContainers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/containers`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            let containerList: Container[] = []
            if (Array.isArray(res.data)) {
                containerList = res.data.filter((c: Container) => c.status === 'running')
            } else if (res.data?.containers) {
                containerList = res.data.containers.filter((c: Container) => c.status === 'running')
            }
            setContainers(containerList)
        } catch (error) {
            console.error('Error fetching containers:', error)
            setContainers([])
        }
    }

    const fetchPolicies = async () => {
        try {
            const res = await axios.get(`${API_BASE}/autoscaling/policies`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setPolicies(res.data)
        } catch (error) {
            console.error('Error fetching policies:', error)
        }
    }

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_BASE}/autoscaling/events?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setEvents(res.data)
        } catch (error) {
            console.error('Error fetching events:', error)
        }
    }

    const createPolicy = async (e: React.FormEvent) => {
        e.preventDefault()

        const selectedContainerId = parseInt(formData.container_id, 10)
        if (Number.isNaN(selectedContainerId)) {
            alert('Please select a running container before creating a policy')
            return
        }

        try {
            const payload = {
                ...formData,
                container_id: selectedContainerId
            }
            await axios.post(`${API_BASE}/autoscaling/policies`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setShowModal(false)
            setFormData({
                container_id: '',
                scale_up_cpu_threshold: 80,
                scale_up_memory_threshold: 80,
                scale_down_cpu_threshold: 30,
                scale_down_memory_threshold: 30,
                min_replicas: 1,
                max_replicas: 8,
                cooldown_period: 300,
                evaluation_period: 60
            })
            fetchPolicies()
        } catch (error: any) {
            alert(extractApiErrorMessage(error))
        }
    }

    const togglePolicy = async (policyId: number) => {
        try {
            await axios.post(
                `${API_BASE}/autoscaling/policies/${policyId}/toggle`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            )
            fetchPolicies()
        } catch (error) {
            console.error('Error toggling policy:', error)
        }
    }

    const deletePolicy = async (policyId: number) => {
        if (!confirm('Delete this policy?')) return
        try {
            await axios.delete(`${API_BASE}/autoscaling/policies/${policyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchPolicies()
        } catch (error) {
            console.error('Error deleting policy:', error)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-12"><span className="text-slate-600">Loading...</span></div>
    }

    return (
        <div className="space-y-6">
            <div className="max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Auto-Scaling Policies</h1>
                    <p className="text-slate-600">Manage container auto-scaling based on resource usage</p>
                </div>

                {/* Action Button */}
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition shadow-sm"
                    >
                        + Create Policy
                    </button>
                </div>

                {/* Policies Grid */}
                <div className="grid grid-cols-1 gap-6 mb-8">
                    {policies.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-500">
                            No scaling policies configured yet
                        </div>
                    ) : (
                        policies.map((policy) => (
                            <div key={policy.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Policy #{policy.id}</h3>
                                        <p className="text-sm text-slate-600">Container ID: {policy.container_id}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => togglePolicy(policy.id)}
                                            className={`px-4 py-2 rounded text-sm font-semibold ${
                                                policy.enabled
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                                            }`}
                                        >
                                            {policy.enabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                        <button
                                            onClick={() => deletePolicy(policy.id)}
                                            className="px-4 py-2 rounded text-sm font-semibold border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-sm">
                                    {[
                                        { label: 'Scale Up CPU', value: `${policy.scale_up_cpu_threshold}%` },
                                        { label: 'Scale Up Mem', value: `${policy.scale_up_memory_threshold}%` },
                                        { label: 'Scale Down CPU', value: `${policy.scale_down_cpu_threshold}%` },
                                        { label: 'Scale Down Mem', value: `${policy.scale_down_memory_threshold}%` },
                                        { label: 'Min', value: policy.min_replicas },
                                        { label: 'Max', value: policy.max_replicas },
                                        { label: 'Cooldown', value: `${policy.cooldown_period}s` },
                                        { label: 'Eval Period', value: `${policy.evaluation_period}s` }
                                    ].map((item, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs text-slate-600 font-semibold">{item.label}</p>
                                            <p className="text-lg font-bold text-slate-900">{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {policy.last_scaled_at && (
                                    <p className="mt-4 text-xs text-slate-600">
                                        Last scaled: {new Date(policy.last_scaled_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Recent Events */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Recent Scaling Events</h2>
                    {events.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No scaling events yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="text-left py-3 px-4 font-bold text-slate-900">Timestamp</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-900">Action</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-900">Trigger</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-900">Value</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-900">Replicas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event) => (
                                        <tr key={event.id} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="py-3 px-4">{new Date(event.created_at).toLocaleString()}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded text-xs font-bold ${
                                                    event.action === 'scale_up'
                                                        ? 'bg-slate-100 text-slate-900'
                                                        : 'bg-slate-200 text-slate-900'
                                                }`}>
                                                    {event.action === 'scale_up' ? 'Scale Up' : 'Scale Down'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{event.trigger_metric}</td>
                                            <td className="py-3 px-4 font-bold">{event.metric_value.toFixed(1)}%</td>
                                            <td className="py-3 px-4 font-bold">{event.replica_count_before} to {event.replica_count_after}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200">
                            {/* Header */}
                            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                                <h2 className="text-2xl font-bold">+ Create Auto-Scaling Policy</h2>
                                <button onClick={() => setShowModal(false)} className="text-2xl text-slate-500 hover:text-slate-700">x</button>
                            </div>

                            {/* Form */}
                            <form onSubmit={createPolicy} className="p-8 space-y-6">
                                {/* Container */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase">SELECT CONTAINER</label>
                                    <select
                                        required
                                        value={formData.container_id}
                                        onChange={(e) => setFormData({ ...formData, container_id: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    >
                                        <option value="">Choose running container...</option>
                                        {containers.length === 0 ? (
                                            <option disabled>No running containers</option>
                                        ) : (
                                            containers.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    Deploy {c.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* Scale Up */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h3 className="font-bold text-slate-900 mb-4">Scale Up Thresholds</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">CPU (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.scale_up_cpu_threshold}
                                                onChange={(e) => setFormData({ ...formData, scale_up_cpu_threshold: parseFloat(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Memory (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.scale_up_memory_threshold}
                                                onChange={(e) => setFormData({ ...formData, scale_up_memory_threshold: parseFloat(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Scale Down */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h3 className="font-bold text-slate-900 mb-4">Scale Down Thresholds</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">CPU (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.scale_down_cpu_threshold}
                                                onChange={(e) => setFormData({ ...formData, scale_down_cpu_threshold: parseFloat(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Memory (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.scale_down_memory_threshold}
                                                onChange={(e) => setFormData({ ...formData, scale_down_memory_threshold: parseFloat(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Replica Config */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h3 className="font-bold text-slate-900 mb-4">Analytics Replica Configuration</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Min</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={formData.min_replicas}
                                                onChange={(e) => setFormData({ ...formData, min_replicas: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Max</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={formData.max_replicas}
                                                onChange={(e) => setFormData({ ...formData, max_replicas: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Cooldown (s)</label>
                                            <input
                                                type="number"
                                                min="60"
                                                value={formData.cooldown_period}
                                                onChange={(e) => setFormData({ ...formData, cooldown_period: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition text-center"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition"
                                    >
                                        Create Policy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 border border-slate-300 bg-white text-slate-900 py-3 rounded-lg font-bold hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


