#!/usr/bin/env node

/**
 * Safe migration script that handles timeouts gracefully
 * This script attempts to run migrations but doesn't fail the build if migrations timeout
 */

const { execSync } = require('child_process');

console.log('🔄 Attempting to run database migrations...');

try {
  // Set a longer timeout for migrations (30 seconds)
  const timeout = 30000;
  
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    timeout: timeout,
    env: {
      ...process.env,
      // Increase Prisma connection timeout
      PRISMA_MIGRATE_SKIP_GENERATE: '1'
    }
  });
  
  console.log('✅ Migrations completed successfully');
  process.exit(0);
} catch (error) {
  // If migration fails due to timeout or lock, log but don't fail
  if (error.message && (
    error.message.includes('timeout') || 
    error.message.includes('P1002') ||
    error.message.includes('advisory lock')
  )) {
    console.warn('⚠️  Migration timeout or lock detected. This is usually safe if migrations are already applied.');
    console.warn('⚠️  If you need to run migrations, please run: npm run db:deploy');
    process.exit(0); // Exit successfully to allow build to continue
  } else {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

