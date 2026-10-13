import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";

import LoginPage from "./features/auth/LoginPage";
import ChangePasswordModal from "./features/auth/ChangePasswordModal";
import DashboardPage from "./features/dashboard/DashboardPage";
import SearchPatientPage from "./features/patients/SearchPatientPage";
import RegisterPatientPage from "./features/patients/RegisterPatientPage";
import PatientDetailPage from "./features/patients/PatientDetailPage";
import AllPatientsPage from "./features/patients/AllPatientsPage";
import ManageDoctorsPage from "./features/doctors/ManageDoctorsPage";
import DoctorDetailPage from "./features/doctors/DoctorDetailPage";
import MyProfilePage from "./features/doctors/MyProfilePage";
import AnalysisHubPage from "./features/analysis/AnalysisHubPage";
import PneumothoraxAnalysis from "./features/analysis/pneumothorax/PneumothoraxAnalysis";
import PneumoniaAnalysis from "./features/analysis/pneumonia/PneumoniaAnalysis";
import TuberculosisAnalysis from "./features/analysis/tuberculosis/TuberculosisAnalysis";
import LungCancerAnalysis from "./features/analysis/lungcancer/LungCancerAnalysis";
import FullScreeningPage from "./features/analysis/screening/FullScreeningPage";
import PredictionHistoryPage from "./features/history/PredictionHistoryPage";
import ReportsPage from "./features/reports/ReportsPage";
import SettingsPage from "./features/settings/SettingsPage";

// ── Restore the last page across refreshes ─────────────────────
function loadPage() {
  return sessionStorage.getItem("pulmo_page") || "dashboard";
}

function loadCtx() {
  try {
    const raw = sessionStorage.getItem("pulmo_ctx");
    return raw && raw !== "undefined" ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function Shell() {
  const { user, isAdmin, updateUser } = useAuth();
  const { t } = useTheme();
  const [page, setPage] = useState(loadPage);
  const [ctx, setCtx] = useState(loadCtx);

  if (!user) return <LoginPage />;

  // ── Force password change if an admin reset it ──────────────
  if (user.must_change_password) {
    return (
        <div style={{ minHeight: "100vh", background: t.bg, display: "grid", placeItems: "center" }}>
          <ChangePasswordModal
              forced
              onSuccess={() => updateUser({ must_change_password: false })}
          />
        </div>
    );
  }

  function navigate(next, extra = {}) {
    const merged = { ...ctx, ...extra };
    setCtx(merged);
    setPage(next);
    sessionStorage.setItem("pulmo_page", next);
    sessionStorage.setItem("pulmo_ctx", JSON.stringify(merged));
  }

  const adminOnly = (el) => (isAdmin ? el : <DashboardPage navigate={navigate} />);

  const pages = {
    "dashboard":             <DashboardPage navigate={navigate} />,
    "patients-search":       <SearchPatientPage navigate={navigate} />,
    "patients-register":     <RegisterPatientPage navigate={navigate} />,
    "patient-detail":        <PatientDetailPage navigate={navigate} patientId={ctx.patientId} />,
    "all-patients":          adminOnly(<AllPatientsPage navigate={navigate} />),
    "doctors":               adminOnly(<ManageDoctorsPage navigate={navigate} />),
    "doctor-detail":         adminOnly(<DoctorDetailPage navigate={navigate} doctor={ctx.doctor} />),
    "my-profile":            <MyProfilePage />,
    "analysis":              <AnalysisHubPage navigate={navigate} />,
    "analysis-pneumothorax": <PneumothoraxAnalysis navigate={navigate} />,
    "analysis-pneumonia":    <PneumoniaAnalysis navigate={navigate} />,
    "analysis-tuberculosis": <TuberculosisAnalysis navigate={navigate} />,
    "analysis-lungcancer":   <LungCancerAnalysis navigate={navigate} />,
    "analysis-full":         <FullScreeningPage navigate={navigate} />,
    "history":               <PredictionHistoryPage />,
    "reports":               <ReportsPage />,
    "settings":              adminOnly(<SettingsPage />),
  };

  // Detail pages need their context — fall back if it's missing
  let current = pages[page];
  if (page === "patient-detail" && !ctx.patientId) current = pages["patients-search"];
  if (page === "doctor-detail" && !ctx.doctor)     current = pages["doctors"];

  return (
      <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text }}>
        <Sidebar page={page} navigate={navigate} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar navigate={navigate} />
          <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
            {current || pages["dashboard"]}
          </main>
        </div>
      </div>
  );
}

export default function App() {
  return (
      <ThemeProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ThemeProvider>
  );
}