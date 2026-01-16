import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// DELETE /api/categories/[id] - Delete category (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const categoryId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!category) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      ))
    }

    // Check if category is used by any products
    if (category.products.length > 0) {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Cannot delete category. It is being used by one or more products. Please remove the category from all products first.',
          productCount: category.products.length
        },
        { status: 400 }
      ))
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId },
    })

    const response = NextResponse.json(
      {
        message: 'Category deleted successfully',
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Delete category error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Handle foreign key constraint error
    if (error.code === 'P2003') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Cannot delete category. It is associated with existing products.' },
        { status: 400 }
      ))
    }
    
    // Handle record not found
    if (error.code === 'P2025') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      ))
    }
    
    // Return detailed error in development, generic in production
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while deleting the category',
        ...(process.env.NODE_ENV === 'development' && { 
          code: error.code,
          stack: error.stack 
        })
      },
      { status: 500 }
    ))
  }
}

