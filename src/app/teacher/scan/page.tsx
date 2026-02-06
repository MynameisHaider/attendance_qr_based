'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient();
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { QrCode, Camera, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react'
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

  // Request camera access and start scanning
  useEffect(() => {
    requestCameraAccess()
    return () => stopCamera()
  }, [useFrontCamera])

  const requestCameraAccess = async () => {
    try {
      setScanResult(null)
      setErrorMessage('')
      
      // Get camera devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameraCount(videoDevices.length)

      if (videoDevices.length === 0) {
        setErrorMessage('No camera found on this device.')
        return
      }

      // Request camera stream
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
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera found on this device.')
      } else {
        setErrorMessage(`Camera error: ${error.message || error.name}`)
      }
    }
  }

  const startScanning = () => {
    if (!canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Start scanning interval
    scanIntervalRef.current = setInterval(() => {
      if (!scanning) return

      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // Try to decode QR code
        const code = decode(imageData.data, imageData.width, imageData.height)
        
        if (code) {
          // QR code found!
          handleQRCodeDetected(code)
          stopScanning()
        }
      } catch (error) {
        // No QR code in this frame, continue
      }
    }, 200) // Scan every 200ms
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

  const handleSwitchCamera = () => {
    setUseFrontCamera(!useFrontCamera)
    stopCamera()
  }

  const handleManualInput = () => {
    const token = prompt('Enter QR token (for demo purposes):')
    if (token) {
      processQRCode(token)
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
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">QR Scanner</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionId ? 'Scan student ID cards' : 'Select a session first'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/teacher')}>
              <X className="h-4 w-4" />
            </Button>
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

            {sessionId && errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {sessionId && !errorMessage && !hasCameraAccess && !scanning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Camera access is required to scan QR codes. Please grant camera permission.
                </AlertDescription>
              </Alert>
            )}

            {sessionId && scanning && hasCameraAccess && (
              <div className="space-y-4">
                {/* Video and Canvas (hidden from view) */}
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="hidden"
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>

                {/* Camera View */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {/* Scan frame overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 right-4 bottom-4">
                      <div className="relative w-full h-full">
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-xl" />
                        
                        {/* Instructions */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full">
                          <p className="text-white text-sm font-medium">
                            {useFrontCamera ? 'Front Camera' : 'Back Camera'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Scanning line */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-1 bg-red-500/80 animate-pulse" />
                    </div>
                  </div>

                  {/* Center target area */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/30 rounded-full" />
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchCamera}
                    disabled={cameraCount <= 1}
                    type="button"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Switch Camera
                    <span className="text-xs text-muted-foreground ml-2">
                      ({cameraCount} available)
                    </span>
                  </Button>
                </div>

                {/* Manual Input (for demo/testing) */}
                <div className="border-t pt-4">
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleManualInput} variant="outline">
                      Manual Input (Demo)
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      For demonstration: Click to manually enter a QR token
                    </p>
                  </div>
                </div>
              </div>
            )}

            {sessionId && !scanning && scanResult && (
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
                            <Badge
                              variant={scanResult.status === 'present' ? 'default' : 'secondary'}
                            >
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
                  <Button onClick={handleBack} variant="outline" className="flex-1">
                    Back
                  </Button>
                </div>
              </div>
            )}

            {sessionId && loading && (
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