# QR-Based School Attendance System

A production-ready, secure QR code-based school attendance system built with Next.js 16 and Supabase.

## 🎯 Features Implemented

### ✅ Core Infrastructure
- **Supabase Integration**: Complete PostgreSQL database with RLS policies
- **Authentication**: Secure user authentication using Supabase Auth with role-based access
- **Middleware**: Route protection with automatic session management
- **QR Code Security**: JWT-signed QR codes with expiration to prevent fraud

### ✅ User Interfaces
- **Landing Page**: Professional homepage with feature showcase and setup guide
- **Setup Guide**: Step-by-step instructions for configuring Supabase
- **Login/Register**: User authentication pages with role selection
- **Admin Dashboard**: Overview, Students, Sessions, and Reports tabs
- **Teacher Dashboard**: Scan QR, Sessions, and Attendance tabs
- **QR Scanner**: Teacher interface for scanning student ID cards

### ✅ Student Management
- **Bulk Upload**: Excel file upload with preview and upsert logic
- **Student List**: Searchable list with filtering
- **Template Download**: Excel template for proper data format
- **Progress Tracking**: Real-time upload progress indicator

### ✅ Attendance System
- **Time-Bound Sessions**: Attendance windows with start/end times
- **QR Validation**: Server-side JWT verification for security
- **Duplicate Prevention**: Composite unique keys prevent double entries
- **Status Tracking**: Present, Absent, Late, Excused statuses
- **Audit Logging**: All manual changes are tracked

### ✅ Security Features
- **RLS Policies**: Row-level security on all tables
- **Role-Based Access**: Admins have full access, Teachers limited to assigned classes
- **Secure QR Codes**: Cryptographically signed with expiration
- **Audit Trail**: Complete logging of all manual changes

## 📋 Database Schema

### Tables
- `profiles`: User profiles linked to auth.users
- `students`: Student records with admission_number as primary key
- `attendance_sessions`: Time-bound attendance sessions
- `attendance_logs`: Individual attendance records
- `audit_logs`: Change history for manual overrides

### Views
- `attendance_report`: Combined view with student and session details
- `daily_attendance_summary`: Daily attendance statistics

### Functions
- `is_session_active()`: Check if session is within time window
- `mark_absent_students()`: Automatic absent marking after session ends
- `get_student_photo_url()`: Helper for photo URLs
- `is_attendance_marked()`: Check if student already marked attendance

## 🚀 Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the database to be ready

### 2. Run SQL Schema
1. Open the SQL Editor in Supabase
2. Copy the schema from `supabase-schema.sql`
3. Execute the script to create tables, views, functions, and RLS policies

### 3. Create Storage Bucket
1. Go to Storage in Supabase
2. Create a new bucket named `student-photos`
3. Set access to **Private** (not public)

### 4. Configure Environment Variables
Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
QR_CODE_SECRET=generate_a_random_secret_key_here
```

Generate a secure QR_CODE_SECRET:
```bash
openssl rand -base64 32
```

### 5. Run the Application
```bash
bun install
bun run dev
```

Visit `http://localhost:3000` to see the application.

## 📱 Usage Guide

### For Admins

1. **Register**: Create an admin account at `/register`
2. **Setup**: Follow the setup guide at `/setup`
3. **Upload Students**: Use bulk upload at `/admin/students/upload`
4. **Create Sessions**: Set up attendance sessions with time windows
5. **Generate ID Cards**: Create printable ID cards with QR codes

### For Teachers

1. **Register**: Create a teacher account at `/register`
2. **Select Session**: Choose an active attendance session
3. **Scan QR Codes**: Point camera at student ID cards
4. **View Attendance**: See real-time attendance statistics

### For Students

1. **Receive ID Card**: Get printed ID card with QR code
2. **Show ID Card**: Present to teacher during attendance
3. **Scan**: Teacher scans QR code to mark attendance

## 🔐 Security Features

### QR Code Security
- QR codes contain JWT tokens, not plain admission numbers
- Tokens are signed with a secret key
- Tokens have expiration dates
- Server verifies signature before marking attendance

### Database Security
- Row-Level Security (RLS) on all tables
- Admins have full access
- Teachers can only access their assigned classes
- Public access blocked

### Audit Logging
- All manual attendance changes are logged
- Includes who made the change, when, and why
- Previous and new status tracked

## 📊 API Endpoints

### Attendance
- `POST /api/attendance/mark` - Mark attendance with QR code

### Authentication
- Protected routes use Supabase Auth middleware
- Role-based access control enforced

## 🎨 Design Features

- Responsive design (mobile-first)
- Dark mode support
- shadcn/ui components
- Smooth animations
- Accessible (ARIA compliant)
- Sticky footer
- Loading states
- Error handling

## 📦 Technologies Used

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with @supabase/ssr
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **QR Codes**: jose (JWT), qrcode, react-qr-code
- **Excel**: xlsx
- **PDF**: jspdf, html2canvas
- **Icons**: Lucide React

## 🔮 Future Enhancements

- [ ] Real-time attendance updates with Supabase Realtime
- [ ] PDF ID card generation with student photos
- [ ] Excel export for attendance reports
- [ ] Session creation UI
- [ ] Manual attendance override UI
- [ ] Parent portal for viewing child attendance
- [ ] Email/SMS notifications for parents
- [ ] Attendance analytics and charts
- [ ] Multi-school support
- [ ] PWA manifest and service worker

## 📝 Notes

### Excel Template Format
The bulk upload expects these columns:
- `admission_number` (required)
- `full_name` (required)
- `class` (required)
- `section` (required)
- `date_of_birth` (optional)
- `gender` (optional)
- `parent_name` (optional)
- `parent_contact` (optional)
- `address` (optional)

### Time Window Enforcement
- Attendance can only be marked within session time window
- Students arriving >10 minutes late are marked as "Late"
- Sessions automatically close after end time
- Unmarked students are auto-marked "Absent"

## 📄 License

This is a project for educational and production use.

## 🤝 Support

For issues and questions, refer to the setup guide at `/setup` in the application.
