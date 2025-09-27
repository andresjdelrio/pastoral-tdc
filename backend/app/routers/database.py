from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, text
from typing import List, Optional
from pydantic import BaseModel, Field
import math
import pandas as pd
import io
from datetime import datetime
import logging

from app.database import get_db
from app.models import Activity, Registration, Registrant
from app.services.cache import invalidate_on_data_change

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/database", tags=["database"])

# Pydantic models
class RegistrationRecord(BaseModel):
    registration_id: int
    registrant_id: int
    full_name: str
    rut: Optional[str] = None
    university_email: Optional[str] = None
    career: str
    phone: Optional[str] = None
    activity_name: str
    strategic_line: str
    year: int
    audience: str
    participation_status: str
    source: str
    registered_at: str

    class Config:
        from_attributes = True

class UpdateRegistrantRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    rut: Optional[str] = Field(None, max_length=20)
    university_email: Optional[str] = Field(None, max_length=200)
    career: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    audience: Optional[str] = Field(None, max_length=20, description="Audience classification: estudiantes or colaboradores")

class PaginatedResponse(BaseModel):
    items: List[RegistrationRecord]
    total: int
    page: int
    per_page: int
    pages: int

class AuditLog(BaseModel):
    registrant_id: int
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    changed_by: str
    changed_at: datetime

def classify_audience(career: str, raw_career: str = None) -> str:
    """
    Classify registrant as 'estudiantes' or 'colaboradores' based on career field.
    """
    career_text = (career or "").lower()
    raw_career_text = (raw_career or "").lower()

    # Keywords that indicate staff/collaborator status
    staff_keywords = [
        'profesor', 'profesora', 'docente', 'académico', 'académica',
        'funcionario', 'funcionaria', 'administrativo', 'administrativa',
        'secretario', 'secretaria', 'director', 'directora', 'coordinador',
        'coordinadora', 'jefe', 'jefa', 'asistente', 'técnico', 'técnica',
        'empleado', 'empleada', 'trabajador', 'trabajadora', 'staff',
        'colaborador', 'colaboradora', 'personal'
    ]

    # Check both career fields
    full_text = f"{career_text} {raw_career_text}".strip()

    # Check for staff keywords
    for keyword in staff_keywords:
        if keyword in full_text:
            return 'colaboradores'

    # Default to estudiantes
    return 'estudiantes'

@router.get("/", response_model=PaginatedResponse)
async def get_database_records(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name, RUT, or email"),
    audience: Optional[str] = Query(None, description="Filter by audience: estudiantes or colaboradores"),
    year: Optional[int] = Query(None, description="Filter by year"),
    activity_id: Optional[int] = Query(None, description="Filter by specific activity"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page")
):
    """
    Get all registration records with comprehensive filtering.
    """
    # FIXED: Include audience field in query to respect user's explicit selection
    query = db.query(
        Registration.id.label('registration_id'),
        Registration.registrant_id,
        Registration.participation_status,
        Registration.source,
        Registration.registered_at,
        Registrant.full_name,
        Registrant.rut,
        Registrant.university_email,
        Registrant.career,
        Registrant.phone,
        Registrant.raw_career,
        Registrant.audience,
        Activity.activity.label('activity_name'),
        Activity.strategic_line,
        Activity.year
    ).join(Registrant).join(Activity)

    # Apply search filter
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Registrant.full_name.ilike(search_term),
                Registrant.rut.ilike(search_term),
                Registrant.university_email.ilike(search_term)
            )
        )

    # Apply year filter
    if year:
        query = query.filter(Activity.year == year)

    # Apply activity filter
    if activity_id:
        query = query.filter(Registration.activity_id == activity_id)

    # FIXED: Filter by saved audience field - respect user's explicit selection during upload
    if audience:
        query = query.filter(Registrant.audience == audience)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    results = query.order_by(Registrant.full_name).offset(offset).limit(per_page).all()

    # Format results
    # FIXED: Use saved audience field - never recalculate from career data
    records = []
    for result in results:
        # Use saved audience field - respect user's explicit selection during upload
        audience_classification = result.audience or 'estudiantes'

        records.append(RegistrationRecord(
            registration_id=result.registration_id,
            registrant_id=result.registrant_id,
            full_name=result.full_name,
            rut=result.rut,
            university_email=result.university_email,
            career=result.career,
            phone=result.phone,
            activity_name=result.activity_name,
            strategic_line=result.strategic_line,
            year=result.year,
            audience=audience_classification,
            participation_status=result.participation_status,
            source=result.source,
            registered_at=result.registered_at.isoformat() if result.registered_at else None
        ))

    pages = math.ceil(total / per_page) if total > 0 else 1

    return PaginatedResponse(
        items=records,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.put("/registrants/{registrant_id}")
async def update_registrant(
    registrant_id: int,
    update_data: UpdateRegistrantRequest,
    db: Session = Depends(get_db)
):
    """
    Update a registrant's information with audit logging.
    """
    # Find the registrant
    registrant = db.query(Registrant).filter(Registrant.id == registrant_id).first()
    if not registrant:
        raise HTTPException(status_code=404, detail="Registrant not found")

    # Store old values for audit logging
    old_values = {
        'full_name': registrant.full_name,
        'rut': registrant.rut,
        'university_email': registrant.university_email,
        'career': registrant.career,
        'phone': registrant.phone,
        'audience': registrant.audience
    }

    # Update fields
    registrant.full_name = update_data.full_name
    registrant.rut = update_data.rut
    registrant.university_email = update_data.university_email
    registrant.career = update_data.career
    registrant.phone = update_data.phone

    # Update audience if provided
    if update_data.audience is not None:
        registrant.audience = update_data.audience

    # Create audit log entries for changed fields
    audit_logs = []
    for field, new_value in update_data.dict(exclude_unset=True).items():
        old_value = old_values.get(field)
        if old_value != new_value:
            # In a real application, you'd get the user ID from authentication
            # For now, we'll use a placeholder
            audit_entry = {
                'registrant_id': registrant_id,
                'field_name': field,
                'old_value': str(old_value) if old_value else None,
                'new_value': str(new_value) if new_value else None,
                'changed_by': 'system',  # Replace with actual user ID/name
                'changed_at': datetime.utcnow()
            }
            audit_logs.append(audit_entry)
            logger.info(f"Audit: Registrant {registrant_id} field '{field}' changed from '{old_value}' to '{new_value}'")

    db.commit()
    db.refresh(registrant)

    # Invalidate cache since data changed
    invalidate_on_data_change()

    # Return updated registrant data
    return {
        "registrant_id": registrant.id,
        "full_name": registrant.full_name,
        "rut": registrant.rut,
        "university_email": registrant.university_email,
        "career": registrant.career,
        "phone": registrant.phone,
        "audience": registrant.audience,
        "audit_logs": audit_logs
    }

@router.get("/export/csv")
async def export_csv(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name, RUT, or email"),
    audience: Optional[str] = Query(None, description="Filter by audience"),
    year: Optional[int] = Query(None, description="Filter by year"),
    activity_id: Optional[int] = Query(None, description="Filter by specific activity")
):
    """
    Export filtered database records as CSV.
    """
    # Get all records (no pagination for export)
    response = await get_database_records(
        db=db, q=q, audience=audience, year=year, activity_id=activity_id,
        page=1, per_page=10000  # Large number to get all records
    )

    # Convert to DataFrame
    data = []
    for record in response.items:
        data.append({
            'Registration ID': record.registration_id,
            'Registrant ID': record.registrant_id,
            'Full Name': record.full_name,
            'RUT': record.rut,
            'University Email': record.university_email,
            'Career': record.career,
            'Phone': record.phone,
            'Activity Name': record.activity_name,
            'Strategic Line': record.strategic_line,
            'Year': record.year,
            'Audience': record.audience,
            'Participation Status': record.participation_status,
            'Source': record.source,
            'Registered At': record.registered_at
        })

    df = pd.DataFrame(data)

    # Convert to CSV
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_content = csv_buffer.getvalue()

    # Return CSV response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registrations_database.csv"}
    )

@router.get("/export/xlsx")
async def export_xlsx(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name, RUT, or email"),
    audience: Optional[str] = Query(None, description="Filter by audience"),
    year: Optional[int] = Query(None, description="Filter by year"),
    activity_id: Optional[int] = Query(None, description="Filter by specific activity")
):
    """
    Export filtered database records as XLSX.
    """
    # Get all records (no pagination for export)
    response = await get_database_records(
        db=db, q=q, audience=audience, year=year, activity_id=activity_id,
        page=1, per_page=10000  # Large number to get all records
    )

    # Convert to DataFrame
    data = []
    for record in response.items:
        data.append({
            'Registration ID': record.registration_id,
            'Registrant ID': record.registrant_id,
            'Full Name': record.full_name,
            'RUT': record.rut,
            'University Email': record.university_email,
            'Career': record.career,
            'Phone': record.phone,
            'Activity Name': record.activity_name,
            'Strategic Line': record.strategic_line,
            'Year': record.year,
            'Audience': record.audience,
            'Participation Status': record.participation_status,
            'Source': record.source,
            'Registered At': record.registered_at
        })

    df = pd.DataFrame(data)

    # Convert to XLSX
    xlsx_buffer = io.BytesIO()
    with pd.ExcelWriter(xlsx_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Registrations Database', index=False)

    xlsx_content = xlsx_buffer.getvalue()

    # Return XLSX response
    return Response(
        content=xlsx_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=registrations_database.xlsx"}
    )

@router.delete("/registrations/{registration_id}")
async def delete_registration(
    registration_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific registration record.
    """
    # Find the registration
    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Store data for audit logging before deletion
    registrant = db.query(Registrant).filter(Registrant.id == registration.registrant_id).first()
    activity = db.query(Activity).filter(Activity.id == registration.activity_id).first()

    audit_data = {
        'registration_id': registration.id,
        'registrant_name': registrant.full_name if registrant else None,
        'activity_name': activity.activity if activity else None,
        'deleted_by': 'system',  # Replace with actual user ID/name
        'deleted_at': datetime.utcnow()
    }

    # Delete the registration
    db.delete(registration)
    db.commit()

    # Log the deletion
    logger.info(f"Audit: Registration {registration_id} deleted - Registrant: {audit_data['registrant_name']}, Activity: {audit_data['activity_name']}")

    # Invalidate cache since data changed
    invalidate_on_data_change()

    return {
        "success": True,
        "message": f"Registration {registration_id} deleted successfully",
        "audit_info": audit_data
    }

@router.delete("/registrants/{registrant_id}")
async def delete_registrant(
    registrant_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a registrant and all their associated registrations.
    """
    # Find the registrant
    registrant = db.query(Registrant).filter(Registrant.id == registrant_id).first()
    if not registrant:
        raise HTTPException(status_code=404, detail="Registrant not found")

    # Get all registrations for this registrant
    registrations = db.query(Registration).filter(Registration.registrant_id == registrant_id).all()
    registration_count = len(registrations)

    # Store data for audit logging before deletion
    audit_data = {
        'registrant_id': registrant.id,
        'registrant_name': registrant.full_name,
        'registration_count': registration_count,
        'deleted_by': 'system',  # Replace with actual user ID/name
        'deleted_at': datetime.utcnow()
    }

    # Delete all registrations first (due to foreign key constraints)
    for registration in registrations:
        db.delete(registration)

    # Delete the registrant
    db.delete(registrant)
    db.commit()

    # Log the deletion
    logger.info(f"Audit: Registrant {registrant_id} ({registrant.full_name}) deleted with {registration_count} registrations")

    # Invalidate cache since data changed
    invalidate_on_data_change()

    return {
        "success": True,
        "message": f"Registrant '{registrant.full_name}' and {registration_count} associated registrations deleted successfully",
        "audit_info": audit_data
    }