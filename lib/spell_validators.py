#!/usr/bin/env python3
"""
Validation utilities for spell data
Ensures levels are in correct format: 'cantrip' or '1'-'9'
"""

def validate_spell_level(level):
    """
    Validate spell level format.
    Valid formats: 'cantrip' or integers 1-9 as strings ('1', '2', ..., '9')
    
    Args:
        level: The level value to validate (any type)
        
    Returns:
        tuple: (is_valid: bool, normalized_value: str, error_message: str)
    """
    if level is None:
        return False, None, "Level cannot be None"
    
    # Convert to string if needed
    level_str = str(level).strip().lower()
    
    # Check for 'cantrip'
    if level_str == 'cantrip':
        return True, 'cantrip', None
    
    # Check for "levelX" format (old format - needs correction)
    if level_str.startswith('level'):
        # Try to extract the number
        number = level_str[5:]  # Remove 'level' prefix
        if number in '123456789':
            return True, number, f"Converted from old format 'level{number}' to '{number}'"
        else:
            return False, None, f"Invalid level format: '{level}'. Must be 'cantrip' or 1-9"
    
    # Check for bare number (1-9)
    if level_str in '123456789':
        return True, level_str, None
    
    # Invalid
    return False, None, f"Invalid level: '{level}'. Must be 'cantrip' or '1'-'9'"


def normalize_spell_level(level):
    """
    Normalize a spell level value to the correct format.
    Returns the normalized value or raises ValueError if invalid.
    
    Args:
        level: The level value to normalize
        
    Returns:
        str: The normalized level ('cantrip' or '1'-'9')
        
    Raises:
        ValueError: If the level is invalid
    """
    is_valid, normalized, error_msg = validate_spell_level(level)
    if not is_valid:
        raise ValueError(error_msg)
    return normalized
