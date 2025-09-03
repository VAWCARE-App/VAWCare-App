import React from "react";
import { Layout, Menu, Button, Grid } from "antd";
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  PieChartOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/api";

const { Sider } = Layout;

const PINK = "#e91e63";
const SOFT_PINK = "#ffd1dc";

export default function Sidebar({ collapsed, setCollapsed }) {
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { key: "/dashboard", icon: <HomeOutlined />, label: <Link to="/dashboard">Dashboard</Link> },
    { key: "/users", icon: <UserOutlined />, label: <Link to="/users">Users</Link> },
    { key: "/cases", icon: <FileTextOutlined />, label: <span>Cases</span> },
    { key: "/reports", icon: <PieChartOutlined />, label: <span>Reports</span> },
    { type: "divider" },
    { key: "/settings", icon: <SettingOutlined />, label: <span>Settings</span> },
  ];

  const selectedKey = items.find(i => i.key && location.pathname.startsWith(i.key))?.key || "/dashboard";

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth={screens.xs ? 0 : 64}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={240}
      theme="light"
      style={{
        borderRight: `1px solid ${SOFT_PINK}`,
        background: "#fff",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          padding: 16,
          fontWeight: 800,
          color: PINK,
          fontSize: 18,
          textAlign: "center",
          borderBottom: `1px solid ${SOFT_PINK}`,
        }}
      >
        VAWCare
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        style={{ borderRight: 0 }}
      />
      <div style={{ marginTop: "auto", padding: 12 }}>
        <Button
          icon={<LogoutOutlined />}
          block
          onClick={() => {
            clearToken();
            navigate("/login");
          }}
          style={{
            borderColor: PINK,
            color: PINK,
          }}
        >
          Log out
        </Button>
      </div>
    </Sider>
  );
}