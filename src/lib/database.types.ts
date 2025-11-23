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
      trips: {
        Row: {
          id: string
          name: string
          date: string
          tracking_mode: 'individuals' | 'families'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          tracking_mode: 'individuals' | 'families'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          tracking_mode?: 'individuals' | 'families'
          created_at?: string
        }
      }
      families: {
        Row: {
          id: string
          trip_id: string
          family_name: string
          adults: number
          children: number
        }
        Insert: {
          id?: string
          trip_id: string
          family_name: string
          adults: number
          children: number
        }
        Update: {
          id?: string
          trip_id?: string
          family_name?: string
          adults?: number
          children?: number
        }
      }
      participants: {
        Row: {
          id: string
          trip_id: string
          family_id: string | null
          name: string
          is_adult: boolean
        }
        Insert: {
          id?: string
          trip_id: string
          family_id?: string | null
          name: string
          is_adult: boolean
        }
        Update: {
          id?: string
          trip_id?: string
          family_id?: string | null
          name?: string
          is_adult?: boolean
        }
      }
      expenses: {
        Row: {
          id: string
          trip_id: string
          name: string
          amount: number
          paid_by: string
          date: string
          category: string
          comment: string | null
          distribution: Json
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
          amount: number
          paid_by: string
          date: string
          category: string
          comment?: string | null
          distribution: Json
        }
        Update: {
          id?: string
          trip_id?: string
          name?: string
          amount?: number
          paid_by?: string
          date?: string
          category?: string
          comment?: string | null
          distribution?: Json
        }
      }
      settlements: {
        Row: {
          id: string
          trip_id: string
          from_participant: string
          to_participant: string
          amount: number
          date: string
        }
        Insert: {
          id?: string
          trip_id: string
          from_participant: string
          to_participant: string
          amount: number
          date: string
        }
        Update: {
          id?: string
          trip_id?: string
          from_participant?: string
          to_participant?: string
          amount?: number
          date?: string
        }
      }
      meals: {
        Row: {
          id: string
          trip_id: string
          date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner'
          name: string
          description: string | null
          responsible_participant_id: string
          status: 'planned' | 'in_progress' | 'done'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner'
          name: string
          description?: string | null
          responsible_participant_id: string
          status?: 'planned' | 'in_progress' | 'done'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          date?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner'
          name?: string
          description?: string | null
          responsible_participant_id?: string
          status?: 'planned' | 'in_progress' | 'done'
          notes?: string | null
          created_at?: string
        }
      }
      shopping_items: {
        Row: {
          id: string
          trip_id: string
          description: string
          is_completed: boolean
          category: string | null
          quantity: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          description: string
          is_completed?: boolean
          category?: string | null
          quantity?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          description?: string
          is_completed?: boolean
          category?: string | null
          quantity?: string | null
          created_at?: string
        }
      }
      meal_shopping_items: {
        Row: {
          id: string
          meal_id: string
          shopping_item_id: string
          quantity: string | null
        }
        Insert: {
          id?: string
          meal_id: string
          shopping_item_id: string
          quantity?: string | null
        }
        Update: {
          id?: string
          meal_id?: string
          shopping_item_id?: string
          quantity?: string | null
        }
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
  }
}
