'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Calendar, Clock, Plus, Loader2 } from 'lucide-react'

export default function CreateSessionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    class: '',
    section: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '09:30',
    scope: 'all', // 'all' = any student, 'specific' = only matching class/section
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: sessionError } = await supabase
        .from('attendance_sessions')
        .insert({
          class: formData.class,
          section: formData.section,
          date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          status: 'active',
          created_by: user.id,
        })

      if (sessionError) {
        throw sessionError
      }

      router.push('/admin/sessions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">Create Attendance Session</h1>
              <p className="text-sm text-muted-foreground">Set up time-bound attendance window</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Session Details
              </CardTitle>
              <CardDescription>
                Enter the details for the attendance session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Session Scope */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-base font-medium">Who can attend this session?</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Button
                        type="button"
                        variant={formData.scope === 'all' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, scope: 'all', class: '', section: '' })}
                        className="h-16 flex flex-col items-center justify-start"
                      >
                        <span className="text-lg font-semibold">All Students</span>
                        <span className="text-xs text-muted-foreground">Any student from any class can scan</span>
                      </Button>
                      <Button
                        type="button"
                        variant={formData.scope === 'specific' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, scope: 'specific' })}
                        className="h-16 flex flex-col items-center justify-start"
                      >
                        <span className="text-lg font-semibold">Specific Class</span>
                        <span className="text-xs text-muted-foreground">Only students from selected class</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.scope === 'specific' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="class">Class</Label>
                      <Input
                        id="class"
                        type="text"
                        placeholder="10"
                        required={formData.scope === 'specific'}
                        value={formData.class}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="section">Section</Label>
                      <Input
                        id="section"
                        type="text"
                        placeholder="A"
                        required={formData.scope === 'specific'}
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Session Rules
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Attendance can only be marked within the time window</li>
                    <li>• Students arriving more than 10 minutes late will be marked as "Late"</li>
                    <li>• After end time, session closes automatically</li>
                    <li>• Unmarked students will be auto-marked "Absent"</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Session...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Session
                      </>
                    )}
                  </Button>
                  <Link href="/admin/sessions" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Create Session
          </p>
        </div>
      </footer>
    </div>
  )
}
