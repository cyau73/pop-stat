// src/app/component/PopulationDashboardView.tsx
import { useMemo } from 'react';
import PopulationExplorer from '@/app/component/ui/PopulationExplorer';

interface DataPoint {
    timePeriod: string;
    value: number | null;
}

interface Metric {
    name: string;
    unit: string;
    history: Array<{ year: number; value: number }>;
}

interface IndicatorWithData {
    id: string;
    name: string;
    unit: string | null;
    dataPoints: DataPoint[];
}

interface PopulationDashboardViewProps {
    data: IndicatorWithData[];
    breakdown: IndicatorWithData[]; // Add this
}

const safeNum = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

export default function PopulationDashboardView({ data, breakdown }: PopulationDashboardViewProps) {
    console.log("CONTAINER - Breakdown Data:", breakdown);
    // 1. Optimize data structure for the frontend widget mapping
    const widgetData = useMemo(() => {
        return data.map(ind => ({
            name: ind.name,
            unit: ind.unit,
            history: ind.dataPoints
                .map(dp => ({ year: parseInt(dp.timePeriod), value: safeNum(dp.value) }))
                .sort((a, b) => a.year - b.year)
        }));
    }, [data]);

    // 2. Map raw row arrays into dynamic historical lookup matrices
    const tableRows = useMemo(() => {
        return data.map(indicator => {
            const lookup: Record<string, string> = {};
            for (const dp of indicator.dataPoints) {
                if (dp.value !== null && dp.value !== undefined) {
                    lookup[dp.timePeriod] = safeNum(dp.value).toLocaleString();
                }
            }
            return {
                id: indicator.id,
                name: indicator.name,
                unit: indicator.unit,
                values: lookup
            };
        });
    }, [data]);

    const breakdownData = useMemo(() => {
        return breakdown.map(ind => ({
            name: ind.name,
            unit: ind.unit ?? 'percentage',
            history: ind.dataPoints.map(dp => ({
                year: parseInt(dp.timePeriod),
                value: safeNum(dp.value)
            }))
        }));
    }, [breakdown]);

    // 3. Dynamically compute target tracking years based on current date (with 1-year stats lag)
    const currentYear = new Date().getFullYear(); // 2026
    const latestStatsYear = currentYear - 1;       // 2025

    // Generates: ['2025', '2024', '2023', '2020']
    const TARGET_YEARS = [
        latestStatsYear.toString(),
        (latestStatsYear - 1).toString(),
        (latestStatsYear - 2).toString(),
        (latestStatsYear - 5).toString(), // Keeps your specific 2020 milestone interval
    ];

    const ORDERED_INDICATORS = [
        'Total Population',
        'Singapore Citizen Population',
        'Permanent Resident Population',
        'Non-Resident Population'
    ];
    const sortedTableRows = useMemo(() => {
        return [...tableRows]
            .filter(row => ORDERED_INDICATORS.includes(row.name))
            .sort((a, b) =>
                ORDERED_INDICATORS.indexOf(a.name) - ORDERED_INDICATORS.indexOf(b.name)
            );
    }, [tableRows]);

    return (
        <div className="p-8 w-full mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Singapore Population Overview</h1>
                <p className="text-muted-foreground">
                    Real-time insights powered by SingStat Table Builder API.
                </p>
            </div>

            {/* Interactive Visual Studio Section */}
            <section className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Historical Data Explorer</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Toggle different metrics using the interactive sandbox below to chart demographic trends over time.
                </p>

                <PopulationExplorer
                    rawMetrics={widgetData}
                    breakdownMetrics={breakdownData}
                />

            </section>

            {/* Main Snapshot Table */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Latest Snapshot Table</h2>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold tracking-wider border-b">
                            <tr>
                                <th className="p-4 font-medium">Indicator</th>
                                <th className="p-4 font-medium">Unit</th>
                                {TARGET_YEARS.map(year => (
                                    <th key={year} className="p-4 font-medium text-right">{year}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y bg-background">
                            {sortedTableRows.map((row) => (
                                <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="p-4 font-medium text-foreground max-w-xs md:max-w-md truncate">
                                        {row.name}
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {row.unit ?? 'N/A'}
                                    </td>
                                    {TARGET_YEARS.map((year, idx) => (
                                        <td
                                            key={year}
                                            className={`p-4 text-right font-mono ${idx === 0 ? 'font-medium text-emerald-600' : ''
                                                }`}
                                        >
                                            {row.values[year] || '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}