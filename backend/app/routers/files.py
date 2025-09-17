from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
import pandas as pd
import json
import io
import os
import tempfile
from datetime import datetime

from app.database import get_db
from app.models import Activity, Registration, Registrant, FormsUpload
from app.services.cache import invalidate_on_data_change

router = APIRouter(prefix="/files", tags=["files"])

class FileInfo(BaseModel):
    id: int
    filename: str
    activity_name: str
    strategic_line: str
    year: int
    audience: str
    records_count: int
    valid_records_count: int
    invalid_records_count: int
    uploaded_at: str
    file_size_mb: Optional[float] = None

class FileListResponse(BaseModel):
    files: List[FileInfo]
    total: int
    page: int
    per_page: int
    pages: int

class ReportRequest(BaseModel):
    activity_ids: Optional[List[int]] = None
    strategic_lines: Optional[List[str]] = None
    years: Optional[List[int]] = None
    audiences: Optional[List[str]] = None
    include_attendance: bool = True
    include_validation_errors: bool = False
    report_format: str = "csv"  # csv, excel

@router.get("/", response_model=FileListResponse)
async def list_files(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by filename or activity"),
    strategic_line: Optional[str] = Query(None, description="Filter by strategic line"),
    year: Optional[int] = Query(None, description="Filter by year"),
    audience: Optional[str] = Query(None, description="Filter by audience")
):
    """
    List all uploaded files with metadata and filtering options
    """
    # Build query
    query = db.query(
        FormsUpload.id,
        FormsUpload.filename,
        FormsUpload.records_count,
        FormsUpload.valid_records_count,
        FormsUpload.invalid_records_count,
        FormsUpload.uploaded_at,
        Activity.activity.label('activity_name'),
        Activity.strategic_line,
        Activity.year,
        Activity.audience
    ).join(Activity, FormsUpload.activity_id == Activity.id)

    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            FormsUpload.filename.ilike(search_term) |
            Activity.activity.ilike(search_term)
        )

    if strategic_line:
        query = query.filter(Activity.strategic_line == strategic_line)

    if year:
        query = query.filter(Activity.year == year)

    if audience:
        query = query.filter(Activity.audience == audience)

    # Get total count
    total = query.count()

    # Apply pagination and ordering
    offset = (page - 1) * per_page
    results = query.order_by(desc(FormsUpload.uploaded_at)).offset(offset).limit(per_page).all()

    # Format results
    files = []
    for result in results:
        files.append(FileInfo(
            id=result.id,
            filename=result.filename,
            activity_name=result.activity_name,
            strategic_line=result.strategic_line,
            year=result.year,
            audience=result.audience,
            records_count=result.records_count,
            valid_records_count=result.valid_records_count or 0,
            invalid_records_count=result.invalid_records_count or 0,
            uploaded_at=result.uploaded_at.isoformat() if result.uploaded_at else "",
            file_size_mb=None  # Could be calculated if needed
        ))

    pages = (total + per_page - 1) // per_page

    return FileListResponse(
        files=files,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

@router.delete("/{upload_id}")
async def delete_file(upload_id: int, db: Session = Depends(get_db)):
    """
    Delete an uploaded file and all associated data
    """
    # Find the upload record
    upload_record = db.query(FormsUpload).filter(FormsUpload.id == upload_id).first()
    if not upload_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Get the activity
    activity = db.query(Activity).filter(Activity.id == upload_record.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Associated activity not found")

    # Count registrations that will be affected
    registrations_count = db.query(Registration).filter(
        Registration.activity_id == upload_record.activity_id
    ).count()

    # Delete registrations first (cascade will handle this, but being explicit)
    db.query(Registration).filter(Registration.activity_id == upload_record.activity_id).delete()

    # Delete registrants that are no longer referenced
    orphaned_registrants = db.query(Registrant).filter(
        ~Registrant.id.in_(
            db.query(Registration.registrant_id).distinct()
        )
    )
    orphaned_count = orphaned_registrants.count()
    orphaned_registrants.delete(synchronize_session=False)

    # Delete the activity
    db.delete(activity)

    # Delete the upload record
    db.delete(upload_record)

    # Commit all changes
    db.commit()

    # Invalidate cache
    invalidate_on_data_change()

    return {
        "message": "File and associated data deleted successfully",
        "deleted_registrations": registrations_count,
        "deleted_registrants": orphaned_count,
        "activity_name": activity.activity
    }

@router.post("/download/enriched/{upload_id}")
async def download_enriched_file(upload_id: int, db: Session = Depends(get_db)):
    """
    Download enriched CSV file for a specific upload
    """
    upload_record = db.query(FormsUpload).filter(FormsUpload.id == upload_id).first()
    if not upload_record:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Get the activity info
    activity = db.query(Activity).filter(Activity.id == upload_record.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get all registrations for this activity
    registrations = db.query(Registration).join(Registrant).filter(
        Registration.activity_id == upload_record.activity_id
    ).all()

    if not registrations:
        raise HTTPException(status_code=404, detail="No data found for this upload")

    # Build enriched data
    enriched_data = []
    for registration in registrations:
        registrant = registration.registrant

        # Start with basic registrant data
        row_data = {
            'full_name': registrant.full_name,
            'rut': registrant.rut,
            'university_email': registrant.university_email,
            'career_or_area': registrant.career,
            'phone': registrant.phone,
            'attended': registration.attended,
            'participation_status': registration.participation_status,
            'source': registration.source,
            'registered_at': registration.registered_at.isoformat() if registration.registered_at else None,
        }

        # Add metadata
        row_data.update({
            'strategic_line': activity.strategic_line,
            'activity': activity.activity,
            'year': activity.year,
            'audience': activity.audience,
        })

        # Add validation info
        row_data.update({
            'row_valid': registrant.row_valid,
            'validation_errors': registrant.validation_errors,
            'error_types': registrant.error_types,
        })

        # Add additional data if present
        if registrant.additional_data:
            try:
                additional = json.loads(registrant.additional_data)
                row_data.update(additional)
            except json.JSONDecodeError:
                pass

        enriched_data.append(row_data)

    # Create DataFrame and CSV
    df = pd.DataFrame(enriched_data)

    # Generate CSV content
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False, encoding='utf-8')
    csv_content = csv_buffer.getvalue()

    # Create filename
    safe_activity = "".join(c for c in activity.activity if c.isalnum() or c in (' ', '-', '_')).rstrip()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"enriched_{safe_activity}_{activity.year}_{activity.audience}_{timestamp}.csv"

    # Return as streaming response
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/generate-report")
async def generate_custom_report(
    request: ReportRequest,
    db: Session = Depends(get_db)
):
    """
    Generate custom reports based on filters
    """
    # Build query based on filters
    query = db.query(Registration).join(Registrant).join(Activity)

    if request.activity_ids:
        query = query.filter(Activity.id.in_(request.activity_ids))

    if request.strategic_lines:
        query = query.filter(Activity.strategic_line.in_(request.strategic_lines))

    if request.years:
        query = query.filter(Activity.year.in_(request.years))

    if request.audiences:
        query = query.filter(Activity.audience.in_(request.audiences))

    registrations = query.all()

    if not registrations:
        raise HTTPException(status_code=404, detail="No data found for the specified filters")

    # Build report data
    report_data = []
    for registration in registrations:
        registrant = registration.registrant
        activity = registration.activity

        row_data = {
            'activity_id': activity.id,
            'activity_name': activity.activity,
            'strategic_line': activity.strategic_line,
            'year': activity.year,
            'audience': activity.audience,
            'registrant_id': registrant.id,
            'full_name': registrant.full_name,
            'rut': registrant.rut,
            'university_email': registrant.university_email,
            'career_or_area': registrant.career,
            'phone': registrant.phone,
            'registered_at': registration.registered_at.isoformat() if registration.registered_at else None,
            'source': registration.source,
        }

        if request.include_attendance:
            row_data.update({
                'attended': registration.attended,
                'participation_status': registration.participation_status,
            })

        if request.include_validation_errors:
            row_data.update({
                'row_valid': registrant.row_valid,
                'validation_errors': registrant.validation_errors,
                'error_types': registrant.error_types,
            })

        # Add additional data if present
        if registrant.additional_data:
            try:
                additional = json.loads(registrant.additional_data)
                row_data.update(additional)
            except json.JSONDecodeError:
                pass

        report_data.append(row_data)

    # Create DataFrame
    df = pd.DataFrame(report_data)

    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filters_str = []
    if request.strategic_lines:
        filters_str.append(f"lines_{len(request.strategic_lines)}")
    if request.years:
        filters_str.append(f"years_{len(request.years)}")
    if request.audiences:
        filters_str.append(f"audiences_{len(request.audiences)}")

    filter_part = "_".join(filters_str) if filters_str else "all"
    filename = f"pastoral_report_{filter_part}_{timestamp}"

    if request.report_format == "excel":
        # Generate Excel content
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Report', index=False)
        excel_content = excel_buffer.getvalue()

        return StreamingResponse(
            io.BytesIO(excel_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}.xlsx"
            }
        )
    else:
        # Generate CSV content
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False, encoding='utf-8')
        csv_content = csv_buffer.getvalue()

        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}.csv"
            }
        )

@router.delete("/bulk")
async def bulk_delete_files(
    upload_ids: List[int],
    db: Session = Depends(get_db)
):
    """
    Delete multiple files and their associated data
    """
    if not upload_ids:
        raise HTTPException(status_code=400, detail="No upload IDs provided")

    # Find all upload records
    upload_records = db.query(FormsUpload).filter(FormsUpload.id.in_(upload_ids)).all()
    found_ids = [record.id for record in upload_records]
    missing_ids = [uid for uid in upload_ids if uid not in found_ids]

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Files not found: {missing_ids}"
        )

    # Get activity IDs
    activity_ids = [record.activity_id for record in upload_records]

    # Count what will be deleted
    total_registrations = db.query(Registration).filter(
        Registration.activity_id.in_(activity_ids)
    ).count()

    # Delete registrations
    db.query(Registration).filter(Registration.activity_id.in_(activity_ids)).delete()

    # Delete orphaned registrants
    orphaned_registrants = db.query(Registrant).filter(
        ~Registrant.id.in_(
            db.query(Registration.registrant_id).distinct()
        )
    )
    orphaned_count = orphaned_registrants.count()
    orphaned_registrants.delete(synchronize_session=False)

    # Delete activities
    db.query(Activity).filter(Activity.id.in_(activity_ids)).delete()

    # Delete upload records
    db.query(FormsUpload).filter(FormsUpload.id.in_(upload_ids)).delete()

    # Commit all changes
    db.commit()

    # Invalidate cache
    invalidate_on_data_change()

    return {
        "message": f"Successfully deleted {len(upload_ids)} files",
        "deleted_files": len(upload_ids),
        "deleted_registrations": total_registrations,
        "deleted_registrants": orphaned_count
    }