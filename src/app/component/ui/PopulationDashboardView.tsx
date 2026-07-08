// src/app/component/PopulationDashboardView.tsx
'use client';

import { useMemo, useState } from 'react';
import PopulationExplorer from '@/app/component/ui/PopulationExplorer';
import { COUNTRY_METADATA, COUNTRY_SIDEBAR_CONFIGS } from '@/app/component/ui/constants';

interface DBDataPoint {
    timePeriod: string;
    value: number | null;
}

interface DBIndicator {
    id: string;
    name: string;
    unit: string | null;
    dataPoints: DBDataPoint[];
}

interface CountryData {
    population: DBIndicator[];
    breakdown: DBIndicator[];
}

interface PopulationDashboardViewProps {
    countryDataMap: Record<string, CountryData>;
}

const safeNum = (val: any) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

// Adapt data from Prisma naming rules to PopulationExplorer rules
const adaptToExplorerMetrics = (dbIndicators: DBIndicator[]) => {
    return dbIndicators.map(indicator => ({
        name: indicator.name,
        unit: indicator.unit,
        history: (indicator.dataPoints || [])
            .map(dp => ({
                year: parseInt(dp.timePeriod, 10),
                value: dp.value ?? 0
            }))
            .sort((a, b) => a.year - b.year) // Sort chronological
    }));
};

export default function PopulationDashboardView({ countryDataMap }: { countryDataMap: Record<string, any> }) {
    const availableCountries = Object.keys(countryDataMap);
    // Track multiple selected countries for comparison
    const [selectedCountries, setSelectedCountries] = useState<string[]>(['SG']);

    const toggleCountry = (code: string) => {
        setSelectedCountries(prev =>
            prev.includes(code)
                ? prev.filter(c => c !== code) // Deselect
                : [...prev, code]              // Add for side-by-side comparison
        );
    };

    return (
        <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Demographics</h1>
                    <p className="text-sm text-slate-500">Compare multi-country population dynamics side-by-side</p>
                </div>

                {/* Multi-Select Country Badges */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border">
                    {availableCountries.map((code) => (
                        <button
                            key={code}
                            onClick={() => toggleCountry(code)}
                            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${selectedCountries.includes(code)
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            {code === 'SG' ? 'Singapore' : code === 'MY' ? 'Malaysia' : code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dynamic Flex Grid to output components side-by-side */}
            <div className={`grid gap-6 grid-cols-1 ${selectedCountries.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                {selectedCountries.map((code) => {
                    const countryData = countryDataMap[code];
                    if (!countryData) return null;

                    // Dynamically map properties to compatible structures
                    const rawMetrics = adaptToExplorerMetrics(countryData.population);
                    const breakdownMetrics = adaptToExplorerMetrics(countryData.breakdown);

                    // Get the config or provide an empty fallback list
                    const sidebarConfig = COUNTRY_SIDEBAR_CONFIGS[code] || [];

                    return (
                        <div key={code} className="border p-4 rounded-2xl bg-slate-50/50 relative">
                            <div className="absolute top-4 right-4 bg-slate-900 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-wider z-10">
                                {code} Engine
                            </div>
                            <PopulationExplorer
                                countryCode={code as 'SG' | 'MY'}
                                rawMetrics={rawMetrics}
                                breakdownMetrics={breakdownMetrics}
                                config={sidebarConfig}
                                metadata={COUNTRY_METADATA[code]}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}