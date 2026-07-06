# Hyrlo — Hyperlocal Hiring Platform

Hyrlo connects local workers with nearby businesses. Workers find jobs within 12 km; employers find and hire matching workers in their area.

## Quick Start

```bash
cd hyrlo-app
npm install
npm run dev
```

Open **http://localhost:5173** in your browser (use mobile view or a phone for the best experience).

## Demo Accounts

| Role | Phone | Name |
|------|-------|------|
| Worker | `9876543210` | Rajesh Kumar (Electrician) |
| Worker | `9876543214` | Meena Venkat (Cook) |
| Employer | `9988776655` | City Medical Store |
| Employer | `9988776657` | Brew & Bite Cafe |

Or register fresh via **Find Work** or **Hire Workers** on the landing page.

## Features

- **Worker flow**: Onboarding → Jobs Near You → Apply → Track Requests → Employment
- **Employer flow**: Onboarding → Dashboard → Nearby Workers → Hire → Manage Requests
- **Matching**: Category + specialization + location within 12 km
- **Requests**: Worker applications and employer invitations with accept/reject
- **Demo data**: 8 workers, 5 businesses, 11 jobs, 5 requests pre-loaded

## Project Structure

```
hyrlo-app/src/
├── constants/categories.js   # Categories & specializations
├── data/seedData.js          # Demo sample data
├── services/storage.js       # localStorage persistence
├── utils/                    # distance, matching, validation
├── components/               # Cards, BottomNav, UI primitives
├── pages/                    # All screens
└── context/AppContext.jsx    # Global state
```

## Data Storage

Data is stored in **localStorage** (key prefix `hyrlo_`). To reset demo data, clear localStorage or run in incognito mode.

## Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + Vite
- React Router
- Lucide Icons
- localStorage (mock backend — ready to swap for API)
