# 🎓 QR-Based School Attendance System - Complete Setup Guide

This guide will walk you through setting up the complete school attendance system from scratch.

---

## 📋 Prerequisites

Before starting, ensure you have:
- Node.js (v18 or higher)
- Bun or npm installed
- A Supabase account (free tier is sufficient)
- Basic knowledge of SQL and web development

---

## 🚀 Step 1: Install Dependencies

All dependencies are already installed. If you need to reinstall:

```bash
bun install
```

Required packages:
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side Supabase auth
- `jose` - JWT signing for QR codes
- `qrcode` - QR code generation
- `react-qr-code` - React QR component
- `xlsx` - Excel parsing
- `jspdf` - PDF generation
- `html2canvas` - HTML to canvas conversion

---

## 🔐 Step 2: Set Up Supabase Project

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Enter project details:
   - **Name**: School Attendance System
   - **Database Password**: Generate and save securely
   - **Region**: Choose closest to your users
5. Wait for project to initialize (2-3 minutes)

### 2.2 Get API Credentials

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL** (starts with `https://xxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

**⚠️ IMPORTANT**: Keep the service_role key secure - it has full database access!

### 2.3 Generate QR Code Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output - you'll need it for the `.env.local` file.

---

## 📝 Step 3: Configure Environment Variables

### 3.1 Create/Update `.env.local` file

The file should already exist in the project root. Update it with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret for QR Code Signing
QR_CODE_SECRET=your_generated_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=School Attendance System
```

### 3.2 Verify Environment

Ensure the file is in the project root and contains all required values.

---

## 🗄️ Step 4: Run SQL Schema

### 4.1 Open SQL Editor

In your Supabase dashboard:
1. Click **SQL Editor** in the left sidebar
2. Click **"New Query"**

### 4.2 Run Schema Script

1. Open `supabase-schema.sql` from the project root
2. Copy the entire content
3. Paste into the SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)

This will create:
- **Tables**: profiles, students, attendance_sessions, attendance_logs, audit_logs
- **Views**: attendance_report, daily_attendance_summary
- **Functions**: is_session_active(), mark_absent_students(), etc.
- **Triggers**: Automatic timestamp updates and audit logging
- **RLS Policies**: Role-based access control

### 4.3 Verify Schema

Click **Database → Table Editor** and verify all tables were created.

---

## 📁 Step 5: Create Storage Bucket

### 5.1 Create Bucket

1. Go to **Storage** in the left sidebar
2. Click **"New Bucket"**
3. Configure:
   - **Name**: `student-photos`
   - **Public/Private**: Select **Private**
   - **File Size Limit**: Keep default (50MB)
4. Click **Create Bucket**

### 5.2 Configure Bucket Policies

In the **Storage** section for `student-photos`:

1. Click **"New Policy"**
2. Select **For full customization** template
3. Configure for `Authenticated` users:
   - **Allowed Operations**: INSERT, SELECT
   - **Target**: All objects
4. Save the policy

---

## 👤 Step 6: Create Initial Users

### 6.1 Create Admin User

1. Go to **Authentication → Users** in Supabase
2. Click **"Add User"** → **"Create New User"**
3. Enter:
   - **Email**: admin@school.edu
   - **Password**:*XdBe56$NCB-yMm
4. Click **"Create User"**

-------------------------------
### 6.1a Create Admin User

1. Go to **Authentication → Users** in Supabase
2. Click **"Add User"** → **"Create New User"**
3. Enter:
   - **Email**: admin@ghss.edu
   - **Password**:admin123
4. Click **"Create User"**


### 6.2 Create Profile in SQL

Run this SQL to create the admin profile:

```sql
INSERT INTO profiles (id, full_name, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@school.edu'),
  'Admin User',
  'admin@school.edu',
  'admin'
);
```

### 6.3 Create Teacher User

Repeat the process for teachers, changing the role to `'teacher'`.
```sql
INSERT INTO profiles (id, full_name, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'teacher@ghss.edu'),
  'teacher User',
  'teacher@school.edu',
  'teacher'
);

```


---

## 🏃 Step 7: Start Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:3000`

---

## 📱 Step 8: Test the Application

### 8.1 Access the App

1. Open `http://localhost:3000` in your browser
2. You should see the landing page

### 8.2 Register/Login

1. Click **"Login"**
2. Log in with your admin credentials
3. You'll be redirected to the Admin Dashboard

### 8.3 Create Attendance Session

1. Go to **Admin → Sessions**
2. Click **"Create Session"**
3. Fill in:
   - Class: 10
   - Section: A
   - Date: Today
   - Start Time: 09:00
   - End Time: 09:30
4. Click **"Create Session"**

### 8.4 Upload Students (Optional)

1. Go to **Admin → Students**
2. Click **"Bulk Upload"**
3. Download the template
4. Fill in student data
5. Upload the file

### 8.5 Generate ID Cards

1. From student list, click the QR icon for a student
2. View the ID card
3. Click **"Download PDF"** or **"Print"**

### 8.6 Test Attendance Marking

1. Go to **Teacher → Scan QR**
2. Enter a QR token (or use actual QR scanner)
3. View the attendance result

---

## 🔒 Security Checklist

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] SQL schema applied
- [ ] RLS policies enabled
- [ ] Storage bucket created (private)
- [ ] QR code secret generated (strong, unique)
- [ ] Service role key kept secure
- [ ] Initial admin user created

---

## 📊 Architecture Overview

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Supabase Auth
- **State**: React hooks + Supabase client

### Backend
- **Database**: Supabase PostgreSQL
- **API**: Next.js API Routes
- **Storage**: Supabase Storage (private bucket)
- **Realtime**: Supabase Realtime

### Security Features
- **Row Level Security (RLS)** on all tables
- **JWT-signed QR codes** with expiration
- **Audit logging** for all manual changes
- **Time-bound sessions** with automatic locking
- **Duplicate prevention** using unique constraints

---

## 📂 Project Structure

```
/home/z/my-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard
│   │   │   ├── sessions/      # Session management
│   │   │   └── students/      # Student management
│   │   ├── teacher/            # Teacher dashboard
│   │   │   └── scan/         # QR scanner
│   │   ├── api/               # API routes
│   │   │   ├── attendance/    # Attendance APIs
│   │   │   ├── qr/           # QR generation
│   │   │   └── upload/        # File uploads
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── setup/             # Setup guide
│   ├── components/            # UI components
│   ├── lib/
│   │   ├── supabase/         # Supabase clients
│   │   ├── db.ts             # Database client (if needed)
│   │   ├── qrcode.ts         # QR code utilities
│   │   └── utils.ts          # Helper functions
│   └── types/               # TypeScript types
├── public/                   # Static assets
│   ├── manifest.json         # PWA manifest
│   └── sw.js               # Service worker
├── supabase-schema.sql      # Database schema
├── .env.local               # Environment variables
├── package.json             # Dependencies
└── worklog.md             # Development log
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" errors
**Solution**: Check your `.env.local` file has correct Supabase URL and keys

### Issue: RLS policy errors
**Solution**: Ensure you're logged in and have the correct role in the `profiles` table

### Issue: QR code not scanning
**Solution**: Verify QR code is generated correctly and JWT secret matches between generation and verification

### Issue: Storage upload fails
**Solution**: Ensure storage bucket exists and user has proper permissions

### Issue: Session not active
**Solution**: Check current time is within session start/end time and session status is 'active'

---

## 🚀 Deployment Guide (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure environment variables in Vercel dashboard
5. Click **Deploy**

### 3. Update Environment Variables in Vercel

Add the same variables from `.env.local` to Vercel's project settings.

---

## 📚 API Documentation

### QR Code Generation

**GET `/api/qr/generate?admissionNumber=xxx`**
- Returns: SVG QR code image
- Validity: 1 year

**GET `/api/qr/token?admissionNumber=xxx`**
- Returns: JSON with token and student info
- Used for ID card generation

### Attendance Marking

**POST `/api/attendance/mark`**
```json
{
  "qrToken": "jwt_token_here",
  "sessionId": "optional_session_id"
}
```

### Photo Upload

**POST `/api/upload/photo`**
- Content-Type: multipart/form-data
- Body: file, admissionNumber
- Validates: File type (JPEG/PNG/WebP), Size (<5MB)

### Manual Override

**POST `/api/attendance/override`**
```json
{
  "studentId": "admission_number",
  "sessionId": "session_id",
  "status": "present|absent|late|excused",
  "reason": "optional_reason"
}
```

---

## ✅ Testing Checklist

### Authentication
- [ ] Can register new user
- [ ] Can login with valid credentials
- [ ] Redirect to correct dashboard based on role
- [ ] Logout works correctly

### Student Management
- [ ] Can bulk upload students via Excel
- [ ] Can view student list
- [ ] Can search students
- [ ] Can delete students
- [ ] Can upload student photos

### Session Management
- [ ] Can create attendance session
- [ ] Can view session list
- [ ] Can activate/deactivate sessions
- [ ] Can delete sessions

### QR & Attendance
- [ ] Can generate QR codes for students
- [ ] Can view ID cards
- [ ] Can download ID card PDF
- [ ] Can mark attendance via QR scan
- [ ] Time window enforcement works
- [ ] Duplicate prevention works

### Reports
- [ ] Can filter reports by date range
- [ ] Can filter by class/section
- [ ] Can export to Excel
- [ ] Summary statistics are accurate

---

## 🎉 Conclusion

Your QR-Based School Attendance System is now fully set up and ready to use!

### Next Steps

1. Create test data (students, sessions)
2. Test all features thoroughly
3. Deploy to production
4. Train teachers and admin users
5. Monitor and iterate based on feedback

### Support

For issues or questions:
- Check the setup guide at `/setup` in the app
- Review the Supabase dashboard logs
- Check the browser console for errors

---

**🎓 Happy Tracking! 🎓**
