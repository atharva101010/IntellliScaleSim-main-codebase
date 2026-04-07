import React, { useState, useEffect } from 'react';
import { billing, Container, RealTimeBillingResponse, ScenarioSimulationResponse } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabType = 'realtime' | 'scenario';
type Provider = 'aws' | 'gcp' | 'azure';
type BillingComparison = Partial<Record<Provider, RealTimeBillingResponse>>;
type ScenarioComparison = Partial<Record<Provider, ScenarioSimulationResponse>>;

const PROVIDERS: Provider[] = ['aws', 'gcp', 'azure'];
const PROVIDER_LABELS: Record<Provider, string> = {
    aws: 'AWS',
    gcp: 'GCP',
    azure: 'Azure',
};

const Billing: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('realtime');
    const [containers, setContainers] = useState<Container[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
    const [timeInterval, setTimeInterval] = useState<number>(1);
    const [billingComparison, setBillingComparison] = useState<BillingComparison>({});
    const [loadingBilling, setLoadingBilling] = useState(false);

    // Scenario State
    const [cpuCores, setCpuCores] = useState<number>(0);
    const [memoryGb, setMemoryGb] = useState<number>(0);
    const [storageGb, setStorageGb] = useState<number>(0);
    const [durationHours, setDurationHours] = useState<number>(24);
    const [selectedScenarioContainer, setSelectedScenarioContainer] = useState<number | null>(null);
    const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparison>({});
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
            if (runningContainers.length > 0 && !selectedScenarioContainer) {
                const firstContainer = runningContainers[0];
                setSelectedScenarioContainer(firstContainer.id);
            }
        } catch (error) {
            console.error('Error loading containers:', error);
            setContainers([]);
        }
    };

    const resetScenarioMetrics = () => {
        setCpuCores(0);
        setMemoryGb(0);
        setStorageGb(0);
    };

    const calculateRealTimeBilling = async () => {
        if (!selectedContainer) return;
        try {
            setLoadingBilling(true);
            const responses = await Promise.all(
                PROVIDERS.map((p) =>
                    billing.calculateRealTimeBilling({
                        container_id: selectedContainer,
                        hours_back: timeInterval,
                        provider: p,
                    })
                )
            );

            const comparison: BillingComparison = {};
            responses.forEach((response, index) => {
                if (response.success) {
                    comparison[PROVIDERS[index]] = response.billing;
                }
            });

            setBillingComparison(comparison);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to calculate billing');
        } finally {
            setLoadingBilling(false);
        }
    };

    const runScenarioSimulation = async () => {
        if (!selectedScenarioContainer) return;
        setLoadingScenario(true);
        try {
            const responses = await Promise.all(
                PROVIDERS.map((p) =>
                    billing.simulateScenario(
                        cpuCores,
                        memoryGb,
                        storageGb,
                        durationHours,
                        p
                    )
                )
            );

            const comparison: ScenarioComparison = {};
            responses.forEach((response, index) => {
                if (response.success) {
                    comparison[PROVIDERS[index]] = response.simulation;
                }
            });

            setScenarioComparison(comparison);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to run simulation');
        } finally {
            setLoadingScenario(false);
        }
    };

    const comparedProviders = PROVIDERS.filter((p) => billingComparison[p]);
    const hasComparisonData = comparedProviders.length > 0;
    const usageHistorySource = billingComparison.aws || billingComparison.gcp || billingComparison.azure || null;
    const cheapestProvider = comparedProviders.reduce<Provider | null>((best, current) => {
        if (!best) return current;
        const bestTotal = billingComparison[best]?.costs.total_cost ?? Number.POSITIVE_INFINITY;
        const currentTotal = billingComparison[current]?.costs.total_cost ?? Number.POSITIVE_INFINITY;
        return currentTotal < bestTotal ? current : best;
    }, null);
    const comparedScenarioProviders = PROVIDERS.filter((p) => scenarioComparison[p]);
    const hasScenarioComparisonData = comparedScenarioProviders.length > 0;
    const scenarioSource = scenarioComparison.aws || scenarioComparison.gcp || scenarioComparison.azure || null;
    const cheapestScenarioProvider = comparedScenarioProviders.reduce<Provider | null>((best, current) => {
        if (!best) return current;
        const bestTotal = scenarioComparison[best]?.costs.total_cost ?? Number.POSITIVE_INFINITY;
        const currentTotal = scenarioComparison[current]?.costs.total_cost ?? Number.POSITIVE_INFINITY;
        return currentTotal < bestTotal ? current : best;
    }, null);

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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {hasComparisonData && (
                            <>
                                {/* Provider Comparison Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {PROVIDERS.map((p) => {
                                        const data = billingComparison[p];
                                        if (!data) return null;
                                        const isCheapest = cheapestProvider === p;

                                        return (
                                            <div
                                                key={p}
                                                className={`bg-white rounded-xl shadow-sm p-4 ${
                                                    isCheapest ? 'border-2 border-emerald-500' : 'border border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm text-slate-600 font-semibold">{PROVIDER_LABELS[p]}</p>
                                                    {isCheapest && (
                                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                                            Lowest Cost
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-3xl font-bold text-slate-900">${data.costs.total_cost.toFixed(4)}</p>
                                                <div className="mt-3 space-y-1 text-sm text-slate-600">
                                                    <div className="flex justify-between">
                                                        <span>CPU</span>
                                                        <span className="font-semibold text-violet-600">${data.costs.cpu_cost.toFixed(4)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Memory</span>
                                                        <span className="font-semibold text-cyan-600">${data.costs.memory_cost.toFixed(4)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Storage</span>
                                                        <span className="font-semibold text-amber-600">${data.costs.storage_cost.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Comparison Summary */}
                                {cheapestProvider && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm p-4">
                                        <p className="text-sm font-semibold text-emerald-800">
                                            Best price for this usage window: {PROVIDER_LABELS[cheapestProvider]} at ${billingComparison[cheapestProvider]?.costs.total_cost.toFixed(4)}
                                        </p>
                                    </div>
                                )}

                                {/* Usage Charts */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">CPU Usage</h3>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart data={usageHistorySource?.usage_history || []}>
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
                                            <LineChart data={usageHistorySource?.usage_history || []}>
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

                                {/* Cost Breakdown Comparison */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Cost Breakdown Comparison</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-600">
                                                    <th className="text-left py-2 font-semibold">Metric</th>
                                                    {PROVIDERS.map((p) => (
                                                        <th key={p} className="text-right py-2 font-semibold">{PROVIDER_LABELS[p]}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-700">CPU Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-violet-600 font-semibold">
                                                            ${billingComparison[p]?.costs.cpu_cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-700">Memory Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-cyan-600 font-semibold">
                                                            ${billingComparison[p]?.costs.memory_cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-700">Storage Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-amber-600 font-semibold">
                                                            ${billingComparison[p]?.costs.storage_cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-slate-900 font-bold">Total Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-pink-600 font-bold">
                                                            ${billingComparison[p]?.costs.total_cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {usageHistorySource && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-600">
                                            <p>
                                                Average usage for selected app: {usageHistorySource.average_usage.cpu_cores.toFixed(3)} CPU cores, {usageHistorySource.average_usage.memory_gb.toFixed(3)} GB memory, {usageHistorySource.average_usage.storage_gb.toFixed(2)} GB storage.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {!hasComparisonData && !loadingBilling && (
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-slate-500">
                                <p>Select a container and click "Calculate Costs" to compare AWS, GCP, and Azure pricing</p>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Container</label>
                                    <select
                                        value={selectedScenarioContainer || ''}
                                        onChange={(e) => {
                                            const nextContainerId = Number(e.target.value);
                                            setSelectedScenarioContainer(nextContainerId);
                                            resetScenarioMetrics();
                                            setScenarioComparison({});
                                        }}
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        min="0.5"
                                        max="64"
                                        step="0.5"
                                        value={memoryGb}
                                        onChange={(e) => setMemoryGb(parseFloat(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Storage (GB)</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="1000"
                                        step="1"
                                        value={storageGb}
                                        onChange={(e) => setStorageGb(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-500/20 outline-none transition"
                                    />
                                </div>
                            </div>

                            {/* Simulate Button */}
                            <button
                                onClick={runScenarioSimulation}
                                disabled={loadingScenario || !selectedScenarioContainer}
                                className="mt-4 w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                                {loadingScenario ? 'Simulating...' : 'Run Comparison'}
                            </button>
                        </div>

                        {/* Results */}
                        {hasScenarioComparisonData && (
                            <>
                                {/* Configuration Summary */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                    <h2 className="text-lg font-bold text-slate-900 mb-4">Configuration</h2>
                                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                                        <div>
                                            <p className="text-slate-600 font-semibold">CPU</p>
                                            <p className="text-2xl font-bold text-violet-600">{scenarioSource?.scenario.cpu_cores}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-semibold">Memory</p>
                                            <p className="text-2xl font-bold text-cyan-600">{scenarioSource?.scenario.memory_gb} GB</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-semibold">Storage</p>
                                            <p className="text-2xl font-bold text-amber-600">{scenarioSource?.scenario.storage_gb} GB</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-600 font-semibold">Duration</p>
                                            <p className="text-2xl font-bold text-pink-600">{scenarioSource?.scenario.duration_hours}h</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Provider Comparison Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {PROVIDERS.map((p) => {
                                        const data = scenarioComparison[p];
                                        if (!data) return null;
                                        const isCheapest = cheapestScenarioProvider === p;

                                        return (
                                            <div
                                                key={p}
                                                className={`bg-white rounded-xl shadow-sm p-4 ${
                                                    isCheapest ? 'border-2 border-emerald-500' : 'border border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm text-slate-600 font-semibold">{PROVIDER_LABELS[p]}</p>
                                                    {isCheapest && (
                                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                                            Lowest Cost
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-3xl font-bold text-slate-900">${data.costs.total_cost.toFixed(4)}</p>
                                                <div className="mt-3 space-y-1 text-sm text-slate-600">
                                                    <div className="flex justify-between">
                                                        <span>CPU</span>
                                                        <span className="font-semibold text-violet-600">${data.cost_breakdown.cpu.cost.toFixed(4)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Memory</span>
                                                        <span className="font-semibold text-cyan-600">${data.cost_breakdown.memory.cost.toFixed(4)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Storage</span>
                                                        <span className="font-semibold text-amber-600">${data.cost_breakdown.storage.cost.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {cheapestScenarioProvider && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm p-4">
                                        <p className="text-sm font-semibold text-emerald-800">
                                            Best simulation price: {PROVIDER_LABELS[cheapestScenarioProvider]} at ${scenarioComparison[cheapestScenarioProvider]?.costs.total_cost.toFixed(4)}
                                        </p>
                                    </div>
                                )}

                                {/* Cost Breakdown Comparison */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Cost Breakdown Comparison</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-600">
                                                    <th className="text-left py-2 font-semibold">Metric</th>
                                                    {PROVIDERS.map((p) => (
                                                        <th key={p} className="text-right py-2 font-semibold">{PROVIDER_LABELS[p]}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-700">CPU Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-violet-600 font-semibold">
                                                            ${scenarioComparison[p]?.cost_breakdown.cpu.cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-700">Memory Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-cyan-600 font-semibold">
                                                            ${scenarioComparison[p]?.cost_breakdown.memory.cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-2 text-slate-700">Storage Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-amber-600 font-semibold">
                                                            ${scenarioComparison[p]?.cost_breakdown.storage.cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-slate-900 font-bold">Total Cost</td>
                                                    {PROVIDERS.map((p) => (
                                                        <td key={p} className="text-right py-2 text-pink-600 font-bold">
                                                            ${scenarioComparison[p]?.costs.total_cost.toFixed(4) || '0.0000'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {!hasScenarioComparisonData && !loadingScenario && (
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-slate-500">
                                <p>Select a container and click "Run Comparison" to compare scenario pricing across AWS, GCP, and Azure</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;


