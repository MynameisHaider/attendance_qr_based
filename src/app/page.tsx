'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, Users, FileSpreadsheet, Shield, Clock, Database } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <QrCode className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Attendance QR</h1>
                <p className="text-sm text-muted-foreground">School Attendance System</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/setup">
                <Button>Setup Guide</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Text */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Smart QR-Based School Attendance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A secure, real-time attendance tracking system using QR codes with JWT verification,
              built on Next.js and Supabase.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <QrCode className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Secure QR Codes</CardTitle>
                <CardDescription>
                  Cryptographically signed JWT tokens prevent fake QR code creation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Student Management</CardTitle>
                <CardDescription>
                  Bulk upload students via Excel with automatic duplicate handling
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileSpreadsheet className="h-12 w-12 text-primary mb-2" />
                <CardTitle>ID Card Generation</CardTitle>
                <CardDescription>
                  Generate and print professional ID cards with QR codes in PDF format
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Row-Level Security</CardTitle>
                <CardDescription>
                  Role-based access control with comprehensive audit logging
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Real-Time Updates</CardTitle>
                <CardDescription>
                  Live attendance tracking with instant teacher dashboard updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Time-Bound Sessions</CardTitle>
                <CardDescription>
                  Automated attendance windows with absent marking
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Quick Start Section */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6" />
                Quick Setup Required
              </CardTitle>
              <CardDescription>
                Before using this system, you need to configure Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Create a Supabase Project</p>
                    <p className="text-sm text-muted-foreground">
                      Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a> and create a new project
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Run the SQL Schema</p>
                    <p className="text-sm text-muted-foreground">
                      Open the SQL Editor in Supabase and run the schema from our setup guide
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Configure Environment Variables</p>
                    <p className="text-sm text-muted-foreground">
                      Add your Supabase URL and keys to your environment file
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Create Storage Bucket</p>
                    <p className="text-sm text-muted-foreground">
                      Create a private bucket named <code className="bg-muted px-1 rounded">student-photos</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/setup" className="flex-1">
                  <Button className="w-full">View Detailed Setup Guide</Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button variant="outline" className="w-full">Create Account</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              QR-Based School Attendance System • Built with Next.js & Supabase
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/admin" className="hover:text-primary">Admin</Link>
              <Link href="/teacher" className="hover:text-primary">Teacher</Link>
              <Link href="/setup" className="hover:text-primary">Setup</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
