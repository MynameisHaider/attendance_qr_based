import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { studentId, sessionId, status, reason } = await request.json()

    if (!studentId || !sessionId || !status) {
      return NextResponse.json(
        { error: 'Student ID, session ID, and status are required' },
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

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('date')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if attendance exists
    const { data: existingLog, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .single()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
    }

    const now = new Date().toISOString()

    if (existingLog) {
      // Update existing attendance
      const previousStatus = existingLog.status

      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          status: status,
          marked_by: user.id,
          scan_time: now,
        })
        .eq('id', existingLog.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update attendance' },
          { status: 500 }
        )
      }

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'manual_override',
          student_id: studentId,
          session_id: sessionId,
          previous_status: previousStatus,
          new_status: status,
          performed_by: user.id,
          reason: reason || 'Manual attendance override',
        })

      if (auditError) {
        console.error('Audit log error:', auditError)
      }
    } else {
      // Create new attendance
      const { error: insertError } = await supabase
        .from('attendance_logs')
        .insert({
          student_id: studentId,
          session_id: sessionId,
          date: session.date,
          status: status,
          scan_time: now,
          marked_by: user.id,
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to mark attendance' },
          { status: 500 }
        )
      }

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'manual_attendance',
          student_id: studentId,
          session_id: sessionId,
          new_status: status,
          performed_by: user.id,
          reason: reason || 'Manual attendance mark',
        })

      if (auditError) {
        console.error('Audit log error:', auditError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
    })
  } catch (error) {
    console.error('Attendance override error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
