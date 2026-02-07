'use client'
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Plus, Users, Edit, Trash2, Eye } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AttendanceSession {
  id: string
  class: string
  section: string
  date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed'
  created_at: string
}

export default function SessionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<AttendanceSession[]>([])

  useEffect(() => {
    fetchSessions()
  }, [supabase])

  const fetchSessions = async () => {
    try {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*')
		//.limit(1);
       .order('date', { ascending: false })
        //.order('created_at', { ascending: false })
console.log("Database se aaya data:", data);
      if (data) {
        setSessions(data)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
	
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This will also delete all attendance records.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      await fetchSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session')
    }
  }

  const handleActivate = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'active' })
        .eq('id', sessionId)

      if (error) throw error

      await fetchSessions()
    } catch (error) {
      console.error('Error activating session:', error)
      alert('Failed to activate session')
    }
  }

  const handleComplete = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)

      if (error) throw error

      await fetchSessions()
    } catch (error) {
      console.error('Error completing session:', error)
      alert('Failed to complete session')
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
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Attendance Sessions</h1>
                <p className="text-sm text-muted-foreground">{sessions.length} total sessions</p>
              </div>
            </div>
            <Link href="/admin/sessions/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Sessions Found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first attendance session to get started
                  </p>
                  <Link href="/admin/sessions/create">
                    <Button>Create Session</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>Class {session.class} - Section {session.section}</CardTitle>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {session.status === 'scheduled' && (
                            <DropdownMenuItem onClick={() => handleActivate(session.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Activate Session
                            </DropdownMenuItem>
                          )}
                          {session.status === 'active' && (
                            <DropdownMenuItem onClick={() => handleComplete(session.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Complete Session
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(session.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Start:</span>
                          <span className="font-medium">{session.start_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">End:</span>
                          <span className="font-medium">{session.end_time}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {session.status === 'active' && (
                          <Link href={`/teacher/scan?session=${session.id}`}>
                            <Button size="sm">
                              <Users className="h-4 w-4 mr-2" />
                              Scan Attendance
                            </Button>
                          </Link>
                        )}
                        <Link href={`/admin/sessions/${session.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Session Management
          </p>
        </div>
      </footer>
    </div>
  )
}
