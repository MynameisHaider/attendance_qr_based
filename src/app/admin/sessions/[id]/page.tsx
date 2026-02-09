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
import { ArrowLeft, Calendar, Users, Edit, Trash2, UserCheck, Loader2, CheckCircle2 } from 'lucide-react'
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
  reason?: string | null
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
  const [excusedInput, setExcusedInput] = useState<{ [key: string]: string }>({})

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
      const sessionDate = new Date(sessionData.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })

      // If session is active and time has passed, auto-complete it
      if (sessionData.status === 'active' && currentTime > sessionData.end_time) {
        await autoCompleteSession(sessionId)
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

      // Get all students
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true })

      if (studentsData) {
        setAllStudents(studentsData)
      }

      // Get attendance logs for this session
      const { data: logsData } = await supabase
        .from('attendance_report')
        .select('*')
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
      const now = new Date().toISOString()

      // Get already scanned students
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

        if (absentStudents.length > 0) {
          await supabase
            .from('attendance_logs')
            .insert(
              absentStudents.map(s => ({
                student_id: s.admission_number,
                session_id: sessionId,
                date: session?.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
                status: 'absent',
                scan_time: now,
                marked_by: session?.created_by || '',
              }))
            )
        }

        // Mark session as completed
        await supabase
          .from('attendance_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId)
      }
    } catch (error) {
      console.error('Auto-complete session error:', error)
    }
  }

  const handleMarkAsExcused = async (logId: string) => {
    try {
      const response = await fetch('/api/attendance/mark-excused', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          reason: excusedInput[logId]
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh attendance logs
        await fetchSessionDetails(session!.id)
        setExcusedInput({ ...excusedInput, [logId]: '' })
      } else {
        alert(data.error || 'Failed to mark as excused')
      }
    } catch (error) {
      console.error('Mark excused error:', error)
      alert('Failed to mark as excused')
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
              <p className="text-sm text-muted-foreground">View attendance records</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {autoCompleted && (
            <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <AlertDescription>
                Session has been auto-completed because end time has passed. All absent students have been marked.
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
                  <span className="font-medium">{currentTime}</span>
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
                  <Users className="h-6 w-6" />
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setExcusedInput({ ...excusedInput, [student.admission_number]: excusedInput[student.admission_number] || '' })
                          }}
                        >
                          Mark Excused
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {session.status === 'completed' && absentStudents.length > 0 && Object.keys(excusedInput).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Excused Marks</CardTitle>
                <CardDescription>Add reason for excused students (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    // Mark all as excused
                    Object.keys(excusedInput).forEach(async (studentId) => {
                      const log = attendanceLogs.find(l => l.student_id === studentId)
                      if (log && log.status === 'absent') {
                        await handleMarkAsExcused(log.id)
                      }
                    })
                  }}
                  >
                    Mark All as Excused
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
