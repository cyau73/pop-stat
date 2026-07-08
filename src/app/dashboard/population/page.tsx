// src/app/dashboard/population/page.tsx
import { prisma } from '@/lib/prisma';
import PopulationDashboardView from '@/app/component/ui/PopulationDashboardView';
import { COUNTRY_CONFIGS } from '@/app/component/ui/constants';

export const dynamic = 'force-dynamic';

async function getIndicatorsByCodePrefix(prefix: string, countryCode: string) {
    return await prisma.indicator.findMany({
        where: {
            code: { startsWith: prefix },
            country: { code: countryCode }
        },
        include: {
            dataPoints: {
                orderBy: { timePeriod: 'desc' }
            }
        }
    });
}

// async function getPopulationData() {
//     return await prisma.indicator.findMany({
//         where: {
//             code: { startsWith: 'SG_M810001_' }
//         },
//         include: {
//             dataPoints: {
//                 where: { country: { code: 'SG' } },
//                 orderBy: { timePeriod: 'desc' }
//             }
//         }
//     });
// }

// export async function getBreakdownData() {
//     return await prisma.indicator.findMany({
//         where: {
//             code: { contains: 'SG_M810791' } // Specifically target your breakdown table
//         },
//         include: {
//             dataPoints: {
//                 orderBy: { timePeriod: 'asc' }
//             }
//         }
//     });
// }

export default async function PopulationDashboard() {
    const countryDataMap: Record<string, { population: any[]; breakdown: any[] }> = {};

    // Fetch all countries concurrently in a loop
    await Promise.all(
        COUNTRY_CONFIGS.map(async (config) => {
            const [population, breakdown] = await Promise.all([
                getIndicatorsByCodePrefix(config.mainPrefix, config.code),
                getIndicatorsByCodePrefix(config.breakdownPrefix, config.code)
            ]);

            if (population.length > 0) {
                countryDataMap[config.code] = { population, breakdown };
            }
        })
    );

    // console.log("SERVER SIDE - Breakdown Data count:", sgBreakdownData.length);

    if (Object.keys(countryDataMap).length === 0) {
        return (
            <div className="p-8 w-full text-center">
                <h1 className="text-2xl font-bold mb-4">Global Population Dashboard</h1>
                <div className="p-6 border border-dashed rounded-lg text-muted-foreground">No data found.</div>
            </div>
        );
    }

    return <PopulationDashboardView countryDataMap={countryDataMap} />;
}