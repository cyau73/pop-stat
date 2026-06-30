// src/app/api/cron/sync-sinstat/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Human-readable aliases mapped to SingStat IDs
const TABLE_MAP: Record<string, string> = {
    'total': 'M810001',
    'breakdown': 'M810791',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'total';
    const tableId = TABLE_MAP[type];

    if (!tableId) {
        return NextResponse.json({ success: false, error: 'Invalid type provided' }, { status: 400 });
    }

    try {
        const country = await prisma.country.upsert({
            where: { code: 'SG' },
            update: {},
            create: { code: 'SG', name: 'Singapore' },
        });

        const url = `https://tablebuilder.singstat.gov.sg/api/table/tabledata/${tableId}?offset=20`;
        const response = await fetch(url, {
            headers: { 'accept': 'application/json', 'X-Request-istestapi': 'true' },
            cache: 'no-store',
        });

        if (!response.ok) throw new Error(`SingStat API Error: ${response.status}`);

        const json = await response.json();
        const rows = json.Data?.row || [];
        const category = json.Data?.theme || 'General';
        let recordsCreated = 0;

        for (const row of rows) {
            const indicatorName = row.rowText;
            if (!indicatorName) continue;

            const indicatorCode = `SG_${tableId}_${indicatorName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

            const indicator = await prisma.indicator.upsert({
                where: { code: indicatorCode },
                update: { name: indicatorName, unit: row.uoM || 'Units' },
                create: {
                    code: indicatorCode,
                    name: indicatorName,
                    category: category,
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

        return NextResponse.json({ success: true, table: tableId, recordsCreated });
    } catch (error: any) {
        console.error('SingStat Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}