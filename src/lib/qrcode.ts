import { SignJWT, jwtVerify } from 'jose'
import type { QRCodePayload } from '@/types/database'

const secret = new TextEncoder().encode(
  process.env.QR_CODE_SECRET || 'dev_secret_key_change_in_production'
)

export async function generateQRToken(payload: QRCodePayload): Promise<string> {
  const token = await new SignJWT({
    admissionNumber: payload.admissionNumber,
    issueDate: payload.issueDate,
    expiryDate: payload.expiryDate,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(new Date(payload.issueDate).getTime() / 1000)
    .setExpirationTime(payload.expiryDate)
    .sign(secret)

  return token
}

export async function verifyQRToken(token: string): Promise<QRCodePayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    return {
      admissionNumber: payload.admissionNumber as string,
      issueDate: new Date((payload.iat || 0) * 1000).toISOString(),
      expiryDate: payload.exp ? new Date(payload.exp * 1000).toISOString() : '',
    }
  } catch (error) {
    console.error('QR token verification failed:', error)
    return null
  }
}

export function generateQRPayload(admissionNumber: string, validityDays = 365): QRCodePayload {
  const now = new Date()
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + validityDays)

  return {
    admissionNumber,
    issueDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
  }
}
