export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      employee_bank_details: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          bic: string | null
          created_at: string
          employee_id: string
          iban: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          employee_id: string
          iban?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          employee_id?: string
          iban?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employment_contract_requests: {
        Row: {
          created_at: string
          employee_id: string
          expires_at: string
          id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          expires_at?: string
          id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_contract_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_contract_submissions: {
        Row: {
          bank_name: string | null
          bic: string | null
          created_at: string
          desired_start_date: string | null
          email: string
          employee_id: string
          employment_type: string | null
          first_name: string
          health_insurance: string | null
          iban: string | null
          id: string
          id_back_path: string | null
          id_front_path: string | null
          last_name: string
          marital_status: string | null
          phone: string | null
          request_id: string
          social_security_number: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          desired_start_date?: string | null
          email: string
          employee_id: string
          employment_type?: string | null
          first_name: string
          health_insurance?: string | null
          iban?: string | null
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          last_name: string
          marital_status?: string | null
          phone?: string | null
          request_id: string
          social_security_number?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          desired_start_date?: string | null
          email?: string
          employee_id?: string
          employment_type?: string | null
          first_name?: string
          health_insurance?: string | null
          iban?: string | null
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          last_name?: string
          marital_status?: string | null
          phone?: string | null
          request_id?: string
          social_security_number?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_contract_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_contract_submissions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "employment_contract_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      order_appointments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          feedback_requested: boolean
          id: string
          order_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          feedback_requested?: boolean
          id?: string
          order_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          feedback_requested?: boolean
          id?: string
          order_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_appointments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          employee_id: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          employee_id: string
          id?: string
          order_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          employee_id?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_evaluation_questions: {
        Row: {
          created_at: string
          id: string
          order_id: string
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_evaluation_questions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_evaluations: {
        Row: {
          approved_at: string | null
          assignment_id: string
          created_at: string
          details: Json | null
          employee_id: string
          id: string
          order_id: string
          overall_comment: string | null
          premium_awarded: number
          rating: number
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          assignment_id: string
          created_at?: string
          details?: Json | null
          employee_id: string
          id?: string
          order_id: string
          overall_comment?: string | null
          premium_awarded?: number
          rating: number
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          assignment_id?: string
          created_at?: string
          details?: Json | null
          employee_id?: string
          id?: string
          order_id?: string
          overall_comment?: string | null
          premium_awarded?: number
          rating?: number
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_evaluations_assignment"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "order_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_evaluations_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_evaluations_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string
          download_links: string[] | null
          id: string
          instructions: Json | null
          is_placeholder: boolean
          order_number: string
          premium: number
          project_goal: string
          provider: string
          title: string
          updated_at: string
          whatsapp_account_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          download_links?: string[] | null
          id?: string
          instructions?: Json | null
          is_placeholder?: boolean
          order_number: string
          premium: number
          project_goal: string
          provider: string
          title: string
          updated_at?: string
          whatsapp_account_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          download_links?: string[] | null
          id?: string
          instructions?: Json | null
          is_placeholder?: boolean
          order_number?: string
          premium?: number
          project_goal?: string
          provider?: string
          title?: string
          updated_at?: string
          whatsapp_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          account_info: string | null
          chat_link: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_info?: string | null
          chat_link?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_info?: string | null
          chat_link?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
