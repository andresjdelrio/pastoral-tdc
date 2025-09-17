"""
Duplicate detection service for registrants.

This service implements the complete duplicate detection workflow:
1. Process registrants to find potential duplicates
2. Add candidates to the review queue
3. Handle review decisions (accept/reject/skip)
"""

from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.models import Registrant, NameReviewQueue
from app.utils.name_normalization import (
    normalize_full_name,
    classify_audience,
    create_comparison_context,
    should_compare_names,
    calculate_similarity,
    is_potential_duplicate,
    backfill_normalization_fields
)
import logging

logger = logging.getLogger(__name__)

class DuplicateDetectionService:
    """Service for detecting and managing potential duplicate registrants."""

    def __init__(self, db: Session):
        self.db = db

    def backfill_existing_registrants(self) -> Dict[str, int]:
        """
        Backfill normalization fields for existing registrants.

        Returns:
            Dict with counts of processed records
        """
        try:
            # Get all registrants without normalization fields
            registrants = self.db.query(Registrant).filter(
                Registrant.normalized_full_name.is_(None)
            ).all()

            updated_count = 0
            error_count = 0

            for registrant in registrants:
                try:
                    # Convert to dict for processing
                    registrant_data = {
                        'full_name': registrant.full_name,
                        'career': registrant.career,
                        'raw_career': getattr(registrant, 'raw_career', None)
                    }

                    # Backfill normalization fields
                    updated_data = backfill_normalization_fields(registrant_data)

                    # Update registrant
                    registrant.raw_full_name = updated_data['raw_full_name']
                    registrant.normalized_full_name = updated_data['normalized_full_name']
                    registrant.canonical_full_name = updated_data['canonical_full_name']
                    registrant.audience = updated_data['audience']

                    updated_count += 1

                except Exception as e:
                    logger.error(f"Error processing registrant {registrant.id}: {e}")
                    error_count += 1

            self.db.commit()

            return {
                'updated': updated_count,
                'errors': error_count,
                'total_processed': len(registrants)
            }

        except Exception as e:
            logger.error(f"Error in backfill process: {e}")
            self.db.rollback()
            raise

    def find_potential_duplicates(
        self,
        audience: Optional[str] = None,
        year: Optional[int] = None,
        limit: Optional[int] = 1000
    ) -> Dict[str, int]:
        """
        Find potential duplicates among registrants and add to review queue.

        Args:
            audience: Limit to specific audience ('estudiantes' or 'colaboradores')
            year: Limit to specific year
            limit: Maximum number of comparisons to process

        Returns:
            Dict with processing statistics
        """
        try:
            # Build query for registrants to compare
            query = self.db.query(Registrant).filter(
                Registrant.normalized_full_name.isnot(None),
                Registrant.row_valid == True
            )

            if audience:
                query = query.filter(Registrant.audience == audience)

            registrants = query.all()

            if len(registrants) < 2:
                return {
                    'processed_pairs': 0,
                    'candidates_found': 0,
                    'queue_added': 0,
                    'total_registrants': len(registrants)
                }

            # Get existing review queue to avoid duplicates
            existing_pairs = set()
            existing_reviews = self.db.query(NameReviewQueue).all()
            for review in existing_reviews:
                pair = tuple(sorted([review.left_id, review.right_id]))
                existing_pairs.add(pair)

            processed_pairs = 0
            candidates_found = 0
            queue_added = 0

            # Compare all pairs using blocking strategy
            for i in range(len(registrants)):
                if limit and processed_pairs >= limit:
                    break

                for j in range(i + 1, len(registrants)):
                    if limit and processed_pairs >= limit:
                        break

                    left = registrants[i]
                    right = registrants[j]

                    # Skip if already in review queue
                    pair = tuple(sorted([left.id, right.id]))
                    if pair in existing_pairs:
                        continue

                    processed_pairs += 1

                    # Apply blocking strategy
                    if not should_compare_names(
                        left.normalized_full_name,
                        right.normalized_full_name,
                        left.audience,
                        right.audience,
                        year,
                        year
                    ):
                        continue

                    # Create comparison contexts
                    left_context = create_comparison_context(
                        left.normalized_full_name,
                        left.career or "",
                        left.audience
                    )
                    right_context = create_comparison_context(
                        right.normalized_full_name,
                        right.career or "",
                        right.audience
                    )

                    # Calculate similarity
                    similarity = calculate_similarity(left_context, right_context)

                    # Check if career fields are identical
                    same_career = (left.career or "").strip().lower() == (right.career or "").strip().lower()

                    # Determine if it's a potential duplicate
                    is_duplicate, action = is_potential_duplicate(
                        similarity,
                        same_career,
                        confidence_threshold=88.0,
                        auto_accept_threshold=96.0
                    )

                    if is_duplicate:
                        candidates_found += 1

                        # Add to review queue
                        review_item = NameReviewQueue(
                            left_id=left.id,
                            right_id=right.id,
                            audience=left.audience,
                            left_context=left_context,
                            right_context=right_context,
                            similarity=similarity,
                            status='pending'
                        )

                        self.db.add(review_item)
                        queue_added += 1

                        # Mark pair as processed
                        existing_pairs.add(pair)

            self.db.commit()

            return {
                'processed_pairs': processed_pairs,
                'candidates_found': candidates_found,
                'queue_added': queue_added,
                'total_registrants': len(registrants)
            }

        except Exception as e:
            logger.error(f"Error in duplicate detection: {e}")
            self.db.rollback()
            raise

    def get_review_queue(
        self,
        status: str = 'pending',
        audience: Optional[str] = None,
        offset: int = 0,
        limit: int = 50
    ) -> Tuple[List[Dict], int]:
        """
        Get items from the review queue for human review.

        Args:
            status: Filter by status ('pending', 'accepted', 'rejected', 'skipped')
            audience: Filter by audience
            offset: Pagination offset
            limit: Number of items to return

        Returns:
            Tuple of (review_items, total_count)
        """
        try:
            # Build query
            query = self.db.query(NameReviewQueue)

            if status != 'all':
                query = query.filter(NameReviewQueue.status == status)

            if audience:
                query = query.filter(NameReviewQueue.audience == audience)

            # Get total count
            total_count = query.count()

            # Get paginated results
            reviews = query.order_by(
                NameReviewQueue.similarity.desc(),
                NameReviewQueue.created_at.asc()
            ).offset(offset).limit(limit).all()

            # Format results with registrant details
            review_items = []
            for review in reviews:
                # Get registrant details
                left_registrant = self.db.query(Registrant).filter(
                    Registrant.id == review.left_id
                ).first()
                right_registrant = self.db.query(Registrant).filter(
                    Registrant.id == review.right_id
                ).first()

                if not left_registrant or not right_registrant:
                    continue

                review_items.append({
                    'id': review.id,
                    'similarity': review.similarity,
                    'status': review.status,
                    'audience': review.audience,
                    'created_at': review.created_at.isoformat() if review.created_at else None,
                    'decided_at': review.decided_at.isoformat() if review.decided_at else None,
                    'decided_by': review.decided_by,
                    'left_context': review.left_context,
                    'right_context': review.right_context,
                    'left_registrant': {
                        'id': left_registrant.id,
                        'full_name': left_registrant.full_name,
                        'raw_full_name': left_registrant.raw_full_name,
                        'normalized_full_name': left_registrant.normalized_full_name,
                        'canonical_full_name': left_registrant.canonical_full_name,
                        'rut': left_registrant.rut,
                        'university_email': left_registrant.university_email,
                        'career': left_registrant.career,
                        'phone': left_registrant.phone,
                        'audience': left_registrant.audience
                    },
                    'right_registrant': {
                        'id': right_registrant.id,
                        'full_name': right_registrant.full_name,
                        'raw_full_name': right_registrant.raw_full_name,
                        'normalized_full_name': right_registrant.normalized_full_name,
                        'canonical_full_name': right_registrant.canonical_full_name,
                        'rut': right_registrant.rut,
                        'university_email': right_registrant.university_email,
                        'career': right_registrant.career,
                        'phone': right_registrant.phone,
                        'audience': right_registrant.audience
                    }
                })

            return review_items, total_count

        except Exception as e:
            logger.error(f"Error getting review queue: {e}")
            raise

    def process_review_decision(
        self,
        review_id: int,
        decision: str,
        decided_by: str,
        canonical_name: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Process a human review decision.

        Args:
            review_id: ID of the review item
            decision: 'accept', 'reject', or 'skip'
            decided_by: User who made the decision
            canonical_name: If accepted, the canonical name to use for both registrants

        Returns:
            Dict with processing results
        """
        try:
            # Get review item
            review = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.id == review_id
            ).first()

            if not review:
                raise ValueError(f"Review item {review_id} not found")

            if review.status != 'pending':
                raise ValueError(f"Review item {review_id} already processed (status: {review.status})")

            # Update review status
            review.status = decision
            review.decided_at = func.now()
            review.decided_by = decided_by

            result = {
                'review_id': review_id,
                'decision': decision,
                'decided_by': decided_by,
                'updated_registrants': []
            }

            # If accepted, update canonical names
            if decision == 'accept' and canonical_name:
                # Get both registrants
                left_registrant = self.db.query(Registrant).filter(
                    Registrant.id == review.left_id
                ).first()
                right_registrant = self.db.query(Registrant).filter(
                    Registrant.id == review.right_id
                ).first()

                if left_registrant and right_registrant:
                    # Update canonical names
                    left_registrant.canonical_full_name = canonical_name
                    right_registrant.canonical_full_name = canonical_name

                    result['updated_registrants'] = [
                        {
                            'id': left_registrant.id,
                            'old_canonical_name': left_registrant.canonical_full_name,
                            'new_canonical_name': canonical_name
                        },
                        {
                            'id': right_registrant.id,
                            'old_canonical_name': right_registrant.canonical_full_name,
                            'new_canonical_name': canonical_name
                        }
                    ]

            self.db.commit()
            return result

        except Exception as e:
            logger.error(f"Error processing review decision: {e}")
            self.db.rollback()
            raise

    def get_duplicate_stats(self) -> Dict[str, any]:
        """
        Get statistics about duplicate detection and review queue.

        Returns:
            Dict with various statistics
        """
        try:
            # Total registrants
            total_registrants = self.db.query(Registrant).count()

            # Registrants with normalization
            normalized_registrants = self.db.query(Registrant).filter(
                Registrant.normalized_full_name.isnot(None)
            ).count()

            # Review queue stats
            total_queue = self.db.query(NameReviewQueue).count()
            pending_reviews = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.status == 'pending'
            ).count()
            accepted_reviews = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.status == 'accepted'
            ).count()
            rejected_reviews = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.status == 'rejected'
            ).count()
            skipped_reviews = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.status == 'skipped'
            ).count()

            # Audience breakdown
            estudiantes_queue = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.audience == 'estudiantes'
            ).count()
            colaboradores_queue = self.db.query(NameReviewQueue).filter(
                NameReviewQueue.audience == 'colaboradores'
            ).count()

            return {
                'registrants': {
                    'total': total_registrants,
                    'normalized': normalized_registrants,
                    'normalization_percentage': round((normalized_registrants / total_registrants * 100), 2) if total_registrants > 0 else 0
                },
                'review_queue': {
                    'total': total_queue,
                    'pending': pending_reviews,
                    'accepted': accepted_reviews,
                    'rejected': rejected_reviews,
                    'skipped': skipped_reviews,
                    'completion_percentage': round(((total_queue - pending_reviews) / total_queue * 100), 2) if total_queue > 0 else 0
                },
                'by_audience': {
                    'estudiantes': estudiantes_queue,
                    'colaboradores': colaboradores_queue
                }
            }

        except Exception as e:
            logger.error(f"Error getting duplicate stats: {e}")
            raise