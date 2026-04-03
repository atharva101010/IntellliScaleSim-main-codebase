import { useState, useEffect } from 'react'
import { dockerhub, DockerHubImage } from '../../utils/api'

interface DockerHubBrowserProps {
    onSelectImage: (image: string) => void
    selectedImage?: string
    dockerUsername?: string
    dockerPassword?: string
}

const PAGE_SIZE = 24
const CATALOG_SEED_QUERY = 'a'
type BrowserView = 'popular' | 'search' | 'my-images'
type ConnectionState = 'checking' | 'connected' | 'disconnected' | 'authenticated'

export default function DockerHubBrowser({ 
    onSelectImage, 
    selectedImage,
    dockerUsername,
    dockerPassword 
}: DockerHubBrowserProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [submittedQuery, setSubmittedQuery] = useState('')
    const [images, setImages] = useState<DockerHubImage[]>([])
    const [categories, setCategories] = useState<Record<string, string[]>>({})
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [officialOnly, setOfficialOnly] = useState(false)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [connectionState, setConnectionState] = useState<ConnectionState>('checking')
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [view, setView] = useState<BrowserView>('popular')
    const [userImages, setUserImages] = useState<DockerHubImage[]>([])
    const [loadingUserImages, setLoadingUserImages] = useState(false)

    const hasCredentials = !!(dockerUsername?.trim() && dockerPassword?.trim())

    useEffect(() => {
        fetchCategories()
        verifyDockerHubConnection()
        fetchPopular()
    }, [])

    // Fetch user's private images when credentials are provided
    useEffect(() => {
        if (hasCredentials && dockerUsername) {
            fetchUserImages(dockerUsername)
        } else {
            setUserImages([])
        }
    }, [dockerUsername, dockerPassword, hasCredentials])

    const verifyDockerHubConnection = async () => {
        try {
            const result = await dockerhub.search('nginx', 1, 1, false)
            if (result.success && result.total_count > 0) {
                setConnectionState(hasCredentials ? 'authenticated' : 'connected')
            } else {
                setConnectionState('disconnected')
            }
        } catch {
            setConnectionState('disconnected')
        }
    }

    const fetchUserImages = async (username: string) => {
        setLoadingUserImages(true)
        try {
            // Search for user's images using their username as namespace
            const result = await dockerhub.search(username, 1, 50, false)
            if (result.success) {
                // Filter to only show images from this user's namespace
                const filteredImages = result.images.filter(img => 
                    img.namespace === username || img.name.startsWith(username + '/')
                )
                setUserImages(filteredImages)
                setConnectionState('authenticated')
            }
        } catch (err) {
            console.error('Failed to fetch user images:', err)
            setUserImages([])
        } finally {
            setLoadingUserImages(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const result = await dockerhub.getCategories()
            if (result.success) {
                setCategories(result.categories)
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err)
        }
    }

    const fetchPopular = async (category?: string) => {
        setLoading(true)
        setError(null)
        setView('popular')
        setPage(1)
        setTotalCount(0)
        try {
            const result = await dockerhub.getPopular(category, 50)
            if (result.success) {
                setImages(result.images)
                setConnectionState(hasCredentials ? 'authenticated' : 'connected')
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to fetch popular images')
            setConnectionState('disconnected')
        } finally {
            setLoading(false)
        }
    }

    const runSearch = async (query: string, nextPage: number, append: boolean) => {
        if (!query.trim()) {
            setError('Enter an image name to search Docker Hub')
            return
        }

        if (append) {
            setLoadingMore(true)
        } else {
            setLoading(true)
            setError(null)
        }

        try {
            const result = await dockerhub.search(query.trim(), nextPage, PAGE_SIZE, officialOnly)
            if (result.success) {
                setView('search')
                setConnectionState(hasCredentials ? 'authenticated' : 'connected')
                setPage(nextPage)
                setTotalCount(result.total_count)
                setSubmittedQuery(query.trim())
                if (append) {
                    setImages((prev) => [...prev, ...result.images])
                } else {
                    setImages(result.images)
                }
            }
        } catch (err: any) {
            setError(err?.message || 'Search failed')
            setConnectionState('disconnected')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            fetchPopular(selectedCategory)
            return
        }

        await runSearch(searchQuery, 1, false)
    }

    const handleExploreCatalog = async () => {
        setSearchQuery(CATALOG_SEED_QUERY)
        await runSearch(CATALOG_SEED_QUERY, 1, false)
    }

    const handleLoadMore = async () => {
        if (loadingMore || view !== 'search') return
        await runSearch(submittedQuery, page + 1, true)
    }

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category)
        setSearchQuery('')
        setSubmittedQuery('')
        fetchPopular(category || undefined)
    }

    const showMyImages = () => {
        setView('my-images')
    }

    const hasMoreSearchResults = view === 'search' && images.length < totalCount
    const showingCount = view === 'my-images' ? userImages.length : images.length
    const displayImages = view === 'my-images' ? userImages : images

    const getStatusBadge = () => {
        switch (connectionState) {
            case 'authenticated':
                return {
                    class: 'border-slate-700 bg-slate-900 text-white',
                    text: `Connected as ${dockerUsername}`,
                    icon: (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    )
                }
            case 'connected':
                return {
                    class: 'border-slate-700 bg-slate-900 text-white',
                    text: 'Docker Hub Connected',
                    icon: null
                }
            case 'checking':
                return {
                    class: 'border-slate-300 bg-white text-slate-700',
                    text: 'Checking Docker Hub...',
                    icon: null
                }
            default:
                return {
                    class: 'border-slate-300 bg-slate-100 text-slate-700',
                    text: 'Docker Hub Unreachable',
                    icon: null
                }
        }
    }

    const statusBadge = getStatusBadge()

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header with Docker Hub branding */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <svg className="w-6 h-6 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Docker Hub</h3>
                            <p className="text-slate-300 text-sm">Browse and select container images</p>
                        </div>
                    </div>
                    <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${statusBadge.class}`}>
                            {statusBadge.icon}
                            {statusBadge.text}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="border-b border-slate-200">
                <div className="flex gap-1 px-4 pt-3">
                    <button
                        type="button"
                        onClick={() => { setView('popular'); fetchPopular(selectedCategory || undefined) }}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            view === 'popular' 
                                ? 'bg-white text-slate-900 border-t border-l border-r border-slate-200 -mb-px' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        Popular Images
                    </button>
                    <button
                        type="button"
                        onClick={handleExploreCatalog}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            view === 'search' && submittedQuery === CATALOG_SEED_QUERY 
                                ? 'bg-white text-slate-900 border-t border-l border-r border-slate-200 -mb-px' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        Explore All
                    </button>
                    {hasCredentials && (
                        <button
                            type="button"
                            onClick={showMyImages}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                view === 'my-images' 
                                    ? 'bg-white text-slate-900 border-t border-l border-r border-slate-200 -mb-px' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                My Images
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search images..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-700 transition flex items-center gap-2"
                    >
                        Search
                    </button>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                    <select
                        value={selectedCategory}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none"
                    >
                        <option value="">All Categories</option>
                        {Object.keys(categories).map((cat) => (
                            <option key={cat} value={cat}>
                                {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                        ))}
                    </select>

                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={officialOnly}
                            onChange={(e) => setOfficialOnly(e.target.checked)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        Official only
                    </label>

                    <div className="ml-auto text-sm text-slate-500">
                        {view === 'search' && submittedQuery
                            ? submittedQuery === CATALOG_SEED_QUERY
                                ? `${showingCount.toLocaleString()} of ${totalCount.toLocaleString()} images`
                                : `${showingCount.toLocaleString()} results for "${submittedQuery}"`
                            : view === 'my-images'
                                ? `${showingCount} images from ${dockerUsername}`
                                : `${showingCount} curated images`}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="p-4 max-h-96 overflow-y-auto bg-white">
                {(loading || loadingUserImages) ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="inline-block w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-500 mt-3">Loading images...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-slate-700 font-medium">{error}</p>
                    </div>
                ) : displayImages.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <p className="text-slate-500 font-medium">No images found</p>
                        {view === 'my-images' && (
                            <p className="text-sm text-slate-400 mt-1">
                                {hasCredentials 
                                    ? "You don't have any public images on Docker Hub"
                                    : "Enter your Docker Hub credentials above to see your images"}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {displayImages.map((image) => (
                            <ImageCard
                                key={`${image.namespace}/${image.name}`}
                                image={image}
                                selected={isSelectedImage(selectedImage, image)}
                                onSelect={() => {
                                    const imageString = buildImageReference(image)
                                    onSelectImage(imageString)
                                }}
                            />
                        ))}

                        {hasMoreSearchResults && (
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 transition flex items-center justify-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                                        Loading more...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        Load More Images
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            {!hasCredentials && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-500 text-center">
                        Tip: Enter your Docker Hub credentials above to browse your private images
                    </p>
                </div>
            )}
        </div>
    )
}

function buildImageReference(image: DockerHubImage): string {
    if (image.namespace === 'library') {
        return `${image.name}:latest`
    }
    return `${image.namespace}/${image.name}:latest`
}

function isSelectedImage(selectedImage: string | undefined, image: DockerHubImage): boolean {
    if (!selectedImage) return false

    const withoutTag = image.namespace === 'library'
        ? image.name
        : `${image.namespace}/${image.name}`

    return (
        selectedImage === image.full_name ||
        selectedImage === withoutTag ||
        selectedImage === `${withoutTag}:latest`
    )
}

function ImageCard({
    image,
    selected,
    onSelect
}: {
    image: DockerHubImage
    selected: boolean
    onSelect: () => void
}) {
    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${selected
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                }`}
        >
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        image.is_official 
                            ? 'bg-slate-200 text-slate-800' 
                            : 'bg-slate-100 text-slate-500'
                    }`}>
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/>
                        </svg>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 truncate">
                            {image.namespace === 'library' ? image.name : `${image.namespace}/${image.name}`}
                        </h4>
                        {image.is_official && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Official
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                        {image.description || 'No description available'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {image.star_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {image.pull_count_formatted || image.pull_count.toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selected 
                            ? 'bg-slate-900 border-slate-900' 
                            : 'border-slate-300 bg-white'
                    }`}>
                        {selected && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

