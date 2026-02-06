-- ============================================
-- QR Code Based School Attendance System
-- Supabase Schema Setup
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE session_status AS ENUM ('scheduled', 'active', 'completed');
CREATE TYPE audit_action AS ENUM ('manual_attendance', 'manual_override', 'leave_marking', 'system_auto');

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'teacher',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Students table
CREATE TABLE students (
    admission_number TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    parent_name TEXT,
    parent_contact TEXT,
    address TEXT,
    photo_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Attendance sessions table
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status session_status NOT NULL DEFAULT 'scheduled',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT unique_class_section_date UNIQUE (class, section, date)
);

-- Attendance logs table
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES students(admission_number) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    scan_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    marked_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT unique_student_date UNIQUE (student_id, date, session_id)
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action audit_action NOT NULL,
    student_id TEXT REFERENCES students(admission_number) ON DELETE SET NULL,
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    previous_status attendance_status,
    new_status attendance_status NOT NULL,
    performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_students_class_section ON students(class, section);
CREATE INDEX idx_students_full_name ON students(full_name);
CREATE INDEX idx_attendance_sessions_class_section ON attendance_sessions(class, section);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(date);
CREATE INDEX idx_attendance_logs_student_id ON attendance_logs(student_id);
CREATE INDEX idx_attendance_logs_session_id ON attendance_logs(session_id);
CREATE INDEX idx_attendance_logs_date ON attendance_logs(date);
CREATE INDEX idx_audit_logs_student_id ON audit_logs(student_id);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);

-- ============================================
-- VIEWS
-- ============================================

-- View for attendance report with student details
CREATE VIEW attendance_report AS
SELECT
    al.id,
    al.student_id,
    s.full_name AS student_name,
    s.class,
    s.section,
    al.session_id,
    att.date AS session_date,
    att.start_time,
    att.end_time,
    al.date,
    al.status,
    al.scan_time,
    al.marked_by,
    p.full_name AS marked_by_name,
    al.created_at
FROM attendance_logs al
JOIN students s ON al.student_id = s.admission_number
JOIN attendance_sessions att ON al.session_id = att.id
JOIN profiles p ON al.marked_by = p.id;

-- View for daily attendance summary
CREATE VIEW daily_attendance_summary AS
SELECT
    att.date,
    att.class,
    att.section,
    att.id AS session_id,
    COUNT(DISTINCT s.admission_number) AS total_students,
    COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.student_id END) AS present_count,
    COUNT(DISTINCT CASE WHEN al.status = 'absent' THEN al.student_id END) AS absent_count,
    COUNT(DISTINCT CASE WHEN al.status = 'late' THEN al.student_id END) AS late_count,
    COUNT(DISTINCT CASE WHEN al.status = 'excused' THEN al.student_id END) AS excused_count
FROM attendance_sessions att
LEFT JOIN students s ON s.class = att.class AND s.section = att.section
LEFT JOIN attendance_logs al ON al.session_id = att.id
GROUP BY att.date, att.class, att.section, att.id
ORDER BY att.date DESC, att.start_time DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if a session is active
CREATE OR REPLACE FUNCTION is_session_active(session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM attendance_sessions
        WHERE id = session_id
        AND status = 'active'
        AND date = CURRENT_DATE
        AND CURRENT_TIME >= start_time
        AND CURRENT_TIME <= end_time
    );
END;
$$ LANGUAGE plpgsql;

-- Function to mark absent students after session ends
CREATE OR REPLACE FUNCTION mark_absent_students()
RETURNS VOID AS $$
DECLARE
    session_record RECORD;
BEGIN
    FOR session_record IN
        SELECT id, class, section, date
        FROM attendance_sessions
        WHERE status = 'active'
        AND date = CURRENT_DATE
        AND CURRENT_TIME > end_time
    LOOP
        -- Mark all students without attendance logs as absent
        INSERT INTO attendance_logs (student_id, session_id, date, status, marked_by, scan_time)
        SELECT
            s.admission_number,
            session_record.id,
            session_record.date,
            'absent',
            session_record.created_by,
            NOW()
        FROM students s
        WHERE s.class = session_record.class
        AND s.section = session_record.section
        AND NOT EXISTS (
            SELECT 1 FROM attendance_logs al
            WHERE al.student_id = s.admission_number
            AND al.session_id = session_record.id
        )
        ON CONFLICT (student_id, date, session_id) DO NOTHING;

        -- Update session status to completed
        UPDATE attendance_sessions
        SET status = 'completed', updated_at = NOW()
        WHERE id = session_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on students
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on attendance_sessions
CREATE TRIGGER update_attendance_sessions_updated_at
    BEFORE UPDATE ON attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR PROFILES
-- ============================================

-- Admins can do everything
CREATE POLICY "Admins have full access to profiles"
    ON profiles FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES FOR STUDENTS
-- ============================================

-- Admins have full access to students
CREATE POLICY "Admins have full access to students"
    ON students FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Teachers can read students from their assigned classes
-- Note: This assumes teachers have assigned classes in metadata
CREATE POLICY "Teachers can read assigned students"
    ON students FOR SELECT
    USING (
        auth.uid() IN (
            SELECT p.id FROM profiles p
            JOIN attendance_sessions att ON att.created_by = p.id
            WHERE p.role = 'teacher'
            AND att.class = students.class
            AND att.section = students.section
        )
    );

-- Teachers can insert students
CREATE POLICY "Teachers can insert students"
    ON students FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher')));

-- Teachers can update students
CREATE POLICY "Teachers can update students"
    ON students FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher')));

-- ============================================
-- RLS POLICIES FOR ATTENDANCE SESSIONS
-- ============================================

-- Admins have full access to attendance_sessions
CREATE POLICY "Admins have full access to attendance_sessions"
    ON attendance_sessions FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Teachers can read sessions for their assigned classes
CREATE POLICY "Teachers can read assigned sessions"
    ON attendance_sessions FOR SELECT
    USING (
        auth.uid() IN (
            SELECT p.id FROM profiles p
            WHERE p.role = 'teacher'
            AND (
                p.id = attendance_sessions.created_by
                OR EXISTS (
                    SELECT 1 FROM students s
                    WHERE s.class = attendance_sessions.class
                    AND s.section = attendance_sessions.section
                )
            )
        )
    );

-- Teachers can create sessions
CREATE POLICY "Teachers can insert sessions"
    ON attendance_sessions FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Teachers can update sessions they created
CREATE POLICY "Teachers can update own sessions"
    ON attendance_sessions FOR UPDATE
    USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES FOR ATTENDANCE LOGS
-- ============================================

-- Admins have full access to attendance_logs
CREATE POLICY "Admins have full access to attendance_logs"
    ON attendance_logs FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Teachers can read logs for their sessions
CREATE POLICY "Teachers can read assigned logs"
    ON attendance_logs FOR SELECT
    USING (
        auth.uid() IN (
            SELECT p.id FROM profiles p
            JOIN attendance_sessions att ON attendance_logs.session_id = att.id
            WHERE p.role = 'teacher'
            AND att.class IN (
                SELECT s.class FROM students s
                JOIN attendance_logs al ON al.student_id = s.admission_number
                WHERE al.id = attendance_logs.id
            )
            AND att.section IN (
                SELECT s.section FROM students s
                JOIN attendance_logs al ON al.student_id = s.admission_number
                WHERE al.id = attendance_logs.id
            )
        )
    );

-- Teachers can insert logs
CREATE POLICY "Teachers can insert logs"
    ON attendance_logs FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher')));

-- Teachers can update logs
CREATE POLICY "Teachers can update logs"
    ON attendance_logs FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher')));

-- ============================================
-- RLS POLICIES FOR AUDIT LOGS
-- ============================================

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Users can read audit logs they performed
CREATE POLICY "Users can read own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = performed_by);

-- Only system can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Create private bucket for student photos
-- This needs to be done manually in Supabase dashboard or via storage API:
-- Bucket name: student-photos
-- Access: Private
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Example RLS policies for storage (to be applied in Supabase dashboard):
-- GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
-- GRANT SELECT ON ALL TABLES IN SCHEMA storage TO authenticated;

-- ============================================
-- HELPER FUNCTIONS FOR APPLICATION
-- ============================================

-- Function to get student photo signed URL
CREATE OR REPLACE FUNCTION get_student_photo_url(admission_number TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN '/api/get-photo?admission_number=' || admission_number;
END;
$$ LANGUAGE plpgsql;

-- Function to check if attendance is already marked
CREATE OR REPLACE FUNCTION is_attendance_marked(student_id TEXT, session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM attendance_logs
        WHERE student_id = student_id
        AND session_id = session_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER FOR AUDIT LOGGING
-- ============================================

-- Function to create audit log on attendance status change
CREATE OR REPLACE FUNCTION log_attendance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (
            action,
            student_id,
            session_id,
            previous_status,
            new_status,
            performed_by,
            reason
        )
        VALUES (
            'manual_override',
            NEW.student_id,
            NEW.session_id,
            OLD.status,
            NEW.status,
            NEW.marked_by,
            'Attendance status manually updated'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to attendance_logs
DROP TRIGGER IF EXISTS attendance_log_update ON attendance_logs;
CREATE TRIGGER attendance_log_update
    AFTER UPDATE ON attendance_logs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_attendance_change();

-- ============================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Note: Create test users via Supabase Auth first, then run:
-- INSERT INTO profiles (id, full_name, email, role) VALUES
--     ('uuid-of-admin-user', 'Admin User', 'admin@school.edu', 'admin'),
--     ('uuid-of-teacher-user', 'Teacher User', 'teacher@school.edu', 'teacher');

-- Sample students
-- INSERT INTO students (admission_number, full_name, class, section, parent_name, parent_contact) VALUES
--     ('2024001', 'John Doe', '10', 'A', 'John Doe Sr', '+1234567890'),
--     ('2024002', 'Jane Smith', '10', 'A', 'Robert Smith', '+1234567891'),
--     ('2024003', 'Bob Johnson', '10', 'B', 'Alice Johnson', '+1234567892');
