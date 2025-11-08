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
          token_type: string
          expires_at: string
          used_at: string | null
          created_at: string
          created_by_ip: string | null
          metadata: Json
          attempts: number
          max_attempts: number
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          token_type?: string
          expires_at: string
          used_at?: string | null
          created_at?: string
          created_by_ip?: string | null
          metadata?: Json
          attempts?: number
          max_attempts?: number
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          token_type?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
          created_by_ip?: string | null
          metadata?: Json
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
          action_timestamp: string
          action_by_ip: string | null
          action_by_user_agent: string | null
          verification_token_id: string | null
          details: Json
          success: boolean
          error_message: string | null
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          action_timestamp?: string
          action_by_ip?: string | null
          action_by_user_agent?: string | null
          verification_token_id?: string | null
          details?: Json
          success?: boolean
          error_message?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          action_timestamp?: string
          action_by_ip?: string | null
          action_by_user_agent?: string | null
          verification_token_id?: string | null
          details?: Json
          success?: boolean
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
          p_token: string
          p_method: string
        }
        Returns: Json
      }
      get_verification_status: {
        Args: {
          p_user_id: string
        }
        Returns: Json
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