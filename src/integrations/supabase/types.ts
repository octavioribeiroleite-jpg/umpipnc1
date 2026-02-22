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
      agenda_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          meeting_id: string
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          meeting_id: string
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          meeting_id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          category: Database["public"]["Enums"]["suggestion_category"]
          created_at: string
          edited_content: string | null
          id: string
          meeting_id: string
          original_content: string
          status: Database["public"]["Enums"]["suggestion_status"]
          suggested_event_date: string | null
          suggested_event_title: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["suggestion_category"]
          created_at?: string
          edited_content?: string | null
          id?: string
          meeting_id: string
          original_content: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_event_date?: string | null
          suggested_event_title?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["suggestion_category"]
          created_at?: string
          edited_content?: string | null
          id?: string
          meeting_id?: string
          original_content?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_event_date?: string | null
          suggested_event_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          competence: string
          created_at: string
          due_date: string
          id: string
          member_id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          receipt_url: string | null
          society_id: string | null
          status: string
          transaction_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          competence: string
          created_at?: string
          due_date: string
          id?: string
          member_id: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          society_id?: string | null
          status?: string
          transaction_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          competence?: string
          created_at?: string
          due_date?: string
          id?: string
          member_id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          society_id?: string | null
          status?: string
          transaction_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          agenda_item_id: string | null
          content: string
          created_at: string
          id: string
          meeting_id: string
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda_item_id?: string | null
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda_item_id?: string | null
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      election_attendance: {
        Row: {
          election_id: string
          id: string
          name: string
          present: boolean
        }
        Insert: {
          election_id: string
          id?: string
          name: string
          present?: boolean
        }
        Update: {
          election_id?: string
          id?: string
          name?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "election_attendance_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      election_candidates: {
        Row: {
          display_order: number
          election_id: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          display_order?: number
          election_id: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          display_order?: number
          election_id?: string
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "election_candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      election_votes: {
        Row: {
          candidate_id: string
          created_at: string
          election_id: string
          id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          election_id: string
          id?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          election_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          position: string
          society_id: string | null
          status: string
          total_present: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          position: string
          society_id?: string | null
          status?: string
          total_present?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          position?: string
          society_id?: string | null
          status?: string
          total_present?: number
        }
        Relationships: [
          {
            foreignKeyName: "elections_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          origem: Database["public"]["Enums"]["event_origin"]
          reuniao_id: string | null
          society_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          origem?: Database["public"]["Enums"]["event_origin"]
          reuniao_id?: string | null
          society_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          origem?: Database["public"]["Enums"]["event_origin"]
          reuniao_id?: string | null
          society_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          meeting_id: string | null
          name: string
          size: number | null
          society_id: string | null
          transaction_id: string | null
          type: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          meeting_id?: string | null
          name: string
          size?: number | null
          society_id?: string | null
          transaction_id?: string | null
          type?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          meeting_id?: string | null
          name?: string
          size?: number | null
          society_id?: string | null
          transaction_id?: string | null
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          society_id: string | null
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          society_id?: string | null
          type: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          society_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          competence: string
          created_at: string
          due_day: number
          id: string
          monthly_fee: number
          notes: string | null
          per_capita: number
          society_id: string | null
          updated_at: string
        }
        Insert: {
          competence: string
          created_at?: string
          due_day?: number
          id?: string
          monthly_fee?: number
          notes?: string | null
          per_capita?: number
          society_id?: string | null
          updated_at?: string
        }
        Update: {
          competence?: string
          created_at?: string
          due_day?: number
          id?: string
          monthly_fee?: number
          notes?: string | null
          per_capita?: number
          society_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_settings_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          ai_organized: boolean
          contributions_revealed: boolean
          created_at: string
          date: string
          final_minutes: string | null
          id: string
          meeting_notes: string | null
          moderator_id: string
          society_id: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at: string
          whatsapp_message: string | null
        }
        Insert: {
          ai_organized?: boolean
          contributions_revealed?: boolean
          created_at?: string
          date: string
          final_minutes?: string | null
          id?: string
          meeting_notes?: string | null
          moderator_id: string
          society_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Update: {
          ai_organized?: boolean
          contributions_revealed?: boolean
          created_at?: string
          date?: string
          final_minutes?: string | null
          id?: string
          meeting_notes?: string | null
          moderator_id?: string
          society_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      member_payment_submissions: {
        Row: {
          amount: number | null
          competence: string
          created_at: string
          id: string
          member_id: string
          notes: string | null
          receipt_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          society_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          competence: string
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          receipt_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          society_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          competence?: string
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          receipt_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          society_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_payment_submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_payment_submissions_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          society_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          society_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          society_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_payments: {
        Row: {
          amount: number
          competence: string
          created_at: string
          id: string
          member_id: string
          paid_at: string | null
          receipt_url: string | null
          status: string
        }
        Insert: {
          amount: number
          competence: string
          created_at?: string
          id?: string
          member_id: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          competence?: string
          created_at?: string
          id?: string
          member_id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      pastor_announcements: {
        Row: {
          created_at: string
          created_by: string
          created_by_role: string
          id: string
          message: string
          priority: string
          read_by: Json
          scope: string
          target_societies: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_role?: string
          id?: string
          message: string
          priority?: string
          read_by?: Json
          scope?: string
          target_societies?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_role?: string
          id?: string
          message?: string
          priority?: string
          read_by?: Json
          scope?: string
          target_societies?: string[] | null
          title?: string
        }
        Relationships: []
      }
      pastor_feedback: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          read: boolean
          read_at: string | null
          read_by: string | null
          response: string | null
          section: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          read_by?: string | null
          response?: string | null
          section: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          read_by?: string | null
          response?: string | null
          section?: string
        }
        Relationships: []
      }
      pastor_summaries: {
        Row: {
          created_at: string
          data_hash: string | null
          events_data: Json | null
          generated_at: string
          id: string
          invalidated: boolean
          meetings_data: Json | null
          plenaries_data: Json | null
          society_id: string | null
          stats: Json | null
          summaries: Json | null
        }
        Insert: {
          created_at?: string
          data_hash?: string | null
          events_data?: Json | null
          generated_at?: string
          id?: string
          invalidated?: boolean
          meetings_data?: Json | null
          plenaries_data?: Json | null
          society_id?: string | null
          stats?: Json | null
          summaries?: Json | null
        }
        Update: {
          created_at?: string
          data_hash?: string | null
          events_data?: Json | null
          generated_at?: string
          id?: string
          invalidated?: boolean
          meetings_data?: Json | null
          plenaries_data?: Json | null
          society_id?: string | null
          stats?: Json | null
          summaries?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pastor_summaries_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      plenaries: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          quorum_required: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date?: string
          id?: string
          quorum_required?: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          quorum_required?: number
          title?: string
        }
        Relationships: []
      }
      plenary_attendance: {
        Row: {
          created_at: string
          id: string
          marked_at: string | null
          marked_by: string | null
          member_id: string
          plenary_id: string
          present: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id: string
          plenary_id: string
          present?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id?: string
          plenary_id?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plenary_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plenary_attendance_plenary_id_fkey"
            columns: ["plenary_id"]
            isOneToOne: false
            referencedRelation: "plenaries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          plain_password: string | null
          society_id: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          plain_password?: string | null
          society_id?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          plain_password?: string | null
          society_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      shirt_inventory: {
        Row: {
          average_cost: number
          id: string
          quantity: number
          size: string
          society_id: string | null
          updated_at: string
        }
        Insert: {
          average_cost?: number
          id?: string
          quantity?: number
          size: string
          society_id?: string | null
          updated_at?: string
        }
        Update: {
          average_cost?: number
          id?: string
          quantity?: number
          size?: string
          society_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shirt_inventory_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      shirt_purchase_items: {
        Row: {
          id: string
          purchase_id: string
          quantity: number
          size: string
        }
        Insert: {
          id?: string
          purchase_id: string
          quantity?: number
          size: string
        }
        Update: {
          id?: string
          purchase_id?: string
          quantity?: number
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "shirt_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "shirt_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      shirt_purchases: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          notes: string | null
          receipt_url: string | null
          society_id: string | null
          supplier: string | null
          total_cost: number
          total_quantity: number
          transaction_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          society_id?: string | null
          supplier?: string | null
          total_cost: number
          total_quantity: number
          transaction_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          society_id?: string | null
          supplier?: string | null
          total_cost?: number
          total_quantity?: number
          transaction_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shirt_purchases_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shirt_purchases_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      shirt_sales: {
        Row: {
          buyer_name: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          member_id: string | null
          notes: string | null
          payment_method: string | null
          quantity: number
          receipt_url: string | null
          size: string
          society_id: string | null
          total_price: number | null
          transaction_id: string | null
          unit_price: number
        }
        Insert: {
          buyer_name?: string | null
          created_at?: string
          created_by: string
          date?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string | null
          quantity: number
          receipt_url?: string | null
          size: string
          society_id?: string | null
          total_price?: number | null
          transaction_id?: string | null
          unit_price: number
        }
        Update: {
          buyer_name?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string | null
          quantity?: number
          receipt_url?: string | null
          size?: string
          society_id?: string | null
          total_price?: number | null
          transaction_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shirt_sales_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shirt_sales_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shirt_sales_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      societies: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          meeting_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          society_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          society_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          society_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          date: string
          description: string
          id: string
          member_id: string | null
          origin: string | null
          receipt_url: string | null
          reference_id: string | null
          reference_type: string | null
          society_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          date?: string
          description: string
          id?: string
          member_id?: string | null
          origin?: string | null
          receipt_url?: string | null
          reference_id?: string | null
          reference_type?: string | null
          society_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          id?: string
          member_id?: string | null
          origin?: string | null
          receipt_url?: string | null
          reference_id?: string | null
          reference_type?: string | null
          society_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_task: { Args: { task_id: string }; Returns: undefined }
      get_email_by_username: { Args: { _username: string }; Returns: string }
      get_user_society_id: { Args: { _user_id: string }; Returns: string }
      has_management_role: { Args: { _user_id: string }; Returns: boolean }
      has_pastor_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_society_member: {
        Args: { _event_society_id: string; _user_id: string }
        Returns: boolean
      }
      update_task: {
        Args: {
          clear_assignee?: boolean
          clear_due_date?: boolean
          clear_meeting?: boolean
          new_assignee_id?: string
          new_description?: string
          new_due_date?: string
          new_meeting_id?: string
          new_priority?: Database["public"]["Enums"]["task_priority"]
          new_status?: Database["public"]["Enums"]["task_status"]
          new_title?: string
          task_id: string
        }
        Returns: Json
      }
      update_task_status: {
        Args: {
          new_status: Database["public"]["Enums"]["task_status"]
          task_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "diretoria" | "visualizador" | "pastor"
      contribution_status: "draft" | "final" | "revealed"
      event_origin: "reuniao" | "manual"
      event_status: "confirmado" | "pendente" | "cancelado"
      meeting_status: "aberta" | "fechada"
      suggestion_category:
        | "pauta"
        | "pontos_discutidos"
        | "decisoes"
        | "tarefas"
        | "pendencias"
        | "divergencias"
        | "observacoes"
        | "eventos_sugeridos"
        | "datas_prazos"
      suggestion_status: "pending" | "accepted" | "rejected" | "edited"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done"
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
      app_role: ["admin", "diretoria", "visualizador", "pastor"],
      contribution_status: ["draft", "final", "revealed"],
      event_origin: ["reuniao", "manual"],
      event_status: ["confirmado", "pendente", "cancelado"],
      meeting_status: ["aberta", "fechada"],
      suggestion_category: [
        "pauta",
        "pontos_discutidos",
        "decisoes",
        "tarefas",
        "pendencias",
        "divergencias",
        "observacoes",
        "eventos_sugeridos",
        "datas_prazos",
      ],
      suggestion_status: ["pending", "accepted", "rejected", "edited"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
