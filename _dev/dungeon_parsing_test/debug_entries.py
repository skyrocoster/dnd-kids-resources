#!/usr/bin/env python3
"""Debug entry extraction from a single room"""

import re

# Read the HTML file
with open("The Secret Catacombs of Mepha 01.html", 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extract all sections (same as main parser)
room_pattern = r'<tr[^>]*class="section"[^>]*>(.*?)</tr>'
sections = re.findall(room_pattern, html_content, re.DOTALL)

print(f"Total sections found: {len(sections)}\n")

# Look at Room #1
for i, section in enumerate(sections[:10]):
    title_match = re.search(
        r'<td[^>]*class="title"[^>]*>(?:<span[^>]*>)?([^<]+)(?:</span>)?</td>',
        section,
        re.IGNORECASE
    )

    if title_match:
        title = title_match.group(1).strip()
        if title.lower().startswith('room'):
            print(f"\nSection {i}: {title}")
            print(f"  Section length: {len(section)}")
            print(f"  Section ends with: ...{section[-100:]}")

            # Extract content using the new simple method
            content_start = section.find('<td class="content">')
            print(f"  content_start at: {content_start}")

            if content_start >= 0:
                content_start += len('<td class="content">')
                # Look for </table></td> pattern
                table_end = section.find('</table></td>', content_start)
                print(f"  </table></td> found at: {table_end}")

                if table_end >= 0:
                    content_html = section[content_start:table_end +
                                           len('</table>')]
                else:
                    # Fallback
                    content_html = section[content_start:]
                    print(f"  Using fallback - full content")

                print(f"  Content length: {len(content_html)}")
                print(f"  Content full: {content_html}")

                # Try to find the first <tr
                first_tr = content_html.find('<tr')
                print(f"\n  First <tr at: {first_tr}")

                # Find rows in this content
                row_pattern = r'<tr[^>]*class="row"[^>]*>(.*?)</tr>'
                rows = re.findall(row_pattern, content_html, re.DOTALL)
                print(f"  Rows found: {len(rows)}")

                if rows:
                    for j, row in enumerate(rows[:2]):
                        print(f"\n    Row {j+1} (first 400 chars):")
                        print(f"      {row[:400]}")

                        # Test title extraction
                        title_match_row = re.search(
                            r'<td[^>]*class="(?:title|door)"[^>]*>(.*?)</td>',
                            row,
                            re.IGNORECASE | re.DOTALL
                        )
                        if title_match_row:
                            title_html = title_match_row.group(1)
                            title_text = re.sub(
                                r'<[^>]+>', '', title_html).strip()
                            print(f"      Row Title: {title_text}")
