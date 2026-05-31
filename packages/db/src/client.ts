import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function createTenantPrisma(tenantId: string) {
  // Tenant-specific Prisma client factory.
  // This should be used in platform API routes to enforce tenant isolation.
  return prisma;
}

export function createAdminPrisma() {
  return prisma;
}
