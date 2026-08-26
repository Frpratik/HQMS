# 🏥 HQMS — Multi-Tenant Smart Hospital Virtual Queue & Healthcare SaaS

[![Multi-Tenant SaaS](https://img.shields.io/badge/Architecture-Multi--Tenant_B2B_SaaS-purple.svg)](https://github.com/Frpratik/HQMS)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-34%20Passed%20(100%25)-success.svg)](#-automated-test-suite)

> **Enterprise-grade Multi-Tenant Healthcare SaaS for hospital virtual queueing, automated 1-click tenant onboarding, statistical wait predictions, clinical consultation pacing, zero-install mobile live queue tracking, and real-time WebSocket synchronization.**

---

## 🌟 Core Product Capabilities

- **🏢 Multi-Tenant Data & Security Isolation**: Manage unlimited hospital tenants on a single shared codebase with absolute data isolation, independent token sequence counters, and scoped RBAC boundaries.
- **🛡️ Isolated Super Admin Platform Gateway**: Secret master portal (`/platform-control/login`) with 1-click hospital provisioning, metadata editing, tenant suspension, and cascade deletion.
- **🏥 Hospital Admin Full CRUD Operations Suite**: Self-service management with complete Create, Read, Update, and Delete (CRUD) controls for clinical departments, consultation rooms, doctor/receptionist directory & password resets, and live OPD queue deployments.
- **✉️ Automated Single-Email Dispatch Engine**: Built-in Gmail SMTP engine sending welcome emails to new hospital admins and role-specific invitation credentials to Doctors & Receptionists.
- **📱 Zero-Install Patient Live Queue Tracker**: Patients track their turn on mobile web via unguessable, secure public URLs (`/q/:publicId`) with live ETA windows, audio chimes, and "Stepping Away" / "Returning" presence signals.
- **🩺 1-Click Doctor Workstation**: Fast consultation flow (`CALL PATIENT`, `Start Serving`, `Complete`, `Skip`, `Did Not Appear`). Automatically resumes paused queues when calling patients.
- **🖨️ Receptionist Walk-In Desk**: Instant patient registration (<5 seconds), priority classification (`Normal`, `High`, `Emergency`), and thermal-formatted printable token slips with QR codes.
- **📺 Public TV Waiting Board**: High-contrast, privacy-safe display (`/display/:id`) for waiting area wall-mounted screens with hospital tenant branding and live queue tickers.
- **🔒 Deterministic Queue Engine & FSM**: Finite State Machine with pessimistic database locking (`with_for_update`) guarantees zero sequence collisions or race conditions under high concurrent staff actions.
- **⚡ Namespaced WebSocket Infrastructure**: Real-time broadcast engine syncing Doctors, Receptionists, TV Displays, and Mobile Trackers instantly.

---

## 📸 Product Showcase

> HQMS provides dedicated interfaces for hospital administrators, physicians, patients, and public waiting areas, connected through a real-time virtual queue engine.

### 🛡️ Platform Super Administration & Hospital Onboarding

<p align="center">
  <img src="./Screenshots/Super%20Admin%20Login.png" width="48%" alt="Platform Super Admin Master Gateway" />
  <img src="./Screenshots/Super%20Admin%20Console.png" width="48%" alt="Platform Fleet Telemetry & Tenant Management" />
</p>

* **Platform Master Login**: Secure 256-bit encrypted authentication gateway restricted to platform super administrators.
* **Super Admin Console**: Centralized multi-tenant fleet overview with live telemetry across all provisioned hospital facilities, active branches, staff accounts, and OPD engines.

<p align="center">
  <img src="./Screenshots/Onboard%20Hospital.png" width="70%" alt="1-Click Hospital Onboarding Modal" />
</p>

* **1-Click Atomic Hospital Onboarding**: Instant provisioning modal creating an isolated tenant partition, administrator credentials, and automated welcome email dispatch.

---

### 🏥 Hospital Administration & Clinical Configuration

<p align="center">
  <img src="./Screenshots/Hospital%20Admin%20Login.png" width="48%" alt="Hospital Admin Workstation Sign In" />
  <img src="./Screenshots/Hospital%20Admin%20Console.png" width="48%" alt="Hospital Operations Suite" />
</p>

* **Hospital Admin Sign In**: Dedicated workstation portal for hospital administrators and clinical managers.
* **Hospital Admin Console**: Operations workspace for managing departments, examination rooms, staff directories, and active OPD queue engines.

<p align="center">
  <img src="./Screenshots/Hospital%20Admin%20Add%20Doctor.png" width="48%" alt="Doctor Onboarding Confirmation" />
  <img src="./Screenshots/Hospital%20Admin%20Add%20Receptionist.png" width="48%" alt="Receptionist Onboarding Confirmation" />
</p>

* **Physician Onboarding**: Provisioning modal for doctors with automatic system invitation and credential generation.
* **Receptionist Onboarding**: Front desk staff account generation with immediate station role assignment and email dispatch.

<p align="center">
  <img src="./Screenshots/Hospital%20Admin%20Add%20OPD%20Queue.png" width="48%" alt="OPD Queue Deployment" />
  <img src="./Screenshots/Hospital%20Admin%20Assign%20Doctor%20to%20OPD.png" width="48%" alt="Physician Queue Assignment" />
</p>

* **OPD Queue Deployment**: Real-time queue creation with customized token prefixes, consultation pacing targets, and department linking.
* **Physician Queue Assignment**: Operational controls to assign designated doctors and examination rooms to active OPD queues.

---

### 👥 Receptionist Desk & Patient Intake

<p align="center">
  <img src="./Screenshots/Receptionist%20Login.png" width="48%" alt="Receptionist Station Login" />
  <img src="./Screenshots/Receptionist%20Console.png" width="48%" alt="Receptionist Intake Desk" />
</p>

* **Receptionist Station Sign In**: Rapid workstation authentication for front desk receptionists.
* **Receptionist Console**: Real-time patient intake board displaying live queue progress, priority triage status, and stepped-away patients.

<p align="center">
  <img src="./Screenshots/Receptionist%20Add%20Patient.png" width="48%" alt="Walk-In Registration Modal" />
  <img src="./Screenshots/Receptionist%20Patient%20Slip.png" width="48%" alt="Printable Thermal Token Slip" />
</p>

* **Walk-In Registration & Triage**: Rapid intake modal (<5 seconds) capturing patient details, priority classification (Normal, High, Emergency), and triage notes.
* **Printable Thermal Token Slip**: High-contrast printable consultation pass featuring token numbers, estimated wait windows, and scan-to-track QR codes.

---

### 🩺 Physician Workstation & Clinical Pacing

<p align="center">
  <img src="./Screenshots/Doctor%20Login.png" width="48%" alt="Doctor Clinical Station Login" />
  <img src="./Screenshots/Doctor%20Console.png" width="48%" alt="Doctor Examination Command Center" />
</p>

* **Doctor Station Sign In**: Direct authentication portal for attending clinical physicians.
* **Doctor Console**: 1-click clinical workstation for advancing virtual queues, checking corridor wait counts, and monitoring pacing timers.

<p align="center">
  <img src="./Screenshots/Doctor%20Calling%20Patient.png" width="48%" alt="Doctor Calling Patient" />
  <img src="./Screenshots/Doctor%20Completing%20Patient.png" width="48%" alt="Active Consultation with Elapsed Timer" />
</p>

* **Calling Patient to Examination Room**: One-click action notifying the next patient in line and broadcasting immediate visual/audio chimes to waiting room displays.
* **Active Consultation & Pacing**: Real-time elapsed consultation timer with controls to complete the visit, advance to the next patient, or handle skips.

<p align="center">
  <img src="./Screenshots/Doctor%20Interface%20When%20Pausing%20Queue.png" width="48%" alt="Queue Pause Modal" />
  <img src="./Screenshots/Doctor%20Interface%20When%20Queue%20Paused.png" width="48%" alt="Doctor Paused State Banner" />
</p>

* **Queue Pause Configuration**: Modal allowing doctors to set clinical pause reasons (emergency ward call, rounds) and expected resumption estimates.
* **Active Pause State Banner**: Notice banner indicating active queue suspension, automatically updating patient mobile screens and TV waiting boards.

<p align="center">
  <img src="./Screenshots/Dr%20Waiting%20for%20Patient.png" width="70%" alt="Physician Waiting for Patient Entry" />
</p>

* **Physician Waiting for Patient Entry**: Cabin standby state showing patient token calling status while the patient walks into the examination room.

---

### 📱 Patient Live Virtual Queue Experience

<p align="center">
  <img src="./Screenshots/Patient%20Interface.png" width="48%" alt="Mobile Live Queue Pass" />
  <img src="./Screenshots/Patient%20Interface%202.png" width="48%" alt="Patient Presence & Stepping Away Controls" />
</p>

* **Live Mobile Queue Tracker**: Zero-install mobile web tracker displaying real-time queue position, assigned doctor, examination cabin, and dynamic wait times.
* **Presence & Stepping Away Signals**: Self-service patient controls to safely step away to the cafeteria or pharmacy without losing queue position.

<p align="center">
  <img src="./Screenshots/Patient%20Screen%20When%20Doctor%20Is%20Waiting.png" width="48%" alt="Escalated Turn Called Alert" />
  <img src="./Screenshots/Patient%20When%20Consultation%20Is%20Over.png" width="48%" alt="Consultation Completed State" />
</p>

* **Turn Called Screen Alert**: High-contrast, audio-enabled alert prompting the patient to proceed immediately to the doctor's consultation cabin.
* **Consultation Completed Confirmation**: Clean final state confirming completion of the medical consultation.

---

### 📺 Public TV Waiting Room Display Board

<p align="center">
  <img src="./Screenshots/TV%20Display.png" width="48%" alt="Public TV Waiting Room Board" />
  <img src="./Screenshots/TV%20Display%20When%20Queue%20Paused.png" width="48%" alt="TV Display During Pause State" />
</p>

* **Public TV Waiting Room Display**: Privacy-safe, high-contrast board for wall-mounted clinic monitors showing active tokens and upcoming queue positions.
* **TV Display During Queue Pause**: Real-time procedure pause notification keeping patients in waiting areas informed of doctor availability.

<p align="center">
  <img src="./Screenshots/TV%20Screen%20When%20Doctor%20Is%20Waiting.png" width="70%" alt="TV Screen Active Turn Calling" />
</p>

* **TV Screen Active Calling Notice**: Full-screen visual and audio chime alerting the called patient to enter the consultation room immediately.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Platform_Super_Admin ["🛡️ Isolated Super Admin Gateway (/platform-control/login)"]
        SA[Super Admin: super.admin@platform.com]
        Provision["1-Click Atomic Hospital Provisioning"]
        Fleet["Multi-Tenant Fleet Telemetry & Cascade Deletion"]
    end

    subgraph Tenant_Apex ["🏥 Tenant 1: Apex Multi-Specialty Hospital (slug: apex)"]
        HA1[Hospital Admin: admin@apex.com]
        RD1[Reception Desk: reception@hospital.com]
        DC1[Doctor Console: doctor@hospital.com]
        Q1["Cardiology OPD Queue (CRD-001, CRD-002...)"]
        TV1["Public TV Display Board (/display/:queueId)"]
    end

    subgraph Tenant_CityCare ["🏥 Tenant 2: City Care Clinic (slug: city-care)"]
        HA2[Hospital Admin: admin@citycare.com]
        RD2[Reception Desk]
        DC2[Doctor Console]
        Q2["Pediatrics Queue (PED-001, PED-002...)"]
        TV2["Public TV Display Board"]
    end

    subgraph Isolated_Patient_Mobile ["📱 Patient Live Virtual Queue Tracker (/q/:publicId)"]
        P1["Patient Vikram: CRD-005 (Ahead: 2 | Est: 20m)"]
        P2["Patient Sarah: PED-002 (Ahead: 1 | Est: 10m)"]
    end

    SA -->|Provisions & Manages| Tenant_Apex
    SA -->|Provisions & Manages| Tenant_CityCare
    Tenant_Apex -->|Emits WebSocket Events| TV1
    Tenant_Apex -->|Branded Live Mobile Tracker| P1
    Tenant_CityCare -->|Emits WebSocket Events| TV2
    Tenant_CityCare -->|Branded Live Mobile Tracker| P2
```

---

## 🚀 Workstation Portals & Credentials

When running locally:

| Station / Interface | URL | Access / Role | Purpose |
| :--- | :--- | :--- | :--- |
| **🌐 Public Landing & Patient Tracker** | [`http://localhost:3000/`](http://localhost:3000/) | *Public* | Patient tracker lookup & system overview |
| **🛡️ Super Admin Master Gateway** *(Secret)* | [`http://localhost:3000/platform-control/login`](http://localhost:3000/platform-control/login) | `super.admin@platform.com`<br>`supersecurepass` | Multi-tenant hospital fleet management |
| **🔐 Staff Workstation Login** | [`http://localhost:3000/login`](http://localhost:3000/login) | *Hospital Staff* | Unified sign-in for Doctors, Receptionists & Admins |
| **🏥 Hospital Admin Console** | [`http://localhost:3000/admin/departments`](http://localhost:3000/admin/departments) | `admin@apex.com`<br>`Admin123!` | Department setup, rooms, staff & OPD queues |
| **🩺 Doctor Workstation** | [`http://localhost:3000/doctor`](http://localhost:3000/doctor) | `doctor@hospital.com`<br>`Doctor123!` | Real-time consultations, 1-click calling & patient skip |
| **👥 Reception Desk** | [`http://localhost:3000/reception`](http://localhost:3000/reception) | `reception@hospital.com`<br>`Recep123!` | Walk-in intake, priority triage & thermal token printing |
| **📺 Public TV Waiting Board** | [`http://localhost:3000/display/:id`](http://localhost:3000/display/demo) | *No Login Required* | Fullscreen privacy-safe waiting room display |
| **📱 Patient Mobile Tracker** | [`http://localhost:3000/q/:publicId`](http://localhost:3000/q/demo) | *No Login Required* | Live wait time, queue position & step-away controls |
| **⚡ Interactive Swagger API Docs** | [`http://127.0.0.1:8000/api/v1/docs`](http://127.0.0.1:8000/api/v1/docs) | *FastAPI OpenAPI 3.0* | Interactive API endpoint explorer |

---

## 🛠️ Quickstart & Development

### 1. Backend Setup
```bash
# In project root
python -m venv venv
venv\Scripts\activate  # Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r backend/requirements.txt

# Start FastAPI backend (Port 8000)
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start Next.js frontend (Port 3000)
npm run dev
```

---

## 🧪 Automated Test Suite

The test suite covers full multi-tenant isolation, 1-click provisioning, role-based access control, queue state transitions, concurrent token locking, and WebSocket synchronization.

```bash
# Run all 34 integration & unit tests
python -m pytest backend/tests -v
```

```
======================= 34 passed in 18.06s =======================
```

---

## 🔑 Environment Variables Configuration

Create a `.env` file in the root and `backend/` directory:

```env
# Application
ENVIRONMENT=development
PROJECT_NAME="HQMS - Smart Hospital Virtual Queue"
DATABASE_URL=sqlite+aiosqlite:///./hqms_local.db  # Or PostgreSQL: postgresql+asyncpg://...
FRONTEND_URL=http://localhost:3000

# Live Gmail SMTP Engine
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_TLS=true
# Notifications
NOTIFICATION_PROVIDER=mock
```

---

## 📄 License
MIT License. Built for hospitals, healthcare systems, and clinical networks.
