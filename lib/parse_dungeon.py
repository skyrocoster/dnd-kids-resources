#!/usr/bin/env python3
"""
Dungeon HTML Parser - Extracts structured data from donjon-generated dungeon HTML

Usage:
    python lib/parse_dungeon.py <input_html_file> [--output <output_json_file>]

Examples:
    python lib/parse_dungeon.py test_dungeon.html
    python lib/parse_dungeon.py test_dungeon.html --output my_output.json
"""

import sys
import json
import sqlite3
import base64
import re
from pathlib import Path
from html.parser import HTMLParser
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional, Tuple
import argparse

# Enable UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


@dataclass
class RoomEntry:
    """Represents a single entry (monster, feature, trap, etc.) in a room"""
    entry_type: str  # 'monster', 'feature', 'trap', 'trick', 'door', 'treasure', 'other'
    title: str
    content: str
    count: Optional[int] = None
    creature_index: Optional[int] = None  # For multiple creatures of same type
    creature_total: Optional[int] = None
    creature_id: Optional[int] = None  # Database ID for monsters
    leads_to: Optional[int] = None  # Room number for doors
    door_mechanics: Optional[str] = None  # Door-specific mechanics (DC, HP, etc.)
    # Associated trap IDs (marked with Ⓣ)
    trap_ids: List[int] = field(default_factory=list)
    # Treasure-specific fields
    is_hidden: bool = False  # True if treasure is hidden
    hidden_dc: Optional[int] = None  # DC to find hidden treasure
    container: Optional[str] = None  # What the treasure is in (chest, bag, etc.)
    container_mechanics: Optional[str] = None  # Mechanics for the container (unlock DC, HP, etc.)
    treasure_contents: List[Dict] = field(default_factory=list)  # List of items: {name, quantity, value}


@dataclass
class Room:
    """Represents a dungeon room"""
    room_id: int
    title: str
    entries: List[RoomEntry] = field(default_factory=list)


@dataclass
class GeneralInfo:
    """General dungeon information"""
    title: str
    size: Optional[str] = None
    walls: Optional[str] = None
    floor: Optional[str] = None
    temperature: Optional[str] = None
    illumination: Optional[str] = None


@dataclass
class DungeonData:
    """Complete parsed dungeon data"""
    general_info: GeneralInfo
    map_image: Optional[str] = None
    rooms: List[Room] = field(default_factory=list)
    corridors: List[RoomEntry] = field(default_factory=list)

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'general_info': asdict(self.general_info),
            'map_image': self.map_image,
            'map_image_length': len(self.map_image) if self.map_image else 0,
            'corridors': [asdict(entry) for entry in self.corridors],
            'rooms': [
                {
                    'room_id': room.room_id,
                    'title': room.title,
                    'entries': [asdict(entry) for entry in room.entries]
                }
                for room in self.rooms
            ]
        }


# ============================================================================
# Database Management Functions for Creatures
# ============================================================================

def get_db_connection() -> Optional[sqlite3.Connection]:
    """Get database connection, returns None if database doesn't exist"""
    db_path = Path(__file__).parent.parent / "dnd_kids_resources.db"
    
    if not db_path.exists():
        print(f"⚠️  Warning: Database not found at {db_path}. Creatures won't be stored.")
        return None
    
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"⚠️  Warning: Failed to connect to database: {e}")
        return None


def get_or_create_creature(creature_name: str, db_conn: sqlite3.Connection) -> Optional[int]:
    """
    Check if creature exists in database, create if not.
    Returns the creature ID, or None if database operation failed.
    
    Args:
        creature_name: Name of the creature
        db_conn: Database connection
        
    Returns:
        Creature ID (int) or None if operation failed
    """
    try:
        cursor = db_conn.cursor()
        
        # Check if creature already exists (case-insensitive)
        cursor.execute(
            "SELECT id FROM creatures WHERE LOWER(title) = LOWER(?)",
            (creature_name,)
        )
        existing = cursor.fetchone()
        
        if existing:
            creature_id = existing[0]
            print(f"        ✓ Found creature in DB: {creature_name} (ID: {creature_id})")
            return creature_id
        
        # Creature doesn't exist, create it with only the name
        # Other details can be filled in later via the API
        cursor.execute("""
            INSERT INTO creatures (title)
            VALUES (?)
        """, (creature_name,))
        
        db_conn.commit()
        creature_id = cursor.lastrowid
        print(f"        ✓ Added creature to DB: {creature_name} (ID: {creature_id})")
        return creature_id
        
    except sqlite3.Error as e:
        print(f"        ✗ Database error while processing {creature_name}: {e}")
        return None


def get_or_create_trap(trap_name: str, db_conn: sqlite3.Connection) -> Optional[int]:
    """
    Check if trap exists in database, create if not.
    Returns the trap ID, or None if database operation failed.
    
    Args:
        trap_name: Name of the trap (e.g., "Acid Spray")
        db_conn: Database connection
        
    Returns:
        Trap ID (int) or None if operation failed
    """
    try:
        cursor = db_conn.cursor()
        
        # Check if trap already exists (case-insensitive)
        cursor.execute(
            "SELECT id FROM traps WHERE LOWER(name) = LOWER(?)",
            (trap_name,)
        )
        existing = cursor.fetchone()
        
        if existing:
            return existing[0]
        
        # Trap doesn't exist, create it
        cursor.execute("""
            INSERT INTO traps (name)
            VALUES (?)
        """, (trap_name,))
        
        db_conn.commit()
        trap_id = cursor.lastrowid
        return trap_id
        
    except sqlite3.Error as e:
        print(f"        ✗ Database error while processing trap {trap_name}: {e}")
        return None


class DungeonHTMLParser:
    """Parse donjon-generated dungeon HTML into structured data"""

    def __init__(self, html_content: str):
        self.html_content = html_content
        self.data = DungeonData(general_info=GeneralInfo(title='Unknown'))
        self.db_conn = get_db_connection()  # Initialize database connection

    def parse(self) -> DungeonData:
        """Main parsing entry point"""
        print("🔍 Starting dungeon HTML parsing...")

        try:
            self.extract_general_info()
            self.extract_map_image()
            self.extract_corridors()
            self.extract_rooms()
            return self.data
        except Exception as e:
            print(f"❌ Parse error: {e}")
            raise
        finally:
            # Close database connection when done
            if self.db_conn:
                self.db_conn.close()

    def extract_general_info(self):
        """Extract title, size, walls, floor, temperature, illumination"""
        print("  📋 Extracting general info...")

        # Extract title from <h1>
        h1_match = re.search(r'<h1[^>]*>([^<]+)</h1>', self.html_content)
        if h1_match:
            self.data.general_info.title = h1_match.group(1).strip()
            print(f"    ✓ Title: {self.data.general_info.title}")

        # Use extract_sections_properly to get the full General section
        sections = self.extract_sections_properly()

        for section_html in sections:
            # Look for General section
            title_match = re.search(
                r'<td[^>]*class="title"[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</td>',
                section_html,
                re.IGNORECASE
            )

            if not title_match:
                continue

            title = title_match.group(1).strip()

            # Check if this is the General section
            if title.lower() != 'general':
                continue

            # Extract content
            content_start = section_html.find('<td class="content">')
            if content_start >= 0:
                content_start += len('<td class="content">')
                # Find the closing </table></td> pattern
                table_end = section_html.find('</table></td>', content_start)
                if table_end >= 0:
                    content_html = section_html[content_start:table_end +
                                                len('</table>')]
                else:
                    content_html = section_html[content_start:]

                # Extract key-value pairs from the table rows
                # Pattern: <tr class="row"><td class="title">Key</td><td class="content">Value</td></tr>
                pairs = re.findall(
                    r'<td[^>]*class="title"[^>]*>([^<]+)</td>\s*<td[^>]*class="content"[^>]*>([^<]+)</td>',
                    content_html,
                    re.IGNORECASE
                )

                for label, value in pairs:
                    label_clean = label.strip().lower().replace(' ', '_')
                    value_clean = value.strip()

                    if label_clean == 'size':
                        self.data.general_info.size = value_clean
                        print(f"    ✓ Size: {value_clean}")
                    elif label_clean == 'walls':
                        self.data.general_info.walls = value_clean
                        print(f"    ✓ Walls: {value_clean}")
                    elif label_clean == 'floor':
                        self.data.general_info.floor = value_clean
                        print(f"    ✓ Floor: {value_clean}")
                    elif label_clean == 'temperature':
                        self.data.general_info.temperature = value_clean
                        print(f"    ✓ Temperature: {value_clean}")
                    elif label_clean == 'illumination':
                        self.data.general_info.illumination = value_clean
                        print(f"    ✓ Illumination: {value_clean}")

    def extract_map_image(self):
        """Extract map image from HTML (usually <img> tag with base64 or src)"""
        print("  🗺️  Extracting map image...")

        # Look for img tags with data URI or map references
        img_pattern = r'<img[^>]*src="([^"]+)"[^>]*>'
        matches = re.findall(img_pattern, self.html_content)

        for src in matches:
            # Prefer base64 data URIs (full map image)
            if src.startswith('data:image'):
                self.data.map_image = src
                print(f"    ✓ Map image found (base64, {len(src)} chars)")
                return
            # Also accept URL-based images
            elif 'map' in src.lower():
                self.data.map_image = src
                print(f"    ✓ Map image found: {src}")
                return

        print("    ⚠️  No map image found")

    def extract_corridors(self):
        """Extract corridor features from the Corridors section at dungeon level"""
        print("  🛤️  Extracting corridor features...")

        sections = self.extract_sections_properly()

        for section_html in sections:
            # Look for Corridors section
            title_match = re.search(
                r'<td[^>]*class="title"[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</td>',
                section_html,
                re.IGNORECASE
            )

            if not title_match:
                continue

            title = title_match.group(1).strip()

            # Check if this is the Corridors section
            if 'corridor' not in title.lower():
                continue

            print(f"    Found: {title}")

            # Extract content
            content_start = section_html.find('<td class="content">')
            if content_start >= 0:
                content_start += len('<td class="content">')
                table_end = section_html.find('</table></td>', content_start)
                if table_end >= 0:
                    content_html = section_html[content_start:table_end +
                                                len('</table>')]
                else:
                    content_html = section_html[content_start:]

                # Extract corridor entries (not tied to a specific room)
                entries = self.extract_entries_from_html(
                    content_html, -1, 'corridors')
                self.data.corridors.extend(entries)

        if self.data.corridors:
            print(f"    ✓ Found {len(self.data.corridors)} corridor features")
        else:
            print("    ⚠️  No corridor features found")

    def extract_sections_properly(self):
        """Extract section elements, properly handling nested <tr> tags in content cells"""
        sections = []
        html = self.html_content

        # Find all <tr class="section"> starting positions
        section_start_pattern = r'<tr[^>]*class="section"[^>]*>'

        for match in re.finditer(section_start_pattern, html):
            start_pos = match.start()
            opening_tag_end = match.end()

            # Find the matching </tr> by counting nesting
            tr_open_count = 1  # Count the opening <tr class="section"> we just found
            pos = opening_tag_end
            end_pos = -1

            while pos < len(html):
                # Find next <tr or </tr>
                tr_open = html.find('<tr', pos)
                tr_close = html.find('</tr>', pos)

                if tr_close < 0:
                    break

                if 0 <= tr_open < tr_close:
                    # Found <tr before </tr>
                    tr_open_count += 1
                    pos = tr_open + 3
                else:
                    # Found </tr>
                    tr_open_count -= 1
                    if tr_open_count == 0:
                        end_pos = tr_close
                        break
                    pos = tr_close + 5

            if end_pos > 0:
                # Extract content between opening tag end and closing tag start
                section_html = html[opening_tag_end:end_pos]
                sections.append(section_html)

        return sections

    def extract_rooms(self):
        """Extract all rooms and their entries"""
        print("  🏛️  Extracting rooms...")

        # Split HTML into room sections with proper nesting handling
        sections = self.extract_sections_properly()

        room_id = 0
        block_types = ['Features', 'Tricks', 'Traps',
                       'Creatures', 'Other', 'Wandering Monsters']

        i = 0
        while i < len(sections):
            section_html = sections[i]

            # Check if this is a room section (not a block type)
            # Look for Room text in span or directly in title cell
            title_match = re.search(
                r'<td[^>]*class="title"[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</td>',
                section_html,
                re.IGNORECASE
            )

            if not title_match:
                i += 1
                continue

            title = title_match.group(1).strip()

            # Skip if it's a block type header (these belong to previous room)
            if title in block_types:
                i += 1
                continue

            # Check if this is a room section
            if not title.lower().startswith('room'):
                i += 1
                continue

            print(f"    Found: {title}")
            room = Room(room_id=room_id, title=title)

            # Extract entries from this room's main content
            # The content cell is: <td class="content">...</td> before the closing </tr>
            content_start = section_html.find('<td class="content">')
            if content_start >= 0:
                # Find the closing </td> by matching: we'll find the position and search for </td> patterns
                # The content td contains a table with rows, and those have nested tds
                # We need the td that closes the content cell, which comes after the table ends
                content_start += len('<td class="content">')
                # Look for </table></td> pattern which closes the content section
                table_end = section_html.find('</table></td>', content_start)
                if table_end >= 0:
                    content_html = section_html[content_start:table_end +
                                                len('</table>')]
                else:
                    # Fallback: just take everything from content_start to the end (since section ends before </tr>)
                    content_html = section_html[content_start:]

                entries = self.extract_entries_from_html(
                    content_html, room_id, 'main')
                room.entries.extend(entries)

            # Look for following block type sections
            j = i + 1
            while j < len(sections):
                next_section_html = sections[j]
                next_title_match = re.search(
                    r'<td[^>]*class="title"[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</td>',
                    next_section_html,
                    re.IGNORECASE
                )

                if not next_title_match:
                    j += 1
                    continue

                next_title = next_title_match.group(1).strip()

                # If not a block type, we've reached the next room
                if next_title not in block_types:
                    break

                # Extract entries from this block type
                block_content_start = next_section_html.find(
                    '<td class="content">')
                if block_content_start >= 0:
                    block_content_start += len('<td class="content">')
                    # Look for </table></td> or just use content until end
                    table_end = next_section_html.find(
                        '</table></td>', block_content_start)
                    if table_end >= 0:
                        block_html = next_section_html[block_content_start:table_end + len(
                            '</table>')]
                    else:
                        block_html = next_section_html[block_content_start:]

                    block_entries = self.extract_entries_from_html(
                        block_html, room_id, next_title.lower()
                    )
                    room.entries.extend(block_entries)

                j += 1

            self.data.rooms.append(room)
            room_id += 1
            i += 1

        print(f"    ✓ Found {len(self.data.rooms)} rooms")

    def extract_entries_from_html(self, html: str, room_id: int, block_type: str) -> List[RoomEntry]:
        """Extract individual entries (monsters, features, etc.) from content HTML"""
        entries = []
        entry_index = 0

        # Split by row: <tr class="row">
        row_pattern = r'<tr[^>]*class="row"[^>]*>(.*?)</tr>'
        rows = re.findall(row_pattern, html, re.DOTALL)

        for row_html in rows:
            # Extract title and content cells more robustly
            # Title can be in class="title" or class="door"
            title_match = re.search(
                r'<td[^>]*class="(?:title|door)"[^>]*>(.*?)</td>',
                row_html,
                re.IGNORECASE | re.DOTALL
            )
            content_match = re.search(
                r'<td[^>]*class="content"[^>]*>(.*?)</td>',
                row_html,
                re.DOTALL | re.IGNORECASE
            )

            if not title_match or not content_match:
                continue

            # Extract and clean title (remove HTML tags)
            title_html = title_match.group(1)
            title = re.sub(r'<[^>]+>', '', title_html).strip()

            if not title:
                continue

            # Determine entry type first
            entry_type = self.determine_entry_type(title, block_type, row_html)

            # Handle monsters specially - extract just first <p> tag (before stat block)
            content_html = content_match.group(1)
            if entry_type == 'monster':
                # Extract first <p> tag content only (drops stat blocks after <hr />)
                p_match = re.search(r'<p>(.*?)</p>', content_html, re.DOTALL)
                if p_match:
                    monster_first_p = p_match.group(1)
                    content = re.sub(r'<[^>]+>', ' ', monster_first_p).strip()
                    content = re.sub(r'\s+', ' ', content)
                else:
                    # Fallback: clean all HTML if no <p> found
                    content = re.sub(r'<[^>]+>', ' ', content_html).strip()
                    content = re.sub(r'\s+', ' ', content)

                # Format: "2 x Darkmantle (cr 1/2, mm 46); hard, 200 xp"
                # Extract creature name and count
                count = 1
                creature_name = title  # Start with title as fallback
                
                # First, check if content starts with "Nx " format and extract count
                count_prefix_pattern = r'^(\d+)\s*x\s+(.+)$'
                count_prefix_match = re.match(count_prefix_pattern, content)
                if count_prefix_match:
                    count = int(count_prefix_match.group(1))
                    content_after_count = count_prefix_match.group(2)  # "Darkmantle (cr 1/2, ...)..."
                else:
                    content_after_count = content
                
                # Now extract creature name from what's left
                # Pattern: "CreatureName (cr X, ...)" -> extract just "CreatureName"
                # Allow uppercase letters for multi-word names like "Gibbering Mouther"
                name_pattern = r'^([A-Z][a-zA-Z\s\-\']+?)(?:\s*\(|$)'
                name_match = re.match(name_pattern, content_after_count)
                if name_match and name_match.group(1).strip():
                    potential_name = name_match.group(1).strip()
                    # Validate it looks like a real creature name
                    if len(potential_name) > 1:
                        creature_name = potential_name

                # Get or create creature in database
                # (Ensures creature exists for lookup by title later)
                if self.db_conn:
                    get_or_create_creature(creature_name, self.db_conn)

                # Create a single entry with count information (don't create separate per-instance entries)
                # Note: creature_id not stored; use title to look up creature details via API
                entry = RoomEntry(
                    entry_type='monster',
                    title=creature_name,  # Just the creature name, count is in the count field
                    content='',  # Don't duplicate creature name in content
                    count=count,
                    creature_index=1,
                    creature_total=count
                )
                entries.append(entry)
                entry_index += 1
                continue

            # Extract traps marked with Ⓣ (&#9417;) before content cleaning
            trap_ids = []
            # Find all trap blocks - look for &#9417; followed by content until </p>
            trap_start_pos = 0
            while True:
                trap_pos = content_html.find('&#9417;', trap_start_pos)
                if trap_pos == -1:
                    break
                # Find the closing </p> tag after this trap marker
                close_p = content_html.find('</p>', trap_pos)
                if close_p == -1:
                    break
                # Extract the trap text between &#9417; and </p>
                trap_text = content_html[trap_pos + len('&#9417;'):close_p]
                # Remove &nbsp; and clean HTML tags
                trap_text = trap_text.replace('&nbsp;', ' ')
                trap_text = re.sub(r'<[^>]+>', ' ', trap_text).strip()
                trap_text = re.sub(r'\s+', ' ', trap_text)
                
                if trap_text:
                    # Extract just the trap name (before the colon, like "Acid Spray")
                    # Pattern: "TrapName: details..." -> extract just "TrapName"
                    trap_name_match = re.match(r'^([^:]+?)(?::|$)', trap_text)
                    if trap_name_match:
                        trap_name = trap_name_match.group(1).strip()
                        if trap_name and self.db_conn:
                            # Get or create trap in database
                            trap_id = get_or_create_trap(trap_name, self.db_conn)
                            if trap_id:
                                trap_ids.append(trap_id)
                    
                trap_start_pos = close_p + 1

            # Standard entry content cleaning
            content = re.sub(r'<[^>]+>', ' ', content_html).strip()
            content = re.sub(r'\s+', ' ', content)  # Normalize whitespace

            # Remove trap lines from content (they're now separate)
            content = re.sub(
                r'&#9417;[^<]*(?:<[^>]*>)*[^<]*', '', content, flags=re.IGNORECASE).strip()
            content = re.sub(r'Ⓣ[^<]*(?:<[^>]*>)*[^<]*', '', content).strip()
            content = re.sub(r'\s+', ' ', content).strip()

            # Extract door-specific data (leads_to)
            leads_to = None
            door_mechanics = None
            if entry_type == 'door':
                # Look for "Leads to room #X" pattern
                leads_match = re.search(
                    r'room\s*#?(\d+)', content_html, re.IGNORECASE)
                if leads_match:
                    leads_to = int(leads_match.group(1))

                # Extract door mechanics from parentheses at the start of content
                # Pattern: "Door Description (DC X to Y; Z hp)" or similar
                mechanics_match = re.match(r'^([^(]*?)\s*\(([^)]+)\)\s*(.*?)$', content)
                if mechanics_match:
                    # Content before mechanics
                    content = mechanics_match.group(1).strip()
                    # Mechanics in parentheses
                    door_mechanics = mechanics_match.group(2).strip()
                    # Any remaining content after mechanics
                    remaining = mechanics_match.group(3).strip()
                    if remaining:
                        content = f"{content} {remaining}".strip() if content else remaining

                # Remove "Leads to" part and arrow symbols from content
                content = re.sub(
                    r'[→↔→]*\s*Leads to\s+room\s*#?\d+.*', '', content, flags=re.IGNORECASE).strip()
                content = re.sub(r',?\s*inhabited by\s+.*', '',
                                 content, flags=re.IGNORECASE).strip()
                content = re.sub(r'&rarr;\s*&nbsp;', '', content).strip()
                content = re.sub(r'[→↔]+\s*&nbsp;', '', content).strip()
                content = re.sub(r'\s+', ' ', content).strip()

            # Parse treasure-specific data
            is_hidden = False
            hidden_dc = None
            container = None
            container_mechanics = None
            treasure_contents = []
            
            if entry_type == 'treasure':
                # Parse hidden treasure format from content
                # Example: "Hidden (DC 15 to find) Locked Good Wooden Chest (DC 20 to unlock, DC 20 to break; 15 hp) 2000 cp, 1000 sp, 80 gp, 2 x diamond (50 gp)"
                
                if content:
                    # Check if treasure is hidden
                    hidden_match = re.match(r'^(?:Secret|Hidden)\s*\(DC\s*(\d+)\s+to\s+find\)\s*(.*)', content, re.IGNORECASE)
                    if hidden_match:
                        is_hidden = True
                        hidden_dc = int(hidden_match.group(1))
                        remainder = hidden_match.group(2).strip()
                    else:
                        remainder = content
                    
                    # Extract container and container mechanics
                    # Pattern: "Locked Good Wooden Chest (DC 20 to unlock, DC 20 to break; 15 hp) items..."
                    # First, find everything up to the first item (currency or "X x item")
                    
                    # Find the last closing parenthesis that contains mechanics
                    # Look for patterns like: "...Chest (DC 20 to unlock, DC 20 to break; 15 hp)"
                    container_match = re.match(r'^([^(]*(?:\([^)]*\))*[^(]*?)\s+(\([^)]*(?:hp|find|unlock|break)[^)]*\))\s+(.*)', remainder, re.IGNORECASE)
                    
                    if container_match:
                        container = container_match.group(1).strip()
                        container_mechanics = container_match.group(2).strip()
                        items_text = container_match.group(3).strip()
                    else:
                        # Try simpler match: everything before the last parentheses and items after
                        items_match = re.search(r'(\d+\s*(?:cp|sp|gp)|(?:\d+\s*x\s+))', remainder, re.IGNORECASE)
                        if items_match:
                            # Found items start, container is everything before
                            item_start = items_match.start()
                            container = remainder[:item_start].strip()
                            # Extract mechanics from container if present
                            mech_match = re.search(r'\(([^)]*(?:DC|hp|unlock|break)[^)]*)\)', container, re.IGNORECASE)
                            if mech_match:
                                container_mechanics = mech_match.group(1).strip()
                                # Remove mechanics from container
                                container = re.sub(r'\s*\([^)]*(?:DC|hp|unlock|break)[^)]*\)', '', container).strip()
                            items_text = remainder[item_start:].strip()
                        else:
                            items_text = remainder
                    
                    # Parse treasure items
                    # Split by comma, but be careful with "x" in "Nx item"
                    if items_text:
                        # Split intelligently - look for comma separators at appropriate places
                        items = []
                        current_item = ""
                        paren_depth = 0
                        
                        for char in items_text:
                            if char == '(':
                                paren_depth += 1
                            elif char == ')':
                                paren_depth -= 1
                            elif char == ',' and paren_depth == 0:
                                if current_item.strip():
                                    items.append(current_item.strip())
                                current_item = ""
                                continue
                            current_item += char
                        
                        if current_item.strip():
                            items.append(current_item.strip())
                        
                        # Parse each item
                        for item_text in items:
                            item_text = item_text.strip()
                            if not item_text:
                                continue
                            
                            # Parse "2 x diamond (50 gp)" or "2000 cp" or "Spell Scroll (Ensnaring Strike) (common, dmg 200)"
                            quantity = 1
                            item_name = ""
                            value = ""
                            
                            # Try "N x ItemName" pattern first
                            mult_match = re.match(r'^(\d+)\s*x\s+(.+?)(?:\s*\(([^)]*)\))?$', item_text)
                            if mult_match:
                                quantity = int(mult_match.group(1))
                                item_name = mult_match.group(2).strip()
                                value = mult_match.group(3) if mult_match.group(3) else ''
                            else:
                                # Try currency pattern: "2000 cp"
                                currency_match = re.match(r'^(\d+)\s*([a-z]{2})$', item_text, re.IGNORECASE)
                                if currency_match:
                                    quantity = int(currency_match.group(1))
                                    item_name = currency_match.group(2).upper()
                                    value = ''
                                else:
                                    # Complex item with parentheses like "Spell Scroll (Ensnaring Strike) (common, dmg 200)"
                                    item_name = item_text
                                    # Try to extract value from last parentheses
                                    value_match = re.search(r'\(([^)]*)\)[\s,]*$', item_text)
                                    if value_match:
                                        potential_value = value_match.group(1).strip()
                                        if 'gp' in potential_value or 'sp' in potential_value or 'cp' in potential_value:
                                            value = potential_value
                                            item_name = item_text[:value_match.start()].strip()
                            
                            if item_name:
                                treasure_contents.append({
                                    'name': item_name,
                                    'quantity': quantity,
                                    'value': value
                                })

            # Standard entry (non-monster or monster without count)
            # For standalone trap entries, extract trap name and store in database
            if entry_type == 'trap' and content and not trap_ids:
                # Extract trap name from "TrapName: details..." format
                trap_name_match = re.match(r'^([^:]+?)(?::|$)', content)
                if trap_name_match:
                    trap_name = trap_name_match.group(1).strip()
                    if trap_name and self.db_conn:
                        # Get or create trap in database
                        trap_id = get_or_create_trap(trap_name, self.db_conn)
                        if trap_id:
                            trap_ids.append(trap_id)

            entry = RoomEntry(
                entry_type=entry_type,
                title=title,
                content=content,
                leads_to=leads_to,
                door_mechanics=door_mechanics,
                trap_ids=trap_ids,
                is_hidden=is_hidden,
                hidden_dc=hidden_dc,
                container=container,
                container_mechanics=container_mechanics,
                treasure_contents=treasure_contents
            )
            
            # Skip empty entries
            if entry_type != 'empty':
                entries.append(entry)
                entry_index += 1

        return entries

    def determine_entry_type(self, title: str, block_type: str, row_html: str) -> str:
        """Determine the type of entry based on title and context"""
        title_lower = title.lower()

        # Direct matches
        if 'hidden treasure' in title_lower or 'treasure' in title_lower:
            return 'treasure'
        elif 'door' in title_lower or 'class="door"' in row_html:
            return 'door'
        elif title_lower == 'monster':
            return 'monster'
        elif title_lower == 'trap':
            return 'trap'
        elif title_lower == 'trick':
            return 'trick'
        elif title_lower == 'room features' or title_lower == 'feature':
            return 'feature'
        elif title_lower == 'empty':
            return 'empty'

        # Fallback based on block type
        if block_type == 'creatures':
            return 'monster'
        elif block_type == 'features':
            return 'feature'
        elif block_type == 'traps':
            return 'trap'
        elif block_type == 'tricks':
            return 'trick'
        elif block_type == 'corridors':
            return 'corridor'

        return 'other'


def main():
    parser = argparse.ArgumentParser(
        description='Parse dunjon-generated dungeon HTML into structured JSON'
    )
    parser.add_argument('input_file', help='Input HTML file path')
    parser.add_argument(
        '--output',
        help='Output JSON file path (default: input_file_output.json)'
    )

    args = parser.parse_args()

    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"❌ Error: File not found: {input_path}")
        sys.exit(1)

    if not input_path.suffix.lower() == '.html':
        print(f"❌ Error: File must be HTML. Got: {input_path.suffix}")
        sys.exit(1)

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_output.json"

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Read HTML
    print(f"\n📂 Reading: {input_path}")
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        sys.exit(1)

    # Parse
    print(f"\n🔄 Parsing HTML ({len(html_content)} chars)...\n")
    try:
        dungeon_parser = DungeonHTMLParser(html_content)
        dungeon_data = dungeon_parser.parse()
    except Exception as e:
        print(f"\n❌ Parsing failed: {e}")
        sys.exit(1)

    # Convert to JSON
    print(f"\n📝 Converting to JSON...")
    output_dict = dungeon_data.to_dict()

    # Save
    print(f"💾 Saving to: {output_path}\n")
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_dict, f, indent=2, ensure_ascii=False)
        print(f"✅ Successfully saved!")
        print(f"   Rooms extracted: {len(dungeon_data.rooms)}")
        print(
            f"   Total entries: {sum(len(room.entries) for room in dungeon_data.rooms)}")
        print(f"   Map image: {'Yes' if dungeon_data.map_image else 'No'}")
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
