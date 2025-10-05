import React, { useMemo } from "react";
import { Layout, Menu, Button, Typography, Avatar, Badge, Divider } from "antd";
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
  ExclamationCircleOutlined,
  FileAddOutlined,
  UserSwitchOutlined,
  MessageOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { clearToken } from "../lib/api";
import logo from "../assets/logo1.png";

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const BRAND = {
    primary: "#e91e63",
    primarySoft: "#ffd1dc",
    bgGrad: "linear-gradient(180deg, #ffffff 0%, #fff5f8 60%, #ffe6ef 100%)",
    border: "#ffd1dc",
    muted: "#7a7a7a",
  };

  const handleLogout = () => {
    clearToken();
    if (userType === "admin" || userType === "official") {
      navigate("/admin/login");
    } else {
      navigate("/login");
    }
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    
  };

  const currentUser = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "{}"),
    []
  );
  const userType = localStorage.getItem("userType") || "victim";
  const initials = useMemo(() => {
    const a = (currentUser.firstName || "").charAt(0);
    const b = (currentUser.lastName || "").charAt(0);
    return (a + b || "U").toUpperCase();
  }, [currentUser]);

  // MENU SETS
  const adminMenu = [
    { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/admin/users", icon: <TeamOutlined />, label: "User Management" },
    { key: "/admin/create-official", icon: <UserSwitchOutlined />, label: "Create Official" },
    { key: "/admin/reports", icon: <FileTextOutlined />, label: "Reports" },
    { key: "/admin/cases", icon: <TeamOutlined />, label: "Cases" },
    { key: "/admin/bpo", icon: <FileAddOutlined />, label: "BPO Form" },
    { key: "/admin/bpo-management", icon: <FileTextOutlined />, label: "BPO Management" },
    { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings" },
     { key: "/landing", icon: <HomeOutlined />, label: "Landing Page" }

  ];

  const officialMenu = [
    { key: "/admin/official-dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/admin/create-official", icon: <UserSwitchOutlined />, label: "Create Official" },
    { key: "/landing", icon: <HomeOutlined />, label: "Landing Page" },
    { key: "/admin/reports", icon: <FileTextOutlined />, label: "Reports" },
    { key: "/admin/official-cases", icon: <TeamOutlined />, label: "Cases" },
    { key: "/admin/bpo", icon: <FileAddOutlined />, label: "BPO Form" },
    { key: "/admin/bpo-management", icon: <FileTextOutlined />, label: "BPO Management" },
    { key: "/admin/official-settings", icon: <SettingOutlined />, label: "Settings" },
    { key: "/admin/reports", icon: <FileTextOutlined />, label: "Reports" }
  ];

  const victimMenu = [
    { key: "/victim/victim-test", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/victim/emergency", icon: <ExclamationCircleOutlined />, label: "Emergency Button" },
    { key: "/victim/report", icon: <FileAddOutlined />, label: "Report-Case" },
    { key: "/victim/victim-cases", icon: <UserSwitchOutlined />, label: "My Cases" },
    { key: "/victim/victim-chatbot", icon: <MessageOutlined />, label: "VAWCare Chatbot" },
    { key: "/victim/victim-barangay", icon: <InfoCircleOutlined />, label: "Barangay Details" },
    { key: "/victim/victim-settings", icon: <SettingOutlined />, label: "Settings" },
  ];

  let menuItems = adminMenu;
  if (userType === "official") menuItems = officialMenu;
  else if (userType === "victim") menuItems = victimMenu;

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      style={{
        background: BRAND.bgGrad,
        borderRight: `1px solid ${BRAND.border}`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 10, // stays above content
      }}
      className="sider-modern"
    >
      {/* Brand / User card */}
      <div
        style={{
          padding: collapsed ? "14px 10px" : "16px",
          borderBottom: `1px solid ${BRAND.border}`,
          display: "grid",
          gridTemplateColumns: collapsed ? "1fr auto" : "48px 1fr auto",
          alignItems: "center",
          gap: 12,
          backdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <Avatar
          src={!collapsed ? logo : undefined}
          size={collapsed ? 32 : 40}
          style={{
            background: BRAND.primarySoft,
            color: BRAND.primary,
            fontWeight: 700,
          }}
        >
          {collapsed ? (
            <img alt="VAWCare" src={logo} style={{ width: 22, height: 22 }} />
          ) : (
            <img alt="VAWCare" src={logo} style={{ width: 26, height: 26 }} />
          )}
        </Avatar>

        {!collapsed && (
          <div style={{ lineHeight: 1 }}>
            <Text style={{ color: BRAND.primary, fontWeight: 800 }}>VAWCare</Text>
            <div style={{ marginTop: 2 }}>
              <Badge color={BRAND.primary} dot style={{ marginRight: 6 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentUser.firstName ? `Hi, ${currentUser.firstName}` : "Welcome"}
              </Text>
            </div>
          </div>
        )}

        <Button
          size="small"
          type="text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            color: BRAND.primary,
            borderRadius: 8,
          }}
        />
      </div>

      {/* Menu */}
      <div style={{ padding: collapsed ? "8px 6px" : "12px 12px", flex: 1 }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{
            border: "none",
            background: "transparent",
          }}
          className="menu-modern"
        />
      </div>

      {/* Footer / Logout */}
      <div
        style={{
          borderTop: `1px solid ${BRAND.border}`,
          padding: collapsed ? 8 : 12,
        }}
      >
        {!collapsed && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: "#ffffffa6",
                border: `1px solid ${BRAND.border}`,
                borderRadius: 12,
              }}
            >
              <Avatar
                style={{ background: BRAND.primary, fontWeight: 700 }}
                size={28}
              >
                {initials}
              </Avatar>
              <div style={{ lineHeight: 1 }}>
                <Text strong style={{ fontSize: 12 }}>
                  {currentUser.firstName
                    ? `${currentUser.firstName} ${currentUser.lastName || ""}`
                    : "User"}
                </Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {userType.charAt(0).toUpperCase() + userType.slice(1)}
                  </Text>
                </div>
              </div>
            </div>
            <Divider style={{ margin: "10px 0" }} />
          </>
        )}

        <Button
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
          style={{
            color: BRAND.primary,
            border: `1px solid ${BRAND.border}`,
            background: "#fff",
            borderRadius: 10,
            height: 38,
            fontWeight: 600,
          }}
        >
          {!collapsed && "Logout"}
        </Button>
      </div>

      {/* Scoped styles to polish look */}
      <style>
        {`
          .sider-modern .ant-menu-item {
            margin: 6px 6px;
            height: 40px;
            line-height: 40px;
            border-radius: 12px;
            color: #444;
            font-weight: 500;
          }
          .sider-modern .ant-menu-item .anticon {
            font-size: 16px;
          }
          .sider-modern .ant-menu-item:hover {
            background: #fff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.06);
            color: ${BRAND.primary};
          }
          .sider-modern .ant-menu-item-selected {
            background: #fff;
            color: ${BRAND.primary};
            box-shadow: 0 10px 24px rgba(233,30,99,0.12);
            border: 1px solid ${BRAND.border};
          }
          .sider-modern .ant-menu-item-selected .anticon {
            color: ${BRAND.primary};
          }
          .sider-modern .ant-menu {
            background: transparent !important;
          }
          .sider-modern .ant-menu-item::after {
            display: none !important; /* remove default left bar */
          }
        `}
      </style>
    </Sider>
  );
}
