import re
import unicodedata
from typing import Tuple, Optional, Dict, Any, List

class ValidationResult:
    def __init__(self, value: Any, is_valid: bool = True, error: Optional[str] = None, original_value: Any = None):
        self.value = value
        self.is_valid = is_valid
        self.error = error
        self.original_value = original_value if original_value is not None else value

def normalize_full_name(name: str) -> ValidationResult:
    """
    Normalize full name to title case
    """
    if not name or not name.strip():
        return ValidationResult(None, False, "Full name is required")

    try:
        # Clean and normalize
        cleaned = name.strip()

        # Remove extra spaces
        cleaned = re.sub(r'\s+', ' ', cleaned)

        # Convert to title case, handling special cases
        normalized = cleaned.title()

        # Fix common title case issues
        # Handle particles like "de", "del", "la", "los", "von", etc.
        particles = ['De', 'Del', 'La', 'Las', 'Los', 'Le', 'Du', 'Von', 'Van', 'Da', 'Das', 'Do', 'Dos']
        for particle in particles:
            normalized = re.sub(rf'\b{particle}\b', particle.lower(), normalized)

        # Handle roman numerals and abbreviations
        normalized = re.sub(r'\bIi\b', 'II', normalized)
        normalized = re.sub(r'\bIii\b', 'III', normalized)
        normalized = re.sub(r'\bIv\b', 'IV', normalized)

        return ValidationResult(normalized, True, None, name)

    except Exception as e:
        return ValidationResult(name, False, f"Error normalizing name: {str(e)}", name)

def validate_rut(rut: str) -> ValidationResult:
    """
    Validate and normalize Chilean RUT with mod-11 algorithm
    Format: ########-X
    """
    if not rut or not rut.strip():
        return ValidationResult(None, True, None)  # RUT is optional

    try:
        # Clean RUT: remove spaces, dots, and normalize
        cleaned = re.sub(r'[.\s-]', '', rut.strip().upper())

        if not cleaned:
            return ValidationResult(None, True, None)

        # Extract number and verification digit
        if len(cleaned) < 2:
            return ValidationResult(rut, False, "RUT too short", rut)

        number_part = cleaned[:-1]
        check_digit = cleaned[-1]

        # Validate number part (must be digits)
        if not number_part.isdigit():
            return ValidationResult(rut, False, "RUT number part must contain only digits", rut)

        # Convert to integer for calculation
        rut_number = int(number_part)

        # Calculate check digit using mod-11 algorithm
        multiplier = 2
        total = 0

        for digit in reversed(number_part):
            total += int(digit) * multiplier
            multiplier += 1
            if multiplier > 7:
                multiplier = 2

        remainder = total % 11
        calculated_check = 11 - remainder

        if calculated_check == 11:
            calculated_check_digit = '0'
        elif calculated_check == 10:
            calculated_check_digit = 'K'
        else:
            calculated_check_digit = str(calculated_check)

        # Validate check digit
        if check_digit != calculated_check_digit:
            return ValidationResult(
                rut,
                False,
                f"Invalid RUT check digit. Expected {calculated_check_digit}, got {check_digit}",
                rut
            )

        # Format normalized RUT
        if len(number_part) >= 7:
            formatted_rut = f"{number_part[:-6]}.{number_part[-6:-3]}.{number_part[-3:]}-{check_digit}"
        else:
            # Shorter RUTs
            formatted_rut = f"{number_part}-{check_digit}"

        return ValidationResult(formatted_rut, True, None, rut)

    except Exception as e:
        return ValidationResult(rut, False, f"Error validating RUT: {str(e)}", rut)

def validate_university_email(email: str) -> ValidationResult:
    """
    Validate and normalize university email
    """
    if not email or not email.strip():
        return ValidationResult(None, True, None)  # Email might be optional

    try:
        # Normalize: lowercase and trim
        normalized = email.strip().lower()

        # Basic email regex validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

        if not re.match(email_pattern, normalized):
            return ValidationResult(email, False, "Invalid email format", email)

        # Additional validation for university domains (optional)
        university_domains = [
            'uc.cl', 'puc.cl', 'udp.cl', 'udd.cl', 'uai.cl', 'unab.cl',
            'usach.cl', 'ufro.cl', 'utem.cl', 'uahurtado.cl',
            '.edu', '.ac.'
        ]

        # Check if it looks like a university email
        domain = normalized.split('@')[-1]
        is_university_domain = any(
            domain.endswith(uni_domain) or uni_domain in domain
            for uni_domain in university_domains
        )

        warning = None if is_university_domain else "Email domain doesn't appear to be from a university"

        return ValidationResult(normalized, True, warning, email)

    except Exception as e:
        return ValidationResult(email, False, f"Error validating email: {str(e)}", email)

def normalize_career(career: str) -> ValidationResult:
    """
    Normalize career field, keeping original in raw_career
    """
    if not career or not career.strip():
        return ValidationResult(None, True, None)

    try:
        # Trim whitespace
        normalized = career.strip()

        # Remove extra spaces
        normalized = re.sub(r'\s+', ' ', normalized)

        # Title case for better readability
        normalized = normalized.title()

        # Common career abbreviations and corrections
        career_corrections = {
            'Ing.': 'Ingeniería',
            'Adm.': 'Administración',
            'Med.': 'Medicina',
            'Enf.': 'Enfermería',
            'Arq.': 'Arquitectura',
            'Psic.': 'Psicología',
            'Der.': 'Derecho',
            'Ped.': 'Pedagogía',
            'Tec.': 'Técnico',
        }

        for abbrev, full_form in career_corrections.items():
            normalized = re.sub(rf'\b{re.escape(abbrev)}\b', full_form, normalized)

        return ValidationResult(normalized, True, None, career)

    except Exception as e:
        return ValidationResult(career, False, f"Error normalizing career: {str(e)}", career)

def normalize_phone(phone: str) -> ValidationResult:
    """
    Normalize Chilean phone number
    Format: +56 9 XXXX XXXX for mobile, +56 XX XXX XXXX for landline
    """
    if not phone or not phone.strip():
        return ValidationResult(None, True, None)  # Phone might be optional

    try:
        # Extract only digits
        digits_only = re.sub(r'[^0-9]', '', phone.strip())

        if not digits_only:
            return ValidationResult(phone, False, "No digits found in phone number", phone)

        # Chilean phone number patterns
        if len(digits_only) == 8:
            # Landline without country code (XX XXX XXX)
            if digits_only.startswith(('2', '3', '4', '5', '6', '7')):
                formatted = f"+56 {digits_only[:1]} {digits_only[1:4]} {digits_only[4:]}"
                return ValidationResult(formatted, True, None, phone)
            else:
                return ValidationResult(phone, False, "Invalid landline area code", phone)

        elif len(digits_only) == 9:
            # Mobile without country code (9 XXXX XXXX)
            if digits_only.startswith('9'):
                formatted = f"+56 {digits_only[:1]} {digits_only[1:5]} {digits_only[5:]}"
                return ValidationResult(formatted, True, None, phone)
            else:
                return ValidationResult(phone, False, "9-digit number must start with 9 for mobile", phone)

        elif len(digits_only) == 10:
            # With country code 56
            if digits_only.startswith('56'):
                remaining = digits_only[2:]
                if len(remaining) == 8 and remaining.startswith(('2', '3', '4', '5', '6', '7')):
                    # Landline
                    formatted = f"+56 {remaining[:1]} {remaining[1:4]} {remaining[4:]}"
                    return ValidationResult(formatted, True, None, phone)
                elif len(remaining) == 9 and remaining.startswith('9'):
                    # Mobile
                    formatted = f"+56 {remaining[:1]} {remaining[1:5]} {remaining[5:]}"
                    return ValidationResult(formatted, True, None, phone)

        elif len(digits_only) == 11:
            # With country code +56
            if digits_only.startswith('56'):
                remaining = digits_only[2:]
                if len(remaining) == 9 and remaining.startswith('9'):
                    # Mobile
                    formatted = f"+56 {remaining[:1]} {remaining[1:5]} {remaining[5:]}"
                    return ValidationResult(formatted, True, None, phone)

        elif len(digits_only) == 12:
            # Full international format
            if digits_only.startswith('56'):
                remaining = digits_only[2:]
                if len(remaining) == 10:
                    # Could be landline or mobile
                    if remaining.startswith('9'):
                        # Mobile
                        formatted = f"+56 {remaining[:1]} {remaining[1:5]} {remaining[5:]}"
                        return ValidationResult(formatted, True, None, phone)
                    elif remaining.startswith(('2', '3', '4', '5', '6', '7')):
                        # Landline with extra digit - might be extension
                        formatted = f"+56 {remaining[:1]} {remaining[1:4]} {remaining[4:8]}"
                        warning = f"Possible extension: {remaining[8:]}"
                        return ValidationResult(formatted, True, warning, phone)

        # If no pattern matches, still normalize but mark as potentially invalid
        if len(digits_only) >= 8:
            # Try to format as best as possible
            if digits_only.startswith('9') and len(digits_only) >= 9:
                # Assume mobile
                base = digits_only[:9]
                formatted = f"+56 {base[:1]} {base[1:5]} {base[5:]}"
                warning = "Phone number format uncertain, assumed mobile"
                return ValidationResult(formatted, True, warning, phone)
            else:
                # Assume landline
                base = digits_only[:8]
                formatted = f"+56 {base[:1]} {base[1:4]} {base[4:]}"
                warning = "Phone number format uncertain, assumed landline"
                return ValidationResult(formatted, True, warning, phone)

        return ValidationResult(phone, False, f"Invalid phone number format (too short: {len(digits_only)} digits)", phone)

    except Exception as e:
        return ValidationResult(phone, False, f"Error normalizing phone: {str(e)}", phone)

def validate_and_normalize_row(row_data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool, Dict[str, str], List[str]]:
    """
    Validate and normalize a complete row of data
    Returns: (normalized_data, is_valid, errors_dict, error_types)
    """
    normalized_data = {}
    errors = {}
    error_types = []
    is_valid = True

    # Full name validation
    if 'full_name' in row_data:
        result = normalize_full_name(row_data['full_name'])
        normalized_data['full_name'] = result.value
        if not result.is_valid:
            errors['full_name'] = result.error
            error_types.append('invalid_name')
            is_valid = False
    else:
        errors['full_name'] = 'Full name is required'
        error_types.append('missing_field')
        is_valid = False

    # RUT validation
    if 'rut' in row_data:
        result = validate_rut(row_data['rut'])
        normalized_data['rut'] = result.value
        if not result.is_valid:
            errors['rut'] = result.error
            error_types.append('invalid_rut')
            is_valid = False

    # Email validation
    if 'university_email' in row_data:
        result = validate_university_email(row_data['university_email'])
        normalized_data['university_email'] = result.value
        if not result.is_valid:
            errors['university_email'] = result.error
            error_types.append('invalid_email')
            is_valid = False
        elif result.error:  # Warning
            errors['university_email_warning'] = result.error

    # Career normalization
    if 'career_or_area' in row_data:
        result = normalize_career(row_data['career_or_area'])
        normalized_data['career_or_area'] = result.value
        # Keep original in raw_career
        normalized_data['raw_career'] = result.original_value
        if not result.is_valid:
            errors['career_or_area'] = result.error
            error_types.append('invalid_career')
            is_valid = False

    # Phone normalization
    if 'phone' in row_data:
        result = normalize_phone(row_data['phone'])
        normalized_data['phone'] = result.value
        if not result.is_valid:
            errors['phone'] = result.error
            error_types.append('invalid_phone')
            is_valid = False
        elif result.error:  # Warning
            errors['phone_warning'] = result.error

    return normalized_data, is_valid, errors, error_types