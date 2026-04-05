"""
Dungeon HTML Parser Module - Extracts structured data from donjon-generated dungeon HTML

Can be imported and used as:
    from dungeon_parser import DungeonHTMLParser
    parser = DungeonHTMLParser(html_content)
    parsed_data = parser.parse()
    json_output = parsed_data.to_full_dict()
"""

import json
import base64
import re
from html import unescape
from dataclasses import dataclass, asdict, field
from typing import List, Optional


@dataclass
class RoomEntry:
    """Represents a single entry (monster, feature, trap, etc.) in a room"""
    entry_type: str  # 'monster', 'feature', 'trap', 'trick', 'door', 'other'
    title: str
    content: str
    count: Optional[int] = None
    creature_index: Optional[int] = None
    creature_total: Optional[int] = None
    leads_to: Optional[int] = None
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

    def to_full_dict(self):
        """Convert to complete dictionary with full map image for JSON serialization"""
        return {
            'general_info': asdict(self.general_info),
            'map_image': self.map_image,
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
        try:
            self.extract_general_info()
            self.extract_map_image()
            self.extract_rooms()
            return self.data
        except Exception as e:
            raise Exception(f"Parse error: {e}")

    def extract_general_info(self):
        """Extract title, size, walls, floor, temperature, illumination"""
        h1_match = re.search(r'<h1[^>]*>([^<]+)</h1>', self.html_content)
        if h1_match:
            self.data.general_info.title = h1_match.group(1).strip()

        general_section = re.search(
            r'<tr[^>]*class="section"[^>]*>.*?<td[^>]*class="title"[^>]*>\s*General\s*</td>.*?<td[^>]*class="content"[^>]*>.*?</td>.*?</tr>',
            self.html_content,
            re.DOTALL | re.IGNORECASE
        )

        if general_section:
            section_html = general_section.group(0)
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
                elif label_clean == 'walls':
                    self.data.general_info.walls = value_clean
                elif label_clean == 'floor':
                    self.data.general_info.floor = value_clean
                elif label_clean == 'temperature':
                    self.data.general_info.temperature = value_clean
                elif label_clean == 'illumination':
                    self.data.general_info.illumination = value_clean

    def extract_map_image(self):
        """Extract map image from HTML (usually <img> tag with base64 or src)"""
        img_pattern = r'<img[^>]*src="([^"]+)"[^>]*>'
        matches = re.findall(img_pattern, self.html_content)

        for src in matches:
            if src.startswith('data:image'):
                self.data.map_image = src
                return
            elif 'map' in src.lower():
                self.data.map_image = src
                return

    def extract_sections_properly(self):
        """Extract section elements, properly handling nested <tr> tags in content cells"""
        sections = []
        html = self.html_content
        section_start_pattern = r'<tr[^>]*class="section"[^>]*>'

        for match in re.finditer(section_start_pattern, html):
            start_pos = match.start()
            opening_tag_end = match.end()
            tr_open_count = 1
            pos = opening_tag_end
            end_pos = -1

            while pos < len(html):
                tr_open = html.find('<tr', pos)
                tr_close = html.find('</tr>', pos)

                if tr_close < 0:
                    break

                if 0 <= tr_open < tr_close:
                    tr_open_count += 1
                    pos = tr_open + 3
                else:
                    tr_open_count -= 1
                    if tr_open_count == 0:
                        end_pos = tr_close
                        break
                    pos = tr_close + 5

            if end_pos > 0:
                section_html = html[opening_tag_end:end_pos]
                sections.append(section_html)

        return sections

    def extract_rooms(self):
        """Extract all rooms and their entries"""
        sections = self.extract_sections_properly()
        room_id = 0
        block_types = ['Features', 'Tricks', 'Traps',
                       'Creatures', 'Other', 'Wandering Monsters']

        i = 0
        while i < len(sections):
            section_html = sections[i]
            title_match = re.search(
                r'<td[^>]*class="title"[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</td>',
                section_html,
                re.IGNORECASE
            )

            if not title_match:
                i += 1
                continue

            title = title_match.group(1).strip()

            if title in block_types or not title.lower().startswith('room'):
                i += 1
                continue

            room = Room(room_id=room_id, title=title)

            content_start = section_html.find('<td class="content">')
            if content_start >= 0:
                content_start += len('<td class="content">')
                table_end = section_html.find('</table></td>', content_start)
                if table_end >= 0:
                    content_html = section_html[content_start:table_end +
                                                len('</table>')]
                else:
                    content_html = section_html[content_start:]

                entries = self.extract_entries_from_html(
                    content_html, room_id, 'main')
                room.entries.extend(entries)

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

                if next_title not in block_types:
                    break

                block_content_start = next_section_html.find(
                    '<td class="content">')
                if block_content_start >= 0:
                    block_content_start += len('<td class="content">')
                    table_end = next_section_html.find(
                        '</table></td>', block_content_start)
                    if table_end >= 0:
                        block_html = next_section_html[block_content_start:table_end + len(
                            '</table>')]
                    else:
                        block_html = next_section_html[block_content_start:]

                    block_entries = self.extract_entries_from_html(
                        block_html, room_id, next_title.lower())
                    room.entries.extend(block_entries)

                j += 1

            self.data.rooms.append(room)
            room_id += 1
            i += 1

    def extract_entries_from_html(self, html: str, room_id: int, block_type: str) -> List[RoomEntry]:
        """Extract individual entries from content HTML"""
        entries = []
        row_pattern = r'<tr[^>]*class="row"[^>]*>(.*?)</tr>'
        rows = re.findall(row_pattern, html, re.DOTALL)

        for row_html in rows:
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

            title_html = title_match.group(1)
            title = re.sub(r'<[^>]+>', '', title_html).strip()

            if not title:
                continue

            entry_type = self.determine_entry_type(title, block_type, row_html)
            content_html = content_match.group(1)

            if entry_type == 'monster':
                p_match = re.search(r'<p>(.*?)</p>', content_html, re.DOTALL)
                if p_match:
                    monster_first_p = p_match.group(1)
                    content = re.sub(r'<[^>]+>', ' ', monster_first_p).strip()
                    content = re.sub(r'\s+', ' ', content)
                else:
                    content = re.sub(r'<[^>]+>', ' ', content_html).strip()
                    content = re.sub(r'\s+', ' ', content)

                # Decode HTML entities
                content = unescape(content)

                count_match = re.match(r'^(\d+)\s*x\s*(.+)$', content)
                if count_match:
                    count = int(count_match.group(1))
                    creature_name = count_match.group(2).strip()

                    # Clean up creature names: remove level descriptors and race/type in parentheses
                    creature_name = re.sub(
                        r'\b\d+(?:st|nd|rd|th)\s+level\s+', '', creature_name, flags=re.IGNORECASE)
                    creature_name = re.sub(
                        r'\s*\([^)]+\)\s*', ' ', creature_name)
                    creature_name = re.sub(r'\s+', ' ', creature_name).strip()

                    clean_content = creature_name

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
                    continue

            traps = []
            trap_start_pos = 0
            while True:
                trap_pos = content_html.find('&#9417;', trap_start_pos)
                if trap_pos == -1:
                    break
                close_p = content_html.find('</p>', trap_pos)
                if close_p == -1:
                    break
                trap_text = content_html[trap_pos + len('&#9417;'):close_p]
                trap_text = trap_text.replace('&nbsp;', ' ')
                trap_text = re.sub(r'<[^>]+>', ' ', trap_text).strip()
                trap_text = re.sub(r'\s+', ' ', trap_text)
                # Decode HTML entities
                trap_text = unescape(trap_text)
                if trap_text:
                    traps.append(trap_text)
                trap_start_pos = close_p + 1

            content = re.sub(r'<[^>]+>', ' ', content_html).strip()
            content = re.sub(r'\s+', ' ', content)
            content = re.sub(
                r'&#9417;[^<]*(?:<[^>]*>)*[^<]*', '', content, flags=re.IGNORECASE).strip()
            content = re.sub(r'Ⓣ[^<]*(?:<[^>]*>)*[^<]*', '', content).strip()
            # Remove other circled characters like &#9416;
            content = re.sub(r'&#\d+;', '', content).strip()
            content = re.sub(r'\s+', ' ', content).strip()
            # Decode remaining HTML entities
            content = unescape(content)
            content = re.sub(r'\s+', ' ', content).strip()

            leads_to = None
            if entry_type == 'door':
                leads_match = re.search(
                    r'room\s*#?(\d+)', content_html, re.IGNORECASE)
                if leads_match:
                    leads_to = int(leads_match.group(1))

                content = re.sub(
                    r'[→↔→]*\s*Leads to\s+room\s*#?\d+.*', '', content, flags=re.IGNORECASE).strip()
                content = re.sub(r',?\s*inhabited by\s+.*', '',
                                 content, flags=re.IGNORECASE).strip()
                content = re.sub(r'&rarr;\s*&nbsp;', '', content).strip()
                content = re.sub(r'[→↔]+\s*&nbsp;', '', content).strip()
                content = re.sub(r'\s+', ' ', content).strip()

            entry = RoomEntry(
                entry_type=entry_type,
                title=title,
                content=content,
                leads_to=leads_to,
                traps=traps
            )
            entries.append(entry)

        return entries

    def determine_entry_type(self, title: str, block_type: str, row_html: str) -> str:
        """Determine the type of entry based on title and context"""
        title_lower = title.lower()

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

        if block_type == 'creatures':
            return 'monster'
        elif block_type == 'features':
            return 'feature'
        elif block_type == 'traps':
            return 'trap'
        elif block_type == 'tricks':
            return 'trick'

        return 'other'
