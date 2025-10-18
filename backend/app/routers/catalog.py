from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from pydantic import BaseModel, Field
import math

from app.database import get_db
from app.models import CatalogStrategicLine, CatalogActivity, CatalogCareer, ReconciliationMapping

router = APIRouter(prefix="/catalog", tags=["catalog"])

# Role guard for admin endpoints
async def require_admin_role(authorization: str = Header(None)):
    """
    Simple role guard - in production this would validate JWT tokens
    and check user roles from a proper auth system.
    For now, we'll accept any request with Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=403, detail="Admin access required")
    return True

# Pydantic models
class StrategicLineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

class StrategicLineCreate(StrategicLineBase):
    active: bool = True

class StrategicLineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    active: Optional[bool] = None

class StrategicLine(StrategicLineBase):
    id: int
    active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ActivityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    strategic_line_id: int

class ActivityCreate(ActivityBase):
    active: bool = True

class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    strategic_line_id: Optional[int] = None
    active: Optional[bool] = None

class Activity(ActivityBase):
    id: int
    active: bool
    strategic_line_name: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class CareerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    audience: str = Field(..., pattern="^(estudiantes|colaboradores)$")

class CareerCreate(CareerBase):
    active: bool = True

class CareerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    audience: Optional[str] = Field(None, pattern="^(estudiantes|colaboradores)$")
    active: Optional[bool] = None

class Career(CareerBase):
    id: int
    active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ReconciliationMappingCreate(BaseModel):
    catalog_type: str = Field(..., pattern="^(strategic_line|activity|career)$")
    unknown_value: str = Field(..., min_length=1, max_length=200)
    catalog_id: int
    mapped_by: Optional[str] = None

class ReconciliationMapping(BaseModel):
    id: int
    catalog_type: str
    unknown_value: str
    catalog_id: int
    catalog_name: str
    mapped_by: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    per_page: int
    pages: int

# Strategic Lines CRUD
@router.get("/strategic-lines", response_model=PaginatedResponse)
async def list_strategic_lines(
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Show only active items"),
    q: Optional[str] = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """List strategic lines with optional filtering."""
    query = db.query(CatalogStrategicLine)

    if active_only:
        query = query.filter(CatalogStrategicLine.active == True)

    if q:
        query = query.filter(CatalogStrategicLine.name.ilike(f"%{q}%"))

    total = query.count()
    offset = (page - 1) * per_page
    items = query.order_by(CatalogStrategicLine.name).offset(offset).limit(per_page).all()

    strategic_lines = []
    for item in items:
        strategic_lines.append({
            "id": item.id,
            "name": item.name,
            "active": item.active,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        })

    pages = math.ceil(total / per_page)
    return PaginatedResponse(items=strategic_lines, total=total, page=page, per_page=per_page, pages=pages)

@router.post("/strategic-lines", response_model=StrategicLine)
async def create_strategic_line(
    strategic_line: StrategicLineCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Create a new strategic line."""
    # Check for duplicates
    existing = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.name == strategic_line.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Strategic line with this name already exists")

    db_item = CatalogStrategicLine(**strategic_line.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return StrategicLine(
        id=db_item.id,
        name=db_item.name,
        active=db_item.active,
        created_at=db_item.created_at.isoformat(),
        updated_at=db_item.updated_at.isoformat()
    )

@router.put("/strategic-lines/{strategic_line_id}", response_model=StrategicLine)
async def update_strategic_line(
    strategic_line_id: int,
    strategic_line_update: StrategicLineUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Update a strategic line."""
    db_item = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == strategic_line_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Strategic line not found")

    update_data = strategic_line_update.dict(exclude_unset=True)

    # Check for name conflicts
    if "name" in update_data:
        existing = db.query(CatalogStrategicLine).filter(
            CatalogStrategicLine.name == update_data["name"],
            CatalogStrategicLine.id != strategic_line_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Strategic line with this name already exists")

    for field, value in update_data.items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)

    return StrategicLine(
        id=db_item.id,
        name=db_item.name,
        active=db_item.active,
        created_at=db_item.created_at.isoformat(),
        updated_at=db_item.updated_at.isoformat()
    )

@router.delete("/strategic-lines/{strategic_line_id}")
async def delete_strategic_line(
    strategic_line_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Delete a strategic line."""
    db_item = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == strategic_line_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Strategic line not found")

    # Check if it has associated activities
    activity_count = db.query(CatalogActivity).filter(CatalogActivity.strategic_line_id == strategic_line_id).count()
    if activity_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete strategic line with associated activities")

    db.delete(db_item)
    db.commit()

    return {"message": "Strategic line deleted successfully"}

# Activities CRUD
@router.get("/activities", response_model=PaginatedResponse)
async def list_activities(
    db: Session = Depends(get_db),
    strategic_line_id: Optional[int] = Query(None, description="Filter by strategic line"),
    active_only: bool = Query(True, description="Show only active items"),
    q: Optional[str] = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """List activities with optional filtering."""
    query = db.query(CatalogActivity, CatalogStrategicLine.name.label('strategic_line_name')).join(CatalogStrategicLine)

    if strategic_line_id:
        query = query.filter(CatalogActivity.strategic_line_id == strategic_line_id)

    if active_only:
        query = query.filter(CatalogActivity.active == True)

    if q:
        query = query.filter(CatalogActivity.name.ilike(f"%{q}%"))

    total = query.count()
    offset = (page - 1) * per_page
    results = query.order_by(CatalogActivity.name).offset(offset).limit(per_page).all()

    activities = []
    for result in results:
        activity = result.CatalogActivity
        activities.append({
            "id": activity.id,
            "name": activity.name,
            "strategic_line_id": activity.strategic_line_id,
            "strategic_line_name": result.strategic_line_name,
            "active": activity.active,
            "created_at": activity.created_at.isoformat() if activity.created_at else None,
            "updated_at": activity.updated_at.isoformat() if activity.updated_at else None
        })

    pages = math.ceil(total / per_page)
    return PaginatedResponse(items=activities, total=total, page=page, per_page=per_page, pages=pages)

@router.post("/activities", response_model=Activity)
async def create_activity(
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Create a new activity."""
    # Check if strategic line exists
    strategic_line = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == activity.strategic_line_id).first()
    if not strategic_line:
        raise HTTPException(status_code=400, detail="Strategic line not found")

    db_item = CatalogActivity(**activity.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return Activity(
        id=db_item.id,
        name=db_item.name,
        strategic_line_id=db_item.strategic_line_id,
        strategic_line_name=strategic_line.name,
        active=db_item.active,
        created_at=db_item.created_at.isoformat(),
        updated_at=db_item.updated_at.isoformat()
    )

@router.put("/activities/{activity_id}", response_model=Activity)
async def update_activity(
    activity_id: int,
    activity_update: ActivityUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Update an activity."""
    db_item = db.query(CatalogActivity).filter(CatalogActivity.id == activity_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Activity not found")

    update_data = activity_update.dict(exclude_unset=True)

    # Check if strategic line exists
    if "strategic_line_id" in update_data:
        strategic_line = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == update_data["strategic_line_id"]).first()
        if not strategic_line:
            raise HTTPException(status_code=400, detail="Strategic line not found")

    for field, value in update_data.items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)

    strategic_line = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == db_item.strategic_line_id).first()

    return Activity(
        id=db_item.id,
        name=db_item.name,
        strategic_line_id=db_item.strategic_line_id,
        strategic_line_name=strategic_line.name,
        active=db_item.active,
        created_at=db_item.created_at.isoformat(),
        updated_at=db_item.updated_at.isoformat()
    )

@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Delete an activity."""
    db_item = db.query(CatalogActivity).filter(CatalogActivity.id == activity_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Activity not found")

    db.delete(db_item)
    db.commit()

    return {"message": "Activity deleted successfully"}

# Careers CRUD
@router.get("/careers", response_model=PaginatedResponse)
async def list_careers(
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Show only active items"),
    q: Optional[str] = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """List careers with optional filtering."""
    query = db.query(CatalogCareer)

    if active_only:
        query = query.filter(CatalogCareer.active == True)

    if q:
        query = query.filter(CatalogCareer.name.ilike(f"%{q}%"))

    total = query.count()
    offset = (page - 1) * per_page
    items = query.order_by(CatalogCareer.name).offset(offset).limit(per_page).all()

    careers = []
    for item in items:
        careers.append({
            "id": item.id,
            "name": item.name,
            "audience": item.audience,
            "active": item.active,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        })

    pages = math.ceil(total / per_page)
    return PaginatedResponse(items=careers, total=total, page=page, per_page=per_page, pages=pages)

@router.post("/careers", response_model=Career)
async def create_career(
    career: CareerCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Create a new career."""
    # Check for duplicates
    existing = db.query(CatalogCareer).filter(CatalogCareer.name == career.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Career with this name already exists")

    db_item = CatalogCareer(**career.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return Career(
        id=db_item.id,
        name=db_item.name,
        active=db_item.active,
        created_at=db_item.created_at.isoformat(),
        updated_at=db_item.updated_at.isoformat()
    )

@router.put("/careers/{career_id}", response_model=Career)
async def update_career(
    career_id: int,
    career_update: CareerUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Update a career."""
    db_item = db.query(CatalogCareer).filter(CatalogCareer.id == career_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Career not found")

    update_data = career_update.dict(exclude_unset=True)

    # Check for name conflicts
    if "name" in update_data:
        existing = db.query(CatalogCareer).filter(
            CatalogCareer.name == update_data["name"],
            CatalogCareer.id != career_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Career with this name already exists")

    for field, value in update_data.items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)

    return Career(
        id=db_item.id,
        name=db_item.name,
        active=db_item.active,
        created_at=db_item.created_at.isoformat(),
        updated_at=db_item.updated_at.isoformat()
    )

@router.delete("/careers/{career_id}")
async def delete_career(
    career_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Delete a career."""
    db_item = db.query(CatalogCareer).filter(CatalogCareer.id == career_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Career not found")

    db.delete(db_item)
    db.commit()

    return {"message": "Career deleted successfully"}

# Reconciliation endpoints
@router.get("/reconciliation/unknown-values")
async def get_unknown_values(
    db: Session = Depends(get_db),
    catalog_type: Optional[str] = Query(None, pattern="^(strategic_line|activity|career)$"),
    _: bool = Depends(require_admin_role)
):
    """Get unknown values that need reconciliation mapping."""
    # This would be populated during ingestion when unknown values are found
    # For now, return empty list - will be implemented in the ingestion update
    return {"unknown_values": []}

@router.post("/reconciliation/mappings", response_model=ReconciliationMapping)
async def create_reconciliation_mapping(
    mapping: ReconciliationMappingCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin_role)
):
    """Create a reconciliation mapping for unknown values."""
    # Check if catalog item exists
    catalog_name = ""
    if mapping.catalog_type == "strategic_line":
        item = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == mapping.catalog_id).first()
        if not item:
            raise HTTPException(status_code=400, detail="Strategic line not found")
        catalog_name = item.name
    elif mapping.catalog_type == "activity":
        item = db.query(CatalogActivity).filter(CatalogActivity.id == mapping.catalog_id).first()
        if not item:
            raise HTTPException(status_code=400, detail="Activity not found")
        catalog_name = item.name
    elif mapping.catalog_type == "career":
        item = db.query(CatalogCareer).filter(CatalogCareer.id == mapping.catalog_id).first()
        if not item:
            raise HTTPException(status_code=400, detail="Career not found")
        catalog_name = item.name

    # Check for existing mapping
    existing = db.query(ReconciliationMapping).filter(
        ReconciliationMapping.catalog_type == mapping.catalog_type,
        ReconciliationMapping.unknown_value == mapping.unknown_value
    ).first()

    if existing:
        # Update existing mapping
        existing.catalog_id = mapping.catalog_id
        existing.mapped_by = mapping.mapped_by
        db.commit()
        db.refresh(existing)

        return ReconciliationMapping(
            id=existing.id,
            catalog_type=existing.catalog_type,
            unknown_value=existing.unknown_value,
            catalog_id=existing.catalog_id,
            catalog_name=catalog_name,
            mapped_by=existing.mapped_by,
            created_at=existing.created_at.isoformat()
        )
    else:
        # Create new mapping
        db_mapping = ReconciliationMapping(**mapping.dict())
        db.add(db_mapping)
        db.commit()
        db.refresh(db_mapping)

        return ReconciliationMapping(
            id=db_mapping.id,
            catalog_type=db_mapping.catalog_type,
            unknown_value=db_mapping.unknown_value,
            catalog_id=db_mapping.catalog_id,
            catalog_name=catalog_name,
            mapped_by=db_mapping.mapped_by,
            created_at=db_mapping.created_at.isoformat()
        )

@router.get("/reconciliation/mappings", response_model=PaginatedResponse)
async def list_reconciliation_mappings(
    db: Session = Depends(get_db),
    catalog_type: Optional[str] = Query(None, pattern="^(strategic_line|activity|career)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: bool = Depends(require_admin_role)
):
    """List reconciliation mappings."""
    query = db.query(ReconciliationMapping)

    if catalog_type:
        query = query.filter(ReconciliationMapping.catalog_type == catalog_type)

    total = query.count()
    offset = (page - 1) * per_page
    items = query.order_by(ReconciliationMapping.created_at.desc()).offset(offset).limit(per_page).all()

    mappings = []
    for item in items:
        # Get catalog name
        catalog_name = ""
        if item.catalog_type == "strategic_line":
            catalog_item = db.query(CatalogStrategicLine).filter(CatalogStrategicLine.id == item.catalog_id).first()
            catalog_name = catalog_item.name if catalog_item else "Unknown"
        elif item.catalog_type == "activity":
            catalog_item = db.query(CatalogActivity).filter(CatalogActivity.id == item.catalog_id).first()
            catalog_name = catalog_item.name if catalog_item else "Unknown"
        elif item.catalog_type == "career":
            catalog_item = db.query(CatalogCareer).filter(CatalogCareer.id == item.catalog_id).first()
            catalog_name = catalog_item.name if catalog_item else "Unknown"

        mappings.append({
            "id": item.id,
            "catalog_type": item.catalog_type,
            "unknown_value": item.unknown_value,
            "catalog_id": item.catalog_id,
            "catalog_name": catalog_name,
            "mapped_by": item.mapped_by,
            "created_at": item.created_at.isoformat() if item.created_at else None
        })

    pages = math.ceil(total / per_page)
    return PaginatedResponse(items=mappings, total=total, page=page, per_page=per_page, pages=pages)