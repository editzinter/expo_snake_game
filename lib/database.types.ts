export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      match_history: {
        Row: {
          created_at: string
          id: string
          position: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      player_stats: {
        Row: {
          created_at: string
          games_played: number
          high_score: number
          id: string
          longest_snake: number
          total_play_time: number
          user_id: string
        }
        Insert: {
          created_at?: string
          games_played?: number
          high_score?: number
          id?: string
          longest_snake?: number
          total_play_time?: number
          user_id: string
        }
        Update: {
          created_at?: string
          games_played?: number
          high_score?: number
          id?: string
          longest_snake?: number
          total_play_time?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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