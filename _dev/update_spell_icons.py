#!/usr/bin/env python3
"""
Update spell icons based on school and spell name for better visual distinction.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'dnd_kids_resources.db'

# Map schools to primary icons
SCHOOL_ICONS = {
    'Abjuration': '🛡️',      # Shield/protection
    'Conjuration': '✨',      # Sparkles/summoning
    'Divination': '🔮',      # Crystal ball/prediction
    'Enchantment': '💜',     # Purple heart/charm
    'Evocation': '⚡',       # Lightning/energy
    'Illusion': '👁️',        # Eye/deception
    'Necromancy': '☠️',      # Skull/death
    'Transmutation': '🔄',   # Refresh/change
}

# Specific spell overrides for better thematic matches
SPELL_ICONS = {
    # Fire spells
    'fire bolt': '🔥',
    'burning hands': '🔥',
    'fireball': '🔥',
    'wall of fire': '🔥',
    'create bonfire': '🔥',

    # Cold/Frost spells
    'frostbite': '❄️',
    'ray of frost': '❄️',
    'ice storm': '❄️',
    'cone of cold': '❄️',

    # Water spells
    'create or destroy water': '💧',
    'tidal wave': '🌊',

    # Wind spells
    'gust': '💨',
    'gust of wind': '💨',

    # Animal spells
    'animal friendship': '🐾',
    'animal messenger': '🐾',
    'summon beast': '🐾',

    # Charm/Enchantment spells
    'charm person': '💜',
    'suggestion': '💬',
    'command': '🎺',

    # Healing spells
    'cure wounds': '❤️',
    'healing word': '❤️',
    'cure disease': '❤️',

    # Light spells
    'light': '💡',
    'daylight': '☀️',

    # Control spells
    'control flames': '🔥',
    'control water': '💧',
    'control winds': '💨',
}


def update_spell_icons():
    """Update all spell icons in the database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get all spells
        cursor.execute("SELECT id, title, school FROM spells ORDER BY title")
        spells = cursor.fetchall()

        updated = 0
        for spell in spells:
            spell_id = spell['id']
            title = spell['title']
            school = spell['school']

            # Check for specific spell icon first
            icon = SPELL_ICONS.get(title.lower())

            # Fall back to school icon
            if not icon:
                icon = SCHOOL_ICONS.get(school, '✨')

            # Update the spell
            cursor.execute(
                "UPDATE spells SET icon = ? WHERE id = ?",
                (icon, spell_id)
            )
            updated += 1
            print(f"✓ {title:<30} → {icon}  (School: {school})")

        conn.commit()
        conn.close()

        print(f"\n✓ Updated {updated} spells")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    update_spell_icons()
