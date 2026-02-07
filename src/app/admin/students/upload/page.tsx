'use client'

export const dynamic = 'force-dynamic';
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface StudentData {
  admission_number: string
  full_name: string
  class: string
  section: string
  date_of_birth?: string
  gender?: string
  parent_name?: string
  parent_contact?: string
  address?: string
}

export default function StudentUploadPage() {
  const router = useRouter()
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<StudentData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadResult, setUploadResult] = useState({
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setSuccess(false)
      setPreview([])
    }
  }

  const parseExcelFile = (file: File): Promise<StudentData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

          // Map Excel data to student format
          const students: StudentData[] = jsonData.map((row) => ({
            admission_number: String(row['admission_number'] || row['Admission Number'] || row['Admission No'] || ''),
            full_name: String(row['full_name'] || row['Full Name'] || row['Name'] || ''),
            class: String(row['class'] || row['Class'] || ''),
            section: String(row['section'] || row['Section'] || ''),
            date_of_birth: row['date_of_birth'] || row['Date of Birth'] || row['DOB'] ? String(row['date_of_birth'] || row['Date of Birth'] || row['DOB']) : undefined,
            gender: row['gender'] || row['Gender'] ? String(row['gender'] || row['Gender']) : undefined,
            parent_name: row['parent_name'] || row['Parent Name'] ? String(row['parent_name'] || row['Parent Name']) : undefined,
            parent_contact: row['parent_contact'] || row['Parent Contact'] ? String(row['parent_contact'] || row['Parent Contact']) : undefined,
            address: row['address'] || row['Address'] ? String(row['address'] || row['Address']) : undefined,
          }))

          resolve(students)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsBinaryString(file)
    })
  }

  const handlePreview = async () => {
    if (!file) return

    try {
      const students = await parseExcelFile(file)
      setPreview(students)
      setError(null)
    } catch (error) {
      setError('Failed to parse the Excel file. Please check the file format.')
      setPreview([])
    }
  }

  const handleUpload = async () => {
    if (preview.length === 0) return

    setUploading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    let created = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < preview.length; i++) {
      const student = preview[i]

      try {
        const { error } = await supabase
          .from('students')
          .upsert(
            {
              admission_number: student.admission_number,
              full_name: student.full_name,
              class: student.class,
              section: student.section,
              date_of_birth: student.date_of_birth,
              gender: student.gender,
              parent_name: student.parent_name,
              parent_contact: student.parent_contact,
              address: student.address,
            },
            {
              onConflict: 'admission_number',
            }
          )

        if (error) {
          failed++
        } else {
          // Check if it was a new or updated record
          const { data: existing } = await supabase
            .from('students')
            .select('created_at')
            .eq('admission_number', student.admission_number)
            .single()

          if (existing) {
            updated++
          } else {
            created++
          }
        }
      } catch (error) {
        failed++
      }

      setUploadProgress(((i + 1) / preview.length) * 100)
    }

    setUploadResult({
      total: preview.length,
      created,
      updated,
      failed,
    })

    setSuccess(true)
    setUploading(false)
    setPreview([])
    setFile(null)
  }

  const downloadTemplate = () => {
    const template = [
      {
        admission_number: '2024001',
        full_name: 'John Doe',
        class: '10',
        section: 'A',
        date_of_birth: '2008-05-15',
        gender: 'male',
        parent_name: 'John Doe Sr.',
        parent_contact: '+1234567890',
        address: '123 Main St, City',
      },
      {
        admission_number: '2024002',
        full_name: 'Jane Smith',
        class: '10',
        section: 'A',
        date_of_birth: '2008-07-20',
        gender: 'female',
        parent_name: 'Robert Smith',
        parent_contact: '+1234567891',
        address: '456 Oak Ave, Town',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    XLSX.writeFile(workbook, 'students_template.xlsx')
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
              <h1 className="text-xl font-bold text-foreground">Bulk Upload Students</h1>
              <p className="text-sm text-muted-foreground">Upload student data from Excel file</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {!success && (
            <>
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6" />
                    Download Template
                  </CardTitle>
                  <CardDescription>
                    Use this template to ensure your Excel file has the correct format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={downloadTemplate} variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-6 w-6" />
                    Upload Excel File
                  </CardTitle>
                  <CardDescription>
                    Select an Excel file containing student data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Select File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                  </div>

                  {file && (
                    <Alert>
                      <FileSpreadsheet className="h-4 w-4" />
                      <AlertDescription>
                        Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePreview}
                      disabled={!file || uploading}
                      className="flex-1"
                    >
                      Preview Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              {preview.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview ({preview.length} students)</CardTitle>
                    <CardDescription>
                      Review the data before uploading
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Admission No.</th>
                            <th className="px-4 py-2 text-left font-medium">Name</th>
                            <th className="px-4 py-2 text-left font-medium">Class</th>
                            <th className="px-4 py-2 text-left font-medium">Section</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((student, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{student.admission_number}</td>
                              <td className="px-4 py-2">{student.full_name}</td>
                              <td className="px-4 py-2">{student.class}</td>
                              <td className="px-4 py-2">{student.section}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload {preview.length} Students
                        </>
                      )}
                    </Button>

                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Success State */}
          {success && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 dark:text-green-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-green-900 dark:text-green-200">
                      Upload Complete!
                    </h2>
                    <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Students:</span>
                        <span className="font-medium">{uploadResult.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium text-green-600">{uploadResult.created}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="font-medium text-blue-600">{uploadResult.updated}</span>
                      </div>
                      {uploadResult.failed > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Failed:</span>
                          <span className="font-medium text-red-600">{uploadResult.failed}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/admin/students">
                      <Button>View Students</Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSuccess(false)
                        setUploadResult({ total: 0, created: 0, updated: 0, failed: 0 })
                      }}
                    >
                      Upload More
                    </Button>
                  </div>
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
            QR-Based School Attendance System • Bulk Upload Students
          </p>
        </div>
      </footer>
    </div>
  )
}
