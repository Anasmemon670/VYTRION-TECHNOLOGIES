# Deployment Guide

## Pre-Deployment Checklist

### 1. Database Migrations
Before deploying, ensure all migrations are applied:
```bash
npm run db:deploy
```

### 2. Prisma Client Generation
Prisma Client is automatically generated:
- During `npm install` (via `postinstall` script)
- During `npm run build` (before build)
- During `npm run dev` (before dev server)

### 3. Environment Variables
Ensure all required environment variables are set:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `REFRESH_TOKEN_SECRET` - Secret for refresh tokens
- Other required env vars

## Build Process

The build script automatically:
1. Generates Prisma Client (`prisma generate`)
2. Applies pending migrations (`prisma migrate deploy`)
3. Builds Next.js application (`next build`)

```bash
npm run build
```

## Production Deployment

### Vercel/Netlify
These platforms automatically run `npm install` which triggers `postinstall` script to generate Prisma Client.

### Manual Deployment
1. Install dependencies: `npm install` (generates Prisma Client)
2. Run migrations: `npm run db:deploy`
3. Build: `npm run build`
4. Start: `npm start`

## Troubleshooting

### Prisma Client Not Generated
If you see errors about missing Prisma fields:
```bash
npm run db:generate
```

### Migration Issues
If migrations fail:
```bash
npm run db:deploy
```

### Build Fails
Ensure Prisma Client is generated:
```bash
npm run db:generate
npm run build
```

