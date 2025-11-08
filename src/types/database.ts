export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          verified: boolean
          updated_at: string
          verification_timestamp: string | null
          verification_method: string | null
          verification_token_id: string | null
          verification_expires_at: string | null
          verification_attempts: number
          max_verification_attempts: number
          last_verification_attempt: string | null
        }
        Insert: {
          id: string
          verified?: boolean
          updated_at?: string
          verification_timestamp?: string | null
          verification_method?: string | null
          verification_token_id?: string | null
          verification_expires_at?: string | null
          verification_attempts?: number
          max_verification_attempts?: number
          last_verification_attempt?: string | null
        }
        Update: {
          id?: string
          verified?: boolean
          updated_at?: string
          verification_timestamp?: string | null
          verification_method?: string | null
          verification_token_id?: string | null
          verification_expires_at?: string | null
          verification_attempts?: number
          max_verification_attempts?: number
          last_verification_attempt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      verification_tokens: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          // Add canonical fields used by tests
          type: string
          method: string
          used: boolean
          expires_at: string
          used_at: string | null
          created_at: string
          created_by_ip: string | null
          metadata: Record<string, any>
          attempts: number
          max_attempts: number
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          type?: string
          method?: string
          used?: boolean
          expires_at: string
          used_at?: string | null
          created_at?: string
          created_by_ip?: string | null
          metadata?: Record<string, any>
          attempts?: number
          max_attempts?: number
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          type?: string
          method?: string
          used?: boolean
          expires_at?: string
          used_at?: string | null
          created_at?: string
          created_by_ip?: string | null
          metadata?: Record<string, any>
          attempts?: number
          max_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "verification_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      verification_audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          created_at: string
          verification_method: string | null
          ip_address: string | null
          user_agent: string | null
          verification_token_id: string | null
          metadata: Record<string, any>
          error_message: string | null
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          created_at?: string
          verification_method?: string | null
          ip_address?: string | null
          user_agent?: string | null
          verification_token_id?: string | null
          metadata?: Record<string, any>
          error_message?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          created_at?: string
          verification_method?: string | null
          ip_address?: string | null
          user_agent?: string | null
          verification_token_id?: string | null
          metadata?: Record<string, any>
          error_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_audit_log_verification_token_id_fkey"
            columns: ["verification_token_id"]
            isOneToOne: false
            referencedRelation: "verification_tokens"
            referencedColumns: ["id"]
          }
        ]
      }
      verification_error_messages: {
        Row: {
          error_type: Database["public"]["Enums"]["verification_error_type"]
          user_message: string
          technical_message: string | null
          retry_allowed: boolean | null
          retry_delay_minutes: number | null
        }
        Insert: {
          error_type: Database["public"]["Enums"]["verification_error_type"]
          user_message: string
          technical_message?: string | null
          retry_allowed?: boolean | null
          retry_delay_minutes?: number | null
        }
        Update: {
          error_type?: Database["public"]["Enums"]["verification_error_type"]
          user_message?: string
          technical_message?: string | null
          retry_allowed?: boolean | null
          retry_delay_minutes?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_verification_token: {
        Args: {
          p_user_id: string
          p_type: string
          p_method: string
          p_expires_in_minutes: number
        }
        Returns: string
      }
      verify_user_token: {
        Args: {
          p_user_id: string
          p_plain_token: string
          p_ip_address?: string | null
          p_user_agent?: string | null
        }
        Returns: { success: boolean; message: string }
      }
      get_verification_status: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_verification_error_message: {
        Args: {
          p_error_type: Database["public"]["Enums"]["verification_error_type"]
        }
        Returns: { user_message: string; retry_allowed: boolean; retry_delay_minutes: number }
      }
      log_verification_error: {
        Args: {
          p_user_id: string
          p_error_type: Database["public"]["Enums"]["verification_error_type"]
          p_context?: Json
          p_ip_address?: string | null
          p_user_agent?: string | null
        }
        Returns: string
      }
      get_verification_audit_trail: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: { audit_id: string; action: string; action_timestamp: string; verification_method: string | null; ip_address: string | null; error_message: string | null; metadata: Json }[]
      }
      get_verification_statistics: {
        Args: {
          p_start_date?: string
          p_end_date?: string
        }
        Returns: { total_verified: number; total_failed: number; total_expired: number; success_rate: number; avg_attempts_per_verification: number }
      }
      verify_verification_integrity: {
        Args: Record<string, never>
        Returns: Json[]
      }
      fix_verification_integrity_issues: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      verification_error_type: 
        | "missing_fields"
        | "invalid_token" 
        | "expired_token"
        | "max_attempts_exceeded"
        | "already_verified"
        | "database_error"
        | "system_error"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}