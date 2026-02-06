'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { QrCode, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, X } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  const [loading, setLoading] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // 1. Get Session ID from URL
  useEffect(() => {
    const sessionIdParam = searchParams.get('session')
    if (sessionIdParam) {
      setSessionId(sessionIdParam)
    }
  }, [searchParams])

  // 2. Initialize Scanner
  useEffect(() => {
    if (!sessionId || scanResult) return;

    // "reader" is the ID of the div where camera will show
    scannerRef.current = new Html5QrcodeScanner(
      "reader", 
      { fps: 10, qrbox: { width: 250, height: 250 } }, 
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // QR Code detected
        handleQRCodeDetected(decodedText);
      },
      (error) => {
        // Just scanning...
      }
    );

    // CLEANUP: This solves the "stopCamera" error
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
      }
    };
  }, [sessionId, scanResult]);

  const handleQRCodeDetected = async (qrData: string) => {
    // Stop scanner first to avoid multiple scans
    if (scannerRef.current) {
      await scannerRef.current.clear();
    }
    await processQRCode(qrData);
  }

  const processQRCode = async (qrData: string) => {
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

  const handleContinue = () => {
    setScanResult(null) // This will trigger the scanner to restart via useEffect
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-bold">QR Scanner</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/teacher')}><X className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6" /> Scan Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sessionId && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>No active session selected.</AlertDescription>
              </Alert>
            )}

            {/* THE SCANNER DIV */}
            {sessionId && !scanResult && !loading && (
              <div className="overflow-hidden rounded-lg border-2 border-dashed border-slate-300">
                <div id="reader" className="w-full"></div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Verifying Student...</p>
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                <Alert className={scanResult.success ? "bg-green-50" : "bg-red-50"}>
                  {scanResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <AlertDescription>{scanResult.message}</AlertDescription>
                </Alert>

                {scanResult.student && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="font-bold text-lg">{scanResult.student.full_name}</p>
                    <p className="text-sm">ID: {scanResult.student.admission_number}</p>
                    <Badge>{scanResult.status?.toUpperCase()}</Badge>
                  </div>
                )}

                <Button onClick={handleContinue} className="w-full">Scan Next Student</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}