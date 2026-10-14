# PrimeWave Resource Reservation System

A high-reliability full-stack web application designed for organizations to centrally coordinate, track, and reserve shared resources (meeting suites, high-compute engineering rigs, media kits, and company vehicles) with **hardware/database-level concurrency safety** and zero double-bookings.

Built for the **PrimeWave Lab Software Engineering Internship Technical Assessment**.

---

## 1. Project Overview & Business Problem

### The Challenge
As organizations grow, coordinating shared facilities, specialized equipment, and company assets across distributed teams through manual communication (chat channels, spreadsheets, informal messages) inevitably breaks down. This leads to:
- **Overlapping double-bookings** and scheduling conflicts during client demos and critical sprints.
- **Uncertain real-time availability**, wasting valuable employee time searching for vacant spaces.
- **Lost operational visibility**, lacking utilization statistics and an audit trail of cancellations.

### The Solution
PrimeWave Core provides a single pane of glass for organizational resources:
1. **Concurrency-Safe Reservations**: Double-bookings are blocked at the PostgreSQL engine level using a `btree_gist` exclusion constraint (`tstzrange` with half-open intervals `[)`), eliminating race conditions under concurrent requests.
2. **Interactive Visual Availability**: A live 08:00–18:00 timeline shows occupied vs. free blocks; clicking any free window pre-fills the booking modal.
3. **Smart Conflict Resolution**: When an overlap is attempted, the system catches the conflict and immediately calculates and suggests the **next available free slot**.
4. **Soft-Delete Lifecycle**: Cancelled bookings immediately free the slot on the database constraint while preserving full historical records for audits.
5. **Role-Based Access Control**: Admins can manage catalog assets, toggle operational status, and inspect all organizational bookings; members can reserve and manage their own bookings.

---

## 2. Technology Stack & Rationale

| Layer | Technology | Rationale |
|---|---|---|
| **Full-Stack Framework** | **Next.js (App Router)** | Modern React Server/Client Component architecture, Turbopack, and unified REST API route handlers. |
| **Language** | **TypeScript** | End-to-end type safety across database entities, API payloads, and frontend UI states. |
| **Database** | **PostgreSQL 18** | Enterprise ACID reliability with support for `btree_gist` extensions and exclusion constraints. |
| **ORM & Migrations** | **Prisma 6.4.1** | Type-safe query building, declarative schema modeling, and reproducible migration management. |
| **Validation** | **Zod** | Shared input schema validation across client forms and server endpoints. |
| **Authentication** | **jose + bcryptjs** | Lightweight, secure HTTP-only cookie JWT session management with bcrypt-hashed passwords. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | High-performance custom glassmorphic styling, responsive layout, and polished accessible components. |
| **Date Utilities** | **date-fns** | Modular, immutable date manipulation and business-hours gap calculation. |
| **Testing** | **Vitest** | Rapid automated unit testing for interval overlap geometry and edge cases. |

---

## 3. Architecture & Project Structure

The project strictly follows layered architecture principles:
- **Route Handlers (`src/app/api/`)**: Only parse HTTP input, extract authentication sessions, validate with Zod, and delegate to services.
- **Business Logic Layer (`src/lib/services/`)**: Encapsulates all domain logic (overlap checking, next free slot calculation, deactivation safety checks, audit records).
- **Data Access Layer (`src/lib/db.ts` & `prisma/`)**: Singleton database connection and migrations.
- **UI Components (`src/components/` & `src/app/`)**: Responsive client views for dashboard analytics, resource catalogs, and reservation timelines.

```
├── docs/
│   └── dbml.dbml                    # Database markup for dbdiagram.io ER rendering
├── prisma/
│   ├── migrations/                  # Generated SQL migrations (includes btree_gist exclusion)
│   ├── schema.prisma                # Database schema definitions
│   └── seed.ts                      # Idempotent demo database seeder
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/                # Login, logout, session verification
│   │   │   ├── availability/        # Day availability query (08:00 - 18:00)
│   │   │   ├── dashboard/           # Summary KPIs and utilization statistics
│   │   │   ├── reservations/        # Book, list, filter, soft-cancel
│   │   │   └── resources/           # Catalog CRUD and deactivation guards
│   │   ├── login/                   # Authentication view with demo 1-click chips
│   │   ├── reservations/            # Reservation list, audit views, and cancel actions
│   │   ├── resources/               # Resource catalog with inline schedule timelines
│   │   ├── globals.css              # Custom styling tokens and glassmorphic cards
│   │   ├── layout.tsx               # Root HTML structure and SEO metadata
│   │   └── page.tsx                 # Executive Dashboard
│   ├── components/
│   │   ├── AvailabilityTimeline.tsx # Visual 10-hour day schedule with clickable free slots
│   │   ├── BookingModal.tsx         # Reservation form with smart inline conflict suggestions
│   │   ├── Navbar.tsx               # Header with role badge and instant demo switch
│   │   └── ResourceModal.tsx        # Admin facility creation and editing modal
│   └── lib/
│       ├── auth.ts                  # Session tokens and role authorization
│       ├── db.ts                    # Prisma Client singleton
│       ├── errors.ts                # Standard error hierarchy and 23P01 mapping
│       ├── services/                # Domain services (resource & reservation logic)
│       └── validators/              # Zod validation schemas
└── tests/
    └── overlap.test.ts              # 14 unit tests covering interval overlap logic
```

---

## 4. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Reservation : "creates"
    ResourceCategory ||--o{ Resource : "categorizes"
    Resource ||--o{ Reservation : "reserved_for"

    User {
        uuid id PK
        string name
        string email UK
        string passwordHash
        Role role "ADMIN | USER"
        timestamptz createdAt
    }

    ResourceCategory {
        uuid id PK
        string name UK
    }

    Resource {
        uuid id PK
        uuid categoryId FK
        string name
        string location
        int capacity
        text description
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    Reservation {
        uuid id PK
        uuid resourceId FK
        uuid userId FK
        string title
        text notes
        timestamptz startTime
        timestamptz endTime
        ReservationStatus status "CONFIRMED | CANCELLED"
        timestamptz createdAt
        timestamptz updatedAt
        timestamptz cancelledAt
    }
```

> **Interactive Shareable Link**: The DBML definition is located in [`docs/dbml.dbml`](./docs/dbml.dbml). You can paste it directly into [dbdiagram.io](https://dbdiagram.io) or use our Mermaid ER diagram above.

---

## 5. Key Engineering Decisions

### 1. Database-Level Overlap Exclusion Constraint
Checking overlap only in application code leaves race condition vulnerabilities under concurrent requests. We enforce safety at the PostgreSQL engine level:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
ADD CONSTRAINT no_overlapping_reservations
EXCLUDE USING gist (
  "resourceId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE (status = 'CONFIRMED');
```
- **Half-Open Intervals `[)`**: A booking ending at 10:00 does not conflict with one starting at 10:00 (back-to-back allowed).
- **Conditional Filter `WHERE (status = 'CONFIRMED')`**: When a reservation is cancelled, the constraint instantly frees the time slot without requiring deletion.
- **Postgres Code `23P01`**: Caught by our error handler and mapped to a friendly `409 Conflict` with the next available slot suggested.

### 2. Timezone Normalization
- All database timestamps are stored in UTC (`timestamptz`).
- Display is formatted cleanly for the local audience (`Asia/Colombo` / user device local time).

### 3. Soft-Delete Lifecycle
Cancelled reservations have `status` set to `CANCELLED` and `cancelledAt` set to current timestamp. This preserves audit trails and historical utilization metrics while immediately freeing the slot on the database exclusion constraint.

---

## 6. Getting Started & Local Setup

### Prerequisites
- **Node.js**: v20 or higher (v22 tested)
- **PostgreSQL**: v14 or higher (PostgreSQL 18 tested)
- **Git**

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/GimhaniDilmika/Resource_Reservation_System.git
   cd Resource_Reservation_System
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure `DATABASE_URL` matches your local PostgreSQL configuration:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/reservations"
   AUTH_SECRET="your-32-character-secret-key"
   ```

3. **Install Dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Initialize Database & Run Migrations**:
   ```bash
   npx prisma migrate dev
   ```

5. **Seed the Database with Demo Data**:
   ```bash
   npx prisma db seed
   ```

6. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Demo Credentials (Seeded)

The database seed provides two pre-configured accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@primewave.com` | `admin123` | Full access: Add/edit resources, toggle operational status, view all bookings, cancel any booking. |
| **Member** | `user@primewave.com` | `user123` | Member access: Browse catalog, inspect availability timelines, book slots, cancel own bookings. |

> *Tip: The application navigation header includes an instant **Demo Switcher** ("Admin" / "User") so you can easily demonstrate multi-role capabilities without repeatedly typing credentials!*

---

## 8. REST API Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Credentials login, issues HTTP-only session cookie | Public |
| `POST` | `/api/auth/logout` | Clears session cookie | Public |
| `GET` | `/api/auth/me` | Returns current user profile and role | Session |
| `GET` | `/api/dashboard` | KPI stats (total resources, bookings today, utilization rate, upcoming bookings) | Session |
| `GET` | `/api/resources` | List resources (filters: `categoryId`, `search`, `isActive`) | Public/Session |
| `POST` | `/api/resources` | Create resource | Admin |
| `GET` | `/api/resources/:id` | Resource details with upcoming bookings | Public/Session |
| `PATCH` | `/api/resources/:id` | Update resource or toggle active state (with booking guard) | Admin |
| `GET` | `/api/availability` | Query booked and free slots for a resource & date (`?resourceId=&date=`) | Public/Session |
| `GET` | `/api/reservations` | List reservations (filters: `resourceId`, `status`, `from`, `to`, `mine`, `search`) | Session |
| `POST` | `/api/reservations` | Create reservation with concurrency and overlap validation | Session |
| `POST` | `/api/reservations/:id/cancel` | Soft-cancel reservation (frees slot, updates status) | Owner or Admin |

---

## 9. Running Automated Tests

Run the test suite using Vitest:
```bash
npm run test
```

The test suite validates:
- **Interval Overlap Geometry**: Exact overlap, partial start overlap, partial end overlap, contained bookings, containing bookings, back-to-back bookings (allowed), and non-overlapping windows.
- **Input Validation**: End time before start time, zero-duration bookings, past bookings, and maximum 12-hour limit enforcement.

---

## 10. Future Enhancements

1. **Recurring Bookings**: Adding RRULE recurrence engine for weekly team standups.
2. **Approval Workflows**: Configurable manager approval for high-demand executive suites.
3. **Email & Webhook Notifications**: Integration with Slack / SendGrid for reminders 15 minutes before reservation start.
4. **Interactive Floorplans**: SVG map visualization of office layouts and desk booking.
