// app/component/ui/PopulationDashboardView.tsx
'use client';

import { useState, useMemo } from 'react';
import PopulationExplorer from '@/app/component/ui/PopulationExplorer';
import { COUNTRY_METADATA, COUNTRY_SIDEBAR_CONFIGS } from '@/app/component/ui/constants';
import { DBIndicator } from '@/app/interfaces/db';

// Centralized adapter that handles both SG and MY mapping logic
// Centralized adapter that handles both SG and MY mapping logic
const adaptToExplorerMetrics = (dbIndicators: DBIndicator[], countryCode: string) => {
    const keyMap: Record<string, Record<string, string>> = {
        'MY': {
            'CITIZEN': 'citizens',
            'NON CITIZEN': 'nonCitizens',
            'TOTAL POPULATION': 'total'
        },
        'SG': {}
    };

    const metrics = dbIndicators.map(indicator => {
        const normalizedName = indicator.name.toUpperCase();
        const mappedKey = keyMap[countryCode]?.[normalizedName] || indicator.name;

        // Safely map and clean up data points, ensuring proper numeric coercion and sorting
        const rawHistory = (indicator.dataPoints || [])
            .map((dp: any) => ({
                year: Number(dp.timePeriod),
                value: Number(dp.value)
            }))
            .filter((pt: { year: number; value: number }) => !isNaN(pt.year) && !isNaN(pt.value));

        // Sort strictly ascending by year
        rawHistory.sort((a, b) => a.year - b.year);

        return {
            name: indicator.name,
            unit: indicator.unit,
            key: mappedKey,
            history: rawHistory
        };
    });

    if (countryCode === 'MY' && !metrics.some(m => m.key === 'total')) {
        const years = metrics[0]?.history.map(h => h.year) || [];
        const totalHistory = years.map(year => {
            const cit = metrics.find(m => m.key === 'citizens')?.history.find(h => h.year === year)?.value || 0;
            const non = metrics.find(m => m.key === 'nonCitizens')?.history.find(h => h.year === year)?.value || 0;
            return { year, value: cit + non };
        });

        metrics.push({
            name: 'Total Population',
            unit: 'People',
            key: 'total',
            history: totalHistory
        });
    }

    return metrics;
};

export default function PopulationDashboardView({ countryDataMap }: { countryDataMap: Record<string, any> }) {
    const availableCountries = Object.keys(countryDataMap);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(['SG']);

    const toggleCountry = (code: string) => {
        setSelectedCountries(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    return (
        <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Demographics</h1>
                    <p className="text-sm text-slate-500">Compare multi-country population dynamics side-by-side</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border">
                    {availableCountries.map((code) => (
                        <button
                            key={code}
                            onClick={() => toggleCountry(code)}
                            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${selectedCountries.includes(code)
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            {COUNTRY_METADATA[code]?.label || code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comparison Grid */}
            <div className={`grid gap-6 grid-cols-1 ${selectedCountries.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                {selectedCountries.map((code) => {
                    const countryData = countryDataMap[code];
                    if (!countryData) return null;
                    //console.log("COUNTRY DATA: ", countryData);

                    // Derive everything locally per-country
                    const config = COUNTRY_SIDEBAR_CONFIGS[code] || [];
                    const metadata = COUNTRY_METADATA[code] || { label: code, hasNestedBreakdown: false };

                    const isMY = code === 'MY';
                    // Use the unified adapter
                    const rawMetrics = adaptToExplorerMetrics(countryData.population, code);
                    //console.log("RAW: ", rawMetrics);
                    const breakdownMetrics = isMY ? [] : adaptToExplorerMetrics(countryData.breakdown || [], code);
                    //console.log("BREAKDOWN: ", breakdownMetrics);

                    return (
                        <div key={code} className="border p-4 rounded-2xl bg-slate-50/50 relative shadow-sm">
                            <div className="absolute top-4 right-4 bg-slate-900 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-wider z-10">
                                {COUNTRY_METADATA[code]?.label}
                            </div>
                            <PopulationExplorer
                                countryCode={code as 'SG' | 'MY'}
                                rawMetrics={rawMetrics}
                                breakdownMetrics={breakdownMetrics}
                                config={config}
                                metadata={metadata}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}