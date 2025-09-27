"""
Duplicate detection service for registrants.

This service implements the complete duplicate detection workflow:
1. Process registrants to find potential duplicates using both text similarity and embeddings
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
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Optional embedding support - graceful degradation if not available
try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    SentenceTransformer = None

logger = logging.getLogger(__name__)

class DuplicateDetectionService:
    """Service for detecting and managing potential duplicate registrants."""

    def __init__(self, db: Session):
        self.db = db
        self.embedding_model = None
        self.use_embeddings = False

        # Initialize embedding model if available
        if EMBEDDINGS_AVAILABLE:
            try:
                # Use a multilingual model that works well with Spanish names
                self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                self.use_embeddings = True
                self.embedding_similarity_threshold = 0.75  # Threshold for flagging via embeddings
                self.embedding_min_similarity = 0.60  # Minimum similarity to consider
                logger.info("Embedding-based duplicate detection initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize embedding model, falling back to text similarity: {e}")
                self.use_embeddings = False

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

    def create_registrant_context(self, registrant: Registrant) -> str:
        """
        Create a context string for embedding similarity comparison.

        Args:
            registrant: The registrant object

        Returns:
            A formatted string containing the registrant's information
        """
        # Use normalized name if available, otherwise fall back to full name
        name = getattr(registrant, 'normalized_full_name', None) or registrant.full_name or ""

        # Include career information if available
        career_info = ""
        if registrant.career:
            career_info = f" | {registrant.career}"
        elif getattr(registrant, 'raw_career', None):
            career_info = f" | {registrant.raw_career}"

        context = f"{name}{career_info}".strip()
        return context

    def calculate_embedding_similarity(self, context1: str, context2: str) -> float:
        """
        Calculate semantic similarity using embeddings.

        Args:
            context1: First context string
            context2: Second context string

        Returns:
            Similarity score between 0 and 1
        """
        if not self.use_embeddings or not context1.strip() or not context2.strip():
            return 0.0

        try:
            # Encode both contexts
            embeddings = self.embedding_model.encode([context1, context2])

            # Calculate cosine similarity
            similarity_matrix = cosine_similarity([embeddings[0]], [embeddings[1]])
            similarity_score = similarity_matrix[0][0]

            return float(similarity_score)

        except Exception as e:
            logger.error(f"Error calculating embedding similarity: {e}")
            return 0.0

    def hybrid_similarity_check(self, left_registrant: Registrant, right_registrant: Registrant) -> Dict[str, any]:
        """
        Perform hybrid similarity check using both traditional text similarity and embeddings.

        Args:
            left_registrant: First registrant
            right_registrant: Second registrant

        Returns:
            Dict with similarity scores and decision
        """
        # Create comparison contexts for traditional method
        left_context = create_comparison_context(
            left_registrant.normalized_full_name or left_registrant.full_name,
            left_registrant.career or "",
            left_registrant.audience
        )
        right_context = create_comparison_context(
            right_registrant.normalized_full_name or right_registrant.full_name,
            right_registrant.career or "",
            right_registrant.audience
        )

        # Calculate traditional similarity
        text_similarity = calculate_similarity(left_context, right_context)

        # Calculate embedding similarity if available
        embedding_similarity = 0.0
        if self.use_embeddings:
            embedding_left_context = self.create_registrant_context(left_registrant)
            embedding_right_context = self.create_registrant_context(right_registrant)
            embedding_similarity = self.calculate_embedding_similarity(
                embedding_left_context, embedding_right_context
            )

        # Check if careers are the same
        same_career = (left_registrant.career or "").strip().lower() == (right_registrant.career or "").strip().lower()

        # Determine if it's a potential duplicate using hybrid approach
        is_duplicate_text, text_action = is_potential_duplicate(
            text_similarity,
            same_career,
            confidence_threshold=88.0,
            auto_accept_threshold=96.0
        )

        # Check embedding-based duplicate detection
        is_duplicate_embedding = False
        if self.use_embeddings and embedding_similarity >= self.embedding_min_similarity:
            is_duplicate_embedding = True

        # Combine decisions: if either method finds a duplicate, flag for review
        is_duplicate_combined = is_duplicate_text or is_duplicate_embedding

        # Use the higher similarity score for ranking
        final_similarity = max(text_similarity, embedding_similarity * 100)  # Convert embedding to 0-100 scale

        return {
            'is_duplicate': is_duplicate_combined,
            'text_similarity': text_similarity,
            'embedding_similarity': embedding_similarity,
            'final_similarity': final_similarity,
            'same_career': same_career,
            'method_used': 'hybrid' if self.use_embeddings else 'text_only',
            'triggered_by': 'text' if is_duplicate_text and not is_duplicate_embedding else
                          'embedding' if is_duplicate_embedding and not is_duplicate_text else
                          'both' if is_duplicate_text and is_duplicate_embedding else 'none'
        }

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
                        left.normalized_full_name or left.full_name,
                        right.normalized_full_name or right.full_name,
                        left.audience,
                        right.audience,
                        year,
                        year
                    ):
                        continue

                    # Use hybrid similarity check
                    similarity_result = self.hybrid_similarity_check(left, right)

                    if similarity_result['is_duplicate']:
                        candidates_found += 1

                        # Create contexts for display
                        left_context = self.create_registrant_context(left)
                        right_context = self.create_registrant_context(right)

                        # Add to review queue with hybrid similarity info
                        review_item = NameReviewQueue(
                            left_id=left.id,
                            right_id=right.id,
                            audience=left.audience,
                            left_context=left_context[:400],  # Truncate to fit DB field
                            right_context=right_context[:400],  # Truncate to fit DB field
                            similarity=similarity_result['final_similarity'],
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

    def process_upload_for_duplicates(
        self,
        new_registrants: List[Registrant],
        activity_id: int,
        audience: str
    ) -> Dict[str, int]:
        """
        Process a new upload to detect duplicates within the upload and against existing registrants.

        Args:
            new_registrants: List of newly uploaded registrants
            activity_id: ID of the activity
            audience: Audience type (estudiantes, colaboradores)

        Returns:
            Dict with duplicate detection statistics
        """
        if not new_registrants:
            return {
                'within_upload': 0,
                'against_existing': 0,
                'total_added_to_queue': 0,
                'method_used': 'none'
            }

        try:
            within_upload_count = 0
            against_existing_count = 0
            total_added = 0

            # 1. Check for duplicates within the upload itself
            for i in range(len(new_registrants)):
                for j in range(i + 1, len(new_registrants)):
                    left = new_registrants[i]
                    right = new_registrants[j]

                    # Skip if different audiences
                    if left.audience != right.audience:
                        continue

                    # Use hybrid similarity check
                    similarity_result = self.hybrid_similarity_check(left, right)

                    if similarity_result['is_duplicate']:
                        within_upload_count += 1

                        # Create contexts for display
                        left_context = self.create_registrant_context(left)
                        right_context = self.create_registrant_context(right)

                        # Add to review queue
                        review_item = NameReviewQueue(
                            left_id=left.id,
                            right_id=right.id,
                            audience=audience,
                            left_context=left_context[:400],
                            right_context=right_context[:400],
                            similarity=similarity_result['final_similarity'],
                            status='pending'
                        )
                        self.db.add(review_item)
                        total_added += 1

            # 2. Check against existing registrants in the same activity
            existing_registrants = self.db.query(Registrant).join(
                Registrant.registrations
            ).filter(
                Registrant.registrations.any(activity_id=activity_id),
                Registrant.audience == audience,
                ~Registrant.id.in_([r.id for r in new_registrants])
            ).all()

            for new_reg in new_registrants:
                for existing_reg in existing_registrants:
                    # Use hybrid similarity check
                    similarity_result = self.hybrid_similarity_check(new_reg, existing_reg)

                    if similarity_result['is_duplicate']:
                        against_existing_count += 1

                        # Create contexts for display
                        left_context = self.create_registrant_context(new_reg)
                        right_context = self.create_registrant_context(existing_reg)

                        # Check if this pair is already in queue
                        existing_review = self.db.query(NameReviewQueue).filter(
                            ((NameReviewQueue.left_id == new_reg.id) & (NameReviewQueue.right_id == existing_reg.id)) |
                            ((NameReviewQueue.left_id == existing_reg.id) & (NameReviewQueue.right_id == new_reg.id))
                        ).first()

                        if not existing_review:
                            # Add to review queue
                            review_item = NameReviewQueue(
                                left_id=new_reg.id,
                                right_id=existing_reg.id,
                                audience=audience,
                                left_context=left_context[:400],
                                right_context=right_context[:400],
                                similarity=similarity_result['final_similarity'],
                                status='pending'
                            )
                            self.db.add(review_item)
                            total_added += 1

            self.db.commit()

            logger.info(f"Upload duplicate detection: {within_upload_count} within upload, "
                       f"{against_existing_count} against existing, {total_added} added to queue")

            return {
                'within_upload': within_upload_count,
                'against_existing': against_existing_count,
                'total_added_to_queue': total_added,
                'method_used': 'hybrid' if self.use_embeddings else 'text_only'
            }

        except Exception as e:
            logger.error(f"Error in upload duplicate detection: {e}")
            self.db.rollback()
            return {
                'within_upload': 0,
                'against_existing': 0,
                'total_added_to_queue': 0,
                'error': str(e),
                'method_used': 'error'
            }

    def find_rut_based_duplicates(self) -> Dict[str, int]:
        """
        Find duplicate registrants based on same RUT but different names across all activities.

        This method specifically looks for people who registered with slight name variations
        across different activities, which would cause double-counting in indicators.

        Returns:
            Dict with processing statistics
        """
        try:
            # Query to find registrants with same RUT but different names
            rut_duplicates_query = """
                SELECT
                    r1.id as left_id,
                    r2.id as right_id,
                    r1.rut,
                    r1.full_name as left_name,
                    r2.full_name as right_name,
                    r1.audience
                FROM registrants r1
                JOIN registrants r2 ON r1.rut = r2.rut
                WHERE r1.id < r2.id
                    AND r1.rut IS NOT NULL
                    AND r1.rut != ''
                    AND r1.full_name != r2.full_name
                    AND r1.row_valid = 1
                    AND r2.row_valid = 1
                ORDER BY r1.rut, r1.id
            """

            from sqlalchemy import text
            results = self.db.execute(text(rut_duplicates_query)).fetchall()

            if not results:
                return {
                    'processed_pairs': 0,
                    'candidates_found': 0,
                    'queue_added': 0,
                    'total_rut_duplicates': 0
                }

            # Get existing review queue to avoid duplicates
            existing_pairs = set()
            existing_reviews = self.db.query(NameReviewQueue).all()
            for review in existing_reviews:
                pair = tuple(sorted([review.left_id, review.right_id]))
                existing_pairs.add(pair)

            processed_pairs = 0
            queue_added = 0

            for result in results:
                processed_pairs += 1

                # Skip if already in review queue
                pair = tuple(sorted([result.left_id, result.right_id]))
                if pair in existing_pairs:
                    continue

                # Get the full registrant objects
                left_registrant = self.db.query(Registrant).filter(Registrant.id == result.left_id).first()
                right_registrant = self.db.query(Registrant).filter(Registrant.id == result.right_id).first()

                if not left_registrant or not right_registrant:
                    continue

                # Create contexts for display
                left_context = f"{result.left_name} | RUT: {result.rut}"
                right_context = f"{result.right_name} | RUT: {result.rut}"

                # Add to review queue with high similarity (same RUT = very likely same person)
                review_item = NameReviewQueue(
                    left_id=result.left_id,
                    right_id=result.right_id,
                    audience=result.audience,
                    left_context=left_context[:400],
                    right_context=right_context[:400],
                    similarity=95.0,  # High similarity for same RUT
                    status='pending'
                )
                self.db.add(review_item)
                queue_added += 1

            self.db.commit()

            logger.info(f"RUT-based duplicate detection: {processed_pairs} RUT pairs processed, {queue_added} added to queue")

            return {
                'processed_pairs': processed_pairs,
                'candidates_found': len(results),
                'queue_added': queue_added,
                'total_rut_duplicates': len(results)
            }

        except Exception as e:
            logger.error(f"Error in RUT-based duplicate detection: {e}")
            self.db.rollback()
            return {
                'processed_pairs': 0,
                'candidates_found': 0,
                'queue_added': 0,
                'error': str(e)
            }