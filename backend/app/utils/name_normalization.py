"""
Name normalization and duplicate detection utilities.

This module provides functions for:
1. Normalizing Spanish names (removing diacritics, proper capitalization)
2. Fuzzy matching for duplicate detection
3. Blocking strategies to reduce comparison space
"""

import re
import unicodedata
from typing import Tuple, List, Dict, Optional
from unidecode import unidecode
from rapidfuzz import fuzz
import logging

logger = logging.getLogger(__name__)

# Spanish prepositions and articles that should be lowercase (except at start)
SPANISH_LOWERCASE_WORDS = {
    'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u',
    'da', 'do', 'dos', 'das', 'al', 'a', 'en', 'con', 'por', 'para',
    'sin', 'sobre', 'bajo', 'entre', 'desde', 'hasta', 'hacia'
}

def remove_diacritics(text: str) -> str:
    """
    Remove diacritics from text using NFD normalization and unidecode as fallback.

    Args:
        text: Input text with potential diacritics

    Returns:
        Text with diacritics removed
    """
    if not text:
        return ""

    # First try NFD normalization to separate base characters from combining marks
    try:
        # Normalize to NFD (decomposed form)
        nfd_text = unicodedata.normalize('NFD', text)
        # Filter out combining characters (category 'Mn' = Mark, nonspacing)
        ascii_text = ''.join(char for char in nfd_text
                           if unicodedata.category(char) != 'Mn')
        return ascii_text
    except Exception:
        # Fallback to unidecode for more complex cases
        return unidecode(text)

def spanish_title_case(text: str) -> str:
    """
    Apply Spanish-aware title case.

    Capitalizes the first letter of each word, but keeps certain
    Spanish prepositions and articles lowercase unless they're at
    the beginning of the string.

    Args:
        text: Input text to capitalize

    Returns:
        Text with Spanish-aware title case applied
    """
    if not text:
        return ""

    # Split into words and process each
    words = text.lower().split()
    result = []

    for i, word in enumerate(words):
        # Clean word of punctuation for checking
        clean_word = re.sub(r'[^\w]', '', word)

        # First word is always capitalized
        if i == 0:
            result.append(word.capitalize())
        # Keep certain Spanish words lowercase
        elif clean_word in SPANISH_LOWERCASE_WORDS:
            result.append(word.lower())
        else:
            result.append(word.capitalize())

    return ' '.join(result)

def normalize_full_name(raw_name: str) -> str:
    """
    Normalize a full name for consistent processing.

    Steps:
    1. Trim and collapse multiple spaces
    2. Remove diacritics
    3. Apply Spanish title case

    Args:
        raw_name: Original name as received

    Returns:
        Normalized name ready for comparison
    """
    if not raw_name:
        return ""

    # Step 1: Clean whitespace
    cleaned = re.sub(r'\s+', ' ', raw_name.strip())

    # Step 2: Remove diacritics
    no_diacritics = remove_diacritics(cleaned)

    # Step 3: Apply Spanish title case
    normalized = spanish_title_case(no_diacritics)

    return normalized

def classify_audience(career: str, raw_career: str = None) -> str:
    """
    Classify registrant as 'estudiantes' or 'colaboradores' based on career field.

    Args:
        career: Normalized career field
        raw_career: Original career field before normalization

    Returns:
        'estudiantes' or 'colaboradores'
    """
    career_text = (career or "").lower()
    raw_career_text = (raw_career or "").lower()

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

    # Check for staff keywords
    for keyword in staff_keywords:
        if keyword in full_text:
            return 'colaboradores'

    # Default to estudiantes
    return 'estudiantes'

def create_comparison_context(normalized_name: str, career: str, audience: str) -> str:
    """
    Create a comparison context string for duplicate detection.

    For students: "normalized_full_name | career"
    For collaborators: "normalized_full_name | area"

    Args:
        normalized_name: Normalized full name
        career: Career or area field
        audience: 'estudiantes' or 'colaboradores'

    Returns:
        Context string for comparison
    """
    career_clean = (career or "").strip()
    return f"{normalized_name} | {career_clean}"

def extract_name_initials(normalized_name: str) -> Tuple[str, str]:
    """
    Extract initials from a normalized name for blocking.

    Returns first letter of first name and first letter of main surname.
    Assumes format: "FirstName [MiddleNames] LastName [SecondLastName]"

    Args:
        normalized_name: Normalized full name

    Returns:
        Tuple of (first_name_initial, last_name_initial)
    """
    if not normalized_name:
        return ("", "")

    parts = normalized_name.strip().split()
    if not parts:
        return ("", "")

    # First name initial
    first_initial = parts[0][0].upper() if parts[0] else ""

    # Last name initial (assume it's the last significant word)
    last_initial = ""
    if len(parts) > 1:
        # Find the last word that's not a preposition
        for word in reversed(parts[1:]):
            if word.lower() not in SPANISH_LOWERCASE_WORDS:
                last_initial = word[0].upper() if word else ""
                break

    return (first_initial, last_initial)

def should_compare_names(
    name1: str, name2: str,
    audience1: str, audience2: str,
    year1: Optional[int] = None, year2: Optional[int] = None
) -> bool:
    """
    Determine if two names should be compared based on blocking strategy.

    Blocking criteria:
    - Same audience
    - Same first name and last name initials
    - Optionally same year

    Args:
        name1, name2: Normalized full names
        audience1, audience2: Audience classifications
        year1, year2: Optional years for additional blocking

    Returns:
        True if names should be compared for similarity
    """
    # Must be same audience
    if audience1 != audience2:
        return False

    # Extract initials
    first1, last1 = extract_name_initials(name1)
    first2, last2 = extract_name_initials(name2)

    # Must have same initials
    if first1 != first2 or last1 != last2:
        return False

    # Optionally check year (if both provided)
    if year1 is not None and year2 is not None and year1 != year2:
        return False

    return True

def calculate_similarity(context1: str, context2: str) -> float:
    """
    Calculate similarity score between two comparison contexts.

    Uses rapidfuzz token_set_ratio which handles word order variations well.

    Args:
        context1, context2: Comparison context strings

    Returns:
        Similarity score between 0 and 100
    """
    if not context1 or not context2:
        return 0.0

    try:
        # Use token_set_ratio which is good for names with different word orders
        similarity = fuzz.token_set_ratio(context1, context2)
        return float(similarity)
    except Exception as e:
        logger.error(f"Error calculating similarity: {e}")
        return 0.0

def is_potential_duplicate(
    similarity: float,
    same_career: bool = False,
    confidence_threshold: float = 88.0,
    auto_accept_threshold: float = 96.0
) -> Tuple[bool, str]:
    """
    Determine if a similarity score indicates a potential duplicate.

    Args:
        similarity: Similarity score from 0-100
        same_career: Whether the career/area fields are identical
        confidence_threshold: Minimum score to flag for review
        auto_accept_threshold: Minimum score for auto-acceptance

    Returns:
        Tuple of (is_duplicate_candidate, suggested_action)
        suggested_action: 'auto_accept', 'manual_review', 'ignore'
    """
    if similarity >= auto_accept_threshold and same_career:
        return (True, 'auto_accept')
    elif similarity >= confidence_threshold:
        return (True, 'manual_review')
    else:
        return (False, 'ignore')

def backfill_normalization_fields(registrant_data: Dict) -> Dict:
    """
    Backfill normalization fields for existing registrants.

    Args:
        registrant_data: Dict with at least 'full_name' and 'career' fields

    Returns:
        Dict with added normalization fields
    """
    full_name = registrant_data.get('full_name', '')
    career = registrant_data.get('career', '')
    raw_career = registrant_data.get('raw_career', '')

    # Set raw_full_name if not already set
    raw_full_name = registrant_data.get('raw_full_name') or full_name

    # Normalize the name
    normalized_name = normalize_full_name(raw_full_name)

    # Set canonical_full_name if not already set (initially = normalized)
    canonical_name = registrant_data.get('canonical_full_name') or normalized_name

    # Classify audience
    audience = classify_audience(career, raw_career)

    return {
        **registrant_data,
        'raw_full_name': raw_full_name,
        'normalized_full_name': normalized_name,
        'canonical_full_name': canonical_name,
        'audience': audience
    }