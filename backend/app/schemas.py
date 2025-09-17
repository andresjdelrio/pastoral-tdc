from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class EventBase(BaseModel):
    strategic_line: str
    activity: str
    year: int

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RegistrantBase(BaseModel):
    full_name: str
    rut: Optional[str] = None
    university_email: Optional[str] = None
    career: Optional[str] = None  # career_or_area in API
    phone: Optional[str] = None
    additional_data: Optional[str] = None

class RegistrationBase(BaseModel):
    activity_id: int
    registrant_id: int
    attended: bool = False

class RegistrationCreate(RegistrationBase):
    event_id: int

class RegistrationUpdate(BaseModel):
    full_name: Optional[str] = None
    rut: Optional[str] = None
    university_email: Optional[str] = None
    career: Optional[str] = None
    phone: Optional[str] = None
    attended: Optional[bool] = None

class Registration(RegistrationBase):
    id: int
    event_id: int
    registered_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UploadBase(BaseModel):
    filename: str
    original_headers: str
    mapped_headers: str
    records_count: int
    event_id: int

class Upload(UploadBase):
    id: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

class CSVUploadRequest(BaseModel):
    strategic_line: str
    activity: str
    year: int
    column_mappings: Dict[str, str]  # Maps CSV headers to canonical fields

class CSVPreviewResponse(BaseModel):
    headers: List[str]
    sample_data: List[Dict[str, Any]]
    suggested_mappings: Dict[str, str]

class MetadataValueResponse(BaseModel):
    field_name: str
    values: List[str]

class DashboardStats(BaseModel):
    total_registrations: int
    total_participations: int
    conversion_rate: float
    unique_persons: int
    stats_by_strategic_line: Dict[str, Dict[str, int]]
    stats_by_year: Dict[int, Dict[str, int]]