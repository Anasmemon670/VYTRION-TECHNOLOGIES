import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Check if database tables exist by attempting to query the User table
 * This prevents seed from running before migrations are applied
 */
async function checkTablesExist(): Promise<boolean> {
  try {
    // Try to query the User table - if it doesn't exist, this will throw
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`
    return true
  } catch (error: any) {
    // P2021 = Table does not exist (Prisma error code)
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.error('❌ Database tables do not exist. Please run migrations first:')
      console.error('   pnpm prisma migrate dev')
      return false
    }
    // Re-throw other errors (connection issues, etc.)
    throw error
  }
}

async function main() {
  console.log('🌱 Starting seed...')

  // Safety check: Ensure tables exist before seeding
  const tablesExist = await checkTablesExist()
  if (!tablesExist) {
    process.exit(1)
  }

  // Hash password for admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10)

  // Create Admin User (only user in database)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminPasswordHash,
      isAdmin: true,
    },
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      phone: '+1234567890',
      passwordHash: adminPasswordHash,
      isAdmin: true,
      termsAccepted: true,
      marketingOptIn: false,
    },
  })
  console.log('✅ Created/Updated admin user:', admin.email)

  // Remove all non-admin users (only if they don't have orders)
  // Skip deletion if there are foreign key constraints
  try {
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        isAdmin: false,
      },
    })
    console.log(`✅ Removed ${deletedUsers.count} non-admin users`)
  } catch (error: any) {
    if (error.code === 'P2003') {
      console.log('⚠️  Skipped deleting non-admin users (they have orders)')
    } else {
      throw error
    }
  }

  console.log('🎉 Seed completed successfully!')
  console.log('\n📝 Admin Credentials:')
  console.log('Email: admin@example.com')
  console.log('Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

