# D&D Kids Resources - Scaling Plan

**Strategic implementation roadmap for multi-user, dynamic content management system.**

> **AI NOTE:** This document tracks implementation progress across multiple AI sessions. Update the status sections as work progresses. Add notes in the "Progress" columns and mark completed items with ✅.

---

## Document Navigation

| Section | Purpose |
|---------|---------|
| **[Quick Reference](#quick-reference)** | Phases at a glance |
| **[Overview](#overview)** | Why this plan exists |
| **[Phase-by-Phase Guide](#phase-by-phase-guide)** | Detailed implementation steps |
| **[Management Notes](#management-notes)** | Tracking & decisions made |

---

## Quick Reference

```
PHASE 0 (Planning)        | 0 code changes | 2-3 hours   | NO RISK
PHASE 1 (Backend Skeleton)| 4 new files    | 1.5 hours   | LOW RISK
PHASE 2 (Database)        | 9 files        | 3 hours     | MEDIUM RISK
PHASE 3 (CRUD + Auth)     | 3 hours        | MEDIUM-HIGH RISK
PHASE 4 (Advanced Features)| Later         | VERY HIGH RISK
```

**Current Status:** Phase 2 Complete (70% overall) - Backend + Database fully functional. Phase 3 (CRUD + Auth) in planning.

---

## Overview

### Why This Plan?

The current system is **static and file-based**:
- All card data lives in JSON files
- Frontend loads directly from those files
- No user accounts, no modifications, no dynamic printing

**Target system:**
- Users can log in
- Users can create/edit/delete cards
- Dynamic print builder (select cards → auto-format to A4)
- Multi-user permissions (own data, default data, shared data)

### Key Principles

1. **Test incrementally** - Each phase can run independently
2. **No breaking changes** - Current system keeps working during transition
3. **Database-agnostic** - Start simple (SQLite), upgrade later
4. **Frontend-independent** - API and frontend are separate concerns
5. **Version control** - Track every change, easy rollback

### Architecture Overview

```
Current State:
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─→ HTML (pages/)
       ├─→ JS (js/)
       ├─→ CSS (css/)
       └─→ JSON (data/)

Target State:
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ (HTTP requests)
       ↓
┌─────────────────────┐
│   Backend API       │
│  /api/spells        │
│  /api/weapons       │
│  /api/auth/login    │
└──────┬──────────────┘
       │ (SQL queries)
       ↓
┌─────────────────────┐
│   SQLite Database   │
│  cards table        │
│  users table        │
└─────────────────────┘
```

---

## Phase-by-Phase Guide

## **PHASE 0: Zero Risk (Planning & Documentation)**

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

**Objective:** Design schemas and document architecture. **Zero code execution.** Pure planning.

### 0.1 - Design Card Data Schema

**What:** Create a JSON schema that defines your card structure  
**Files to Create:**
- `backend/schema/card-schema.json`

**Template:**
```json
{
  "type": "object",
  "required": ["id", "title", "icon", "level"],
  "properties": {
    "id": { 
      "type": "string", 
      "description": "Unique identifier (e.g., 'spell-fireball-1')" 
    },
    "userId": { 
      "type": ["string", "null"], 
      "description": "Card owner. null = default/shared card" 
    },
    "type": { 
      "type": "string", 
      "enum": ["spell", "weapon", "condition", "npc", "location", "magic-item", "wild-shape", "action"],
      "description": "Card category" 
    },
    "title": { "type": "string" },
    "icon": { "type": "string" },
    "level": { "type": "string" },
    "explanation": { "type": "string" },
    "details": { "type": "array" },
    "isDefault": { "type": "boolean", "description": "If true, available to all users" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

**Testing:** Validate your existing JSON files against this schema  
**Time:** 30 minutes  
**Status:** ⬜ Not Started

---

### 0.2 - Document Backend Architecture

**What:** Write out planned folder structure & API endpoints  
**Files to Create:**
- `BACKEND_STRUCTURE.md`

**Should Include:**
```markdown
## Folder Structure
backend/
├── server.js
├── package.json
├── .env.example
├── config/
│   └── database.js
├── routes/
│   ├── spells.js
│   ├── weapons.js
│   ├── conditions.js
│   ├── npcs.js
│   ├── locations.js
│   ├── magic-items.js
│   ├── wild-shapes.js
│   ├── actions.js
│   ├── auth.js
│   └── export.js
├── middleware/
│   ├── auth.js
│   ├── validate.js
│   └── errorHandler.js
├── models/
│   ├── Card.js
│   └── User.js
├── scripts/
│   └── seed-database.js
├── migrations/
│   └── 001_create_tables.js
└── data/
    └── seed/

## API Design
Endpoints for each card type:
GET    /api/spells               (get all)
GET    /api/spells/:id           (get one)
POST   /api/spells               (create, requires auth)
PUT    /api/spells/:id           (update, requires ownership)
DELETE /api/spells/:id           (delete, requires ownership)

Similar endpoints for:
- /api/weapons
- /api/conditions
- /api/npcs
- /api/locations
- /api/magic-items
- /api/wild-shapes
- /api/actions

Utility endpoints:
POST   /api/auth/login           (user authentication)
POST   /api/auth/logout          (user logout)
GET    /api/auth/me              (current user info)
POST   /api/export/print         (generate A4 PDF/HTML)
```

**Time:** 1 hour  
**Status:** ⬜ Not Started

---

### 0.3 - Plan Authentication System

**What:** Document how users will be identified and what data they own  
**Files to Create:**
- `AUTHENTICATION_PLAN.md`

**Should Include:**
```markdown
## User System Design

### Login Method
- [ ] Session-based (cookie storage)
- [ ] JWT tokens (header-based)
- [ ] OAuth (3rd party, e.g., Google)
- [ ] Custom username/password

### User Ownership Model
- **Default Cards:** userId = null, available to everyone
- **User Cards:** userId = their ID, only they can modify
- **Shared Cards:** (Future feature) userId = creator, but shared list of IDs

### User Roles (Design for Future)
- [ ] Admin: Can create/edit/delete any card, manage users
- [ ] DM: Can create/edit/delete own cards only
- [ ] Player: Can view cards, create personal notes
- [ ] Guest: Can view default cards only

### Password Hashing
- What hashing algorithm? (bcrypt recommended)
- How to handle password reset?

### Session/Token Strategy
- How long until session expires?
- How to handle refresh tokens?
- Can users have multiple sessions?
```

**Time:** 30 minutes  
**Status:** ⬜ Not Started

---

## **PHASE 1: Low Risk (New Isolated Backend)**

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

**Objective:** Create backend in isolation. Frontend runs unchanged. Zero breaking changes.

### 1.1 - Set Up Backend Project

**What:** Create new Node.js backend folder with basic structure  
**Files to Create:**
- `backend/package.json`
- `backend/.env`
- `backend/.gitignore`
- `backend/server.js`

**Steps:**
```bash
# In workspace root
mkdir backend
cd backend

# Initialize Node project
npm init -y

# Install dependencies
npm install express dotenv cors
npm install --save-dev nodemon  (for development)
```

**`backend/package.json` (after npm init):**
```json
{
  "name": "dnd-kids-backend",
  "version": "1.0.0",
  "description": "Backend API for D&D Kids Resources",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

**`backend/.env`:**
```
PORT=3000
NODE_ENV=development
DATABASE_PATH=./cards.db
```

**`backend/.env.example` (for git):**
```
PORT=3000
NODE_ENV=development
DATABASE_PATH=./cards.db
```

**`backend/.gitignore`:**
```
node_modules/
.env
.DS_Store
*.db
```

**`backend/server.js`:**
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes (will add later)
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Testing:**
```bash
cd backend
npm start
# Should print: "Server running on http://localhost:3000"
# Visit http://localhost:3000/health in browser
# Should return: { "status": "Server running", ... }
```

**Time:** 20 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 1.2 - Create Echo API (One Test Endpoint)

**What:** Make backend serve your existing static JSON as an API  
**Files to Create:**
- `backend/routes/spells.js`
- `backend/data/spells.json` (copy from main data folder)

**`backend/routes/spells.js`:**
```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Load static JSON (temporary - will use database later)
function loadSpells() {
  const filePath = path.join(__dirname, '../data/spells.json');
  const rawData = fs.readFileSync(filePath);
  return JSON.parse(rawData);
}

// GET /api/spells - Get all spells
router.get('/', (req, res) => {
  try {
    const spells = loadSpells();
    res.json({ 
      success: true,
      count: spells.length,
      cards: spells 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

**Update `backend/server.js`:**
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

// Card routes
const spellsRouter = require('./routes/spells');
app.use('/api/spells', spellsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Copy data file:**
```bash
# Copy spells.json to backend/data/
cp ../data/spells.json backend/data/spells.json
```

**Testing:**
```bash
npm start
# Visit http://localhost:3000/api/spells
# Should return JSON with all spells
```

**Time:** 15 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 1.3 - Test Frontend + Backend Integration (Optional)

**What:** Verify frontend can load from API instead of JSON file  
**Objective:** Confirm data format is compatible

**Approach:** Add a toggle flag to `js/spells.js`:
```javascript
// At top of file
const USE_BACKEND_API = false;

// In loadSpells function
async function loadSpells() {
  let data;
  
  if (USE_BACKEND_API) {
    // Load from backend
    const response = await fetch('http://localhost:3000/api/spells');
    if (!response.ok) throw new Error('Failed to fetch from API');
    const json = await response.json();
    data = json.cards;
  } else {
    // Load from static JSON (current)
    const response = await fetch('../../data/spells.json');
    data = await response.json();
  }
  
  // Rest of function unchanged
  renderCards(data);
}
```

**Testing:**
1. Backend running: `npm start` (in backend folder)
2. Frontend running: Open `http://localhost:8000/pages/spell-cards.html`
3. Toggle `USE_BACKEND_API = false` → cards load from JSON ✅
4. Toggle `USE_BACKEND_API = true` → cards load from API ✅
5. Both look identical? If yes, integration works!

**Time:** 20 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

## **PHASE 2: Medium Risk (Database + Data Migration)**

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

**Objective:** Move data from JSON files to SQLite database. Frontend still works independently.

### 2.1 - Set Up SQLite Database

**What:** Install and configure SQLite  
**Why SQLite?** File-based (no external server), perfect for local development, can upgrade to PostgreSQL later

**Steps:**
```bash
cd backend
npm install better-sqlite3
```

**Create `backend/config/database.js`:**
```javascript
const Database = require('better-sqlite3');
const path = require('path');

// Use path from .env or default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../cards.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Simple initialization test
function initDatabase() {
  console.log('Database connected at:', dbPath);
  return db;
}

module.exports = { db, initDatabase };
```

**Testing:**
```bash
node -e "require('./config/database.js').initDatabase()"
# Should print: "Database connected at: ./cards.db"
# New file backend/cards.db should be created
```

**Time:** 20 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 2.2 - Create Database Schema

**What:** Create tables for cards and users  
**Files to Create:**
- `backend/migrations/001_create_cards_table.js`

**`backend/migrations/001_create_cards_table.js`:**
```javascript
const { db } = require('../config/database');

function createCardsTables() {
  console.log('Creating tables...');

  // Create cards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      userId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      level TEXT NOT NULL,
      explanation TEXT,
      details JSON,
      isDefault INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Create users table (for future)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_userId ON cards(userId);
    CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
    CREATE INDEX IF NOT EXISTS idx_cards_isDefault ON cards(isDefault);
  `);

  console.log('✅ Tables created');
}

// Run migration
createCardsTables();
```

**Testing:**
```bash
# Run migration
node backend/migrations/001_create_cards_table.js
# Should print: "✅ Tables created"

# Verify (open backend/cards.db in SQLite viewer)
# Should see: cards table, users table, 3 indexes
```

**Time:** 30 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 2.3 - Create Database Seed Script

**What:** Load your current JSON files into database as default cards  
**Files to Create:**
- `backend/scripts/seed-database.js`

**`backend/scripts/seed-database.js`:**
```javascript
const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

function seedDatabase() {
  console.log('Seeding database...');

  // Clear existing data (optional - comment out if you want to keep data)
  // db.exec('DELETE FROM cards');

  const cardTypes = [
    { file: 'spells.json', type: 'spell' },
    { file: 'weapons.json', type: 'weapon' },
    { file: 'conditions.json', type: 'condition' },
    { file: 'npcs.json', type: 'npc' },
    { file: 'locations.json', type: 'location' },
    { file: 'magic-items.json', type: 'magic-item' },
    { file: 'wild-shapes.json', type: 'wild-shape' }
  ];

  const insertCard = db.prepare(`
    INSERT INTO cards (id, userId, type, title, icon, level, explanation, details, isDefault, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  let totalCount = 0;

  cardTypes.forEach(({ file, type }) => {
    const filePath = path.join(__dirname, `../data/${file}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} not found, skipping...`);
      return;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const cards = JSON.parse(rawData);

    cards.forEach((card, index) => {
      insertCard.run(
        `default-${type}-${index}`,  // id
        null,                         // userId (null = default/shared)
        type,                         // type
        card.title,                   // title
        card.icon,                    // icon
        card.level,                   // level
        card.explanation || '',       // explanation
        JSON.stringify(card.details || []),  // details as JSON
        1,                            // isDefault = true
        new Date().toISOString()      // createdAt
      );
      totalCount++;
    });

    console.log(`✅ ${cards.length} ${type}s seeded`);
  });

  console.log(`\n✅ Total cards seeded: ${totalCount}`);
}

// Run seed
seedDatabase();
```

**Testing:**
```bash
# Copy data files to backend/data/ first
cp data/spells.json backend/data/
cp data/weapons.json backend/data/
# (repeat for all card types)

# Run seed script
node backend/scripts/seed-database.js
# Should print:
#   ✅ 27 spells seeded
#   ✅ 42 weapons seeded
#   ... etc

# Open backend/cards.db in SQLite viewer
# Should see all cards in the cards table
```

**Time:** 45 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 2.4 - Update API Routes to Use Database

**What:** Change API endpoints to read from SQLite instead of static JSON  
**Files to Update:**
- `backend/routes/spells.js` (and create similar for other card types)

**Updated `backend/routes/spells.js`:**
```javascript
const express = require('express');
const { db } = require('../config/database');

const router = express.Router();

// GET /api/spells - Get all spells
router.get('/', (req, res) => {
  try {
    const spells = db.prepare(`
      SELECT * FROM cards WHERE type = 'spell'
    `).all();

    res.json({ 
      success: true,
      count: spells.length,
      cards: spells 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/spells/:id - Get single spell
router.get('/:id', (req, res) => {
  try {
    const spell = db.prepare(`
      SELECT * FROM cards WHERE id = ? AND type = 'spell'
    `).get(req.params.id);

    if (!spell) {
      return res.status(404).json({ success: false, error: 'Spell not found' });
    }

    res.json({ success: true, card: spell });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

**Create additional routes:**
Create `backend/routes/` for:
- `weapons.js` (type: 'weapon')
- `conditions.js` (type: 'condition')
- `npcs.js` (type: 'npc')
- `locations.js` (type: 'location')
- `magic-items.js` (type: 'magic-item')
- `wild-shapes.js` (type: 'wild-shape')
- `actions.js` (type: 'action')

Each follows same pattern as spells.js, just with different type.

**Update `backend/server.js`:**
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

// Card routes
const spellsRouter = require('./routes/spells');
const weaponsRouter = require('./routes/weapons');
const conditionsRouter = require('./routes/conditions');
const npcsRouter = require('./routes/npcs');
const locationsRouter = require('./routes/locations');
const magicItemsRouter = require('./routes/magic-items');
const wildShapesRouter = require('./routes/wild-shapes');
const actionsRouter = require('./routes/actions');

app.use('/api/spells', spellsRouter);
app.use('/api/weapons', weaponsRouter);
app.use('/api/conditions', conditionsRouter);
app.use('/api/npcs', npcsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/magic-items', magicItemsRouter);
app.use('/api/wild-shapes', wildShapesRouter);
app.use('/api/actions', actionsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Testing:**
```bash
npm start
# Visit http://localhost:3000/api/spells
# Should return all spells from database (not JSON file)
# Compare with previous response - data should be identical
```

**Time:** 20 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 2.5 - Switch Frontend to Use API (All Card Types)

**What:** Update all card initializers to load from API, remove JSON fallback  
**Files to Update:**
- `js/spells.js`
- `js/weapons.js`
- `js/conditions.js`
- `js/npcs.js`
- `js/locations.js`
- `js/magic-items.js`
- `js/wild-shapes.js`
- `js/actions.js`

**Pattern (update each file):**

```javascript
// OLD CODE (delete this):
// fetch('../../data/spells.json')

// NEW CODE:
async function loadCards(apiEndpoint, pageTitle, pageSubtitle) {
  try {
    const response = await fetch(`http://localhost:3000/api/${apiEndpoint}`);
    if (!response.ok) throw new Error('Failed to load cards');
    
    const json = await response.json();
    const cards = json.cards;
    
    renderCards(cards, pageTitle, pageSubtitle);
  } catch (error) {
    console.error('Error loading cards:', error);
    document.body.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

// Call when page loads
loadCards('spells', 'Spell Cards', 'Reference Cards for D&D Spells');
```

**Testing (Critical):**
1. Stop and restart backend: `npm start`
2. Open each card page in browser:
   - http://localhost:8000/pages/spell-cards.html
   - http://localhost:8000/pages/weapon-cards.html
   - http://localhost:8000/pages/condition-cards.html
   - (etc. for all card types)
3. Verify cards load and look correct
4. Check browser console for errors
5. If all pages work:
   - ✅ You can now **delete the JSON files** (keep backup copy first)
   - ✅ Database is now source of truth

**Time:** 30 minutes  
**Status:** ⬜ Not Started
**Notes:**
- CRITICAL: Test all card types before deleting JSON files
- Keep backup of data/ folder just in case

---

## **PHASE 3: CRUD Operations + Basic Auth**

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Completed

**Objective:** Users can now create, update, and delete cards. Basic auth prevents anonymous modifications.

### 3.1 - Add CRUD Endpoints (POST/PUT/DELETE)

**What:** Enable creating, updating, and deleting cards via API  
**Files to Create/Update:**
- `backend/routes/spells.js` (add POST, PUT, DELETE)
- Same for weapons.js, conditions.js, etc.

**Updated `backend/routes/spells.js`:**
```javascript
const express = require('express');
const { db } = require('../config/database');

const router = express.Router();

// GET /api/spells - Get all spells
router.get('/', (req, res) => {
  try {
    const spells = db.prepare(`
      SELECT * FROM cards WHERE type = 'spell'
    `).all();

    res.json({ 
      success: true,
      count: spells.length,
      cards: spells 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/spells/:id - Get single spell
router.get('/:id', (req, res) => {
  try {
    const spell = db.prepare(`
      SELECT * FROM cards WHERE id = ? AND type = 'spell'
    `).get(req.params.id);

    if (!spell) {
      return res.status(404).json({ success: false, error: 'Spell not found' });
    }

    res.json({ success: true, card: spell });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/spells - Create new spell
router.post('/', (req, res) => {
  try {
    const { title, icon, level, explanation, details } = req.body;
    const userId = req.user?.id || null;  // TODO: Implement auth middleware

    // Basic validation
    if (!title || !icon || !level) {
      return res.status(400).json({ 
        success: false, 
        error: 'title, icon, and level are required' 
      });
    }

    const id = `spell-${Date.now()}`;
    
    db.prepare(`
      INSERT INTO cards (id, userId, type, title, icon, level, explanation, details, isDefault, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      userId,
      'spell',
      title,
      icon,
      level,
      explanation || '',
      JSON.stringify(details || []),
      userId === null ? 1 : 0  // isDefault if no user
    );

    const newSpell = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    res.status(201).json({ success: true, card: newSpell });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/spells/:id - Update spell
router.put('/:id', (req, res) => {
  try {
    const { title, icon, level, explanation, details } = req.body;
    const userId = req.user?.id || null;  // TODO: Implement auth middleware

    // Check ownership
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Spell not found' });
    }

    if (card.userId !== userId && card.userId !== null) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only edit cards you created' 
      });
    }

    // Update
    db.prepare(`
      UPDATE cards 
      SET title = ?, icon = ?, level = ?, explanation = ?, details = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || card.title,
      icon || card.icon,
      level || card.level,
      explanation || card.explanation,
      details ? JSON.stringify(details) : card.details,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    res.json({ success: true, card: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/spells/:id - Delete spell
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user?.id || null;  // TODO: Implement auth middleware

    // Check ownership
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Spell not found' });
    }

    if (card.userId !== userId && card.userId !== null) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only delete cards you created' 
      });
    }

    db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Spell deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

**Testing with curl/Postman:**
```bash
# CREATE
curl -X POST http://localhost:3000/api/spells \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Spell",
    "icon": "✨",
    "level": "level1",
    "explanation": "A test spell"
  }'
# Response should have new card with id

# UPDATE
curl -X PUT http://localhost:3000/api/spells/{id} \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Spell"}'

# DELETE
curl -X DELETE http://localhost:3000/api/spells/{id}

# VERIFY it's gone
curl http://localhost:3000/api/spells
```

**Time:** 1.5 hours (do all card types)  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 3.2 - Add Input Validation

**What:** Validate all inputs before saving to database  
**Files to Create:**
- `backend/middleware/validate.js`

**`backend/middleware/validate.js`:**
```javascript
function validateCard(req, res, next) {
  const { title, icon, level, details } = req.body;

  // Check required fields
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required and must be a string' });
  }

  if (!icon || typeof icon !== 'string' || icon.trim() === '') {
    return res.status(400).json({ error: 'Icon is required and must be a string' });
  }

  if (!level || typeof level !== 'string' || level.trim() === '') {
    return res.status(400).json({ error: 'Level is required and must be a string' });
  }

  if (details && !Array.isArray(details)) {
    return res.status(400).json({ error: 'Details must be an array' });
  }

  // Sanitize (trim whitespace)
  req.body.title = title.trim();
  req.body.icon = icon.trim();
  req.body.level = level.trim();

  // Limit field lengths
  if (req.body.title.length > 200) {
    return res.status(400).json({ error: 'Title must be less than 200 characters' });
  }

  if (req.body.icon.length > 10) {
    return res.status(400).json({ error: 'Icon must be less than 10 characters' });
  }

  next();
}

module.exports = { validateCard };
```

**Update `backend/routes/spells.js`:**
```javascript
const { validateCard } = require('../middleware/validate');

// Apply to relevant routes
router.post('/', validateCard, (req, res) => { ... });
router.put('/:id', validateCard, (req, res) => { ... });
```

**Testing:**
```bash
# Test with missing title
curl -X POST http://localhost:3000/api/spells \
  -H "Content-Type: application/json" \
  -d '{"icon": "✨", "level": "level1"}'
# Should get 400 error

# Test with invalid details
curl -X POST http://localhost:3000/api/spells \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "icon": "✨",
    "level": "level1",
    "details": "not-an-array"
  }'
# Should get 400 error

# Test with valid data
curl -X POST http://localhost:3000/api/spells \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "icon": "✨",
    "level": "level1",
    "details": []
  }'
# Should succeed
```

**Time:** 45 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

### 3.3 - Add Basic Auth Middleware (Stub)

**What:** Create placeholder auth system for testing user-owned cards  
**Files to Create:**
- `backend/middleware/auth.js`

**`backend/middleware/auth.js`:**
```javascript
// Simple stub auth: read userId from Authorization header
// Format: Authorization: Bearer user123
// In production, this would validate JWT/session

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.user = {
      id: authHeader.substring(7)  // Extract "user123" from "Bearer user123"
    };
  } else {
    req.user = null;  // Anonymous user
  }

  next();
}

module.exports = authMiddleware;
```

**Update `backend/server.js`:**
```javascript
const authMiddleware = require('./middleware/auth');

// Use auth on all routes
app.use(authMiddleware);

// Now req.user will be set on all requests
```

**Testing:**
```bash
# Anonymous user (no auth header)
curl http://localhost:3000/api/spells
# userId = null

# Authenticated user
curl http://localhost:3000/api/spells \
  -H "Authorization: Bearer user123"
# userId = "user123"

# Create spell as user123
curl -X POST http://localhost:3000/api/spells \
  -H "Authorization: Bearer user123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Spell",
    "icon": "✨",
    "level": "level1"
  }'
# Card is created with userId = "user123"
```

**Time:** 30 minutes  
**Status:** ⬜ Not Started
**Notes:**
- This is NOT real authentication yet - just a placeholder
- Real login system comes in Phase 3.4 or later

---

### 3.4 - Add Ownership Checks

**What:** Prevent users from editing/deleting other users' cards  
**Files to Update:**
- All route files (spells.js, weapons.js, etc.)

**Pattern (already in PUT and DELETE handlers above):**
```javascript
// Check ownership
const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);

if (!card) {
  return res.status(404).json({ error: 'Card not found' });
}

// User can edit if: they own it, OR card is default (userId = null)
if (card.userId !== null && card.userId !== req.user?.id) {
  return res.status(403).json({ 
    error: 'You can only modify cards you created' 
  });
}
```

**Testing:**
```bash
# User A creates a spell
curl -X POST http://localhost:3000/api/spells \
  -H "Authorization: Bearer userA" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User A Spell",
    "icon": "✨",
    "level": "level1"
  }'
# Get the spell id from response

SPELL_ID="spell-..."

# User B tries to update it
curl -X PUT http://localhost:3000/api/spells/$SPELL_ID \
  -H "Authorization: Bearer userB" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hacked"}'
# Should get 403 Forbidden

# User A updates it - should work
curl -X PUT http://localhost:3000/api/spells/$SPELL_ID \
  -H "Authorization: Bearer userA" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated by A"}'
# Should succeed
```

**Time:** 30 minutes  
**Status:** ⬜ Not Started
**Notes:**
- 

---

## **PHASE 4: Advanced Features (Print Export, Real Auth)**

**Status:** ⬜ Not Started

**Objective:** Dynamic printing and real user authentication. Start only after Phases 1-3 are stable.

### 4.1 - Print Export Endpoint

**Objective:** Dynamic A4 PDF generation based on selected cards

**When to Start:** After Phase 3.4 is complete and stable

**Time Estimate:** 2+ hours  
**Risk:** Very High

---

### 4.2 - Real Authentication (JWT or Sessions)

**Objective:** Replace stub auth with real login/logout system

**When to Start:** After 4.1 or parallel with 4.1

**Time Estimate:** 2-3 hours  
**Risk:** Very High (security-critical)

---

## Management Notes

### Current Status Summary

| Phase | Status | Completion | Notes |
|-------|--------|------------|-------|
| 0 (Planning) | ✅ | 100% | Architecture documented in ARCHITECTURE.md, SCHEMA_DESIGN.md |
| 1 (Backend Setup) | ✅ | 100% | Flask server running on port 8000, serving static/DB data |
| 2 (Database) | ✅ | 100% | SQLite with 8 tables: spells, conditions, creatures, skills, weapons, wild_shapes, abilities, damage_types |
| 3 (CRUD + Auth) | ⏳ | 25% | GET/Read endpoints 100% working. POST/PUT/DELETE not implemented. No auth system yet. |
| 4 (Advanced) | ⬜ | 0% | Print export and real auth planned for future |

---

### Decision Log

**Date | Decision | Rationale**

- April 4, 2026 | Using Flask (Python) instead of Node.js/Express | Faster iteration, existing Python knowledge, venv already set up
- April 4, 2026 | Read-only API first (GET endpoints only) | Safer approach, test data migration, plan write-layer later
- April 4, 2026 | SQLite for persistent storage | File-based, portable, sufficient for current scale, can upgrade to PostgreSQL later
- April 4, 2026 | Data enrichment in API response | Metadata (emoji, colors) fetched from abilities/damage_types tables on read
- April 4, 2026 | CORS enabled for development | Frontend and backend running on different ports during development
- April 4, 2026 | No frontend refactor during backend rollout | Frontend still works with API, backward compatible with JSON files

---

### Known Issues / Blockers

**Working:**
- ✅ API endpoints for all read operations (GET /api/spells, /api/conditions, /api/creatures, /api/skills)
- ✅ Data enrichment with metadata (ability emojis/colors, damage type emojis/colors)
- ✅ Database migrations completed
- ✅ Frontend loads from API seamlessly

**Not Implemented (Phase 3+):**
- ❌ No POST/PUT/DELETE endpoints (read-only API)
- ❌ No users table with authentication
- ❌ No permission system (can't edit own vs. default cards yet)
- ❌ No userId field in cards table
- ❌ No print export endpoint (Phase 4)
- ❌ No real authentication system (Phase 4)

**Next Blockers:**
- To enable writes: Need to add POST/PUT/DELETE endpoints
- To enable multi-user: Need users table + auth system (JWT or sessions)
- To track ownership: Need to add userId to cards table

---

### Testing Checkpoints

**Phase 1-2 Completed - All Passing:**
- ✅ Flask server runs without errors
- ✅ API endpoints return valid JSON structure
- ✅ Frontend loads from API without breaking
- ✅ No console errors in browser
- ✅ All card types work (spells, conditions, creatures, skills, weapons)
- ✅ Data enrichment working (emoji/colors from metadata tables)
- ✅ Backup of working state exists (git commit f6537d1)

**Phase 3 - Before Write Operations:**
- [ ] Design POST endpoint for creating new cards
- [ ] Test card creation with userId validation
- [ ] Implement PUT for updating cards (ownership check)
- [ ] Implement DELETE with authorization
- [ ] Create users table and basic auth
- [ ] Test multi-user isolation
- [ ] Backup database before first write operation

---

### Rollback Strategy

If something breaks during a phase:

1. **Quick Revert:** Restore from git
   ```bash
   git log --oneline
   git checkout <safe-commit-hash>
   ```

2. **Data Recovery:** Database backups
   ```bash
   cp cards.db cards.db.backup
   ```

3. **Component Isolation:** Each phase is independent
   - Phase 1 breaks? → Delete backend/ folder, keep frontend
   - Phase 2 breaks? → Drop database, restore from seed

---

### Next Steps

**Phase 3: CRUD + Authentication (When Ready)**

Recommended approach:
1. **Design Phase 3.1:** Add userId field to cards table + create users table
2. **Implement Phase 3.2:** Add POST endpoint for creating new cards (with userId)
3. **Implement Phase 3.3:** Add PUT endpoint for updating cards (with ownership check)
4. **Implement Phase 3.4:** Add DELETE endpoint (with authorization)
5. **Implement Phase 3.5:** Basic authentication (JWT or session-based)
6. **Test Phase 3:** Full CRUD workflow with multiple users

**Phase 4: Advanced Features (After Phase 3)**
- Print export endpoint (PDF or formatted HTML)
- Real authentication UI (login form)
- User dashboard (my cards, shared cards, etc.)

**Safe To Start When:**
- ✅ Phase 2 is fully tested and backed up (DONE - git commit f6537d1)
- ✅ Frontend is stable (DONE)
- ✅ Read API is reliable (DONE)

**Report back with:**
- Which Phase 3 step to start with
- Any new blockers or design questions

---

**Document Version:** 1.1  
**Last Updated:** April 4, 2026  
**Implementation Status:** 70% complete (Phases 0-2 done, Phase 3 ready to start)  
**Next Review:** When Phase 3 work begins
