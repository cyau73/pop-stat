import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Increase duration for Vercel functions handling large syncs
export const maxDuration = 60;

const TABLE_MAP: Record<string, string> = {
    'total': 'M810001',
    'breakdown': 'M810791',
};

interface DataPoint {
    key: string;
    value: string | number;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'total';

    // Accept 'offset' as a query parameter, default to 20
    const offset = searchParams.get('offset') || '2020,2021,2022,2023,2024,2025';

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

        // Dynamic URL using the offset input
        const url = `https://tablebuilder.singstat.gov.sg/api/table/tabledata/${tableId}?timeFilter=${offset}`;
        const response = await fetch(url, {
            headers: { 'accept': 'application/json', 'X-Request-istestapi': 'true' },
            cache: 'no-store',
        });

        if (!response.ok) throw new Error(`SingStat API Error: ${response.status}`);

        const json = await response.json();
        const rows = json.Data?.row || [];
        const category = json.Data?.theme || 'General';

        const allOperations: any[] = [];

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

            for (const dp of (row.columns || [])) {
                const value = parseFloat(String(dp.value));
                if (isNaN(value)) continue;

                allOperations.push(
                    prisma.dataPoint.upsert({
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
                    })
                );
            }
        }

        if (allOperations.length > 0) {
            await prisma.$transaction(allOperations);
        }

        return NextResponse.json({
            success: true,
            table: tableId,
            offset: offset,
            recordsProcessed: allOperations.length
        });
    } catch (error: any) {
        console.error('SingStat Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}