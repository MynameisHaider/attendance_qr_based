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

    // 1. Student find karein
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('admission_number', admissionNumber.trim())
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 2. Session find karein
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    // --- TIMEZONE FIX LOGIC ---
    
    // Server ke time ko Pakistan time (PKT) mein convert karein
    const now = new Date();
    const pkTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    
    // Session ki dates ko properly format karein taake comparison sahi ho
    const dateStr = session.date; 
    const sessionStart = new Date(`${dateStr}T${session.start_time}:00`);
    const sessionEnd = new Date(`${dateStr}T${session.end_time}:00`);

    // Aaj ki date (YYYY-MM-DD format) comparison ke liye
    const todayStr = pkTime.toISOString().split('T')[0];

    // 1. Date Check
    if (session.date !== todayStr) {
      return NextResponse.json({ 
        error: 'This session is not for today',
        details: `Today is ${todayStr}, Session is for ${session.date}`
      }, { status: 400 });
    }

    // 2. Auto-Expiry Check (Agar end time guzar gaya)
    if (pkTime.getTime() > sessionEnd.getTime()) {
      // Database mein status 'completed' update karein taake UI mein bhi change ho jaye
      await supabase
        .from('attendance_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      return NextResponse.json({ error: 'Session has ended automatically' }, { status: 400 });
    }

    // 3. Start Time Check (with 5 min buffer)
    const buffer = 5 * 60 * 1000;
    if (pkTime.getTime() < (sessionStart.getTime() - buffer)) {
      return NextResponse.json({ 
        error: 'Session has not started yet',
        details: `Starts at ${session.start_time}`
      }, { status: 400 });
    }

    // 4. Scope & Eligibility Check
    if (session.scope === 'specific') {
      if (student.class !== session.class || student.section !== session.section) {
        return NextResponse.json({ error: 'This session is not for this student' }, { status: 400 });
      }
    }

    // 5. Duplicate Check
    const { data: existingLog } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', student.admission_number)
      .eq('session_id', session.id)
      .single();

    if (existingLog) {
      return NextResponse.json({ error: 'Attendance already marked' }, { status: 400 });
    }

    // 6. Determine Status (Late after 10 mins)
    let status: 'present' | 'late' = 'present';
    if (pkTime.getTime() > (sessionStart.getTime() + 10 * 60 * 1000)) {
      status = 'late';
    }

    // 7. Mark Attendance
    const { error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        student_id: student.admission_number,
        session_id: session.id,
        date: session.date,
        status: status,
        scan_time: pkTime.toISOString(),
        marked_by: user.id,
      });

    if (attendanceError) {
      throw attendanceError;
    }

    // Update session to active if it was scheduled
    if (session.status === 'scheduled') {
      await supabase
        .from('attendance_sessions')
        .update({ status: 'active' })
        .eq('id', session.id);
    }

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${status.toUpperCase()}`,
      student,
      status
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}