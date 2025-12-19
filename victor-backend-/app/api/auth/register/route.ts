import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken, generateRefreshToken } from '@/lib/auth'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    const { firstName, lastName, email, phone, password, termsAccepted, marketingOptIn } = body

    // Validation
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Password validation
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Check password strength requirements
    const hasMinLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      const missing = []
      if (!hasMinLength) missing.push('at least 8 characters')
      if (!hasUpperCase) missing.push('one uppercase letter')
      if (!hasLowerCase) missing.push('one lowercase letter')
      if (!hasNumber) missing.push('one number')
      if (!hasSpecialChar) missing.push('one special character')
      
      return NextResponse.json(
        { error: `Password must contain: ${missing.join(', ')}` },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Either email or phone is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    if (termsAccepted !== true) {
      return NextResponse.json(
        { error: 'You must accept the terms and conditions' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Check if user already exists - wrapped in try/catch
    try {
      if (email) {
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email },
        })
        if (existingUserByEmail) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { 
              status: 409,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              }
            }
          )
        }
      }

      if (phone) {
        const existingUserByPhone = await prisma.user.findUnique({
          where: { phone },
        })
        if (existingUserByPhone) {
          return NextResponse.json(
            { error: 'User with this phone already exists' },
            { 
              status: 409,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              }
            }
          )
        }
      }
    } catch (dbCheckError: any) {
      console.error('Database check error:', dbCheckError)
      // Handle Prisma unique constraint errors during check
      if (dbCheckError.code === 'P2002') {
        const field = dbCheckError.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `User with this ${field} already exists` },
          { 
            status: 409,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        )
      }
      // Re-throw to be caught by outer catch
      throw dbCheckError
    }

    // Hash password - wrapped in try/catch
    let passwordHash
    try {
      passwordHash = await hashPassword(password)
    } catch (hashError) {
      console.error('Password hashing error:', hashError)
      return NextResponse.json(
        { error: 'Failed to process password. Please try again.' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Create user - wrapped in try/catch
    let newUser
    try {
      newUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          passwordHash,
          termsAccepted: termsAccepted || false,
          marketingOptIn: marketingOptIn || false,
        },
      })
    } catch (createError: any) {
      console.error('User creation error:', createError)
      
      // Handle Prisma unique constraint errors
      if (createError.code === 'P2002') {
        const field = createError.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `User with this ${field} already exists` },
          { 
            status: 409,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      // Handle Prisma table missing error (P2021)
      if (createError.code === 'P2021') {
        console.error('Database table missing error:', createError)
        return NextResponse.json(
          { error: 'Database not initialized. Please run migrations first.' },
          { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      // Handle Prisma connection errors (P1001, P1017)
      if (createError.code === 'P1001' || createError.code === 'P1017') {
        console.error('Database connection error:', createError)
        return NextResponse.json(
          { error: 'Database connection failed. Please check DATABASE_URL.' },
          { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      // Handle other Prisma errors
      if (createError.code?.startsWith('P')) {
        console.error('Prisma error details:', {
          code: createError.code,
          meta: createError.meta,
          message: createError.message,
        })
        return NextResponse.json(
          { error: 'Database error. Please try again.' },
          { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      // Re-throw to be caught by outer catch
      throw createError
    }

    // Generate tokens - wrapped in try/catch
    let token, refreshToken
    try {
      token = generateToken(newUser.id)
      refreshToken = generateRefreshToken(newUser.id)
    } catch (tokenError: any) {
      console.error('Token generation error:', tokenError)
      
      // Check if error is due to missing JWT_SECRET
      if (tokenError.message?.includes('JWT_SECRET')) {
        return NextResponse.json(
          { error: 'Server configuration error: JWT_SECRET is not set. Please contact support.' },
          { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          }
        )
      }
      
      // User was created but tokens failed - this is a critical error
      // We should still return an error but log it
      return NextResponse.json(
        { error: 'User created but failed to generate authentication tokens. Please contact support.' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Save refresh token to database - wrapped in try/catch
    try {
      await prisma.user.update({
        where: { id: newUser.id },
        data: { refreshToken },
      })
    } catch (updateError: any) {
      console.error('Refresh token update error:', updateError)
      // User was created and tokens generated, but refresh token save failed
      // This is not critical - user can still login, but refresh won't work
      // Log it but continue with response
      console.warn('Warning: User created but refresh token could not be saved to database')
    }

    // Get user data for response (without password and sensitive fields)
    const user = {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      profilePicture: (newUser as any).profilePicture || null,
      isAdmin: newUser.isAdmin,
      marketingOptIn: newUser.marketingOptIn,
      walletBalance: newUser.walletBalance,
      createdAt: newUser.createdAt,
    }

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user,
        token,
        refreshToken,
      },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    )
    
    return response
  } catch (error: any) {
    // Comprehensive error logging
    console.error('Registration error (outer catch):', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    
    // Handle Prisma initialization errors (table missing, connection issues)
    if (error.code === 'P2021') {
      return NextResponse.json(
        { 
          error: 'Database not initialized. Please run migrations first.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: 'Run: pnpm prisma migrate dev'
          })
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }
    
    if (error.code === 'P1001' || error.code === 'P1017') {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check DATABASE_URL configuration.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: error.message
          })
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }
    
    // Ensure we always return JSON, never HTML
    const errorResponse = NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.stack,
          code: error.code 
        })
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    )
    
    return errorResponse
  }
}
