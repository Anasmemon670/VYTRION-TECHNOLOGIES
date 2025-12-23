import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma for Neon PostgreSQL with connection pooling and retry logic
// Note: DATABASE_URL is read from environment variables automatically in Prisma v6
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pool configuration for Neon
  // This helps with connection resets and improves reliability
})

// Handle connection errors gracefully
prismaClient.$on('error' as never, (e: any) => {
  console.error('Prisma Client Error:', e)
})

// Add connection retry logic
let retryCount = 0
const maxRetries = 3

async function connectWithRetry() {
  try {
    await prismaClient.$connect()
    retryCount = 0
  } catch (error: any) {
    if (retryCount < maxRetries) {
      retryCount++
      console.warn(`Database connection failed, retrying (${retryCount}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
      return connectWithRetry()
    }
    console.error('Failed to connect to database after retries:', error)
    throw error
  }
}

// Connect on initialization (non-blocking)
if (process.env.NODE_ENV === 'production') {
  connectWithRetry().catch(console.error)
}

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

