import React, { useState, useEffect } from 'react';
import { billing, Container, RealTimeBillingResponse, ScenarioSimulationResponse } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabType = 'realtime' | 'scenario';
type Provider = 'aws' | 'gcp' | 'azure';

const Billing: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('realtime');
    const [containers, setContainers] = useState<Container[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
    const [provider, setProvider] = useState<Provider>('aws');
    const [timeInterval, setTimeInterval] = useState<number>(1);
    const [billingData, setBillingData] = useState<RealTimeBillingResponse | null>(null);
    const [loadingBilling, setLoadingBilling] = useState(false);

    // Scenario State
    const [cpuCores, setCpuCores] = useState<number>(2);
    const [memoryGb, setMemoryGb] = useState<number>(4);
    const [storageGb, setStorageGb] = useState<number>(20);
    const [durationHours, setDurationHours] = useState<number>(24);
    const [scenarioProvider, setScenarioProvider] = useState<Provider>('aws');
    const [scenarioResult, setScenarioResult] = useState<ScenarioSimulationResponse | null>(null);
    const [loadingScenario, setLoadingScenario] = useState(false);

    useEffect(() => {
        loadContainers();
    }, []);

    const loadContainers = async () => {
        try {
            const response = await billing.getUserContainers();
            const runningContainers = response.containers.filter(c => c.status === 'running');
            setContainers(runningContainers);
            if (runningContainers.length > 0 && !selectedContainer) {
                setSelectedContainer(runningContainers[0].id);
            }
        } catch (error) {
            console.error('Error loading containers:', error);
            setContainers([]);
        }
    };

    const calculateRealTimeBilling = async () => {
        if (!selectedContainer) return;
        try {
            setLoadingBilling(true);
            const response = await billing.calculateRealTimeBilling({
                container_id: selectedContainer,
                hours_back: timeInterval,
                provider: provider
            });
            if (response.success) {
                setBillingData(response.billing);
            }
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to calculate billing');
        } finally {
            setLoadingBilling(false);
        }
    };

    const runScenarioSimulation = async () => {
        setLoadingScenario(true);
        try {
            const response = await billing.simulateScenario(
                cpuCores,
                memoryGb,
                storageGb,
                durationHours,
                scenarioProvider
            );
            setScenarioResult(response.simulation);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to run simulation');
        } finally {
            setLoadingScenario(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Quotas & Billing</h1>
                    <p className="text-slate-600">Track costs and simulate billing for your deployments</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('realtime')}
                        className={`px-6 py-3 rounded-lg font-semibold transition ${
                            activeTab === 'realtime'
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        Real-Time Billing
                    </button>
                    <button
                        onClick={() => setActiveTab('scenario')}
                        className={`px-6 py-3 rounded-lg font-semibold transition ${
                            activeTab === 'scenario'
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        Scenario-Based Billing
                    </button>
                </div>

                {/* Real-Time Tab */}
                {activeTab === 'realtime' && (
                    <div className="space-y-6">
                        {/* Configuration Card */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Configuration</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Container Selector */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Container</label>
                                    <select
                                        value={selectedContainer || ''}
                                        onChange={(e) => setSelectedContainer(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    >
                                        <option value="">Select container...</option>
                                        {containers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                Deploy {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Provider Selector */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Provider</label>
                                    <div className="flex gap-2">
                                        {(['aws', 'gcp', 'azure'] as Provider[]).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setProvider(p)}
                                                className={`flex-1 py-2 rounded text-sm font-bold ${
                                                    provider === p
                                                        ? 'bg-slate-900 text-white'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {p.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Time Interval */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Time Interval</label>
                                    <select
                                        value={timeInterval}
                                        onChange={(e) => setTimeInterval(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    >
                                        <option value={1}>Last 1 Hour</option>
                                        <option value={6}>Last 6 Hours</option>
                                        <option value={24}>Last 24 Hours</option>
                                        <option value={168}>Last 7 Days</option>
                                    </select>
                                </div>
                            </div>

                            {/* Calculate Button */}
                            <button
                                onClick={calculateRealTimeBilling}
                                disabled={loadingBilling || !selectedContainer}
                                className="mt-4 w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                                {loadingBilling ? 'Calculating...' : 'Calculate Costs'}
                            </button>
                        </div>

                        {/* Results */}
                        {billingData && (
                            <>
                                {/* Cost Cards */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-center">
                                        <p className="text-sm text-slate-600 font-semibold">CPU Cost</p>
                                        <p className="text-2xl font-bold text-violet-600 mt-1">
                                            ${billingData.costs.cpu_cost.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-center">
                                        <p className="text-sm text-slate-600 font-semibold">Memory Cost</p>
                                        <p className="text-2xl font-bold text-cyan-600 mt-1">
                                            ${billingData.costs.memory_cost.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-center">
                                        <p className="text-sm text-slate-600 font-semibold">Storage Cost</p>
                                        <p className="text-2xl font-bold text-amber-600 mt-1">
                                            ${billingData.costs.storage_cost.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="bg-white border-2 border-rose-500 rounded-xl shadow-sm p-4 text-center">
                                        <p className="text-sm text-slate-600 font-semibold">Total Cost</p>
                                        <p className="text-2xl font-bold text-pink-600 mt-1">
                                            ${billingData.costs.total_cost.toFixed(4)}
                                        </p>
                                    </div>
                                </div>

                                {/* Usage Charts */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">CPU Usage</h3>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={billingData.usage_history}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="timestamp"
                                                    tickFormatter={(val: any) => new Date(val).toLocaleTimeString()}
                                                />
                                                <YAxis />
                                                <Tooltip />
                                                <Line
                                                    type="monotone"
                                                    dataKey="cpu_cores"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Memory Usage</h3>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={billingData.usage_history}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="timestamp"
                                                    tickFormatter={(val: any) => new Date(val).toLocaleTimeString()}
                                                />
                                                <YAxis />
                                                <Tooltip />
                                                <Line
                                                    type="monotone"
                                                    dataKey="memory_gb"
                                                    stroke="#06b6d4"
                                                    strokeWidth={2}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Cost Breakdown</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-2 border-b border-slate-200">
                                            <span className="text-slate-700">CPU: {billingData.average_usage.cpu_cores.toFixed(3)} cores</span>
                                            <span className="font-bold text-violet-600">${billingData.costs.cpu_cost.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-200">
                                            <span className="text-slate-700">Memory: {billingData.average_usage.memory_gb.toFixed(3)} GB</span>
                                            <span className="font-bold text-cyan-600">${billingData.costs.memory_cost.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-200">
                                            <span className="text-slate-700">Storage: {billingData.average_usage.storage_gb.toFixed(2)} GB</span>
                                            <span className="font-bold text-amber-600">${billingData.costs.storage_cost.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 text-lg font-bold">
                                            <span className="text-slate-900">Total</span>
                                            <span className="text-pink-600">${billingData.costs.total_cost.toFixed(4)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {!billingData && !loadingBilling && (
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-slate-500">
                                <p>Select a container and click "Calculate Costs" to view billing data</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Scenario Tab */}
                {activeTab === 'scenario' && (
                    <div className="space-y-6">
                        {/* Configuration Card */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Scenario Configuration</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">CPU Cores</label>
                                    <input
                                        type="number"
                                        min="0.5"
                                        max="16"
                                        step="0.5"
                                        value={cpuCores}
                                        onChange={(e) => setCpuCores(parseFloat(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Memory (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="64"
                                        step="1"
                                        value={memoryGb}
                                        onChange={(e) => setMemoryGb(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Storage (GB)</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="1000"
                                        step="10"
                                        value={storageGb}
                                        onChange={(e) => setStorageGb(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (hours)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="720"
                                        value={durationHours}
                                        onChange={(e) => setDurationHours(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    />
                                </div>
                            </div>

                            {/* Provider Selection */}
                            <div className="mt-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Provider</label>
                                <div className="flex gap-2">
                                    {(['aws', 'gcp', 'azure'] as Provider[]).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setScenarioProvider(p)}
                                            className={`flex-1 py-2 rounded text-sm font-bold ${
                                                scenarioProvider === p
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Simulate Button */}
                            <button
                                onClick={runScenarioSimulation}
                                disabled={loadingScenario}
                                className="mt-4 w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                                {loadingScenario ? 'Simulating...' : 'Run Simulation'}
                            </button>
                        </div>

                        {/* Results */}
                        {scenarioResult && (
                            <>
                                {/* Configuration Summary */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-bold text-slate-900 mb-4">Configuration</h2>
                                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                                        <div>
                                            <p className="text-slate-600 font-semibold">CPU</p>
                                            <p className="text-2xl font-bold text-violet-600">{scenarioResult.scenario.cpu_cores}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-semibold">Memory</p>
                                            <p className="text-2xl font-bold text-cyan-600">{scenarioResult.scenario.memory_gb} GB</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-semibold">Storage</p>
                                            <p className="text-2xl font-bold text-amber-600">{scenarioResult.scenario.storage_gb} GB</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-semibold">Duration</p>
                                            <p className="text-2xl font-bold text-pink-600">{scenarioResult.scenario.duration_hours}h</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cost Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                                        <p className="text-sm text-slate-600 font-semibold">CPU Cost</p>
                                        <p className="text-2xl font-bold text-violet-600 mt-2">
                                            ${scenarioResult.cost_breakdown.cpu.cost.toFixed(4)}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">{scenarioResult.cost_breakdown.cpu.usage}</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                                        <p className="text-sm text-slate-600 font-semibold">Memory Cost</p>
                                        <p className="text-2xl font-bold text-cyan-600 mt-2">
                                            ${scenarioResult.cost_breakdown.memory.cost.toFixed(4)}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">{scenarioResult.cost_breakdown.memory.usage}</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                                        <p className="text-sm text-slate-600 font-semibold">Storage Cost</p>
                                        <p className="text-2xl font-bold text-amber-600 mt-2">
                                            ${scenarioResult.cost_breakdown.storage.cost.toFixed(4)}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">{scenarioResult.cost_breakdown.storage.usage}</p>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-rose-500">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-slate-900">Total Estimated Cost</span>
                                        <span className="text-3xl font-bold text-pink-600">
                                            ${scenarioResult.costs.total_cost.toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {!scenarioResult && !loadingScenario && (
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-slate-500">
                                <p>Configure resources and click "Run Simulation" to see cost estimates</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;


