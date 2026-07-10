export interface DBDataPoint {
    timePeriod: string;
    value: number | null;
}

export interface DBIndicator {
    id: string;
    name: string;
    unit: string | null;
    dataPoints: DBDataPoint[];
}

export interface CountryData {
    population: DBIndicator[];
    breakdown: DBIndicator[];
}

export interface PopulationDashboardViewProps {
    countryDataMap: Record<string, CountryData>;
}

export interface GenerateWidgetProps {
    height?: string;
    children: string;
    viewMode?: 'line' | 'bar'; // Tracks current graph presentation mode
    countryCode: 'SG' | 'MY';
    selectedIndex: number; // New prop
    onSelect: (index: number) => void; // New prop    
}

export interface DataPoint { year: number; value: number; }
export interface MetricItem { name: string; unit: string; history: DataPoint[]; }