import { useState, useEffect } from "react";
import { App as AntApp, ConfigProvider, Spin } from "antd";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import AdminLogin from "./pages/Admins/AdminLogin";
import Sidebar from "./components/Sidebar";

import Signup from "./pages/Signup";
import TwoFactor from "./pages/2FA";
import BPO from "./pages/Admins/BPO";
import BPOManagement from "./pages/Admins/BPOManagement";
import BPODetail from "./pages/Admins/BPODetail";

import Dashboard from "./pages/Dashboards/AdminDashboard";
import Admin from "./layouts/AdminLayout";
import Main from "./layouts/MainLayout";

import UserManagement from "./pages/Admins/UserManagement";
import CreateOfficial from "./pages/Admins/CreateOfficial";
import ReportManagement from "./pages/Admins/ReportManagement";
import AlertsManagement from "./pages/Admins/AlertsManagement";
import CaseManagement from "./pages/Admins/CaseManagement";
import CaseDetail from "./pages/Admins/CaseDetail";
import AdminSettings from "./pages/Admins/AdminSettings";
import OfficialSettings from "./pages/Admins/OfficialSettings";
import VictimDashboard from "./pages/Dashboards/VictimDashboard";
import OfficialDashboard from "./pages/Dashboards/OfficialDashboard";
import VictimBarangay from "./pages/Victim/VictimBarangay";
import VictimCases from "./pages/Victim/VictimCases";


import Test from "./pages/Test";
import ReportCase from "./pages/Victim/Report";
import EmergencyButton from "./pages/Victim/EmergencyButton";
import LogManagement from "./pages/Admins/LogManagement";
import VictimSettings from "./pages/Victim/VictimSettings";
import ColorBends from "./components/ColorBends";


import { isAuthed, getUserType, getUserData } from "./lib/api";

function UnauthorizedHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => {
      try {
        // Ensure session / storages are cleared (safe fallback)
        try { sessionStorage.clear(); localStorage.clear(); } catch (_) { }
        const redirectToAdmin = window.location.pathname.startsWith('/admin');
        const target = redirectToAdmin ? '/admin/login' : '/login';
        navigate(target, { replace: true });
      } catch (err) {
        // As a last resort, do a full reload redirect
        const redirectToAdmin = window.location.pathname.startsWith('/admin');
        window.location.href = redirectToAdmin ? '/admin/login' : '/login';
      }
    };
    window.addEventListener('api:unauthorized', handler);
    return () => window.removeEventListener('api:unauthorized', handler);
  }, [navigate]);
  return null;
}

function Protected({ children, roles }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      let logged = isAuthed();
      // If not logged according to sessionStorage, try restoring from HTTP-only cookie
      if (!logged) {
        try {
          const userData = await getUserData();
          if (userData) {
            // populate sessionStorage so other parts of the app behave normally
            const role = userData.userType || userData.role || null;
            if (role) sessionStorage.setItem('userType', role);
            if (userData.id) sessionStorage.setItem('actorId', String(userData.id));
            const businessId = userData.adminID || userData.officialID || userData.victimID || null;
            if (businessId) sessionStorage.setItem('actorBusinessId', String(businessId));
            logged = true;
          }
        } catch (e) {
          // ignore; we'll treat as not logged
          console.debug('[App] restore session failed', e && e.message);
        }
      }

      if (!isMounted) return;

      setAuthed(logged);

      if (!logged) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (roles && roles.length > 0) {
        try {
          const type = await getUserType();
          if (!isMounted) return;
          setUserType(type);
          setAuthorized(roles.includes(type));
        } catch (err) {
          console.error("Failed to get user type:", err);
          if (isMounted) setAuthorized(false);
        }
      } else {
        // no role restriction => allow any authenticated user
        setAuthorized(true);
      }

      if (isMounted) setLoading(false);
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [roles]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  // Not logged in -> go to login
  if (!authed) {
    const redirectToAdmin = window.location.pathname.startsWith('/admin');
    return <Navigate to={redirectToAdmin ? "/admin/login" : "/login"} replace />;
  }

  // Logged in but not authorized -> send to role home (or show 403)
  if (!authorized) {
    // map role -> safe home route
    const roleHome = {
      victim: "/victim",
      admin: "/admin",
      official: "/admin/official-dashboard",
    }[userType] || "/";

    return <Navigate to={roleHome} replace />;
    // Alternative: return a 403 page instead of redirecting
    // return <Navigate to="/forbidden" replace />
  }

  return children;
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { borderRadius: 12 } }}>
      <AntApp>
        <BrowserRouter>
          <UnauthorizedHandler />
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            {/* Root is landing page */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/2fa" element={<TwoFactor />} />
            <Route path="/color-bends" element={<ColorBends />} />
            <Route path="/sidebar" element={<Sidebar />} />



            <Route path="/victim" element={<Main />}>
              <Route index element={<Protected roles={["victim"]}><VictimDashboard /></Protected>} />
              <Route path="dashboard" element={<Protected roles={["victim"]}><VictimDashboard /></Protected>} />
              <Route path="report" element={<Protected roles={["victim"]}><ReportCase /></Protected>} />
              <Route path="emergency" element={<Protected roles={["victim"]}><EmergencyButton /></Protected>} />
              <Route path="victim-barangay" element={<Protected roles={["victim"]}><VictimBarangay /></Protected>} />
              <Route path="victim-cases" element={<Protected roles={["victim"]}><VictimCases /></Protected>} />
              <Route path="victim-settings" element={<Protected roles={["victim"]}><VictimSettings /></Protected>} />
            </Route>

            {/* Admin shell moved to /admin */}
            <Route path="/admin" element={<Protected roles={["admin", "official"]}><Admin /></Protected>}>
              {/* Default (admin) */}
              <Route index element={<Protected roles={["admin", "official"]}><Dashboard /></Protected>} />

              {/* Officials */}
              <Route path="official-dashboard" element={<Protected roles={["admin", "official"]}><OfficialDashboard /></Protected>} />
              <Route path="official-cases" element={<Protected roles={["admin", "official"]}><CaseManagement /></Protected>} />
              <Route path="official-cases/:id" element={<Protected roles={["admin", "official"]}><CaseDetail /></Protected>} />
              <Route path="official-settings" element={<Protected roles={["official"]}><OfficialSettings /></Protected>} />
              <Route path="create-official" element={<Protected roles={["admin", "official"]}><CreateOfficial /></Protected>} />
              <Route path="reports" element={<Protected roles={["admin", "official"]}><ReportManagement /></Protected>} />
              <Route path="alerts" element={<Protected roles={["admin", "official"]}><AlertsManagement /></Protected>} />
              <Route path="bpo" element={<Protected roles={["admin", "official"]}><BPO /></Protected>} />
              <Route path="bpo/:id" element={<Protected roles={["admin", "official"]}><BPODetail /></Protected>} />
              <Route path="bpo-management" element={<Protected roles={["admin", "official"]}><BPOManagement /></Protected>} />
              <Route path="cases" element={<Protected roles={["admin", "official"]}><CaseManagement /></Protected>} />
              <Route path="cases/:id" element={<Protected roles={["admin", "official"]}><CaseDetail /></Protected>} />

              {/* Admin */}
              <Route path="users" element={<Protected roles={["admin"]}><UserManagement /></Protected>} />
              <Route path="settings" element={<Protected roles={["admin"]}><AdminSettings /></Protected>} />
              <Route path="logs" element={<Protected roles={["admin"]}><LogManagement /></Protected>} />
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
