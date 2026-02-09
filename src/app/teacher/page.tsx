'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LogOut, QrCode, Users, Calendar, Home, User, ScanLine } from 'lucide-react'

interface AttendanceSession {
  id: string
  class: string
  section: string
  date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed'
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
}

export default function TeacherDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [todayStats, setTodayStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  })

  const fetchSessions = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10)

      if (data) {
        setSessions(data)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('date', today)

      if (logs) {
        const stats: AttendanceStats = {
          total: logs.length,
          present: logs.filter(l => l.status === 'present').length,
          absent: logs.filter(l => l.status === 'absent').length,
          late: logs.filter(l => l.status === 'late').length,
          excused: logs.filter(l => l.status === 'excused').length,
        }
        setTodayStats(stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push('/login')
        return
      }

      // Fetch sessions and stats
      await Promise.all([fetchSessions(), fetchTodayStats()])
      setLoading(false)
    }

    checkAuth()

    // Refresh stats every 5 seconds
    const refreshInterval = setInterval(() => {
      fetchTodayStats()
    }, 5000)

    return () => clearInterval(refreshInterval)
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getSessionStatusBadge = (status: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Teacher Dashboard</h1>
                <p className="text-sm text-muted-foreground">Scan QR codes and track attendance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/teacher/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Tabs defaultValue="scan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan">Scan QR</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Scan QR Tab */}
          <TabsContent value="scan" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine className="h-6 w-6" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>
                  Scan student ID cards to mark attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-12 text-center space-y-4">
                  <QrCode className="h-24 w-24 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">Ready to Scan</h3>
                    <p className="text-sm text-muted-foreground">
                      Point the camera at a student's QR code
                    </p>
                  </div>
                  <Link href="/teacher/scan?session=${session.id}">
                    <Button size="lg">Start Scanner</Button>
                  </Link>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">Tips for scanning:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ensure good lighting conditions</li>
                    <li>• Hold the camera steady</li>
                    <li>• QR code should be fully visible in frame</li>
                    <li>• Scanning works best within 10-20cm distance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Attendance Sessions</h2>
              <Button>Create New Session</Button>
            </div>

            <div className="grid gap-4">
              {sessions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Sessions Found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first attendance session to get started
                      </p>
                      <Button>Create Session</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Attendance Session</CardTitle>
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
                        {getSessionStatusBadge(session.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Start:</span>
                          <span className="font-medium">{session.start_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">End:</span>
                          <span className="font-medium">{session.end_time}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        {session.status === 'active' && (
                          <Link href={`/teacher/scan?session=${session.id}`}>
                            <Button size="sm">Scan Attendance</Button>
                          </Link>
                        )}
                        <Link href={`/teacher/${session.id}`}>
                          <Button size="sm" variant="outline">View Details</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance</CardTitle>
                <CardDescription>Real-time attendance summary for {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', month: 'long', day: 'numeric' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-foreground">{todayStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-green-600">{todayStats.present}</div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-red-600">{todayStats.absent}</div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-yellow-600">{todayStats.late}</div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Log</CardTitle>
                <CardDescription>Recent attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>Go to Sessions tab to view session details and complete attendance logs</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Teacher Dashboard
          </p>
        </div>
      </footer>
    </div>
  )
}