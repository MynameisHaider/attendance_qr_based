import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Auto-complete sessions that have ended
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current time in Asia/Karachi timezone
    const now = new Date()
    const currentTimeInKarachi = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Karachi'
    })

    // Get date in Asia/Karachi timezone (YYYY-MM-DD format to match session.date)
    const dateInKarachi = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

    console.log('=== AUTO-COMPLETE START ===')
    console.log('Current time (Karachi):', currentTimeInKarachi)
    console.log('Date (Karachi):', dateInKarachi)

    // Get active sessions for today
    const { data: activeSessions } = await supabase
      .from('attendance_sessions')
      .select('id, date, start_time, end_time, created_by, status')
      .eq('date', dateInKarachi)
      .eq('status', 'active')

    if (!activeSessions || activeSessions.length === 0) {
      console.log('No active sessions found')
      return NextResponse.json({ message: 'No active sessions' })
    }

    console.log(`Found ${activeSessions.length} active sessions for ${dateInKarachi}`)

    let completedCount = 0
    let totalAbsentMarked = 0

    // Check each session and complete if end time has passed
    for (const session of activeSessions) {
      console.log(`\nChecking session ${session.id}:`)
      console.log('  End time:', session.end_time)
      console.log('  Current time:', currentTimeInKarachi)
      console.log('  Should complete:', currentTimeInKarachi > session.end_time)

      // Check if end time has passed
      if (currentTimeInKarachi > session.end_time) {
        console.log(`  Session ${session.id} has ended. Marking absent students...`)

        // Get already scanned students for this session
        const { data: existingLogs } = await supabase
          .from('attendance_logs')
          .select('student_id')
          .eq('session_id', session.id)

        const scannedStudentIds = new Set(existingLogs?.map(l => l.student_id) || [])
        console.log(`  Already scanned students: ${scannedStudentIds.size}`)

        // Get all students from database
        const { data: allStudentsData } = await supabase
          .from('students')
          .select('admission_number, full_name, class, section')

        if (!allStudentsData || allStudentsData.length === 0) {
          console.error('ERROR: No students found in database')
          continue
        }

        console.log(`  Total students in DB: ${allStudentsData.length}`)

        // Find students who weren't scanned
        const absentStudents = allStudentsData.filter(s => !scannedStudentIds.has(s.admission_number))

        console.log(`  Absent students: ${absentStudents.length}`)

        // Only insert absent for students who weren't scanned
        if (absentStudents.length > 0) {
          const attendanceData = absentStudents.map(s => ({
            student_id: s.admission_number,
            session_id: session.id,
            date: dateInKarachi, // Use consistent date format
            status: 'absent',
            scan_time: now.toISOString(), // Use ISO format for storage
            marked_by: session.created_by || '',
          }))

          console.log(`  Inserting ${attendanceData.length} absent records...`)

          const { error: insertError } = await supabase
            .from('attendance_logs')
            .insert(attendanceData)

          if (insertError) {
            console.error('ERROR inserting absent records:', insertError)
            console.error('  Error details:', JSON.stringify(insertError, null, 2))
          } else {
            totalAbsentMarked += attendanceData.length
            console.log(`  SUCCESS: Inserted ${attendanceData.length} absent records`)
          }
        } else {
          console.log('  No absent students to mark (all already scanned)')
        }

        // Mark session as completed
        const { error: updateError } = await supabase
          .from('attendance_sessions')
          .update({ status: 'completed' })
          .eq('id', session.id)

        if (updateError) {
          console.error('ERROR updating session status:', updateError)
        } else {
          completedCount++
          console.log(`  SUCCESS: Session ${session.id} marked as completed`)
        }
      } else {
        console.log(`  Session ${session.id} still active (not ended yet)`)
      }
    }

    console.log('\n=== AUTO-COMPLETE END ===')
    console.log('Completed sessions:', completedCount)
    console.log('Total absent marked:', totalAbsentMarked)

    return NextResponse.json({
      success: true,
      message: `Processed ${activeSessions.length} sessions, completed ${completedCount}, marked ${totalAbsentMarked} absent students`,
      currentTime: currentTimeInKarachi,
      date: dateInKarachi,
      completedCount,
      totalAbsentMarked
    })
  } catch (error) {
    console.error('=== AUTO-COMPLETE ERROR ===')
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to process sessions', details: String(error) },
      { status: 500 }
    )
  }
}