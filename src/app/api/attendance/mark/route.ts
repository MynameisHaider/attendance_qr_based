import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { admissionNumber, sessionId } = await request.json()

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('admission_number', admissionNumber)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // --- TIMEZONE ENFORCEMENT (Asia/Karachi) ---
    const now = new Date()
    const pkTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }))
    
    // Format helpers for comparison
    const todayStr = pkTime.toISOString().split('T')[0] // YYYY-MM-DD
    const currentTimeStr = pkTime.toTimeString().slice(0, 5) // HH:MM

    let session = null

    if (sessionId) {
      const { data: sessionData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      session = sessionData
    } else {
      // General scan: Find active session for today
      const { data: activeSession } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('date', todayStr)
        .eq('status', 'active')
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      session = activeSession
    }

    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // --- TIME & STATUS VALIDATION ---
    
    // 1. Check Date
    if (session.date !== todayStr) {
      return NextResponse.json({ 
        error: 'This session is not for today',
        details: `Today: ${todayStr}, Session: ${session.date}` 
      }, { status: 400 })
    }

    // 2. Auto-Complete Logic (If scanned after end_time)
    if (currentTimeStr > session.end_time) {
      await supabase
        .from('attendance_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id)

      return NextResponse.json({ error: 'Session has ended and is now closed' }, { status: 400 })
    }

    // 3. Start Time Check (with 5 min buffer for convenience)
    const [sH, sM] = session.start_time.split(':').map(Number)
    const sessionStart = new Date(pkTime)
    sessionStart.setHours(sH, sM, 0, 0)
    
    if (pkTime.getTime() < (sessionStart.getTime() - 5 * 60 * 1000)) {
      return NextResponse.json({ 
        error: 'Session has not started yet',
        details: `Starts at ${session.start_time}` 
      }, { status: 400 })
    }

    // 4. Double Marking Check
    const { data: existingLog } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', student.admission_number)
      .eq('session_id', session.id)
      .maybeSingle()

    if (existingLog) {
      return NextResponse.json({ error: 'Attendance already marked' }, { status: 400 })
    }

    // 5. Determine Status (Late after 10 mins)
    let attendanceStatus: 'present' | 'late' = 'present'
    if (pkTime.getTime() > (sessionStart.getTime() + 10 * 60 * 1000)) {
      attendanceStatus = 'late'
    }

    // --- MARK ATTENDANCE ---
    const { error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        student_id: student.admission_number,
        session_id: session.id,
        date: session.date,
        status: attendanceStatus,
        scan_time: pkTime.toISOString(),
        marked_by: user.id,
      })

    if (attendanceError) {
      return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 })
    }

    // 6. Set status to 'active' if it was 'scheduled'
    if (session.status === 'scheduled') {
      await supabase
        .from('attendance_sessions')
        .update({ status: 'active' })
        .eq('id', session.id)
    }

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${attendanceStatus.toUpperCase()}`,
      student: {
        admission_number: student.admission_number,
        full_name: student.full_name,
        class: student.class,
        section: student.section,
      },
      status: attendanceStatus,
    })

  } catch (error) {
    console.error('Attendance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}