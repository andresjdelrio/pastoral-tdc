from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models import Registration, Activity, FormsUpload
from app.schemas import Registration as RegistrationSchema, RegistrationUpdate

router = APIRouter()

@router.get("/registrations", response_model=List[RegistrationSchema])
async def get_all_registrations_admin(
    event_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Search by name, email, or RUT"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get all registrations with search functionality"""

    query = db.query(Registration).join(Activity)

    if event_id:
        query = query.filter(Registration.activity_id == event_id)

    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (Registration.full_name.ilike(search_term)) |
            (Registration.rut.ilike(search_term)) |
            (Registration.university_email.ilike(search_term))
        )

    registrations = query.order_by(Registration.registered_at.desc()).offset(skip).limit(limit).all()
    return registrations

@router.put("/registrations/{registration_id}", response_model=RegistrationSchema)
async def update_registration_admin(
    registration_id: int,
    registration_update: RegistrationUpdate,
    db: Session = Depends(get_db)
):
    """Admin endpoint to update registration information"""

    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Update only provided fields
    update_data = registration_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(registration, field, value)

    db.commit()
    db.refresh(registration)
    return registration

@router.patch("/registrations/bulk-attendance")
async def bulk_update_attendance(
    registration_ids: List[int],
    attended: bool,
    db: Session = Depends(get_db)
):
    """Bulk update attendance for multiple registrations"""

    registrations = db.query(Registration).filter(Registration.id.in_(registration_ids)).all()

    if len(registrations) != len(registration_ids):
        raise HTTPException(status_code=404, detail="Some registrations not found")

    for registration in registrations:
        registration.attended = attended

    db.commit()

    return {
        "message": f"Updated attendance for {len(registrations)} registrations",
        "updated_count": len(registrations)
    }

@router.get("/activities/{activity_id}/registrations", response_model=List[RegistrationSchema])
async def get_activity_registrations_admin(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """Get all registrations for a specific activity (admin view)"""

    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    registrations = db.query(Registration).filter(Registration.activity_id == activity_id).order_by(
        Registration.full_name
    ).all()

    return registrations

@router.get("/uploads")
async def get_uploads_history(
    event_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get upload history for admin monitoring"""

    query = db.query(FormsUpload).join(Activity)

    if event_id:
        query = query.filter(FormsUpload.activity_id == event_id)

    uploads = query.order_by(FormsUpload.uploaded_at.desc()).offset(skip).limit(limit).all()

    result = []
    for upload in uploads:
        activity = db.query(Activity).filter(Activity.id == upload.activity_id).first()
        result.append({
            "id": upload.id,
            "filename": upload.filename,
            "records_count": upload.records_count,
            "uploaded_at": upload.uploaded_at,
            "activity": {
                "id": activity.id,
                "strategic_line": activity.strategic_line,
                "activity": activity.activity,
                "year": activity.year
            }
        })

    return {"uploads": result}

@router.delete("/registrations/{registration_id}")
async def delete_registration_admin(registration_id: int, db: Session = Depends(get_db)):
    """Admin endpoint to delete a registration"""

    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    db.delete(registration)
    db.commit()
    return {"message": "Registration deleted successfully"}

@router.get("/stats/duplicates")
async def get_duplicate_registrations(db: Session = Depends(get_db)):
    """Find potential duplicate registrations based on RUT or email"""

    # Find duplicates by RUT
    rut_duplicates = db.query(Registration.rut, func.count(Registration.id)).filter(
        Registration.rut.isnot(None)
    ).group_by(Registration.rut).having(func.count(Registration.id) > 1).all()

    # Find duplicates by email
    email_duplicates = db.query(Registration.university_email, func.count(Registration.id)).filter(
        Registration.university_email.isnot(None)
    ).group_by(Registration.university_email).having(func.count(Registration.id) > 1).all()

    return {
        "rut_duplicates": [{"rut": rut, "count": count} for rut, count in rut_duplicates],
        "email_duplicates": [{"email": email, "count": count} for email, count in email_duplicates]
    }