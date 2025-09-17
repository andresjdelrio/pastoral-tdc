from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from app.database import get_db
from app.models import Activity, MetadataValue, CatalogStrategicLine, CatalogActivity, CatalogCareer

router = APIRouter()

@router.get("/suggestions")
async def get_metadata_suggestions(db: Session = Depends(get_db)):
    """
    Get autocomplete suggestions for strategic lines, activities, and careers from controlled vocabularies
    """

    # Get strategic lines from catalog (active only)
    catalog_strategic_lines = db.query(CatalogStrategicLine.name).filter(
        CatalogStrategicLine.active == True
    ).order_by(CatalogStrategicLine.name).all()

    strategic_lines = [line.name for line in catalog_strategic_lines]

    # Fallback to default strategic lines if catalog is empty
    if not strategic_lines:
        strategic_lines = [
            "Apostolado",
            "Sacramentos",
            "Crecimiento Espiritual",
            "Identidad y Comunidad"
        ]

    # Get activities from catalog (active only)
    catalog_activities = db.query(CatalogActivity.name).filter(
        CatalogActivity.active == True
    ).order_by(CatalogActivity.name).all()

    activities = [activity.name for activity in catalog_activities]

    # Get careers from catalog (active only)
    catalog_careers = db.query(CatalogCareer.name).filter(
        CatalogCareer.active == True
    ).order_by(CatalogCareer.name).all()

    careers = [career.name for career in catalog_careers]

    return {
        "strategic_lines": strategic_lines,
        "activities": activities,
        "careers": careers
    }