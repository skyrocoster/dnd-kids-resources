#!/usr/bin/env python3
"""
D&D Kids Resources - Local Web Server
Serves the website on http://localhost:8000
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8000
HANDLER = http.server.SimpleHTTPRequestHandler


def start_server():
    """Start the local web server"""
    # Change to the parent directory (project root)
    os.chdir(Path(__file__).parent.parent)

    with socketserver.TCPServer(("", PORT), HANDLER) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"🎲 D&D Kids Resources Server")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"✨ Server running at: {url}")
        print(f"📂 Serving from: {Path.cwd()}")
        print(f"\n Press Ctrl+C to stop the server")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        # Optionally open in browser
        try:
            webbrowser.open(url)
            print(f"🌐 Opening {url} in your default browser...\n")
        except:
            print(f"📌 Open {url} in your browser manually\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Server stopped.")
            httpd.server_close()


if __name__ == "__main__":
    start_server()
