import React, { useState } from 'react'

export default function DeploymentGuides() {
    const [activeTab, setActiveTab] = useState<'docker' | 'github'>('docker')

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Deployment Guides</h1>
                <p className="text-slate-600">Step-by-step instructions for deploying your applications</p>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('docker')}
                    className={`px-6 py-3 font-semibold transition-all ${activeTab === 'docker'
                            ? 'text-slate-900 border-b-2 border-slate-900'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Docker Hub / Local Images
                </button>
                <button
                    onClick={() => setActiveTab('github')}
                    className={`px-6 py-3 font-semibold transition-all ${activeTab === 'github'
                            ? 'text-slate-900 border-b-2 border-slate-900'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    GitHub Repository
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                {activeTab === 'docker' ? <DockerHubGuide /> : <GitHubGuide />}
            </div>
        </div>
    )
}

function DockerHubGuide() {
    return (
        <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Deploy from Docker Hub or Local Images</h2>
            <p className="text-slate-600 mb-6">
                This method allows you to deploy pre-built Docker images from Docker Hub (public or private) or images available in your local Docker Desktop.
            </p>

            {/* Step 1 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">1</span>
                    Navigate to Deployments
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-700">- Click on <strong>"Deployments"</strong> in the sidebar</p>
                    <p className="text-slate-700">- Click the <strong>"+ Deploy New Container"</strong> button</p>
                </div>
            </div>

            {/* Step 2 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">2</span>
                    Select Deployment Source
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-700">- Choose <strong>"Docker Hub / Local Image"</strong> from the dropdown</p>
                    <p className="text-slate-500 text-sm mt-2">This is the default selection for Docker-based deployments</p>
                </div>
            </div>

            {/* Step 3 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">3</span>
                    Fill in Container Details
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <div>
                        <p className="font-semibold text-slate-800">Container Name:</p>
                        <p className="text-slate-700">- Choose a unique name (alphanumeric, hyphens, underscores only)</p>
                        <p className="text-slate-600 text-sm">Example: <code className="bg-slate-200 px-2 py-1 rounded">my-web-app</code></p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">Container Image:</p>
                        <p className="text-slate-700">- Enter the Docker image name with tag</p>
                        <p className="text-slate-600 text-sm">Examples:</p>
                        <ul className="text-slate-600 text-sm ml-4 mt-1">
                            <li>- <code className="bg-slate-200 px-2 py-1 rounded">nginx:latest</code> - Official Nginx</li>
                            <li>- <code className="bg-slate-200 px-2 py-1 rounded">redis:alpine</code> - Redis Alpine version</li>
                            <li>- <code className="bg-slate-200 px-2 py-1 rounded">username/myapp:v1.0</code> - Custom image</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">Port (optional):</p>
                        <p className="text-slate-700">- Specify a port between 1024-65535 if needed</p>
                        <p className="text-slate-600 text-sm">If left empty, a random port will be assigned</p>
                    </div>
                </div>
            </div>

            {/* Step 4 - Private Images */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">4</span>
                    Docker Registry Credentials (For Private Images)
                </h3>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-amber-900 font-semibold mb-2">Only required for private Docker Hub images</p>
                    <div className="space-y-2 text-slate-700">
                        <p><strong>Username:</strong> Your Docker Hub username</p>
                        <p><strong>Access Token:</strong> Generate from Docker Hub Settings -&gt; Security -&gt; Access Tokens</p>
                        <p className="text-sm text-amber-800 mt-3">Tip: Use access tokens instead of passwords for better security!</p>
                    </div>
                </div>
            </div>

            {/* Step 5 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">5</span>
                    Deploy Container
                </h3>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-green-900">- Click the <strong>"Deploy Container"</strong> button</p>
                    <p className="text-green-800 text-sm mt-2">Your container will be pulled (if needed) and deployed!</p>
                </div>
            </div>

            {/* Common Images */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Popular Images to Try:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="font-semibold text-slate-800">nginx:latest</p>
                        <p className="text-slate-600">Web server (Port: 80)</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="font-semibold text-slate-800">redis:alpine</p>
                        <p className="text-slate-600">In-memory database (Port: 6379)</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="font-semibold text-slate-800">postgres:latest</p>
                        <p className="text-slate-600">PostgreSQL database (Port: 5432)</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="font-semibold text-slate-800">mongo:latest</p>
                        <p className="text-slate-600">MongoDB database (Port: 27017)</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function GitHubGuide() {
    return (
        <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Deploy from GitHub Repository</h2>
            <p className="text-slate-600 mb-6">
                Deploy applications directly from GitHub repositories. The platform will clone your repo, build a Docker image from the Dockerfile, and deploy it automatically!
            </p>

            {/* Step 1 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">1</span>
                    Prepare Your Repository
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-700 font-semibold mb-2">Your repository must contain a Dockerfile:</p>
                    <ul className="text-slate-700 space-y-1 ml-4">
                        <li>- Can be at the root: <code className="bg-slate-200 px-2 py-1 rounded text-sm">Dockerfile</code></li>
                        <li>- Or in a subdirectory: <code className="bg-slate-200 px-2 py-1 rounded text-sm">docker/Dockerfile</code></li>
                        <li>- Platform auto-detects common locations!</li>
                    </ul>
                    <p className="text-sm text-slate-600 mt-3">Make sure your Dockerfile has an <code className="bg-slate-200 px-2 py-1 rounded">EXPOSE</code> directive for automatic port detection</p>
                </div>
            </div>

            {/* Step 2 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">2</span>
                    Open Deployment Modal
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-700">- Go to <strong>"Deployments"</strong> page</p>
                    <p className="text-slate-700">- Click <strong>"+ Deploy New Container"</strong></p>
                    <p className="text-slate-700">- Select <strong>"GitHub Repository"</strong> from deployment source</p>
                </div>
            </div>

            {/* Step 3 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">3</span>
                    Enter Repository Details
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <div>
                        <p className="font-semibold text-slate-800">Container Name:</p>
                        <p className="text-slate-700">- Unique identifier for your deployment</p>
                        <p className="text-slate-600 text-sm">Example: <code className="bg-slate-200 px-2 py-1 rounded">my-app</code></p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">GitHub Repository URL:</p>
                        <p className="text-slate-700">- Full HTTPS URL to your repository</p>
                        <p className="text-slate-600 text-sm">Example: <code className="bg-slate-200 px-2 py-1 rounded">https://github.com/username/repository</code></p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">Branch (optional):</p>
                        <p className="text-slate-700">- Defaults to "main"</p>
                        <p className="text-slate-600 text-sm">Can specify: <code className="bg-slate-200 px-2 py-1 rounded">develop</code>, <code className="bg-slate-200 px-2 py-1 rounded">staging</code>, etc.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">Dockerfile Path (optional):</p>
                        <p className="text-slate-700">- Leave empty for auto-detection</p>
                        <p className="text-slate-600 text-sm">Or specify: <code className="bg-slate-200 px-2 py-1 rounded">docker/Dockerfile</code>, <code className="bg-slate-200 px-2 py-1 rounded">app/Dockerfile</code></p>
                    </div>
                </div>
            </div>

            {/* Step 4 - Private Repos */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">4</span>
                    GitHub Token (For Private Repositories)
                </h3>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-amber-900 font-semibold mb-3">Required only for private repositories</p>
                    <div className="space-y-2 text-slate-700">
                        <p className="font-semibold">How to generate a GitHub Personal Access Token:</p>
                        <ol className="ml-4 space-y-1">
                            <li>1. Go to GitHub -&gt; Settings -&gt; Developer settings</li>
                            <li>2. Click "Personal access tokens" -&gt; "Tokens (classic)"</li>
                            <li>3. Generate new token with <strong>"repo"</strong> scope</li>
                            <li>4. Copy the token (starts with <code className="bg-amber-100 px-2 py-1 rounded text-sm">ghp_</code>)</li>
                            <li>5. Paste it in the "GitHub Token" field</li>
                        </ol>
                        <p className="text-sm text-amber-800 mt-3">Warning: Save your token securely; you will not see it again.</p>
                    </div>
                </div>
            </div>

            {/* Step 5 */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm mr-3">5</span>
                    Deploy!
                </h3>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-green-900 mb-2">- Click <strong>"Deploy Container"</strong></p>
                    <p className="text-green-800 text-sm">The platform will:</p>
                    <ul className="text-green-800 text-sm ml-4 mt-1 space-y-1">
                        <li>Clone your repository</li>
                        <li>Find and parse the Dockerfile</li>
                        <li>Build a Docker image</li>
                        <li>Deploy the container</li>
                        <li>Auto-detect the exposed port</li>
                    </ul>
                </div>
            </div>

            {/* Example Repos */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Example Public Repositories to Try:</h4>
                <div className="space-y-3 text-sm">
                    <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="font-semibold text-slate-800">dockersamples/node-bulletin-board</p>
                        <p className="text-slate-600">Node.js bulletin board app</p>
                        <p className="text-slate-500 text-xs mt-1">Dockerfile: <code className="bg-slate-100 px-1 py-0.5 rounded">bulletin-board-app/Dockerfile</code></p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                        <p className="font-semibold text-slate-800">docker/getting-started</p>
                        <p className="text-slate-600">Docker tutorial application</p>
                        <p className="text-slate-500 text-xs mt-1">Dockerfile: <code className="bg-slate-100 px-1 py-0.5 rounded">Dockerfile</code> (root)</p>
                    </div>
                </div>
            </div>

            {/* Troubleshooting */}
            <div className="mt-8 bg-red-50 rounded-lg p-6 border border-red-200">
                <h4 className="font-semibold text-red-900 mb-3">Troubleshooting Common Issues:</h4>
                <div className="space-y-3 text-sm">
                    <div>
                        <p className="font-semibold text-red-800">"No Dockerfile found"</p>
                        <p className="text-red-700">- Specify the Dockerfile path explicitly in the form</p>
                    </div>
                    <div>
                        <p className="font-semibold text-red-800">"Failed to clone repository"</p>
                        <p className="text-red-700">- Check URL is correct and provide GitHub token for private repos</p>
                    </div>
                    <div>
                        <p className="font-semibold text-red-800">"Build failed"</p>
                        <p className="text-red-700">- Check your Dockerfile is valid and all dependencies are available</p>
                    </div>
                </div>
            </div>
        </div>
    )
}



