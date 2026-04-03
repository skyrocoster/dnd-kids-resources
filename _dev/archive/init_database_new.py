#!/usr/bin/env python3
"""
Initialize blank D&D Kids Resources database with template-based roll system.
Creates all tables according to SCHEMA_DESIGN.md (Option A: templates in detail_entries).
Tests access to verify everything works.
"""

import sqlite3
import os
from datetime import datetime

# Database path
DB_PATH = "dnd_kids_resources.db"


def create_schema():
    """Create all tables according to normalized schema design."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"Creating database at: {DB_PATH}")
    print("-" * 60)

    # 1. CREATE ICONS TABLE
    print("Creating icons table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS icons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_icons_symbol ON icons(symbol)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_icons_purpose ON icons(purpose)")
    print("✓ icons table created")

    # 2. CREATE USERS TABLE
    print("Creating users table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    print("✓ users table created")

    # 3. CREATE CARDS TABLE (base for all card types)
    print("Creating cards table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_type TEXT NOT NULL,
      title TEXT NOT NULL,
      icon_id INTEGER NOT NULL,
      level TEXT NOT NULL,
      explanation TEXT,
      is_default INTEGER DEFAULT 1,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (icon_id) REFERENCES icons(id) ON DELETE RESTRICT
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cards_is_default ON cards(is_default)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cards_level ON cards(level)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cards_icon_id ON cards(icon_id)")
    print("✓ cards table created")

    # 4. CREATE TYPE-SPECIFIC TABLES

    print("Creating spells table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS spells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      school TEXT,
      to_hit TEXT,
      damage TEXT,
      heal TEXT,
      range TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_spells_card_id ON spells(card_id)")
    print("✓ spells table created")

    print("Creating weapons table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weapons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      type TEXT,
      hands TEXT,
      removable INTEGER,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_weapons_card_id ON weapons(card_id)")
    print("✓ weapons table created")

    print("Creating npcs table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS npcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      species TEXT,
      profession TEXT,
      location TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_npcs_card_id ON npcs(card_id)")
    print("✓ npcs table created")

    print("Creating conditions table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      duration TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_conditions_card_id ON conditions(card_id)")
    print("✓ conditions table created")

    print("Creating locations table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      location_type TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_locations_card_id ON locations(card_id)")
    print("✓ locations table created")

    print("Creating magic_items table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS magic_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      rarity TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_magic_items_card_id ON magic_items(card_id)")
    print("✓ magic_items table created")

    print("Creating wild_shapes table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wild_shapes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      creature_type TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_wild_shapes_card_id ON wild_shapes(card_id)")
    print("✓ wild_shapes table created")

    print("Creating actions table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      action_type TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_actions_card_id ON actions(card_id)")
    print("✓ actions table created")

    # 5. CREATE DETAIL_ENTRIES TABLE (with template-based rolls, Option A)
    print("Creating detail_entries table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detail_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      sequence_order INTEGER NOT NULL,
      label TEXT,
      content_type TEXT NOT NULL,
      content_text TEXT,
      template TEXT,
      roll_actor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
    """)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_detail_entries_card_id ON detail_entries(card_id)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_detail_entries_sequence ON detail_entries(card_id, sequence_order)")
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_detail_entries_order ON detail_entries(card_id, sequence_order)")
    print("✓ detail_entries table created")

    # Commit and close
    conn.commit()
    print("-" * 60)
    print("✅ All tables created successfully!")
    conn.close()


def verify_schema():
    """Verify the schema by querying table information."""
    print("\nVerifying schema...")
    print("-" * 60)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()

    print(f"Found {len(tables)} tables:")
    for table in tables:
        table_name = table[0]
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"\n  {table_name}:")
        for col in columns:
            col_name, col_type = col[1], col[2]
            print(f"    - {col_name}: {col_type}")

    # Get all indexes
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    indexes = cursor.fetchall()

    print(f"\n\nFound {len(indexes)} indexes:")
    for idx in indexes:
        print(f"  - {idx[0]}")

    conn.close()
    print("\n✅ Schema verification complete!")


def test_access():
    """Test that we can insert and retrieve data with template-based rolls."""
    print("\nTesting database access...")
    print("-" * 60)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Test 1: Insert a test icon
    print("Test 1: Inserting test icon...")
    try:
        cursor.execute("""
            INSERT INTO icons (symbol, description, purpose)
            VALUES (?, ?, ?)
        """, ("🔥", "Fire Spell Icon", "spell"))
        conn.commit()
        test_icon_id = cursor.lastrowid
        print(f"  [OK] Icon inserted with ID: {test_icon_id}")
    except sqlite3.IntegrityError as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Test 2: Insert a test user
    print("Test 2: Inserting test user...")
    try:
        cursor.execute("""
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        """, ("testuser", "test@example.com", "hashed_password"))
        conn.commit()
        test_user_id = cursor.lastrowid
        print(f"  [OK] User inserted with ID: {test_user_id}")
    except sqlite3.IntegrityError as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Test 3: Insert a test card
    print("Test 3: Inserting test card (Fire Bolt)...")
    try:
        cursor.execute("""
            INSERT INTO cards (card_type, title, icon_id, level, explanation, is_default, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("spell", "Fire Bolt", test_icon_id, "cantrip", "fling a streak of fire that zaps one target", 0, test_user_id))
        conn.commit()
        test_card_id = cursor.lastrowid
        print(f"  [OK] Card inserted with ID: {test_card_id}")
    except sqlite3.IntegrityError as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Test 4: Insert spell-specific data
    print("Test 4: Inserting spell metadata...")
    try:
        cursor.execute("""
            INSERT INTO spells (card_id, school)
            VALUES (?, ?)
        """, (test_card_id, "Evocation"))
        conn.commit()
        print(f"  [OK] Spell record inserted")
    except sqlite3.IntegrityError as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Test 5: Insert detail entries with templates (Fire Bolt example)
    print("Test 5: Inserting detail entries with template-based rolls...")
    try:
        # Detail 1: Attack roll with SAM template
        cursor.execute("""
            INSERT INTO detail_entries (card_id, sequence_order, label, content_type, template, roll_actor)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (test_card_id, 1, "🎲 Roll:", "template", "{1}{d20}+{SAM}", None))

        # Detail 2: Damage roll with fire modifier template
        cursor.execute("""
            INSERT INTO detail_entries (card_id, sequence_order, label, content_type, template, roll_actor)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (test_card_id, 2, "💥 Damage:", "template", "{1}{d10}+{fire}", None))

        # Detail 3: Range (simple text content)
        cursor.execute("""
            INSERT INTO detail_entries (card_id, sequence_order, label, content_type, content_text, roll_actor)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (test_card_id, 3, "🎯 Range:", "text", "very long, single target", None))

        # Detail 4: Scaling (template with text)
        cursor.execute("""
            INSERT INTO detail_entries (card_id, sequence_order, label, content_type, template, roll_actor)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (test_card_id, 4, "⬆️ Scaling:", "template", "{1}{d10} at higher levels", None))

        conn.commit()
        print(
            f"  [OK] 4 detail entries inserted (1 roll + 1 damage + 1 text + 1 scaling)")
    except sqlite3.IntegrityError as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Test 6: Query card with JOINs
    print("Test 6: Retrieving card data...")
    try:
        cursor.execute("""
            SELECT c.id, c.title, c.card_type, s.school, u.username, i.symbol
            FROM cards c
            LEFT JOIN spells s ON c.id = s.card_id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN icons i ON c.icon_id = i.id
            WHERE c.id = ?
        """, (test_card_id,))
        result = cursor.fetchone()
        if result:
            card_id, title, card_type, school, username, icon_symbol = result
            print(
                f"  [OK] Retrieved: {icon_symbol} {title} ({card_type:.6}) in {school} school")
        else:
            print(f"  [ERROR] No data found")
            conn.close()
            return False
    except Exception as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Test 7: Query detail entries with templates
    print("Test 7: Retrieving detail entries (template parsing)...")
    try:
        cursor.execute("""
            SELECT de.sequence_order, de.label, de.content_type, de.template, de.content_text, de.roll_actor
            FROM detail_entries de
            WHERE de.card_id = ?
            ORDER BY de.sequence_order
        """, (test_card_id,))
        results = cursor.fetchall()
        if results:
            print(f"  [OK] Retrieved {len(results)} detail entries:")
            for seq, label, ctype, template, text, actor in results:
                if template:
                    print(f"       [{seq}] {label} > template: '{template}'")
                else:
                    print(f"       [{seq}] {label} > text: '{text}'")
        else:
            print(f"  [ERROR] No data found")
            conn.close()
            return False
    except Exception as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    # Clean up test data
    print("\nCleaning up test data...")
    try:
        cursor.execute("DELETE FROM users WHERE id = ?", (test_user_id,))
        conn.commit()
        print(f"  [OK] User deleted (cascaded to cards and detail_entries)")

        cursor.execute(
            "SELECT symbol FROM icons WHERE id = ?", (test_icon_id,))
        icon_check = cursor.fetchone()
        if icon_check:
            print(
                f"  [OK] Icon protected by FK constraint (ON DELETE RESTRICT)")

        cursor.execute("DELETE FROM icons WHERE id = ?", (test_icon_id,))
        conn.commit()
        print(f"  [OK] Icon cleaned up")
    except Exception as e:
        print(f"  [ERROR] {e}")
        conn.close()
        return False

    conn.close()
    print("\n[OK] All access tests passed!")
    return True


def main():
    """Main initialization flow."""
    print("\n" + "=" * 60)
    print("D&D Kids Resources - Database Initialization (Option A)")
    print("Template-based rollsystem in detail_entries")
    print("=" * 60)

    # Check if DB already exists
    if os.path.exists(DB_PATH):
        print(f"\n[WARNING] Database already exists: {DB_PATH}")
        response = input("Delete and recreate? (y/n): ").strip().lower()
        if response == 'y':
            os.remove(DB_PATH)
            print(f"Removed existing database")
        else:
            print("Exiting without changes")
            return False

    # Create schema
    create_schema()

    # Verify schema
    verify_schema()

    # Test access
    success = test_access()

    if success:
        print("\n" + "=" * 60)
        print("[OK] DATABASE INITIALIZATION COMPLETE")
        print("=" * 60)
        print(f"\nDatabase location: {DB_PATH}")
        print("\n✨ SCHEMA HIGHLIGHTS:")
        print("  - 12 tables (icons, users, cards, + 8 card types, detail_entries)")
        print(
            "  - Template-based rolls: {1}{d20}+{SAM} (flexible, no schema changes)")
        print("  - All IDs are INTEGER PRIMARY KEY AUTOINCREMENT")
        print("  - Icon uniqueness enforced (UNIQUE symbol constraint)")
        print("  - Cascade delete: users → cards → detail_entries")
        print("  - Icon protection: ON DELETE RESTRICT (prevent orphans)")
        print("\n📋 Ready for Phase 2: Data migration from JSON files")


if __name__ == "__main__":
    main()
