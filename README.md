# Hyrlo — Hyperlocal Hiring Platform

Connect local workers with nearby businesses. Workers find jobs within 12 km; employers hire matching talent.

## Quick Start (local)

```bash
npm install
pip install -r backend/requirements.txt
npm run build
npm run start
```

Open **http://localhost:5000**

### Dev mode (hot reload frontend)

Terminal 1: `npm run dev:api`  
Terminal 2: `npm run dev` → http://localhost:5173

## Platform-registered demo workers

These workers are **pre-registered on the server** (`registered_by: platform`):

| Name | Phone | Category |
|------|-------|----------|
| Rajesh Kumar | 9876543210 | Electrician |
| Priya Sharma | 9876543211 | Hair Stylist |
| Amit Desai | 9876543212 | Bike Mechanic |
| Suresh Reddy | 9876543213 | Delivery Driver |
| Meena Venkat | 9876543214 | Cook |
| Lakshmi Nair | 9876543216 | Pharmacist |
| Arjun Menon | 9876543218 | Mobile Repair |
| Kavitha Rao | 9876543219 | Cleaner |

**Employer demo:** `9988776655` (City Medical Store)

## Publish to GitHub (new repo)

```bash
chmod +x publish.sh
./publish.sh Hyrlo Sammy-727
```

## Deploy

| Platform | Steps |
|----------|-------|
| **Render** | Connect repo → uses `render.yaml` |
| **Vercel** | Connect repo → uses `vercel.json` (API needs separate backend) |
| **GitHub Pages** | Settings → Pages → GitHub Actions |

**Recommended:** Render (full stack — API + frontend in one service)

## Tech Stack

- React 19 + Vite (frontend)
- Flask + SQLite (backend API)
- 8 platform workers, 5 businesses, 6 jobs, 5 requests pre-seeded
