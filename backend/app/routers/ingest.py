from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
import pandas as pd
import json
import io
import unicodedata
import re
import os
import tempfile
from datetime import datetime
from app.database import get_db
from app.models import Activity, Registrant, Registration, FormsUpload, MetadataValue
from sqlalchemy import func
from app.schemas import CSVUploadRequest, CSVPreviewResponse
from app.utils.validators import validate_and_normalize_row
from app.services.cache import invalidate_on_data_change
from app.utils.name_normalization import backfill_normalization_fields

router = APIRouter()

# Canonical fields with comprehensive Spanish variants and synonyms
CANONICAL_FIELD_PATTERNS = {
    "full_name": [
        # Direct matches
        "nombre completo", "full name", "name", "nombre", "estudiante", "participant", "participante",
        "nombre y apellido", "nombres y apellidos", "apellidos y nombres", "nombre apellido",
        "nombre del estudiante", "nombre del participante", "nombre participante",
        # Common form field names
        "tu nombre completo", "escriba su nombre", "ingrese su nombre", "cual es tu nombre",
        "como te llamas", "nombre real", "nombres", "apellidos",
        # Variants
        "nom", "names", "fullname", "student_name", "person_name"
    ],
    "rut": [
        # Chilean ID variants
        "rut", "run", "cedula", "cedula de identidad", "documento", "documento de identidad",
        "ci", "id", "identification", "identificacion", "numero de documento",
        "rut sin puntos", "rut con puntos", "rut completo", "numero rut",
        # Common form patterns
        "tu rut", "ingresa tu rut", "cual es tu rut", "rut o cedula",
        "documento nacional", "carnet", "carnet de identidad"
    ],
    "university_email": [
        # Email variants
        "email", "correo", "mail", "e-mail", "correo electronico", "correo electrónico",
        "university email", "correo universitario", "email universitario", "correo institucional",
        "email institucional", "correo estudiantil", "email estudiantil", "correo uc", "email uc",
        # Common form patterns
        "tu correo", "ingresa tu correo", "cual es tu correo", "tu email",
        "direccion de correo", "correo personal", "email personal",
        # Technical variants
        "email_address", "mail_address", "contact_email", "student_email"
    ],
    "career_or_area": [
        # Career/study program variants
        "carrera", "career", "programa", "major", "estudios", "area", "área",
        "programa de estudios", "carrera universitaria", "area de estudios", "área de estudios",
        "especialidad", "profesion", "profesión", "campo de estudio", "disciplina",
        # Common form patterns
        "que estudias", "qué estudias", "tu carrera", "cual es tu carrera", "cuál es tu carrera",
        "programa academico", "programa académico", "area academica", "área académica",
        # Variants
        "study_area", "academic_program", "field", "course", "degree", "titulo", "título"
    ],
    "phone": [
        # Phone number variants
        "telefono", "teléfono", "phone", "celular", "movil", "móvil", "numero", "número",
        "numero de telefono", "número de teléfono", "numero de celular", "número de celular",
        "telefono movil", "teléfono móvil", "telefono celular", "teléfono celular",
        # Contact variants
        "contacto", "contact", "numero de contacto", "número de contacto",
        "telefono de contacto", "teléfono de contacto",
        # Common form patterns
        "tu telefono", "tu teléfono", "ingresa tu telefono", "ingresa tu teléfono",
        "cual es tu telefono", "cuál es tu teléfono",
        # Technical variants
        "phone_number", "mobile", "cell", "tel", "contact_number"
    ]
}

def normalize_text(text: str) -> str:
    """
    Normalize text by removing accents, converting to lowercase, and cleaning
    """
    if not isinstance(text, str):
        return ""

    # Convert to lowercase
    text = text.lower().strip()

    # Remove accents and diacritics
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')

    # Clean up extra spaces and special characters for comparison
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    return text

def suggest_column_mappings(headers: List[str]) -> Dict[str, str]:
    """
    Suggest mappings between CSV headers and canonical fields using intelligent matching
    """
    mappings = {}
    normalized_headers = {header: normalize_text(header) for header in headers}
    used_headers = set()

    # Normalize all pattern variants for comparison
    normalized_patterns = {}
    for canonical_field, patterns in CANONICAL_FIELD_PATTERNS.items():
        normalized_patterns[canonical_field] = [normalize_text(pattern) for pattern in patterns]

    # Try exact matches first (highest priority)
    for canonical_field, normalized_pattern_list in normalized_patterns.items():
        for header in headers:
            if header in used_headers:
                continue

            normalized_header = normalized_headers[header]

            # Check for exact normalized matches
            if normalized_header in normalized_pattern_list:
                mappings[header] = canonical_field
                used_headers.add(header)
                break

    # Try substring matches (medium priority)
    for canonical_field, normalized_pattern_list in normalized_patterns.items():
        if canonical_field in mappings.values():
            continue  # Already mapped

        for header in headers:
            if header in used_headers:
                continue

            normalized_header = normalized_headers[header]

            # Check if any pattern is contained in header or vice versa
            for pattern in normalized_pattern_list:
                if (pattern in normalized_header and len(pattern) >= 3) or \
                   (normalized_header in pattern and len(normalized_header) >= 3):
                    mappings[header] = canonical_field
                    used_headers.add(header)
                    break

            if header in used_headers:
                break

    # Try fuzzy/partial matches (lowest priority)
    for canonical_field, normalized_pattern_list in normalized_patterns.items():
        if canonical_field in mappings.values():
            continue  # Already mapped

        for header in headers:
            if header in used_headers:
                continue

            normalized_header = normalized_headers[header]

            # Check for word overlap
            header_words = set(normalized_header.split())
            for pattern in normalized_pattern_list:
                pattern_words = set(pattern.split())

                # If there's significant word overlap, consider it a match
                if len(header_words & pattern_words) >= min(len(header_words), len(pattern_words)) // 2:
                    mappings[header] = canonical_field
                    used_headers.add(header)
                    break

            if header in used_headers:
                break

    return mappings

@router.post("/preview", response_model=CSVPreviewResponse)
async def preview_csv(file: UploadFile = File(...)):
    """
    Preview CSV file and suggest intelligent column mappings for canonical fields
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        contents = await file.read()

        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']:
            try:
                df = pd.read_csv(io.StringIO(contents.decode(encoding)))
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Could not decode CSV file. Please ensure it's properly encoded.")

        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty")

        # Get headers and preview data (first 20 rows)
        headers = df.columns.tolist()
        preview_data = df.head(20).fillna("").to_dict('records')

        # Generate intelligent column mappings
        suggested_mappings = suggest_column_mappings(headers)

        # Convert data to ensure all values are strings for frontend display
        clean_preview_data = []
        for row in preview_data:
            clean_row = {}
            for key, value in row.items():
                clean_row[key] = str(value) if pd.notna(value) and value != "" else ""
            clean_preview_data.append(clean_row)

        return CSVPreviewResponse(
            headers=headers,
            sample_data=clean_preview_data,
            suggested_mappings=suggested_mappings
        )

    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

@router.post("/upload")
async def upload_csv_with_mappings(
    file: UploadFile = File(...),
    strategic_line: str = None,
    activity: str = None,
    year: int = None,
    audience: str = None,
    column_mappings: str = None,  # JSON string of mappings
    db: Session = Depends(get_db)
):
    """
    Upload CSV with validated column mappings and metadata
    """
    if not all([strategic_line, activity, year, audience, column_mappings]):
        raise HTTPException(
            status_code=400,
            detail="All fields are required: strategic_line, activity, year, audience, column_mappings"
        )

    try:
        # Parse and validate column mappings
        mappings = json.loads(column_mappings)

        # Validate that all required canonical fields are mapped
        required_fields = {"full_name", "rut", "university_email", "career_or_area", "phone"}
        mapped_fields = set(mappings.values())

        missing_fields = required_fields - mapped_fields
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required field mappings: {', '.join(missing_fields)}"
            )

        # Read and process CSV
        contents = await file.read()

        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']:
            try:
                df = pd.read_csv(io.StringIO(contents.decode(encoding)))
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Could not decode CSV file")

        # Validate that all mapped columns exist in CSV
        csv_headers = set(df.columns.tolist())
        mapped_headers = set(mappings.keys())
        missing_headers = mapped_headers - csv_headers
        if missing_headers:
            raise HTTPException(
                status_code=400,
                detail=f"Mapped columns not found in CSV: {', '.join(missing_headers)}"
            )

        # Create or get activity
        activity_record = db.query(Activity).filter_by(
            strategic_line=strategic_line,
            activity=activity,
            year=year,
            audience=audience
        ).first()

        if not activity_record:
            activity_record = Activity(
                strategic_line=strategic_line,
                activity=activity,
                year=year,
                audience=audience
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
        errors = []

        for index, row in df.iterrows():
            try:
                # Extract canonical fields using mappings
                registrant_data = {}
                additional_data = {}

                # Get mapped canonical fields
                for csv_header, canonical_field in mappings.items():
                    if csv_header in row and pd.notna(row[csv_header]):
                        value = str(row[csv_header]).strip()
                        if value:  # Only store non-empty values
                            registrant_data[canonical_field] = value

                # Store additional fields that weren't mapped to canonical fields
                for col in df.columns:
                    if col not in mappings and pd.notna(row[col]):
                        value = str(row[col]).strip()
                        if value:
                            additional_data[col] = value

                # Validate required fields
                if not registrant_data.get('full_name'):
                    errors.append(f"Row {index + 2}: Missing full_name")
                    continue

                # Create or find registrant
                registrant = db.query(Registrant).filter_by(
                    full_name=registrant_data['full_name'],
                    rut=registrant_data.get('rut')
                ).first()

                if not registrant:
                    # Apply name normalization during CSV ingest
                    raw_registrant_data = {
                        'full_name': registrant_data['full_name'],
                        'career': registrant_data.get('career_or_area'),
                        'raw_career': registrant_data.get('career_or_area')  # Store original career value
                    }

                    # Backfill normalization fields
                    normalized_data = backfill_normalization_fields(raw_registrant_data)

                    registrant = Registrant(
                        full_name=registrant_data['full_name'],
                        rut=registrant_data.get('rut'),
                        university_email=registrant_data.get('university_email'),
                        career=registrant_data.get('career_or_area'),
                        phone=registrant_data.get('phone'),
                        additional_data=json.dumps(additional_data) if additional_data else None,
                        # Add normalization fields
                        raw_full_name=normalized_data['raw_full_name'],
                        normalized_full_name=normalized_data['normalized_full_name'],
                        canonical_full_name=normalized_data['canonical_full_name'],
                        audience=normalized_data['audience'],
                        raw_career=normalized_data.get('raw_career')
                    )
                    db.add(registrant)
                    db.flush()  # Get the ID without committing

                # Create registration
                registration = Registration(
                    activity_id=activity_record.id,
                    registrant_id=registrant.id,
                    attended=False
                )
                db.add(registration)
                registrations_created += 1

            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")

        # Create upload record
        upload_record = FormsUpload(
            filename=file.filename,
            original_headers=json.dumps(df.columns.tolist()),
            mapped_headers=json.dumps(mappings),
            records_count=registrations_created,
            activity_id=activity_record.id
        )
        db.add(upload_record)

        # Commit all changes
        db.commit()

        # Invalidate cache since new data was ingested
        invalidate_on_data_change()

        result = {
            "message": f"Successfully processed {registrations_created} registrations",
            "activity_id": activity_record.id,
            "registrations_created": registrations_created,
            "upload_id": upload_record.id
        }

        if errors:
            result["errors"] = errors[:10]  # Limit to first 10 errors
            result["total_errors"] = len(errors)

        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column_mappings JSON format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error uploading CSV: {str(e)}")

@router.post("/csv")
async def ingest_csv_with_metadata(
    file: UploadFile = File(...),
    strategic_line: str = Form(...),
    activity: str = Form(...),
    year: int = Form(...),
    audience: str = Form(...),
    column_mappings: str = Form(...),  # JSON string of mappings
    db: Session = Depends(get_db)
):
    """
    Complete CSV ingestion with metadata enrichment
    """
    try:
        # Parse and validate column mappings
        mappings = json.loads(column_mappings)

        # Validate that all required canonical fields are mapped
        required_fields = {"full_name", "rut", "university_email", "career_or_area", "phone"}
        mapped_fields = set(mappings.values())

        missing_fields = required_fields - mapped_fields
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required field mappings: {', '.join(missing_fields)}"
            )

        # Read and process CSV
        contents = await file.read()

        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']:
            try:
                df = pd.read_csv(io.StringIO(contents.decode(encoding)))
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Could not decode CSV file")

        # Validate that all mapped columns exist in CSV
        csv_headers = set(df.columns.tolist())
        mapped_headers = set(mappings.keys())
        missing_headers = mapped_headers - csv_headers
        if missing_headers:
            raise HTTPException(
                status_code=400,
                detail=f"Mapped columns not found in CSV: {', '.join(missing_headers)}"
            )

        # Create or get activity
        activity_record = db.query(Activity).filter_by(
            strategic_line=strategic_line,
            activity=activity,
            year=year,
            audience=audience
        ).first()

        if not activity_record:
            activity_record = Activity(
                strategic_line=strategic_line,
                activity=activity,
                year=year,
                audience=audience
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
                metadata_value.last_used = func.now()
            else:
                metadata_value = MetadataValue(
                    field_name=field_name,
                    value=str(value),
                    usage_count=1
                )
                db.add(metadata_value)

        # Enrich DataFrame with metadata columns
        df_enriched = df.copy()
        df_enriched['strategic_line'] = strategic_line
        df_enriched['activity'] = activity
        df_enriched['year'] = year
        df_enriched['ingestion_date'] = datetime.now().isoformat()

        # Process registrations with validation and normalization
        registrations_created = 0
        valid_records = 0
        invalid_records = 0
        errors = []
        validation_errors = []

        for index, row in df.iterrows():
            row_number = index + 2  # Excel row number (1-indexed + header)

            try:
                # Extract canonical fields using mappings
                raw_registrant_data = {}
                additional_data = {}

                # Get mapped canonical fields (raw values)
                for csv_header, canonical_field in mappings.items():
                    if csv_header in row and pd.notna(row[csv_header]):
                        value = str(row[csv_header]).strip()
                        if value:  # Only store non-empty values
                            raw_registrant_data[canonical_field] = value

                # Store additional fields that weren't mapped to canonical fields
                for col in df.columns:
                    if col not in mappings and pd.notna(row[col]):
                        value = str(row[col]).strip()
                        if value:
                            additional_data[col] = value

                # Add metadata to additional_data
                additional_data.update({
                    'strategic_line': strategic_line,
                    'activity': activity,
                    'year': year,
                    'ingestion_date': datetime.now().isoformat()
                })

                # Validate required fields first
                if not raw_registrant_data.get('full_name'):
                    error_msg = f"Row {row_number}: Missing required field: full_name"
                    errors.append(error_msg)
                    validation_errors.append({
                        'row': row_number,
                        'error': 'Missing full_name',
                        'raw_data': dict(row)
                    })
                    invalid_records += 1
                    continue

                # Validate and normalize the registrant data
                normalized_data, is_row_valid, field_errors, error_types = validate_and_normalize_row(raw_registrant_data)

                # Track validation results
                if not is_row_valid:
                    invalid_records += 1
                    validation_errors.append({
                        'row': row_number,
                        'errors': field_errors,
                        'raw_data': dict(row)
                    })
                else:
                    valid_records += 1

                # Create or find registrant (using normalized full_name and RUT for lookup)
                lookup_name = normalized_data.get('full_name', raw_registrant_data.get('full_name', ''))
                lookup_rut = normalized_data.get('rut')

                registrant = db.query(Registrant).filter_by(
                    full_name=lookup_name,
                    rut=lookup_rut
                ).first()

                if not registrant:
                    registrant = Registrant(
                        # Normalized fields
                        full_name=normalized_data.get('full_name', raw_registrant_data.get('full_name', '')),
                        rut=normalized_data.get('rut'),
                        university_email=normalized_data.get('university_email'),
                        career=normalized_data.get('career_or_area'),
                        phone=normalized_data.get('phone'),
                        # Raw values
                        raw_career=normalized_data.get('raw_career'),
                        # Validation tracking
                        row_valid=is_row_valid,
                        validation_errors=json.dumps(field_errors) if field_errors else None,
                        error_types=','.join(error_types) if error_types else None,
                        # Additional data
                        additional_data=json.dumps(additional_data) if additional_data else None
                    )
                    db.add(registrant)
                    db.flush()  # Get the ID without committing
                else:
                    # Update existing registrant with new validation info if this is more recent data
                    if not is_row_valid and registrant.row_valid:
                        # If new data is invalid but existing was valid, add to errors but don't downgrade
                        pass
                    elif is_row_valid and not registrant.row_valid:
                        # If new data is valid and existing was invalid, upgrade
                        registrant.row_valid = True
                        registrant.validation_errors = None
                        # Update with normalized values
                        registrant.full_name = normalized_data.get('full_name', registrant.full_name)
                        registrant.rut = normalized_data.get('rut') or registrant.rut
                        registrant.university_email = normalized_data.get('university_email') or registrant.university_email
                        registrant.career = normalized_data.get('career_or_area') or registrant.career
                        registrant.phone = normalized_data.get('phone') or registrant.phone
                        registrant.raw_career = normalized_data.get('raw_career') or registrant.raw_career

                # Create registration
                registration = Registration(
                    activity_id=activity_record.id,
                    registrant_id=registrant.id,
                    attended=False
                )
                db.add(registration)
                registrations_created += 1

                # Log validation errors for problematic rows (but still ingest them)
                if field_errors:
                    error_details = []
                    for field, error in field_errors.items():
                        error_details.append(f"{field}: {error}")
                    errors.append(f"Row {row_number}: Validation issues - {'; '.join(error_details)}")

            except Exception as e:
                error_msg = f"Row {row_number}: Unexpected error - {str(e)}"
                errors.append(error_msg)
                validation_errors.append({
                    'row': row_number,
                    'error': str(e),
                    'raw_data': dict(row)
                })
                invalid_records += 1

        # Save enriched CSV to temporary file
        enriched_csv_path = None
        try:
            # Create temporary file for enriched CSV
            temp_dir = tempfile.gettempdir()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            enriched_filename = f"enriched_{activity.replace(' ', '_')}_{timestamp}.csv"
            enriched_csv_path = os.path.join(temp_dir, enriched_filename)

            df_enriched.to_csv(enriched_csv_path, index=False, encoding='utf-8')
        except Exception as e:
            print(f"Warning: Could not save enriched CSV: {e}")

        # Create upload record with validation statistics
        upload_record = FormsUpload(
            filename=file.filename,
            original_headers=json.dumps(df.columns.tolist()),
            mapped_headers=json.dumps(mappings),
            records_count=registrations_created,
            valid_records_count=valid_records,
            invalid_records_count=invalid_records,
            errors_json=json.dumps({
                'validation_errors': validation_errors[:50],  # Limit stored errors
                'total_validation_errors': len(validation_errors),
                'summary': {
                    'total_rows': len(df),
                    'valid_rows': valid_records,
                    'invalid_rows': invalid_records,
                    'validation_rate': round((valid_records / len(df)) * 100, 2) if len(df) > 0 else 0
                }
            }) if validation_errors else None,
            activity_id=activity_record.id
        )
        db.add(upload_record)

        # Commit all changes
        db.commit()

        # Invalidate cache since new data was ingested
        invalidate_on_data_change()

        result = {
            "message": f"Successfully processed {registrations_created} registrations",
            "activity_id": activity_record.id,
            "registrations_created": registrations_created,
            "upload_id": upload_record.id,
            "validation_summary": {
                "total_rows": len(df),
                "valid_rows": valid_records,
                "invalid_rows": invalid_records,
                "validation_rate": round((valid_records / len(df)) * 100, 2) if len(df) > 0 else 0
            },
            "metadata": {
                "strategic_line": strategic_line,
                "activity": activity,
                "year": year
            }
        }

        # Add enriched CSV download link if file was created
        if enriched_csv_path and os.path.exists(enriched_csv_path):
            result["enriched_csv_download"] = f"/api/ingest/download/{upload_record.id}"

        if errors:
            result["errors"] = errors[:10]  # Limit to first 10 errors
            result["total_errors"] = len(errors)

        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column_mappings JSON format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

@router.get("/download/{upload_id}")
async def download_enriched_csv(upload_id: int, db: Session = Depends(get_db)):
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
            'registered_at': registration.registered_at.isoformat() if registration.registered_at else None,
        }

        # Add metadata
        row_data.update({
            'strategic_line': activity.strategic_line,
            'activity': activity.activity,
            'year': activity.year,
        })

        # Add additional data if present
        if registrant.additional_data:
            try:
                additional = json.loads(registrant.additional_data)
                row_data.update(additional)
            except json.JSONDecodeError:
                pass

        enriched_data.append(row_data)

    if not enriched_data:
        raise HTTPException(status_code=404, detail="No data found for this upload")

    # Create DataFrame and CSV
    df = pd.DataFrame(enriched_data)

    # Generate CSV content
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_content = csv_buffer.getvalue()

    # Create filename
    safe_activity = "".join(c for c in activity.activity if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = f"enriched_{safe_activity}_{activity.year}.csv"

    # Return as streaming response
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/metadata/{field_name}")
async def get_metadata_autocomplete(field_name: str, db: Session = Depends(get_db)):
    """Get autocomplete values for metadata fields"""
    if field_name not in ["strategic_line", "activity"]:
        raise HTTPException(status_code=400, detail="Invalid field name")

    values = db.query(MetadataValue).filter_by(field_name=field_name).order_by(
        MetadataValue.usage_count.desc(),
        MetadataValue.last_used.desc()
    ).all()

    return {
        "field_name": field_name,
        "values": [v.value for v in values]
    }