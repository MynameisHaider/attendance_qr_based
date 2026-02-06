import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyQRToken } from '@/lib/qrcode'

export async function POST(request: NextRequest) {
  try {
    const { qrToken, sessionId } = await request.json()

    if (!qrToken) {
      return NextResponse.json(
        { error: 'QR token is required' },
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

    // Verify QR token
    const payload = await verifyQRToken(qrToken)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired QR code' },
        { status: 400 }
      )
    }

    // Get session information
    let session = null
    if (sessionId) {
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        return NextResponse.json(
          { error: 'Invalid session ID' },
          { status: 400 }
        )
      }

      session = sessionData
    }

    // Get student information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('admission_number', payload.admissionNumber)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // If session is provided, verify it's active and check time window
    if (session) {
      const now = new Date()
      const sessionDate = new Date(session.date)
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
      const startTime = session.start_time.slice(0, 5)
      const endTime = session.end_time.slice(0, 5)

      // Check if session is active and on correct date
      const isToday = sessionDate.toDateString() === now.toDateString()

      if (!isToday) {
        return NextResponse.json(
          { error: 'This session is not scheduled for today' },
          { status: 400 }
        )
      }

      if (session.status !== 'active') {
        return NextResponse.json(
          { error: 'Session is not active' },
          { status: 400 }
        )
      }

      if (currentTime < startTime) {
        return NextResponse.json(
          { error: 'Session has not started yet' },
          { status: 400 }
        )
      }

      if (currentTime > endTime) {
        return NextResponse.json(
          { error: 'Session has ended' },
          { status: 400 }
        )
      }

      // Check if attendance is already marked
      const { data: existingLog } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_id', student.admission_number)
        .eq('session_id', session.id)
        .single()

      if (existingLog) {
        return NextResponse.json(
          { error: 'Attendance already marked for this session' },
          { status: 400 }
        )
      }

      // Determine status based on scan time
      let status: 'present' | 'late' = 'present'
      if (currentTime > startTime && currentTime <= endTime) {
        // If more than 10 minutes late, mark as late
        const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
        const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1])
        if (currentMinutes - startMinutes > 10) {
          status = 'late'
        }
      }

      // Mark attendance
      const { data: attendanceLog, error: attendanceError } = await supabase
        .from('attendance_logs')
        .insert({
          student_id: student.admission_number,
          session_id: session.id,
          date: session.date,
          status: status,
          scan_time: now.toISOString(),
          marked_by: user.id,
        })
        .select()
        .single()

      if (attendanceError) {
        console.error('Attendance marking error:', attendanceError)
        return NextResponse.json(
          { error: 'Failed to mark attendance' },
          { status: 500 }
        )
      }

      // Update session status if this was the first scan
      await supabase
        .from('attendance_sessions')
        .update({ status: 'active' })
        .eq('id', session.id)
        .eq('status', 'scheduled')

      return NextResponse.json({
        success: true,
        message: `Attendance marked as ${status.toUpperCase()}`,
        student: {
          admission_number: student.admission_number,
          full_name: student.full_name,
          class: student.class,
          section: student.section,
        },
        status: status,
      })
    } else {
      // General scan without specific session
      const today = new Date().toISOString().split('T')[0]

      // Find active session for student's class
      const { data: activeSession } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class', student.class)
        .eq('section', student.section)
        .eq('date', today)
        .eq('status', 'active')
        .single()

      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active attendance session for this class' },
          { status: 400 }
        )
      }

      // Check time window
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)
      const startTime = activeSession.start_time.slice(0, 5)
      const endTime = activeSession.end_time.slice(0, 5)

      if (currentTime > endTime) {
        return NextResponse.json(
          { error: 'Session has ended' },
          { status: 400 }
        )
      }

      // Check if attendance is already marked
      const { data: existingLog } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_id', student.admission_number)
        .eq('session_id', activeSession.id)
        .single()

      if (existingLog) {
        return NextResponse.json(
          { error: 'Attendance already marked' },
          { status: 400 }
        )
      }

      // Determine status
      let status: 'present' | 'late' = 'present'
      if (currentTime > startTime && currentTime <= endTime) {
        const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
        const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1])
        if (currentMinutes - startMinutes > 10) {
          status = 'late'
        }
      }

      // Mark attendance
      const { error: attendanceError } = await supabase
        .from('attendance_logs')
        .insert({
          student_id: student.admission_number,
          session_id: activeSession.id,
          date: activeSession.date,
          status: status,
          scan_time: now.toISOString(),
          marked_by: user.id,
        })

      if (attendanceError) {
        console.error('Attendance marking error:', attendanceError)
        return NextResponse.json(
          { error: 'Failed to mark attendance' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Attendance marked as ${status.toUpperCase()}`,
        student: {
          admission_number: student.admission_number,
          full_name: student.full_name,
          class: student.class,
          section: student.section,
        },
        status: status,
      })
    }
  } catch (error) {
    console.error('Attendance marking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
