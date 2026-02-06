// Database types for Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'teacher'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: 'admin' | 'teacher'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'admin' | 'teacher'
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          admission_number: string
          full_name: string
          class: string
          section: string
          date_of_birth?: string
          gender?: string
          parent_name?: string
          parent_contact?: string
          address?: string
          photo_url?: string
          metadata?: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          admission_number: string
          full_name: string
          class: string
          section: string
          date_of_birth?: string
          gender?: string
          parent_name?: string
          parent_contact?: string
          address?: string
          photo_url?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          admission_number?: string
          full_name?: string
          class?: string
          section?: string
          date_of_birth?: string
          gender?: string
          parent_name?: string
          parent_contact?: string
          address?: string
          photo_url?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      attendance_sessions: {
        Row: {
          id: string
          class: string
          section: string
          date: string
          start_time: string
          end_time: string
          status: 'scheduled' | 'active' | 'completed'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class: string
          section: string
          date: string
          start_time: string
          end_time: string
          status?: 'scheduled' | 'active' | 'completed'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class?: string
          section?: string
          date?: string
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'active' | 'completed'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      attendance_logs: {
        Row: {
          id: string
          student_id: string
          session_id: string
          date: string
          status: 'present' | 'absent' | 'late' | 'excused'
          scan_time: string
          marked_by: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          session_id: string
          date: string
          status?: 'present' | 'absent' | 'late' | 'excused'
          scan_time?: string
          marked_by: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          session_id?: string
          date?: string
          status?: 'present' | 'absent' | 'late' | 'excused'
          scan_time?: string
          marked_by?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          action: 'manual_attendance' | 'manual_override' | 'leave_marking' | 'system_auto'
          student_id?: string
          session_id?: string
          previous_status?: string
          new_status: string
          performed_by: string
          reason?: string
          created_at: string
        }
        Insert: {
          id?: string
          action: 'manual_attendance' | 'manual_override' | 'leave_marking' | 'system_auto'
          student_id?: string
          session_id?: string
          previous_status?: string
          new_status: string
          performed_by: string
          reason?: string
          created_at?: string
        }
        Update: {
          id?: string
          action?: 'manual_attendance' | 'manual_override' | 'leave_marking' | 'system_auto'
          student_id?: string
          session_id?: string
          previous_status?: string
          new_status?: string
          performed_by?: string
          reason?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'teacher'
      attendance_status: 'present' | 'absent' | 'late' | 'excused'
      session_status: 'scheduled' | 'active' | 'completed'
    }
  }
}

export type Tables = Database['public']['Tables']
export type TablesInsert = Database['public']['Tables']
export type TablesUpdate = Database['public']['Tables']

// Type for QR Code payload
export interface QRCodePayload {
  admissionNumber: string
  issueDate: string
  expiryDate: string
}
