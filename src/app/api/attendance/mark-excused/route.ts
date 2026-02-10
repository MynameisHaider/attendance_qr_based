import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { logId, reason } = await request.json()

    if (!logId) {
      return NextResponse.json(
        { error: 'Attendance log ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('=== MARK EXCUSED START ===')
    console.log('Log ID:', logId)
    console.log('Reason:', reason)

    // Get attendance log - try multiple ways to find it
    let logData = null
    let logError = null

    // Method 1: Direct select by ID
    const { data: data1, error: error1 } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (!error1 && data1) {
      logData = data1
      logError = error1
      console.log('Method 1 (direct ID query): Found')
    }

    // Method 2: If not found, try querying by student_id and date
    if (!logData) {
      console.log('Method 1 failed, trying Method 2...')
      const { data: logsList } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_id', data1?.student_id || 'unknown')

      if (logsList && logsList.length > 0) {
        logData = logsList[logsList.length - 1] // Get most recent
        logError = null
        console.log('Method 2 (student_id query): Found most recent log')
      }
    }

    if (!logData) {
      console.error('ERROR: Attendance log not found')
      console.error('  Tried Method 1:', error1)
      console.error('  Tried Method 2: Student ID from first attempt:', data1?.student_id || 'unknown')

      return NextResponse.json(
        { error: 'Attendance log not found. Please refresh the page and try again.' },
        { status: 404 }
      )
    }

    // Update status to excused
    const { error: updateError } = await supabase
      .from('attendance_logs')
      .update({
        status: 'excused',
        reason: reason || null
      })
      .eq('id', logData.id)

    if (updateError) {
      console.error('ERROR updating attendance log:', updateError)
      console.error('  Error details:', JSON.stringify(updateError, null, 2))
      throw updateError
    }

    console.log('Successfully marked as excused')

    // Return student info with the log data
    return NextResponse.json({
      success: true,
      message: 'Attendance marked as excused',
      student: {
        admission_number: logData.student_id,
      full_name: logData.student_name || 'N/A',
        class: logData.class || 'N/A',
        section: logData.section || 'N/A',
      },
      updatedStatus: 'excused',
      reason: reason || null
    })
  } catch (error) {
    console.error('=== MARK EXCUSED ERROR ===')
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to mark as excused', details: String(error) },
      { status: 500 }
    )
  }
}
