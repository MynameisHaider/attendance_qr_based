import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRToken, generateQRPayload } from '@/lib/qrcode'

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
	const token = await generateQRToken({
	...payload,
		expiryDate: '365d' // Jose library '365d' ko samajh legi
})

    return NextResponse.json({
      token,
      student: {
        admissionNumber: student.admission_number,
        fullName: student.full_name,
        class: student.class,
        section: student.section,
      },
    })
  } catch (error) {
    console.error('QR token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR token' },
      { status: 500 }
    )
  }
}
