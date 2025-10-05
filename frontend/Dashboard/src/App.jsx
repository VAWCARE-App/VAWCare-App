import React from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import AdminLogin from "./pages/AdminLogin";

import Signup from "./pages/Signup";
import TwoFactor from "./pages/2FA";
import BPO from "./pages/BPO";
import BPOManagement from "./pages/BPOManagement";
import BPODetail from "./pages/BPODetail";

import Dashboard from "./pages/Dashboards/AdminDashboard";
import Admin from "./layouts/AdminLayout";
import Main from "./layouts/MainLayout";

import UserManagement from "./pages/UserManagement";
import ReportManagement from "./pages/ReportManagement";
import CaseManagement from "./pages/CaseManagement";
import CaseDetail from "./pages/CaseDetail";
import VictimDashboard from "./pages/Dashboards/VictimDashboard";
import OfficialDashboard from "./pages/Dashboards/OfficialDashboard";


import Test from "./pages/Test";
import ReportCase from "./pages/Victim/Report";
import EmergencyButton from "./pages/Victim/EmergencyButton";

import { isAuthed } from "./lib/api";

function Protected({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { borderRadius: 12 } }}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            {/* Root is landing page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/2fa" element={<TwoFactor />} />



            <Route path="/victim" element={<Main />}>
              <Route index element={<Protected><VictimDashboard /></Protected>} />
              <Route path="victim-test" element={<Protected><VictimDashboard /></Protected>} />
              <Route path="report" element={<Protected><ReportCase /></Protected>} />
              <Route path="emergency" element={<Protected><EmergencyButton /></Protected>} />
            </Route>

            {/* Admin shell moved to /admin */}
            <Route path="/admin" element={<Admin/>}>
              {/* Default (admin) */}
              <Route index element={<Protected><Dashboard /></Protected>} />

              {/* Officials */}
              <Route path="official-dashboard" element={<Protected><OfficialDashboard /></Protected>} />
              <Route path="official-cases" element={<Protected><CaseManagement /></Protected>} />

              {/* Admin */}
              <Route path="users" element={<Protected><UserManagement /></Protected>} />
              <Route path="reports" element={<Protected><ReportManagement /></Protected>} />
              <Route path="bpo" element={<Protected><BPO /></Protected>} />
              <Route path="bpo/:id" element={<Protected><BPODetail /></Protected>} />
              <Route path="bpo-management" element={<Protected><BPOManagement /></Protected>} />
              <Route path="cases" element={<Protected><CaseManagement /></Protected>} />
              <Route path="cases/:id" element={<Protected><CaseDetail /></Protected>} />
            </Route>

            {/* Simple test route (outside shell) */}
            <Route path="/test" element={<Admin />}>
              <Route index element={<Test />} />
            </Route>

            {/* Fallback */}
            {/* <Route path="*" element={<Navigate to="/victim" replace />} /> */}
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
