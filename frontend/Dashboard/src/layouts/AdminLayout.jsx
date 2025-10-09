import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useLocation } from 'react-router-dom';
import { api, isAuthed } from '../lib/api';

const { Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = sessionStorage.getItem("sidebarCollapsed");
    return stored === "true";
  });

  useEffect(() => {
    sessionStorage.setItem("sidebarCollapsed", collapsed);
  }, [collapsed]);

  return (
    <Layout
      style={{
        height: "100vh",          // lock viewport height
        minHeight: "100dvh",      // mobile safe height
        width: "100%",
        overflow: "hidden",       // prevent double scrollbars
        background: "#fff5f8",    // light pink
      }}
      hasSider
    >
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Content
          style={{
            flex: 1,
            overflow: "auto",      // <-- content scrolls here
            padding: 0,
          }}
        >
          {/* Your pages (AdminDashboard, VictimDashboard, etc.) */}
          <AdminPageViewReporter />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

function AdminPageViewReporter() {
  const location = useLocation();
  useEffect(() => {
    try {
      const path = location.pathname;
      const lastPath = localStorage.getItem('__lastPageviewPath') || '';
      const lastAt = Number(localStorage.getItem('__lastPageviewAt') || '0');
      const now = Date.now();
      if (lastPath !== path || (now - lastAt) > 3000) {
        const actorId = localStorage.getItem('actorId');
        const actorType = localStorage.getItem('actorType');
        const actorBusinessId = localStorage.getItem('actorBusinessId');
        // Only send a ping when the client is authenticated OR there is
        // an actor header (walk-in or persisted actor) available. This
        // avoids extraneous pings during unauthenticated browsing.
        if (isAuthed() || actorBusinessId || actorId) {
          api.post('/api/logs/pageview', { path, actorId, actorType, actorBusinessId }).catch(() => {});
        }
        try { localStorage.setItem('__lastPageviewPath', path); localStorage.setItem('__lastPageviewAt', String(now)); } catch (e) {}
      }
    } catch (e) { console.warn('Failed to send admin pageview', e && e.message); }
  }, [location]);
  return null;
}
