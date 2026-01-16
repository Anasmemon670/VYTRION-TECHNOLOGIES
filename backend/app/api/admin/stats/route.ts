import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {}
      if (startDate) dateFilter.createdAt.gte = new Date(startDate)
      if (endDate) dateFilter.createdAt.lte = new Date(endDate)
    }

    // Get all stats in parallel
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
      recentOrders,
      lowStockProducts,
      pendingReturns,
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: dateFilter,
      }),

      // Total orders
      prisma.order.count({
        where: dateFilter,
      }),

      // Total products
      prisma.product.count(),

      // Total revenue (sum of all processed/delivered orders)
      prisma.order.aggregate({
        where: {
          ...dateFilter,
          status: {
            in: ['PROCESSED', 'SHIPPED', 'DELIVERED'],
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // Recent orders (last 10)
      prisma.order.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Low stock products (stock < 10)
      prisma.product.findMany({
        where: {
          stock: {
            lt: 10,
          },
        },
        take: 10,
        orderBy: {
          stock: 'asc',
        },
        select: {
          id: true,
          title: true,
          stock: true,
        },
      }),

      // Pending returns
      prisma.returnRequest.count({
        where: {
          status: 'PENDING',
        },
      }),
    ])

    // Get order status breakdown
    const orderStatusBreakdown = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where: dateFilter,
    })

    // Extract individual order status counts
    const statusCounts = orderStatusBreakdown.reduce((acc: any, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {})

    // Get revenue by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyRevenue = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
        status: {
          in: ['PROCESSED', 'SHIPPED', 'DELIVERED'],
        },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    })

    // Group by month
    const revenueByMonth = monthlyRevenue.reduce((acc: any, order: { totalAmount: number; createdAt: Date }) => {
      const month = new Date(order.createdAt).toISOString().slice(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = 0
      }
      acc[month] += Number(order.totalAmount)
      return acc
    }, {})

    const response = NextResponse.json(
      {
        stats: {
          totalUsers,
          totalOrders,
          totalProducts,
          totalRevenue: totalRevenue._sum.totalAmount?.toString() || '0',
          pendingReturns,
          processedOrders: statusCounts['PROCESSED'] || 0,
          shippedOrders: statusCounts['SHIPPED'] || 0,
          deliveredOrders: statusCounts['DELIVERED'] || 0,
          cancelledOrders: statusCounts['CANCELLED'] || 0,
          orderStatusBreakdown: orderStatusBreakdown.map((item) => ({
            status: item.status,
            count: item._count.id,
          })),
          recentOrders: recentOrders.map((order) => ({
            ...order,
            totalAmount: order.totalAmount.toString(),
          })),
          lowStockProducts,
          revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({
            month,
            revenue: (revenue as number).toString(),
          })),
        },
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get admin stats error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching stats'
      },
      { status: 500 }
    ))
  }
}
