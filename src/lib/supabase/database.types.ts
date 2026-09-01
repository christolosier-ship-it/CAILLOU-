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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          active: boolean
          asset_path: string | null
          created_at: string
          description: string | null
          dimensions: Json | null
          id: string
          name: string
          physics: Json | null
          preview_path: string | null
          price_lithons: number
          provenance: Json | null
          scale_max: number
          scale_min: number
          slot: string
          sort_order: number
          triangle_count: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_path?: string | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          id: string
          name: string
          physics?: Json | null
          preview_path?: string | null
          price_lithons: number
          provenance?: Json | null
          scale_max?: number
          scale_min?: number
          slot: string
          sort_order?: number
          triangle_count?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_path?: string | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          id?: string
          name?: string
          physics?: Json | null
          preview_path?: string | null
          price_lithons?: number
          provenance?: Json | null
          scale_max?: number
          scale_min?: number
          slot?: string
          sort_order?: number
          triangle_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      equipped_accessories: {
        Row: {
          accessory_id: string
          equipped_at: string
          slot: string
          user_rock_id: string
        }
        Insert: {
          accessory_id: string
          equipped_at?: string
          slot: string
          user_rock_id: string
        }
        Update: {
          accessory_id?: string
          equipped_at?: string
          slot?: string
          user_rock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipped_accessories_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipped_accessories_user_rock_id_fkey"
            columns: ["user_rock_id"]
            isOneToOne: false
            referencedRelation: "user_rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      lithon_ledger: {
        Row: {
          accessory_id: string | null
          created_at: string
          delta: number
          event_key: string
          id: string
          reason: string
          user_id: string
          user_rock_id: string | null
        }
        Insert: {
          accessory_id?: string | null
          created_at?: string
          delta: number
          event_key: string
          id?: string
          reason: string
          user_id: string
          user_rock_id?: string | null
        }
        Update: {
          accessory_id?: string | null
          created_at?: string
          delta?: number
          event_key?: string
          id?: string
          reason?: string
          user_id?: string
          user_rock_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lithon_ledger_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lithon_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lithon_ledger_user_rock_id_fkey"
            columns: ["user_rock_id"]
            isOneToOne: false
            referencedRelation: "user_rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          username: string
          username_normalized: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          username: string
          username_normalized: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
          username_normalized?: string
        }
        Relationships: []
      }
      rock_catalog: {
        Row: {
          active: boolean
          catalog_index: number
          created_at: string
          description: string | null
          id: string
          label: string
          model_path: string | null
          preview_path: string | null
          short_description: string | null
          source_mesh: string | null
          triangle_count: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          catalog_index: number
          created_at?: string
          description?: string | null
          id: string
          label: string
          model_path?: string | null
          preview_path?: string | null
          short_description?: string | null
          source_mesh?: string | null
          triangle_count?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          catalog_index?: number
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          model_path?: string | null
          preview_path?: string | null
          short_description?: string | null
          source_mesh?: string | null
          triangle_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rock_progress: {
        Row: {
          caress_count: number
          cleaning_count: number
          interaction_count: number
          lithons_generated: number
          observation_seconds: number
          updated_at: string
          user_rock_id: string
        }
        Insert: {
          caress_count?: number
          cleaning_count?: number
          interaction_count?: number
          lithons_generated?: number
          observation_seconds?: number
          updated_at?: string
          user_rock_id: string
        }
        Update: {
          caress_count?: number
          cleaning_count?: number
          interaction_count?: number
          lithons_generated?: number
          observation_seconds?: number
          updated_at?: string
          user_rock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rock_progress_user_rock_id_fkey"
            columns: ["user_rock_id"]
            isOneToOne: true
            referencedRelation: "user_rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accessories: {
        Row: {
          accessory_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          accessory_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          accessory_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_accessories_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_accessories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rocks: {
        Row: {
          adopted_at: string
          created_at: string
          discarded_at: string | null
          id: string
          last_cleaned_at: string | null
          name: string
          specimen_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adopted_at?: string
          created_at?: string
          discarded_at?: string | null
          id?: string
          last_cleaned_at?: string | null
          name: string
          specimen_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adopted_at?: string
          created_at?: string
          discarded_at?: string | null
          id?: string
          last_cleaned_at?: string | null
          name?: string
          specimen_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rocks_specimen_id_fkey"
            columns: ["specimen_id"]
            isOneToOne: false
            referencedRelation: "rock_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_rocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adopt_rock: {
        Args: { p_event_key: string; p_name: string; p_specimen_id: string }
        Returns: {
          adopted_at: string
          rock_name: string
          specimen_id: string
          user_rock_id: string
        }[]
      }
      discard_active_rock: {
        Args: { p_event_key: string; p_user_rock_id: string }
        Returns: {
          discarded_at: string
          user_rock_id: string
        }[]
      }
      equip_accessory: {
        Args: {
          p_accessory_id: string
          p_event_key: string
          p_user_rock_id: string
        }
        Returns: {
          accessory_id: string
          equipped_at: string
          slot: string
          user_rock_id: string
        }[]
      }
      purchase_accessory: {
        Args: { p_accessory_id: string; p_event_key: string }
        Returns: {
          accessory_id: string
          balance: number
          purchased_at: string
        }[]
      }
      register_caress: {
        Args: { p_event_key: string; p_user_rock_id: string }
        Returns: {
          balance: number
          caress_count: number
          lithons_generated: number
        }[]
      }
      register_cleaning: {
        Args: { p_event_key: string; p_user_rock_id: string }
        Returns: {
          cleaning_count: number
          last_cleaned_at: string
        }[]
      }
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
