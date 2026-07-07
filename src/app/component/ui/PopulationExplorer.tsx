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

interface PopulationExplorerProps {
    rawMetrics: Metric[];
    breakdownMetrics: Metric[];
}

type ViewMode = 'line' | 'bar' | 'pie';

interface RowConfig {
    id: string;
    label: string;
    valueKey: string; // Or a union of your state keys
    color: string;
    isNested?: boolean; // Make it optional
}

const SNAPSHOT_CONFIG: RowConfig[] = [
    { id: 'citizens', label: 'Singapore Citizens', valueKey: 'citizens', color: COLOR_MAP.citizens, isNested: false },
    { id: 'nonCitizens', label: 'Non-Citizens Total', valueKey: 'nonCitizens', color: COLOR_MAP.nonCitizens, isNested: false },
    { id: 'pr', label: 'Permanent Residents', valueKey: 'permanentResidents', color: COLOR_MAP.workPermits, isNested: true },
    { id: 'work', label: 'Work Permit Holders', valueKey: 'workPermits', color: COLOR_MAP.workPermits, isNested: true },
    { id: 'migrant', label: 'Migrant Domestic Workers', valueKey: 'migrantWorkers', color: COLOR_MAP.migrantWorkers, isNested: true },
    { id: 'pass', label: 'Employment/S-Pass Holders', valueKey: 'passCount', color: COLOR_MAP.employmentPass, isNested: true },
    { id: 'others', label: 'Long-Term/Students/Dependants', valueKey: 'others', color: COLOR_MAP.others, isNested: true },
];

interface DataPoint {
    key: string;
    value: string | number;
}

// This helper takes your raw percentages and the non-resident reference data
// Place this inside PopulationExplorer.tsx
const calculateAbsoluteMetric = (
    name: string,
    percentHistory: { year: number; value: number }[],
    nrData: { year: number; value: number }[]
): Metric => {
    // Create a map for fast lookup of Non-Resident counts by year
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

export default function PopulationExplorer({ rawMetrics, breakdownMetrics }: PopulationExplorerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('pie');
    const [selectedMetricIndex, setSelectedMetricIndex] = useState<number>(0);
    const [yearScope, setYearScope] = useState<number>(20);
    const [isNonCitizenExpanded, setIsNonCitizenExpanded] = useState<boolean>(false);

    // Get all available years from the first metric
    const availableYears = useMemo(() => {
        return rawMetrics[0]?.history.map(h => h.year).sort((a, b) => b - a) || [];
    }, [rawMetrics]);

    const maxAvailableYears = useMemo(() => {
        // Determine the number of years available in the first metric
        return rawMetrics[0]?.history?.length || 10;
    }, [rawMetrics]);

    // Default to the most recent year
    const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

    // const filteredMetrics = useMemo(() => {
    //     // 1. Helper to find a specific metric's history
    //     const getHistory = (metrics: Metric[], name: string) =>
    //         metrics.find(m => m.name === name)?.history || [];

    //     const prData = getHistory(rawMetrics, 'Permanent Resident Population');
    //     const nrData = getHistory(rawMetrics, 'Non-Resident Population');
    //     const wpData = getHistory(breakdownMetrics, 'Work Permit Holders');

    //     // 2. Calculate Non-Citizen Total (PR + Non-Residents)
    //     const nonCitizenHistory = prData.map((pt, i) => ({
    //         year: pt.year,
    //         value: pt.value + (nrData[i]?.value || 0)
    //     }));

    //     // 3. Calculate Work Permit Absolute Number (Percentage * Non-Residents)
    //     const wpAbsoluteHistory = wpData.map((pt, i) => ({
    //         year: pt.year,
    //         value: Math.round(pt.value * ((nrData[i]?.value || 0) / 100))
    //     }));

    //     // 4. Construct NEW metric objects (avoid mutating original data)
    //     const nonCitizenMetric: Metric = {
    //         name: 'Non-Citizens Population',
    //         unit: 'Number',
    //         history: nonCitizenHistory
    //     };

    //     const wpAbsoluteMetric: Metric = {
    //         name: 'Work Permit Holders',
    //         unit: 'Number',
    //         history: wpAbsoluteHistory
    //     };

    //     // 5. Combine everything
    //     const allMetrics = [
    //         ...rawMetrics.filter(m => m.name !== 'Work Permit Holders'), // Remove old one
    //         ...breakdownMetrics.filter(m => m.name !== 'Work Permit Holders'),
    //         nonCitizenMetric,
    //         wpAbsoluteMetric
    //     ];

    //     // 6. Return the filtered, sliced, and sorted result
    //     return allMetrics
    //         .filter(metric => DISPLAY_ORDER.includes(metric.name))
    //         .map(metric => ({ ...metric, history: metric.history.slice(-yearScope) }))
    //         .sort((a, b) => DISPLAY_ORDER.indexOf(a.name) - DISPLAY_ORDER.indexOf(b.name));
    // }, [rawMetrics, breakdownMetrics, yearScope]);

    // 1. Ensure DataPoint interface is aligned with your history objects

    interface DataPoint { year: number; value: number; }

    const filteredMetrics = useMemo(() => {
        const nrData = rawMetrics.find(m => m.name === 'Non-Resident Population')?.history || [];
        const prData = rawMetrics.find(m => m.name === 'Permanent Resident Population')?.history || [];

        // 1. Define how each Display Name is calculated
        const getCalculatedMetric = (name: string): Metric | null => {
            if (name === 'Non-Citizens Population') {
                return {
                    name,
                    unit: 'People',
                    history: prData.map((pt, i) => ({ year: pt.year, value: pt.value + (nrData[i]?.value || 0) }))
                };
            }

            // Map names to their database counterparts
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

            // Sum histories for the sources
            const combinedHistory = sources.reduce((acc, sourceName) => {
                const metric = breakdownMetrics.find(m => m.name === sourceName);
                return acc.map((pt, i) => ({
                    year: pt.year,
                    value: pt.value + (metric?.history[i]?.value || 0)
                }));
            }, nrData.map(pt => ({ year: pt.year, value: 0 })));

            return calculateAbsoluteMetric(name, combinedHistory, nrData);
        };

        // 2. Build the result by iterating over DISPLAY_ORDER
        const allCalculated = DISPLAY_ORDER
            .map(name => {
                // If it's a raw metric, return it, otherwise try to calculate it
                const raw = rawMetrics.find(m => m.name === name);
                if (raw) return raw;
                return getCalculatedMetric(name);
            })
            .filter((m): m is Metric => m !== null);

        return allCalculated
            .map(metric => ({ ...metric, history: metric.history.slice(-yearScope) }));
    }, [rawMetrics, breakdownMetrics, yearScope]);


    const spec = useMemo(() => ({
        widgetSpec: {
            height: "600px",
            // Only pass filteredMetrics here. Do not include breakdownMetrics separately.
            prompt: `**Objective:** Render chart data.\n **View Type:** ${viewMode}.\n **Data State:** Combined metrics: ${JSON.stringify(filteredMetrics)}.`
        }
    }), [viewMode, filteredMetrics]); // filteredMetrics is already sliced by yearScope

    // Update state if data changes
    useEffect(() => {
        if (availableYears.length > 0 && !selectedYear) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const pieChartData = useMemo(() => {
        const snapshotYear = selectedYear;

        const getValueForYear = (metrics: Metric[], nameMatch: string, year: number) => {
            const metric = metrics.find(m => m.name.toLowerCase() === nameMatch.toLowerCase());
            return metric?.history.find(h => h.year === year)?.value || 0;
        };

        // 1. Get raw counts
        const citizenCount = getValueForYear(rawMetrics, 'Singapore Citizen Population', snapshotYear);
        const prCount = getValueForYear(rawMetrics, 'Permanent Resident Population', snapshotYear);
        const nonResidentCount = getValueForYear(rawMetrics, 'Non-Resident Population', snapshotYear);

        // 2. Get breakdown percentages (database returns them as numbers like 25.5 for 25.5%)
        const workPermitPct = getValueForYear(breakdownMetrics, 'Work Permit Holders', snapshotYear);
        const sPassPct = getValueForYear(breakdownMetrics, 'S Pass Holders', snapshotYear);
        const epPct = getValueForYear(breakdownMetrics, 'Employment Pass Holders', snapshotYear);
        const migrantPct = getValueForYear(breakdownMetrics, 'Migrant Domestic Workers', snapshotYear);
        const studentPct = getValueForYear(breakdownMetrics, 'Student Pass Holders', snapshotYear);
        const ltvpPct = getValueForYear(breakdownMetrics, "Long-Term Visit Pass Holders And Dependant's Pass Holders", snapshotYear);

        // 3. Calculate actual counts based on the non-resident population
        const workPermits = Math.round((workPermitPct / 100) * nonResidentCount);
        const passCount = Math.round(((sPassPct + epPct) / 100) * nonResidentCount);
        const migrantWorkers = Math.round((migrantPct / 100) * nonResidentCount);
        const others = Math.round(((studentPct + ltvpPct) / 100) * nonResidentCount);

        return {
            total: getValueForYear(rawMetrics, 'Total Population', snapshotYear),
            citizens: citizenCount,
            permanentResidents: prCount,
            nonCitizens: prCount + nonResidentCount,
            workPermits: workPermits,
            passCount: passCount,
            migrantWorkers: migrantWorkers,
            others: others,
            snapshotYear
        };
    }, [rawMetrics, breakdownMetrics, selectedYear]);

    const getPercentage = (value: number) => {
        if (!pieChartData.total || pieChartData.total === 0) return '0.0%';
        return `${((value / pieChartData.total) * 100).toFixed(1)}%`;
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-slate-200 w-full">
                {/* View Mode buttons */}
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
                {/* Slider visible only for line and bar */}
                {viewMode !== 'pie' && (
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border shadow-xs">
                        <span className="text-xs font-bold text-slate-500">History:</span>
                        <input
                            type="range"
                            min="2"
                            max={maxAvailableYears} // This will now work correctly
                            value={yearScope}
                            onChange={(e) => setYearScope(Number(e.target.value))}
                            className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-600">{yearScope} yrs</span>
                    </div>
                )}
                {/* Year Selector (Always visible) */}
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 border rounded-xl bg-card shadow-sm min-h-[400px] flex items-center justify-center p-2 relative">
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
                        />
                    ) : (
                        <GenerateWidget
                            key={`widget-${viewMode}-${selectedMetricIndex}-${yearScope}`} // Added yearScope to the key
                            height="520px"
                            viewMode={viewMode}
                            selectedIndex={selectedMetricIndex}
                            onSelect={setSelectedMetricIndex}
                        >
                            {JSON.stringify(spec)}
                        </GenerateWidget>
                    )}
                </div>

                {/* Sidebar Context Legend Panel with Interactive Accordion Dropdown */}
                < div className="border rounded-xl bg-white p-4 shadow-sm h-fit" >
                    <h3 className="text-xs font-bold text-slate-900 border-b pb-2">Population Segment Profiles</h3>

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
                                    {SNAPSHOT_CONFIG.filter(item => item.isNested).map((row) => (
                                        <div key={row.id} className="flex items-center justify-between p-2 rounded-md bg-indigo-500/5 text-xs">
                                            <span className="font-medium text-slate-700">{row.label}</span>
                                            <div className="text-right">
                                                <span className="font-mono font-bold">
                                                    {(pieChartData as any)[row.valueKey].toLocaleString()}
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
                </div >
            </div >
        </div >
    );
}