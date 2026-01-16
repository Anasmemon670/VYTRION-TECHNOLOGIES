import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from './prisma'

/**
 * Gets JWT_SECRET from environment variables and validates it exists.
 * Throws error only when called (not at module initialization).
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables. Please set JWT_SECRET before starting the application.')
  }
  return secret
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  const JWT_SECRET = getJwtSecret()
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' })
}

export function generateRefreshToken(userId: string): string {
  const JWT_SECRET = getJwtSecret()
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const JWT_SECRET = getJwtSecret()
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const JWT_SECRET = getJwtSecret()
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type?: string }
    if (decoded.type === 'refresh') {
      return { userId: decoded.userId }
    }
    return null
  } catch (error) {
    return null
  }
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function getCurrentUser(token: string | null) {
  if (!token) return null
  
  const decoded = verifyToken(token)
  if (!decoded) return null
  
  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
  })
  
  if (!dbUser) return null
  
  // Return user data (without password and sensitive fields)
  const user = {
    id: dbUser.id,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    email: dbUser.email,
    phone: dbUser.phone,
    profilePicture: (dbUser as any).profilePicture || null,
    isAdmin: dbUser.isAdmin,
    marketingOptIn: dbUser.marketingOptIn,
    walletBalance: dbUser.walletBalance,
    createdAt: dbUser.createdAt,
  }
  
  return user
}

