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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          admin_note: string | null
          applicant_id: string
          applicant_type: string
          created_at: string | null
          id: string
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_note?: string | null
          applicant_id: string
          applicant_type: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_note?: string | null
          applicant_id?: string
          applicant_type?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          created_at: string | null
          feedback: string | null
          final_mark: number | null
          id: string
          individual_adjustment: number | null
          project_id: string | null
          released: boolean | null
          team_id: string | null
          team_mark: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          final_mark?: number | null
          id?: string
          individual_adjustment?: number | null
          project_id?: string | null
          released?: boolean | null
          team_id?: string | null
          team_mark?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          final_mark?: number | null
          id?: string
          individual_adjustment?: number | null
          project_id?: string | null
          released?: boolean | null
          team_id?: string | null
          team_mark?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          field_of_study: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_level?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_level?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_recommendations: {
        Row: {
          created_at: string
          id: string
          match_score: number
          project_id: string
          reasoning: string | null
          skill_match_details: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score: number
          project_id: string
          reasoning?: string | null
          skill_match_details?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number
          project_id?: string
          reasoning?: string | null
          skill_match_details?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean | null
          assessor_ids: string[] | null
          capacity: number | null
          category: string
          created_at: string
          description: string
          difficulty_level: string
          estimated_duration: string
          id: string
          industry_relevance: string | null
          learning_outcomes: string[]
          mentorship_available: boolean | null
          preferred_skills: string[]
          published: boolean | null
          required_skills: string[]
          team_size_max: number
          team_size_min: number
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          assessor_ids?: string[] | null
          capacity?: number | null
          category: string
          created_at?: string
          description: string
          difficulty_level: string
          estimated_duration: string
          id?: string
          industry_relevance?: string | null
          learning_outcomes?: string[]
          mentorship_available?: boolean | null
          preferred_skills?: string[]
          published?: boolean | null
          required_skills?: string[]
          team_size_max?: number
          team_size_min?: number
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          assessor_ids?: string[] | null
          capacity?: number | null
          category?: string
          created_at?: string
          description?: string
          difficulty_level?: string
          estimated_duration?: string
          id?: string
          industry_relevance?: string | null
          learning_outcomes?: string[]
          mentorship_available?: boolean | null
          preferred_skills?: string[]
          published?: boolean | null
          required_skills?: string[]
          team_size_max?: number
          team_size_min?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          academic_level: string
          courses: string[]
          created_at: string
          email: string
          experience_level: string | null
          field_of_study: string
          id: string
          interests: string[]
          name: string
          preferred_project_duration: string | null
          preferred_team_size: string | null
          skills: string[]
          time_commitment: string | null
          university: string | null
          updated_at: string
          user_id: string
          wam: number | null
        }
        Insert: {
          academic_level: string
          courses?: string[]
          created_at?: string
          email: string
          experience_level?: string | null
          field_of_study: string
          id?: string
          interests?: string[]
          name: string
          preferred_project_duration?: string | null
          preferred_team_size?: string | null
          skills?: string[]
          time_commitment?: string | null
          university?: string | null
          updated_at?: string
          user_id: string
          wam?: number | null
        }
        Update: {
          academic_level?: string
          courses?: string[]
          created_at?: string
          email?: string
          experience_level?: string | null
          field_of_study?: string
          id?: string
          interests?: string[]
          name?: string
          preferred_project_duration?: string | null
          preferred_team_size?: string | null
          skills?: string[]
          time_commitment?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string
          wam?: number | null
        }
        Relationships: []
      }
      student_subjects: {
        Row: {
          created_at: string
          id: string
          subject_code: string
          term: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_code: string
          term: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_code?: string
          term?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          term: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          term?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          term?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string | null
          id: string
          level: number | null
          skill_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number | null
          skill_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number | null
          skill_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_team_creator: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "student"
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
      user_role: ["admin", "student"],
    },
  },
} as const
