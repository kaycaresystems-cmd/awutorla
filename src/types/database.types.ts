export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'client' | 'tailor' | 'admin';
export type OrderStatus =
  | 'pending'
  | 'cutting'
  | 'fitting'
  | 'finishing'
  | 'ready'
  | 'delivered';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_measurements: {
        Row: {
          id: string;
          client_id: string;
          unit: string;
          bust: number | null;
          waist: number | null;
          hips: number | null;
          neck_to_waist: number | null;
          shoulder: number | null;
          sleeve_length: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          unit?: string;
          bust?: number | null;
          waist?: number | null;
          hips?: number | null;
          neck_to_waist?: number | null;
          shoulder?: number | null;
          sleeve_length?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          unit?: string;
          bust?: number | null;
          waist?: number | null;
          hips?: number | null;
          neck_to_waist?: number | null;
          shoulder?: number | null;
          sleeve_length?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          status: OrderStatus;
          garment_title: string;
          garment_subtitle: string;
          fabric_type: string;
          fabric_color: string;
          fabric_notes: string;
          reference_images: string[];
          swatch_image: string | null;
          assigned_tailor: string;
          due_date: string;
          deposit_paid: number;
          total_amount: number;
          currency: string;
          notes: string | null;
          stage_history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          client_id?: string | null;
          client_name?: string;
          client_phone?: string;
          status?: OrderStatus;
          garment_title?: string;
          garment_subtitle?: string;
          fabric_type?: string;
          fabric_color?: string;
          fabric_notes?: string;
          reference_images?: string[];
          swatch_image?: string | null;
          assigned_tailor?: string;
          due_date?: string;
          deposit_paid?: number;
          total_amount: number;
          currency?: string;
          notes?: string | null;
          stage_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          client_name?: string;
          client_phone?: string;
          status?: OrderStatus;
          garment_title?: string;
          garment_subtitle?: string;
          fabric_type?: string;
          fabric_color?: string;
          fabric_notes?: string;
          reference_images?: string[];
          swatch_image?: string | null;
          assigned_tailor?: string;
          due_date?: string;
          deposit_paid?: number;
          total_amount?: number;
          currency?: string;
          notes?: string | null;
          stage_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_tasks: {
        Row: {
          id: string;
          order_id: string;
          tailor_id: string;
          tailor_name: string;
          title: string;
          task_description: string | null;
          status: TaskStatus;
          due_date: string | null;
          assigned_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          tailor_id: string;
          tailor_name?: string;
          title: string;
          task_description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          assigned_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          tailor_id?: string;
          tailor_name?: string;
          title?: string;
          task_description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          assigned_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      task_status: TaskStatus;
    };
  };
}
