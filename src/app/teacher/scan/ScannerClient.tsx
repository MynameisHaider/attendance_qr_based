'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { QrCode, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

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

export default function ScannerClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(false)

  // 1. Initialize Session
  useEffect(() => {
    const sessionIdParam = searchParams.get('session')
    if (sessionIdParam) setSessionId(sessionIdParam)
  }, [searchParams])

  // 2. Beep Sound Function
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, audioCtx.currentTime)
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.1)
    } catch (e) { console.error("Audio error", e) }
  }

  // 3. Start/Stop Scanner Engine
  useEffect(() => {
    if (!sessionId || !scanning || scanResult) return

    const scanner = new Html5Qrcode("reader")
    html5QrCodeRef.current = scanner

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0 // Square box looks better on mobile
    }

    scanner.start(
      { facingMode: useFrontCamera ? "user" : "environment" },
      config,
      (decodedText) => {
        handleQRCodeDetected(decodedText)
      },
      (error) => { /* Scanning... */ }
    )
    .then(() => setHasCameraAccess(true))
    .catch((err) => {
      console.error(err)
      setErrorMessage("Camera access failed. Please ensure you are on HTTPS and have granted permissions.")
    })

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error(e))
      }
    }
  }, [sessionId, scanning, useFrontCamera, scanResult])

  const handleQRCodeDetected = async (qrData: string) => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop()
    }
    setScanning(false)
    await processQRCode(qrData)
  }

  const processQRCode = async (qrData: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admissionNumber: qrData,
          sessionId: sessionId,
        }),
      })
      const result = await response.json()
      
      if (response.ok) {
        playBeep()
        setScanResult({
          success: true,
          message: result.message || 'Attendance marked!',
          student: result.student,
          status: result.status,
        })
        // Auto-restart after 5 seconds on success
        setTimeout(() => handleContinue(), 5000)
      } else {
        setScanResult({ success: false, message: result.error || 'Invalid QR Code' })
        // Auto-restart after 2 seconds on failure
        setTimeout(() => handleContinue(), 2000)
      }
    } catch (error) {
      setScanResult({ success: false, message: 'Network Error' })
      setTimeout(() => handleContinue(), 2000)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    setScanResult(null)
    setScanning(true)
  }

  const handleSwitchCamera = () => {
    setUseFrontCamera(!useFrontCamera)
  }

  const handleBack = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop()
    }
    router.back()
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-foreground">
            <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold">Attendance Scan</h1>
              <p className="text-xs text-muted-foreground">{sessionId ? 'Ready to scan' : 'No Session'}</p>
            </div>
          </div>
          <X className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => router.push('/teacher')} />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center">
        <Card className="w-full max-w-md border-none shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {errorMessage && (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{errorMessage}</AlertDescription></Alert>
            )}

            {/* Scanner Viewport */}
            {sessionId && scanning && (
              <div className="space-y-4">
                <div id="reader" className="overflow-hidden rounded-2xl bg-black aspect-square"></div>
                <Button variant="outline" className="w-full py-6" onClick={handleSwitchCamera}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Flip Camera
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-10 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-foreground font-medium">Verifying Record...</p>
              </div>
            )}

            {/* Scan Results (Auto-hides) */}
            {!scanning && scanResult && !loading && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className={`p-6 rounded-2xl text-center ${scanResult.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {scanResult.success ? 
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" /> : 
                    <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
                  }
                  <p className={`font-bold text-lg ${scanResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {scanResult.message}
                  </p>
                </div>

                {scanResult.student && (
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Student Details</p>
                    <p className="text-xl font-bold text-foreground">{scanResult.student.full_name}</p>
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-muted-foreground">ID: {scanResult.student.admission_number}</p>
                      <Badge variant="outline">{scanResult.student.class}-{scanResult.student.section}</Badge>
                    </div>
                  </div>
                )}
                
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  Restarting scanner automatically...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}