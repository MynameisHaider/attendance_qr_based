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
  const supabase = createClient()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(false)
  const [cameraCount, setCameraCount] = useState<number>(0)

  useEffect(() => {
    const sessionIdParam = searchParams.get('session')
    if (sessionIdParam) {
      setSessionId(sessionIdParam)
    }
    setLoading(false)
  }, [searchParams])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const requestCameraAccess = async () => {
    try {
      setScanResult(null)
      setErrorMessage('')
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameraCount(videoDevices.length)

      if (videoDevices.length === 0) {
        setErrorMessage('No camera found on this device.')
        return
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: useFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', '')
        videoRef.current.play()
        
        videoRef.current.onloadedmetadata = () => {
          setHasCameraAccess(true)
          startScanning()
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      setHasCameraAccess(false)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission denied. Please enable camera access in your browser settings.')
      } else {
        setErrorMessage(`Camera error: ${error.message || error.name}`)
      }
    }
  }

  useEffect(() => {
    requestCameraAccess()
    return () => stopCamera()
  }, [useFrontCamera])

 const startScanning = () => {
  if (!canvasRef.current || !videoRef.current) return
  const canvas = canvasRef.current
  const video = videoRef.current
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) // Performance booster
  if (!ctx) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // Scanner instance ki zaroorat nahi, sirf static decoder use karenge
  const html5QrCode = new Html5Qrcode("reader-hidden"); // Ek dummy hidden div ID chahiye hogi

  scanIntervalRef.current = setInterval(async () => {
    if (!scanning) return
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // html5-qrcode canvas se direct scan karne ka behtar tareeqa deta hai
      // Lekin agar aap image data use karna chahte hain:
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      // scanImage method use karein (ye Promise return karta hai)
      const qrCodeInstance = new Html5Qrcode("reader-hidden-id"); 
      // Note: Humne neeche UI mein ek hidden div add karni hai
      
      const decodedText = await qrCodeInstance.scanFileV2(canvas.toDataURL());
      if (decodedText) {
        handleQRCodeDetected(decodedText.decodedText);
      }
    } catch (error) {
      // No QR code found, ignore error
    }
  }, 300); // 300ms interval behtar hai battery ke liye
}

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setScanning(false)
  }

  const resumeScanning = () => {
    setScanning(true)
    startScanning()
  }

  const handleQRCodeDetected = async (qrData: string) => {
    stopScanning()
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
        setScanResult({
          success: true,
          message: result.message || 'Attendance marked successfully!',
          student: result.student,
          status: result.status,
        })
      } else {
        setScanResult({ success: false, message: result.error || 'Failed to mark attendance' })
      }
    } catch (error) {
      setScanResult({ success: false, message: 'An error occurred while processing the QR code' })
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchCamera = () => {
    setUseFrontCamera(!useFrontCamera)
    stopCamera()
  }

  const handleManualInput = () => {
    const admissionNumber = prompt('Enter Admission Number (for demo purposes):')
    if (admissionNumber) {
      processQRCode(admissionNumber)
    }
  }

  const handleContinue = () => {
    setScanResult(null)
    resumeScanning()
  }

  const handleBack = () => {
    stopCamera()
    router.back()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 text-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold">QR Scanner</h1>
              <p className="text-sm text-muted-foreground">{sessionId ? 'Scan student ID cards' : 'Select a session first'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/teacher')}><X className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="h-6 w-6" /> Scan Attendance QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!sessionId && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>No active session selected.</AlertDescription></Alert>}
            {sessionId && errorMessage && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{errorMessage}</AlertDescription></Alert>}
            
            {sessionId && scanning && hasCameraAccess && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                   <video ref={videoRef} className="w-full h-full object-cover rounded-lg" playsInline muted
  autoPlay />
                   <canvas ref={canvasRef} className="hidden" />
                   <div className="absolute inset-0 pointer-events-none border-4 border-white/20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-1 bg-red-500/80 animate-pulse" />
                      </div>
                   </div>
                </div>
				<div id="reader-hidden-id" className="hidden"></div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={handleSwitchCamera} disabled={cameraCount <= 1}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Switch Camera ({cameraCount})
                  </Button>
                </div>
                <Button onClick={handleManualInput} variant="outline" className="w-full">Manual Input (Demo)</Button>
              </div>
            )}

            {!scanning && scanResult && (
              <div className="space-y-4 text-foreground">
                <Alert className={scanResult.success ? "bg-green-50" : "bg-red-50"}>
                  {scanResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <AlertDescription>{scanResult.message}</AlertDescription>
                </Alert>
                {scanResult.student && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{scanResult.student.full_name}</p>
                    <p>ID: {scanResult.student.admission_number}</p>
                    <Badge className="mt-2">{scanResult.status?.toUpperCase()}</Badge>
                  </div>
                )}
                <Button onClick={handleContinue} className="w-full">Scan Next</Button>
              </div>
            )}

            {loading && <div className="text-center py-12 text-foreground"><Loader2 className="h-12 w-12 animate-spin mx-auto" /><p>Processing...</p></div>}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}