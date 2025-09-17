from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Optional
from pydantic import BaseModel
import json
import math

from app.database import get_db
from app.models import Registrant, Registration, Activity, AuditLog

router = APIRouter(prefix="/data-quality", tags=["data-quality"])

# Pydantic models
class ValidationError(BaseModel):
    registrant_id: int
    full_name: str
    upload_source: str
    activity_name: str
    error_types: List[str]
    validation_errors: dict
    created_at: str

class DataQualityStats(BaseModel):
    total_registrants: int
    valid_registrants: int
    invalid_registrants: int
    validation_rate: float
    error_breakdown: dict

class AuditTrailEntry(BaseModel):
    id: int
    user_id: Optional[str]
    action: str
    entity: str
    entity_id: int
    before_data: Optional[dict]
    after_data: Optional[dict]
    request_id: Optional[str]
    timestamp: str

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    per_page: int
    pages: int

@router.get("/stats", response_model=DataQualityStats)
async def get_data_quality_stats(db: Session = Depends(get_db)):
    """
    Get overall data quality statistics.
    """
    # Get total registrant counts
    total_registrants = db.query(Registrant).count()
    valid_registrants = db.query(Registrant).filter(Registrant.row_valid == True).count()
    invalid_registrants = total_registrants - valid_registrants

    validation_rate = (valid_registrants / total_registrants * 100) if total_registrants > 0 else 100

    # Get error breakdown by type
    invalid_registrants_with_errors = db.query(Registrant).filter(
        and_(Registrant.row_valid == False, Registrant.error_types.isnot(None))
    ).all()

    error_breakdown = {}
    for registrant in invalid_registrants_with_errors:
        if registrant.error_types:
            error_types = [t.strip() for t in registrant.error_types.split(',')]
            for error_type in error_types:
                error_breakdown[error_type] = error_breakdown.get(error_type, 0) + 1

    return DataQualityStats(
        total_registrants=total_registrants,
        valid_registrants=valid_registrants,
        invalid_registrants=invalid_registrants,
        validation_rate=round(validation_rate, 2),
        error_breakdown=error_breakdown
    )

@router.get("/validation-errors", response_model=PaginatedResponse)
async def get_validation_errors(
    db: Session = Depends(get_db),
    error_type: Optional[str] = Query(None, description="Filter by error type"),
    activity_id: Optional[int] = Query(None, description="Filter by activity"),
    search: Optional[str] = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """
    Get registrants with validation errors.
    """
    # Base query for invalid registrants
    query = db.query(
        Registrant.id,
        Registrant.full_name,
        Registrant.validation_errors,
        Registrant.error_types,
        Registrant.created_at,
        Activity.activity.label('activity_name'),
        Activity.id.label('activity_id')
    ).join(Registration, Registration.registrant_id == Registrant.id).join(
        Activity, Activity.id == Registration.activity_id
    ).filter(Registrant.row_valid == False)

    # Apply filters
    if error_type:
        query = query.filter(Registrant.error_types.like(f"%{error_type}%"))

    if activity_id:
        query = query.filter(Activity.id == activity_id)

    if search:
        query = query.filter(Registrant.full_name.ilike(f"%{search}%"))

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    results = query.order_by(Registrant.created_at.desc()).offset(offset).limit(per_page).all()

    # Format results
    validation_errors = []
    for result in results:
        error_types = []
        if result.error_types:
            error_types = [t.strip() for t in result.error_types.split(',')]

        validation_errors_dict = {}
        if result.validation_errors:
            try:
                validation_errors_dict = json.loads(result.validation_errors)
            except json.JSONDecodeError:
                validation_errors_dict = {"parse_error": result.validation_errors}

        validation_errors.append({
            "registrant_id": result.id,
            "full_name": result.full_name,
            "upload_source": "CSV Upload",  # Could be enhanced to track actual source
            "activity_name": result.activity_name,
            "activity_id": result.activity_id,
            "error_types": error_types,
            "validation_errors": validation_errors_dict,
            "created_at": result.created_at.isoformat() if result.created_at else None
        })

    pages = math.ceil(total / per_page)

    return PaginatedResponse(
        items=validation_errors,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.get("/error-types")
async def get_error_types(db: Session = Depends(get_db)):
    """
    Get all unique error types for filtering.
    """
    # Get all registrants with error types
    registrants_with_errors = db.query(Registrant.error_types).filter(
        and_(Registrant.row_valid == False, Registrant.error_types.isnot(None))
    ).all()

    error_types = set()
    for result in registrants_with_errors:
        if result.error_types:
            types = [t.strip() for t in result.error_types.split(',')]
            error_types.update(types)

    return {"error_types": sorted(list(error_types))}

@router.get("/audit-trail", response_model=PaginatedResponse)
async def get_audit_trail(
    db: Session = Depends(get_db),
    entity: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    user_id: Optional[str] = Query(None, description="Filter by user"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """
    Get audit trail entries.
    """
    query = db.query(AuditLog)

    # Apply filters
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()

    # Apply pagination
    offset = (page - 1) * per_page
    results = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(per_page).all()

    # Format results
    audit_entries = []
    for result in results:
        before_data = None
        after_data = None

        if result.before_json:
            try:
                before_data = json.loads(result.before_json)
            except json.JSONDecodeError:
                before_data = {"parse_error": result.before_json}

        if result.after_json:
            try:
                after_data = json.loads(result.after_json)
            except json.JSONDecodeError:
                after_data = {"parse_error": result.after_json}

        audit_entries.append({
            "id": result.id,
            "user_id": result.user_id,
            "action": result.action,
            "entity": result.entity,
            "entity_id": result.entity_id,
            "before_data": before_data,
            "after_data": after_data,
            "request_id": result.request_id,
            "ip_address": result.ip_address,
            "user_agent": result.user_agent,
            "timestamp": result.timestamp.isoformat()
        })

    pages = math.ceil(total / per_page)

    return PaginatedResponse(
        items=audit_entries,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.get("/activities-with-errors")
async def get_activities_with_errors(db: Session = Depends(get_db)):
    """
    Get activities that have registrants with validation errors.
    """
    # Query activities that have invalid registrants
    activities_with_errors = db.query(
        Activity.id,
        Activity.activity,
        Activity.strategic_line,
        Activity.year,
        func.count(Registrant.id).label('error_count')
    ).join(Registration, Registration.activity_id == Activity.id).join(
        Registrant, Registrant.id == Registration.registrant_id
    ).filter(Registrant.row_valid == False).group_by(
        Activity.id, Activity.activity, Activity.strategic_line, Activity.year
    ).order_by(func.count(Registrant.id).desc()).all()

    activities = []
    for activity in activities_with_errors:
        activities.append({
            "id": activity.id,
            "name": activity.activity,
            "strategic_line": activity.strategic_line,
            "year": activity.year,
            "error_count": activity.error_count
        })

    return {"activities": activities}