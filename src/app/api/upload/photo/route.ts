import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const admissionNumber = formData.get('admissionNumber') as string

    if (!file || !admissionNumber) {
      return NextResponse.json(
        { error: 'File and admission number are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get student to determine class
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('class, section')
      .eq('admission_number', admissionNumber)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Generate file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${admissionNumber}.${fileExt}`
    const filePath = `class-${student.class}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload photo' },
        { status: 500 }
      )
    }

    // Update student record with photo URL
    const { error: updateError } = await supabase
      .from('students')
      .update({ photo_url: filePath })
      .eq('admission_number', admissionNumber)

    if (updateError) {
      console.error('Update error:', updateError)
      // Rollback: delete the uploaded file
      await supabase.storage
        .from('student-photos')
        .remove([filePath])
      return NextResponse.json(
        { error: 'Failed to update student record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      path: filePath,
      message: 'Photo uploaded successfully',
    })
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get signed URL for photos
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

    // Get student to get photo path
    const { data: student } = await supabase
      .from('students')
      .select('photo_url')
      .eq('admission_number', admissionNumber)
      .single()

    if (!student?.photo_url) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Generate signed URL (valid for 5 minutes)
    const { data: signedUrlData, error } = await supabase.storage
      .from('student-photos')
      .createSignedUrl(student.photo_url, {
        expiresIn: 300, // 5 minutes
      })

    if (error || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.redirect(signedUrlData.signedUrl)
  } catch (error) {
    console.error('Signed URL generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
