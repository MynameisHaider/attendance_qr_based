'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Download, Printer, QrCode, Loader2 } from 'lucide-react'
import QRCodeDisplay from 'react-qr-code'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface Student {
  admission_number: string
  full_name: string
  class: string
  section: string
  photo_url?: string
  parent_name?: string
  parent_contact?: string
}

export default function IDCardPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<Student | null>(null)
  const [qrToken, setQrToken] = useState<string>('')
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    if (params.admissionNumber) {
      fetchStudentData(params.admissionNumber as string)
    }
  }, [params.admissionNumber])

  const fetchStudentData = async (admissionNumber: string) => {
    try {
      // Fetch student data
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('admission_number', admissionNumber)
        .single()

      if (studentData) {
        setStudent(studentData)
        // Fetch QR token
        const response = await fetch(`/api/qr/token?admissionNumber=${admissionNumber}`)
        const data = await response.json()
        if (data.token) {
          setQrToken(data.token)
        }
      }
    } catch (error) {
      console.error('Error fetching student:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!student || !qrToken) return

    setGeneratingPDF(true)

    try {
      const element = document.getElementById('id-card')
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [95.6, 73.98], // Credit card size
      })

      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98)
      pdf.save(`${student.full_name.replace(/\s+/g, '_')}_ID_Card.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Student not found</p>
            <Link href="/admin/students">
              <Button>Back to Students</Button>
            </Link>
          </CardContent>
        </Card>
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
              <Link href="/admin/students">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Student ID Card</h1>
                <p className="text-sm text-muted-foreground">{student.full_name}</p>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-8">
          {/* ID Card Front */}
          <div id="id-card" className="w-[85.6mm] h-[53.98mm] bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-2xl p-3 text-white">
            <div className="flex items-center gap-3 h-full">
              {/* Left side - Photo and School */}
              <div className="flex-shrink-0">
                <div className="w-[30mm] h-[38mm] bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-blue-600 font-bold text-lg">
                      {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Details */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium mb-1 opacity-90">STUDENT ID CARD</div>
                <div className="font-bold text-sm mb-1 truncate">{student.full_name}</div>
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">Class:</span>
                    <span className="font-medium">{student.class}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">Section:</span>
                    <span className="font-medium">{student.section}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">Adm No:</span>
                    <span className="font-medium text-[10px]">{student.admission_number}</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="w-[18mm] h-[18mm] bg-white rounded-lg p-1">
                  {qrToken && (
                    <QRCodeDisplay
                      value={qrToken}
                      size={56}
                      bgColor="#bbbbbb"
                      fgColor="#000000"
                      level="H"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <Card className="max-w-md">
            <CardContent className="pt-6 text-sm space-y-2">
              <h3 className="font-semibold mb-2">Printing Instructions</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Print on cardstock paper for durability</li>
                <li>• Use a card cutter or scissors for clean edges</li>
                <li>• Consider laminating for extra protection</li>
                <li>• Ensure QR code is clearly visible</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • ID Card Generation
          </p>
        </div>
      </footer>
    </div>
  )
}
