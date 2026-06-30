// src/app/component/ui/PopulationPieChart.tsx
'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';

interface Segment {
    label: string;
    value: number;
    color: string;
}

interface PopulationPieChartProps {
    totalPopulation: number;
    citizenCount: number;
    prCount: number
    // Sub-segments of Non-Citizens
    workPermitCount: number;
    passCount: number;
    migrantCount: number;
    otherNonCitizenCount: number;
}

export default function PopulationPieChart({
    totalPopulation,
    citizenCount,
    prCount,
    workPermitCount,
    passCount,
    migrantCount,
    otherNonCitizenCount,
}: PopulationPieChartProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    const segments: Segment[] = useMemo(() => [
        { label: 'Singapore Citizens', value: citizenCount, color: '#059669' }, // Green
        // Non-Citizens: Ranging from lighter (general) to darker (specific) blues
        { label: 'Permanent Residents', value: prCount, color: '#60a5fa' },      // Bright Blue
        { label: 'Work Permits', value: workPermitCount, color: '#3b82f6' },     // Primary Blue
        { label: 'Employment & S Pass', value: passCount, color: '#2563eb' },    // Darker Blue
        { label: 'Domestic Workers', value: migrantCount, color: '#1d4ed8' },    // Even Darker
        { label: 'Other Non-Citizens', value: otherNonCitizenCount, color: '#1e3a8a' } // Deep Navy
    ], [citizenCount, prCount, workPermitCount, passCount, migrantCount, otherNonCitizenCount]);

    // Compute angular slices mapping totals to cumulative radians
    const chartData = useMemo(() => {
        let currentAngle = -Math.PI / 2; // Start from top vertical 12 o'clock center
        return segments.map(seg => {
            const percentage = (seg.value / totalPopulation) * 100;
            const angleExtent = (seg.value / totalPopulation) * (2 * Math.PI);
            const startAngle = currentAngle;
            const endAngle = currentAngle + angleExtent;
            currentAngle = endAngle;

            return {
                ...seg,
                percentage,
                startAngle,
                endAngle
            };
        });
    }, [segments, totalPopulation]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = 400;
        const height = 400;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = 140;
        const innerRadius = 80; // Creates clean modern donut ring view

        chartData.forEach((slice, idx) => {
            const isHovered = hoveredIndex === idx;
            const radiusOffset = isHovered ? 8 : 0; // Pop out slice subtly on hover

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius + radiusOffset, slice.startAngle, slice.endAngle);
            ctx.arc(centerX, centerY, innerRadius, slice.endAngle, slice.startAngle, true);
            ctx.closePath();

            ctx.fillStyle = slice.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Render readable inline data percentage labels inside the slices if big enough
            if (slice.percentage > 4) {
                const midAngle = (slice.startAngle + slice.endAngle) / 2;
                const labelRadius = innerRadius + (outerRadius - innerRadius) / 2 + (isHovered ? 4 : 0);
                const labelX = centerX + Math.cos(midAngle) * labelRadius;
                const labelY = centerY + Math.sin(midAngle) * labelRadius;

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px ui-sans-serif, system-ui';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${slice.percentage.toFixed(1)}%`, labelX, labelY);
            }
        });
    }, [chartData, hoveredIndex]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Check if mouse resides cleanly within radius bounds
        if (distanceFromCenter >= 75 && distanceFromCenter <= 155) {
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) {
                angle += 2 * Math.PI; // Adjust polar alignment matrix offset
            }

            const foundIdx = chartData.findIndex(slice => angle >= slice.startAngle && angle <= slice.endAngle);

            if (foundIdx !== -1) {
                setHoveredIndex(foundIdx);
                setTooltipPos({ x: mouseX, y: mouseY });
                return;
            }
        }

        setHoveredIndex(null);
        setTooltipPos(null);
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-card border rounded-xl p-6 shadow-sm w-full">
            <div className="relative w-[400px] h-[400px]">
                <canvas
                    ref={canvasRef}
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
            <div className="flex flex-col space-y-3 min-w-[240px]">
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
            </div>
        </div>
    );
}