'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar, Users, Edit, Trash2, UserCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AttendanceSession {
  id: string
  date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed'
  created_at: string
}

interface AttendanceLog {
  id: string
  student_id: string
  session_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  scan_time: string
  marked_by: string
}

interface Student {
  admission_number: string
  full_name: string
  class: string
  section: string
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [studentMap, setStudentMap] = useState<{ [key: string]: Student }>({})
  const [autoCompleted, setAutoCompleted] = useState(false)
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false)
  const [excusedInput, setExcusedInput] = useState<{ [key: string]: string }>({})
  const [markingLoading, setMarkingLoading] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (params.id) {
      fetchSessionDetails(params.id as string)
    }
  }, [params.id])

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      // Get session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        router.push('/admin/sessions')
        return
      }

      setSession(sessionData)

      // Check if session should be auto-completed (Asia/Karachi timezone)
      const now = new Date()
      const currentTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi'
      })
      const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
      const sessionDate = new Date(sessionData.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

      // If session is active and time has passed, auto-complete it
      if (sessionData.status === 'active' && currentTime > sessionData.end_time) {
        setAutoCompleteLoading(true)
        await autoCompleteSession(sessionId)
        setAutoCompleteLoading(false)
        setAutoCompleted(true)
        // Reload session data
        const { data: updatedSession } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
        if (updatedSession) {
          setSession(updatedSession)
        }
      }

      // Get all students from database
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true })

      if (studentsData) {
        setAllStudents(studentsData)
        // Build student map for quick lookup
        const map: { [key: string]: Student } = {}
        studentsData.forEach(s => {
          map[s.admission_number] = s
        })
        setStudentMap(map)
      }

      // Get attendance logs for this session (directly from attendance_logs, not view)
      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select(`
          id,
          student_id,
          date,
          session_id,
          status,
          scan_time,
          marked_by
        `)
        .eq('session_id', sessionId)

      if (logsData) {
        setAttendanceLogs(logsData)
      }
    } catch (error) {
      console.error('Error fetching session details:', error)
    } finally {
      setLoading(false)
    }
  }

  const autoCompleteSession = async (sessionId: string) => {
    try {
      setAutoCompleteLoading(true)

      // Get current time in Asia/Karachi timezone
      const now = new Date()
      const currentTimeInKarachi = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi'
      })

      // Get date in Asia/Karachi timezone (same format as session.date)
      const dateInKarachi = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

      console.log('Auto-completing session:', sessionId)
      console.log('Current time (Karachi):', currentTimeInKarachi)
      console.log('Date (Karachi):', dateInKarachi)

      // Get already scanned students for this session
      const { data: existingLogs } = await supabase
        .from('attendance_logs')
        .select('student_id')
        .eq('session_id', sessionId)

      const scannedStudentIds = new Set(existingLogs?.map(l => l.student_id) || [])

      // Get all students
      const { data: allStudentsData } = await supabase
        .from('students')
        .select('*')

      if (allStudentsData) {
        // Only insert absent for students who weren't scanned
        const absentStudents = allStudentsData.filter(s => !scannedStudentIds.has(s.admission_number))

        console.log(`Session ${sessionId}: Total ${allStudentsData.length}, Scanned ${scannedStudentIds.size}, Absent ${absentStudents.length}`)

        if (absentStudents.length > 0) {
          // Insert absent records with consistent date format
          const attendanceData = absentStudents.map(s => ({
            student_id: s.admission_number,
            session_id: sessionId,
            date: dateInKarachi,
            status: 'absent',
            scan_time: now.toISOString(),
            marked_by: session?.created_by || '',
          }))

          console.log('Inserting', attendanceData.length, 'absent records...')

          const { error: insertError } = await supabase
            .from('attendance_logs')
            .insert(attendanceData)

          if (insertError) {
            console.error('Error inserting absent records:', insertError)
            console.error('Error details:', JSON.stringify(insertError, null, 2))
            alert('Failed to mark absent students. Error: ' + JSON.stringify(insertError))
            return
          }

          console.log('Successfully inserted', attendanceData.length, 'absent records')
        }

        // Mark session as completed
        console.log('Marking session as completed...')
        await supabase
          .from('attendance_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId)

        setAutoCompleted(true)
        alert(`Session completed! ${absentStudents.length} students marked as absent.`)
      }
    } catch (error) {
      console.error('Auto-complete session error:', error)
      alert('Failed to complete session. Please try again.')
    } finally {
      setAutoCompleteLoading(false)
    }
  }

  const handleMarkAsExcused = async (logId: string, studentId: string) => {
    try {
      setMarkingLoading({ ...markingLoading, [studentId]: true })

      const reason = excusedInput[studentId] || ''

      // Call API to mark as excused
      const response = await fetch('/api/attendance/mark-excused', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, reason }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh attendance logs
        await fetchSessionDetails(session!.id)
        setExcusedInput({ ...excusedInput, [studentId]: '' })
      } else {
        alert(data.error || 'Failed to mark as excused')
      }
    } catch (error) {
      console.error('Mark excused error:', error)
      alert('Failed to mark as excused')
    } finally {
      setMarkingLoading({ ...markingLoading, [studentId]: false })
    }
  }

  const handleDelete = async () => {
    if (!session) return
    if (!confirm('Are you sure you want to delete this session? This will also delete all attendance records.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', session.id)

      if (error) throw error

      router.push('/admin/sessions')
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600'
      case 'absent':
        return 'text-red-600'
      case 'late':
        return 'text-yellow-600'
      case 'excused':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStats = () => {
    // Total = all students in database
    const total = allStudents.length

    // Present = students who scanned (present or late)
    const present = attendanceLogs.filter(l => l.status === 'present' || l.status === 'late').length

    // Absent = students who didn't scan
    const absent = total - present

    return {
      total,
      present,
      absent,
      late: attendanceLogs.filter(l => l.status === 'late').length,
      excused: attendanceLogs.filter(l => l.status === 'excused').length,
    }
  }

  const getAbsentStudents = () => {
    const scannedStudentIds = new Set(attendanceLogs.map(l => l.student_id))
    return allStudents.filter(s => !scannedStudentIds.has(s.admission_number))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-3">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Session not found</p>
            <Link href="/admin/sessions">
              <Button>Back to Sessions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = getStats()
  const absentStudents = getAbsentStudents()
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi'
  })

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/sessions">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Session Details</h1>
              <p className="text-sm text-muted-foreground">View attendance records (Asia/Karachi)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {autoCompleteLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <AlertDescription>Auto-completing session... Please wait.</AlertDescription>
            </Alert>
          )}

          {autoCompleted && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              <AlertDescription>
                Session has been auto-completed! {absentStudents.length} students marked as absent.
              </AlertDescription>
            </Alert>
          )}

          {/* Session Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle>Attendance Session</CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                  <CardDescription>
                    {new Date(session.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'Asia/Karachi'
                    })}
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start Time:</span>
                  <span className="font-medium">{session.start_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">End Time:</span>
                  <span className="font-medium">{session.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Current Time (Karachi):</span>
                  <span className="font-medium">{new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Karachi'
                  })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-6 w-6" />
                Attendance Statistics
              </CardTitle>
              <CardDescription>
                Total students in database: {allStudents.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Students</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">{stats.present}</div>
                  <div className="text-sm text-muted-foreground">Present</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
                  <div className="text-sm text-muted-foreground">Late</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-blue-600">{stats.excused}</div>
                  <div className="text-sm text-muted-foreground">Excused</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Present/Late Students */}
          {attendanceLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Present / Late Students
                </CardTitle>
                <CardDescription>
                  {attendanceLogs.length} students attended
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {attendanceLogs.map((log) => {
                    const student = studentMap[log.student_id]
                    if (!student) {
                      console.error('Student not found for log.student_id:', log.student_id)
                      return null
                    }

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{student.full_name}</h4>
                              <div className="text-sm text-muted-foreground">
                                <span>Adm: {log.student_id}</span>
                                <span className="mx-2">•</span>
                                <span>{student.class} - {student.section}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className={getStatusColor(log.status)}
                          >
                            {log.status.toUpperCase()}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.scan_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Karachi'
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Absent Students */}
          {session.status === 'completed' && absentStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  Absent Students ({absentStudents.length})
                </CardTitle>
                <CardDescription>
                  Mark as excused/leave if student had permission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {absentStudents.map((student) => (
                    <div
                      key={student.admission_number}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{student.full_name}</h4>
                            <div className="text-sm text-muted-foreground">
                              <span>Adm: {student.admission_number}</span>
                              <span className="mx-2">•</span>
                              <span>{student.class} - {student.section}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-red-600">
                          ABSENT
                        </Badge>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Reason (optional)"
                            value={excusedInput[student.admission_number] || ''}
                            onChange={(e) => setExcusedInput({ ...excusedInput, [student.admission_number]: e.target.value })}
                            className="w-40"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const absentLog = attendanceLogs.find(l => l.student_id === student.admission_number && l.status === 'absent')
                              if (absentLog) {
                                handleMarkAsExcused(absentLog.id, student.admission_number)
                              } else {
                                alert('Student record not found')
                              }
                            }}
                            disabled={markingLoading[student.admission_number]}
                          >
                            {markingLoading[student.admission_number] ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              'Mark Excused'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit All Excused Button */}
          {session.status === 'completed' && absentStudents.length > 0 && Object.keys(excusedInput).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Excused Marks</CardTitle>
                <CardDescription>Add reason for excused students (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    const entries = Object.entries(excusedInput)
                    let successCount = 0

                    for (const [studentId, reason] of entries) {
                      if (reason.trim() !== '') {
                        const absentLog = attendanceLogs.find(l => l.student_id === studentId && l.status === 'absent')
                        if (absentLog) {
                          setMarkingLoading({ ...markingLoading, [studentId]: true })
                          await handleMarkAsExcused(absentLog.id, studentId)
                          successCount++
                        }
                      }
                    }

                    if (successCount > 0) {
                      setExcusedInput({})
                      await fetchSessionDetails(session!.id)
                      alert(`Successfully marked ${successCount} students as excused!`)
                    } else {
                      alert('Please enter at least one reason to submit')
                    }
                  }}
                  disabled={Object.values(markingLoading).some(v => v)}
                >
                  Submit All with Reasons
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Session Details (Asia/Karachi)
          </p>
        </div>
      </footer>
    </div>
  )
}