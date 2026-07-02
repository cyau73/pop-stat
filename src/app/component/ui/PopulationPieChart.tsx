// src/app/component/ui/PopulationPieChart.tsx
'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PopulationPieChartProps {
    totalPopulation: number;
    citizenCount: number;
    nonCitizenCount: number;
    prCount: number;
    workPermitCount: number;
    passCount: number;
    migrantCount: number;
    otherNonCitizenCount: number;
}

export default function PopulationPieChart({
    totalPopulation,
    citizenCount,
    nonCitizenCount,
    prCount,
    workPermitCount,
    passCount,
    migrantCount,
    otherNonCitizenCount
}: PopulationPieChartProps) {
    const [view, setView] = useState<'main' | 'breakdown'>('main');

    // Logging data to verify inputs
    console.log('PopulationPieChart Data:', {
        prCount, workPermitCount, passCount, migrantCount, otherNonCitizenCount
    });

    // Custom label renderer to place percentage inside slices
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
        const percentage = (value / totalPopulation) * 100;

        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold">
                {`${percentage.toFixed(1)}%`}
            </text>
        );
    };

    const mainData = [
        { name: 'Citizens', value: citizenCount, fill: '#059669' },
        { name: 'Non-Citizens', value: nonCitizenCount, fill: '#3b82f6' }
    ];

    const breakdownData = [
        { name: 'Permanent Residents', value: prCount, fill: '#60a5fa' },
        { name: 'Work Permits', value: workPermitCount, fill: '#3b82f6' },
        { name: 'Domestic Workers', value: migrantCount, fill: '#2563eb' },
        { name: 'Employment & S Pass', value: passCount, fill: '#1d4ed8' },
        { name: 'Long-Term, Dependants and Students', value: otherNonCitizenCount, fill: '#1e3a8a' }
    ].filter(d => d.value > 0);

    const activeData = view === 'main' ? mainData : breakdownData;

    return (
        <div className="w-full h-[400px] flex flex-col items-center">
            {view === 'breakdown' && (
                <button
                    onClick={() => setView('main')}
                    className="mb-2 text-sm text-blue-600 hover:underline"
                >
                    ← Back to Main View
                </button>
            )}

            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={activeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={80} outerRadius={140}
                        label={renderLabel}
                        labelLine={false}
                        onClick={(data) => {
                            if (view === 'main' && data.name === 'Non-Citizens') setView('breakdown');
                        }}
                        style={{ cursor: 'pointer', outline: 'none' }}
                    >
                        {activeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [value.toLocaleString(), name]} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}