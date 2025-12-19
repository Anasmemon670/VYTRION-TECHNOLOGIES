# Prisma Database Setup Guide

## Quick Start

Follow these steps in order to set up your database:

### 1. Generate Prisma Client
```bash
pnpm prisma generate
```

### 2. Create Initial Migration
```bash
pnpm prisma migrate dev --name init
```

This will:
- Create the initial migration based on your schema.prisma
- Apply the migration to your Neon database
- Generate the Prisma Client

### 3. Seed the Database (Optional)
```bash
pnpm db:seed
```

The seed script now includes safety checks and will not run if tables don't exist.

## Available Scripts

- `pnpm db:migrate` - Create and apply new migrations
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:seed` - Run seed script
- `pnpm db:reset` - Reset database (WARNING: Deletes all data)
- `pnpm db:deploy` - Deploy migrations to production

## Troubleshooting

### Error: "Table does not exist"
**Solution**: Run `pnpm prisma migrate dev` to create tables

### Error: "Can't reach database server"
**Solution**: 
1. Check your `.env` file has correct `DATABASE_URL`
2. Verify Neon database is running
3. Ensure SSL mode is set: `?sslmode=require`

### Error: "Migration drift detected"
**Solution**: 
```bash
pnpm prisma migrate reset  # WARNING: Deletes all data
pnpm prisma migrate dev
```

### Seed fails with "tables don't exist"
**Solution**: The seed script now checks for tables automatically. If you see this error, run migrations first:
```bash
pnpm prisma migrate dev
```

## Production Deployment

For production, use:
```bash
pnpm prisma migrate deploy
```

This applies pending migrations without creating new ones.
