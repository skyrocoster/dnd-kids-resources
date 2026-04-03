#!/usr/bin/env python3
"""
Migration: Reset conditions table with new schema (no level field, lowercase titles).
"""

import sqlite3
import json
import sys
from pathlib import Path

# Fix Windows console encoding for emoji
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Setup paths
BASE_DIR = Path(__file__).parent.parent
DB_PATH = str(BASE_DIR / "dnd_kids_resources.db")

# Hardcoded conditions data (since JSON file was deleted)
CONDITIONS_DATA = [
    {
        "title": "Blinded",
        "icon": "🙈",
        "explanation": "You can't see anything!",
        "details": [
            {"label": "", "content": "You automatically fail any check that needs sight"},
            {"label": "", "content": "Attacks against you have Advantage"},
            {"label": "", "content": "Your attacks have Disadvantage"}
        ]
    },
    {
        "title": "Charmed",
        "icon": "💜",
        "explanation": "You think the creature is your best friend!",
        "details": [
            {"label": "", "content": "You can't attack the creature that charmed you"},
            {"label": "", "content": "They have Advantage on talking to you"},
            {"label": "", "content": "You get a new save if they hurt you"}
        ]
    },
    {
        "title": "Deafened",
        "icon": "🔇",
        "explanation": "You can't hear anything!",
        "details": [
            {"label": "", "content": "You automatically fail any check that needs hearing"},
            {"label": "", "content": "Spells with Verbal components still work — you just shout!"}
        ]
    },
    {
        "title": "Frightened",
        "icon": "😱",
        "explanation": "You are terrified and want to run away!",
        "details": [
            {"label": "", "content": "Disadvantage on checks and attacks while you can see the scary thing"},
            {"label": "", "content": "You can't move closer to it on purpose"}
        ]
    },
    {
        "title": "Grappled",
        "icon": "🤼",
        "explanation": "Someone has grabbed you and won't let go!",
        "details": [
            {"label": "", "content": "Your speed becomes 0 — you can't move"},
            {"label": "",
                "content": "Use your action to try to escape (Athletics or Acrobatics)"},
            {"label": "", "content": "Ends if the grappler is incapacitated"}
        ]
    },
    {
        "title": "Incapacitated",
        "icon": "😵",
        "explanation": "You are dazed — you can't do anything!",
        "details": [
            {"label": "", "content": "No actions or reactions this turn"},
            {"label": "", "content": "You can still move and speak (a little)"}
        ]
    },
    {
        "title": "Invisible",
        "icon": "👻",
        "explanation": "Nobody can see you!",
        "details": [
            {"label": "", "content": "Your attacks have Advantage"},
            {"label": "", "content": "Attacks against you have Disadvantage"},
            {"label": "", "content": "You can still be heard and smelled!"}
        ]
    },
    {
        "title": "Paralyzed",
        "icon": "🧊",
        "explanation": "Your body is completely frozen — you can't move at all!",
        "details": [
            {"label": "", "content": "No actions, reactions, or movement"},
            {"label": "", "content": "Attacks against you are automatic hits if within 5ft"},
            {"label": "", "content": "You auto-fail Strength and Dexterity saves"}
        ]
    },
    {
        "title": "Poisoned",
        "icon": "🤢",
        "explanation": "You feel really sick and everything is harder!",
        "details": [
            {"label": "", "content": "Disadvantage on all attack rolls"},
            {"label": "", "content": "Disadvantage on all ability checks"}
        ]
    },
    {
        "title": "Prone",
        "icon": "🙇",
        "explanation": "You are lying on the ground!",
        "details": [
            {"label": "", "content": "Disadvantage on your attack rolls"},
            {"label": "", "content": "Attacks against you have Advantage if within 5ft, otherwise Disadvantage"},
            {"label": "", "content": "Stand up by spending half your movement"}
        ]
    },
    {
        "title": "Stunned",
        "icon": "⭐",
        "explanation": "You've been hit so hard you're seeing stars!",
        "details": [
            {"label": "", "content": "No actions or movement"},
            {"label": "", "content": "You can speak slowly"},
            {"label": "", "content": "Auto-fail Strength and Dexterity saves"},
            {"label": "", "content": "Attacks against you have Advantage"}
        ]
    },
    {
        "title": "Unconscious",
        "icon": "💤",
        "explanation": "You are knocked out cold!",
        "details": [
            {"label": "", "content": "No actions, movement or speech"},
            {"label": "", "content": "Drop whatever you're holding and fall Prone"},
            {"label": "", "content": "Auto-fail Strength and Dexterity saves"},
            {"label": "", "content": "Attacks within 5ft are automatic critical hits"}
        ]
    },
    {
        "title": "Inspiration",
        "icon": "🌟",
        "explanation": "You've been given inspiration by your Dungeon Master!",
        "details": [
            {"label": "", "content": "Roll 1d6 and add it to any skill check or attack roll you make"},
            {"label": "", "content": "You cannot add it to damage rolls"},
            {"label": "", "content": "You can use this once, then it's gone"},
            {"label": "", "content": "You can only have one inspiration token at a time"}
        ]
    },
    {
        "title": "Advantage",
        "icon": "⬆️",
        "explanation": "You're in a lucky spot!",
        "details": [
            {"label": "", "content": "Roll the d20 twice for one attack, ability check, or saving throw"},
            {"label": "", "content": "Use the higher result"},
            {"label": "", "content": "Only one advantage or disadvantage applies to a single roll"}
        ]
    },
    {
        "title": "Disadvantage",
        "icon": "⬇️",
        "explanation": "Things are not going your way!",
        "details": [
            {"label": "", "content": "Roll the d20 twice for one attack, ability check, or saving throw"},
            {"label": "", "content": "Use the lower result"},
            {"label": "", "content": "Only one advantage or disadvantage applies to a single roll"}
        ]
    },
    {
        "title": "Concentration",
        "icon": "🧠",
        "explanation": "You're maintaining a spell that requires your full attention!",
        "details": [
            {"label": "", "content": "You can only concentrate on one spell at a time"},
            {"label": "", "content": "If you take damage, make a Constitution saving throw to maintain concentration"},
            {"label": "", "content": "You can't cast another concentration spell while this is active"},
            {"label": "", "content": "Being incapacitated breaks concentration"}
        ]
    },
    {
        "title": "Restrained",
        "icon": "🔗",
        "explanation": "You're tied up or otherwise restrained!",
        "details": [
            {"label": "", "content": "Your speed becomes 0 — you can't move"},
            {"label": "", "content": "Disadvantage on attack rolls"},
            {"label": "", "content": "Attacks against you have Advantage"},
            {"label": "", "content": "Disadvantage on Dexterity saving throws"}
        ]
    },
    {
        "title": "Hidden",
        "icon": "👤",
        "explanation": "You're trying to stay out of sight!",
        "details": [
            {"label": "", "content": "Creatures don't know your exact location"},
            {"label": "", "content": "Your first attack has Advantage"},
            {"label": "", "content": "Attacks against you have Disadvantage"},
            {"label": "", "content": "You break hiding if you make noise or are seen"}
        ]
    },
    {
        "title": "It's Your Turn!",
        "icon": "⏱️",
        "explanation": "What can you do on your turn?",
        "details": [
            {"label": "",
                "content": "Move: Up to your speed (usually 30 feet)"},
            {"label": "", "content": "Action: Attack, cast spell, use item, or special ability"},
            {"label": "", "content": "Bonus Action: Some abilities let you do extra things"},
            {"label": "",
                "content": "Reaction: Happens outside your turn (like opportunity attacks)"}
        ]
    }
]


def migrate_conditions():
    """Reset conditions table with new schema."""

    print("Setting up conditions table...")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Drop existing conditions table and recreate with new schema
    print("Recreating conditions table...")
    cursor.execute("DROP TABLE IF EXISTS conditions;")

    cursor.execute("""
        CREATE TABLE conditions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            explanation TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Insert each condition
    print("Inserting conditions...")
    for condition in CONDITIONS_DATA:
        title = condition.get('title', '').lower()
        icon = condition.get('icon', '')
        explanation = condition.get('explanation', '')
        details = condition.get('details', [])

        # Store details as JSON
        details_json = json.dumps(details)

        cursor.execute("""
            INSERT INTO conditions 
            (title, icon, explanation, details)
            VALUES (?, ?, ?, ?)
        """, (title, icon, explanation, details_json))

        print(f"  ✓ {title}")

    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) as count FROM conditions;")
    result = cursor.fetchone()
    count = result['count']

    conn.close()

    print(f"\nMigration complete! {count} conditions in database")


if __name__ == '__main__':
    try:
        migrate_conditions()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
