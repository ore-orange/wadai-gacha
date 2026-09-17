export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      entries: {
        Row: {
          id: string
          player_id: string
          round_id: string
          slot: Database["public"]["Enums"]["slot_type"]
          submitted_at: string | null
          text: string | null
          theme_id: string
        }
        Insert: {
          id?: string
          player_id: string
          round_id: string
          slot: Database["public"]["Enums"]["slot_type"]
          submitted_at?: string | null
          text?: string | null
          theme_id: string
        }
        Update: {
          id?: string
          player_id?: string
          round_id?: string
          slot?: Database["public"]["Enums"]["slot_type"]
          submitted_at?: string | null
          text?: string | null
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      player_secrets: {
        Row: {
          player_id: string
          token: string
        }
        Insert: {
          player_id: string
          token?: string
        }
        Update: {
          player_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_secrets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          id: string
          joined_at: string
          name: string
          room_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          name: string
          room_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          host_player_id: string | null
          id: string
          phase: Database["public"]["Enums"]["room_phase"]
        }
        Insert: {
          code: string
          created_at?: string
          host_player_id?: string | null
          id?: string
          phase?: Database["public"]["Enums"]["room_phase"]
        }
        Update: {
          code?: string
          created_at?: string
          host_player_id?: string | null
          id?: string
          phase?: Database["public"]["Enums"]["room_phase"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_player_id_fkey"
            columns: ["host_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      round_themes: {
        Row: {
          round_id: string
          slot: Database["public"]["Enums"]["slot_type"]
          theme_id: string
        }
        Insert: {
          round_id: string
          slot: Database["public"]["Enums"]["slot_type"]
          theme_id: string
        }
        Update: {
          round_id?: string
          slot?: Database["public"]["Enums"]["slot_type"]
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_themes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["round_mode"]
          number: number
          phase: Database["public"]["Enums"]["round_phase"]
          room_id: string
          sentences: Json | null
          submitted_count: number
          total_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["round_mode"]
          number: number
          phase?: Database["public"]["Enums"]["round_phase"]
          room_id: string
          sentences?: Json | null
          submitted_count?: number
          total_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["round_mode"]
          number?: number
          phase?: Database["public"]["Enums"]["round_phase"]
          room_id?: string
          sentences?: Json | null
          submitted_count?: number
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          created_at: string
          id: string
          slot: Database["public"]["Enums"]["slot_type"]
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          slot: Database["public"]["Enums"]["slot_type"]
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          slot?: Database["public"]["Enums"]["slot_type"]
          text?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_host: {
        Args: { p_room_id: string; p_token: string }
        Returns: {
          code: string
          created_at: string
          host_player_id: string | null
          id: string
          phase: Database["public"]["Enums"]["room_phase"]
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _compose_sentences: { Args: { p_round_id: string }; Returns: Json }
      _player_from_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          joined_at: string
          name: string
          room_id: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _random_theme: {
        Args: {
          p_exclude?: string
          p_slot: Database["public"]["Enums"]["slot_type"]
        }
        Returns: string
      }
      create_room: { Args: { p_name: string }; Returns: Json }
      deal_slots: {
        Args: { p_round_id: string; p_token: string }
        Returns: undefined
      }
      finish_room: {
        Args: { p_room_id: string; p_token: string }
        Returns: undefined
      }
      get_room_state: {
        Args: { p_room_id: string; p_token: string }
        Returns: Json
      }
      join_room: { Args: { p_code: string; p_name: string }; Returns: Json }
      reroll_theme: {
        Args: {
          p_round_id: string
          p_slot: Database["public"]["Enums"]["slot_type"]
          p_token: string
        }
        Returns: undefined
      }
      start_round: {
        Args: { p_room_id: string; p_token: string }
        Returns: string
      }
      submit_entry: {
        Args: { p_entry_id: string; p_text: string; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      room_phase: "lobby" | "playing" | "finished"
      round_mode: "single" | "everyone"
      round_phase: "rolling" | "writing" | "revealed"
      slot_type: "when" | "where" | "who" | "what" | "how"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      room_phase: ["lobby", "playing", "finished"],
      round_mode: ["single", "everyone"],
      round_phase: ["rolling", "writing", "revealed"],
      slot_type: ["when", "where", "who", "what", "how"],
    },
  },
} as const

