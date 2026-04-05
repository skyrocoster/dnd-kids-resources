#!/usr/bin/env python3
"""
Dungeon HTML Parser - Extracts structured data from donjon-generated dungeon HTML

Usage:
    python parse_dungeon.py <input_html_file> [--output <output_json_file>]

Examples:
    python parse_dungeon.py test_dungeon.html
    python parse_dungeon.py test_dungeon.html --output my_output.json
"""

import sys
import json
import base64
import re
from pathlib import Path
from html.parser import HTMLParser
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Optional
import argparse

# Enable UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


@dataclass
class RoomEntry:
    """Represents a single entry (monster, feature, trap, etc.) in a room"""
    entry_type: str  # 'monster', 'feature', 'trap', 'trick', 'door', 'other'
    title: str
    content: str
    count: Optional[int] = None
    creature_index: Optional[int] = None  # For multiple creatures of same type
    creature_total: Optional[int] = None
    leads_to: Optional[int] = None  # Room number for doors
    # Associated traps (marked with Ⓣ)
    traps: List[str] = field(default_factory=list)


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

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'general_info': asdict(self.general_info),
            'map_image': self.map_image[:100] + '...' if self.map_image and len(self.map_image) > 100 else self.map_image,
            'map_image_length': len(self.map_image) if self.map_image else 0,
            'rooms': [
                {
                    'room_id': room.room_id,
                    'title': room.title,
                    'entries': [asdict(entry) for entry in room.entries]
                }
                for room in self.rooms
            ]
        }


class DungeonHTMLParser:
    """Parse donjon-generated dungeon HTML into structured data"""

    def __init__(self, html_content: str):
        self.html_content = html_content
        self.data = DungeonData(general_info=GeneralInfo(title='Unknown'))

    def parse(self) -> DungeonData:
        """Main parsing entry point"""
        print("🔍 Starting dungeon HTML parsing...")

        try:
            self.extract_general_info()
            self.extract_map_image()
            self.extract_rooms()
            return self.data
        except Exception as e:
            print(f"❌ Parse error: {e}")
            raise

    def extract_general_info(self):
        """Extract title, size, walls, floor, temperature, illumination"""
        print("  📋 Extracting general info...")

        # Extract title from <h1>
        h1_match = re.search(r'<h1[^>]*>([^<]+)</h1>', self.html_content)
        if h1_match:
            self.data.general_info.title = h1_match.group(1).strip()
            print(f"    ✓ Title: {self.data.general_info.title}")

        # Look for the General section in the HTML table structure
        # Donjon uses <tr class="section"> for sections with <td class="title"> and <td class="content">
        general_section = re.search(
            r'<tr[^>]*class="section"[^>]*>.*?<td[^>]*class="title"[^>]*>\s*General\s*</td>.*?<td[^>]*class="content"[^>]*>.*?</td>.*?</tr>',
            self.html_content,
            re.DOTALL | re.IGNORECASE
        )

        if general_section:
            section_html = general_section.group(0)

            # Extract key-value pairs from the General section
            # Pattern: <td class="title">Key</td><td class="content">Value</td>
            pairs = re.findall(
                r'<td[^>]*class="title"[^>]*>([^<]+)</td>\s*<td[^>]*class="content"[^>]*>([^<]+)</td>',
                section_html,
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

                # Parse the count from cleaned content
                count_match = re.match(r'^(\d+)\s*x\s*(.+)$', content)
                if count_match:
                    count = int(count_match.group(1))
                    creature_name = count_match.group(2).strip()
                    # Store just the creature name without "N x" prefix since we have count field
                    clean_content = creature_name

                    # Create separate entries for each creature instance
                    for idx in range(1, count + 1):
                        entry = RoomEntry(
                            entry_type='monster',
                            title=creature_name,
                            content=clean_content,
                            count=count,
                            creature_index=idx,
                            creature_total=count
                        )
                        entries.append(entry)
                    entry_index += 1
                    continue

            # Extract traps marked with Ⓣ (&#9417;) before content cleaning
            traps = []
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
                    traps.append(trap_text)
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
            if entry_type == 'door':
                # Look for "Leads to room #X" pattern
                leads_match = re.search(
                    r'room\s*#?(\d+)', content_html, re.IGNORECASE)
                if leads_match:
                    leads_to = int(leads_match.group(1))

                # Remove "Leads to" part and arrow symbols from content
                content = re.sub(
                    r'[→↔→]*\s*Leads to\s+room\s*#?\d+.*', '', content, flags=re.IGNORECASE).strip()
                content = re.sub(r',?\s*inhabited by\s+.*', '',
                                 content, flags=re.IGNORECASE).strip()
                content = re.sub(r'&rarr;\s*&nbsp;', '', content).strip()
                content = re.sub(r'[→↔]+\s*&nbsp;', '', content).strip()
                content = re.sub(r'\s+', ' ', content).strip()

            # Standard entry (non-monster or monster without count)
            entry = RoomEntry(
                entry_type=entry_type,
                title=title,
                content=content,
                leads_to=leads_to,
                traps=traps
            )
            entries.append(entry)
            entry_index += 1

        return entries

    def determine_entry_type(self, title: str, block_type: str, row_html: str) -> str:
        """Determine the type of entry based on title and context"""
        title_lower = title.lower()

        # Direct matches
        if 'door' in title_lower or 'class="door"' in row_html:
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
