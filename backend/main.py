import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("[STARTUP DEBUG] Backend is starting up with timestamp 2025-09-17T16:07:25 - FRESH RESTART")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from app.database import engine
from app.models import Base
from app.routers import registrations, admin, ingest, meta, indicators, activities, catalog, data_quality, files, database, name_review

app = FastAPI(
    title="Event Registration Management Platform",
    description="Platform for managing registrations and participation in in-person events",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5176", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(registrations.router, prefix="/api/registrations", tags=["registrations"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(meta.router, prefix="/api/meta", tags=["metadata"])
app.include_router(indicators.router, prefix="/api", tags=["indicators"])
app.include_router(activities.router, prefix="/api", tags=["activities"])
app.include_router(catalog.router, prefix="/api", tags=["catalog"])
app.include_router(data_quality.router, prefix="/api", tags=["data-quality"])
app.include_router(files.router, prefix="/api", tags=["files"])
app.include_router(database.router, prefix="/api", tags=["database"])
app.include_router(name_review.router, prefix="/api", tags=["name-review"])

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "Event Registration Management Platform API"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint with basic system information.
    """
    import time
    from datetime import datetime

    return {
        "status": "healthy",
        "message": "Event Registration Management Platform API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "uptime": f"{time.time():.2f} seconds"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)