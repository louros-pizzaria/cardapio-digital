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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          neighborhood: string
          number: string
          reference_point: string | null
          state: string
          street: string
          user_id: string | null
          zip_code: string
        }
        Insert: {
          city?: string
          complement?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          neighborhood: string
          number: string
          reference_point?: string | null
          state?: string
          street: string
          user_id?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          neighborhood?: string
          number?: string
          reference_point?: string | null
          state?: string
          street?: string
          user_id?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_logs: {
        Row: {
          action: string
          admin_id: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          failed_at: string | null
          id: string
          job_data: Json
          job_type: string
          max_attempts: number
          priority: number
          result_data: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
          timeout_seconds: number | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_data: Json
          job_type: string
          max_attempts?: number
          priority?: number
          result_data?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          timeout_seconds?: number | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_data?: Json
          job_type?: string
          max_attempts?: number
          priority?: number
          result_data?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          timeout_seconds?: number | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          click_count: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          order_position: number | null
          position: string | null
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          order_position?: number | null
          position?: string | null
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          order_position?: number | null
          position?: string | null
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      card_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          installments: number | null
          mercadopago_payment_id: string
          order_id: string
          payment_method_id: string | null
          status: string
          status_detail: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id: string
          installments?: number | null
          mercadopago_payment_id: string
          order_id: string
          payment_method_id?: string | null
          status?: string
          status_detail?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installments?: number | null
          mercadopago_payment_id?: string
          order_id?: string
          payment_method_id?: string | null
          status?: string
          status_detail?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_position: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_position?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_position?: number | null
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          created_at: string | null
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_value: number | null
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_value?: number | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_value?: number | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_segment_members: {
        Row: {
          id: string
          joined_at: string | null
          segment_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          segment_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          segment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segment_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          color: string | null
          created_at: string | null
          criteria: Json
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          criteria: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          license_plate: string
          motorcycle_model: string
          name: string
          phone: string
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate: string
          motorcycle_model: string
          name: string
          phone: string
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string
          motorcycle_model?: string
          name?: string
          phone?: string
          photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_integrations: {
        Row: {
          api_key: string | null
          configuration: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          platform: string
          store_id: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          platform: string
          store_id?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: string
          store_id?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      delivery_platform_orders: {
        Row: {
          created_at: string | null
          external_order_id: string
          id: string
          internal_order_id: string | null
          order_data: Json | null
          platform: string
          status: string
          sync_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_order_id: string
          id?: string
          internal_order_id?: string | null
          order_data?: Json | null
          platform: string
          status: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_order_id?: string
          id?: string
          internal_order_id?: string | null
          order_data?: Json | null
          platform?: string
          status?: string
          sync_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_platform_orders_internal_order_id_fkey"
            columns: ["internal_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_platform_orders_internal_order_id_fkey"
            columns: ["internal_order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          delivery_fee: number
          estimated_time: number
          id: string
          is_active: boolean | null
          neighborhood: string
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number
          estimated_time?: number
          id?: string
          is_active?: boolean | null
          neighborhood: string
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number
          estimated_time?: number
          id?: string
          is_active?: boolean | null
          neighborhood?: string
        }
        Relationships: []
      }
      erp_configurations: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          configuration: Json | null
          created_at: string | null
          erp_system: string
          id: string
          last_sync_at: string | null
          sync_enabled: boolean | null
          sync_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          configuration?: Json | null
          created_at?: string | null
          erp_system: string
          id?: string
          last_sync_at?: string | null
          sync_enabled?: boolean | null
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          configuration?: Json | null
          created_at?: string | null
          erp_system?: string
          id?: string
          last_sync_at?: string | null
          sync_enabled?: boolean | null
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      erp_sync_logs: {
        Row: {
          completed_at: string | null
          erp_system: string
          error_details: Json | null
          id: string
          records_error: number | null
          records_processed: number | null
          records_success: number | null
          started_at: string | null
          status: string | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          erp_system: string
          error_details?: Json | null
          id?: string
          records_error?: number | null
          records_processed?: number | null
          records_success?: number | null
          started_at?: string | null
          status?: string | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          erp_system?: string
          error_details?: Json | null
          id?: string
          records_error?: number | null
          records_processed?: number | null
          records_success?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          column_number: number | null
          created_at: string
          error_type: string
          id: string
          line_number: number | null
          message: string
          metadata: Json | null
          page_url: string
          session_id: string
          severity: string
          source_file: string | null
          stack_trace: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          column_number?: number | null
          created_at?: string
          error_type: string
          id?: string
          line_number?: number | null
          message: string
          metadata?: Json | null
          page_url: string
          session_id: string
          severity: string
          source_file?: string | null
          stack_trace?: string | null
          timestamp: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          column_number?: number | null
          created_at?: string
          error_type?: string
          id?: string
          line_number?: number | null
          message?: string
          metadata?: Json | null
          page_url?: string
          session_id?: string
          severity?: string
          source_file?: string | null
          stack_trace?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      external_orders: {
        Row: {
          created_at: string | null
          customer_data: Json | null
          delivery_address: Json | null
          delivery_fee: number | null
          estimated_delivery: string | null
          external_id: string
          external_status: string | null
          id: string
          internal_order_id: string | null
          items: Json
          platform: string
          platform_fee: number | null
          scheduled_for: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_data?: Json | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          estimated_delivery?: string | null
          external_id: string
          external_status?: string | null
          id?: string
          internal_order_id?: string | null
          items: Json
          platform: string
          platform_fee?: number | null
          scheduled_for?: string | null
          status: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_data?: Json | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          estimated_delivery?: string | null
          external_id?: string
          external_status?: string | null
          id?: string
          internal_order_id?: string | null
          items?: Json
          platform?: string
          platform_fee?: number | null
          scheduled_for?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_orders_internal_order_id_fkey"
            columns: ["internal_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_orders_internal_order_id_fkey"
            columns: ["internal_order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_reports: {
        Row: {
          created_at: string | null
          error_message: string | null
          external_reference: string | null
          file_path: string | null
          generated_at: string | null
          id: string
          reference_date: string
          report_type: string
          sent_at: string | null
          status: string | null
          total_orders: number | null
          total_sales: number | null
          total_taxes: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          external_reference?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          reference_date: string
          report_type: string
          sent_at?: string | null
          status?: string | null
          total_orders?: number | null
          total_sales?: number | null
          total_taxes?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          external_reference?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          reference_date?: string
          report_type?: string
          sent_at?: string | null
          status?: string | null
          total_orders?: number | null
          total_sales?: number | null
          total_taxes?: number | null
        }
        Relationships: []
      }
      group_order_items: {
        Row: {
          created_at: string
          customizations: Json | null
          group_order_id: string
          id: string
          name: string
          price: number
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customizations?: Json | null
          group_order_id: string
          id?: string
          name: string
          price: number
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          customizations?: Json | null
          group_order_id?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_order_items_group_order_id_fkey"
            columns: ["group_order_id"]
            isOneToOne: false
            referencedRelation: "group_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_order_participants: {
        Row: {
          group_order_id: string
          id: string
          joined_at: string
          name: string
          status: string
          total: number | null
          user_id: string
        }
        Insert: {
          group_order_id: string
          id?: string
          joined_at?: string
          name: string
          status?: string
          total?: number | null
          user_id: string
        }
        Update: {
          group_order_id?: string
          id?: string
          joined_at?: string
          name?: string
          status?: string
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_order_participants_group_order_id_fkey"
            columns: ["group_order_id"]
            isOneToOne: false
            referencedRelation: "group_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_orders: {
        Row: {
          created_at: string
          delivery_address: Json | null
          expires_at: string
          host_id: string
          id: string
          name: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_address?: Json | null
          expires_at?: string
          host_id: string
          id?: string
          name: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_address?: Json | null
          expires_at?: string
          host_id?: string
          id?: string
          name?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number | null
          points: number | null
          tier_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          points?: number | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number | null
          points?: number | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          id: string
          points_used: number
          redeemed_at: string | null
          reward_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          points_used: number
          redeemed_at?: string | null
          reward_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          points_used?: number
          redeemed_at?: string | null
          reward_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_cost: number
          reward_type: string
          reward_value?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_cost?: number
          reward_type?: string
          reward_value?: Json | null
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          birthday_bonus: number
          created_at: string
          enabled: boolean
          first_purchase_bonus: number
          id: string
          max_discount_percent: number
          min_purchase: number
          points_per_real: number
          points_to_discount: number
          updated_at: string
        }
        Insert: {
          birthday_bonus?: number
          created_at?: string
          enabled?: boolean
          first_purchase_bonus?: number
          id?: string
          max_discount_percent?: number
          min_purchase?: number
          points_per_real?: number
          points_to_discount?: number
          updated_at?: string
        }
        Update: {
          birthday_bonus?: number
          created_at?: string
          enabled?: boolean
          first_purchase_bonus?: number
          id?: string
          max_discount_percent?: number
          min_purchase?: number
          points_per_real?: number
          points_to_discount?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string | null
          id: string
          min_orders: number
          name: string
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          id?: string
          min_orders: number
          name: string
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          id?: string
          min_orders?: number
          name?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          campaign_type: string
          click_count: number | null
          created_at: string | null
          description: string | null
          id: string
          message: string
          name: string
          open_count: number | null
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_type: string
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          message: string
          name: string
          open_count?: number | null
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_type?: string
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          message?: string
          name?: string
          open_count?: number | null
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          enabled: boolean
          id: string
          in_app_notifications: boolean
          last_notification_sent_at: string | null
          min_attempts_threshold: number
          notification_email: string | null
          notification_frequency: string
          time_window_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          enabled?: boolean
          id?: string
          in_app_notifications?: boolean
          last_notification_sent_at?: string | null
          min_attempts_threshold?: number
          notification_email?: string | null
          notification_frequency?: string
          time_window_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          enabled?: boolean
          id?: string
          in_app_notifications?: boolean
          last_notification_sent_at?: string | null
          min_attempts_threshold?: number
          notification_email?: string | null
          notification_frequency?: string
          time_window_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          customizations: Json | null
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          customizations?: Json | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          customizations?: Json | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          media_url: string | null
          message: string
          message_type: string
          order_id: string
          sender_id: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          message: string
          message_type?: string
          order_id: string
          sender_id?: string | null
          sender_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          message?: string
          message_type?: string
          order_id?: string
          sender_id?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      order_processing_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          failed_at: string | null
          id: string
          idempotency_key: string | null
          max_attempts: number
          order_data: Json
          order_id: string | null
          priority: number
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          max_attempts?: number
          order_data: Json
          order_id?: string | null
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          max_attempts?: number
          order_data?: Json
          order_id?: string | null
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_id: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string | null
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address_snapshot: Json | null
          delivery_fee: number | null
          delivery_method: string | null
          discount_amount: number | null
          estimated_delivery_time: number | null
          id: string
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_id?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address_snapshot?: Json | null
          delivery_fee?: number | null
          delivery_method?: string | null
          discount_amount?: number | null
          estimated_delivery_time?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_id?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address_snapshot?: Json | null
          delivery_fee?: number | null
          delivery_method?: string | null
          discount_amount?: number | null
          estimated_delivery_time?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation: {
        Row: {
          created_at: string | null
          discrepancy_reason: string | null
          expected_amount: number
          external_transaction_id: string
          fee_amount: number | null
          id: string
          internal_transaction_id: string | null
          order_id: string | null
          payment_method: string
          received_amount: number | null
          reconciled_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discrepancy_reason?: string | null
          expected_amount: number
          external_transaction_id: string
          fee_amount?: number | null
          id?: string
          internal_transaction_id?: string | null
          order_id?: string | null
          payment_method: string
          received_amount?: number | null
          reconciled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discrepancy_reason?: string | null
          expected_amount?: number
          external_transaction_id?: string
          fee_amount?: number | null
          id?: string
          internal_transaction_id?: string | null
          order_id?: string | null
          payment_method?: string
          received_amount?: number | null
          reconciled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliation_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_transactions: {
        Row: {
          amount: number
          br_code: string
          created_at: string
          expires_at: string
          id: string
          mercadopago_payment_id: string | null
          order_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          br_code: string
          created_at?: string
          expires_at: string
          id: string
          mercadopago_payment_id?: string | null
          order_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          br_code?: string
          created_at?: string
          expires_at?: string
          id?: string
          mercadopago_payment_id?: string | null
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      product_crusts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_extras: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_pauses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          paused_at: string
          paused_by: string | null
          product_id: string
          reason: string | null
          resume_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          paused_at?: string
          paused_by?: string | null
          product_id: string
          reason?: string | null
          resume_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          paused_at?: string
          paused_by?: string | null
          product_id?: string
          reason?: string | null
          resume_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pauses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_settings: {
        Row: {
          auto_disable_out_of_stock: boolean
          created_at: string
          id: string
          low_stock_threshold: number
          show_old_price_on_sale: boolean
          stock_control_enabled: boolean
          updated_at: string
        }
        Insert: {
          auto_disable_out_of_stock?: boolean
          created_at?: string
          id?: string
          low_stock_threshold?: number
          show_old_price_on_sale?: boolean
          stock_control_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auto_disable_out_of_stock?: boolean
          created_at?: string
          id?: string
          low_stock_threshold?: number
          show_old_price_on_sale?: boolean
          stock_control_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_stock: {
        Row: {
          available_quantity: number
          created_at: string
          id: string
          product_id: string
          reorder_level: number
          reserved_quantity: number
          total_quantity: number | null
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          id?: string
          product_id: string
          reorder_level?: number
          reserved_quantity?: number
          total_quantity?: number | null
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          created_at?: string
          id?: string
          product_id?: string
          reorder_level?: number
          reserved_quantity?: number
          total_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_stock_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_available: boolean | null
          name: string
          order_position: number | null
          price: number
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          name: string
          order_position?: number | null
          price: number
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          name?: string
          order_position?: number | null
          price?: number
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          min_quantity: number | null
          name: string
          promotion_type: string
          target_category_ids: string[] | null
          target_product_ids: string[] | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name: string
          promotion_type: string
          target_category_ids?: string[] | null
          target_product_ids?: string[] | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string
          promotion_type?: string
          target_category_ids?: string[] | null
          target_product_ids?: string[] | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      rum_metrics: {
        Row: {
          connection_type: string | null
          created_at: string
          device_type: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          page_url: string
          session_id: string
          timestamp: string
          unit: string
          user_agent: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          page_url: string
          session_id: string
          timestamp: string
          unit: string
          user_agent?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          page_url?: string
          session_id?: string
          timestamp?: string
          unit?: string
          user_agent?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          reservation_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
          reservation_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          reservation_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_audit_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_key: string | null
          product_id: string
          quantity: number
          reserved_at: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          order_key?: string | null
          product_id: string
          quantity: number
          reserved_at?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_key?: string | null
          product_id?: string
          quantity?: number
          reserved_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_reservations_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_closed_attempts: {
        Row: {
          attempted_at: string
          cart_items_count: number | null
          cart_value: number | null
          created_at: string
          id: string
          ip_address: unknown
          next_opening: string | null
          page_url: string | null
          source: string
          store_schedule: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          attempted_at?: string
          cart_items_count?: number | null
          cart_value?: number | null
          created_at?: string
          id?: string
          ip_address?: unknown
          next_opening?: string | null
          page_url?: string | null
          source: string
          store_schedule?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          attempted_at?: string
          cart_items_count?: number | null
          cart_value?: number | null
          created_at?: string
          id?: string
          ip_address?: unknown
          next_opening?: string | null
          page_url?: string | null
          source?: string
          store_schedule?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      store_info: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          phone: string
          state: string | null
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          additional_schedule_info: string | null
          auto_accept_orders: boolean
          auto_schedule: boolean | null
          closed_message: string | null
          created_at: string
          estimated_prep_time: number
          general_payment_config: Json | null
          id: string
          in_person_payment_config: Json | null
          is_open: boolean
          max_order_value: number
          min_order_value: number
          online_payment_config: Json | null
          schedules: Json | null
          updated_at: string
        }
        Insert: {
          additional_schedule_info?: string | null
          auto_accept_orders?: boolean
          auto_schedule?: boolean | null
          closed_message?: string | null
          created_at?: string
          estimated_prep_time?: number
          general_payment_config?: Json | null
          id?: string
          in_person_payment_config?: Json | null
          is_open?: boolean
          max_order_value?: number
          min_order_value?: number
          online_payment_config?: Json | null
          schedules?: Json | null
          updated_at?: string
        }
        Update: {
          additional_schedule_info?: string | null
          auto_accept_orders?: boolean
          auto_schedule?: boolean | null
          closed_message?: string | null
          created_at?: string
          estimated_prep_time?: number
          general_payment_config?: Json | null
          id?: string
          in_person_payment_config?: Json | null
          is_open?: boolean
          max_order_value?: number
          min_order_value?: number
          online_payment_config?: Json | null
          schedules?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      store_status_logs: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          is_open: boolean
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          is_open: boolean
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          is_open?: boolean
          reason?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_position: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_position?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_expires_at: string | null
          new_plan_name: string | null
          new_status: string | null
          old_expires_at: string | null
          old_plan_name: string | null
          old_status: string | null
          stripe_event_id: string | null
          sync_source: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_expires_at?: string | null
          new_plan_name?: string | null
          new_status?: string | null
          old_expires_at?: string | null
          old_plan_name?: string | null
          old_status?: string | null
          stripe_event_id?: string | null
          sync_source: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_expires_at?: string | null
          new_plan_name?: string | null
          new_status?: string | null
          old_expires_at?: string | null
          old_plan_name?: string | null
          old_status?: string | null
          stripe_event_id?: string | null
          sync_source?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_debug_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          metadata: Json | null
          result: Json | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          result?: Json | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          result?: Json | null
          target_user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          expires_at: string | null
          id: string
          last_synced_at: string | null
          last_webhook_event: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          plan_name: string
          plan_price: number
          raw_metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          sync_status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_event_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          last_webhook_event?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          plan_name?: string
          plan_price?: number
          raw_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_event_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          last_webhook_event?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          plan_name?: string
          plan_price?: number
          raw_metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          dietary_restrictions: string[] | null
          id: string
          mood_preferences: Json | null
          ordering_patterns: Json | null
          preferred_flavors: string[] | null
          price_sensitivity: string | null
          spice_level: number | null
          taste_profile: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dietary_restrictions?: string[] | null
          id?: string
          mood_preferences?: Json | null
          ordering_patterns?: Json | null
          preferred_flavors?: string[] | null
          price_sensitivity?: string | null
          spice_level?: number | null
          taste_profile?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dietary_restrictions?: string[] | null
          id?: string
          mood_preferences?: Json | null
          ordering_patterns?: Json | null
          preferred_flavors?: string[] | null
          price_sensitivity?: string | null
          spice_level?: number | null
          taste_profile?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string
          stripe_signature: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string
          stripe_signature?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string
          stripe_signature?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          platform: string
          processed_at: string | null
          signature: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload: Json
          platform: string
          processed_at?: string | null
          signature?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          platform?: string
          processed_at?: string | null
          signature?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_signatures: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          signature: string
          verified: boolean | null
          verified_at: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
          signature: string
          verified?: boolean | null
          verified_at?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          signature?: string
          verified?: boolean | null
          verified_at?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      orders_with_details: {
        Row: {
          address_id: string | null
          city: string | null
          complement: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          estimated_delivery_time: number | null
          id: string | null
          items_count: number | null
          neighborhood: string | null
          notes: string | null
          number: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: string | null
          reference_point: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          street: string | null
          total_amount: number | null
          total_items: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      atomic_confirm_stock: {
        Args: { p_order_id?: string; p_reservation_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      atomic_release_stock: {
        Args: { p_reason?: string; p_reservation_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      atomic_reserve_stock: {
        Args: {
          p_order_key?: string
          p_product_id: string
          p_quantity: number
          p_ttl_minutes?: number
          p_user_id: string
        }
        Returns: {
          message: string
          reservation_id: string
          success: boolean
        }[]
      }
      auto_reconcile_payments: { Args: never; Returns: number }
      check_subscription_cache: {
        Args: { p_ttl_minutes?: number; p_user_id: string }
        Returns: {
          expires_at: string
          is_active: boolean
          needs_refresh: boolean
          plan_name: string
          plan_price: number
          status: string
        }[]
      }
      cleanup_expired_stock_reservations: { Args: never; Returns: number }
      cleanup_monitoring_data: { Args: never; Returns: number }
      cleanup_old_closed_attempts: { Args: never; Returns: number }
      cleanup_old_debug_logs: { Args: never; Returns: number }
      cleanup_old_queue_items: { Args: never; Returns: number }
      cleanup_old_webhook_signatures: { Args: never; Returns: number }
      cleanup_rate_limits: { Args: never; Returns: number }
      complete_queue_item: {
        Args: { p_order_id?: string; p_queue_id: string; p_result_data?: Json }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      dequeue_next_order: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempts: number
          idempotency_key: string
          order_data: Json
          priority: number
          queue_id: string
          user_id: string
        }[]
      }
      enqueue_background_job: {
        Args: {
          p_job_data: Json
          p_job_type: string
          p_priority?: number
          p_scheduled_at?: string
          p_timeout_seconds?: number
        }
        Returns: {
          job_id: string
          message: string
          success: boolean
        }[]
      }
      enqueue_order_processing: {
        Args: {
          p_idempotency_key?: string
          p_order_data: Json
          p_priority?: number
          p_user_id: string
        }
        Returns: {
          message: string
          queue_id: string
          success: boolean
        }[]
      }
      fail_queue_item: {
        Args: {
          p_error_details?: Json
          p_error_message: string
          p_queue_id: string
          p_reschedule_seconds?: number
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      get_admin_stats: {
        Args: never
        Returns: {
          avg_order_value: number
          completed_orders: number
          pending_orders: number
          today_orders: number
          total_orders: number
          total_products: number
          total_revenue: number
          total_users: number
        }[]
      }
      get_closed_attempts_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          attempts_by_hour: Json
          avg_cart_value: number
          most_common_hour: number
          total_attempts: number
          total_lost_revenue: number
          unique_users: number
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_order_details_for_staff: {
        Args: never
        Returns: {
          city: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          id: string
          items_count: number
          neighborhood: string
          notes: string
          number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          street: string
          total_amount: number
          total_items: number
          updated_at: string
          user_id: string
        }[]
      }
      get_order_health_stats: {
        Args: never
        Returns: {
          avg_completion_time_minutes: number
          expired_orders: number
          payment_failure_rate: number
          pending_orders: number
          total_today: number
        }[]
      }
      get_revenue_chart_data: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          avg_ticket: number
          period_date: string
          total_orders: number
          total_revenue: number
        }[]
      }
      get_user_primary_role: { Args: { _user_id: string }; Returns: string }
      has_any_role: { Args: { _roles: string[] }; Returns: boolean }
      has_role: { Args: { _role: string }; Returns: boolean }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id?: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_changes?: Json
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action?: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      process_external_order: {
        Args: { p_external_id: string; p_order_data: Json; p_platform: string }
        Returns: string
      }
      validate_cpf_format: { Args: { cpf_input: string }; Returns: boolean }
      validate_password_strength: {
        Args: { password_input: string }
        Returns: Json
      }
      validate_product_availability: {
        Args: { product_id: string }
        Returns: boolean
      }
      validate_subscription_consistency: {
        Args: never
        Returns: {
          inconsistency_type: string
          local_status: string
          sync_status: string
          user_id: string
        }[]
      }
    }
    Enums: {
      order_status:
        | "pending_payment"
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "delivering"
        | "delivered"
        | "cancelled"
        | "picked_up"
        | "in_delivery"
        | "expired"
      payment_method:
        | "credit_card"
        | "debit_card"
        | "pix"
        | "cash"
        | "credit_card_online"
        | "debit_card_online"
        | "credit_card_delivery"
        | "debit_card_delivery"
      subscription_status: "active" | "inactive" | "pending" | "cancelled"
      user_role: "customer" | "admin" | "seller" | "attendant"
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
      order_status: [
        "pending_payment",
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "delivering",
        "delivered",
        "cancelled",
        "picked_up",
        "in_delivery",
        "expired",
      ],
      payment_method: [
        "credit_card",
        "debit_card",
        "pix",
        "cash",
        "credit_card_online",
        "debit_card_online",
        "credit_card_delivery",
        "debit_card_delivery",
      ],
      subscription_status: ["active", "inactive", "pending", "cancelled"],
      user_role: ["customer", "admin", "seller", "attendant"],
    },
  },
} as const
