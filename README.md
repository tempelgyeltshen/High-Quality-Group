# High Quality Enterprise POS

A retail Point of Sale (POS) system for **High Quality Enterprise** (Thimphu, Bhutan). Built with a React 19 + Vite + Tailwind CSS frontend and an Express + Cloud Firestore backend, with an automatic local JSON-file fallback so the whole app runs without any external services.

## Features

- **Operator login** with role-based access (`admin` / `cashier`) — the API enforces authentication and admin-only routes server-side
- **Checkout / Sale Register** with barcode scanning (Honeywell-style keyboard wedge), staff discount badges, manual discounts, GST (5%) calculation, cash / online (BOB, BNB, DK) / credit payments, and thermal receipt printing
- **Manage Sales, Credit Payments, Sale Returns** — returns restock inventory automatically
- **Day End & GST Reports**
- **Inventory management** (admin) with low-stock warnings
- **Employee directory** (admin) with per-employee discount rates
- **User account management** (admin)
- **Auto-logout** after 10 minutes of inactivity
- Cloud Firestore persistence with offline local fallback (`backend/mock_db.json`)

## Stack

| Layer    | Tech |
| -------- | ---- |
| Frontend | React 19, Vite 6, Tailwind CSS 4, lucide-react |
| Backend  | Node.js, Express 4, Firebase (Firestore) |
| Data     | Cloud Firestore, falling back to a local JSON file (`backend/mock_db.json`) |
| Types    | TypeScript (strict typechecks for both apps) |

## Run locally

Prerequisite: Node.js 18+.

```bash
# 1. Install dependencies (frontend + backend)
npm run install:all

# 2. Start the dev server (Express + Vite middleware on http://localhost:3000)
npm run dev
```

Open http://localhost:3000 and log in with the seeded credentials:

| Role     | Username | Password   |
| -------- | -------- | ---------- |
| Admin    | `admin`  | `admin123` |
| Cashier  | `cashier`| `cashier123` |

### Database: Firestore vs local fallback

The backend looks for a `firebase-applet-config.json` file in the project root containing
[Firebase web-app config](https://firebase.google.com/docs/web/setup):

```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "firestoreDatabaseId": "(default)"
}
```

If the file is missing or Firestore is unreachable, the backend **automatically falls back to
the local JSON file** (`backend/mock_db.json`) and everything works offline. That file is
re-seeded with default users/products/employees if it does not exist.

> The file is gitignored because it contains secrets — create it locally when you want to use
> Firestore (or when deploying to Vercel so data persists).

### Production build & local preview

```bash
npm run build   # builds the frontend into dist/ and bundles the backend into dist/server.cjs
npm start       # serves dist/ (API + static frontend) on http://localhost:3000
```

## Deploying to Vercel

1. Push the repo to a Git provider and import it into Vercel (framework preset: **Other**).
2. Ensure `firebase-applet-config.json` exists in the repo root (or provide it via a build step)
   so the API persists to Firestore. Without it the API runs against an ephemeral local file
   that resets between invocations.
3. Deploy. `vercel.json` routes `/api/*` to the serverless Express app and everything else to
   the static frontend bundle.

## Scripts (root)

| Script               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start the full app in development mode           |
| `npm run build`      | Production build (frontend + backend)            |
| `npm start`          | Run the production build                         |
| `npm run lint`       | Typecheck the frontend                           |
| `npm run lint:backend`| Typecheck the backend                            |
| `npm run clean`      | Remove build outputs                             |

## API security notes

- All `/api/*` endpoints except `POST /api/auth/login` require a bearer token
  (`Authorization: Bearer <token>`), obtained from login.
- User account management and inventory/employee **edits** are admin-only (403 for cashiers).
- Passwords are stored as salted **scrypt** hashes. Legacy SHA-256 hashes created by older
  versions of this app are verified and transparently upgraded on the next successful login.
- Sessions live in server memory for 12 hours; restarting the server signs everyone out.
