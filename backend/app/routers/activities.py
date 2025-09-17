from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, case
from typing import List, Optional
from pydantic import BaseModel, Field
import math

from app.database import get_db
from app.models import Activity, Registration, Registrant
from app.utils.validators import validate_and_normalize_row
from app.services.cache import invalidate_on_data_change

router = APIRouter(prefix="/activities", tags=["activities"])

# Pydantic models
class ActivitySummary(BaseModel):
    id: int
    name: str
    strategic_line: str
    year: int
    registrations_count: int
    attended_count: int
    created_at: str

    class Config:
        from_attributes = True

class RegistrationDetail(BaseModel):
    registration_id: int
    registrant_id: int
    full_name: str
    email: Optional[str] = None
    rut: Optional[str] = None
    career_or_area: Optional[str] = None
    person_type: str  # derived from career classification
    participation_status: str
    source: str
    registered_at: str

    class Config:
        from_attributes = True

class WalkInRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    rut: Optional[str] = Field(None, max_length=20)
    university_email: Optional[str] = Field(None, max_length=200)
    career_or_area: Optional[str] = Field(None, max_length=200)
    person_type: Optional[str] = Field(None, pattern="^(student|collab)$")

class WalkInResponse(BaseModel):
    registration_id: int
    registrant_id: int
    full_name: str
    email: Optional[str] = None
    rut: Optional[str] = None
    career_or_area: Optional[str] = None
    person_type: str
    participation_status: str
    source: str
    was_existing_registrant: bool
    validation_errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    per_page: int
    pages: int

def classify_person_type(career: str, raw_career: str = None) -> str:
    """
    Classify person as 'student' or 'collaborator' based on career field.
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
            return 'collaborator'

    # Default to student
    return 'student'

@router.get("/", response_model=PaginatedResponse)
async def list_activities(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by activity name"),
    year: Optional[int] = Query(None, description="Filter by year"),
    strategic_line: Optional[str] = Query(None, description="Filter by strategic line"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    List activities with counts and optional filtering/search.
    """
    # Build the base query for activities
    base_query = db.query(Activity)

    # Apply filters
    if q:
        base_query = base_query.filter(Activity.activity.ilike(f"%{q}%"))
    if year:
        base_query = base_query.filter(Activity.year == year)
    if strategic_line:
        base_query = base_query.filter(Activity.strategic_line.ilike(f"%{strategic_line}%"))

    # Get total count
    total = base_query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    activities_list = base_query.order_by(Activity.year.desc(), Activity.activity).offset(offset).limit(per_page).all()

    # Format results
    activities = []
    for activity in activities_list:
        # Get registration counts using simple queries
        registrations_count = db.query(Registration).filter(Registration.activity_id == activity.id).count()
        attended_count = db.query(Registration).filter(
            Registration.activity_id == activity.id,
            Registration.attended == True
        ).count()

        activities.append({
            "id": activity.id,
            "name": activity.activity,
            "strategic_line": activity.strategic_line,
            "year": activity.year,
            "registrations_count": registrations_count,
            "attended_count": attended_count,
            "created_at": activity.created_at.isoformat() if activity.created_at else None
        })

    pages = math.ceil(total / per_page) if total > 0 else 1

    return PaginatedResponse(
        items=activities,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.get("/{activity_id}/registrations", response_model=PaginatedResponse)
async def get_activity_registrations(
    activity_id: int,
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by name, RUT, or email"),
    only_pending: bool = Query(False, description="Show only non-attended registrations"),
    audience: Optional[str] = Query(None, description="Filter by audience: estudiantes or colaboradores"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page")
):
    """
    Get all registrations for a specific activity with search and filtering.
    """
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Build query
    query = db.query(
        Registration.id.label('registration_id'),
        Registration.registrant_id,
        Registration.participation_status,
        Registration.source,
        Registration.registered_at,
        Registrant.full_name,
        Registrant.university_email,
        Registrant.rut,
        Registrant.career,
        Registrant.raw_career
    ).join(Registrant).filter(Registration.activity_id == activity_id)

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

    # Apply pending filter
    if only_pending:
        query = query.filter(Registration.attended == False)

    # Apply audience filter
    if audience:
        if audience.lower() == 'estudiantes':
            # Filter for students (using inverse of staff classification)
            query = query.filter(
                ~(
                    or_(
                        Registrant.career.ilike('%profesor%'),
                        Registrant.career.ilike('%docente%'),
                        Registrant.career.ilike('%funcionario%'),
                        Registrant.career.ilike('%administrativo%'),
                        Registrant.career.ilike('%director%'),
                        Registrant.career.ilike('%coordinador%'),
                        Registrant.career.ilike('%jefe%'),
                        Registrant.career.ilike('%asistente%'),
                        Registrant.career.ilike('%técnico%'),
                        Registrant.career.ilike('%empleado%'),
                        Registrant.career.ilike('%trabajador%'),
                        Registrant.career.ilike('%staff%'),
                        Registrant.career.ilike('%colaborador%'),
                        Registrant.career.ilike('%personal%'),
                        Registrant.raw_career.ilike('%profesor%'),
                        Registrant.raw_career.ilike('%docente%'),
                        Registrant.raw_career.ilike('%funcionario%'),
                        Registrant.raw_career.ilike('%administrativo%'),
                        Registrant.raw_career.ilike('%director%'),
                        Registrant.raw_career.ilike('%coordinador%'),
                        Registrant.raw_career.ilike('%jefe%'),
                        Registrant.raw_career.ilike('%asistente%'),
                        Registrant.raw_career.ilike('%técnico%'),
                        Registrant.raw_career.ilike('%empleado%'),
                        Registrant.raw_career.ilike('%trabajador%'),
                        Registrant.raw_career.ilike('%staff%'),
                        Registrant.raw_career.ilike('%colaborador%'),
                        Registrant.raw_career.ilike('%personal%')
                    )
                )
            )
        elif audience.lower() == 'colaboradores':
            # Filter for staff/collaborators
            query = query.filter(
                or_(
                    Registrant.career.ilike('%profesor%'),
                    Registrant.career.ilike('%docente%'),
                    Registrant.career.ilike('%funcionario%'),
                    Registrant.career.ilike('%administrativo%'),
                    Registrant.career.ilike('%director%'),
                    Registrant.career.ilike('%coordinador%'),
                    Registrant.career.ilike('%jefe%'),
                    Registrant.career.ilike('%asistente%'),
                    Registrant.career.ilike('%técnico%'),
                    Registrant.career.ilike('%empleado%'),
                    Registrant.career.ilike('%trabajador%'),
                    Registrant.career.ilike('%staff%'),
                    Registrant.career.ilike('%colaborador%'),
                    Registrant.career.ilike('%personal%'),
                    Registrant.raw_career.ilike('%profesor%'),
                    Registrant.raw_career.ilike('%docente%'),
                    Registrant.raw_career.ilike('%funcionario%'),
                    Registrant.raw_career.ilike('%administrativo%'),
                    Registrant.raw_career.ilike('%director%'),
                    Registrant.raw_career.ilike('%coordinador%'),
                    Registrant.raw_career.ilike('%jefe%'),
                    Registrant.raw_career.ilike('%asistente%'),
                    Registrant.raw_career.ilike('%técnico%'),
                    Registrant.raw_career.ilike('%empleado%'),
                    Registrant.raw_career.ilike('%trabajador%'),
                    Registrant.raw_career.ilike('%staff%'),
                    Registrant.raw_career.ilike('%colaborador%'),
                    Registrant.raw_career.ilike('%personal%')
                )
            )

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    results = query.order_by(Registrant.full_name).offset(offset).limit(per_page).all()

    # Format results
    registrations = []
    for result in results:
        person_type = classify_person_type(result.career, result.raw_career)

        registrations.append({
            "registration_id": result.registration_id,
            "registrant_id": result.registrant_id,
            "full_name": result.full_name,
            "email": result.university_email,
            "rut": result.rut,
            "career_or_area": result.career,
            "person_type": person_type,
            "participation_status": result.participation_status,
            "source": result.source,
            "registered_at": result.registered_at.isoformat() if result.registered_at else None
        })

    pages = math.ceil(total / per_page)

    return PaginatedResponse(
        items=registrations,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.post("/{activity_id}/walkins", response_model=WalkInResponse)
async def create_walkin(
    activity_id: int,
    walkin_data: WalkInRequest,
    db: Session = Depends(get_db)
):
    """
    Create a walk-in registration for an activity.
    """
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Prepare data for validation
    raw_data = {
        'full_name': walkin_data.full_name,
        'rut': walkin_data.rut,
        'university_email': walkin_data.university_email,
        'career_or_area': walkin_data.career_or_area,
        'phone': None  # Not required for walk-ins
    }

    # Validate and normalize the data
    normalized_data, is_valid, field_errors, error_types = validate_and_normalize_row(raw_data)

    # Determine person type
    if walkin_data.person_type:
        person_type = 'student' if walkin_data.person_type == 'student' else 'collaborator'
    else:
        person_type = classify_person_type(
            normalized_data.get('career_or_area', ''),
            walkin_data.career_or_area
        )

    # Try to find existing registrant by RUT or email
    existing_registrant = None
    was_existing = False

    if normalized_data.get('rut'):
        existing_registrant = db.query(Registrant).filter(
            Registrant.rut == normalized_data['rut']
        ).first()
        was_existing = True

    if not existing_registrant and normalized_data.get('university_email'):
        existing_registrant = db.query(Registrant).filter(
            Registrant.university_email == normalized_data['university_email']
        ).first()
        was_existing = True

    # Create or reuse registrant
    if existing_registrant:
        registrant = existing_registrant
    else:
        was_existing = False
        registrant = Registrant(
            full_name=normalized_data['full_name'],
            rut=normalized_data.get('rut'),
            university_email=normalized_data.get('university_email'),
            career=normalized_data.get('career_or_area'),
            raw_career=walkin_data.career_or_area,
            phone=None,
            row_valid=is_valid,
            validation_errors=str(field_errors) if field_errors else None,
            error_types=','.join(error_types) if error_types else None
        )
        db.add(registrant)
        db.flush()  # Get the registrant ID

    # Check if registration already exists
    existing_registration = db.query(Registration).filter(
        and_(
            Registration.activity_id == activity_id,
            Registration.registrant_id == registrant.id
        )
    ).first()

    if existing_registration:
        # Update existing registration to attended
        existing_registration.attended = True
        existing_registration.participation_status = 'attended'
        if existing_registration.source != 'walkin':
            existing_registration.source = 'walkin'
        registration = existing_registration
    else:
        # Create new registration
        registration = Registration(
            activity_id=activity_id,
            registrant_id=registrant.id,
            attended=True,
            participation_status='attended',
            source='walkin'
        )
        db.add(registration)

    db.commit()
    db.refresh(registration)
    db.refresh(registrant)

    # Invalidate cache since data changed
    invalidate_on_data_change()

    # Format validation errors
    validation_errors = None
    if field_errors:
        validation_errors = [f"{field}: {error}" for field, error in field_errors.items()]

    return WalkInResponse(
        registration_id=registration.id,
        registrant_id=registrant.id,
        full_name=registrant.full_name,
        email=registrant.university_email,
        rut=registrant.rut,
        career_or_area=registrant.career,
        person_type=person_type,
        participation_status=registration.participation_status,
        source=registration.source,
        was_existing_registrant=was_existing,
        validation_errors=validation_errors
    )