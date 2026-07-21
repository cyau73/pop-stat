// src/app/component/ui/PopulationExplorer.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { GenerateWidget } from './generate-widget';
import PopulationPieChart from './PopulationPieChart';
import { DISPLAY_ORDER, COLOR_MAP } from './constants';

interface Metric {
    name: string;
    unit: string | null;
    history: Array<{ year: number; value: number }>;
}

interface RowConfig {
    id: string;
    label: string;
    valueKey: string;
    color: string;
    isNested?: boolean;
}

interface PopulationExplorerProps {
    countryCode: 'SG' | 'MY';
    rawMetrics: Metric[];
    breakdownMetrics: Metric[];
    config: RowConfig[];
    metadata: { label: string, hasNestedBreakdown: boolean };
}

type ViewMode = 'line' | 'bar' | 'pie';

const calculateAbsoluteMetric = (
    name: string,
    percentHistory: { year: number; value: number }[],
    nrData: { year: number; value: number }[]
): Metric => {
    const nrMap = new Map(nrData.map(pt => [pt.year, pt.value]));

    return {
        name,
        unit: 'Number',
        history: percentHistory.map(pt => {
            const nonResidentCount = nrMap.get(pt.year) || 0;
            return {
                year: pt.year,
                value: Math.round(pt.value * (nonResidentCount / 100))
            };
        })
    };
};

export default function PopulationExplorer({ countryCode, rawMetrics, breakdownMetrics, config, metadata }: PopulationExplorerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('pie');
    const [selectedMetricIndex, setSelectedMetricIndex] = useState<number>(0);
    const [yearScope, setYearScope] = useState<number>(20);
    const [isNonCitizenExpanded, setIsNonCitizenExpanded] = useState<boolean>(false);

    const { label, hasNestedBreakdown } = metadata;

    const availableYears = useMemo(() => {
        return rawMetrics[0]?.history?.map(h => h.year).sort((a, b) => b - a) || [];
    }, [rawMetrics]);

    const maxAvailableYears = useMemo(() => {
        return rawMetrics[0]?.history?.length || 10;
    }, [rawMetrics]);

    const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

    const filteredMetrics = useMemo(() => {
        const orderList = DISPLAY_ORDER[countryCode] || [];

        const nrData = rawMetrics.find(m => m.name === 'Non-Resident Population')?.history || [];
        const prData = rawMetrics.find(m => m.name === 'Permanent Resident Population')?.history || [];

        const getCalculatedMetric = (name: string, rawMetrics: Metric[], breakdownMetrics: Metric[]): Metric | null => {
            const nrData = rawMetrics.find(m => m.name === 'Non-Resident Population')?.history || [];
            const prData = rawMetrics.find(m => m.name === 'Permanent Resident Population')?.history || [];

            if (name === 'Non-Citizens Population') {
                return {
                    name,
                    unit: 'People',
                    history: prData.map((pt, i) => ({ year: pt.year, value: pt.value + (nrData[i]?.value || 0) }))
                };
            }

            const sourceMap: Record<string, string[]> = {
                'Employment Pass Holders (Count)': ['Employment Pass Holders'],
                'Migrant Domestic Workers (Count)': ['Migrant Domestic Workers'],
                'Work Permit Holders (Count)': ['Work Permit Holders'],
                'S Pass Holders (Count)': ['S Pass Holders'],
                'Long-Term Visit Pass Holders And Dependant\'s Pass Holders (Count)': ["Long-Term Visit Pass Holders And Dependant's Pass Holders"],
                'Student Pass Holders (Count)': ['Student Pass Holders'],
            };

            const sources = sourceMap[name];
            if (!sources) return null;

            const combinedHistory = sources.reduce((acc, sourceName) => {
                const metric = breakdownMetrics.find(m => m.name === sourceName);
                return acc.map((pt, i) => ({
                    year: pt.year,
                    value: pt.value + (metric?.history[i]?.value || 0)
                }));
            }, nrData.map(pt => ({ year: pt.year, value: 0 })));

            return calculateAbsoluteMetric(name, combinedHistory, nrData);
        };

        // 1. Generate calculated metrics (like 'Non-Citizens Population')
        const calculated = orderList
            .map(name => getCalculatedMetric(name, rawMetrics, breakdownMetrics))
            .filter((m): m is Metric => m !== null);

        // 2. Combine all sources
        const allMetrics = [...rawMetrics, ...breakdownMetrics, ...calculated];

        // 3. Filter and Sort based on the orderList
        return allMetrics
            .filter(m => orderList.includes(m.name))
            .sort((a, b) => orderList.indexOf(a.name) - orderList.indexOf(b.name))
            .map(metric => ({ ...metric, history: metric.history?.slice(-yearScope) }));
    }, [rawMetrics, breakdownMetrics, yearScope, countryCode]);

    const spec = useMemo(() => ({
        widgetSpec: {
            height: "600px",
            prompt: `**Objective:** Render chart data.\n **View Type:** ${viewMode}.\n **Data State:** Combined metrics: ${JSON.stringify(filteredMetrics)}.`
        }
    }), [viewMode, filteredMetrics]);

    useEffect(() => {
        if (availableYears.length > 0 && !selectedYear) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const pieChartData = useMemo(() => {
        const snapshotYear = selectedYear;

        const getValue = (name: string) => {
            const metric = [...rawMetrics, ...breakdownMetrics].find(
                m => m.name.toLowerCase() === name.toLowerCase()
            );
            return metric?.history?.find(h => h.year === snapshotYear)?.value || 0;
        };

        // Country-specific mappings
        const isMY = countryCode === 'MY';
        const hasNestedBreakdown = metadata.hasNestedBreakdown;

        // 1. Fetch values
        const totalRaw = getValue('Total Population');
        const citizenCount = getValue(isMY ? 'Citizen' : 'Singapore Citizen Population');
        const nonResident = getValue(isMY ? 'Non Citizen' : 'Non-Resident Population');
        const prCount = isMY ? 0 : getValue('Permanent Resident Population');

        // 2. DEBUG: Log the values to see which one is 0
        console.log('Calculation Debug:', { totalRaw, citizenCount, nonResident, prCount, isMY });

        // 3. Fallback logic: If Total is missing, sum the parts
        const total = (citizenCount + nonResident + prCount);

        // Breakdown lookups
        const getBreakdown = (name: string) => hasNestedBreakdown ? getValue(name) : 0;

        const workPermits = Math.round((getBreakdown('Work Permit Holders') / 100) * nonResident);
        const passCount = Math.round(((getBreakdown('S Pass Holders') + getBreakdown('Employment Pass Holders')) / 100) * nonResident);
        const migrantWorkers = Math.round((getBreakdown('Migrant Domestic Workers') / 100) * nonResident);
        const others = Math.round(((getBreakdown('Student Pass Holders') + getBreakdown("Long-Term Visit Pass Holders And Dependant's Pass Holders")) / 100) * nonResident);

        return {
            total,
            citizens: citizenCount,
            permanentResidents: prCount,
            nonCitizens: isMY ? nonResident : (prCount + nonResident),
            workPermits,
            passCount,
            migrantWorkers,
            others,
            snapshotYear
        };
    }, [rawMetrics, breakdownMetrics, selectedYear, countryCode, hasNestedBreakdown]);

    const getPercentage = (value: number) => {
        if (!pieChartData.total || pieChartData.total === 0) return '0.0%';
        return `${((value / pieChartData.total) * 100).toFixed(1)}%`;
    };

    const isSingleColumn = viewMode === 'pie';

    return (
        <div className="w-full space-y-4">
            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-slate-200 w-full">
                <div className="flex bg-white rounded-md border shadow-sm p-0.5">
                    {(['pie', 'bar', 'line'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${viewMode === mode ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
                {viewMode !== 'pie' && (
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border shadow-xs">
                        <span className="text-xs font-bold text-slate-500">History:</span>
                        <input
                            type="range"
                            min="2"
                            max={maxAvailableYears}
                            value={yearScope}
                            onChange={(e) => setYearScope(Number(e.target.value))}
                            className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-600">{yearScope} yrs</span>
                    </div>
                )}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-xs">
                    <span className="text-xs font-bold text-slate-500">Year:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="text-xs font-mono font-bold text-emerald-600 bg-transparent border-none focus:ring-0 cursor-pointer"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vertical Stack: Chart on top, Population Segment Profiles at the bottom */}
            <div className="flex flex-col gap-4 w-full">
                {/* Chart Area */}
                <div className="w-full border rounded-xl bg-card shadow-sm min-h-[400px] flex items-center justify-center p-2 relative">
                    {viewMode === 'pie' ? (
                        <PopulationPieChart
                            totalPopulation={pieChartData.total}
                            citizenCount={pieChartData.citizens}
                            nonCitizenCount={pieChartData.nonCitizens}
                            prCount={pieChartData.permanentResidents}
                            workPermitCount={pieChartData.workPermits}
                            passCount={pieChartData.passCount}
                            migrantCount={pieChartData.migrantWorkers}
                            otherNonCitizenCount={pieChartData.others}
                            hasBreakdown={hasNestedBreakdown}
                        />
                    ) : (
                        <GenerateWidget
                            key={`widget-${viewMode}-${selectedMetricIndex}-${yearScope}`}
                            height="520px"
                            viewMode={viewMode}
                            countryCode={countryCode}
                            selectedIndex={selectedMetricIndex}
                            onSelect={setSelectedMetricIndex}
                        >
                            {JSON.stringify(spec)}
                        </GenerateWidget>
                    )}
                </div>

                {/* Population Segment Profiles (Positioned at the bottom) */}
                <div className="w-full border rounded-xl bg-white p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 border-b pb-2">Population Segment Profiles</h3>
                    <div className="space-y-2 font-sans text-sm mt-3">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border">
                            <div className="flex items-center space-x-2.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP.citizens} shrink-0`} />
                                <span className="font-medium text-slate-700">{label} Citizens</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-slate-900">{pieChartData.citizens.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground font-medium">{getPercentage(pieChartData.citizens)}</span>
                            </div>
                        </div>

                        <div className="space-y-2 font-sans text-sm">
                            <div
                                onClick={() => hasNestedBreakdown && setIsNonCitizenExpanded(!isNonCitizenExpanded)}
                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${hasNestedBreakdown ? 'bg-indigo-50 border-indigo-200 cursor-pointer hover:bg-indigo-100' : 'bg-slate-50 border-slate-200'}`}
                            >
                                <div className="flex items-center space-x-2.5">
                                    {hasNestedBreakdown && (
                                        <svg className={`w-3 h-3 text-indigo-600 transition-transform ${isNonCitizenExpanded ? 'rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                    <div className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP.nonCitizens} shrink-0`} />
                                    <span className={`font-semibold ${hasNestedBreakdown ? 'text-indigo-900' : 'text-slate-700'}`}>Non-Citizens Total</span>
                                </div>
                                <div className="text-right">
                                    <span className={`block font-bold ${hasNestedBreakdown ? 'text-indigo-900' : 'text-slate-900'}`}>{pieChartData.nonCitizens.toLocaleString()}</span>
                                    <span className={`text-xs font-bold ${hasNestedBreakdown ? 'text-indigo-700' : 'text-slate-500'}`}>{getPercentage(pieChartData.nonCitizens)}</span>
                                </div>
                            </div>

                            {/* Nested Non-Citizen Content */}
                            {hasNestedBreakdown && isNonCitizenExpanded && config && (
                                <div className="pl-6 space-y-2 animate-fadeIn border-l-2 border-indigo-100 ml-4">
                                    {config.filter(item => item.isNested).map((row) => (
                                        <div key={row.id} className="flex items-center justify-between p-2 rounded-md bg-indigo-500/5 text-xs">
                                            <span className="font-medium text-slate-700">{row.label}</span>
                                            <div className="text-right">
                                                <span className="font-mono font-bold">
                                                    {(pieChartData as any)[row.valueKey]?.toLocaleString() || 0}
                                                </span>
                                                <br />
                                                <span className="text-xs text-indigo-700 font-bold">
                                                    {getPercentage((pieChartData as any)[row.valueKey] as number)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}