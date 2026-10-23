/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tipos mínimos de la base. No generamos el archivo completo con la CLI
 * todavía; esto evita que `createClient` infiera `never` y nos da filas
 * abiertas mientras el esquema está en migraciones.
 */
type OpenTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      profiles: OpenTable;
      events: OpenTable;
      event_sources: OpenTable;
      events_staging: OpenTable;
      saved_searches: OpenTable;
      attendance: OpenTable;
      follows: OpenTable;
      push_subscriptions: OpenTable;
      notification_log: OpenTable;
      ingestion_runs: OpenTable;
      geocode_cache: OpenTable;
      app_config: OpenTable;
      promotions: OpenTable;
    };
    Views: {
      event_attendance_counts: {
        Row: {
          event_id: string;
          going_count: number;
          interested_count: number;
        };
        Relationships: [];
      };
    };
    Functions: { get_event_attendees: { Args: { p_event_id: string }; Returns: Array<any>; },
      nearby_events: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
          p_from?: string;
          p_to?: string;
          p_limit?: number;
        };
        Returns: Array<Record<string, any>>;
      };
      search_events: {
        Args: {
          p_query?: string;
          p_city?: string | null;
          p_category?: string | null;
          p_from?: string;
          p_to?: string;
          p_limit?: number;
        };
        Returns: Array<Record<string, any>>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
