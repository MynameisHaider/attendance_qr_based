'use client'

export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import QRCodeDisplay from 'react-qr-code'

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
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<Student | null>(null)

  const schoolName = "GHSS KALAYA, District Orakzai" 

  // Function to get color based on Class
  const getClassTheme = (className: string) => {
    const cls = className?.toLowerCase() || '';
    if (cls.includes('10')) return { bg: '#fff1f2', accent: '#e11d48', text: '#881337' }; // Rose/Red
    if (cls.includes('9')) return { bg: '#f0f9ff', accent: '#0284c7', text: '#0c4a6e' };  // Sky Blue
    if (cls.includes('8')) return { bg: '#f0fdf4', accent: '#16a34a', text: '#052e16' };  // Green
    if (cls.includes('7')) return { bg: '#faf5ff', accent: '#9333ea', text: '#3b0764' };  // Purple
    if (cls.includes('6')) return { bg: '#fffbeb', accent: '#d97706', text: '#451a03' };  // Amber
    return { bg: '#f8fafc', accent: '#1e3a8a', text: '#1e1b4b' }; // Default Indigo
  };

  const theme = getClassTheme(student?.class || '');

  useEffect(() => {
    if (params.admissionNumber) {
      fetchStudentData(params.admissionNumber as string)
    }
  }, [params.admissionNumber])

  const fetchStudentData = async (admissionNumber: string) => {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('admission_number', admissionNumber)
        .single()
      if (studentData) setStudent(studentData)
    } catch (error) {
      console.error('Error fetching student:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
  if (!student) return <div className="p-10 text-center">Student not found</div>

  return (
    <div className="min-h-screen bg-slate-200 pb-10">
      <header className="border-b bg-white p-4 mb-8 no-print">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => window.history.back()}><ArrowLeft className="mr-2"/> Back</Button>
          <Button onClick={() => window.print()} className="bg-blue-700 hover:bg-blue-800">
             <Printer className="mr-2 h-4 w-4" /> Print Card
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-center justify-center gap-12 print:gap-10 print:flex-row">
        
        {/* FRONT SIDE */}
        <div id="id-card-front" 
             className="w-[53.98mm] h-[85.6mm] bg-white border shadow-2xl rounded-[12px] overflow-hidden flex flex-col relative print:shadow-none print:border">
          
    {/* Curved Header Section */}
<div style={{ backgroundColor: theme.accent }} className="h-32 flex flex-col items-center justify-start pt-2 px-0 text-center relative overflow-hidden">
  
  <svg viewBox="0 0 200 80" className="w-full h-28 mt-0">
    {/* D attribute explanation:
        M 10,65  -> Start point (left side)
        Q 100,-35 -> Control Point (100 is center, -35 is high up for more bend)
        190,65   -> End point (right side)
    */}
    <path
      id="schoolCurve"
      fill="transparent"
      d="M 10,65 Q 100,-35 190,65" 
    />
    <text className="fill-white font-black uppercase tracking-tight" style={{ fontSize: '10.5px' }}>
      <textPath xlinkHref="#schoolCurve" startOffset="50%" textAnchor="middle">
        {schoolName}
      </textPath>
    </text>
  </svg>
  
  {/* Divider Line - Positioned to not interfere */}
  <div className="h-[1px] w-20 bg-white/20 rounded-full -mt-12"></div>
</div>
          
          <div className="flex-1 flex flex-col items-center px-4 relative">
            {/* Photo Section */}
            <div className="mt-[-40px] mb-3">
              <div className="w-28 h-28 border-[4px] border-white rounded-full overflow-hidden shadow-xl bg-slate-100">
                {student.photo_url ? (
                  <img src={student.photo_url} className="w-full h-full object-cover" alt="Student" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-5xl">
                    {student.full_name[0]}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center w-full">
              <h3 style={{ color: theme.text }} className="font-black text-[15px] uppercase leading-tight">{student.full_name}</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[2px] mt-1">Student</p>
            </div>

            {/* QR Code Section */}
            <div className="mt-auto mb-6 p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
              <QRCodeDisplay value={student.admission_number} size={65} level="H" />
            </div>
          </div>

          <div style={{ backgroundColor: theme.accent }} className="h-3 w-full"></div>
        </div>

        {/* BACK SIDE - Colored based on Class */}
        <div id="id-card-back" 
             style={{ backgroundColor: theme.bg }}
             className="w-[53.98mm] h-[85.6mm] border shadow-2xl rounded-[12px] overflow-hidden flex flex-col p-6 print:shadow-none print:border">
          
          <div style={{ borderLeftColor: theme.accent }} className="border-l-4 pl-3 mb-6">
            <h3 style={{ color: theme.text }} className="font-black text-[12px] uppercase tracking-wider">Student Profile</h3>
            <p className="text-[8px] text-slate-500 uppercase font-bold">Academic Session 2025-26</p>
          </div>
          
          <div className="space-y-4 flex-1">
            <DetailRow label="Admission No" value={student.admission_number} themeColor={theme.text} />
            <DetailRow label="Father Name" value={student.parent_name || 'N/A'} themeColor={theme.text} />
            <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Class" value={student.class} themeColor={theme.text} />
                <DetailRow label="Section" value={student.section} themeColor={theme.text} />
            </div>
            <DetailRow label="Emergency Contact" value={student.parent_contact || 'N/A'} themeColor={theme.text} />
          </div>

          <div className="mt-auto pt-4 border-t border-black/5">
            <p className="text-[7px] text-center italic opacity-70 leading-snug" style={{ color: theme.text }}>
              If found, please return to school office. <br/> 
              <strong>{schoolName}</strong>
            </p>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .shadow-2xl { box-shadow: none !important; }
          @page { size: portrait; margin: 0.5cm; }
        }
      `}</style>
    </div>
  )
}

function DetailRow({ label, value, themeColor }: { label: string, value: string, themeColor: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[7px] uppercase opacity-50 font-black tracking-tighter" style={{ color: themeColor }}>{label}</span>
      <span className="text-[11px] font-bold leading-tight border-b border-black/5 pb-1" style={{ color: themeColor }}>{value}</span>
    </div>
  )
}