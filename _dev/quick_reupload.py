import json
import urllib.request
import urllib.error
import io

# Re-upload the test dungeon
html_file = r"_dev\dungeon_parsing_test\The Secret Catacombs of Mepha 01.html"

with open(html_file, 'rb') as f:
    html_content = f.read()

boundary = b"----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = io.BytesIO()
body.write(b"--" + boundary + b"\r\n")
body.write(
    b'Content-Disposition: form-data; name="file"; filename="dungeon.html"\r\n')
body.write(b"Content-Type: text/html\r\n\r\n")
body.write(html_content)
body.write(b"\r\n--" + boundary + b"--\r\n")

req = urllib.request.Request(
    'http://localhost:8000/api/dungeons/upload',
    data=body.getvalue(),
    headers={'Content-Type': b'multipart/form-data; boundary=' + boundary}
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(f"✓ Uploaded! Dungeon ID: {result['id']}")
except urllib.error.HTTPError as e:
    print(f"Error: {e.status}")
    print(json.loads(e.read().decode('utf-8')))
