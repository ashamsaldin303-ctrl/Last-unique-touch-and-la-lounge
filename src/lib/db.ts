import { PrismaClient } from '@prisma/client'

// Audit 3-b: this is the standard Next.js dev-hot-reload guard — the client is
// cached on globalThis so HMR reuses one connection instead of leaking a pool
// per reload; in production a fresh client per process is created (no leak).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Audit r1-a1 F10: Prisma query logs include bound parameters (customer PII
// in Booking/ContactMessage rows) — enable them only opt-in via
// PRISMA_QUERY_LOG=1 (in ANY environment); default is errors/warnings only.
const prismaLogConfig: Array<'query' | 'error' | 'warn'> =
  process.env.PRISMA_QUERY_LOG === '1' ? ['query', 'error', 'warn'] : ['error', 'warn']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db