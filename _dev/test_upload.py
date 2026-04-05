import json
import urllib.request
import urllib.error
import io

# Test dungeon upload
html_file = r"_dev\dungeon_parsing_test\The Secret Catacombs of Mepha 01.html"

# Read file and prepare multipart form data
with open(html_file, 'rb') as f:
    html_content = f.read()

# Create multipart form data
boundary = b"----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = io.BytesIO()
body.write(b"--" + boundary + b"\r\n")
body.write(
    b'Content-Disposition: form-data; name="file"; filename="dungeon.html"\r\n')
body.write(b"Content-Type: text/html\r\n\r\n")
body.write(html_content)
body.write(b"\r\n--" + boundary + b"--\r\n")

# Upload
req = urllib.request.Request(
    'http://localhost:8000/api/dungeons/upload',
    data=body.getvalue(),
    headers={'Content-Type': b'multipart/form-data; boundary=' + boundary}
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(f"Status: {response.status}")
        print(json.dumps(result, indent=2))

        if 'id' in result:
            dungeon_id = result['id']
            print(f"\n✓ Upload successful! Dungeon ID: {dungeon_id}")
            print("\nTesting retrieval...")

            # Retrieve the dungeon
            get_req = urllib.request.Request(
                f'http://localhost:8000/api/dungeons/{dungeon_id}')
            with urllib.request.urlopen(get_req) as get_response:
                get_data = json.loads(get_response.read().decode('utf-8'))
                print(f"Status: {get_response.status}")
                print(f"Title: {get_data['title']}")
                print(
                    f"Parsed JSON keys: {list(get_data['parsed_json'].keys())}")
                if 'rooms' in get_data['parsed_json']:
                    print(
                        f"Number of rooms: {len(get_data['parsed_json']['rooms'])}")
except urllib.error.HTTPError as e:
    print(f"Error: {e.status} {e.reason}")
    print(json.dumps(json.loads(e.read().decode('utf-8')), indent=2))
