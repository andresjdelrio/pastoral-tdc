"""
Script to populate catalog with existing data from database
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database import SessionLocal
from app.models import Activity, Registrant, CatalogActivity, CatalogCareer, CatalogStrategicLine
from sqlalchemy import func

def populate_catalog():
    db = SessionLocal()

    try:
        print("=== Poblando Catálogo ===\n")

        # 1. Get strategic line IDs for mapping
        strategic_lines = db.query(CatalogStrategicLine).all()
        sl_map = {sl.name: sl.id for sl in strategic_lines}
        print(f"Líneas estratégicas disponibles: {list(sl_map.keys())}\n")

        # 2. Populate Activities from existing activities
        print("--- Poblando Actividades ---")
        existing_activities = db.query(
            Activity.activity,
            Activity.strategic_line,
            Activity.audience
        ).distinct().all()

        activities_created = 0
        for act in existing_activities:
            # Skip test activities
            if 'test' in act.activity.lower() or 'test' in act.strategic_line.lower():
                continue

            strategic_line_id = sl_map.get(act.strategic_line)
            if not strategic_line_id:
                print(f"⚠️  Línea estratégica no encontrada: {act.strategic_line}")
                continue

            # Check if already exists
            existing = db.query(CatalogActivity).filter(
                CatalogActivity.name == act.activity,
                CatalogActivity.strategic_line_id == strategic_line_id
            ).first()

            if not existing:
                new_activity = CatalogActivity(
                    name=act.activity,
                    strategic_line_id=strategic_line_id,
                    active=True
                )
                db.add(new_activity)
                activities_created += 1
                print(f"✓ Creada: {act.activity} ({act.strategic_line})")

        db.commit()
        print(f"\n{activities_created} actividades agregadas al catálogo\n")

        # 3. Populate Careers/Areas from existing registrants
        print("--- Poblando Carreras y Áreas ---")
        existing_careers = db.query(
            Registrant.career,
            Registrant.audience,
            func.count(Registrant.id).label('count')
        ).filter(
            Registrant.career.isnot(None)
        ).group_by(
            Registrant.career,
            Registrant.audience
        ).all()

        careers_created = 0
        for career in existing_careers:
            # Skip test careers
            if 'test' in career.career.lower():
                continue

            # Skip empty or very short names
            if len(career.career.strip()) < 3:
                continue

            # Check if already exists
            existing = db.query(CatalogCareer).filter(
                CatalogCareer.name == career.career,
                CatalogCareer.audience == career.audience
            ).first()

            if not existing:
                new_career = CatalogCareer(
                    name=career.career,
                    audience=career.audience,
                    active=True
                )
                db.add(new_career)
                careers_created += 1
                label = "Carrera" if career.audience == "estudiantes" else "Área"
                print(f"✓ {label}: {career.career} ({career.count} personas)")

        db.commit()
        print(f"\n{careers_created} carreras/áreas agregadas al catálogo\n")

        # 4. Summary
        print("=== Resumen ===")
        total_activities = db.query(CatalogActivity).count()
        total_careers = db.query(CatalogCareer).count()
        print(f"Total actividades en catálogo: {total_activities}")
        print(f"Total carreras/áreas en catálogo: {total_careers}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_catalog()
