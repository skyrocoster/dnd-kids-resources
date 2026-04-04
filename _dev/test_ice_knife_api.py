import subprocess
import time
import json
import urllib.request

# Start the Flask server
print("Starting Flask server...")
process = subprocess.Popen(
    ["python", "_dev/server_flask.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for server to start
time.sleep(2)

try:
    # Fetch Ice Knife spell
    print("\nFetching Ice Knife from API...")
    with urllib.request.urlopen("http://localhost:8000/api/spells/ice%20knife") as response:
        data = json.loads(response.read())
        print(json.dumps(data, indent=2))
finally:
    # Kill the process
    process.terminate()
    process.wait(timeout=5)
