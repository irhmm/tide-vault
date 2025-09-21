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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_type: string | null
          category: string
          created_at: string
          description: string | null
          exchange_rate: number | null
          id: string
          name: string
          original_unit: string | null
          original_value: number | null
          purchase_date: string | null
          rate_last_updated: string | null
          storage_location: string | null
          symbol: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          asset_type?: string | null
          category: string
          created_at?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          name: string
          original_unit?: string | null
          original_value?: number | null
          purchase_date?: string | null
          rate_last_updated?: string | null
          storage_location?: string | null
          symbol?: string | null
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          asset_type?: string | null
          category?: string
          created_at?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          name?: string
          original_unit?: string | null
          original_value?: number | null
          purchase_date?: string | null
          rate_last_updated?: string | null
          storage_location?: string | null
          symbol?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          bill_name: string
          category: string
          created_at: string
          destination_account: string | null
          due_date: string
          google_calendar_event_id: string | null
          id: string
          is_template: boolean | null
          next_due_date: string | null
          payer_name: string
          recurrence_day: number | null
          recurrence_month: number | null
          recurrence_type: string | null
          status: string
          sync_to_google_calendar: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bill_name: string
          category: string
          created_at?: string
          destination_account?: string | null
          due_date: string
          google_calendar_event_id?: string | null
          id?: string
          is_template?: boolean | null
          next_due_date?: string | null
          payer_name: string
          recurrence_day?: number | null
          recurrence_month?: number | null
          recurrence_type?: string | null
          status?: string
          sync_to_google_calendar?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_name?: string
          category?: string
          created_at?: string
          destination_account?: string | null
          due_date?: string
          google_calendar_event_id?: string | null
          id?: string
          is_template?: boolean | null
          next_due_date?: string | null
          payer_name?: string
          recurrence_day?: number | null
          recurrence_month?: number | null
          recurrence_type?: string | null
          status?: string
          sync_to_google_calendar?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          amount: number
          created_at: string
          debt_type: string
          description: string | null
          due_date: string | null
          id: string
          party_name: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_type?: string
          description?: string | null
          due_date?: string | null
          id?: string
          party_name: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_type?: string
          description?: string | null
          due_date?: string | null
          id?: string
          party_name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_targets: {
        Row: {
          created_at: string
          deadline: string | null
          estimated_cost: number
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          estimated_cost: number
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          estimated_cost?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          target_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          target_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          target_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          google_calendar_event_id: string | null
          id: string
          is_active: boolean
          is_completed: boolean
          reminder_date: string
          reminder_time: string
          sync_to_google_calendar: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          google_calendar_event_id?: string | null
          id?: string
          is_active?: boolean
          is_completed?: boolean
          reminder_date: string
          reminder_time: string
          sync_to_google_calendar?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          google_calendar_event_id?: string | null
          id?: string
          is_active?: boolean
          is_completed?: boolean
          reminder_date?: string
          reminder_time?: string
          sync_to_google_calendar?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings: {
        Row: {
          account_name: string
          balance: number
          bank: string | null
          created_at: string
          description: string | null
          id: string
          saving_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          balance?: number
          bank?: string | null
          created_at?: string
          description?: string | null
          id?: string
          saving_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          balance?: number
          bank?: string | null
          created_at?: string
          description?: string | null
          id?: string
          saving_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supported_assets: {
        Row: {
          api_endpoint: string | null
          asset_type: string
          created_at: string
          id: string
          name: string
          symbol: string
        }
        Insert: {
          api_endpoint?: string | null
          asset_type: string
          created_at?: string
          id?: string
          name: string
          symbol: string
        }
        Update: {
          api_endpoint?: string | null
          asset_type?: string
          created_at?: string
          id?: string
          name?: string
          symbol?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
