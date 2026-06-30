// src/lib/prisma.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@/generated/prisma/client/client';

// 1. Initialize the connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. Initialize the adapter
const adapter = new PrismaPg(pool);

// 3. Define the global variable for hot-reloading in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// 4. Export the prisma instance
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({ adapter });

// 5. Assign to global variable if not in production
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}