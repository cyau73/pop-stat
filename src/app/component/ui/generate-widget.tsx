// src/app/component/ui/generate-widget.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';

interface GenerateWidgetProps {
    height?: string;
    children: string;
    viewMode?: 'line' | 'bar'; // Tracks current graph presentation mode
}

// ... interface constraints stay identical to your original engine configuration ...
interface DataPoint { year: number; value: number; }
interface MetricItem { name: string; unit: string; history: DataPoint[]; }

export function GenerateWidget({ height = '600px', children, viewMode = 'line' }: GenerateWidgetProps) {
    const parsedData = useMemo(() => {
        try {
            const outerObj = JSON.parse(children);
            const promptText = outerObj.widgetSpec?.prompt || '';
            const dataRegex = /context parsed dynamically:\s*(\[.*\])/;
            const match = promptText.match(dataRegex);
            if (match && match[1]) return JSON.parse(match[1]) as MetricItem[];
            return [] as MetricItem[];
        } catch (e) {
            console.error('Failed to parse data payload:', e);
            return [] as MetricItem[];
        }
    }, [children]);

    const [selectedMetricIndex, setSelectedMetricIndex] = useState<number>(0);
    const [hoveredPoint, setHoveredPoint] = useState<{ year: number; value: number; x: number; y: number } | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const activeMetric = parsedData[selectedMetricIndex];
    const padding = useMemo(() => ({ top: 40, right: 40, bottom: 40, left: 80 }), []);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateDims = () => {
            if (containerRef.current) {
                setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
            }
        };
        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    const chartMeta = useMemo(() => {
        if (!activeMetric || activeMetric.history.length === 0) return null;
        const data = activeMetric.history;
        const years = data.map(d => d.year);
        const values = data.map(d => d.value);
        return {
            minYear: Math.min(...years),
            maxYear: Math.max(...years),
            minValue: 0,
            maxValue: Math.max(...values) * 1.1
        };
    }, [activeMetric]);

    // Crisp Render Logic handling Line and Bar configurations together
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !activeMetric || !chartMeta || dimensions.width === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, dimensions.width, dimensions.height);
        setHoveredPoint(null);

        const data = activeMetric.history;
        const { minYear, maxYear, minValue, maxValue } = chartMeta;

        const getX = (year: number) => padding.left + ((year - minYear) / (maxYear - minYear || 1)) * (dimensions.width - padding.left - padding.right);
        const getY = (val: number) => dimensions.height - padding.bottom - ((val - minValue) / (maxValue - minValue)) * (dimensions.height - padding.top - padding.bottom);

        // Render Background Gridlines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#64748b';
        ctx.font = '11px ui-sans-serif, system-ui';

        const ticks = 5;
        for (let i = 0; i <= ticks; i++) {
            const val = (maxValue * i) / ticks;
            const y = getY(val);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(dimensions.width - padding.right, y);
            ctx.stroke();
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(val).toLocaleString(), padding.left - 12, y + 4);
        }

        // Render Horizontal X Axis Categories
        const yearInterval = Math.ceil(data.length / 6);
        data.forEach((pt, index) => {
            if (index % yearInterval === 0 || index === data.length - 1) {
                const x = getX(pt.year);
                ctx.textAlign = 'center';
                ctx.fillText(pt.year.toString(), x, dimensions.height - padding.bottom + 20);
            }
        });

        // DRAW CONFIGURATION A: Bar Chart Layout Rendering
        if (viewMode === 'bar') {
            const chartInnerWidth = dimensions.width - padding.left - padding.right;
            const barWidth = Math.max((chartInnerWidth / (data.length * 1.5)), 4);

            data.forEach((pt) => {
                const centerX = getX(pt.year);
                const y = getY(pt.value);

                // Calculate the actual left edge
                let x = centerX - barWidth / 2;
                let actualWidth = barWidth;

                // CLAMP: If x is less than padding, adjust x and width
                if (x < padding.left) {
                    actualWidth = barWidth - (padding.left - x);
                    x = padding.left;
                }

                const barHeight = dimensions.height - padding.bottom - y;

                // Clip the drawing to prevent bleeding into the Y-axis area
                //if (x < padding.left) return;
                if (actualWidth > 0) {
                    ctx.fillStyle = '#3b82f6';
                    ctx.fillRect(x, y, actualWidth, barHeight);
                    ctx.strokeStyle = '#1d4ed8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, actualWidth, barHeight);
                }

                // ctx.fillStyle = '#3b82f6'; // Clean styling theme color (Blue)
                // ctx.fillRect(x, y, barWidth, barHeight);

                // // Add thin border to distinct vector boxes neatly
                // ctx.strokeStyle = '#1d4ed8';
                // ctx.lineWidth = 1;
                // ctx.strokeRect(x, y, barWidth, barHeight);
            });
        }
        // DRAW CONFIGURATION B: Line Chart Layout Rendering
        else {
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#059669'; // Emerald Theme
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            data.forEach((pt, idx) => {
                if (idx === 0) ctx.moveTo(getX(pt.year), getY(pt.value));
                else ctx.lineTo(getX(pt.year), getY(pt.value));
            });
            ctx.stroke();

            // Render Node Keyframes
            data.forEach((pt) => {
                ctx.beginPath();
                ctx.arc(getX(pt.year), getY(pt.value), 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#059669';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
    }, [activeMetric, chartMeta, dimensions, padding, viewMode]);

    // Tooltip Mouse Movement Interpolation mapping out targets
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !activeMetric || !chartMeta || dimensions.width === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const data = activeMetric.history;
        const { minYear, maxYear, minValue, maxValue } = chartMeta;

        const getX = (year: number) => padding.left + ((year - minYear) / (maxYear - minYear || 1)) * (dimensions.width - padding.left - padding.right);
        const getY = (val: number) => dimensions.height - padding.bottom - ((val - minValue) / (maxValue - minValue)) * (dimensions.height - padding.top - padding.bottom);

        let closestPoint: DataPoint | null = null;
        let minDistance = viewMode === 'bar' ? 32 : 24; // slightly wider lookups for bar targets
        let coords = { x: 0, y: 0 };

        for (const pt of data) {
            const ptX = getX(pt.year);
            const ptY = getY(pt.value);

            // For bars, weigh horizontal tracking distance heavier to make hovering columns seamless
            const distance = viewMode === 'bar'
                ? Math.abs(mouseX - ptX)
                : Math.sqrt(Math.pow(mouseX - ptX, 2) + Math.pow(mouseY - ptY, 2));

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = pt;
                coords = { x: ptX, y: ptY };
            }
        }

        if (closestPoint) {
            setHoveredPoint({ year: closestPoint.year, value: closestPoint.value, x: coords.x, y: coords.y });
        } else {
            setHoveredPoint(null);
        }
    };

    if (parsedData.length === 0) {
        return (
            <div style={{ height }} className="flex items-center justify-center border rounded-xl bg-muted/10 p-6 text-center text-sm text-destructive">
                Error compiling layout canvas: Invalid dataset configuration.
            </div>
        );
    }

    return (
        <div style={{ height }} className="w-full bg-background flex flex-col p-6 space-y-4 select-none">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Selected Demographic Perspective
                    </label>
                    <select
                        value={selectedMetricIndex}
                        onChange={(e) => {
                            setSelectedMetricIndex(Number(e.target.value));
                            setHoveredPoint(null);
                        }}
                        className="block w-full max-w-sm rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        {parsedData.map((metric, idx) => (
                            <option key={idx} value={idx}>{metric.name}</option>
                        ))}
                    </select>
                </div>

                <div className="text-left sm:text-right">
                    <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Measurement Scope</span>
                    <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md inline-block mt-1">
                        {activeMetric.unit}
                    </span>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 w-full relative min-h-0">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="w-full h-full cursor-crosshair block"
                />

                {hoveredPoint && (
                    <div
                        className="absolute bg-slate-900/95 text-slate-50 text-xs rounded-lg p-2.5 shadow-xl border border-slate-800 pointer-events-none transform -translate-x-1/2 -translate-y-full font-sans space-y-0.5"
                        style={{ left: hoveredPoint.x, top: hoveredPoint.y - 12 }}
                    >
                        <div className="font-semibold text-slate-400">Year Milestone: {hoveredPoint.year}</div>
                        <div className="font-mono text-sm text-emerald-400 font-bold">
                            {hoveredPoint.value.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{activeMetric.unit}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}