// src/app/component/ui/PopulationExplorer.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { GenerateWidget } from './generate-widget';
import PopulationPieChart from './PopulationPieChart';

const COLOR_MAP = {
    citizens: 'bg-emerald-500',
    nonCitizens: 'bg-blue-500',
    workPermits: 'bg-amber-500',
    employmentPass: 'bg-amber-400',
    sPassHolders: 'bg-amber-300',
    migrantWorkers: 'bg-amber-200',
    others: 'bg-amber-100',
};

interface Metric {
    name: string;
    unit: string;
    history: Array<{ year: number; value: number }>;
}

interface PopulationExplorerProps {
    rawMetrics: Metric[];
    breakdownMetrics: Metric[];
}

type ViewMode = 'line' | 'bar' | 'pie';

export default function PopulationExplorer({ rawMetrics, breakdownMetrics }: PopulationExplorerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('pie');
    const [yearScope, setYearScope] = useState<number>(10);

    // Toggle state tracking the breakdown of non-resident sub-categories
    const [isNonCitizenExpanded, setIsNonCitizenExpanded] = useState<boolean>(false);
    const [isNonResidentExpanded, setIsNonResidentExpanded] = useState<boolean>(false);

    const maxAvailableYears = rawMetrics[0]?.history?.length || 20;

    const filteredMetrics = rawMetrics.map(metric => ({
        ...metric,
        history: metric.history.slice(-yearScope)
    }));

    const spec = {
        widgetSpec: {
            height: "600px",
            prompt: `**Objective:** Render chart data.\n **View Type:** ${viewMode}.\n **Data State:** Render context parsed dynamically: ${JSON.stringify(filteredMetrics)}.`
        }
    };

    // Extracts the exact dynamically calculated snapshot year for the Pie Chart
    const pieChartData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const calculatedTargetYear = currentMonth >= 5 ? currentYear - 1 : currentYear - 2;

        let finalSnapshotYear = calculatedTargetYear;

        if (rawMetrics.length > 0 && rawMetrics[0].history.length > 0) {
            const hasTargetYear = rawMetrics[0].history.some(h => h.year === calculatedTargetYear);
            if (!hasTargetYear) {
                finalSnapshotYear = rawMetrics[0].history[rawMetrics[0].history.length - 1].year;
            }
        }

        const getValueFromMetrics = (metrics: Metric[] | undefined, keywords: string[], targetYear: number): number => {
            // Add the ?. operator here to safely check if metrics exists
            const target = metrics?.find(m =>
                keywords.every(kw => m.name.toLowerCase().includes(kw.toLowerCase()))
            );

            // Safety check: target?.history ensures we don't crash if target is undefined
            return target?.history?.find(h => h.year === targetYear)?.value || 0;
        };

        const citizens = getValueFromMetrics(rawMetrics, ['citizen'], finalSnapshotYear);
        const permanentResidents = getValueFromMetrics(rawMetrics, ['permanent resident'], finalSnapshotYear) || getValueFromMetrics(rawMetrics, ['pr'], finalSnapshotYear);
        const nonResidents = getValueFromMetrics(rawMetrics, ['non-resident'], finalSnapshotYear);
        const nonCitizens = permanentResidents + nonResidents;

        // Fetch break-down groups for granular legend distribution mapping
        const employmentPassPct = getValueFromMetrics(breakdownMetrics, ['employment pass'], finalSnapshotYear);
        const sPassHoldersPct = getValueFromMetrics(breakdownMetrics, ['s pass'], finalSnapshotYear);
        const workPermitsPct = getValueFromMetrics(breakdownMetrics, ['work permit'], finalSnapshotYear);
        const migrantWorkersPct = getValueFromMetrics(breakdownMetrics, ['migrant'], finalSnapshotYear);
        const dependantPassPct = getValueFromMetrics(breakdownMetrics, ['dependant'], finalSnapshotYear);
        const studentPassPct = getValueFromMetrics(breakdownMetrics, ['student'], finalSnapshotYear);
        const othersPct = studentPassPct + dependantPassPct;

        const employmentPass = Math.round((employmentPassPct / 100) * nonResidents);
        const sPassHolders = Math.round((sPassHoldersPct / 100) * nonResidents);
        const workPermits = Math.round((workPermitsPct / 100) * nonResidents);
        const migrantWorkers = Math.round((migrantWorkersPct / 100) * nonResidents);
        const dependantPass = Math.round((dependantPassPct / 100) * nonResidents);
        const studentPass = Math.round((studentPassPct / 100) * nonResidents);
        const others = studentPass + dependantPass;

        const totalBreakdownPercentage = employmentPass + sPassHolders + workPermits + migrantWorkers + dependantPass + studentPass;
        console.log("Sum of breakdown percentages:", totalBreakdownPercentage);

        const total = citizens + permanentResidents + nonResidents;

        //const nonResidents = workPermits + employmentPass + studentPass + dependantPass;

        return {
            citizens,
            nonCitizens,
            permanentResidents,
            nonResidents,
            employmentPass,
            sPassHolders,
            workPermits,
            migrantWorkers,
            dependantPass,
            studentPass,
            others,
            employmentPassPct,
            sPassHoldersPct,
            workPermitsPct,
            migrantWorkersPct,
            dependantPassPct,
            studentPassPct,
            othersPct,
            total,
            snapshotYear: finalSnapshotYear
        };
    }, [rawMetrics, breakdownMetrics]);

    const presets = [5, 10, 15, 20];

    // Helper functions for percentages
    const getPercentage = (value: number) => {
        if (!pieChartData.total) return '0.0%';
        return `${((value / pieChartData.total) * 100).toFixed(1)}%`;
    };

    return (
        <div className="w-full space-y-6">
            {/* Toolbar Panel */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-muted/20 p-4 rounded-xl border">

                {/* View Selector Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                    {(['line', 'bar', 'pie'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-1.5 text-xs font-semibold capitalize rounded-md transition-all ${viewMode === mode
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {mode} Chart
                        </button>
                    ))}
                </div>

                {/* Context Controls Switch */}
                {viewMode !== 'pie' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-3 px-4 rounded-lg border shadow-xs w-full lg:w-auto md:min-w-[480px]">
                        <div className="flex flex-col shrink-0 min-w-[100px]">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timeline Window</span>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                                {yearScope === maxAvailableYears ? 'Full History' : `Last ${yearScope} Years`}
                            </span>
                        </div>

                        <div className="flex flex-col flex-grow space-y-2 w-full">
                            <div className="flex items-center gap-1.5">
                                {presets.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        disabled={preset > maxAvailableYears}
                                        onClick={() => setYearScope(preset)}
                                        className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border transition-all ${yearScope === preset
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                            } disabled:opacity-40 disabled:pointer-events-none`}
                                    >
                                        {preset}y
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    disabled={yearScope === maxAvailableYears}
                                    onClick={() => setYearScope(maxAvailableYears)}
                                    className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border transition-all ${yearScope === maxAvailableYears
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        } disabled:opacity-40`}
                                >
                                    ++
                                </button>
                            </div>

                            <input
                                type="range"
                                min={3}
                                max={maxAvailableYears}
                                value={yearScope}
                                onChange={(e) => setYearScope(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-xs font-medium text-muted-foreground bg-white px-3 py-1.5 rounded-lg border shadow-xs">
                        Snapshot Year: <span className="font-mono font-bold text-emerald-600">{pieChartData.snapshotYear}</span>
                    </div>
                )}
            </div>

            {/* View Grid Layout Section */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Main Graph Window Pane */}
                <div className="lg:col-span-2 border rounded-xl bg-card overflow-hidden shadow-sm min-h-[520px] flex items-center justify-center p-4">
                    {viewMode === 'pie' ? (
                        <PopulationPieChart
                            totalPopulation={pieChartData.total}
                            citizenCount={pieChartData.citizens}
                            nonCitizenCount={pieChartData.nonCitizens}
                        // prCount={pieChartData.permanentResidents}
                        // nonResidentCount={pieChartData.nonResidents}
                        />
                    ) : (
                        <div className="w-full h-full min-h-[520px] overflow-hidden">
                            <GenerateWidget key={viewMode} height="520px" viewMode={viewMode}>
                                {JSON.stringify(spec)}
                            </GenerateWidget>
                        </div>
                    )}
                </div>

                {/* Sidebar Context Legend Panel with Interactive Accordion Dropdown */}
                <div className="border rounded-xl bg-white p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Population Segment Profiles</h3>

                    <div className="space-y-2 font-sans text-sm">
                        {/* Singapore Citizens Row */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border">
                            <div className="flex items-center space-x-2.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP.citizens} shrink-0`} />
                                <span className="font-medium text-slate-700">Singapore Citizens</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-slate-900">{pieChartData.citizens.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground font-medium">{getPercentage(pieChartData.citizens)}</span>
                            </div>
                        </div>

                        {/* 1. Non-Citizens Accordion (Top Level) */}
                        <div className="space-y-2 font-sans text-sm">
                            <div
                                onClick={() => setIsNonCitizenExpanded(!isNonCitizenExpanded)}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-all"
                            >
                                <div className="flex items-center space-x-2.5">
                                    <svg className={`w-3 h-3 text-indigo-600 transition-transform ${isNonCitizenExpanded ? 'rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                    <div className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP.nonCitizens} shrink-0`} />
                                    <span className="font-semibold text-indigo-900">Non-Citizens Total</span>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-indigo-900">{pieChartData.nonCitizens.toLocaleString()}</span>
                                    <span className="text-xs text-indigo-700 font-bold">{getPercentage(pieChartData.nonCitizens)}</span>
                                </div>
                            </div>

                            {/* 2. Nested Non-Citizen Content */}
                            {isNonCitizenExpanded && (
                                <div className="pl-6 space-y-2 animate-fadeIn border-l-2 border-indigo-100 ml-4">

                                    {/* Permanent Residents Row */}
                                    <div className="flex items-center justify-between p-2 rounded-md bg-indigo-500/5 text-xs">
                                        <span className="font-medium text-slate-700">Permanent Residents</span>
                                        <div className="text-right">
                                            <span className="font-mono font-bold">{pieChartData.permanentResidents.toLocaleString()}</span><br />
                                            <span className="text-xs text-indigo-700 font-bold">{getPercentage(pieChartData.permanentResidents)}</span>
                                        </div>
                                    </div>

                                    {/* 3. Non-Resident Sub-types (Second Level) */}
                                    <div
                                        onClick={() => setIsNonResidentExpanded(!isNonResidentExpanded)}
                                        className="flex items-center justify-between p-2 rounded-md bg-amber-500/10 cursor-pointer text-xs font-semibold text-amber-900 hover:bg-amber-500/20"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <svg className={`w-2.5 h-2.5 transition-transform ${isNonResidentExpanded ? 'rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                            <span>Non-Resident Sub-types</span>
                                        </div>
                                        <div className="text-right">
                                            <span>{pieChartData.nonResidents.toLocaleString()}</span><br />
                                            <span className="text-xs text-indigo-700 font-bold">{getPercentage(pieChartData.nonResidents)}</span>
                                        </div>
                                    </div>

                                    {/* Nested Breakdown Items */}
                                    {isNonResidentExpanded && (
                                        <div className="pl-4 space-y-1">
                                            <div className="flex items-center justify-between p-1.5 rounded-md bg-amber-500/5 text-xs">
                                                <span className="text-slate-600 font-medium">Employment Pass Holders</span>
                                                <div className="text-right">
                                                    <span className="font-mono font-bold text-slate-800">{pieChartData.employmentPass.toLocaleString()}</span>
                                                    {/* <span className="font-mono font-bold text-slate-800">({pieChartData.employmentPassPct.toLocaleString()}%)</span> */}
                                                </div>

                                            </div>
                                            <div className="flex items-center justify-between p-1.5 rounded-md bg-amber-500/5 text-xs">
                                                <span className="text-slate-600 font-medium">S Pass Holders</span>
                                                <span className="font-mono font-bold text-slate-800">{pieChartData.sPassHolders.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 rounded-md bg-amber-500/5 text-xs">
                                                <span className="text-slate-600 font-medium">Work Permits Holders</span>
                                                <span className="font-mono font-bold text-slate-800">{pieChartData.workPermits.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 rounded-md bg-amber-500/5 text-xs">
                                                <span className="text-slate-600 font-medium">Migrant Domestic Workers Permits</span>
                                                <span className="font-mono font-bold text-slate-800">{pieChartData.migrantWorkers.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 rounded-md bg-amber-500/5 text-xs">
                                                <span className="text-slate-600 font-medium">Long-Term, Dependants and Students</span>
                                                <span className="font-mono font-bold text-slate-800">{pieChartData.others.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}