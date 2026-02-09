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

    // Get the attendance log
    const { data: logData, error: logError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (logError || !logData) {
      return NextResponse.json(
        { error: 'Attendance log not found' },
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
      .eq('id', logId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance marked as excused'
    })
  } catch (error) {
    console.error('Mark excused error:', error)
    return NextResponse.json(
      { error: 'Failed to mark as excused' },
      { status: 500 }
    )
  }
}
