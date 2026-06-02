import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

/**
 * Platform API routes MUST use this. Automatically scopes every query
 * to the given tenant — no route can accidentally leak cross-tenant data.
 */
export function createTenantPrisma(tenantId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: { args: Record<string, unknown>; query: (args: unknown) => Promise<unknown> }) {
          // Inject tenantId into every write and filter every read
          if ('data' in args && args.data && typeof args.data === 'object') {
            (args.data as Record<string, unknown>).tenantId = tenantId;
          }
          if ('where' in args) {
            args.where = { ...(args.where as Record<string, unknown> ?? {}), tenantId };
          } else {
            args.where = { tenantId };
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Admin portal and background jobs only — bypasses tenant scoping.
 */
export function createAdminPrisma() {
  return basePrisma;
}

// Re-export base client for migrations/seeds only
export const prisma = basePrisma;