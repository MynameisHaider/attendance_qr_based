'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Calendar, Users, Edit, Trash2, UserCheck, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
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
  student_name: string
  class: string
  section: string
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
  const [autoCompleted, setAutoCompleted] = useState(false)
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false)
  const [excusedInput, setExcusedInput] = useState<{ [key: string]: string }>({})
  const [markingLoading, setMarkingLoading] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchSessionDetails(params.id as string)
    }
  }, [params.id])

  // Auto-refresh attendance every 5 seconds
  useEffect(() => {
    if (session && (session.status === 'active' || session.status === 'completed')) {
      const interval = setInterval(() => {
        fetchAttendanceLogs(session.id)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [session?.id, session?.status])

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      console.log('Fetching session details for:', sessionId)

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

      console.log('Session data:', sessionData)
      setSession(sessionData)

      // Get all students from database
      const { data: studentsData } = await supabase
        .from('students')
        .select('admission_number, full_name, class, section')
        .order('full_name', { ascending: true })

      if (!studentsData || studentsData.length === 0) {
        console.error('ERROR: No students found in database')
        setError('No students found in database')
        return
      }

      console.log(`Found ${studentsData.length} students in DB`)
      setAllStudents(studentsData)

      // Get attendance logs for this session
      await fetchAttendanceLogs(sessionId)

      setError(null)
    } catch (err) {
      console.error('Error fetching session details:', err)
      setError('Failed to load session details')
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceLogs = async (sessionId: string) => {
    try {
      console.log('Fetching attendance logs for session:', sessionId)

      // Get attendance logs joined with students
      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select(`
          al.id,
          al.student_id,
          s.full_name,
          s.class,
          s.section,
          al.session_id,
          al.date,
          al.status,
          al.scan_time,
          al.marked_by
        `)
        .eq('session_id', sessionId)

      console.log(`Found ${logsData?.length || 0} attendance logs`)

      if (logsData) {
        setAttendanceLogs(logsData)
      } else {
        console.log('No attendance logs found')
        setAttendanceLogs([])
      }
    } catch (err) {
      console.error('Error fetching attendance logs:', err)
    }
  }

  const autoCompleteSession = async (sessionId: string) => {
    try {
      setAutoCompleteLoading(true)
      setError(null)

      const now = new Date()
      const currentTimeInKarachi = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi'
      })

      const dateInKarachi = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

      console.log('=== AUTO-COMPLETE START ===')
      console.log('Session ID:', sessionId)
      console.log('Current time (Karachi):', currentTimeInKarachi)
      console.log('Date (Karachi):', dateInKarachi)

      // Get already scanned students for this session
      const { data: existingLogs } = await supabase
        .from('attendance_logs')
        .select('student_id')
        .eq('session_id', sessionId)

      const scannedStudentIds = new Set(existingLogs?.map(l => l.student_id) || [])
      console.log(`Already scanned students: ${scannedStudentIds.size}`)

      if (!allStudents || allStudents.length === 0) {
        setError('No students found in database')
        return
      }

      // Find students who weren't scanned
      const absentStudents = allStudents.filter(s => !scannedStudentIds.has(s.admission_number))

      console.log(`Absent students: ${absentStudents.length}`)

      if (absentStudents.length > 0) {
        // Insert absent records
        const attendanceData = absentStudents.map(s => ({
          student_id: s.admission_number,
          session_id: sessionId,
          date: dateInKarachi,
          status: 'absent',
          scan_time: now.toISOString(),
          marked_by: session?.created_by || '',
        }))

        console.log(`Inserting ${attendanceData.length} absent records...`)

        const { error: insertError } = await supabase
          .from('attendance_logs')
          .insert(attendanceData)

        if (insertError) {
          console.error('ERROR inserting absent records:', insertError)
          console.error('Error details:', JSON.stringify(insertError, null, 2))
          setError(`Failed to mark absent students: ${insertError.message || 'Unknown error'}`)
          return
        }

        console.log(`Successfully inserted ${attendanceData.length} absent records`)
      } else {
        console.log('No absent students to mark (all already scanned)')
      }

      // Mark session as completed
      const { error: updateError } = await supabase
        .from('attendance_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)

      if (updateError) {
        console.error('ERROR updating session status:', updateError)
        setError('Failed to complete session')
        return
      }

      console.log('Session marked as completed')
      setAutoCompleted(true)

      // Refresh data
      await fetchSessionDetails(sessionId)

    } catch (err) {
      console.error('=== AUTO-COMPLETE ERROR ===')
      console.error('Error:', err)
      setError('Failed to complete session')
    } finally {
      setAutoCompleteLoading(false)
    }
  }

  const handleMarkAsExcused = async (logId: string, studentId: string) => {
    try {
      setMarkingLoading({ ...markingLoading, [studentId]: true })
      setError(null)

      const reason = excusedInput[studentId] || ''
      console.log('Marking as excused:', { logId, studentId, reason)

      // Check if session is within 10 minutes of end time
      if (!session) {
        return
      }

      const now = new Date()
      const currentTimeInKarachi = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Karachi'
      })

      const minutesPastEnd = getTimeDifferenceInMinutes(session.end_time, currentTimeInKarachi)

      if (minutesPastEnd > 10) {
        setError('Marking as excused is only allowed within 10 minutes after session ends')
        return
      }

      // Call API to mark as excused
      const response = await fetch('/api/attendance/mark-excused', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, reason }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Successfully marked as excused')
        // Refresh attendance logs
        await fetchAttendanceLogs(session!.id)
        setExcusedInput({ ...excusedInput, [studentId]: '' })
      } else {
        setError(data.error || 'Failed to mark as excused')
      }
    } catch (err) {
      console.error('Mark excused error:', err)
      setError('Failed to mark as excused')
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
    } catch (err) {
      console.error('Error deleting session:', err)
      alert('Failed to delete session')
    }
  }

  const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
    const [h1, m1] = time1.split(':').map(Number)
    const [h2, m2] = time2.split(':').map(Number)
    const date1 = new Date()
    const date2 = new Date()
    date1.setHours(h1, m1)
    date2.setHours(h2, m2)
    return Math.abs(date1.getTime() - date2.getTime()) / 60000 // Convert to minutes
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

  const isMarkingDisabled = (sessionId: string, studentId: string): boolean => {
    if (!session) return true

    const now = new Date()
    const currentTimeInKarachi = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Karachi'
    })

    // If session is not completed, enable marking
    if (session.status !== 'completed') return false

    const minutesPastEnd = getTimeDifferenceInMinutes(session.end_time, currentTimeInKarachi)

    // Only disable if more than 10 minutes past end time
    return minutesPastEnd > 10
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
    hour12: false,
    timeZone: 'Asia/Karachi'
  })
  const now = new Date()
  const currentTimeInKarachi = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi'
  })
  const minutesPastEnd = getTimeDifferenceInMinutes(session.end_time, currentTimeInKarachi)

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
          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Auto-completed Alert */}
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
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Current Time (Karachi):</span>
                  <span className="font-medium">{currentTime}</span>
                </div>
                {session.status === 'completed' && minutesPastEnd > 0 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600">
                    <Clock className="h-3 w-3" />
                    <span>{minutesPastEnd} minutes past end</span>
                  </div>
                )}
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
                  {attendanceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {log.student_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{log.student_name}</h4>
                            <div className="text-sm text-muted-foreground">
                              <span>Adm: {log.student_id}</span>
                              <span className="mx-2">•</span>
                              <span>{log.class} - {log.section}</span>
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
                  ))}
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
                  {session.status === 'completed' && minutesPastEnd <= 10 && (
                    <span>Marking available until {10 - minutesPastEnd} minutes past end</span>
                  )}
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
                            disabled={markingLoading[student.admission_number] || isMarkingDisabled(session!.id, student.admission_number)}
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
          {session.status === 'completed' && absentStudents.length > 0 && Object.keys(excusedInput).length > 0 && minutesPastEnd <= 10 && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Excused Marks</CardTitle>
                <CardDescription>
                  Add reason for excused students (optional)
                  {session.status === 'completed' && minutesPastEnd <= 10 && (
                    <span>Available until {10 - minutesPastEnd} minutes past end</span>
                  )}
                </CardDescription>
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
                          const response = await fetch('/api/attendance/mark-excused', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ logId: absentLog.id, reason }),
                          })
                          const data = await response.json()
                          if (response.ok) {
                            successCount++
                            // Clear input after successful mark
                            setExcusedInput({ ...excusedInput, [studentId]: '' })
                          } else {
                            setError(data.error || 'Failed to mark as excused')
                          return
                          }
                        }
                      }
                    }

                    if (successCount > 0) {
                      setExcusedInput({})
                      await fetchAttendanceLogs(session!.id)
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
