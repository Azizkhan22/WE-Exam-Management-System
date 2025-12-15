## WE Exam Management System – Frontend

This `frontend/` app is the **React + Vite** single‑page application for the **WE Exam Management System**.

- **Stack**: React, Vite, Tailwind CSS, React Router, Zustand, Axios, jsPDF
- **Entry**: `src/main.jsx`, `src/App.jsx`
- **Pages**:
  - `LandingPage` (`/`)
  - `AuthPage` (`/auth`)
  - `StudentSeatPage` (`/student-seat`)
  - `AdminDashboard` (`/dashboard`, protected)
  - `DetailEntities` (`/dashboard/detail`, protected)

For a full project overview, including backend setup and API details, see the root‑level `README.md`.

### Running the frontend

```bash
cd frontend
npm install
npm run dev
```

By default this runs on `http://localhost:5173`, which must be allowed in the backend’s `FRONTEND_URL` env variable for CORS to work.

