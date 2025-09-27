export interface Activity {
  id: number;
  strategic_line: string;
  activity: string;
  year: number;
  audience: string;
  created_at: string;
}

export interface Registrant {
  id: number;
  activity_id: number;
  full_name: string;
  rut?: string;
  university_email?: string;
  career?: string;
  phone?: string;
  additional_data?: string;
  attended: boolean;
  registered_at: string;
  updated_at: string;
}

export interface Upload {
  id: number;
  filename: string;
  original_headers: string;
  mapped_headers: string;
  records_count: number;
  activity_id: number;
  uploaded_at: string;
}

export interface DashboardStats {
  total_registrations: number;
  total_participations: number;
  conversion_rate: number;
  unique_persons: number;
  stats_by_strategic_line: Record<string, {
    registrations: number;
    participations: number;
    conversion_rate: number;
  }>;
  stats_by_year: Record<number, {
    registrations: number;
    participations: number;
    conversion_rate: number;
  }>;
}

export interface CSVPreview {
  headers: string[];
  sample_data: Record<string, any>[];
  suggested_mappings: Record<string, string>;
}

export interface ColumnMapping {
  [csvHeader: string]: string; // Maps CSV header to canonical field
}

export interface CanonicalField {
  id: string;
  label: string;
  required: boolean;
  description: string;
}

export interface UploadMetadata {
  strategic_line: string;
  activity: string;
  year: number;
  audience: string;
}

export interface ValidationSummary {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  validation_rate: number;
}

export interface DuplicateDetectionResult {
  within_upload: number;
  against_existing: number;
  total_added_to_queue: number;
  method_used: string;
}

export interface UploadResult {
  message: string;
  activity_id: number;
  registrations_created: number;
  upload_id: number;
  validation_summary: ValidationSummary;
  duplicate_detection: DuplicateDetectionResult;
  metadata: {
    strategic_line: string;
    activity: string;
    year: number;
    audience: string;
  };
  enriched_csv_download?: string;
  errors?: string[];
  total_errors?: number;
}

// Indicators interfaces
export interface YearlyIndicators {
  year: number;
  inscripciones: number;
  participaciones: number;
  tasa: number;
  personas_inscritas: number;
  personas_participantes: number;
}

export interface PeopleIndicators {
  year: number;
  estudiantes_inscritas: number;
  estudiantes_participantes: number;
  colaboradores_inscritas: number;
  colaboradores_participantes: number;
  total_inscritas: number;
  total_participantes: number;
}

export interface AudienceData {
  total: YearlyIndicators[];
  estudiantes: YearlyIndicators[];
  colaboradores: YearlyIndicators[];
}

export interface StrategicLineData {
  yearly: AudienceData;
  total: {
    total: Omit<YearlyIndicators, 'year'>;
    estudiantes: Omit<YearlyIndicators, 'year'>;
    colaboradores: Omit<YearlyIndicators, 'year'>;
  };
}

export interface IndicatorsData {
  yearly: AudienceData;
  people: PeopleIndicators[];
  strategic: {
    'Apostolado': StrategicLineData;
    'Sacramentos': StrategicLineData;
    'Crecimiento Espiritual': StrategicLineData;
    'Identidad y Comunidad': StrategicLineData;
  };
}

// Attendance management interfaces
export interface ActivitySummary {
  id: number;
  name: string;
  strategic_line: string;
  year: number;
  registrations_count: number;
  attended_count: number;
  created_at: string;
}

export interface RegistrationDetail {
  registration_id: number;
  registrant_id: number;
  full_name: string;
  email?: string;
  rut?: string;
  career_or_area?: string;
  person_type: string;
  participation_status: string;
  source: string;
  registered_at: string;
}

export interface WalkInRequest {
  full_name: string;
  rut?: string;
  university_email?: string;
  career_or_area?: string;
  person_type?: 'student' | 'collab';
}

export interface WalkInResponse {
  registration_id: number;
  registrant_id: number;
  full_name: string;
  email?: string;
  rut?: string;
  career_or_area?: string;
  person_type: string;
  participation_status: string;
  source: string;
  was_existing_registrant: boolean;
  validation_errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Catalog management interfaces
export interface CatalogStrategicLine {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogActivity {
  id: number;
  name: string;
  strategic_line_id: number;
  strategic_line_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogCareer {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogStrategicLineCreate {
  name: string;
  active?: boolean;
}

export interface CatalogActivityCreate {
  name: string;
  strategic_line_id: number;
  active?: boolean;
}

export interface CatalogCareerCreate {
  name: string;
  active?: boolean;
}

export interface ReconciliationMapping {
  id: number;
  catalog_type: 'strategic_line' | 'activity' | 'career';
  unknown_value: string;
  catalog_id: number;
  catalog_name: string;
  mapped_by?: string;
  created_at: string;
}

export interface ReconciliationMappingCreate {
  catalog_type: 'strategic_line' | 'activity' | 'career';
  unknown_value: string;
  catalog_id: number;
  mapped_by?: string;
}

// File Management interfaces
export interface FileInfo {
  id: number;
  filename: string;
  activity_name: string;
  strategic_line: string;
  year: number;
  audience: string;
  records_count: number;
  valid_records_count: number;
  invalid_records_count: number;
  uploaded_at: string;
  file_size_mb?: number;
}

export interface FileListResponse {
  files: FileInfo[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ReportRequest {
  activity_ids?: number[];
  strategic_lines?: string[];
  years?: number[];
  audiences?: string[];
  include_attendance: boolean;
  include_validation_errors: boolean;
  report_format: 'csv' | 'excel';
}