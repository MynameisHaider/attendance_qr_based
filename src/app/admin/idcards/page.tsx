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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Download, Printer, Search } from 'lucide-react'
import QRCodeDisplay from 'react-qr-code'

interface Student {
  admission_number: string
  full_name: string
  class: string
  section: string
  photo_url?: string
}

export default function IDCardsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [filterSection, setFilterSection] = useState('all')

  useEffect(() => {
    fetchStudents()
  }, [supabase])

  useEffect(() => {
    const filtered = students.filter((student) => {
      const matchesSearch =
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = filterClass === 'all' || student.class === filterClass
      const matchesSection = filterSection === 'all' || student.section === filterSection
      return matchesSearch && matchesClass && matchesSection
    })
    setFilteredStudents(filtered)
  }, [searchTerm, filterClass, filterSection, students])

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .order('class', { ascending: true })
        .order('section', { ascending: true })
        .order('full_name', { ascending: true })

      if (data) {
        setStudents(data)
        setFilteredStudents(data)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  // Get unique classes and sections
  const classes = Array.from(new Set(students.map(s => s.class))).sort()
  const sections = Array.from(new Set(students.map(s => s.section))).sort()

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
                <h1 className="text-xl font-bold text-foreground">Generate ID Cards</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredStudents.length} students
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or admission number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          Class {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger id="section">
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground">
                    {filteredStudents.length} students shown
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ID Cards Grid */}
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterClass !== 'all' || filterSection !== 'all'
                      ? 'No students match your filters'
                      : 'No students found. Add students to generate ID cards.'}
                  </p>
                  {searchTerm === '' && filterClass === 'all' && filterSection === 'all' && (
                    <Link href="/admin/students/upload">
                      <Button>Bulk Upload Students</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <Link
                  key={student.admission_number}
                  href={`/admin/students/${student.admission_number}/idcard`}
                  className="group"
                >
                  <Card className="transition-all hover:shadow-lg cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="font-semibold">{student.full_name}</span>
                      </CardTitle>
                      <CardDescription>
                        {student.class} - {student.section} • {student.admission_number}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center space-y-4">
                        {/* Placeholder QR code */}
                        <div className="w-24 h-24 bg-white rounded-lg border-2 border-slate-200 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                          <QRCodeDisplay
                            value={student.admission_number}
                            size={64}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="L"
                          />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-medium text-muted-foreground">ID CARD</div>
                          <div className="text-[10px] text-muted-foreground">
                            {student.full_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" asChild>
                          <span>
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </span>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <span>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • ID Cards
          </p>
        </div>
      </footer>
    </div>
  )
}
