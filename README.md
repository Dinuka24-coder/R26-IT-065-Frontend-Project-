# PulmoAI Frontend

Role-based clinical dashboard for **PulmoAI**, the Multi-Modal Pulmonary Disease
Detection System (SLIIT R26-IT-065). Built with **React + Vite**.

> AI results are decision support only and must be reviewed by a qualified clinician.

---

## Quick start

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

The backend must be running first (default `http://127.0.0.1:8000`).

---

## Configure the backend URL

Edit `.env`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Restart `npm run dev` after changing `.env`.

---

## Backend CORS

The FastAPI `main.py` must allow the frontend origin:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Use exactly **one** CORS middleware — duplicates break the preflight request.

---

## Features

- **Login** with JWT (token kept in `sessionStorage`; you are logged out when the tab closes or the token expires)
- **Dashboard** – total scans, analyses, positive cases, weekly scan chart, disease distribution, recent activity
- **Patients** – register, search, view details and history, clinical notes
- **Manage Doctors** (admin)
- **AI Analysis** – Pneumothorax, Pneumonia, Tuberculosis and Lung Cancer pages, with heatmaps
- **Full Screening** – one X-ray checked by all X-ray engines at once
- **PDF download** on analysis pages and Full Screening
- **Reports page**
   - search by patient name / ID, doctor, disease or result
   - filters: date range, disease, source, result, doctor (admin), patient
   - views: **All results**, **By doctor** (admin), **By disease**, **By patient**
   - Full Screening results grouped in one card with a combined **Screening PDF**
   - Preview / Download for every result and every group, plus a summary PDF
- **Prediction History**
- **Light / dark theme**

---

## Roles

| Role | Can do |
|---|---|
| **Admin** | Manage doctors, see all patients and all results, "By doctor" reports, settings |
| **Doctor** | Own profile, patients, run analyses, see and download **their own** results |

---

## Folder structure

```
src/
├── api/                    one file per backend area
│   ├── client.js           BASE_URL + token helpers
│   ├── pdfReportApi.js     report list + PDF preview/download
│   ├── screeningApi.js     Full Screening
│   ├── reportApi.js        prediction history
│   └── component*Api.js    one per AI component
├── context/                AuthContext (JWT) + ThemeContext (light/dark)
├── components/
│   ├── ui/                 Card, Button, Pill, PageHeader, Modal…
│   │   ├── DownloadReportButton.jsx     PDF for one result
│   │   └── DownloadScreeningButton.jsx  PDF for a Full Screening
│   ├── charts/             WeeklyScanChart, DiseaseDonut
│   └── layout/             Sidebar, TopBar
├── features/
│   ├── auth/ dashboard/ doctors/ patients/ history/ settings/
│   ├── reports/            ReportsPage (filters, grouped views, PDFs)
│   └── analysis/
│       ├── shared/         PatientSelector, ScanUploader, HeatmapViewer, DiagnosticConclusion…
│       ├── pneumothorax/   Component 1
│       ├── pneumonia/      Component 2
│       ├── tuberculosis/   Component 3
│       ├── lungcancer/     Component 4
│       └── screening/      Full Screening
└── utils/                  constants, helpers
```

---

## Backend endpoints used

All under `VITE_API_BASE_URL`.

| Endpoint | Used by |
|---|---|
| `POST /auth/login` | Login |
| `GET /users/me` | Profile |
| `GET/POST /users/doctors`, `PUT/DELETE /users/doctors/{id}` | Manage doctors (admin) |
| `GET/POST /patients`, `GET /patients/search?q=`, `GET/PUT/DELETE /patients/{id}` | Patients |
| `POST /patients/{id}/notes` | Clinical notes |
| `GET /dashboard/overview` | Dashboard (stats, weekly chart, distribution, recent activity) |
| `GET /reports/history?patient_id=&doctor_id=` | Prediction History, Patient and Doctor pages |
| `POST /pneumothorax/predict` and the other component predict endpoints | AI Analysis pages |
| `POST /screening/full` | Full Screening |
| `GET /reports/pdf/list` | Reports page |
| `GET /reports/pdf/summary` | Summary / Doctor / Disease / Patient PDF |
| `GET /reports/pdf/result/{component}/{result_id}` | Single result PDF |
| `GET /reports/pdf/screening` | Full Screening PDF |

---

## Adding the PDF download button to a component page

1. Import the button:

```jsx
   import DownloadReportButton from "../../../components/ui/DownloadReportButton";
```

2. Add it at the end of the results section, inside `{result && ( ... )}`:

```jsx
   <DownloadReportButton component="pneumonia" resultId={result.result_id} full />
```

`component` must be exactly one of: `pneumothorax`, `pneumonia`, `tuberculosis`, `lungcancer`.

3. Your prediction response must include `result_id`. The button hides itself when it is missing.
   To check: run a prediction → **F12** → **Network** → the predict request → **Response**.

---

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Failed to fetch" / network error | Backend not running, or wrong `VITE_API_BASE_URL` |
| CORS error | Backend must allow `http://localhost:5173` with only one CORS middleware |
| Logged out suddenly | Token expired; log in again |
| Download button not showing | The prediction response has no `result_id` |
| A doctor cannot see some results | Those results were saved without `doctor_id` |
| PDF preview blocked | Allow pop-ups for `localhost:5173` |

---

## Project

**PulmoAI — Unified Clinical Decision Support System for Pulmonary Diseases**
SLIIT Research Project — R26-IT-065