# Stat Block Queue System - Setup & Usage Guide

## Overview

The new Queue Management System allows you to queue up AI stat block parsing jobs without blocking the web server. Jobs run in the background and are processed sequentially by a dedicated worker process.

## System Architecture

```
User Input → Queue API → Database Job Table
                           ↓
                      Worker Process (background)
                           ↓
                      AI Parser (10-30 sec)
                           ↓
                      Upsert to Creatures
                           ↓
                      Job Status Updated
                           ↓
                    Frontend Polls & Shows Results
```

## Quick Start (Recommended - GUI Method)

### 1. First Time Setup

```bash
# Install PyQt5 (if not already done)
install_pyqt5.bat
```

### 2. Start Flask Server

Keep the server running in a terminal:

```bash
python server_flask.py
```

Or use your existing method:
```bash
.venv\Scripts\Activate.ps1
python start-server.ps1
```

### 3. Run the Control Panel (Separate Terminal)

```bash
# Double-click this file:
launch_manager.bat

# This opens a desktop control panel that:
# - Shows queue worker status
# - Displays real-time queue stats
# - Shows recent jobs
# - Allows start/stop/restart of worker process
```

### 4. Use the Web Interface

Once both are running:
- Flask Server: http://localhost:8000
- Stat Block Parser: http://localhost:8000/pages/stat-block-parser.html

**Workflow:**
1. Paste D&D stat block
2. Click "Queue for Processing"
3. Get Job ID instantly
4. Status updates live: Pending → Processing → Complete
5. Results appear when done
6. Creature auto-committed to database

---

## Alternative: Fully Manual Terminal Method (No GUI)

If you prefer to manage everything from the terminal without the control panel:

```bash
# Terminal 1: Start Flask Server
python server_flask.py

# Terminal 2: Start Queue Worker
python _dev\queue_worker.py --verbose
```

Or use the convenience launcher:
```bash
# This opens two separate terminals automatically
start_manual.bat
```

---

## Control Panel Architecture

The control panel now manages **only the queue worker**. The Flask server is managed separately:

```
Flask Server (Terminal 1)
    ├─ Manages HTTP requests
    └─ Provides API for queue operations

Control Panel (PyQt5 GUI)
    ├─ Starts/stops queue worker
    ├─ Displays queue statistics
    └─ Shows recent jobs
    
Queue Worker (Background Process)
    ├─ Polls for pending jobs
    ├─ Processes stat blocks (AI parsing)
    └─ Upserts creatures to database
```



## Database Schema - New Table

```sql
CREATE TABLE statblock_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'pending',          -- pending, processing, completed, failed
    statblock TEXT NOT NULL,                -- Raw input from user
    model_path TEXT,                        -- Optional custom model path
    parsed_data TEXT,                       -- JSON result from AI parser
    creature_id INTEGER,                    -- FK to creatures (if successful)
    error_message TEXT,                     -- Error details if failed
    progress_percent INTEGER DEFAULT 0,     -- 0-100 progress indicator
    elapsed_seconds INTEGER DEFAULT 0,      -- Parse time in seconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,                    -- When processing began
    completed_at DATETIME,                  -- When processing finished
    FOREIGN KEY (creature_id) REFERENCES creatures(id)
)
```

---

## API Endpoints

### Submit a Job
```
POST /api/queue/submit
Content-Type: application/json

{
    "statblock": "Goblin\nSmall humanoid...",
    "model_path": "/path/to/model.gguf"  // Optional
}

Response:
{
    "success": true,
    "job_id": 42,
    "status": "pending"
}
```

### Get Job Status
```
GET /api/queue/<job_id>

Response:
{
    "id": 42,
    "status": "completed",
    "parsed_data": { ... },
    "creature_id": 15,
    "error_message": null,
    "progress_percent": 100,
    "elapsed_seconds": 23,
    "created_at": "2026-04-07T...",
    "started_at": "2026-04-07T...",
    "completed_at": "2026-04-07T..."
}
```

### Get Queue Statistics
```
GET /api/queue/stats

Response:
{
    "pending": 3,              // Jobs waiting to be processed
    "processing": 1,           // Currently being parsed
    "completed": 42,           // Successfully processed
    "failed": 2,               // Errors during parsing
    "avg_parse_time": 23,      // Average seconds per parse
    "current_job_id": 42,      // Currently processing job
    "current_job_progress": 45 // Progress percent of current job
}
```

### Get Recent Jobs
```
GET /api/queue/recent?limit=10

Response:
[
    {
        "id": 42,
        "status": "completed",
        "creature_title": "Goblin",
        "creature_id": 15,
        "elapsed_seconds": 23,
        "completed_at": "2026-04-07T12:35:21"
    },
    ...
]
```

---

## Queue Worker Options

The worker script (`_dev/queue_worker.py`) supports several command-line options:

```bash
# Start with default 2-second poll interval
python _dev/queue_worker.py

# Custom poll interval (seconds between job checks)
python _dev/queue_worker.py --interval 5

# Verbose output (shows status even when idle)
python _dev/queue_worker.py --verbose

# Custom model path
python _dev/queue_worker.py --model-path "/path/to/model.gguf"

# Combine options
python _dev/queue_worker.py --interval 2 --verbose --model-path "models/mistral.gguf"
```

---

## Frontend Usage

### Old Way (Blocking)
```
[Parse Button] → WAIT 30 seconds → [Commit Button]
```

### New Way (Non-Blocking)
```
[Queue Button] → Job #42 created instantly
                 ↓ (Status: Pending)
                 ↓ (Status: Processing 45%)
                 ↓ (Status: Complete!)
              Auto-display results
              Creature saved to DB
```

---

## Troubleshooting

### Problem: "PyQt5 module not found"
**Solution:** 
```bash
install_pyqt5.bat
```
Or manually:
```bash
python -m pip install PyQt5==5.15.9
```

### Problem: "Worker seems stuck" / "No jobs being processed"
**Solution:** 
1. Check worker is running in control panel
2. Verify queue/stats endpoint shows jobs pending
3. Restart worker: click "Restart" button in control panel
4. Check worker logs tab for error messages

### Problem: "API endpoint /api/queue/stats returns error"
**Solution:**
- Ensure Flask server is running (green status in control panel)
- Check Flask logs for errors
- Verify database exists: `F:\DND\Kids Resources\dnd_kids_resources.db`

### Problem: "Jobs complete but creature not created"
**Solution:**
- Check error_message in job details (API or logs)
- Common causes:
  - Creature type code not found in database
  - Invalid stat block format
  - AI parser produced invalid JSON

---

## Performance Notes

- **Parse Time:** 10-30 seconds per stat block (depends on model/hardware)
- **Poll Interval:** Default 2 seconds (configurable)
- **Memory:** Queue worker uses ~500MB-2GB during parsing
- **Storage:** Each job stored in DB (retroactive deletion available)

---

## File Structure

```
F:\DND\Kids Resources\
├── launch_manager.bat          ← Click this to start
├── start_manual.bat            ← Alternative: separate terminals
├── install_pyqt5.bat           ← Install PyQt5 dependency
├── server_flask.py             ← Main web server (unchanged)
├── dnd_kids_resources.db       ← Database (now with statblock_jobs table)
├── _dev\
│   ├── queue_worker.py         ← NEW: Background job processor
│   ├── launcher_app.py         ← NEW: PyQt5 control panel
│   └── init_database.py        ← UPDATED: New table schema
├── pages\
│   └── stat-block-parser.html  ← UPDATED: Now uses queue API
└── requirements.txt            ← UPDATED: Added PyQt5
```

---

## Migrating Existing Database

If you have an existing `dnd_kids_resources.db`, run:

```bash
python _dev\init_database.py
```

This will create the new `statblock_jobs` table without affecting existing data.

---

## Advanced: Packaging as .exe

To create a standalone `.exe` file (optional):

```bash
pip install pyinstaller

# Build executable
pyinstaller --onefile --windowed _dev\launcher_app.py

# The .exe will be in dist\launcher_app.exe
```

---

## Summary

| Method | Server | Worker | Control | GUI |
|--------|--------|--------|---------|-----|
| GUI + Terminal | Terminal | Control Panel | Good | Yes ✓ |
| All Terminals | Terminal | Terminal | Full | No |

**Recommended:** Keep Flask server in terminal, use control panel for worker.

Server is intentionally separated for flexibility - you can have it running from `start-server.ps1` while managing the worker independently.
