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
          aura_pick: boolean
          category: string
          city: string
          created_at: string
          date_time: string
          description: string | null
          featured: boolean
          id: string
          image_hash: string | null
          image_url: string | null
          instagram: string | null
          latitude: number | null
          longitude: number | null
          maps_place_id: string | null
          opportunity_tags: string[]
          partner_id: string | null
          slug: string
          status: string
          sub_category: string | null
          ticket_url: string | null
          title: string
          venue_name: string | null
          verification_source: string | null
          video_url: string | null
        }
        Insert: {
          address?: string | null
          aura_pick?: boolean
          category?: string
          city?: string
          created_at?: string
          date_time: string
          description?: string | null
          featured?: boolean
          id?: string
          image_hash?: string | null
          image_url?: string | null
          instagram?: string | null
          latitude?: number | null
          longitude?: number | null
          maps_place_id?: string | null
          opportunity_tags?: string[]
          partner_id?: string | null
          slug: string
          status?: string
          sub_category?: string | null
          ticket_url?: string | null
          title: string
          venue_name?: string | null
          verification_source?: string | null
          video_url?: string | null
        }
        Update: {
          address?: string | null
          aura_pick?: boolean
          category?: string
          city?: string
          created_at?: string
          date_time?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_hash?: string | null
          image_url?: string | null
          instagram?: string | null
          latitude?: number | null
          longitude?: number | null
          maps_place_id?: string | null
          opportunity_tags?: string[]
          partner_id?: string | null
          slug?: string
          status?: string
          sub_category?: string | null
          ticket_url?: string | null
          title?: string
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
        ]
      }
      partners: {
        Row: {
          active: boolean
          address: string | null
          city: string
          created_at: string
          featured_home: boolean
          full_description: string | null
          id: string
          instagram: string | null
          instagram_validated: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          neighborhood: string | null
          short_description: string | null
          slug: string
          status: string
          type: string
          updated_at: string
          verified_partner: boolean
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string
          created_at?: string
          featured_home?: boolean
          full_description?: string | null
          id?: string
          instagram?: string | null
          instagram_validated?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          short_description?: string | null
          slug: string
          status?: string
          type?: string
          updated_at?: string
          verified_partner?: boolean
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string
          created_at?: string
          featured_home?: boolean
          full_description?: string | null
          id?: string
          instagram?: string | null
          instagram_validated?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          short_description?: string | null
          slug?: string
          status?: string
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
          destination_lat: number | null
          destination_lng: number | null
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
          price_note: string | null
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
          destination_lat?: number | null
          destination_lng?: number | null
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
          price_note?: string | null
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
          destination_lat?: number | null
          destination_lng?: number | null
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
          price_note?: string | null
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
        ]
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
      [_ in never]: never
    }
    Functions: {
      expire_stale_ride_requests: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
