import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, DeployContainerRequest } from '../../utils/api'
import { useAuth } from '../../hooks/useAuth'
import DockerHubBrowser from './DockerHubBrowser'

interface DeployModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const COMMON_IMAGES = [
    { value: 'nginx:latest', label: 'Nginx (latest)' },
    { value: 'nginx:alpine', label: 'Nginx (alpine)' },
    { value: 'redis:latest', label: 'Redis (latest)' },
    { value: 'redis:alpine', label: 'Redis (alpine)' },
    { value: 'postgres:latest', label: 'PostgreSQL (latest)' },
    { value: 'postgres:16-alpine', label: 'PostgreSQL 16 (alpine)' },
    { value: 'mongo:latest', label: 'MongoDB (latest)' },
    { value: 'mysql:latest', label: 'MySQL (latest)' },
    { value: 'node:latest', label: 'Node.js (latest)' },
    { value: 'node:20-alpine', label: 'Node.js 20 (alpine)' },
    { value: 'python:latest', label: 'Python (latest)' },
    { value: 'python:3.11-slim', label: 'Python 3.11 (slim)' },
]

const INITIAL_FORM_DATA: DeployContainerRequest = {
    name: '',
    deployment_type: 'dockerhub',
    image: 'nginx:latest',
    docker_username: undefined,  // Empty by default - only fill if needed for private registry
    docker_password: undefined,  // Empty by default - only fill if needed for private registry
    source_url: undefined,
    github_branch: 'main',
    git_token: undefined,
    dockerfile_path: undefined,
    port: undefined,
    cpu_limit: 500,
    memory_limit: 512,
    environment_vars: {},
}

export default function DeployModal({ isOpen, onClose, onSuccess }: DeployModalProps) {
    const { user } = useAuth()
    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8001'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [localImages, setLocalImages] = useState<string[]>([])
    const [showDockerHubBrowser, setShowDockerHubBrowser] = useState(false)


    const [formData, setFormData] = useState<DeployContainerRequest>({ ...INITIAL_FORM_DATA })

    const patchForm = (changes: Partial<DeployContainerRequest>) => {
        setFormData((prev) => ({ ...prev, ...changes }))
    }

    // Removed environment variables state - using Docker credentials instead

    // Fetch local Docker images when modal opens
    useEffect(() => {
        if (isOpen) {
            const token = localStorage.getItem('token')
            fetch(`${API_BASE}/containers/docker/images`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
                .then(async (res) => {
                    const text = await res.text()
                    if (!res.ok) {
                        throw new Error(text || `HTTP ${res.status}`)
                    }
                    return text ? JSON.parse(text) : { images: [] }
                })
                .then(data => {
                    if (Array.isArray(data.images)) {
                        setLocalImages(data.images)
                    } else {
                        setLocalImages([])
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch local images:', err)
                    setLocalImages([])
                })
        }
    }, [isOpen, API_BASE])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const payload: DeployContainerRequest = {
                ...formData,
                name: formData.name.trim(),
                image: formData.image?.trim(),
                source_url: formData.source_url?.trim() || undefined,
                github_branch: formData.github_branch?.trim() || 'main',
                git_token: formData.git_token?.trim() || undefined,
                dockerfile_path: formData.dockerfile_path?.trim() || undefined,
                docker_username: formData.docker_username?.trim() || undefined,
                docker_password: formData.docker_password?.trim() || undefined,
            }

            console.log('Deploying container with data:', payload)
            const result = await api.deployContainer(payload)
            console.log('Deployment successful:', result)
            onSuccess()
            onClose()
            setShowDockerHubBrowser(false)
            setFormData({ ...INITIAL_FORM_DATA })
        } catch (err: any) {
            console.error('Deployment error:', err)
            const errorMsg = err?.message || 'Failed to deploy container'
            setError(`Error: ${errorMsg}`)
        } finally {
            setLoading(false)
        }
    }



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
                onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900">Deploy New Container</h2>
                    <p className="text-sm text-slate-600 mt-1">Configure and deploy a simulated container</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6" autoComplete="off">

                    {error && (
                        <div className="bg-slate-100 border border-slate-300 text-slate-900 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Helpful Guide Banner */}
                    <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-xs font-semibold text-slate-700">
                                    Help
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                                    Need help getting started?
                                </h3>
                                <p className="text-sm text-slate-600 mb-2">
                                    Check out our comprehensive deployment guides for step-by-step instructions
                                </p>
                                <Link
                                    to={`/${user?.role || 'student'}/guides`}
                                    onClick={onClose}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700 hover:underline transition"
                                >
                                    <span>View Deployment Guides</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900">Deployment Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Deployment Source *
                                </label>
                                <select
                                    value={formData.deployment_type}
                                    onChange={(e) => patchForm({ deployment_type: e.target.value as 'dockerhub' | 'github' })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    required
                                >
                                    <option value="dockerhub">Docker Hub / Local Image</option>
                                    <option value="github">GitHub Repository</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    {formData.deployment_type === 'dockerhub'
                                        ? 'Deploy from Docker Hub or local Docker Desktop images'
                                        : 'Clone GitHub repo, build from Dockerfile, and deploy'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Container Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => patchForm({ name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    placeholder="my-container"
                                    required
                                    pattern="[a-zA-Z0-9_\-]+"
                                    title="Only alphanumeric, hyphens, and underscores allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {formData.deployment_type === 'dockerhub' ? (
                        <>
                            {/* Docker Hub/Local Image Fields - FIRST */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Container Image *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowDockerHubBrowser(!showDockerHubBrowser)}
                                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
                                    >
                                        {showDockerHubBrowser ? 'Close Browser' : 'Browse Docker Hub'}
                                    </button>
                                </div>
                                
                                {showDockerHubBrowser && (
                                    <div className="mb-4">
                                        <DockerHubBrowser 
                                            onSelectImage={(image) => {
                                                patchForm({ image })
                                                setShowDockerHubBrowser(false)
                                            }}
                                            selectedImage={formData.image}
                                            dockerUsername={formData.docker_username}
                                            dockerPassword={formData.docker_password}
                                        />
                                    </div>
                                )}
                                
                                <input
                                    type="text"
                                    list="docker-images-list"
                                    value={formData.image || ''}
                                    onChange={(e) => patchForm({ image: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    placeholder="nginx:latest or your-image:tag"
                                    required
                                />
                                <datalist id="docker-images-list">
                                    {COMMON_IMAGES.map((img) => (
                                        <option key={img.value} value={img.value}>{img.label}</option>
                                    ))}
                                    {localImages.map((img) => (
                                        <option key={img} value={img}>Local: {img}</option>
                                    ))}
                                </datalist>
                                <p className="text-xs text-slate-500 mt-1">
                                    Type to search or click "Browse Docker Hub" to find official images
                                </p>
                            </div>

                            {/* Docker Registry Credentials - Collapsible for Private Images */}
                            <details className="rounded-xl border border-slate-200 bg-slate-50/50 group">
                                <summary className="cursor-pointer p-4 flex items-center justify-between select-none">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-700">
                                                Private Registry Credentials
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Optional - Only needed for private Docker Hub images
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(formData.docker_username?.trim() && formData.docker_password?.trim()) && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Configured
                                            </span>
                                        )}
                                        <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </summary>
                                <div className="px-4 pb-4 pt-2 border-t border-slate-200">
                                    <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 mb-4">
                                        <p className="text-xs text-slate-800">
                                            <strong>Note:</strong> Leave these fields empty for public images. Only fill them if you're pulling from a private Docker Hub repository.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Username (Optional)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.docker_username ?? ''}
                                                    onChange={(e) => patchForm({ docker_username: e.target.value || undefined })}
                                                    name="docker_registry_username"
                                                    autoComplete="off"
                                                    data-lpignore="true"
                                                    data-1p-ignore="true"
                                                    data-form-type="other"
                                                    placeholder="Leave empty for public images"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                                />
                                                {formData.docker_username && (
                                                    <button
                                                        type="button"
                                                        onClick={() => patchForm({ docker_username: undefined })}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        title="Clear username"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Access Token (Optional)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="password"
                                                    value={formData.docker_password ?? ''}
                                                    onChange={(e) => patchForm({ docker_password: e.target.value || undefined })}
                                                    name="docker_registry_token"
                                                    autoComplete="off"
                                                    data-lpignore="true"
                                                    data-1p-ignore="true"
                                                    data-form-type="other"
                                                    placeholder="Leave empty for public images"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                                />
                                                {formData.docker_password && (
                                                    <button
                                                        type="button"
                                                        onClick={() => patchForm({ docker_password: undefined })}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        title="Clear token"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Use an access token instead of password for better security
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </>
                    ) : (
                        <>
                            {/* GitHub Repository Fields */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    GitHub Repository URL *
                                </label>
                                <input
                                    type="url"
                                    value={formData.source_url || ''}
                                    onChange={(e) => patchForm({ source_url: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    placeholder="https://github.com/username/repository"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Full GitHub repository URL (public or private)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">
                                        Branch
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.github_branch || 'main'}
                                        onChange={(e) => patchForm({ github_branch: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                        placeholder="main"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">
                                        Dockerfile Path (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dockerfile_path || ''}
                                        onChange={(e) => patchForm({ dockerfile_path: e.target.value || undefined })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                        placeholder="Dockerfile"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    GitHub Token (for private repos)
                                </label>
                                <input
                                    type="password"
                                    value={formData.git_token || ''}
                                    onChange={(e) => patchForm({ git_token: e.target.value || undefined })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    placeholder="ghp_xxxxxxxxxxxx"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Personal Access Token from GitHub Settings -&gt; Developer settings
                                </p>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Port (optional, 1-65535)
                        </label>
                        <input
                            type="number"
                            value={formData.port || ''}
                            onChange={(e) => patchForm({ port: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                            placeholder="8080"
                            min="1"
                            max="65535"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Deploying...' : 'Deploy Container'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}



