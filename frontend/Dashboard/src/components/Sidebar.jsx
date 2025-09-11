import React from "react";
import { Layout, Menu, Button, Typography } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  AlertOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { clearToken } from "../lib/api";
import logo from '../assets/logo1.png';

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    navigate("/login");
  };

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userType = localStorage.getItem('userType') || 'victim';

  // Menu items for different user types
  const adminMenu = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/cases',
      icon: <TeamOutlined />,
      label: 'Cases',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const officialMenu = [
    {
      key: '/official-dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/official-reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/official-cases',
      icon: <TeamOutlined />,
      label: 'Cases',
    },
    {
      key: '/official-settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  // Victim sidebar with extra features
  const victimMenu = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/victim-cases',
      icon: <TeamOutlined />,
      label: 'My Cases',
    },
    {
      key: '/victim-chatbot',
      icon: <RobotOutlined />,
      label: 'VAWCare Chatbot',
    },
    {
      key: '/victim-emergency',
      icon: <AlertOutlined />,
      label: 'Emergency Alert',
    },
    {
      key: '/victim-barangay',
      icon: <HomeOutlined />,
      label: 'Barangay Details',
    },
    {
      key: '/victim-settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  // Choose menu based on userType
  let menuItems = adminMenu;
  if (userType === "official") menuItems = officialMenu;
  else if (userType === "victim") menuItems = victimMenu;

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      style={{
        background: "#fff",
        borderRight: "1px solid #ffd1dc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{
        padding: collapsed ? "16px 8px" : "16px",
        borderBottom: "1px solid #ffd1dc",
        textAlign: "center"
      }}>
        <Typography.Title
          level={collapsed ? 5 : 4}
          style={{
            margin: 0,
            color: "#e91e63",
            fontSize: collapsed ? "14px" : "18px"
          }}
        >
          {collapsed ? <img src={logo} alt="VAWCare Logo" style={{ width: "32px", height: "32px" }} /> : "VAWCare"}
        </Typography.Title>
        {!collapsed && currentUser.firstName && (
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Welcome, {currentUser.firstName}
          </Text>
        )}
      </div>

      <div style={{ padding: "8px 8px" }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> :  <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: "16px",
            width: '100%',
            height: 32,
            color: "#e91e63"
          }}
        />
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{
          border: "none",
          marginTop: "48px" // Account for the toggle button
        }}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />

      <div style={{
        position: "absolute",
        bottom: 16,
        left: collapsed ? 8 : 16,
        right: collapsed ? 8 : 16
      }}>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{
            width: "100%",
            color: "#e91e63",
            border: "1px solid #ffd1dc",
          }}
        >
          {!collapsed && "Logout"}
        </Button>
      </div>
    </Sider>
  );
}