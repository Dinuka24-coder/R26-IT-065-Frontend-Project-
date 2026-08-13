# PulmoAI Frontend

Role-based clinical dashboard for the Pulmonary CDSS (4 AI components).

## Quick start

```bash
npm install
cp .env.example .env      # then edit if your backend runs elsewhere
npm run dev               # http://localhost:5173
```

Your backend must be running first (default `http://127.0.0.1:8000`).

## Configure the backend URL

Edit `.env`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Backend CORS

Your FastAPI `main.py` must allow this origin:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Use exactly ONE CORS middleware — duplicates break preflight.

## Required backend endpoints

| Endpoint | Used by |
|---|---|
| `POST /auth/login` (form: username, password) | Login |
| `GET /users/me` | Profile |
| `GET/POST /users/doctors`, `PUT/DELETE /users/doctors/{id}` | Manage doctors (admin) |
| `GET/POST /patients`, `GET /patients/search?q=`, `GET/PUT/DELETE /patients/{id}` | Patients |
| `POST /patients/{id}/notes` | Clinical notes |
| `GET /dashboard/stats` | Stat cards |
| `GET /dashboard/weekly-volume` | Weekly scan chart |
| `GET /dashboard/disease-distribution` | Donut chart |
| `GET /reports/history?patient_id=&doctor_id=` | History + reports |
| `POST /pneumothorax/predict` (form: patient_id, file) | Component 1 |

## Roles

**Admin** — manage doctors, all patients, settings icon, "Total Predictions" stat card.
**Doctor** — own profile only, patients, "My Reviews" stat card.

## Folder structure

```
src/
├── api/            one file per backend area
├── context/        AuthContext (JWT) + ThemeContext (light/dark)
├── components/
│   ├── ui/         Card, Button, Table, Pill, Field, Modal…
│   ├── charts/     WeeklyScanChart, DiseaseDonut
│   └── layout/     Sidebar, TopBar
├── features/
│   ├── auth/ dashboard/ doctors/ patients/ history/ reports/ settings/
│   └── analysis/
│       ├── shared/           PatientSelector, ScanUploader, ResultCard, HeatmapCard
│       ├── pneumothorax/     CONNECTED
│       ├── pneumonia/        template
│       ├── tuberculosis/     template
│       └── lungcancer/       template
└── utils/
```

## Connecting components 2–4

Each owner edits only their own folder:

1. `src/api/componentXApi.js` — set the endpoint path.
2. `src/features/analysis/<component>/<Name>Analysis.jsx`:
   - uncomment the import
   - uncomment the `setResult(await predictX(...))` line
   - delete the "not connected yet" `setError` line
   - add your fields to `extras`

Everything else (patient select, upload, result card, heatmap) is shared and already built.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```
