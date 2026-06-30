// src/app/dashboard/population/page.tsx
import { prisma } from '@/lib/prisma';
import PopulationDashboardView from '@/app/component/ui/PopulationDashboardView';

export const dynamic = 'force-dynamic';

async function getPopulationData() {
    return await prisma.indicator.findMany({
        where: {
            code: { startsWith: 'SG_M810001_' }
        },
        include: {
            dataPoints: {
                where: { country: { code: 'SG' } },
                orderBy: { timePeriod: 'desc' }
            }
        }
    });
}

export async function getBreakdownData() {
    return await prisma.indicator.findMany({
        where: {
            code: { contains: 'SG_M810791' } // Specifically target your breakdown table
        },
        include: {
            dataPoints: {
                orderBy: { timePeriod: 'asc' }
            }
        }
    });
}

export default async function PopulationDashboard() {
    const [populationData, breakdownData] = await Promise.all([
        getPopulationData(),
        getBreakdownData()
    ]);

    console.log("SERVER SIDE - Breakdown Data count:", breakdownData.length);

    if (!populationData.length && !breakdownData.length) {
        return (
            <div className="p-8 w-full mx-auto">
                <h1 className="text-2xl font-bold tracking-tight mb-4">Singapore Population Dashboard</h1>
                <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground">
                    No data found. Please run your sync endpoint (`/api/cron/sync-sinstat`) first.
                </div>
            </div>
        );
    }

    // Pass both datasets to your component
    return <PopulationDashboardView
        data={populationData}
        breakdown={breakdownData}
    />;
}