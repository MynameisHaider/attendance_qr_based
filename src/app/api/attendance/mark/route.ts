import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { admissionNumber, sessionId } = await request.json()

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Student find karein
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('admission_number', admissionNumber.trim())
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Session find karein
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    // --- LOGIC STARTS HERE ---
    const now = new Date()
    
    // Session timings ko Date objects mein convert karein (Timezone safe way)
    const [sH, sM] = session.start_time.split(':').map(Number)
    const [eH, eM] = session.end_time.split(':').map(Number)
    
    const sessionStart = new Date(session.date)
    sessionStart.setHours(sH, sM, 0, 0)
    
    const sessionEnd = new Date(session.date)
    sessionEnd.setHours(eH, eM, 0, 0)

    // 1. Check correct date
    if (sessionStart.toDateString() !== now.toDateString()) {
      return NextResponse.json({ error: 'This session is not for today' }, { status: 400 })
    }

    // 2. Start Time Check (with 5 min buffer)
    const buffer = 5 * 60 * 1000 
    if (now.getTime() < (sessionStart.getTime() - buffer)) {
      return NextResponse.json({ 
        error: 'Session has not started yet',
        details: `Starts at ${session.start_time}`
      }, { status: 400 })
    }

    // 3. Auto-Expiry Check (End Time)
    if (now.getTime() > sessionEnd.getTime()) {
      return NextResponse.json({ error: 'Session has ended automatically' }, { status: 400 })
    }

    // 4. Scope & Eligibility Check
    if (session.scope === 'specific') {
      if (student.class !== session.class || student.section !== session.section) {
        return NextResponse.json({ error: 'This session is not for this student' }, { status: 400 })
      }
    }

    // 5. Duplicate Check
    const { data: existingLog } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', student.admission_number)
      .eq('session_id', session.id)
      .single()

    if (existingLog) {
      return NextResponse.json({ error: 'Attendance already marked' }, { status: 400 })
    }

    // 6. Determine Status (Late after 10 mins)
    let status: 'present' | 'late' = 'present'
    if (now.getTime() > (sessionStart.getTime() + 10 * 60 * 1000)) {
      status = 'late'
    }

    // 7. Mark Attendance
    const { error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        student_id: student.admission_number,
        session_id: session.id,
        date: session.date,
        status: status,
        scan_time: now.toISOString(),
        marked_by: user.id,
      })

    if (attendanceError) {
      throw attendanceError
    }

    // Update session to active if it was scheduled
    if (session.status === 'scheduled') {
      await supabase
        .from('attendance_sessions')
        .update({ status: 'active' })
        .eq('id', session.id)
    }

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${status.toUpperCase()}`,
      student,
      status
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 })
  }
}