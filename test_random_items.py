#!/usr/bin/env python3
import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional

# Simulated parsing logic
def parse_treasure(title: str, content: str):
    is_hidden = False
    hidden_dc = None
    container = None
    container_mechanics = None
    treasure_contents = []
    
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
        container_match = re.match(r'^([^(]*(?:\([^)]*\))*[^(]*?)\s+(\([^)]*(?:hp|find|unlock|break)[^)]*\))\s+(.*)', remainder, re.IGNORECASE)
        
        if container_match:
            container = container_match.group(1).strip()
            container_mechanics = container_match.group(2).strip()
            items_text = container_match.group(3).strip()
        else:
            items_match = re.search(r'(\d+\s*(?:cp|sp|gp)|(?:\d+\s*x\s+))', remainder, re.IGNORECASE)
            if items_match:
                item_start = items_match.start()
                container = remainder[:item_start].strip()
                mech_match = re.search(r'\(([^)]*(?:DC|hp|unlock|break)[^)]*)\)', container, re.IGNORECASE)
                if mech_match:
                    container_mechanics = mech_match.group(1).strip()
                    container = re.sub(r'\s*\([^)]*(?:DC|hp|unlock|break)[^)]*\)', '', container).strip()
                items_text = remainder[item_start:].strip()
            else:
                items_text = remainder
        
        # Parse treasure items
        if items_text:
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
            
            print(f"\nDEBUG - Split items ({len(items)} total):")
            for i, item in enumerate(items):
                print(f"  {i}: '{item}'")
            
            # Parse each item
            for item_text in items:
                item_text = item_text.strip()
                if not item_text:
                    continue
                
                print(f"    Parsing item: '{item_text}'")
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
                        # Complex item
                        item_name = item_text
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
    
    return {
        'is_hidden': is_hidden,
        'hidden_dc': hidden_dc,
        'container': container,
        'container_mechanics': container_mechanics,
        'treasure_contents': treasure_contents
    }

# Test with the user's example
test_content = "Hidden (DC 15 to find) Locked Good Wooden Chest (DC 20 to unlock, DC 20 to break; 15 hp) 2000 cp, 1000 sp, 80 gp, 2 x thisisntreal (50 gp), 2 x jasper (50 gp)"

result = parse_treasure("Hidden Treasure", test_content)

print("Parsed Treasure:")
print(f"  Is Hidden: {result['is_hidden']}")
print(f"  Hidden DC: {result['hidden_dc']}")
print(f"  Container: {result['container']}")
print(f"  Container Mechanics: {result['container_mechanics']}")
print(f"\n  Items:")
for item in result['treasure_contents']:
    value_str = f" ({item['value']})" if item['value'] else ""
    print(f"    - {item['quantity']}x {item['name']}{value_str}")
