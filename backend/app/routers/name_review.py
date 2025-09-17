"""
Name review API endpoints for duplicate detection and management.

Provides endpoints for:
- Processing duplicate detection
- Managing review queue
- Making review decisions
- Getting statistics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.services.duplicate_detection import DuplicateDetectionService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Request/Response Models
class DuplicateDetectionRequest(BaseModel):
    audience: Optional[str] = None
    year: Optional[int] = None
    limit: Optional[int] = 1000

class ReviewDecisionRequest(BaseModel):
    decision: str  # 'accept', 'reject', 'skip'
    decided_by: str
    canonical_name: Optional[str] = None

class ReviewItemResponse(BaseModel):
    id: int
    similarity: float
    status: str
    audience: str
    created_at: Optional[str]
    decided_at: Optional[str]
    decided_by: Optional[str]
    left_context: str
    right_context: str
    left_registrant: Dict[str, Any]
    right_registrant: Dict[str, Any]

class ReviewQueueResponse(BaseModel):
    items: List[ReviewItemResponse]
    total_count: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

@router.post("/names/backfill")
async def backfill_normalization_fields(db: Session = Depends(get_db)):
    """
    Backfill normalization fields for existing registrants.
    """
    try:
        service = DuplicateDetectionService(db)
        result = service.backfill_existing_registrants()

        return {
            "success": True,
            "message": f"Backfilled {result['updated']} registrants",
            "details": result
        }
    except Exception as e:
        logger.error(f"Error in backfill endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/names/detect-duplicates")
async def detect_duplicates(
    request: DuplicateDetectionRequest,
    db: Session = Depends(get_db)
):
    """
    Run duplicate detection process and populate review queue.
    """
    try:
        service = DuplicateDetectionService(db)
        result = service.find_potential_duplicates(
            audience=request.audience,
            year=request.year,
            limit=request.limit
        )

        return {
            "success": True,
            "message": f"Found {result['candidates_found']} potential duplicates",
            "details": result
        }
    except Exception as e:
        logger.error(f"Error in duplicate detection endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/names/review", response_model=ReviewQueueResponse)
async def get_review_queue(
    status: str = Query(default="pending", description="Filter by status: pending, accepted, rejected, skipped, all"),
    audience: Optional[str] = Query(default=None, description="Filter by audience: estudiantes, colaboradores"),
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get items from the review queue for human review.
    """
    try:
        # Validate status
        valid_statuses = ['pending', 'accepted', 'rejected', 'skipped', 'all']
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        # Validate audience
        if audience and audience not in ['estudiantes', 'colaboradores']:
            raise HTTPException(
                status_code=400,
                detail="Invalid audience. Must be 'estudiantes' or 'colaboradores'"
            )

        service = DuplicateDetectionService(db)
        offset = (page - 1) * limit

        items, total_count = service.get_review_queue(
            status=status,
            audience=audience,
            offset=offset,
            limit=limit
        )

        return ReviewQueueResponse(
            items=items,
            total_count=total_count,
            page=page,
            limit=limit,
            has_next=offset + limit < total_count,
            has_prev=page > 1
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in review queue endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/names/review/{review_id}/decision")
async def make_review_decision(
    review_id: int,
    request: ReviewDecisionRequest,
    db: Session = Depends(get_db)
):
    """
    Make a decision on a review item (accept/reject/skip).
    """
    try:
        # Validate decision
        valid_decisions = ['accept', 'reject', 'skip']
        if request.decision not in valid_decisions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid decision. Must be one of: {', '.join(valid_decisions)}"
            )

        # Validate canonical name if accepting
        if request.decision == 'accept':
            if not request.canonical_name or not request.canonical_name.strip():
                raise HTTPException(
                    status_code=400,
                    detail="canonical_name is required when accepting a duplicate"
                )

        service = DuplicateDetectionService(db)
        result = service.process_review_decision(
            review_id=review_id,
            decision=request.decision,
            decided_by=request.decided_by,
            canonical_name=request.canonical_name
        )

        return {
            "success": True,
            "message": f"Review decision '{request.decision}' processed successfully",
            "details": result
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in review decision endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/names/stats")
async def get_duplicate_stats(db: Session = Depends(get_db)):
    """
    Get statistics about duplicate detection and review queue.
    """
    try:
        service = DuplicateDetectionService(db)
        stats = service.get_duplicate_stats()

        return {
            "success": True,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"Error in stats endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/names/review/{review_id}")
async def get_review_item(
    review_id: int,
    db: Session = Depends(get_db)
):
    """
    Get details of a specific review item.
    """
    try:
        service = DuplicateDetectionService(db)
        items, _ = service.get_review_queue(status="all")

        # Find the specific item
        item = next((item for item in items if item['id'] == review_id), None)

        if not item:
            raise HTTPException(status_code=404, detail="Review item not found")

        return {
            "success": True,
            "item": item
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting review item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/names/review/{review_id}")
async def delete_review_item(
    review_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a review item from the queue (admin operation).
    """
    try:
        from app.models import NameReviewQueue

        review = db.query(NameReviewQueue).filter(
            NameReviewQueue.id == review_id
        ).first()

        if not review:
            raise HTTPException(status_code=404, detail="Review item not found")

        db.delete(review)
        db.commit()

        return {
            "success": True,
            "message": f"Review item {review_id} deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting review item: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/names/clear-queue")
async def clear_review_queue(
    status: Optional[str] = Query(default=None, description="Clear only items with this status"),
    audience: Optional[str] = Query(default=None, description="Clear only items for this audience"),
    db: Session = Depends(get_db)
):
    """
    Clear items from the review queue (admin operation).
    """
    try:
        from app.models import NameReviewQueue

        query = db.query(NameReviewQueue)

        if status:
            if status not in ['pending', 'accepted', 'rejected', 'skipped']:
                raise HTTPException(status_code=400, detail="Invalid status")
            query = query.filter(NameReviewQueue.status == status)

        if audience:
            if audience not in ['estudiantes', 'colaboradores']:
                raise HTTPException(status_code=400, detail="Invalid audience")
            query = query.filter(NameReviewQueue.audience == audience)

        count = query.count()
        query.delete()
        db.commit()

        return {
            "success": True,
            "message": f"Cleared {count} items from review queue"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing review queue: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))