import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRToken, generateQRPayload } from '@/lib/qrcode'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const admissionNumber = searchParams.get('admissionNumber')

    if (!admissionNumber) {
      return NextResponse.json(
        { error: 'Admission number is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get student information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('admission_number', admissionNumber)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Generate QR token (valid for 1 year)
    const payload = generateQRPayload(admissionNumber, 365)
    const token = await generateQRToken(payload)

    // Generate QR code as SVG
    const qrCodeSvg = await QRCode.toString(token, {
      type: 'svg',
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    // Return SVG image
    return new NextResponse(qrCodeSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    })
  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}
