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
import PredictionHistoryPage from "./features/history/PredictionHistoryPage";
import ReportsPage from "./features/reports/ReportsPage";
import SettingsPage from "./features/settings/SettingsPage";

function Shell() {
  const { user, isAdmin, updateUser } = useAuth();
  const { t } = useTheme();
  const [page, setPage] = useState("dashboard");
  const [ctx, setCtx] = useState({});

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
    setCtx((c) => ({ ...c, ...extra }));
    setPage(next);
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
    "history":               <PredictionHistoryPage />,
    "reports":               <ReportsPage />,
    "settings":              adminOnly(<SettingsPage />),
  };

  return (
      <div style={{ display: "flex", minHeight: "100vh", background: t.bg, color: t.text }}>
        <Sidebar page={page} navigate={navigate} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar navigate={navigate} />
          <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
            {pages[page] || pages["dashboard"]}
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