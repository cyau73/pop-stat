// app/api/cron/sync-dosm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    // Parse years with defaults if necessary
    const startYear = parseInt(searchParams.get('startYear') || '2020', 10);
    const endYear = parseInt(searchParams.get('endYear') || '2025', 10);

    if (isNaN(startYear) || isNaN(endYear)) {
        return NextResponse.json({ error: 'Invalid year format' }, { status: 400 });
    }

    try {
        // 1. Ensure Country exists
        const country = await prisma.country.upsert({
            where: { code: 'MY' },
            update: { name: 'Malaysia' },
            create: { code: 'MY', name: 'Malaysia' },
        });

        // 2. Fetch API Data with your confirmed URL
        // Corrected construction with the required @date column reference
        const url = `https://api.data.gov.my/data-catalogue/?id=population_malaysia&filter=overall@age&date_start=${startYear}-01-01@date&date_end=${endYear}-01-01@date`;
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const rawData = await response.json();

        // 3. Group ONLY 'both' sex and 'overall' age rows
        const grouped = rawData.reduce((acc: any, curr: any) => {
            if (curr.sex === 'both' && curr.age === 'overall') {
                if (!acc[curr.date]) acc[curr.date] = {};
                acc[curr.date][curr.ethnicity] = curr.population;
            }
            return acc;
        }, {});

        // 4. Upsert Indicators
        const indicatorCodes = ['MY_CITIZEN', 'MY_NON_CITIZEN'];
        const indicators = await Promise.all(indicatorCodes.map(code =>
            prisma.indicator.upsert({
                where: { code },
                update: { name: code.replace('MY_', '').replace('_', ' ') },
                create: {
                    code,
                    name: code.replace('MY_', '').replace('_', ' '),
                    category: 'Demographics',
                    countryId: country.id,
                    unit: 'People'
                }
            })
        ));

        // 5. Process and Upsert DataPoints
        const allOperations = [];
        // const startYear = new Date().getFullYear() - 20;

        for (const [date, val] of Object.entries(grouped) as any) {
            const year = new Date(date).getFullYear();
            if (year < startYear) continue;

            const total = (val.overall || 0) * 1000;
            const nonCitizenVal = (val.other_noncitizen || 0) * 1000;
            const citizenVal = total - nonCitizenVal;

            for (const ind of indicators) {
                const finalValue = ind.code === 'MY_CITIZEN' ? citizenVal : nonCitizenVal;

                allOperations.push(
                    prisma.dataPoint.upsert({
                        where: {
                            countryId_indicatorId_timePeriod: {
                                countryId: country.id,
                                indicatorId: ind.id,
                                timePeriod: String(year)
                            }
                        },
                        update: { value: finalValue },
                        create: {
                            countryId: country.id,
                            indicatorId: ind.id,
                            timePeriod: String(year),
                            value: finalValue
                        }
                    })
                );
            }
        }

        await prisma.$transaction(allOperations);
        return NextResponse.json({ success: true, recordsProcessed: allOperations.length });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}