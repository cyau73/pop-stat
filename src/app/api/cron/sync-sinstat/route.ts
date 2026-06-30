// src/app/api/cron/sync-sinstat/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const country = await prisma.country.upsert({
            where: { code: 'SG' },
            update: {},
            create: { code: 'SG', name: 'Singapore' },
        });

        const url = 'https://tablebuilder.singstat.gov.sg/api/table/tabledata/M810001?offset=20';
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-Request-istestapi': 'true',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            },
            cache: 'no-store',
        });

        if (!response.ok) throw new Error(`SingStat API Error: ${response.status}`);

        const json = await response.json();
        const rows = json.Data?.row || [];
        let recordsCreated = 0;

        for (const row of rows) {
            const indicatorName = row.rowText;
            if (!indicatorName) continue;

            const indicatorCode = `SG_M810001_${indicatorName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

            const indicator = await prisma.indicator.upsert({
                where: { code: indicatorCode },
                update: { name: indicatorName, unit: row.uoM || 'Units' },
                create: {
                    code: indicatorCode,
                    name: indicatorName,
                    category: 'Population',
                    unit: row.uoM || 'Units',
                    country: { connect: { id: country.id } }
                },
            });

            const dpOperations = (row.columns || []).map(dp => {
                const value = parseFloat(dp.value);
                if (isNaN(value)) return null;

                return prisma.dataPoint.upsert({
                    where: {
                        countryId_indicatorId_timePeriod: {
                            countryId: country.id,
                            indicatorId: indicator.id,
                            timePeriod: dp.key,
                        },
                    },
                    update: { value },
                    create: {
                        countryId: country.id,
                        indicatorId: indicator.id,
                        timePeriod: dp.key,
                        value,
                    },
                });
            }).filter((op): op is NonNullable<typeof op> => op !== null);

            if (dpOperations.length > 0) {
                await prisma.$transaction(dpOperations);
                recordsCreated += dpOperations.length;
            }
        }

        return NextResponse.json({ success: true, recordsCreated });
    } catch (error: any) {
        console.error('SingStat Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}