'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Users, Edit, Trash2, UserCheck, Loader2 } from 'lucide-react'

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
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])

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
    return {
      total: attendanceLogs.length,
      present: attendanceLogs.filter(l => l.status === 'present').length,
      absent: attendanceLogs.filter(l => l.status === 'absent').length,
      late: attendanceLogs.filter(l => l.status === 'late').length,
      excused: attendanceLogs.filter(l => l.status === 'excused').length,
    }
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
                      day: 'numeric'
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
                Summary for this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
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
              </div>
            </CardContent>
          </Card>

          {/* Attendance Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                Attendance Records
              </CardTitle>
              <CardDescription>
                {attendanceLogs.length} students marked
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Attendance Records</h3>
                  <p className="text-sm text-muted-foreground">
                    No students have attended this session yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Session Details
          </p>
        </div>
      </footer>
    </div>
  )
}
