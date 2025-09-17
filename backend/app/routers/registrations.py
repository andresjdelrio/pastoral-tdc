from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Registration
from app.services.audit import AuditService, request_context
from app.services.cache import invalidate_on_data_change

router = APIRouter()

class AttendanceUpdate(BaseModel):
    participation_status: str  # 'attended', 'no_show', 'registered'

@router.patch("/{registration_id}")
async def update_registration_attendance(
    registration_id: int,
    attendance_data: AttendanceUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Update registration attendance/participation status with audit logging.
    """
    # Generate request ID for tracing
    request_id = request_context.generate_request_id()

    # Extract client information
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # Validate participation status
    valid_statuses = ['registered', 'attended', 'no_show']
    if attendance_data.participation_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid participation_status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Find registration
    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Capture before state for audit
    before_data = {
        "participation_status": registration.participation_status,
        "attended": registration.attended,
        "updated_at": registration.updated_at.isoformat() if registration.updated_at else None
    }

    # Update status
    old_status = registration.participation_status
    registration.participation_status = attendance_data.participation_status
    registration.attended = (attendance_data.participation_status == 'attended')

    db.commit()
    db.refresh(registration)

    # Log the change
    AuditService.log_action(
        db=db,
        user_id="system",  # In production, get from JWT/session
        action="toggle_attendance",
        entity="registration",
        entity_id=registration.id,
        before_data=before_data,
        after_data={
            "participation_status": registration.participation_status,
            "attended": registration.attended,
            "updated_at": registration.updated_at.isoformat() if registration.updated_at else None
        },
        request_id=request_id,
        ip_address=ip_address,
        user_agent=user_agent
    )

    # Invalidate cache since attendance data changed
    invalidate_on_data_change()

    return {
        "message": f"Registration updated from {old_status} to {attendance_data.participation_status}",
        "registration_id": registration.id,
        "participation_status": registration.participation_status,
        "attended": registration.attended,
        "request_id": request_id
    }