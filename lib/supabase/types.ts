export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          industry: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          industry: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          industry?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      competency_types: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      gap_tags: {
        Row: {
          category: string
          company_id: string | null
          created_at: number
          id: string
          job_id: string | null
          label: string
          question_id: string | null
          questions: Json | null
          source: string
          user_id: string
          job_group: string | null
          job_role: string | null
          diagnosis_result_id: string | null
        }
        Insert: {
          category: string
          company_id?: string | null
          created_at: number
          id: string
          job_id?: string | null
          label: string
          question_id?: string | null
          questions?: Json | null
          source: string
          user_id: string
          job_group?: string | null
          job_role?: string | null
          diagnosis_result_id?: string | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: number
          id?: string
          job_id?: string | null
          label?: string
          question_id?: string | null
          questions?: Json | null
          source?: string
          user_id?: string
          job_group?: string | null
          job_role?: string | null
          diagnosis_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gap_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_tags_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          department: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          job_title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          department?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          job_title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          department?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          job_title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      active_editors: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          project_id: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string
          project_id: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          project_id?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_editors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_editors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          badge_type: string | null
          created_at: number
          custom_label: string | null
          id: string
          is_manually_positioned: boolean | null
          is_shared: boolean | null
          label: string
          level: number
          node_type: string | null
          parent_id: string | null
          project_id: string
          shared_link: string | null
          updated_at: number
          x: number
          y: number
        }
        Insert: {
          badge_type?: string | null
          created_at: number
          custom_label?: string | null
          id: string
          is_manually_positioned?: boolean | null
          is_shared?: boolean | null
          label: string
          level?: number
          node_type?: string | null
          parent_id?: string | null
          project_id: string
          shared_link?: string | null
          updated_at: number
          x?: number
          y?: number
        }
        Update: {
          badge_type?: string | null
          created_at?: number
          custom_label?: string | null
          id?: string
          is_manually_positioned?: boolean | null
          is_shared?: boolean | null
          label?: string
          level?: number
          node_type?: string | null
          parent_id?: string | null
          project_id?: string
          shared_link?: string | null
          updated_at?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          badges: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_favorite: boolean
          is_shared: boolean | null
          layout_config: Json | null
          layout_type: string | null
          name: string
          post_its: Json | null
          shared_by: string | null
          shared_by_user: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean
          is_shared?: boolean | null
          layout_config?: Json | null
          layout_type?: string | null
          name: string
          post_its?: Json | null
          shared_by?: string | null
          shared_by_user?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean
          is_shared?: boolean | null
          layout_config?: Json | null
          layout_type?: string | null
          name?: string
          post_its?: Json | null
          shared_by?: string | null
          shared_by_user?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          competency_type_id: string | null
          content: string
          created_at: string | null
          difficulty: string | null
          id: string
          job_id: string
          max_chars: number | null
          question_no: number
          recruitment_id: string
          updated_at: string | null
        }
        Insert: {
          competency_type_id?: string | null
          content: string
          created_at?: string | null
          difficulty?: string | null
          id: string
          job_id: string
          max_chars?: number | null
          question_no: number
          recruitment_id: string
          updated_at?: string | null
        }
        Update: {
          competency_type_id?: string | null
          content?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          job_id?: string
          max_chars?: number | null
          question_no?: number
          recruitment_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_competency_type_id_fkey"
            columns: ["competency_type_id"]
            isOneToOne: false
            referencedRelation: "competency_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_recruitment_id_fkey"
            columns: ["recruitment_id"]
            isOneToOne: false
            referencedRelation: "recruitments"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitments: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          end_date: string
          half: string
          id: string
          start_date: string
          title: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          end_date: string
          half: string
          id: string
          start_date: string
          title?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string
          half?: string
          id?: string
          start_date?: string
          title?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruitments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_nodes: {
        Row: {
          created_at: number
          created_by: string | null
          id: string
          include_star: boolean | null
          node_id: string
          project_id: string
        }
        Insert: {
          created_at: number
          created_by?: string | null
          id: string
          include_star?: boolean | null
          node_id: string
          project_id: string
        }
        Update: {
          created_at?: number
          created_by?: string | null
          id?: string
          include_star?: boolean | null
          node_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_nodes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_nodes_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      star_assets: {
        Row: {
          action: string | null
          company: string | null
          company_id: string | null
          competency: string | null
          content: string | null
          created_at: number
          id: string
          job_id: string | null
          node_id: string
          result: string | null
          situation: string | null
          tags: Json | null
          task: string | null
          title: string
          updated_at: number
        }
        Insert: {
          action?: string | null
          company?: string | null
          company_id?: string | null
          competency?: string | null
          content?: string | null
          created_at: number
          id: string
          job_id?: string | null
          node_id: string
          result?: string | null
          situation?: string | null
          tags?: Json | null
          task?: string | null
          title: string
          updated_at: number
        }
        Update: {
          action?: string | null
          company?: string | null
          company_id?: string | null
          competency?: string | null
          content?: string | null
          created_at?: number
          id?: string
          job_id?: string | null
          node_id?: string
          result?: string | null
          situation?: string | null
          tags?: Json | null
          task?: string | null
          title?: string
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "star_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "star_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "star_assets_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: true
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          provider: string
          provider_user_id: string
          updated_at: string | null
          job_group: string | null
          job_role: string | null
          onboarding_completed: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          provider: string
          provider_user_id: string
          updated_at?: string | null
          job_group?: string | null
          job_role?: string | null
          onboarding_completed?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          provider?: string
          provider_user_id?: string
          updated_at?: string | null
          job_group?: string | null
          job_role?: string | null
          onboarding_completed?: boolean | null
        }
        Relationships: []
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
