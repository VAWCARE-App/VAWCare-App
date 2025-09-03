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
              element={<Protected><Dashboard /></Protected>}
            />
            <Route
              path="/dashboard"
              element={<Protected><Dashboard /></Protected>}
            />
            <Route
              path="/users"
              element={<Protected><UserManagement /></Protected>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}


