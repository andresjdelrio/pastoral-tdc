from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Dict, List, Any
import logging
from app.database import get_db
from app.models import Activity, Registration, Registrant
from app.services.cache import cache_service, CacheKeyBuilder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/indicators", tags=["indicators"])

def classify_audience(career: str, raw_career: str = None) -> str:
    """
    Classify registrant as 'estudiantes' or 'colaboradores' based on career field.
    Returns 'estudiantes' for students, 'colaboradores' for staff/faculty.
    """
    # Check both normalized career and raw_career for classification
    career_text = (career or "").lower()
    raw_career_text = (raw_career or "").lower()

    # Keywords that indicate student status
    student_keywords = [
        'estudiante', 'alumno', 'alumna', 'pregrado', 'grado', 'licenciatura',
        'ingeniería', 'medicina', 'derecho', 'psicología', 'administración',
        'economía', 'arquitectura', 'diseño', 'periodismo', 'educación',
        'enfermería', 'kinesiología', 'odontología', 'veterinaria',
        'primer año', 'segundo año', 'tercer año', 'cuarto año', 'quinto año',
        '1er año', '2do año', '3er año', '4to año', '5to año',
        'semestre', 'carrera', 'programa', 'bachillerato'
    ]

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

    # Check for staff keywords first (more specific)
    for keyword in staff_keywords:
        if keyword in full_text:
            return 'colaboradores'

    # Check for student keywords
    for keyword in student_keywords:
        if keyword in full_text:
            return 'estudiantes'

    # Default to estudiantes if unclear (most registrants are students)
    return 'estudiantes'

@router.get("/")
async def get_indicators(db: Session = Depends(get_db)):
    """
    Get comprehensive indicators data for three audiences: total, estudiantes, colaboradores.
    Returns yearly stats, people counts, and strategic line breakdowns.
    Uses Redis caching with 5-minute TTL for performance.
    """
    # Try to get from cache first
    cache_key = CacheKeyBuilder.indicators()
    cached_result = cache_service.get(cache_key)
    if cached_result:
        logger.info("Indicators data served from cache")
        return cached_result

    logger.info("Computing indicators data from database")

    # Base query that gets individual classifications only (no 'total' aggregation)
    base_query = """
    WITH audience_data AS (
        SELECT
            a.year,
            a.strategic_line,
            reg.id as registration_id,
            r.id as registrant_id,
            r.full_name,
            reg.attended,
            CASE
                WHEN LOWER(COALESCE(r.career, '')) LIKE '%profesor%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%docente%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%funcionario%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%administrativo%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%director%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%coordinador%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%jefe%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%asistente%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%técnico%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%empleado%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%trabajador%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%staff%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%colaborador%' OR
                     LOWER(COALESCE(r.career, '')) LIKE '%personal%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%profesor%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%docente%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%funcionario%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%administrativo%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%director%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%coordinador%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%jefe%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%asistente%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%técnico%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%empleado%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%trabajador%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%staff%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%colaborador%' OR
                     LOWER(COALESCE(r.raw_career, '')) LIKE '%personal%'
                THEN 'colaboradores'
                ELSE 'estudiantes'
            END as audience
        FROM registrations reg
        JOIN activities a ON reg.activity_id = a.id
        JOIN registrants r ON reg.registrant_id = r.id
    )
    """

    # 1. Yearly aggregations for each audience (estudiantes/colaboradores only)
    yearly_query = base_query + """
    SELECT
        year,
        audience,
        COUNT(*) as inscripciones,
        SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as participaciones,
        ROUND(
            CASE
                WHEN COUNT(*) > 0
                THEN (SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
                ELSE 0
            END, 2
        ) as tasa,
        COUNT(DISTINCT registrant_id) as personas
    FROM audience_data
    GROUP BY year, audience
    ORDER BY year, audience
    """

    yearly_results = db.execute(text(yearly_query)).fetchall()

    # 2. Strategic line aggregations
    strategic_query = base_query + """
    SELECT
        strategic_line,
        year,
        audience,
        COUNT(*) as inscripciones,
        SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as participaciones,
        ROUND(
            CASE
                WHEN COUNT(*) > 0
                THEN (SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
                ELSE 0
            END, 2
        ) as tasa,
        COUNT(DISTINCT registrant_id) as personas
    FROM audience_data
    GROUP BY strategic_line, year, audience
    ORDER BY strategic_line, year, audience
    """

    strategic_results = db.execute(text(strategic_query)).fetchall()

    # 3. Strategic line totals (across all years)
    strategic_totals_query = base_query + """
    SELECT
        strategic_line,
        audience,
        COUNT(*) as inscripciones,
        SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as participaciones,
        ROUND(
            CASE
                WHEN COUNT(*) > 0
                THEN (SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
                ELSE 0
            END, 2
        ) as tasa,
        COUNT(DISTINCT registrant_id) as personas
    FROM audience_data
    GROUP BY strategic_line, audience
    ORDER BY strategic_line, audience
    """

    strategic_totals_results = db.execute(text(strategic_totals_query)).fetchall()

    # Process results into structured format

    # Helper function to calculate totals from estudiantes + colaboradores
    def calculate_total_metrics(estudiantes_data, colaboradores_data, distinct_personas_count):
        """Calculate total metrics from estudiantes and colaboradores data"""
        total_inscripciones = estudiantes_data['inscripciones'] + colaboradores_data['inscripciones']
        total_participaciones = estudiantes_data['participaciones'] + colaboradores_data['participaciones']
        total_tasa = round((total_participaciones * 100.0 / total_inscripciones) if total_inscripciones > 0 else 0, 2)

        return {
            'inscripciones': total_inscripciones,
            'participaciones': total_participaciones,
            'tasa': total_tasa,
            'personas': distinct_personas_count
        }

    # Process yearly data
    yearly_data = {
        'total': [],
        'estudiantes': [],
        'colaboradores': []
    }

    # Group yearly results by year
    yearly_by_year = {}
    for row in yearly_results:
        year = row.year
        audience = row.audience

        if year not in yearly_by_year:
            yearly_by_year[year] = {
                'estudiantes': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0},
                'colaboradores': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0}
            }

        yearly_by_year[year][audience] = {
            'inscripciones': row.inscripciones,
            'participaciones': row.participaciones,
            'tasa': row.tasa,
            'personas': row.personas
        }

    # Calculate distinct personas per year for totals
    distinct_personas_query = base_query + """
    SELECT year, COUNT(DISTINCT full_name) as total_personas
    FROM audience_data
    GROUP BY year
    ORDER BY year
    """
    distinct_personas_results = db.execute(text(distinct_personas_query)).fetchall()
    distinct_personas_by_year = {row.year: row.total_personas for row in distinct_personas_results}

    # Build yearly data with calculated totals
    for year, data in yearly_by_year.items():
        # Add individual audience data
        yearly_data['estudiantes'].append({
            'year': year,
            **data['estudiantes']
        })
        yearly_data['colaboradores'].append({
            'year': year,
            **data['colaboradores']
        })

        # Calculate and add total data
        total_data = calculate_total_metrics(
            data['estudiantes'],
            data['colaboradores'],
            distinct_personas_by_year.get(year, 0)
        )
        yearly_data['total'].append({
            'year': year,
            **total_data
        })

    # Process people data (calculate from existing yearly data)
    people_data = []
    for year, data in yearly_by_year.items():
        people_data.append({
            'year': year,
            'estudiantes': data['estudiantes']['personas'],
            'colaboradores': data['colaboradores']['personas'],
            'total': distinct_personas_by_year.get(year, 0)
        })

    # Process strategic line data
    strategic_lines = ['Apostolado', 'Sacramentos', 'Crecimiento Espiritual', 'Identidad y Comunidad']
    strategic_data = {}

    for line in strategic_lines:
        strategic_data[line] = {
            'yearly': {
                'total': [],
                'estudiantes': [],
                'colaboradores': []
            },
            'total': {
                'total': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0},
                'estudiantes': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0},
                'colaboradores': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0}
            }
        }

    # Group strategic results by line and year
    strategic_by_line_year = {}
    for row in strategic_results:
        line = row.strategic_line
        year = row.year
        audience = row.audience

        if line not in strategic_by_line_year:
            strategic_by_line_year[line] = {}
        if year not in strategic_by_line_year[line]:
            strategic_by_line_year[line][year] = {
                'estudiantes': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0},
                'colaboradores': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0}
            }

        strategic_by_line_year[line][year][audience] = {
            'inscripciones': row.inscripciones,
            'participaciones': row.participaciones,
            'tasa': row.tasa,
            'personas': row.personas
        }

    # Calculate distinct personas for strategic line totals per year
    strategic_personas_query = base_query + """
    SELECT strategic_line, year, COUNT(DISTINCT full_name) as total_personas
    FROM audience_data
    GROUP BY strategic_line, year
    ORDER BY strategic_line, year
    """
    strategic_personas_results = db.execute(text(strategic_personas_query)).fetchall()
    strategic_personas_by_line_year = {}
    for row in strategic_personas_results:
        if row.strategic_line not in strategic_personas_by_line_year:
            strategic_personas_by_line_year[row.strategic_line] = {}
        strategic_personas_by_line_year[row.strategic_line][row.year] = row.total_personas

    # Build strategic yearly data
    for line in strategic_lines:
        if line in strategic_by_line_year:
            for year, data in strategic_by_line_year[line].items():
                # Add individual audience data
                strategic_data[line]['yearly']['estudiantes'].append({
                    'year': year,
                    **data['estudiantes']
                })
                strategic_data[line]['yearly']['colaboradores'].append({
                    'year': year,
                    **data['colaboradores']
                })

                # Calculate and add total data
                total_data = calculate_total_metrics(
                    data['estudiantes'],
                    data['colaboradores'],
                    strategic_personas_by_line_year.get(line, {}).get(year, 0)
                )
                strategic_data[line]['yearly']['total'].append({
                    'year': year,
                    **total_data
                })

    # Build strategic totals (across all years)
    strategic_totals_by_line = {}
    for row in strategic_totals_results:
        line = row.strategic_line
        audience = row.audience

        if line not in strategic_totals_by_line:
            strategic_totals_by_line[line] = {
                'estudiantes': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0},
                'colaboradores': {'inscripciones': 0, 'participaciones': 0, 'tasa': 0, 'personas': 0}
            }

        strategic_totals_by_line[line][audience] = {
            'inscripciones': row.inscripciones,
            'participaciones': row.participaciones,
            'tasa': row.tasa,
            'personas': row.personas
        }

    # Calculate strategic line total distinct personas
    strategic_total_personas_query = base_query + """
    SELECT strategic_line, COUNT(DISTINCT full_name) as total_personas
    FROM audience_data
    GROUP BY strategic_line
    """
    strategic_total_personas_results = db.execute(text(strategic_total_personas_query)).fetchall()
    strategic_total_personas = {row.strategic_line: row.total_personas for row in strategic_total_personas_results}

    # Finalize strategic totals
    for line in strategic_lines:
        if line in strategic_totals_by_line:
            data = strategic_totals_by_line[line]

            # Set individual audience totals
            strategic_data[line]['total']['estudiantes'] = data['estudiantes']
            strategic_data[line]['total']['colaboradores'] = data['colaboradores']

            # Calculate overall total
            total_data = calculate_total_metrics(
                data['estudiantes'],
                data['colaboradores'],
                strategic_total_personas.get(line, 0)
            )
            strategic_data[line]['total']['total'] = total_data

    result = {
        'yearly': yearly_data,
        'people': people_data,
        'strategic': strategic_data
    }

    # Cache the result for 5 minutes (300 seconds)
    cache_service.set(cache_key, result, ttl_seconds=300)
    logger.info("Indicators data computed and cached")

    return result