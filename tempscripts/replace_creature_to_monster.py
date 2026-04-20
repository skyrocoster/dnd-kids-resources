from pathlib import Path

path = Path(r'f:\DND\Kids Resources\server_flask.py')
text = path.read_text(encoding='utf-8')
start = 'def convert_db_creature_to_api_format(creature_row, conn=None):'
end = '\ndef format_element_name(name):'
if start not in text or end not in text:
    raise SystemExit('Markers not found in server_flask.py')

before, rest = text.split(start, 1)
_, after = rest.split(end, 1)

replacement = '''def convert_db_monster_to_api_format(monster_row, conn=None):
    """
    Convert a database monster row to API format for the dungeon UI.
    """
    monster_dict = dict(monster_row)

    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    def parse_field(value):
        if value is None:
            return None
        if isinstance(value, str):
            parsed = parse_json_field(value)
            return parsed if parsed is not None else value
        return value

    def format_value(value):
        if value is None or value == '':
            return ''
        if isinstance(value, dict):
            if 'avg' in value:
                return str(value['avg'])
            if 'value' in value:
                return str(value['value'])
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, list):
            return ', '.join(str(item) for item in value)
        return str(value)

    name = monster_dict.get('name', 'Unknown')
    title_display = str(name)
    icon = monster_dict.get('icon', '👹')
    size = monster_dict.get('size', '') or ''

    type_info = parse_field(monster_dict.get('type')) or {}
    type_name = ''
    if isinstance(type_info, dict):
        type_name = type_info.get('name', '') or ''
        subtype = type_info.get('subtype')
        if subtype:
            type_name = f"{type_name} ({subtype})" if type_name else str(subtype)
    elif type_info:
        type_name = str(type_info)

    alignment_info = parse_field(monster_dict.get('alignment')) or ''
    if isinstance(alignment_info, list):
        alignment = ', '.join(str(item) for item in alignment_info if item)
    else:
        alignment = str(alignment_info or '')

    hp = parse_field(monster_dict.get('hp'))
    ac = parse_field(monster_dict.get('ac'))
    speed = parse_field(monster_dict.get('speed'))
    stats = parse_field(monster_dict.get('stats')) or {}

    details = []
    if size:
        details.append({'label': 'Size:', 'content': size})
    if type_name:
        details.append({'label': 'Type:', 'content': type_name})
    if alignment:
        details.append({'label': 'Alignment:', 'content': alignment})

    hp_str = format_value(hp)
    if hp_str:
        details.append({'label': 'HP:', 'content': hp_str})

    ac_str = format_value(ac)
    if ac_str:
        details.append({'label': 'AC:', 'content': ac_str})

    speed_str = format_value(speed)
    if speed_str:
        details.append({'label': 'Speed:', 'content': speed_str})

    if isinstance(stats, dict) and stats:
        stats_grid_data = []
        for ability_code in ['str', 'dex', 'con', 'int', 'wis', 'cha']:
            if ability_code in stats and isinstance(stats[ability_code], int):
                stats_grid_data.append({
                    'code': ability_code,
                    'name': ability_code.upper(),
                    'emoji': ability_code.upper(),
                    'color': '#7f8c8d',
                    'value': stats[ability_code]
                })
        if stats_grid_data:
            details.append({
                'label': 'STATS',
                'content': stats_grid_data,
                'type': 'stats_grid'
            })

    footer_info = []
    if type_name:
        footer_info.append(type_name)
    if size:
        footer_info.append(size)

    explanation = type_name or ''
    if alignment:
        explanation = f"{explanation}, {alignment}" if explanation else alignment

    result = {
        'icon': icon,
        'level': type_name or size or str(name).lower(),
        'title': title_display,
        'explanation': explanation,
        'details': details,
        'footer_info': ' • '.join(footer_info) if footer_info else ''
    }

    if should_close:
        conn.close()

    return result

'''

path.write_text(before + replacement + end + after, encoding='utf-8')
print('replaced')
