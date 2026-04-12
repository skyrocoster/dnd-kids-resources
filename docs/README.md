# D&D Kids Resources - Documentation

This is the central documentation hub for the D&D Kids Resources project.

## Start Here

If you are new to the repo, begin with:
- [Getting Started Guide](guides/GETTING_STARTED.md) — Setup and project launch
- [File Structure](guides/FILE_STRUCTURE.md) — How the repository is organized
- [System Architecture](architecture/ARCHITECTURE.md) — How the app works

## Documentation by Topic

### 📐 Architecture & Design
- [System Architecture](architecture/ARCHITECTURE.md) — Component overview and data flow
- [Database Schema](architecture/SCHEMA_DESIGN.md) — Current table structure and seed sources
- [Schema Reference](architecture/schema_view.txt) — Full SQL schema dump
- [Database Restructuring Notes](architecture/DB_RESTRUCTURING_PLAN.md) — Historical cleanup work

### 🛠️ Development
- [Contributing Guidelines](development/CONTRIBUTING.md) — How to add cards and features
- [Color System & Configuration](development/COLORS.md) — Styling and class references

### 📋 Planning & Design Notes
- [Completed Phases](planning/PHASE_1_2_COMPLETE.md) — Historical summary of past work
- [Abilities & Skills Integration](planning/ABILITIES_WITH_SKILLS.md) — Historical notes on the abilities model
- [Abilities Migration](planning/ABILITIES_ID_MIGRATION.md) — Historical migration log
- [Queue System Design](planning/QUEUE_SYSTEM.md) — Design notes for AI parsing queue integration
- [Scaling Plan](planning/SCALING_PLAN.md) — Future project and architecture ideas

## Repo Structure Summary

```
docs/
├── README.md
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

## Notes

- `/docs` is the canonical documentation location.
- The top-level `README.md` is the project summary; detailed technical instructions belong in `/docs`.
- The `/docs/planning` folder contains design and historical notes, not always current implementation details.
