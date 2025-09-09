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
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ flex: 1, minWidth: 0 }}>
        <Content
          style={{
            background: "#fff",
            overflow: "auto",
            flex: 1,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}