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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      events: {
        Row: {
          address: string | null
          category: string
          created_at: string
          date_time: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          instagram: string | null
          partner_id: string | null
          slug: string
          status: string
          ticket_url: string | null
          title: string
          venue_name: string | null
          verification_source: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          date_time: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          instagram?: string | null
          partner_id?: string | null
          slug: string
          status?: string
          ticket_url?: string | null
          title: string
          venue_name?: string | null
          verification_source?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          date_time?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          instagram?: string | null
          partner_id?: string | null
          slug?: string
          status?: string
          ticket_url?: string | null
          title?: string
          venue_name?: string | null
          verification_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_imports: {
        Row: {
          caption: string | null
          confidence: string | null
          created_at: string
          error_detail: string | null
          event_id: string | null
          id: string
          image_url: string | null
          import_status: string
          instagram_handle: string
          partner_id: string | null
          post_url: string
        }
        Insert: {
          caption?: string | null
          confidence?: string | null
          created_at?: string
          error_detail?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          import_status?: string
          instagram_handle: string
          partner_id?: string | null
          post_url: string
        }
        Update: {
          caption?: string | null
          confidence?: string | null
          created_at?: string
          error_detail?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          import_status?: string
          instagram_handle?: string
          partner_id?: string | null
          post_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_imports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_imports_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_id: string | null
          id: string
          page_path: string
          partner_id: string | null
          region: string | null
          session_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_id?: string | null
          id?: string
          page_path: string
          partner_id?: string | null
          region?: string | null
          session_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_id?: string | null
          id?: string
          page_path?: string
          partner_id?: string | null
          region?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          address: string | null
          city: string
          created_at: string
          full_description: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          short_description: string | null
          slug: string
          type: string
          verified_partner: boolean
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string
          created_at?: string
          full_description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          short_description?: string | null
          slug: string
          type?: string
          verified_partner?: boolean
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string
          created_at?: string
          full_description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          short_description?: string | null
          slug?: string
          type?: string
          verified_partner?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      ticket_clicks: {
        Row: {
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_sessions: {
        Row: {
          city: string | null
          country: string | null
          device_type: string | null
          id: string
          last_seen_at: string
          region: string | null
          session_id: string
          started_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          last_seen_at?: string
          region?: string | null
          session_id: string
          started_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          last_seen_at?: string
          region?: string | null
          session_id?: string
          started_at?: string
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
