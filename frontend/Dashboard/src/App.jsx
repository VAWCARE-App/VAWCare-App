import React from "react";
import { App as AntApp, Layout, ConfigProvider, Button } from "antd";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import { isAuthed, clearToken } from "./lib/api";

function Protected({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

function Shell({ children }) {
  const navigate = useNavigate();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider breakpoint="lg" collapsedWidth={64} theme="dark">
        <div style={{ color: "#fff", padding: 16, fontWeight: 700 }}>VAWCare</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ padding: "8px 16px" }}><Link to="/dashboard">Dashboard</Link></li>
          <li style={{ padding: "8px 16px" }}><Link to="/users">Users</Link></li>
        </ul>
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: "#fff", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => navigate("/dashboard")}>Home</Button>
          <Button
            onClick={() => {
              clearToken();
              navigate("/login");
            }}
          >
            Log out
          </Button>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { borderRadius: 12 } }}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/"
              element={<Protected><Shell><Dashboard /></Shell></Protected>}
            />
            <Route
              path="/dashboard"
              element={<Protected><Shell><Dashboard /></Shell></Protected>}
            />
            <Route
              path="/users"
              element={<Protected><Shell><UserManagement /></Shell></Protected>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}


