'use client'

export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Download, Calendar, FileSpreadsheet, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface AttendanceReport {
  student_name: string
  admission_number: string
  class: string
  section: string
  session_date: string
  start_time: string
  end_time: string
  status: string
  scan_time: string
  marked_by_name: string
}

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AttendanceReport[]>([])
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    class: '',
    section: '',
  })

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Fetch attendance data with student and profile details
      const { data: logs } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          students (
            admission_number,
            full_name,
            class,
            section
          ),
          attendance_sessions (
            date,
            start_time,
            end_time
          ),
          profiles!marked_by (
            full_name
          )
        `)
        .gte('attendance_sessions.date', filters.startDate)
        .lte('attendance_sessions.date', filters.endDate)
        .order('attendance_sessions.date', { ascending: false })
        .order('scan_time', { ascending: false })

      if (logs) {
        const reportData: AttendanceReport[] = logs
          .filter((log) => {
            const matchesClass = !filters.class || log.students?.class === filters.class
            const matchesSection = !filters.section || log.students?.section === filters.section
            return matchesClass && matchesSection
          })
          .map((log) => ({
            student_name: log.students?.full_name || '',
            admission_number: log.students?.admission_number || '',
            class: log.students?.class || '',
            section: log.students?.section || '',
            session_date: log.attendance_sessions?.date || '',
            start_time: log.attendance_sessions?.start_time || '',
            end_time: log.attendance_sessions?.end_time || '',
            status: log.status,
            scan_time: log.scan_time,
            marked_by_name: log.profiles?.full_name || '',
          }))

        setData(reportData)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = () => {
    if (data.length === 0) {
      alert('No data to export')
      return
    }

    // Prepare data for export
    const exportData = data.map((item) => ({
      'Student Name': item.student_name,
      'Admission Number': item.admission_number,
      'Class': item.class,
      'Section': item.section,
      'Date': item.session_date,
      'Start Time': item.start_time,
      'End Time': item.end_time,
      'Status': item.status.charAt(0).toUpperCase() + item.status.slice(1),
      'Scan Time': new Date(item.scan_time).toLocaleString(),
      'Marked By': item.marked_by_name,
    }))

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')

    // Generate filename
    const fileName = `attendance_report_${filters.startDate}_to_${filters.endDate}.xlsx`

    // Download
    XLSX.writeFile(workbook, fileName)
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
              <h1 className="text-xl font-bold text-foreground">Attendance Reports</h1>
              <p className="text-sm text-muted-foreground">Export and analyze attendance data</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Report Filters
              </CardTitle>
              <CardDescription>
                Select date range and class to generate report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class (Optional)</Label>
                  <Input
                    id="class"
                    type="text"
                    placeholder="e.g., 10"
                    value={filters.class}
                    onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Section (Optional)</Label>
                  <Input
                    id="section"
                    type="text"
                    placeholder="e.g., A"
                    value={filters.section}
                    onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchReportData} disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportToExcel}
                  disabled={data.length === 0}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Report Summary</CardTitle>
                <CardDescription>
                  {data.length} attendance records found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-foreground">
                      {data.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      {data.filter(d => d.status === 'present').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-red-600">
                      {data.filter(d => d.status === 'absent').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-yellow-600">
                      {data.filter(d => d.status === 'late').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Table */}
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  First 100 records (Export to Excel for full data)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Student</th>
                        <th className="px-4 py-2 text-left font-medium">Class</th>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium">Marked By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 100).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            <div>{item.student_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.admission_number}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {item.class}-{item.section}
                          </td>
                          <td className="px-4 py-2">
                            {new Date(item.session_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              item.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : item.status === 'late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {item.marked_by_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Reports
          </p>
        </div>
      </footer>
    </div>
  )
}
