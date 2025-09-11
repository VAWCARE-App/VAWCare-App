import React from "react";
import { App as AntApp, Layout, ConfigProvider, Button } from "antd";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboards/AdminDashboard";
import Admin from "./layouts/AdminLayout";
import UserManagement from "./pages/UserManagement";
import ReportManagement from "./pages/ReportManagement";
import VictimDashboard from "./pages/Dashboards/VictimDashboard";
import OfficialDashboard from "./pages/Dashboards/OfficialDashboard";
import Test from "./pages/Test";
import { isAuthed, clearToken } from "./lib/api";

function Protected({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}



export default function App() {
  return (
    <ConfigProvider theme={{ token: { borderRadius: 12 } }}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Admin />}>
              <Route index element={<Protected><Dashboard /></Protected>} />
              <Route path="victim-test" element={<VictimDashboard />} />
              <Route path="official-dashboard" element={<Protected><OfficialDashboard /></Protected>} />
              <Route path="users" element={<Protected><UserManagement /></Protected>} />
              <Route path="reports" element={<Protected><ReportManagement /></Protected>} />
            </Route>
          
            <Route path="*" element={<Navigate to="/" replace />} />

            <Route path="/test" element={<Admin />}>
              <Route index element={<Test />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}


