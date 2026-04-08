# D&D Kids Resources - Documentation

This is the central documentation hub for the D&D Kids Resources project.

## Quick Start

**New to the project?** Start here:
- [Getting Started Guide](guides/GETTING_STARTED.md) - How to run the project
- [File Structure](guides/FILE_STRUCTURE.md) - Project organization

## Documentation by Topic

### 📐 Architecture & Design
Learn how the system works:
- [System Architecture](architecture/ARCHITECTURE.md) - Component overview and data flow
- [Database Schema](architecture/SCHEMA_DESIGN.md) - Data model and relationships
- [Schema Reference](architecture/schema_view.txt) - Full SQL schema dump
- [Database Restructuring Notes](architecture/DB_RESTRUCTURING_PLAN.md) - **HISTORICAL** - Schema cleanup completed (April 2026)

### 🛠️ Development
Contributing and configuring:
- [Contributing Guidelines](development/CONTRIBUTING.md) - How to add new features
- [Color System & Configuration](development/COLORS.md) - Styling and color codes

### 📋 Planning & Migration
Project history and future plans:
- [Completed Phases](planning/PHASE_1_2_COMPLETE.md) - **HISTORICAL** - What was accomplished in phases 1-2 (April 2026)
- [Abilities & Skills Integration](planning/ABILITIES_WITH_SKILLS.md) - **HISTORICAL** - Database integration notes (completed)
- [Abilities Migration](planning/ABILITIES_ID_MIGRATION.md) - **HISTORICAL** - Database migration log
- [Database Restructuring](planning/DB_RESTRUCTURING_PLAN.md) - **HISTORICAL** - Schema cleanup notes
- [Queue System Design](planning/QUEUE_SYSTEM.md) - **ACTIVE** - Current job queue system for AI parsing
- [Scaling Plan](planning/SCALING_PLAN.md) - **IN PROGRESS** - Future scaling and feature roadmap

## File Organization

```
docs/
├── README.md (you are here)
├── guides/
│   ├── GETTING_STARTED.md
│   └── FILE_STRUCTURE.md
├── architecture/
│   ├── ARCHITECTURE.md
│   ├── SCHEMA_DESIGN.md
│   ├── schema_view.txt
│   └── DB_RESTRUCTURING_PLAN.md
├── development/
│   ├── CONTRIBUTING.md
│   └── COLORS.md
└── planning/
    ├── PHASE_1_2_COMPLETE.md
    ├── ABILITIES_WITH_SKILLS.md
    ├── ABILITIES_ID_MIGRATION.md
    ├── QUEUE_SYSTEM.md
    └── SCALING_PLAN.md
```

## Need Help?

- **How do I run this?** → [Getting Started](guides/GETTING_STARTED.md)
- **How is the code organized?** → [File Structure](guides/FILE_STRUCTURE.md)
- **How does the database work?** → [Database Schema](architecture/SCHEMA_DESIGN.md)
- **How do I add a new feature?** → [Contributing](development/CONTRIBUTING.md)
- **What's been completed?** → [Completed Phases](planning/PHASE_1_2_COMPLETE.md)

---

**All documentation is kept in this `/docs` directory to keep everything organized in one place.**
