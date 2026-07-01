// src/app/component/ui/PopulationPieChart.tsx
'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';

interface Segment {
    label: string;
    value: number;
    color: string;
    start?: number;
}

interface PopulationPieChartProps {
    totalPopulation: number;
    citizenCount: number;
    nonCitizenCount: number;
    // Sub-segments of Non-Citizens
    prCount: number
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
    otherNonCitizenCount,
}: PopulationPieChartProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const segments: Segment[] = useMemo(() => [
        { label: 'Singapore Citizens', value: citizenCount, color: '#059669' }, // Green
        { label: 'Non-Citizens', value: nonCitizenCount, color: '#1e3a8a' }, // Deep Navy
        // Non-Citizens: Ranging from lighter (general) to darker (specific) blues
        { label: 'Permanent Residents', value: prCount, color: '#60a5fa' },      // Bright Blue
        { label: 'Work Permits', value: workPermitCount, color: '#3b82f6' },     // Primary Blue
        { label: 'Employment & S Pass', value: passCount, color: '#2563eb' },    // Darker Blue
        { label: 'Domestic Workers', value: migrantCount, color: '#1d4ed8' },    // Even Darker
        { label: 'Other Non-Citizens', value: otherNonCitizenCount, color: '#1e3a8a' } // Deep Navy
    ], [citizenCount, nonCitizenCount, prCount, workPermitCount, passCount, migrantCount, otherNonCitizenCount]);

    // Compute angular slices mapping totals to cumulative radians
    const chartData = useMemo(() => {
        const totalNonCitizen = prCount + workPermitCount + passCount + migrantCount + otherNonCitizenCount;

        // Explicitly type the segments to include the 'start' property
        const innerSegments: Segment[] = [
            { label: 'Singapore Citizens', value: citizenCount, color: '#059669', start: -Math.PI / 2 },
            { label: 'Non-Citizens', value: totalNonCitizen, color: '#3b82f6', start: -Math.PI / 2 + (citizenCount / totalPopulation) * 2 * Math.PI }
        ];

        const breakdownSegments: Segment[] = [];
        let outerAngle = -Math.PI / 2 + (citizenCount / totalPopulation) * 2 * Math.PI;

        segments.slice(2).forEach(s => {
            // Now valid because of the updated interface
            breakdownSegments.push({ ...s, start: outerAngle });
            outerAngle += (s.value / totalPopulation) * 2 * Math.PI;
        });

        return [...innerSegments, ...breakdownSegments].map((s) => {
            const extent = (s.value / totalPopulation) * 2 * Math.PI;
            // Use a fallback for start, as it is optional
            const start = s.start ?? 0;
            return {
                ...s,
                startAngle: start,
                endAngle: start + extent,
                percentage: (s.value / totalPopulation) * 100
            };
        });
    }, [totalPopulation, citizenCount, nonCitizenCount, prCount, workPermitCount, passCount, migrantCount, otherNonCitizenCount, segments]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use the actual container size
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Base radius on the smaller dimension to prevent clipping
        const radius = Math.min(rect.width, rect.height) / 2;

        // Relative sizing based on the actual radius
        const innerRingOuter = radius * 0.8;
        const innerRingInner = radius * 0.5;
        const innerLabelRadius = (innerRingOuter + innerRingInner) / 2;

        ctx.clearRect(0, 0, rect.width, rect.height);

        // 1. Draw INNER Ring ONLY
        const totalNonCitizen = prCount + workPermitCount + passCount + migrantCount + otherNonCitizenCount;
        const innerSegments = [
            { label: 'Citizens', value: citizenCount, color: '#059669' },
            { label: 'Non-Citizens', value: totalNonCitizen, color: '#3b82f6' }
        ];

        let currentAngle = -Math.PI / 2;
        innerSegments.forEach(s => {
            const extent = (s.value / totalPopulation) * 2 * Math.PI;
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRingOuter, currentAngle, currentAngle + extent);
            ctx.arc(centerX, centerY, innerRingInner, currentAngle + extent, currentAngle, true);
            ctx.fillStyle = s.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            const midAngle = currentAngle + extent / 2;
            const labelX = centerX + Math.cos(midAngle) * innerLabelRadius;
            const labelY = centerY + Math.sin(midAngle) * innerLabelRadius;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${((s.value / totalPopulation) * 100).toFixed(1)}%`, labelX, labelY);

            currentAngle += extent;
        });

        // Outer ring code is completely removed from this block
    }, [totalPopulation, citizenCount, prCount, workPermitCount, passCount, migrantCount, otherNonCitizenCount]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const dx = e.clientX - rect.left - rect.width / 2;
        const dy = e.clientY - rect.top - rect.height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. Get the raw angle
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += 2 * Math.PI;

        // 2. Find the match based ONLY on angle and visibility
        const match = chartData.find(s => {
            // Logic: 
            // - Citizens/Non-Citizens are ALWAYS visible
            // - Breakdown segments are ONLY visible if showBreakdown is true
            const isVisible = ['Singapore Citizens', 'Non-Citizens'].includes(s.label) || showBreakdown;
            return isVisible && angle >= s.startAngle && angle <= s.endAngle;
        });

        // 3. Distance check
        if (match && dist >= 75 && dist <= 220) {
            setHoveredIndex(chartData.indexOf(match));
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        } else {
            setHoveredIndex(null);
        }
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full">
            <div className="relative w-full max-w-[600px] aspect-square mx-auto">
                <canvas
                    ref={canvasRef}
                    onClick={() => setShowBreakdown(prev => !prev)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => { setHoveredIndex(null); setTooltipPos(null); }}
                    className="w-full h-full cursor-pointer block"
                />

                {/* Micro tooltip layer rendering precise figures on hover frame */}
                {hoveredIndex !== null && tooltipPos && (
                    <div
                        className="absolute bg-slate-950/95 text-slate-50 text-xs rounded-lg p-3 shadow-xl border border-slate-800 pointer-events-none font-sans space-y-1 z-10"
                        style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 24 }}
                    >
                        <div className="font-semibold text-slate-400">{chartData[hoveredIndex].label}</div>
                        <div className="font-mono text-sm text-emerald-400 font-bold">
                            {chartData[hoveredIndex].value.toLocaleString()}
                            <span className="text-[10px] text-slate-300 font-normal ml-1">
                                ({chartData[hoveredIndex].percentage.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Side descriptive layout guide legends */}
            {/* <div className="flex flex-col space-y-3 min-w-[240px]">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Demographic Profiles
                </h3>
                {chartData.map((slice, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${hoveredIndex === idx ? 'bg-muted border-slate-300 scale-[1.02]' : 'bg-background/50'
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="text-sm font-medium text-foreground">{slice.label}</span>
                        </div>
                        <div className="text-right pl-4">
                            <span className="text-sm font-mono font-bold block">
                                {(slice.value / 1000000).toFixed(3)}M
                            </span>
                            <span className="text-[11px] text-muted-foreground block font-mono">
                                {slice.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div> */}
        </div>
    );
}