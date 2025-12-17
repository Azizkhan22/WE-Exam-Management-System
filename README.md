## WE Exam Management System

An end-to-end **exam seating management** platform built with:

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React (Vite), Tailwind CSS, Zustand
- **Auth**: JWT-based admin authentication

It lets admins import student and catalog data, configure rooms, generate optimized multi-room seating plans, export invigilation packs to PDF, and lets students look up their seat with just a roll number and exam date.

---
## Live Demo

🔗 https://kaems.vercel.app

Admin Credentials:
- **Email**: admin@kaems.com
- **Password**: Admin@123
## Features

- **Admin features**
  - **Secure login** for exam admins
  - **Catalog management** (departments, semesters, courses, rooms, etc.)
  - **Student data import** from CSV
  - **Multi-room seating plan generation** for a given exam date
  - **Automatic seat allocation** with reduced adjacency
  - **Interactive plan viewer** with a visual seat grid per room
  - **Seat swapping** between students to resolve edge cases
  - **PDF export** of room-wise seating grids and consolidated packs for printing
  - **Dashboard stats** (students, rooms, plans, etc.)

- **Student features**
  - **Seat lookup** by roll number + exam date
  - **At-a-glance details**: room, row, column, invigilator, department, semester, exam date
  - **Readonly seat grid** to visualize position in the room

- **Technical**
  - RESTful **JSON API** on `/api/*`
  - **SQLite** database (single-file, easy to back up)
  - Environment-based configuration with **dotenv**
  - CORS configured for the Vite frontend

---

## Project structure

```text
WE-Exam-Management-System/
  backend/           # Express API + SQLite DB
  frontend/          # React (Vite) SPA
  KAEMS.pdf          # Project-related document
  LICENSE
  README.md          # This file
```

---

## Prerequisites

- **Node.js**: v18+ (recommended) with npm
- **OS**: Windows, macOS, or Linux

No separate DB server is required; the backend uses a local `exam_mgmt.sqlite` file.

---

## Backend (API server)

### Tech stack

- Node.js, Express 5
- SQLite (`sqlite3`)
- JWT auth (`jsonwebtoken`, `bcryptjs`)
- File upload with `multer`
- CSV ingestion with `csv-parser`

### Important files

- `backend/src/server.js` – Express entrypoint, CORS, JSON parsing, `/health` endpoint, DB init
- `backend/src/db.js` – SQLite initialization and helpers (schema, migrations, connection)
- `backend/src/routes/index.js` – Main router that mounts:
  - `/api/auth` – authentication
  - `/api/catalog` – shared catalog: rooms, departments, semesters, courses, etc.
  - `/api/students` – student management & seat lookup
  - `/api/plans` – seating plan CRUD, allocation, export, seat swap, bulk generation
  - `/api/search` – statistics and search helpers
  - `/api/import` – CSV import endpoints

### Environment variables

Create a `.env` file in the `backend/` folder:

```bash
cd backend
copy .env.example .env  # if provided, or create manually
```

At minimum, define:

```bash
JWT_SECRET=change_this_to_a_long_random_secret
FRONTEND_URL=http://localhost:5173
PORT=5000
```

- **`JWT_SECRET` is mandatory** – the server exits early if it’s not set.
- `FRONTEND_URL` can be a comma‑separated list if you serve the frontend from multiple origins.

### Install & run (backend)

```bash
cd backend
npm install

# Development (with nodemon)
npm run dev

# Or plain Node
npm start
```

The API will listen on `http://localhost:5000` by default and expose:

- `GET /health` – health check
- `GET /api/...` – all application endpoints

---

## Frontend (React + Vite)

### Tech stack

- React 18/19 + Vite
- React Router (`react-router-dom`)
- Tailwind CSS (utility styling)
- Zustand for lightweight global state (`authStore`)
- Axios for API requests
- jsPDF + html2canvas for PDF exports

### Main routes (`App.jsx`)

- `/` – **LandingPage** (public marketing/entry screen)
- `/auth` – **AuthPage** (admin login)
- `/student-seat` – **StudentSeatPage** (student seat lookup + readonly seating grid)
- `/dashboard` – **AdminDashboard** (protected)
- `/dashboard/detail` – **DetailEntities** for fine‑grained catalog/entity management (protected)

`/dashboard` and `/dashboard/detail` are wrapped in `ProtectedRoute`, which uses `authStore` to check authentication state and redirect unauthenticated users to `/auth`.

### Key screens & components

- **AdminDashboard**
  - Loads **rooms**, **stats**, and **plans** from:
    - `GET /api/catalog/rooms`
    - `GET /api/search/stats`
    - `GET /api/plans`
  - **Multi-room seating generation**:
    - Pick an exam date and select one or more rooms
    - Sends `POST /api/plans/bulk` with `{ title, planDate, roomIds }`
    - Shows current and historical plans, room tabs, and interactive `SeatGrid`
  - **Seat swapping**:
    - Click first seat, then second seat to trigger
    - Uses `POST /api/plans/:planId/swap`
  - **Export PDF**:
    - Calls `GET /api/plans/:planId/export`
    - Generates landscape PDF with room‑wise grids and student labels

- **StudentSeatPage**
  - Form fields:
    - Roll number
    - Exam date (required)
  - On submit:
    - `GET /api/students/seat/:roll/:planDate`
  - On success:
    - Shows room, row, column, invigilator, department, semester and plan date
    - Renders readonly seating grid via `SeatingGrid` component for the student’s room

### Install & run (frontend)

```bash
cd frontend
npm install

# Development
npm run dev

# Production build
npm run build

# Preview built app
npm run preview
```

By default Vite serves the SPA at `http://localhost:5173`.

> Make sure the backend’s `FRONTEND_URL` includes this origin so that CORS succeeds.

---

## Running the full stack locally

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd WE-Exam-Management-System
   ```

2. **Configure backend**

   - `cd backend`
   - Create `.env` and set `JWT_SECRET`, `FRONTEND_URL`, `PORT` as described above.

3. **Install dependencies**

   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```

4. **Start servers**

   - Backend: `cd backend && npm run dev` (or `npm start`)
   - Frontend: `cd frontend && npm run dev`

5. **Open the app**

   - Visit `http://localhost:5173` in your browser.

---

## Database & imports

- Default database file lives at `backend/data/exam_mgmt.sqlite`.
- Admins can bulk‑import CSV files (students, catalog, etc.) via:
  - Frontend **CSV upload** widgets
  - Backend `/api/import` endpoints (see `backend/src/routes/csv.js`)
- Sample CSV example for development is included at:
  - `frontend/public/sample_bulk_data.csv`

Since SQLite is file‑based, you can back up or reset the DB by copying or deleting this file (only when the server is stopped).

---

## API overview (high level)

All endpoints are served under `/api`.

- **Auth**
  - `POST /api/auth/login`
  - `POST /api/auth/logout` (if implemented)
  - Typically returns JWT used by the frontend via `Authorization` headers.

- **Catalog & lookup**
  - `GET /api/catalog/rooms`
  - `GET /api/catalog/departments`
  - `GET /api/catalog/semesters`
  - `GET /api/catalog/courses`

- **Students**
  - `GET /api/students` – list/search
  - `GET /api/students/seat/:roll/:planDate` – seat lookup for a student

- **Plans**
  - `GET /api/plans` – list seating plans
  - `GET /api/plans/:id` – plan detail (rooms + allocations)
  - `POST /api/plans/bulk` – multi‑room seating generation for an exam date
  - `POST /api/plans/:id/swap` – swap two seats
  - `GET /api/plans/:id/export` – export PDF data for a plan

- **Import**
  - `POST /api/import/...` – CSV-based imports (students, rooms, etc.; see CSV route file)

> For precise request/response shapes, check the route handlers in `backend/src/routes/*.js`.

---

## Authentication model

- Admin login issues a **JWT** signed with `JWT_SECRET`.
- The frontend persists auth state using `authStore` (Zustand) and attaches credentials on API requests via `apiClient` (`frontend/src/services/api.js`).
- Protected routes use `ProtectedRoute` to:
  - Check if a valid user is loaded in store
  - Redirect unauthenticated users to `/auth`

---

## Deployment notes

- **Backend**
  - Run `npm install` then `npm start` in `backend`
  - Configure environment via real env vars or `.env`
  - Ensure the process runs under a process manager (`pm2`, systemd, etc.)
  - Persist `data/exam_mgmt.sqlite` on durable storage

- **Frontend**
  - Run `npm run build` in `frontend`
  - Serve the contents of `frontend/dist` with any static file server (NGINX, Apache, S3+CloudFront, etc.)
  - Set `VITE_API_BASE_URL` (or similar, depending on `api.js`) to point to your backend API URL at build time if required.

- **CORS**
  - Update `FRONTEND_URL` in backend env to include your deployed frontend origin
  - You can specify multiple origins separated by commas.

---

## Development tips

- To inspect the DB in development, open `backend/data/exam_mgmt.sqlite` with any SQLite viewer (DB Browser for SQLite, SQLiteStudio, etc.).
- If you change routes or auth behavior, make sure:
  - Frontend `apiClient` base URL and token handling stays in sync
  - `ProtectedRoute` logic is still correct for the new auth flow
- For layout changes on grids and dashboards, see:
  - `frontend/src/components/SeatGrid.jsx`
  - `frontend/src/components/SeatingGrid.jsx`
  - `frontend/src/pages/AdminDashboard.jsx`
  - `frontend/src/pages/StudentSeatPage.jsx`

---

## License

This project is licensed under the terms of the license specified in `LICENSE`.
