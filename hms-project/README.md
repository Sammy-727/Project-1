# GrandStay HMS — Full-Stack Architecture

React SPA frontend + Spring Boot REST API + PostgreSQL.

## Project Structure

```
hms-project/
├── docker-compose.yml      # PostgreSQL 16
├── hms-backend/            # Spring Boot 3.3 REST API (port 8080)
└── hms-frontend/           # React + Vite SPA (port 5173)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, Axios |
| Backend | Java 17, Spring Boot 3.3, Spring Data JPA, Spring Security |
| Database | PostgreSQL 16 (production) / H2 (dev profile) |
| Auth | JWT (stateless) |

## Quick Start

### Option A — Dev mode (H2, no Docker)

**Backend:**
```bash
cd hms-backend
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

**Frontend:**
```bash
cd hms-frontend
npm install
npm run dev
```

Open http://localhost:5173

### Option B — PostgreSQL (recommended)

```bash
# Start database
docker compose up -d

# Backend (uses postgres profile by default)
cd hms-backend && mvn spring-boot:run

# Frontend
cd hms-frontend && npm run dev
```

## Demo Login

| Username | Password |
|----------|----------|
| admin | admin123 |
| manager | manager123 |
| reception | rec123 |

## API Endpoints

- `POST /api/auth/login` — JWT login
- `GET /api/dashboard/stats` — Dashboard metrics
- `GET/POST/PUT/DELETE /api/rooms` — Room management
- `GET/POST/PUT/DELETE /api/guests` — Guest management
- `GET/POST /api/bookings` — Bookings, check-in/out
- `GET/POST /api/payments` — Billing
- `GET /api/reports/summary` — Reports

All endpoints except `/api/auth/**` require `Authorization: Bearer <token>`.

## Windows

Use `START_BACKEND.bat` and `START_FRONTEND.bat` in this folder.

## Build for Production

```bash
# Backend JAR
cd hms-backend && mvn clean package

# Frontend static build
cd hms-frontend && npm run build
```

Serve `hms-frontend/dist` via any static host; set `VITE_API_URL=http://your-api:8080/api`.
