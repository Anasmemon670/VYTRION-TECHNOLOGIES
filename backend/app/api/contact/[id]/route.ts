import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const updateContactMessageSchema = z.object({
  isRead: z.boolean().optional(),
  archived: z.boolean().optional(),
})

const replyContactMessageSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/contact/[id] - Get contact message by ID (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const messageId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const message = await prisma.contactMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(
      { message },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get contact message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/contact/[id] - Update contact message (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const messageId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    const data = updateContactMessageSchema.parse(body)

    const message = await prisma.contactMessage.update({
      where: { id: messageId },
      data: {
        ...(data.isRead !== undefined && { isRead: data.isRead }),
        ...(data.archived !== undefined && { archived: data.archived }),
      },
    })

    const response = NextResponse.json(
      {
        message: 'Contact message updated successfully',
        contactMessage: message,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      )
    }

    console.error('Update contact message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


// DELETE /api/contact/[id] - Delete contact message (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const messageId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    await prisma.contactMessage.delete({
      where: { id: messageId },
    })

    const response = NextResponse.json(
      { message: 'Contact message deleted successfully' },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      )
    }

    console.error('Delete contact message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
