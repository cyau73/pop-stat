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

export default async function PopulationDashboard() {
    const data = await getPopulationData();

    if (!data || data.length === 0) {
        return (
            <div className="p-8 w-full mx-auto">
                <h1 className="text-2xl font-bold tracking-tight mb-4">Singapore Population Dashboard</h1>
                <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground">
                    No data found. Please run your sync endpoint (`/api/cron/sync-sinstat`) first.
                </div>
            </div>
        );
    }

    // Pass clean database state directly into your container layout component
    return <PopulationDashboardView data={data} />;
}