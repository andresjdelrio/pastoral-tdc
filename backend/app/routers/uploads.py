from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import pandas as pd
import json
import io
from app.database import get_db
from app.models import Activity, Registration, FormsUpload, MetadataValue, Registrant
from app.schemas import CSVUploadRequest, CSVPreviewResponse

router = APIRouter()

CANONICAL_FIELDS = {
    "full_name": ["nombre completo", "name", "full name", "nombre", "estudiante"],
    "rut": ["rut", "run", "documento", "cedula", "id"],
    "university_email": ["email", "correo", "mail", "correo electronico", "university email", "correo universitario"],
    "career": ["carrera", "career", "programa", "major", "estudios"],
    "phone": ["telefono", "phone", "celular", "movil", "numero"]
}

def suggest_column_mappings(headers: List[str]) -> Dict[str, str]:
    """Suggest mappings between CSV headers and canonical fields"""
    mappings = {}
    headers_lower = [h.lower().strip() for h in headers]

    for canonical_field, possible_names in CANONICAL_FIELDS.items():
        for header_idx, header in enumerate(headers_lower):
            for possible_name in possible_names:
                if possible_name in header or header in possible_name:
                    mappings[headers[header_idx]] = canonical_field
                    break
            if headers[header_idx] in mappings:
                break

    return mappings

@router.post("/preview-csv", response_model=CSVPreviewResponse)
async def preview_csv(file: UploadFile = File(...)):
    """Preview CSV file and suggest column mappings"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))

        headers = df.columns.tolist()
        sample_data = df.head(3).to_dict('records')
        suggested_mappings = suggest_column_mappings(headers)

        return CSVPreviewResponse(
            headers=headers,
            sample_data=sample_data,
            suggested_mappings=suggested_mappings
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    strategic_line: str = None,
    activity: str = None,
    year: int = None,
    column_mappings: str = None,  # JSON string
    db: Session = Depends(get_db)
):
    """Upload CSV with confirmed column mappings and metadata"""
    if not all([strategic_line, activity, year, column_mappings]):
        raise HTTPException(status_code=400, detail="All metadata fields and column mappings are required")

    try:
        # Parse column mappings
        mappings = json.loads(column_mappings)

        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))

        # Create or get activity
        activity_record = db.query(Activity).filter_by(
            strategic_line=strategic_line,
            activity=activity,
            year=year
        ).first()

        if not activity_record:
            activity_record = Activity(
                strategic_line=strategic_line,
                activity=activity,
                year=year
            )
            db.add(activity_record)
            db.commit()
            db.refresh(activity_record)

        # Update metadata values for autocomplete
        for field_name, value in [("strategic_line", strategic_line), ("activity", activity)]:
            metadata_value = db.query(MetadataValue).filter_by(
                field_name=field_name,
                value=str(value)
            ).first()

            if metadata_value:
                metadata_value.usage_count += 1
            else:
                metadata_value = MetadataValue(
                    field_name=field_name,
                    value=str(value),
                    usage_count=1
                )
                db.add(metadata_value)

        # Process registrations
        registrations_created = 0

        for _, row in df.iterrows():
            # Extract canonical fields
            registration_data = {}
            additional_data = {}

            for csv_header, canonical_field in mappings.items():
                if canonical_field in CANONICAL_FIELDS and csv_header in row:
                    registration_data[canonical_field] = str(row[csv_header]) if pd.notna(row[csv_header]) else None

            # Store additional fields
            for col in df.columns:
                if col not in mappings or mappings[col] not in CANONICAL_FIELDS:
                    if pd.notna(row[col]):
                        additional_data[col] = str(row[col])

            # Create registrant first
            registrant = Registrant(
                full_name=registration_data.get('full_name', ''),
                rut=registration_data.get('rut'),
                university_email=registration_data.get('university_email'),
                career=registration_data.get('career'),
                phone=registration_data.get('phone'),
                additional_data=json.dumps(additional_data) if additional_data else None
            )
            db.add(registrant)
            db.flush()  # Get the ID

            # Create registration linking registrant to activity
            registration = Registration(
                activity_id=activity_record.id,
                registrant_id=registrant.id
            )

            db.add(registration)
            registrations_created += 1

        # Create upload record
        upload_record = FormsUpload(
            filename=file.filename,
            original_headers=json.dumps(df.columns.tolist()),
            mapped_headers=json.dumps(mappings),
            records_count=registrations_created,
            activity_id=activity_record.id
        )

        db.add(upload_record)
        db.commit()

        return {
            "message": f"Successfully uploaded {registrations_created} registrations",
            "activity_id": activity_record.id,
            "registrations_created": registrations_created
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error uploading CSV: {str(e)}")

@router.get("/metadata/{field_name}")
async def get_metadata_values(field_name: str, db: Session = Depends(get_db)):
    """Get autocomplete values for metadata fields"""
    values = db.query(MetadataValue).filter_by(field_name=field_name).order_by(
        MetadataValue.usage_count.desc(),
        MetadataValue.last_used.desc()
    ).all()

    return {
        "field_name": field_name,
        "values": [v.value for v in values]
    }