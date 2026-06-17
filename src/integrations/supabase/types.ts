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
      admin_profiles: {
        Row: {
          allowed_city: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          allowed_city?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          allowed_city?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string
          reward_days: number
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id: string
          reward_days?: number
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_days?: number
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_event_feedback_memory: {
        Row: {
          corrected_category: string | null
          corrected_description: string | null
          corrected_sub_category: string | null
          created_at: string
          id: string
          original_category: string | null
          original_description: string | null
          original_sub_category: string | null
          venue_name: string | null
        }
        Insert: {
          corrected_category?: string | null
          corrected_description?: string | null
          corrected_sub_category?: string | null
          created_at?: string
          id?: string
          original_category?: string | null
          original_description?: string | null
          original_sub_category?: string | null
          venue_name?: string | null
        }
        Update: {
          corrected_category?: string | null
          corrected_description?: string | null
          corrected_sub_category?: string | null
          created_at?: string
          id?: string
          original_category?: string | null
          original_description?: string | null
          original_sub_category?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      ai_message_usage: {
        Row: {
          created_at: string
          id: string
          message_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_partner_boosts: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          note: string | null
          partner_id: string
          payment_status: string
          priority: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string
          id?: string
          note?: string | null
          partner_id: string
          payment_status?: string
          priority?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          note?: string | null
          partner_id?: string
          payment_status?: string
          priority?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_partner_recommendations: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          partner_id: string
          prompt: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          partner_id: string
          prompt?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          partner_id?: string
          prompt?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_daily_summary: {
        Row: {
          aura_clicks: number
          clicks: number
          como_vou_clicks: number
          event_id: string | null
          id: string
          instagram_clicks: number
          saves: number
          summary_date: string
          ticket_clicks: number
          unique_sessions: number
          updated_at: string
          venue_id: string | null
          views: number
          whatsapp_clicks: number
        }
        Insert: {
          aura_clicks?: number
          clicks?: number
          como_vou_clicks?: number
          event_id?: string | null
          id?: string
          instagram_clicks?: number
          saves?: number
          summary_date: string
          ticket_clicks?: number
          unique_sessions?: number
          updated_at?: string
          venue_id?: string | null
          views?: number
          whatsapp_clicks?: number
        }
        Update: {
          aura_clicks?: number
          clicks?: number
          como_vou_clicks?: number
          event_id?: string | null
          id?: string
          instagram_clicks?: number
          saves?: number
          summary_date?: string
          ticket_clicks?: number
          unique_sessions?: number
          updated_at?: string
          venue_id?: string | null
          views?: number
          whatsapp_clicks?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category: string | null
          city: string | null
          created_at: string
          device_type: string | null
          event_id: string | null
          event_type: string
          id: string
          metadata: Json
          referrer: string | null
          session_id: string | null
          source_page: string | null
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string
          device_type?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          referrer?: string | null
          session_id?: string | null
          source_page?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string
          device_type?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          referrer?: string | null
          session_id?: string | null
          source_page?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      aura_alerts: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      aura_home_logs: {
        Row: {
          aura_score: number | null
          badge: string | null
          created_at: string
          event_id: string | null
          hype_score: number | null
          id: string
          signals: Json | null
          trending_score: number | null
        }
        Insert: {
          aura_score?: number | null
          badge?: string | null
          created_at?: string
          event_id?: string | null
          hype_score?: number | null
          id?: string
          signals?: Json | null
          trending_score?: number | null
        }
        Update: {
          aura_score?: number | null
          badge?: string | null
          created_at?: string
          event_id?: string | null
          hype_score?: number | null
          id?: string
          signals?: Json | null
          trending_score?: number | null
        }
        Relationships: []
      }
      auto_reels_queue: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          external_prompts: Json | null
          generated_caption: string | null
          generated_hashtags: string[] | null
          id: string
          partner_id: string | null
          posted_at: string | null
          preview_image_url: string | null
          script_json: Json | null
          status: string
          style: string | null
          suggested_audio: string | null
          updated_at: string
          video_prompt: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          external_prompts?: Json | null
          generated_caption?: string | null
          generated_hashtags?: string[] | null
          id?: string
          partner_id?: string | null
          posted_at?: string | null
          preview_image_url?: string | null
          script_json?: Json | null
          status?: string
          style?: string | null
          suggested_audio?: string | null
          updated_at?: string
          video_prompt?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          external_prompts?: Json | null
          generated_caption?: string | null
          generated_hashtags?: string[] | null
          id?: string
          partner_id?: string | null
          posted_at?: string | null
          preview_image_url?: string | null
          script_json?: Json | null
          status?: string
          style?: string | null
          suggested_audio?: string | null
          updated_at?: string
          video_prompt?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string
          details: Json | null
          drafts_created: number
          id: string
          job_name: string
          partners_scanned: number
          status: string
          validation_failures: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          drafts_created?: number
          id?: string
          job_name: string
          partners_scanned?: number
          status: string
          validation_failures?: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          drafts_created?: number
          id?: string
          job_name?: string
          partners_scanned?: number
          status?: string
          validation_failures?: number
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          is_flagged: boolean
          message: string
          reply_to_id: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_flagged?: boolean
          message: string
          reply_to_id?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_flagged?: boolean
          message?: string
          reply_to_id?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "community_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_presence: {
        Row: {
          last_seen: string
          room_id: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          room_id: string
          user_id: string
        }
        Update: {
          last_seen?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "community_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rooms: {
        Row: {
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          is_active: boolean
          name: string
          partner_id: string | null
          slug: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          partner_id?: string | null
          slug: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          partner_id?: string | null
          slug?: string
          type?: string
        }
        Relationships: []
      }
      community_user_states: {
        Row: {
          created_at: string
          id: string
          is_banned: boolean
          is_muted: boolean
          mute_until: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_banned?: boolean
          is_muted?: boolean
          mute_until?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_banned?: boolean
          is_muted?: boolean
          mute_until?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_generations: {
        Row: {
          created_at: string
          favorited: boolean
          generated_text: string | null
          id: string
          image_url: string | null
          source_id: string | null
          source_type: string
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string
          favorited?: boolean
          generated_text?: string | null
          id?: string
          image_url?: string | null
          source_id?: string | null
          source_type?: string
          title?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          favorited?: boolean
          generated_text?: string | null
          id?: string
          image_url?: string | null
          source_id?: string | null
          source_type?: string
          title?: string | null
          type?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_consent: boolean
          full_name: string | null
          id: string
          marketing_consent: boolean
          phone: string | null
          updated_at: string
          whatsapp_consent: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_consent?: boolean
          full_name?: string | null
          id: string
          marketing_consent?: boolean
          phone?: string | null
          updated_at?: string
          whatsapp_consent?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_consent?: boolean
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
          phone?: string | null
          updated_at?: string
          whatsapp_consent?: boolean
        }
        Relationships: []
      }
      driver_applications: {
        Row: {
          accepted_connection_only: boolean
          accepted_data_removal: boolean
          accepted_privacy: boolean
          accepted_terms: boolean
          admin_notes: string | null
          apps_experience: string[] | null
          attends_events: boolean | null
          availability: string[] | null
          city: string
          cpf: string
          created_at: string
          declared_truthful: boolean
          driver_status: string
          email: string
          face_photo_url: string | null
          full_name: string
          id: string
          neighborhood: string | null
          plate_photo_url: string | null
          receive_driver_lead_emails: boolean
          regions: string | null
          understood_suspension: boolean
          updated_at: string
          user_id: string | null
          vehicle_color: string | null
          vehicle_good_condition: boolean | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          vehicle_year: string | null
          whatsapp: string
        }
        Insert: {
          accepted_connection_only?: boolean
          accepted_data_removal?: boolean
          accepted_privacy?: boolean
          accepted_terms?: boolean
          admin_notes?: string | null
          apps_experience?: string[] | null
          attends_events?: boolean | null
          availability?: string[] | null
          city: string
          cpf: string
          created_at?: string
          declared_truthful?: boolean
          driver_status?: string
          email: string
          face_photo_url?: string | null
          full_name: string
          id?: string
          neighborhood?: string | null
          plate_photo_url?: string | null
          receive_driver_lead_emails?: boolean
          regions?: string | null
          understood_suspension?: boolean
          updated_at?: string
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_good_condition?: boolean | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_year?: string | null
          whatsapp: string
        }
        Update: {
          accepted_connection_only?: boolean
          accepted_data_removal?: boolean
          accepted_privacy?: boolean
          accepted_terms?: boolean
          admin_notes?: string | null
          apps_experience?: string[] | null
          attends_events?: boolean | null
          availability?: string[] | null
          city?: string
          cpf?: string
          created_at?: string
          declared_truthful?: boolean
          driver_status?: string
          email?: string
          face_photo_url?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          plate_photo_url?: string | null
          receive_driver_lead_emails?: boolean
          regions?: string | null
          understood_suspension?: boolean
          updated_at?: string
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_good_condition?: boolean | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_year?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      driver_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          report_type: string
          reported_user_id: string | null
          reporter_id: string | null
          ride_request_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          report_type: string
          reported_user_id?: string | null
          reporter_id?: string | null
          ride_request_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          report_type?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          ride_request_id?: string | null
          status?: string
        }
        Relationships: []
      }
      event_live_presence: {
        Row: {
          created_at: string
          event_id: string
          id: string
          last_seen_at: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          last_seen_at?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          last_seen_at?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      event_presence: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_validation_logs: {
        Row: {
          ai_date: string | null
          block_reasons: string[]
          created_at: string
          created_by: string | null
          detected_date: string | null
          detected_ocr: string | null
          entertainment_score: number | null
          event_id: string | null
          flyer_hash: string | null
          form_date: string | null
          id: string
          scan_id: string | null
          similarity_score: number | null
          source: string
          validation_status: string
          warnings: string[]
        }
        Insert: {
          ai_date?: string | null
          block_reasons?: string[]
          created_at?: string
          created_by?: string | null
          detected_date?: string | null
          detected_ocr?: string | null
          entertainment_score?: number | null
          event_id?: string | null
          flyer_hash?: string | null
          form_date?: string | null
          id?: string
          scan_id?: string | null
          similarity_score?: number | null
          source: string
          validation_status: string
          warnings?: string[]
        }
        Update: {
          ai_date?: string | null
          block_reasons?: string[]
          created_at?: string
          created_by?: string | null
          detected_date?: string | null
          detected_ocr?: string | null
          entertainment_score?: number | null
          event_id?: string | null
          flyer_hash?: string | null
          form_date?: string | null
          id?: string
          scan_id?: string | null
          similarity_score?: number | null
          source?: string
          validation_status?: string
          warnings?: string[]
        }
        Relationships: []
      }
      eventou_imports: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_time: string | null
          description: string | null
          event_id: string | null
          eventou_url: string
          external_id: string | null
          id: string
          image_url: string | null
          import_status: string
          organizer: string | null
          partner_id: string | null
          state: string | null
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_time?: string | null
          description?: string | null
          event_id?: string | null
          eventou_url: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          import_status?: string
          organizer?: string | null
          partner_id?: string | null
          state?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_time?: string | null
          description?: string | null
          event_id?: string | null
          eventou_url?: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          import_status?: string
          organizer?: string | null
          partner_id?: string | null
          state?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          ai_confidence: string
          ai_confidence_score: number | null
          ai_warnings: Json | null
          aura_badge: string | null
          aura_pick: boolean
          aura_score: number | null
          aura_score_reason: Json | null
          aura_score_updated_at: string | null
          category: string
          city: string
          created_at: string
          date_time: string
          dedupe_key: string | null
          description: string | null
          duplicate_checked_at: string | null
          duplicate_group_id: string | null
          featured: boolean
          flyer_fingerprint: string | null
          hype_score: number | null
          id: string
          image_hash: string | null
          image_url: string | null
          instagram: string | null
          instagram_caption: string | null
          is_sports_transmission: boolean
          latitude: number | null
          longitude: number | null
          maps_place_id: string | null
          meta_description: string | null
          meta_title: string | null
          needs_review: boolean
          opportunity_tags: string[]
          original_detected_title: string | null
          partner_id: string | null
          short_summary: string | null
          slug: string
          sports_match_id: string | null
          sports_transmission_confidence: number | null
          sports_transmission_source: string | null
          status: string
          sub_category: string | null
          submitted_by_partner: boolean
          ticket_url: string | null
          time_is_unknown: boolean
          title: string
          transmission_channel: string | null
          transmission_notes: string | null
          transmission_url: string | null
          transport_reservation_enabled: boolean
          trending_score: number | null
          venue_name: string | null
          verification_source: string | null
          video_url: string | null
        }
        Insert: {
          address?: string | null
          ai_confidence?: string
          ai_confidence_score?: number | null
          ai_warnings?: Json | null
          aura_badge?: string | null
          aura_pick?: boolean
          aura_score?: number | null
          aura_score_reason?: Json | null
          aura_score_updated_at?: string | null
          category?: string
          city?: string
          created_at?: string
          date_time: string
          dedupe_key?: string | null
          description?: string | null
          duplicate_checked_at?: string | null
          duplicate_group_id?: string | null
          featured?: boolean
          flyer_fingerprint?: string | null
          hype_score?: number | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          instagram?: string | null
          instagram_caption?: string | null
          is_sports_transmission?: boolean
          latitude?: number | null
          longitude?: number | null
          maps_place_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          needs_review?: boolean
          opportunity_tags?: string[]
          original_detected_title?: string | null
          partner_id?: string | null
          short_summary?: string | null
          slug: string
          sports_match_id?: string | null
          sports_transmission_confidence?: number | null
          sports_transmission_source?: string | null
          status?: string
          sub_category?: string | null
          submitted_by_partner?: boolean
          ticket_url?: string | null
          time_is_unknown?: boolean
          title: string
          transmission_channel?: string | null
          transmission_notes?: string | null
          transmission_url?: string | null
          transport_reservation_enabled?: boolean
          trending_score?: number | null
          venue_name?: string | null
          verification_source?: string | null
          video_url?: string | null
        }
        Update: {
          address?: string | null
          ai_confidence?: string
          ai_confidence_score?: number | null
          ai_warnings?: Json | null
          aura_badge?: string | null
          aura_pick?: boolean
          aura_score?: number | null
          aura_score_reason?: Json | null
          aura_score_updated_at?: string | null
          category?: string
          city?: string
          created_at?: string
          date_time?: string
          dedupe_key?: string | null
          description?: string | null
          duplicate_checked_at?: string | null
          duplicate_group_id?: string | null
          featured?: boolean
          flyer_fingerprint?: string | null
          hype_score?: number | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          instagram?: string | null
          instagram_caption?: string | null
          is_sports_transmission?: boolean
          latitude?: number | null
          longitude?: number | null
          maps_place_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          needs_review?: boolean
          opportunity_tags?: string[]
          original_detected_title?: string | null
          partner_id?: string | null
          short_summary?: string | null
          slug?: string
          sports_match_id?: string | null
          sports_transmission_confidence?: number | null
          sports_transmission_source?: string | null
          status?: string
          sub_category?: string | null
          submitted_by_partner?: boolean
          ticket_url?: string | null
          time_is_unknown?: boolean
          title?: string
          transmission_channel?: string | null
          transmission_notes?: string | null
          transmission_url?: string | null
          transport_reservation_enabled?: boolean
          trending_score?: number | null
          venue_name?: string | null
          verification_source?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      expo_news: {
        Row: {
          author: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          seo_keyword: string | null
          slug: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_keyword?: string | null
          slug: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_keyword?: string | null
          slug?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expo2026_contacts: {
        Row: {
          contact_type: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          source: string | null
          status: string | null
          subject: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone: string
          source?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          source?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      football_chat_messages: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          match_slug: string
          message: string
          moderation_status: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          match_slug: string
          message: string
          moderation_status?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          match_slug?: string
          message?: string
          moderation_status?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token: string
          connected_by: string
          created_at: string
          id: string
          ig_account_id: string
          page_id: string
          status: string
          token_expires_at: string | null
          updated_at: string
          username: string
        }
        Insert: {
          access_token: string
          connected_by: string
          created_at?: string
          id?: string
          ig_account_id: string
          page_id: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          access_token?: string
          connected_by?: string
          created_at?: string
          id?: string
          ig_account_id?: string
          page_id?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      instagram_config: {
        Row: {
          access_token: string
          created_at: string
          handle: string
          id: string
          ig_user_id: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          handle: string
          id?: string
          ig_user_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          handle?: string
          id?: string
          ig_user_id?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          observation: string | null
          partner_id: string | null
          post_url: string
          source_type: string
          suggested_date: string | null
          title: string | null
          venue_name: string | null
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
          observation?: string | null
          partner_id?: string | null
          post_url: string
          source_type?: string
          suggested_date?: string | null
          title?: string | null
          venue_name?: string | null
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
          observation?: string | null
          partner_id?: string | null
          post_url?: string
          source_type?: string
          suggested_date?: string | null
          title?: string | null
          venue_name?: string | null
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
          {
            foreignKeyName: "instagram_imports_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          caption: string | null
          content_generation_id: string | null
          created_at: string
          created_by: string
          error_detail: string | null
          id: string
          ig_media_id: string | null
          image_url: string | null
          instagram_account_id: string | null
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          content_generation_id?: string | null
          created_at?: string
          created_by: string
          error_detail?: string | null
          id?: string
          ig_media_id?: string | null
          image_url?: string | null
          instagram_account_id?: string | null
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          content_generation_id?: string | null
          created_at?: string
          created_by?: string
          error_detail?: string | null
          id?: string
          ig_media_id?: string | null
          image_url?: string | null
          instagram_account_id?: string | null
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_scans: {
        Row: {
          ai_confidence: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_event_deleted_at: string | null
          created_event_deleted_by: string | null
          dedupe_key: string | null
          deletion_reason: string | null
          duplicate_of_event_id: string | null
          duplicate_reason: string | null
          duplicate_score: number | null
          event_id: string | null
          extracted_json: Json | null
          first_published_at: string | null
          flyer_fingerprint: string | null
          hidden_from_radar: boolean
          id: string
          keywords: string[] | null
          last_reposted_at: string | null
          last_seen_at: string
          media_id: string
          partner_id: string | null
          permalink: string | null
          permanently_ignored: boolean
          preview_image_url: string | null
          raw_caption: string | null
          raw_ocr: string | null
          reason: string | null
          repost_count: number
          scan_count: number
          source_handle: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_event_deleted_at?: string | null
          created_event_deleted_by?: string | null
          dedupe_key?: string | null
          deletion_reason?: string | null
          duplicate_of_event_id?: string | null
          duplicate_reason?: string | null
          duplicate_score?: number | null
          event_id?: string | null
          extracted_json?: Json | null
          first_published_at?: string | null
          flyer_fingerprint?: string | null
          hidden_from_radar?: boolean
          id?: string
          keywords?: string[] | null
          last_reposted_at?: string | null
          last_seen_at?: string
          media_id: string
          partner_id?: string | null
          permalink?: string | null
          permanently_ignored?: boolean
          preview_image_url?: string | null
          raw_caption?: string | null
          raw_ocr?: string | null
          reason?: string | null
          repost_count?: number
          scan_count?: number
          source_handle?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_event_deleted_at?: string | null
          created_event_deleted_by?: string | null
          dedupe_key?: string | null
          deletion_reason?: string | null
          duplicate_of_event_id?: string | null
          duplicate_reason?: string | null
          duplicate_score?: number | null
          event_id?: string | null
          extracted_json?: Json | null
          first_published_at?: string | null
          flyer_fingerprint?: string | null
          hidden_from_radar?: boolean
          id?: string
          keywords?: string[] | null
          last_reposted_at?: string | null
          last_seen_at?: string
          media_id?: string
          partner_id?: string | null
          permalink?: string | null
          permanently_ignored?: boolean
          preview_image_url?: string | null
          raw_caption?: string | null
          raw_ocr?: string | null
          reason?: string | null
          repost_count?: number
          scan_count?: number
          source_handle?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      launch_signups: {
        Row: {
          created_at: string
          email: string | null
          id: string
          source: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          source?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          source?: string | null
          whatsapp?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "page_views_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_access_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          partner_id: string
          requested_email: string | null
          requested_name: string | null
          requested_phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          partner_id: string
          requested_email?: string | null
          requested_name?: string | null
          requested_phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          partner_id?: string
          requested_email?: string | null
          requested_name?: string | null
          requested_phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_access_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_access_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_awards: {
        Row: {
          active: boolean
          award_type: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          month: number | null
          partner_id: string
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          active?: boolean
          award_type: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          month?: number | null
          partner_id: string
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          active?: boolean
          award_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          month?: number | null
          partner_id?: string
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_awards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_awards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_beta_access: {
        Row: {
          access_enabled: boolean
          beta_role: string
          created_at: string
          id: string
          invited_by: string | null
          notes: string | null
          partner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_enabled?: boolean
          beta_role?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          notes?: string | null
          partner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_enabled?: boolean
          beta_role?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          notes?: string | null
          partner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_beta_access_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_beta_access_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_beta_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          page: string | null
          partner_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page?: string | null
          partner_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page?: string | null
          partner_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_beta_feedback_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_beta_feedback_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_beta_metrics: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          page: string | null
          partner_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          page?: string | null
          partner_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          page?: string | null
          partner_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_beta_metrics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_beta_metrics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          created_at: string
          email: string | null
          email_consent: boolean
          first_seen_at: string
          full_name: string | null
          id: string
          last_seen_at: string
          marketing_consent: boolean
          normalized_phone: string | null
          partner_id: string
          phone: string | null
          source: string
          source_reference_id: string | null
          source_reference_type: string | null
          total_checkins: number
          total_events: number
          updated_at: string
          whatsapp_consent: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_consent?: boolean
          first_seen_at?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string
          marketing_consent?: boolean
          normalized_phone?: string | null
          partner_id: string
          phone?: string | null
          source?: string
          source_reference_id?: string | null
          source_reference_type?: string | null
          total_checkins?: number
          total_events?: number
          updated_at?: string
          whatsapp_consent?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          email_consent?: boolean
          first_seen_at?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string
          marketing_consent?: boolean
          normalized_phone?: string | null
          partner_id?: string
          phone?: string | null
          source?: string
          source_reference_id?: string | null
          source_reference_type?: string | null
          total_checkins?: number
          total_events?: number
          updated_at?: string
          whatsapp_consent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "partner_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_metrics_daily: {
        Row: {
          clicks: number
          created_at: string
          date: string
          favorites: number
          id: string
          partner_id: string
          reservations: number
          views: number
          vip_signups: number
        }
        Insert: {
          clicks?: number
          created_at?: string
          date: string
          favorites?: number
          id?: string
          partner_id: string
          reservations?: number
          views?: number
          vip_signups?: number
        }
        Update: {
          clicks?: number
          created_at?: string
          date?: string
          favorites?: number
          id?: string
          partner_id?: string
          reservations?: number
          views?: number
          vip_signups?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_metrics_daily_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_metrics_daily_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_promoters: {
        Row: {
          created_at: string
          id: string
          instagram: string | null
          is_active: boolean
          name: string
          partner_id: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          name: string
          partner_id: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          name?: string
          partner_id?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_promoters_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_promoters_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_radar_memory: {
        Row: {
          common_genres: string[]
          common_times: string[]
          confidence: number
          created_at: string
          dominant_type: string | null
          event_accuracy_score: number
          id: string
          ignore_rate: number
          instagram_handle: string | null
          last_confirmed_at: string | null
          last_ignored_at: string | null
          menu_rate: number
          partner_id: string | null
          partner_state: string
          promo_rate: number
          recent_created_score: number
          recent_ignored_score: number
          recurring_days: string[]
          total_analyzed: number
          total_created: number
          total_ignored: number
          type_counts: Json
          updated_at: string
        }
        Insert: {
          common_genres?: string[]
          common_times?: string[]
          confidence?: number
          created_at?: string
          dominant_type?: string | null
          event_accuracy_score?: number
          id?: string
          ignore_rate?: number
          instagram_handle?: string | null
          last_confirmed_at?: string | null
          last_ignored_at?: string | null
          menu_rate?: number
          partner_id?: string | null
          partner_state?: string
          promo_rate?: number
          recent_created_score?: number
          recent_ignored_score?: number
          recurring_days?: string[]
          total_analyzed?: number
          total_created?: number
          total_ignored?: number
          type_counts?: Json
          updated_at?: string
        }
        Update: {
          common_genres?: string[]
          common_times?: string[]
          confidence?: number
          created_at?: string
          dominant_type?: string | null
          event_accuracy_score?: number
          id?: string
          ignore_rate?: number
          instagram_handle?: string | null
          last_confirmed_at?: string | null
          last_ignored_at?: string | null
          menu_rate?: number
          partner_id?: string | null
          partner_state?: string
          promo_rate?: number
          recent_created_score?: number
          recent_ignored_score?: number
          recurring_days?: string[]
          total_analyzed?: number
          total_created?: number
          total_ignored?: number
          type_counts?: Json
          updated_at?: string
        }
        Relationships: []
      }
      partner_reservation_settings: {
        Row: {
          advance_booking_hours: number
          auto_confirm: boolean
          confirmation_timeout_minutes: number
          created_at: string
          daily_close_time: string
          daily_open_time: string
          default_reservation_duration_minutes: number
          deposit_enabled: boolean
          deposit_type: string
          deposit_value: number
          id: string
          max_people_per_reservation: number
          max_reservations_per_day: number
          partner_id: string
          payment_instructions: string | null
          pix_key: string | null
          pix_receiver_name: string | null
          reservations_enabled: boolean
          reservations_end_at: string | null
          reservations_start_at: string | null
          slot_interval_minutes: number
          updated_at: string
        }
        Insert: {
          advance_booking_hours?: number
          auto_confirm?: boolean
          confirmation_timeout_minutes?: number
          created_at?: string
          daily_close_time?: string
          daily_open_time?: string
          default_reservation_duration_minutes?: number
          deposit_enabled?: boolean
          deposit_type?: string
          deposit_value?: number
          id?: string
          max_people_per_reservation?: number
          max_reservations_per_day?: number
          partner_id: string
          payment_instructions?: string | null
          pix_key?: string | null
          pix_receiver_name?: string | null
          reservations_enabled?: boolean
          reservations_end_at?: string | null
          reservations_start_at?: string | null
          slot_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          advance_booking_hours?: number
          auto_confirm?: boolean
          confirmation_timeout_minutes?: number
          created_at?: string
          daily_close_time?: string
          daily_open_time?: string
          default_reservation_duration_minutes?: number
          deposit_enabled?: boolean
          deposit_type?: string
          deposit_value?: number
          id?: string
          max_people_per_reservation?: number
          max_reservations_per_day?: number
          partner_id?: string
          payment_instructions?: string | null
          pix_key?: string | null
          pix_receiver_name?: string | null
          reservations_enabled?: boolean
          reservations_end_at?: string | null
          reservations_start_at?: string | null
          slot_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_reservation_settings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservation_settings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_reservation_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_minutes: number | null
          extra_people_limit: number | null
          extra_people_price: number | null
          id: string
          kind: string
          minimum_consumption: number | null
          name: string
          partner_id: string
          price: number
          quantity: number
          requires_guest_count: boolean
          seats: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          extra_people_limit?: number | null
          extra_people_price?: number | null
          id?: string
          kind: string
          minimum_consumption?: number | null
          name: string
          partner_id: string
          price?: number
          quantity?: number
          requires_guest_count?: boolean
          seats?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          extra_people_limit?: number | null
          extra_people_price?: number | null
          id?: string
          kind?: string
          minimum_consumption?: number | null
          name?: string
          partner_id?: string
          price?: number
          quantity?: number
          requires_guest_count?: boolean
          seats?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_reservation_types_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservation_types_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_reservation_waitlist: {
        Row: {
          created_at: string
          expires_at: string | null
          guests_count: number
          id: string
          name: string
          notes: string | null
          notified_at: string | null
          partner_id: string
          phone: string
          reservation_type_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          guests_count?: number
          id?: string
          name: string
          notes?: string | null
          notified_at?: string | null
          partner_id: string
          phone: string
          reservation_type_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          guests_count?: number
          id?: string
          name?: string
          notes?: string | null
          notified_at?: string | null
          partner_id?: string
          phone?: string
          reservation_type_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_reservation_waitlist_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservation_waitlist_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservation_waitlist_reservation_type_id_fkey"
            columns: ["reservation_type_id"]
            isOneToOne: false
            referencedRelation: "partner_reservation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_reservations: {
        Row: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_close_enabled?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          close_reason?: string | null
          closes_at?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_linked_at?: string | null
          customer_linked_by?: string | null
          deposit_amount?: number
          duration_minutes?: number | null
          email?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          name: string
          notes?: string | null
          partner_id: string
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string
          people_count?: number
          phone?: string | null
          public_token?: string
          released_at?: string | null
          remaining_amount?: number | null
          reservation_date: string
          reservation_type_id?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_close_enabled?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          close_reason?: string | null
          closes_at?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_linked_at?: string | null
          customer_linked_by?: string | null
          deposit_amount?: number
          duration_minutes?: number | null
          email?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          partner_id?: string
          payment_confirmed_at?: string | null
          payment_method?: string | null
          payment_status?: string
          people_count?: number
          phone?: string | null
          public_token?: string
          released_at?: string | null
          remaining_amount?: number | null
          reservation_date?: string
          reservation_type_id?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reservations_reservation_type_id_fkey"
            columns: ["reservation_type_id"]
            isOneToOne: false
            referencedRelation: "partner_reservation_types"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          partner_id: string
          plan: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          partner_id: string
          plan?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          partner_id?: string
          plan?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          partner_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_vip_list_entries: {
        Row: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_linked_at?: string | null
          customer_linked_by?: string | null
          email?: string | null
          email_consent?: boolean
          event_id?: string | null
          id?: string
          marketing_consent?: boolean
          name: string
          normalized_phone?: string | null
          partner_id: string
          people_count?: number
          phone?: string | null
          promoter_id?: string | null
          promoter_name_snapshot?: string | null
          public_submitted_at?: string | null
          public_token?: string
          qr_code_payload?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vip_list_id: string
          whatsapp_consent?: boolean
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_linked_at?: string | null
          customer_linked_by?: string | null
          email?: string | null
          email_consent?: boolean
          event_id?: string | null
          id?: string
          marketing_consent?: boolean
          name?: string
          normalized_phone?: string | null
          partner_id?: string
          people_count?: number
          phone?: string | null
          promoter_id?: string | null
          promoter_name_snapshot?: string | null
          public_submitted_at?: string | null
          public_token?: string
          qr_code_payload?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vip_list_id?: string
          whatsapp_consent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "partner_vip_list_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_list_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_list_entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_list_entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_list_entries_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "partner_promoters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_list_entries_vip_list_id_fkey"
            columns: ["vip_list_id"]
            isOneToOne: false
            referencedRelation: "partner_vip_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_vip_lists: {
        Row: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_people_per_entry?: boolean
          auto_close_enabled?: boolean
          close_reason?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string | null
          id?: string
          max_entries?: number | null
          max_entries_per_person?: number
          partner_id: string
          public_cover_url?: string | null
          public_description?: string | null
          public_enabled?: boolean
          public_rules?: string | null
          public_slug: string
          public_title?: string | null
          requires_approval?: boolean
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_people_per_entry?: boolean
          auto_close_enabled?: boolean
          close_reason?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string | null
          id?: string
          max_entries?: number | null
          max_entries_per_person?: number
          partner_id?: string
          public_cover_url?: string | null
          public_description?: string | null
          public_enabled?: boolean
          public_rules?: string | null
          public_slug?: string
          public_title?: string | null
          requires_approval?: boolean
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_vip_lists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_lists_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_vip_lists_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          address: string | null
          aura_last_run_at: string | null
          aura_partner_score: number | null
          aura_partner_summary: string | null
          aura_partner_tags: string[] | null
          aura_suggestions: Json | null
          city: string
          created_at: string
          featured_home: boolean
          formatted_address: string | null
          full_description: string | null
          id: string
          instagram: string | null
          instagram_bio: string | null
          instagram_followers_count: number | null
          instagram_id: string | null
          instagram_last_sync_at: string | null
          instagram_media_count: number | null
          instagram_name: string | null
          instagram_profile_picture_url: string | null
          instagram_profile_url: string | null
          instagram_raw_json: Json | null
          instagram_recent_posts: Json | null
          instagram_sync_error: string | null
          instagram_sync_status: string | null
          instagram_username: string | null
          instagram_validated: boolean
          instagram_website: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          manual_locked_fields: string[] | null
          maps_place_id: string | null
          music_style_primary: string | null
          music_styles_secondary: string[]
          name: string
          neighborhood: string | null
          short_description: string | null
          slug: string
          sports_competitions: string[]
          status: string
          supports_sports: boolean
          type: string
          updated_at: string
          verified_partner: boolean
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          aura_last_run_at?: string | null
          aura_partner_score?: number | null
          aura_partner_summary?: string | null
          aura_partner_tags?: string[] | null
          aura_suggestions?: Json | null
          city?: string
          created_at?: string
          featured_home?: boolean
          formatted_address?: string | null
          full_description?: string | null
          id?: string
          instagram?: string | null
          instagram_bio?: string | null
          instagram_followers_count?: number | null
          instagram_id?: string | null
          instagram_last_sync_at?: string | null
          instagram_media_count?: number | null
          instagram_name?: string | null
          instagram_profile_picture_url?: string | null
          instagram_profile_url?: string | null
          instagram_raw_json?: Json | null
          instagram_recent_posts?: Json | null
          instagram_sync_error?: string | null
          instagram_sync_status?: string | null
          instagram_username?: string | null
          instagram_validated?: boolean
          instagram_website?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          manual_locked_fields?: string[] | null
          maps_place_id?: string | null
          music_style_primary?: string | null
          music_styles_secondary?: string[]
          name: string
          neighborhood?: string | null
          short_description?: string | null
          slug: string
          sports_competitions?: string[]
          status?: string
          supports_sports?: boolean
          type?: string
          updated_at?: string
          verified_partner?: boolean
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          aura_last_run_at?: string | null
          aura_partner_score?: number | null
          aura_partner_summary?: string | null
          aura_partner_tags?: string[] | null
          aura_suggestions?: Json | null
          city?: string
          created_at?: string
          featured_home?: boolean
          formatted_address?: string | null
          full_description?: string | null
          id?: string
          instagram?: string | null
          instagram_bio?: string | null
          instagram_followers_count?: number | null
          instagram_id?: string | null
          instagram_last_sync_at?: string | null
          instagram_media_count?: number | null
          instagram_name?: string | null
          instagram_profile_picture_url?: string | null
          instagram_profile_url?: string | null
          instagram_raw_json?: Json | null
          instagram_recent_posts?: Json | null
          instagram_sync_error?: string | null
          instagram_sync_status?: string | null
          instagram_username?: string | null
          instagram_validated?: boolean
          instagram_website?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          manual_locked_fields?: string[] | null
          maps_place_id?: string | null
          music_style_primary?: string | null
          music_styles_secondary?: string[]
          name?: string
          neighborhood?: string | null
          short_description?: string | null
          slug?: string
          sports_competitions?: string[]
          status?: string
          supports_sports?: boolean
          type?: string
          updated_at?: string
          verified_partner?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          affiliate_code: string | null
          age_confirmed_at: string | null
          avatar_url: string | null
          community_terms_accepted_at: string | null
          cover_image_url: string | null
          created_at: string
          display_name: string | null
          id: string
          nickname: string | null
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          accepted_terms_at?: string | null
          affiliate_code?: string | null
          age_confirmed_at?: string | null
          avatar_url?: string | null
          community_terms_accepted_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          nickname?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          accepted_terms_at?: string | null
          affiliate_code?: string | null
          age_confirmed_at?: string | null
          avatar_url?: string | null
          community_terms_accepted_at?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          nickname?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      promotion_opportunities: {
        Row: {
          affiliate_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          featured: boolean
          id: string
          image_url: string | null
          offer_text: string | null
          partner_id: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          offer_text?: string | null
          partner_id?: string | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          offer_text?: string | null
          partner_id?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ride_offers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          message: string | null
          passenger_id: string | null
          passenger_whatsapp: string | null
          ride_request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          message?: string | null
          passenger_id?: string | null
          passenger_whatsapp?: string | null
          ride_request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          message?: string | null
          passenger_id?: string | null
          passenger_whatsapp?: string | null
          ride_request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_offers_ride_request_id_fkey"
            columns: ["ride_request_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          accepted_offer_id: string | null
          created_at: string
          destination_address: string | null
          destination_is_approximate: boolean
          destination_lat: number | null
          destination_lng: number | null
          drivers_notified_at: string | null
          event_date: string | null
          event_id: string | null
          event_name: string | null
          id: string
          notes: string | null
          origin_accuracy: number | null
          origin_lat: number | null
          origin_lng: number | null
          origin_source: string | null
          passenger_id: string | null
          passengers_count: number
          pickup_address: string | null
          pickup_is_approximate: boolean
          price_note: string | null
          receive_transport_proposals: boolean
          seats_available: number
          status: string
          updated_at: string
          venue_name: string | null
          whatsapp_released: boolean
        }
        Insert: {
          accepted_offer_id?: string | null
          created_at?: string
          destination_address?: string | null
          destination_is_approximate?: boolean
          destination_lat?: number | null
          destination_lng?: number | null
          drivers_notified_at?: string | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          notes?: string | null
          origin_accuracy?: number | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_source?: string | null
          passenger_id?: string | null
          passengers_count?: number
          pickup_address?: string | null
          pickup_is_approximate?: boolean
          price_note?: string | null
          receive_transport_proposals?: boolean
          seats_available?: number
          status?: string
          updated_at?: string
          venue_name?: string | null
          whatsapp_released?: boolean
        }
        Update: {
          accepted_offer_id?: string | null
          created_at?: string
          destination_address?: string | null
          destination_is_approximate?: boolean
          destination_lat?: number | null
          destination_lng?: number | null
          drivers_notified_at?: string | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          notes?: string | null
          origin_accuracy?: number | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_source?: string | null
          passenger_id?: string | null
          passengers_count?: number
          pickup_address?: string | null
          pickup_is_approximate?: boolean
          price_note?: string | null
          receive_transport_proposals?: boolean
          seats_available?: number
          status?: string
          updated_at?: string
          venue_name?: string | null
          whatsapp_released?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      roxou_contacts: {
        Row: {
          contact_type: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          source: string | null
          status: string | null
          subject: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone: string
          source?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          source?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      roxou_news: {
        Row: {
          author: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          seo_keyword: string | null
          slug: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_keyword?: string | null
          slug: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_keyword?: string | null
          slug?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_partners: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      security_reports: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          evidence: string | null
          id: string
          reporter_id: string | null
          severity: string
          status: string
          target_message_id: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          evidence?: string | null
          id?: string
          reporter_id?: string | null
          severity?: string
          status?: string
          target_message_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          evidence?: string | null
          id?: string
          reporter_id?: string | null
          severity?: string
          status?: string
          target_message_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sports_league_standings: {
        Row: {
          created_at: string
          draws: number
          form: string | null
          goal_diff: number
          goals_against: number
          goals_for: number
          id: string
          last_synced_at: string
          league_id: string
          league_label: string
          league_slug: string
          losses: number
          played: number
          points: number
          position: number
          season: string | null
          team_badge: string | null
          team_id: string | null
          team_name: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          draws?: number
          form?: string | null
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          id?: string
          last_synced_at?: string
          league_id: string
          league_label: string
          league_slug: string
          losses?: number
          played?: number
          points?: number
          position: number
          season?: string | null
          team_badge?: string | null
          team_id?: string | null
          team_name: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          draws?: number
          form?: string | null
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          id?: string
          last_synced_at?: string
          league_id?: string
          league_label?: string
          league_slug?: string
          losses?: number
          played?: number
          points?: number
          position?: number
          season?: string | null
          team_badge?: string | null
          team_id?: string | null
          team_name?: string
          updated_at?: string
          wins?: number
        }
        Relationships: []
      }
      sports_match_events: {
        Row: {
          action: string
          created_at: string
          id: string
          match_external_id: string
          match_slug: string | null
          partner_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          match_external_id: string
          match_slug?: string | null
          partner_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          match_external_id?: string
          match_slug?: string | null
          partner_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sports_match_streams: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_official: boolean
          match_id: string
          stream_type: string
          stream_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_official?: boolean
          match_id: string
          stream_type?: string
          stream_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_official?: boolean
          match_id?: string
          stream_type?: string
          stream_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_match_streams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "sports_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_match_venues: {
        Row: {
          confirmed_by_admin: boolean
          created_at: string
          created_by: string | null
          id: string
          is_featured: boolean
          match_id: string
          notes: string | null
          transmission_type: string
          venue_id: string
        }
        Insert: {
          confirmed_by_admin?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          match_id: string
          notes?: string | null
          transmission_type?: string
          venue_id: string
        }
        Update: {
          confirmed_by_admin?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          match_id?: string
          notes?: string | null
          transmission_type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_match_venues_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "sports_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_match_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_match_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "public_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_matches: {
        Row: {
          away_badge: string | null
          away_score: number | null
          away_team: string
          category: string | null
          chat_count: number
          created_at: string
          current_minute: string | null
          external_id: string | null
          finished_at: string | null
          highlight_url: string | null
          home_badge: string | null
          home_score: number | null
          home_team: string
          id: string
          is_featured: boolean
          is_world_cup: boolean
          last_synced_at: string
          league_id: string | null
          league_label: string | null
          league_name: string | null
          match_time: string
          priority: number
          round_label: string | null
          season: string | null
          slug: string
          status: string
          updated_at: string
          venue_name: string | null
          views_count: number
          world_cup_phase: string | null
          youtube_url: string | null
        }
        Insert: {
          away_badge?: string | null
          away_score?: number | null
          away_team: string
          category?: string | null
          chat_count?: number
          created_at?: string
          current_minute?: string | null
          external_id?: string | null
          finished_at?: string | null
          highlight_url?: string | null
          home_badge?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          is_featured?: boolean
          is_world_cup?: boolean
          last_synced_at?: string
          league_id?: string | null
          league_label?: string | null
          league_name?: string | null
          match_time: string
          priority?: number
          round_label?: string | null
          season?: string | null
          slug: string
          status?: string
          updated_at?: string
          venue_name?: string | null
          views_count?: number
          world_cup_phase?: string | null
          youtube_url?: string | null
        }
        Update: {
          away_badge?: string | null
          away_score?: number | null
          away_team?: string
          category?: string | null
          chat_count?: number
          created_at?: string
          current_minute?: string | null
          external_id?: string | null
          finished_at?: string | null
          highlight_url?: string | null
          home_badge?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          is_featured?: boolean
          is_world_cup?: boolean
          last_synced_at?: string
          league_id?: string | null
          league_label?: string | null
          league_name?: string | null
          match_time?: string
          priority?: number
          round_label?: string | null
          season?: string | null
          slug?: string
          status?: string
          updated_at?: string
          venue_name?: string | null
          views_count?: number
          world_cup_phase?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          resolved: boolean
          source: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message: string
          resolved?: boolean
          source?: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          resolved?: boolean
          source?: string
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
      transport_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          ride_request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ride_request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ride_request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_messages_ride_request_id_fkey"
            columns: ["ride_request_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_risk_scores: {
        Row: {
          badge: string
          computed_at: string
          score: number
          signals: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          badge?: string
          computed_at?: string
          score?: number
          signals?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          badge?: string
          computed_at?: string
          score?: number
          signals?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vip_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      public_partners: {
        Row: {
          active: boolean | null
          address: string | null
          aura_partner_score: number | null
          aura_partner_tags: string[] | null
          city: string | null
          created_at: string | null
          featured_home: boolean | null
          formatted_address: string | null
          full_description: string | null
          id: string | null
          instagram: string | null
          instagram_bio: string | null
          instagram_followers_count: number | null
          instagram_id: string | null
          instagram_media_count: number | null
          instagram_name: string | null
          instagram_profile_picture_url: string | null
          instagram_profile_url: string | null
          instagram_username: string | null
          instagram_validated: boolean | null
          instagram_website: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          maps_place_id: string | null
          name: string | null
          neighborhood: string | null
          short_description: string | null
          slug: string | null
          status: string | null
          supports_sports: boolean | null
          type: string | null
          updated_at: string | null
          verified_partner: boolean | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          aura_partner_score?: number | null
          aura_partner_tags?: string[] | null
          city?: string | null
          created_at?: string | null
          featured_home?: boolean | null
          formatted_address?: string | null
          full_description?: string | null
          id?: string | null
          instagram?: string | null
          instagram_bio?: string | null
          instagram_followers_count?: number | null
          instagram_id?: string | null
          instagram_media_count?: number | null
          instagram_name?: string | null
          instagram_profile_picture_url?: string | null
          instagram_profile_url?: string | null
          instagram_username?: string | null
          instagram_validated?: boolean | null
          instagram_website?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          maps_place_id?: string | null
          name?: string | null
          neighborhood?: string | null
          short_description?: string | null
          slug?: string | null
          status?: string | null
          supports_sports?: boolean | null
          type?: string | null
          updated_at?: string | null
          verified_partner?: boolean | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          aura_partner_score?: number | null
          aura_partner_tags?: string[] | null
          city?: string | null
          created_at?: string | null
          featured_home?: boolean | null
          formatted_address?: string | null
          full_description?: string | null
          id?: string | null
          instagram?: string | null
          instagram_bio?: string | null
          instagram_followers_count?: number | null
          instagram_id?: string | null
          instagram_media_count?: number | null
          instagram_name?: string | null
          instagram_profile_picture_url?: string | null
          instagram_profile_url?: string | null
          instagram_username?: string | null
          instagram_validated?: boolean | null
          instagram_website?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          maps_place_id?: string | null
          name?: string | null
          neighborhood?: string | null
          short_description?: string | null
          slug?: string | null
          status?: string | null
          supports_sports?: boolean | null
          type?: string | null
          updated_at?: string | null
          verified_partner?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      _effective_reservation_duration: {
        Args: { _partner_id: string; _type_id: string }
        Returns: number
      }
      _partner_event_slug: { Args: { _title: string }; Returns: string }
      _reservation_short_code: { Args: never; Returns: string }
      _set_partner_vip_list_status: {
        Args: { _list_id: string; _owner_only: boolean; _status: string }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _upsert_partner_lead: {
        Args: {
          _email: string
          _email_consent: boolean
          _marketing_consent: boolean
          _name: string
          _normalized_phone: string
          _partner_id: string
          _phone: string
          _ref_id: string
          _ref_type: string
          _source: string
          _whatsapp_consent: boolean
        }
        Returns: string
      }
      add_partner_vip_entry: {
        Args: { _list_id: string; _payload: Json }
        Returns: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_list_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_find_user_by_email: {
        Args: { _email: string }
        Returns: {
          created_at: string
          email: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      admin_link_partner_pilot: {
        Args: {
          _notes?: string
          _partner_id: string
          _role?: string
          _user_id: string
        }
        Returns: Json
      }
      admin_list_partner_team: {
        Args: { _partner_id: string }
        Returns: {
          beta_enabled: boolean
          created_at: string
          email: string
          is_active: boolean
          last_sign_in_at: string
          partner_user_id: string
          role: string
          user_id: string
        }[]
      }
      admin_partner_pilot_status: {
        Args: { _partner_id: string }
        Returns: Json
      }
      admin_revoke_partner_pilot: {
        Args: { _partner_id: string; _user_id: string }
        Returns: Json
      }
      admin_upsert_partner_subscription: {
        Args: {
          _expires_at?: string
          _partner_id: string
          _plan: string
          _status: string
        }
        Returns: {
          created_at: string
          expires_at: string | null
          id: string
          partner_id: string
          plan: string
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_partner_access_request: {
        Args: { _request_id: string }
        Returns: {
          created_at: string
          id: string
          message: string | null
          partner_id: string
          requested_email: string | null
          requested_name: string | null
          requested_phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_access_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_old_radar_scans: { Args: never; Returns: number }
      archive_partner_event: {
        Args: { _event_id: string }
        Returns: {
          address: string | null
          ai_confidence: string
          ai_confidence_score: number | null
          ai_warnings: Json | null
          aura_badge: string | null
          aura_pick: boolean
          aura_score: number | null
          aura_score_reason: Json | null
          aura_score_updated_at: string | null
          category: string
          city: string
          created_at: string
          date_time: string
          dedupe_key: string | null
          description: string | null
          duplicate_checked_at: string | null
          duplicate_group_id: string | null
          featured: boolean
          flyer_fingerprint: string | null
          hype_score: number | null
          id: string
          image_hash: string | null
          image_url: string | null
          instagram: string | null
          instagram_caption: string | null
          is_sports_transmission: boolean
          latitude: number | null
          longitude: number | null
          maps_place_id: string | null
          meta_description: string | null
          meta_title: string | null
          needs_review: boolean
          opportunity_tags: string[]
          original_detected_title: string | null
          partner_id: string | null
          short_summary: string | null
          slug: string
          sports_match_id: string | null
          sports_transmission_confidence: number | null
          sports_transmission_source: string | null
          status: string
          sub_category: string | null
          submitted_by_partner: boolean
          ticket_url: string | null
          time_is_unknown: boolean
          title: string
          transmission_channel: string | null
          transmission_notes: string | null
          transmission_url: string | null
          transport_reservation_enabled: boolean
          trending_score: number | null
          venue_name: string | null
          verification_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_partner_vip_list: {
        Args: { _list_id: string }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_partner_beta: { Args: { _user: string }; Returns: boolean }
      cancel_partner_vip_entry: {
        Args: { _entry_id: string }
        Returns: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_list_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_waitlist_entry: {
        Args: { _entry_id: string }
        Returns: {
          created_at: string
          expires_at: string | null
          guests_count: number
          id: string
          name: string
          notes: string | null
          notified_at: string | null
          partner_id: string
          phone: string
          reservation_type_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservation_waitlist"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_partner_reservation: {
        Args: { _reservation_id: string }
        Returns: Json
      }
      check_in_partner_vip_entry: {
        Args: { _entry_id: string }
        Returns: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_list_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_event_live_presence: { Args: never; Returns: number }
      close_due_partner_reservations: { Args: never; Returns: number }
      close_due_partner_vip_lists: { Args: never; Returns: number }
      close_partner_vip_list: {
        Args: { _list_id: string }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      community_user_can_speak: { Args: { _user_id: string }; Returns: boolean }
      compute_partner_vip_list_state: {
        Args: {
          _closes_at: string
          _ends_at?: string
          _event_id: string
          _max_entries: number
          _starts_at?: string
          _status: string
          _used: number
        }
        Returns: string
      }
      compute_user_risk_score: { Args: { _user_id: string }; Returns: number }
      confirm_partner_reservation_payment: {
        Args: { _reservation_id: string }
        Returns: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      count_event_live_presence: {
        Args: { _event_id: string }
        Returns: number
      }
      count_event_presence: {
        Args: { _event_id: string }
        Returns: {
          status: string
          total: number
        }[]
      }
      create_partner_event: {
        Args: { _partner_id: string; _payload: Json }
        Returns: {
          address: string | null
          ai_confidence: string
          ai_confidence_score: number | null
          ai_warnings: Json | null
          aura_badge: string | null
          aura_pick: boolean
          aura_score: number | null
          aura_score_reason: Json | null
          aura_score_updated_at: string | null
          category: string
          city: string
          created_at: string
          date_time: string
          dedupe_key: string | null
          description: string | null
          duplicate_checked_at: string | null
          duplicate_group_id: string | null
          featured: boolean
          flyer_fingerprint: string | null
          hype_score: number | null
          id: string
          image_hash: string | null
          image_url: string | null
          instagram: string | null
          instagram_caption: string | null
          is_sports_transmission: boolean
          latitude: number | null
          longitude: number | null
          maps_place_id: string | null
          meta_description: string | null
          meta_title: string | null
          needs_review: boolean
          opportunity_tags: string[]
          original_detected_title: string | null
          partner_id: string | null
          short_summary: string | null
          slug: string
          sports_match_id: string | null
          sports_transmission_confidence: number | null
          sports_transmission_source: string | null
          status: string
          sub_category: string | null
          submitted_by_partner: boolean
          ticket_url: string | null
          time_is_unknown: boolean
          title: string
          transmission_channel: string | null
          transmission_notes: string | null
          transmission_url: string | null
          transport_reservation_enabled: boolean
          trending_score: number | null
          venue_name: string | null
          verification_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_partner_reservation: {
        Args: { _partner_id: string; _payload: Json }
        Returns: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_partner_vip_list: {
        Args: { _partner_id: string; _payload: Json }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_customer_account: { Args: never; Returns: Json }
      duplicate_partner_event: {
        Args: { _event_id: string }
        Returns: {
          address: string | null
          ai_confidence: string
          ai_confidence_score: number | null
          ai_warnings: Json | null
          aura_badge: string | null
          aura_pick: boolean
          aura_score: number | null
          aura_score_reason: Json | null
          aura_score_updated_at: string | null
          category: string
          city: string
          created_at: string
          date_time: string
          dedupe_key: string | null
          description: string | null
          duplicate_checked_at: string | null
          duplicate_group_id: string | null
          featured: boolean
          flyer_fingerprint: string | null
          hype_score: number | null
          id: string
          image_hash: string | null
          image_url: string | null
          instagram: string | null
          instagram_caption: string | null
          is_sports_transmission: boolean
          latitude: number | null
          longitude: number | null
          maps_place_id: string | null
          meta_description: string | null
          meta_title: string | null
          needs_review: boolean
          opportunity_tags: string[]
          original_detected_title: string | null
          partner_id: string | null
          short_summary: string | null
          slug: string
          sports_match_id: string | null
          sports_transmission_confidence: number | null
          sports_transmission_source: string | null
          status: string
          sub_category: string | null
          submitted_by_partner: boolean
          ticket_url: string | null
          time_is_unknown: boolean
          title: string
          transmission_channel: string | null
          transmission_notes: string | null
          transmission_url: string | null
          transport_reservation_enabled: boolean
          trending_score: number | null
          venue_name: string | null
          verification_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_due_partner_reservations: { Args: never; Returns: number }
      expire_due_waitlist_entries: { Args: never; Returns: number }
      expire_stale_ride_requests: { Args: never; Returns: number }
      get_partner_reservation_waitlist: {
        Args: { _partner_id: string }
        Returns: {
          created_at: string
          expires_at: string | null
          guests_count: number
          id: string
          name: string
          notes: string | null
          notified_at: string | null
          partner_id: string
          phone: string
          reservation_type_id: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "partner_reservation_waitlist"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_reservation: { Args: { p_token: string }; Returns: Json }
      get_public_vip_list: { Args: { p_public_slug: string }; Returns: Json }
      get_public_vip_list_by_partner: {
        Args: { p_partner_slug: string }
        Returns: Json
      }
      get_reservation_occupancy_insights: {
        Args: { p_days?: number; p_partner_id: string }
        Returns: {
          avg_usage_minutes: number
          confidence: string
          current_duration_minutes: number
          median_usage_minutes: number
          p75_usage_minutes: number
          reservation_type_id: string
          sample_size: number
          suggested_duration_minutes: number
          type_kind: string
          type_name: string
        }[]
      }
      get_reservation_slot_availability: {
        Args: {
          p_date: string
          p_partner_id: string
          p_reservation_type_id: string
        }
        Returns: {
          available_count: number
          quantity_total: number
          reserved_count: number
          slot_end: string
          slot_start: string
        }[]
      }
      get_reservation_types_availability: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      get_vip_entry_by_token: {
        Args: { p_token: string }
        Returns: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_list_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_match_view: { Args: { _slug: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_partner_editor_or_above: {
        Args: { _partner: string; _user: string }
        Returns: boolean
      }
      is_partner_member: {
        Args: { _partner: string; _user: string }
        Returns: boolean
      }
      is_partner_owner_or_admin: {
        Args: { _partner: string; _user: string }
        Returns: boolean
      }
      is_partner_reservation_manager: {
        Args: { _partner: string; _user: string }
        Returns: boolean
      }
      link_record_to_customer: {
        Args: { _kind: string; _public_token: string }
        Returns: Json
      }
      no_show_partner_vip_entry: {
        Args: { _entry_id: string }
        Returns: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_list_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      normalize_phone: { Args: { _input: string }; Returns: string }
      notify_waitlist_entry: { Args: { _entry_id: string }; Returns: Json }
      open_partner_vip_list: {
        Args: { _list_id: string }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_radar_repost: { Args: { _scan_id: string }; Returns: undefined }
      reject_partner_access_request: {
        Args: { _request_id: string }
        Returns: {
          created_at: string
          id: string
          message: string | null
          partner_id: string
          requested_email: string | null
          requested_name: string | null
          requested_phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_access_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_partner_reservation_table: {
        Args: { _reservation_id: string }
        Returns: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_partner_access: {
        Args: { _partner_id: string; _payload: Json }
        Returns: {
          created_at: string
          id: string
          message: string | null
          partner_id: string
          requested_email: string | null
          requested_name: string | null
          requested_phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_access_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_partner_reservation_status: {
        Args: { _reservation_id: string; _status: string }
        Returns: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_partner_vip_list_public_enabled: {
        Args: { _enabled: boolean; _list_id: string }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_public_reservation: {
        Args: {
          p_email: string
          p_guests: number
          p_name: string
          p_notes: string
          p_partner_slug: string
          p_phone: string
          p_reservation_date: string
          p_type_id: string
        }
        Returns: Json
      }
      submit_public_vip_entry: {
        Args: {
          p_email: string
          p_email_consent?: boolean
          p_marketing_consent?: boolean
          p_name: string
          p_phone: string
          p_promoter_slug?: string
          p_public_slug: string
          p_whatsapp_consent?: boolean
        }
        Returns: Json
      }
      submit_reservation_waitlist: {
        Args: {
          p_guests: number
          p_name: string
          p_notes: string
          p_partner_slug: string
          p_phone: string
          p_type_id: string
        }
        Returns: Json
      }
      update_partner_event: {
        Args: { _event_id: string; _payload: Json }
        Returns: {
          address: string | null
          ai_confidence: string
          ai_confidence_score: number | null
          ai_warnings: Json | null
          aura_badge: string | null
          aura_pick: boolean
          aura_score: number | null
          aura_score_reason: Json | null
          aura_score_updated_at: string | null
          category: string
          city: string
          created_at: string
          date_time: string
          dedupe_key: string | null
          description: string | null
          duplicate_checked_at: string | null
          duplicate_group_id: string | null
          featured: boolean
          flyer_fingerprint: string | null
          hype_score: number | null
          id: string
          image_hash: string | null
          image_url: string | null
          instagram: string | null
          instagram_caption: string | null
          is_sports_transmission: boolean
          latitude: number | null
          longitude: number | null
          maps_place_id: string | null
          meta_description: string | null
          meta_title: string | null
          needs_review: boolean
          opportunity_tags: string[]
          original_detected_title: string | null
          partner_id: string | null
          short_summary: string | null
          slug: string
          sports_match_id: string | null
          sports_transmission_confidence: number | null
          sports_transmission_source: string | null
          status: string
          sub_category: string | null
          submitted_by_partner: boolean
          ticket_url: string | null
          time_is_unknown: boolean
          title: string
          transmission_channel: string | null
          transmission_notes: string | null
          transmission_url: string | null
          transport_reservation_enabled: boolean
          trending_score: number | null
          venue_name: string | null
          verification_source: string | null
          video_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_partner_reservation: {
        Args: { _payload: Json; _reservation_id: string }
        Returns: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_partner_safe_profile: {
        Args: { _partner_id: string; _payload: Json }
        Returns: {
          active: boolean
          address: string | null
          aura_last_run_at: string | null
          aura_partner_score: number | null
          aura_partner_summary: string | null
          aura_partner_tags: string[] | null
          aura_suggestions: Json | null
          city: string
          created_at: string
          featured_home: boolean
          formatted_address: string | null
          full_description: string | null
          id: string
          instagram: string | null
          instagram_bio: string | null
          instagram_followers_count: number | null
          instagram_id: string | null
          instagram_last_sync_at: string | null
          instagram_media_count: number | null
          instagram_name: string | null
          instagram_profile_picture_url: string | null
          instagram_profile_url: string | null
          instagram_raw_json: Json | null
          instagram_recent_posts: Json | null
          instagram_sync_error: string | null
          instagram_sync_status: string | null
          instagram_username: string | null
          instagram_validated: boolean
          instagram_website: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          manual_locked_fields: string[] | null
          maps_place_id: string | null
          music_style_primary: string | null
          music_styles_secondary: string[]
          name: string
          neighborhood: string | null
          short_description: string | null
          slug: string
          sports_competitions: string[]
          status: string
          supports_sports: boolean
          type: string
          updated_at: string
          verified_partner: boolean
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_partner_vip_entry: {
        Args: { _entry_id: string; _payload: Json }
        Returns: {
          checked_in_at: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          email: string | null
          email_consent: boolean
          event_id: string | null
          id: string
          marketing_consent: boolean
          name: string
          normalized_phone: string | null
          partner_id: string
          people_count: number
          phone: string | null
          promoter_id: string | null
          promoter_name_snapshot: string | null
          public_submitted_at: string | null
          public_token: string
          qr_code_payload: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
          vip_list_id: string
          whatsapp_consent: boolean
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_list_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_partner_vip_list: {
        Args: { _list_id: string; _payload: Json }
        Returns: {
          allow_multiple_people_per_entry: boolean
          auto_close_enabled: boolean
          close_reason: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          max_entries: number | null
          max_entries_per_person: number
          partner_id: string
          public_cover_url: string | null
          public_description: string | null
          public_enabled: boolean
          public_rules: string | null
          public_slug: string
          public_title: string | null
          requires_approval: boolean
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_vip_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_partner_radar_memory: {
        Args: {
          _decision: string
          _genre?: string
          _handle: string
          _partner_id: string
          _time?: string
          _type: string
          _weekday?: string
        }
        Returns: undefined
      }
      upsert_partner_reservation_settings: {
        Args: { _partner_id: string; _payload: Json }
        Returns: {
          advance_booking_hours: number
          auto_confirm: boolean
          confirmation_timeout_minutes: number
          created_at: string
          daily_close_time: string
          daily_open_time: string
          default_reservation_duration_minutes: number
          deposit_enabled: boolean
          deposit_type: string
          deposit_value: number
          id: string
          max_people_per_reservation: number
          max_reservations_per_day: number
          partner_id: string
          payment_instructions: string | null
          pix_key: string | null
          pix_receiver_name: string | null
          reservations_enabled: boolean
          reservations_end_at: string | null
          reservations_start_at: string | null
          slot_interval_minutes: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservation_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      waive_partner_reservation_deposit: {
        Args: { _reservation_id: string }
        Returns: {
          auto_close_enabled: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          close_reason: string | null
          closes_at: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          customer_linked_at: string | null
          customer_linked_by: string | null
          deposit_amount: number
          duration_minutes: number | null
          email: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          partner_id: string
          payment_confirmed_at: string | null
          payment_method: string | null
          payment_status: string
          people_count: number
          phone: string | null
          public_token: string
          released_at: string | null
          remaining_amount: number | null
          reservation_date: string
          reservation_type_id: string | null
          status: string
          total_price: number | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "passenger" | "driver" | "admin"
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
    Enums: {
      app_role: ["passenger", "driver", "admin"],
    },
  },
} as const
