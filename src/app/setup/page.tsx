'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Check, ArrowLeft, Database, Key, FolderOpen, AlertCircle } from 'lucide-react'
import Link from 'next/link'

//import sqlSchema from '../../../supabase-schema.sql?raw'
const sqlSchema = "-- SQL Schema loaded manually";

export default function SetupPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret for QR Code Signing
QR_CODE_SECRET=generate_a_random_secret_key_here`

  const storageInstructions = `# Creating the Student Photos Bucket

1. Go to your Supabase Dashboard
2. Navigate to Storage in the left sidebar
3. Click "New Bucket"
4. Enter bucket name: student-photos
5. Set access to: Private (not public)
6. Click "Create Bucket"

# Enable Public Access for Signed URLs (Optional)

After creating the bucket, run this SQL in the SQL Editor:

\`\`\`sql
-- Allow authenticated users to access storage objects
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA storage TO authenticated;
\`\`\`
`

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Setup Guide</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Introduction */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground">Supabase Configuration</h2>
            <p className="text-lg text-muted-foreground">
              Follow these steps to set up your Supabase project for the QR Attendance System.
            </p>
          </div>

          {/* Alert Card */}
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-amber-900 dark:text-amber-300">
              <p>• Complete all setup steps before using the application</p>
              <p>• Keep your service role key secret - never expose it on the client side</p>
              <p>• Generate a strong QR_CODE_SECRET for production use</p>
              <p>• The SQL schema includes RLS policies for security</p>
            </CardContent>
          </Card>

          {/* Setup Steps */}
          <Tabs defaultValue="step1" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="step1">Step 1</TabsTrigger>
              <TabsTrigger value="step2">Step 2</TabsTrigger>
              <TabsTrigger value="step3">Step 3</TabsTrigger>
              <TabsTrigger value="step4">Step 4</TabsTrigger>
            </TabsList>

            {/* Step 1: Create Project */}
            <TabsContent value="step1" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      1
                    </span>
                    Create Supabase Project
                  </CardTitle>
                  <CardDescription>
                    Set up a new Supabase project to host your database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        1.1
                      </div>
                      <div>
                        <p className="font-medium">Visit Supabase</p>
                        <p className="text-sm text-muted-foreground">
                          Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a> and sign in or create an account
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        1.2
                      </div>
                      <div>
                        <p className="font-medium">Create New Project</p>
                        <p className="text-sm text-muted-foreground">
                          Click "New Project" and configure your database
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        1.3
                      </div>
                      <div>
                        <p className="font-medium">Choose Database Region</p>
                        <p className="text-sm text-muted-foreground">
                          Select a region close to your users for better performance
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        1.4
                      </div>
                      <div>
                        <p className="font-medium">Set Database Password</p>
                        <p className="text-sm text-muted-foreground">
                          Use a strong password and save it securely
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: SQL Schema */}
            <TabsContent value="step2" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-6 w-6" />
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      2
                    </span>
                    Run SQL Schema
                  </CardTitle>
                  <CardDescription>
                    Execute the SQL script to create all tables, RLS policies, and functions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        2.1
                      </div>
                      <div>
                        <p className="font-medium">Open SQL Editor</p>
                        <p className="text-sm text-muted-foreground">
                          In your Supabase dashboard, navigate to SQL Editor
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        2.2
                      </div>
                      <div>
                        <p className="font-medium">Copy the SQL Schema</p>
                        <p className="text-sm text-muted-foreground">
                          Copy the entire SQL script from the code block below
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        2.3
                      </div>
                      <div>
                        <p className="font-medium">Paste and Execute</p>
                        <p className="text-sm text-muted-foreground">
                          Paste the SQL into the editor and click "Run"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">SQL Schema</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(sqlSchema, 'schema')}
                        className="gap-2"
                      >
                        {copied === 'schema' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied === 'schema' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px] w-full rounded-md border">
                      <pre className="p-4 text-xs font-mono">
                        <code>{sqlSchema}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 3: Environment Variables */}
            <TabsContent value="step3" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-6 w-6" />
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      3
                    </span>
                    Configure Environment Variables
                  </CardTitle>
                  <CardDescription>
                    Add Supabase credentials to your application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        3.1
                      </div>
                      <div>
                        <p className="font-medium">Get API Keys</p>
                        <p className="text-sm text-muted-foreground">
                          Go to Project Settings → API to get your URL and keys
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        3.2
                      </div>
                      <div>
                        <p className="font-medium">Generate QR Secret</p>
                        <p className="text-sm text-muted-foreground">
                          Generate a random string for signing QR codes (e.g., using OpenSSL)
                        </p>
                        <code className="block mt-2 p-2 bg-muted rounded text-xs">
                          openssl rand -base64 32
                        </code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        3.3
                      </div>
                      <div>
                        <p className="font-medium">Update .env.local</p>
                        <p className="text-sm text-muted-foreground">
                          Copy the template below to your .env.local file and fill in the values
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Environment Template</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(envTemplate, 'env')}
                        className="gap-2"
                      >
                        {copied === 'env' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied === 'env' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px] w-full rounded-md border">
                      <pre className="p-4 text-xs font-mono">
                        <code>{envTemplate}</code>
                      </pre>
                    </ScrollArea>
                  </div>

                  <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-200">Security Note</p>
                      <p className="text-amber-800 dark:text-amber-300">
                        • The <code className="bg-muted px-1 rounded">SERVICE_ROLE_KEY</code> has full access to your database - keep it secure!
                      </p>
                      <p className="text-amber-800 dark:text-amber-300">
                        • Never commit your .env.local file to version control
                      </p>
                      <p className="text-amber-800 dark:text-amber-300">
                        • Use environment variables in production deployments
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 4: Storage Bucket */}
            <TabsContent value="step4" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-6 w-6" />
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      4
                    </span>
                    Create Storage Bucket
                  </CardTitle>
                  <CardDescription>
                    Set up private storage for student photos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        4.1
                      </div>
                      <div>
                        <p className="font-medium">Navigate to Storage</p>
                        <p className="text-sm text-muted-foreground">
                          In Supabase dashboard, click "Storage" in the left sidebar
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        4.2
                      </div>
                      <div>
                        <p className="font-medium">Create New Bucket</p>
                        <p className="text-sm text-muted-foreground">
                          Click "New Bucket" button
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                        4.3
                      </div>
                      <div>
                        <p className="font-medium">Configure Bucket</p>
                        <p className="text-sm text-muted-foreground">
                          Name: <code className="bg-muted px-1 rounded">student-photos</code>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Access: Select "Private" (not public)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Optional: Enable Storage Permissions</p>
                    <p className="text-sm text-muted-foreground">
                      Run this SQL to allow authenticated users to access storage objects
                    </p>
                    <div className="flex items-center justify-between">
                      <ScrollArea className="h-[200px] w-full rounded-md border">
                        <pre className="p-4 text-xs font-mono">
                          <code>{storageInstructions}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(storageInstructions, 'storage')}
                      className="gap-2"
                    >
                      {copied === 'storage' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied === 'storage' ? 'Copied!' : 'Copy SQL'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Next Steps */}
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200">Setup Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-green-900 dark:text-green-300">
                Once you've completed all four steps, you can start using the application:
              </p>
              <div className="flex gap-2">
                <Link href="/register">
                  <Button>Create Admin Account</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            QR-Based School Attendance System • Setup Guide
          </p>
        </div>
      </footer>
    </div>
  )
}
