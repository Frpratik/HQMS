# HQMS — Smart Hospital Virtual Queue & Token Management Platform

HQMS is an enterprise-grade, real-time outpatient queue orchestration system designed to eliminate waiting room congestion in hospitals and clinics.

---

## Key Product Characteristics
- **Token Identification vs. Queue Position**: Immutable token numbers (e.g. `CARD-001`) with dynamic eligibility and position reordering.
- **Zero-Friction Patient Access**: Secure, signed mobile web links with no app install or user account required.
- **Minimal-Click Staff UI**: 1-click `Complete & Call Next` doctor workflow; fast walk-in patient check-in for reception.
- **Deterministic Queue Engine**: Atomic state transitions with PostgreSQL row-level locks preventing race conditions.

---

## Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2
- **Database**: PostgreSQL 16 (Authoritative source of truth)
- **Cache / Pub-Sub**: Redis 7
- **Background Worker**: `arq` (async Redis queue)
- **Frontend**: Next.js 14 / React 18 / Tailwind CSS
- **Containerization**: Docker Compose

---

## Local Development Setup

### 1. Environment Configuration
```bash
cp .env.example .env
```

### 2. Start PostgreSQL & Redis Infrastructure
```bash
docker compose up -d postgres redis
```

### 3. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Run Automated Test Suite
```bash
python -m pytest backend/tests -v
```

### 5. Start FastAPI Development Server
```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```
- API Documentation: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
