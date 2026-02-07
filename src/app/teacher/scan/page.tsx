import { Suspense } from 'react'
import ScannerClient from './ScannerClient'
import { Loader2 } from 'lucide-react'

// Prevents prerendering errors in build
export const dynamic = 'force-dynamic'

export default function QRScannerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Starting Camera System...</p>
      </div>
    }>
      <ScannerClient />
    </Suspense>
  )
}