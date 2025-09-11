import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

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
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
