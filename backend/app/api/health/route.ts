import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'e-commerce-backend',
      version: '1.0.0',
    }

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      health.database = 'connected'
    } catch (error) {
      health.database = 'disconnected'
      health.status = 'unhealthy'
    }

    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
    ]

    const optionalEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ]

    health.environment = {
      required: {},
      optional: {},
    }

    let missingRequired = false
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      health.environment.required[envVar] = value ? 'set' : 'missing'
      if (!value) missingRequired = true
    }

    for (const envVar of optionalEnvVars) {
      const value = process.env[envVar]
      health.environment.optional[envVar] = value ? 'set' : 'missing'
    }

    if (missingRequired) {
      health.status = 'unhealthy'
    }

    const statusCode = health.status === 'healthy' ? 200 : 503

    const response = NextResponse.json(health, { status: statusCode })
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (error: any) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    )
  }
}
