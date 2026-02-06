'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { QrCode, Camera, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface ScanResult {
  success: boolean
  message: string
  student?: {
    admission_number: string
    full_name: string
    class: string
    section: string
  }
  status?: string
}

export default function QRScannerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)

  useEffect(() => {
    const sessionIdParam = searchParams.get('session')
    if (sessionIdParam) {
      setSessionId(sessionIdParam)
    }
    setLoading(false)
  }, [searchParams])

  const startScanning = () => {
    setScanning(true)
    setScanResult(null)
  }

  const handleScanResult = (data: string) => {
    // In a real implementation, this would process the QR code data
    // For now, we'll simulate it
    processQRCode(data)
  }

  const processQRCode = async (qrData: string) => {
    setScanning(false)
    setLoading(true)

    try {
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: qrData,
          sessionId: sessionId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setScanResult({
          success: true,
          message: result.message || 'Attendance marked successfully!',
          student: result.student,
          status: result.status,
        })
      } else {
        setScanResult({
          success: false,
          message: result.error || 'Failed to mark attendance',
        })
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: 'An error occurred while processing the QR code',
      })
    } finally {
      setLoading(false)
    }
  }

  // Simulated QR code input (for demo purposes)
  const handleManualInput = () => {
    const token = prompt('Enter QR token (for demo purposes):')
    if (token) {
      handleScanResult(token)
    }
  }

  const handleContinue = () => {
    setScanResult(null)
    setScanning(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">QR Scanner</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionId ? 'Scan student ID cards' : 'Select a session first'}
                </p>
              </div>
            </div>
            {!sessionId && (
              <Button variant="outline" onClick={() => router.push('/teacher')}>
                Select Session
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              Scan Attendance QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sessionId && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No active session selected. Please select an attendance session from the dashboard.
                </AlertDescription>
              </Alert>
            )}

            {scanning && sessionId && (
              <div className="space-y-6">
                {/* Camera View Placeholder */}
                <div className="relative aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4">
                      <div>
                        <Camera className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-sm">Camera access denied</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Please enable camera permissions to use the QR scanner
                        </p>
                      </div>
                    </div>
                  )}
                  {hasCameraPermission === null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                      <Loader2 className="h-12 w-12 animate-spin" />
                    </div>
                  )}
                  {hasCameraPermission === true && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                      <div className="text-center">
                        <QrCode className="h-24 w-24 mx-auto mb-4" />
                        <p className="text-sm">Align QR code within frame</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleManualInput} variant="outline">
                    Manual Input (Demo)
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    For demonstration: Click to manually enter a QR token
                  </p>
                </div>
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                {scanResult.success ? (
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-900 dark:text-green-300">
                      {scanResult.message}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{scanResult.message}</AlertDescription>
                  </Alert>
                )}

                {scanResult.student && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Student</p>
                          <p className="text-lg font-semibold">{scanResult.student.full_name}</p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Admission No.</p>
                            <p className="font-medium">{scanResult.student.admission_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Class</p>
                            <p className="font-medium">
                              {scanResult.student.class} - {scanResult.student.section}
                            </p>
                          </div>
                        </div>
                        {scanResult.status && (
                          <div>
                            <Badge variant={scanResult.status === 'present' ? 'default' : 'secondary'}>
                              {scanResult.status.toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleContinue} className="flex-1">
                    Scan Next
                  </Button>
                  <Button onClick={() => router.back()} variant="outline">
                    Back
                  </Button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Processing...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System
          </p>
        </div>
      </footer>
    </div>
  )
}
