'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Users, Trash2, UserCheck, Loader2, Clock } from 'lucide-react'

// Interfaces
interface AttendanceSession {
  id: string; date: string; start_time: string; end_time: string;
  status: 'scheduled' | 'active' | 'completed';
}

interface AttendanceLog {
  id: string; student_id: string; student_name: string;
  class: string; section: string; status: 'present' | 'absent' | 'excused';
  scan_time: string;
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [graceTimeLeft, setGraceTimeLeft] = useState<string | null>(null)
  const [canEditLeave, setCanEditLeave] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // 1. Get Session
      const { data: sData } = await supabase.from('attendance_sessions').select('*').eq('id', params.id).single()
      if (!sData) return router.push('/admin/sessions')
      setSession(sData)

      // 2. Get Total Students Count from DB
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true })
      setTotalStudents(count || 0)

      // 3. Get Attendance Records (Using a join or your report view)
      // Note: Make sure your view 'attendance_report' now includes 'absent' records too
      const { data: logsData } = await supabase.from('attendance_report').select('*').eq('session_id', params.id)
      if (logsData) setAttendanceLogs(logsData)

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [params.id, supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Timer Logic for Requirements 1, 3, 4, 6
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!session) return

      const now = new Date()
      // Combine date and end_time to get exact expiry
      const sessionEnd = new Date(`${session.date}T${session.end_time}`)
      const graceEnd = new Date(sessionEnd.getTime() + 10 * 60000)

      // 1. Auto Close & Mark Absent (Requirement 1 & 3)
      if (now > sessionEnd && session.status === 'active') {
        await supabase.rpc('finalize_attendance', { s_id: session.id })
        fetchData()
      }

      // 2. Check 10-minute Grace Period (Requirement 4 & 6)
      if (now > sessionEnd && now < graceEnd) {
        setCanEditLeave(true)
        const diff = Math.floor((graceEnd.getTime() - now.getTime()) / 1000)
        setGraceTimeLeft(`${Math.floor(diff / 60)}m ${diff % 60}s`)
      } else {
        setCanEditLeave(false)
        setGraceTimeLeft(null)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [session, fetchData, supabase])

  const handleMarkLeave = async (studentId: string) => {
    if (!canEditLeave) return alert("Grace period expired!")

    const { error } = await supabase
      .from('attendance_records')
      .update({ status: 'excused' })
      .eq('student_id', studentId)
      .eq('session_id', session?.id)

    if (!error) fetchData() // Requirement 5: Update DB and UI
  }

  const stats = {
    total: totalStudents,
    present: attendanceLogs.filter(l => l.status === 'present').length,
    absent: attendanceLogs.filter(l => l.status === 'absent').length,
    excused: attendanceLogs.filter(l => l.status === 'excused').length,
  }

  if (loading || !session) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header with Grace Timer */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2"/> Back</Button>
          {graceTimeLeft && (
            <Badge className="bg-orange-500 animate-pulse py-2 px-4">
              <Clock className="w-4 h-4 mr-2" /> Leave Window: {graceTimeLeft}
            </Badge>
          )}
        </div>

        {/* Stats Section (Requirement 2) */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Students" value={stats.total} color="text-slate-900" />
          <StatCard title="Present" value={stats.present} color="text-green-600" />
          <StatCard title="Absent" value={stats.absent} color="text-red-600" />
          <StatCard title="On Leave" value={stats.excused} color="text-blue-600" />
        </div>

        {/* Attendance List */}
        <Card>
          <CardHeader><CardTitle>Attendance Sheet</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-bold">{log.student_name}</p>
                    <p className="text-xs text-muted-foreground">{log.class} | {log.student_id}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={log.status === 'present' ? 'default' : 'destructive'}>
                      {log.status.toUpperCase()}
                    </Badge>
                    
                    {/* Mark Leave Button (Requirement 4 & 6) */}
                    {log.status === 'absent' && canEditLeave && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkLeave(log.student_id)}>
                        Mark Leave
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, color }: { title: string, value: number, color: string }) {
  return (
    <Card><CardContent className="pt-6 text-center">
      <p className="text-sm text-muted-foreground uppercase">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </CardContent></Card>
  )
}