import { Container } from '../../utils/api'
import { formatDistanceToNow } from 'date-fns'
import { getReachableServiceUrl } from '../../utils/runtimeUrls'

interface ContainerCardProps {
    container: Container
    onStart: (id: number) => void
    onStop: (id: number) => void
    onDelete: (id: number) => void
    onViewDetails: (id: number) => void
}

const statusColors = {
    running: 'bg-slate-100 text-slate-900',
    stopped: 'bg-slate-100 text-slate-700',
    pending: 'bg-slate-200 text-slate-800',
    error: 'bg-slate-300 text-white',
}

export default function ContainerCard({
    container,
    onStart,
    onStop,
    onDelete,
    onViewDetails,
}: ContainerCardProps) {
    const serviceUrl = getReachableServiceUrl(container.public_url || container.localhost_url, container.port || undefined)

    const getRelativeTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
        } catch {
            return 'Unknown'
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{container.name}</h3>
                    <p className="text-sm text-slate-600 font-mono mt-1">{container.image}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[container.status]}`}>
                    {container.status}
                </span>
            </div>

            <div className="space-y-2 mb-4">
                {container.port && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Port:</span>
                        <span className="font-semibold text-slate-900">{container.port}</span>
                    </div>
                )}
                {serviceUrl && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">URL:</span>
                        <a
                            href={serviceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-slate-800 hover:text-slate-900 hover:underline"
                        >
                            {serviceUrl}
                        </a>
                    </div>
                )}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Created:</span>
                    <span className="font-medium text-slate-900">{getRelativeTime(container.created_at)}</span>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onViewDetails(container.id)}
                    className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition"
                >
                    Details
                </button>

                {container.status === 'running' ? (
                    <button
                        onClick={() => onStop(container.id)}
                        className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition"
                    >
                        Stop
                    </button>
                ) : container.status === 'stopped' ? (
                    <button
                        onClick={() => onStart(container.id)}
                        className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition"
                    >
                        Start
                    </button>
                ) : null}

                <button
                    onClick={() => onDelete(container.id)}
                    className="px-3 py-2 border border-slate-300 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition"
                    title="Delete container"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}
