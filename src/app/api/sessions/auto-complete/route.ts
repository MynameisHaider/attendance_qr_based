import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Auto-complete sessions that have ended
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current time in Asia/Karachi timezone
    const now = new Date()
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Karachi'
    })
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

    // Get active sessions for today
    const { data: activeSessions } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('date', today)
      .eq('status', 'active')

    if (!activeSessions) {
      return NextResponse.json({ message: 'No sessions to process' })
    }

    let completedCount = 0

    // Check each session and complete if end time has passed
    for (const session of activeSessions) {
      if (currentTime > session.end_time) {
        // Get already scanned students
        const { data: existingLogs } = await supabase
          .from('attendance_logs')
          .select('student_id')
          .eq('session_id', session.id)

        const scannedStudentIds = new Set(existingLogs?.map(l => l.student_id) || [])

        // Get all students
        const { data: allStudents } = await supabase
          .from('students')
          .select('admission_number')

        if (allStudents) {
          // Only insert absent for students who weren't scanned
          const absentStudents = allStudents.filter(s => !scannedStudentIds.has(s.admission_number))

          if (absentStudents.length > 0) {
            await supabase
              .from('attendance_logs')
              .insert(
                absentStudents.map(s => ({
                  student_id: s.admission_number,
                  session_id: session.id,
                  date: session.date,
                  status: 'absent',
                  scan_time: now.toISOString(),
                  marked_by: session.created_by,
                }))
              )
          }

          // Mark session as completed
          await supabase
            .from('attendance_sessions')
            .update({ status: 'completed' })
            .eq('id', session.id)

          completedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${activeSessions.length} sessions, completed ${completedCount}`
    })
  } catch (error) {
    console.error('Auto-complete sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to process sessions' },
      { status: 500 }
    )
  }
}
