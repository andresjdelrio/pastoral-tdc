from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    strategic_line = Column(String(100), nullable=False)  # Apostolado, Sacramentos, etc.
    activity = Column(String(200), nullable=False)
    year = Column(Integer, nullable=False)
    audience = Column(String(20), nullable=False, default='estudiantes')  # estudiantes, colaboradores
    created_at = Column(DateTime, server_default=func.now())

    registrations = relationship("Registration", back_populates="activity")

class Registrant(Base):
    __tablename__ = "registrants"

    id = Column(Integer, primary_key=True, index=True)

    # Canonical person identifier - used for deduplication and counting unique people
    person_id = Column(Integer, nullable=True, index=True)  # References the canonical registrant ID (self-referential)

    # Canonical fields from CSV (normalized)
    full_name = Column(String(200), nullable=False)
    rut = Column(String(20), nullable=True, index=True)
    university_email = Column(String(200), nullable=True)
    career = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)

    # Name normalization fields
    raw_full_name = Column(String(200), nullable=True)  # Original name as received
    normalized_full_name = Column(String(200), nullable=True, index=True)  # Diacritics stripped + InitCap
    canonical_full_name = Column(String(200), nullable=True, index=True)  # Initially = normalized; editable after review

    # Raw/original values before normalization
    raw_career = Column(String(200), nullable=True)  # Original career before normalization

    # Audience classification (for scoping matches)
    audience = Column(String(20), nullable=True, index=True)  # 'estudiantes' or 'colaboradores'

    # Validation tracking
    row_valid = Column(Boolean, default=True, nullable=False)  # Overall row validity
    validation_errors = Column(Text, nullable=True)  # JSON string of validation errors
    error_types = Column(String(500), nullable=True)  # Comma-separated error types for filtering

    # Additional fields that might come from CSV
    additional_data = Column(Text, nullable=True)  # JSON string for extra fields

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    registrations = relationship("Registration", back_populates="registrant")

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    registrant_id = Column(Integer, ForeignKey("registrants.id"), nullable=False)

    # Attendance tracking
    attended = Column(Boolean, default=False, nullable=False)
    participation_status = Column(String(20), default='registered', nullable=False)  # registered, attended, no_show
    source = Column(String(20), default='form', nullable=False)  # form, walkin

    # Timestamps
    registered_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    activity = relationship("Activity", back_populates="registrations")
    registrant = relationship("Registrant", back_populates="registrations")

class FormsUpload(Base):
    __tablename__ = "forms_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_headers = Column(Text, nullable=False)  # JSON string of original CSV headers
    mapped_headers = Column(Text, nullable=False)   # JSON string of header mappings
    records_count = Column(Integer, nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())

    # Validation statistics
    valid_records_count = Column(Integer, default=0, nullable=False)
    invalid_records_count = Column(Integer, default=0, nullable=False)
    errors_json = Column(Text, nullable=True)  # JSON string of validation errors and statistics

    activity = relationship("Activity")

class MetadataValue(Base):
    __tablename__ = "metadata_values"

    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String(100), nullable=False)  # strategic_line, activity, year
    value = Column(String(200), nullable=False)
    usage_count = Column(Integer, default=1)
    last_used = Column(DateTime, server_default=func.now())

# Controlled Vocabularies
class CatalogStrategicLine(Base):
    __tablename__ = "catalog_strategic_lines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    activities = relationship("CatalogActivity", back_populates="strategic_line")

class CatalogActivity(Base):
    __tablename__ = "catalog_activities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    strategic_line_id = Column(Integer, ForeignKey("catalog_strategic_lines.id"), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    strategic_line = relationship("CatalogStrategicLine", back_populates="activities")

class CatalogCareer(Base):
    __tablename__ = "catalog_careers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    audience = Column(String(20), nullable=False, default='estudiantes')  # estudiantes, colaboradores
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

# Reconciliation table for mapping unknown values to catalog items
class ReconciliationMapping(Base):
    __tablename__ = "reconciliation_mappings"

    id = Column(Integer, primary_key=True, index=True)
    catalog_type = Column(String(50), nullable=False)  # strategic_line, activity, career
    unknown_value = Column(String(200), nullable=False)
    catalog_id = Column(Integer, nullable=False)  # References the catalog item ID
    mapped_by = Column(String(100), nullable=True)  # User who created the mapping
    created_at = Column(DateTime, server_default=func.now())

    # Composite unique constraint
    __table_args__ = (
        {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}
    )

# Audit Trail
class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=True)  # User identifier or "system"
    action = Column(String(50), nullable=False)  # create, update, delete, toggle_attendance, etc.
    entity = Column(String(50), nullable=False)  # registrant, registration, activity, etc.
    entity_id = Column(Integer, nullable=False)  # ID of the affected entity
    before_json = Column(Text, nullable=True)  # JSON snapshot before change
    after_json = Column(Text, nullable=True)   # JSON snapshot after change
    request_id = Column(String(36), nullable=True)  # UUID for request tracing
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = Column(String(500), nullable=True)  # Browser/client info
    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(user_id='{self.user_id}', action='{self.action}', entity='{self.entity}', entity_id={self.entity_id})>"

# Name Review Queue for duplicate detection
class NameReviewQueue(Base):
    __tablename__ = "name_review_queue"

    id = Column(Integer, primary_key=True, index=True)
    left_id = Column(Integer, ForeignKey("registrants.id"), nullable=False)  # First registrant in comparison
    right_id = Column(Integer, ForeignKey("registrants.id"), nullable=False)  # Second registrant in comparison
    audience = Column(String(20), nullable=False)  # estudiantes or colaboradores
    left_context = Column(String(400), nullable=False)  # normalized_full_name + ' | ' + career/area
    right_context = Column(String(400), nullable=False)  # normalized_full_name + ' | ' + career/area
    similarity = Column(Float, nullable=False)  # Similarity score from rapidfuzz
    status = Column(String(20), default='pending', nullable=False)  # pending, accepted, rejected, skipped
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String(100), nullable=True)  # User who made the decision

    # Relationships
    left_registrant = relationship("Registrant", foreign_keys=[left_id])
    right_registrant = relationship("Registrant", foreign_keys=[right_id])

    def __repr__(self):
        return f"<NameReviewQueue(left_id={self.left_id}, right_id={self.right_id}, similarity={self.similarity}, status='{self.status}')>"