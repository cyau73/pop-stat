// app/api/charts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode') || 'SG';
    const category = searchParams.get('category') || 'Population';

    const data = await prisma.dataPoint.findMany({
        where: {
            country: { code: countryCode },
            indicator: { category: category }
        },
        include: { indicator: true },
        orderBy: { timePeriod: 'asc' }
    });

    // Format data structurally so frontend charting libraries (like Recharts or Shadcn Chart) can ingest it easily
    return NextResponse.json(data);
}