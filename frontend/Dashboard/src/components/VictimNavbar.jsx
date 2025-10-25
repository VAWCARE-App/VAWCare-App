// src/components/VictimNavbar.jsx
import React, { useMemo, useState } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Button,
  Typography,
  Dropdown,
  Drawer,
  Grid,
  Space,
  Badge,
  Divider,
} from "antd";
import {
  DashboardOutlined,
  FileAddOutlined,
  UserSwitchOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  LogoutOutlined,
  PhoneOutlined,
  MenuOutlined,
  ExclamationCircleFilled,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { clearToken, api, isTokenProbablyJwt } from "../lib/api";
import logo from "../assets/logo1.png";
import EmergencyButton from "./EmergencyButtonAlt";

const { Header } = Layout;
const { Text } = Typography;

export default function VictimNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    soft: "rgba(122,90,248,0.18)",
    headerBg:
      "linear-gradient(180deg, rgba(255,255,255,.86) 0%, rgba(248,246,255,.72) 100%)",
  };

  const [open, setOpen] = useState(false);

  const currentUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    []
  );
  const initials =
    (currentUser.firstName || "U").charAt(0) +
    (currentUser.lastName || "").charAt(0);

  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (token && isTokenProbablyJwt(token)) {
        await Promise.race([
          api.post("/api/auth/logout"),
          new Promise((r) => setTimeout(r, 1500)),
        ]).catch(() => { });
      }
    } catch { }
    clearToken();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  const onNav = (key) => {
    setOpen(false);
    navigate(key);
  };

  // Profile dropdown (shown only when avatar is clicked)
  const userMenu = {
    items: [
      {
        key: "home",
        icon: <HomeOutlined />,
        label: <span>Home</span>,
        onClick: () => navigate("/"), // go to landing page / home
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: <span style={{ color: BRAND.pink }}>Logout</span>,
        onClick: handleLogout,
      },
    ],
  };

  // Desktop nav items
  const desktopItems = [
    { key: "/victim/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/victim/report", icon: <FileAddOutlined />, label: "Report Case" },
    { key: "/victim/victim-cases", icon: <UserSwitchOutlined />, label: "My Cases" },
    { key: "/victim/victim-barangay", icon: <InfoCircleOutlined />, label: "Barangay" },
    { key: "/victim/victim-settings", icon: <SettingOutlined />, label: "Settings" },
    
  ];

  // Mobile drawer items (Emergency first)
  const drawerItems = [
    {
      key: "/victim/emergency",
      label: (
        <div className="drawer-pill emergency-pill">
          <ExclamationCircleFilled />
          <span>Emergency</span>
        </div>
      ),
    },
    {
      key: "/victim/dashboard",
      icon: <DashboardOutlined />,
      label: <span className="drawer-pill">Dashboard</span>,
    },
    {
      key: "/victim/report",
      icon: <FileAddOutlined />,
      label: <span className="drawer-pill">Report Case</span>,
    },
    {
      key: "/victim/victim-cases",
      icon: <UserSwitchOutlined />,
      label: <span className="drawer-pill">My Cases</span>,
    },
    {
      key: "/victim/victim-barangay",
      icon: <InfoCircleOutlined />,
      label: <span className="drawer-pill">Barangay</span>,
    },
    {
      key: "/victim/victim-settings",
      icon: <SettingOutlined />,
      label: <span className="drawer-pill">Settings</span>,
    },
   
  ];

  return (
    <>
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 64,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          background: BRAND.headerBg,
          borderBottom: `1px solid ${BRAND.soft}`,
          backdropFilter: "blur(10px) saturate(140%)",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar src={logo} size={36} />
          <div style={{ lineHeight: 1 }}>
            <Text strong style={{ fontSize: 18, color: BRAND.violet }}>
              VAWCare
            </Text>
            <div style={{ fontSize: 11, color: "#8A8A8A" }}>Support & Safety</div>
          </div>
        </div>

        {/* Desktop translucent-pill menu */}
        {screens.md ? (
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            onClick={({ key }) => onNav(key)}
            items={desktopItems}
            className="victim-glass-pills"
            style={{
              justifySelf: "center",
              background: "transparent",
              borderBottom: "none",
            }}
          />
        ) : (
          <div />
        )}

        {/* Actions */}
        <Space align="center" size={8}>
          <EmergencyButton compact />
          {screens.sm && (
            <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
              <Button
                type="text"
                aria-label="Account menu"
                style={{
                  padding: "10px 12px",   // taller padding
                  minHeight: 40,
                  borderRadius: 12,
                  border: `1px solid ${BRAND.soft}`,
                  background: "rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
                  backdropFilter: "blur(6px) saturate(140%)",
                }}
              >
                <Badge>
                  <Avatar style={{ background: BRAND.violet, fontWeight: 700 }} size={28}>
                    {initials}
                  </Avatar>
                </Badge>
                <div style={{ lineHeight: 1, textAlign: "left" }}>
                  <Text strong style={{ fontSize: 12 }}>
                    {currentUser.firstName
                      ? `${currentUser.firstName} ${currentUser.lastName || ""}`
                      : "Anonymous"}
                  </Text>
                  <div style={{ fontSize: 11, color: "#888" }}>Victim</div>
                </div>
              </Button>
            </Dropdown>
          )}
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              style={{ fontSize: 18, color: BRAND.violet, borderRadius: 10 }}
            />
          )}
        </Space>
      </Header>

      {/* Mobile Sidebar / Drawer */}
      <Drawer
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        width={304}
        bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
        styles={{
          header: { display: "none" },
          body: { background: "linear-gradient(180deg,#fbfaff,#fff)" },
        }}
      >
        {/* Brand header */}
        <div
          style={{
            padding: 14,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(246,243,255,0.8))",
            borderBottom: `1px solid ${BRAND.soft}`,
            backdropFilter: "blur(6px) saturate(140%)",
          }}
        >
          <Space align="center" size={12}>
            <Avatar src={logo} size={36} />
            <div style={{ lineHeight: 1 }}>
              <Text strong style={{ color: BRAND.violet }}>VAWCare</Text>
              <div style={{ fontSize: 11, color: "#8A8A8A" }}>Support & Safety</div>
            </div>
          </Space>
        </div>

        {/* Scrollable nav */}
        <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={({ key }) => onNav(key)}
            items={drawerItems}
            className="victim-drawer-glass"
            style={{ border: "none", background: "transparent" }}
          />
        </div>

        {/* Footer: profile (opens dropdown on click) */}
        <div
          style={{
            padding: 12,
            borderTop: `1px solid ${BRAND.soft}`,
            background: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(246,243,255,.9))",
            backdropFilter: "blur(8px) saturate(140%)",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              padding: 10,
              background: "rgba(255,255,255,0.95)",
              border: `1px solid ${BRAND.soft}`,
            }}
          >
            <Dropdown menu={userMenu} trigger={["click"]} placement="topLeft">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  height: 40,
                }}
              >
                <Space align="center" size={10}>
                  <Badge dot color={BRAND.violet}>
                    <Avatar style={{ background: BRAND.violet, fontWeight: 700 }} size={34}>
                      {initials}
                    </Avatar>
                  </Badge>
                  <div style={{ lineHeight: 1 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {currentUser.firstName
                        ? `${currentUser.firstName} ${currentUser.lastName || ""}`
                        : "Anonymous"}
                    </Text>
                    <div style={{ fontSize: 11, color: "#888" }}>Victim</div>
                  </div>
                </Space>
                <Button type="text" size="small" style={{ color: "#666" }}>
                  Account & Help
                </Button>
              </div>
            </Dropdown>

            <Divider style={{ margin: "10px 0" }} />
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
              style={{
                borderRadius: 12,
                height: 40,
                border: `1px solid ${BRAND.soft}`,
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Styles */}
      <style>{`
        /* === Desktop glassy pill menu (no hard box) === */
        .victim-glass-pills .ant-menu-overflow-item { padding-inline: 0 !important; }
        .victim-glass-pills .ant-menu-item {
          margin: 0 6px;
          height: 40px;
          line-height: 40px;
          padding: 0 16px !important;
          border-radius: 999px;
          background: transparent;
          color: #5248b8;
          font-weight: 600;
          position: relative;
          overflow: hidden;
          transition: color .15s ease;
          border: none !important;
          outline: none !important;
        }
        /* overlay used for hover/selected glow */
        .victim-glass-pills .ant-menu-item::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: transparent;
          transition: background .15s ease, box-shadow .15s ease;
          pointer-events: none;
        }
        .victim-glass-pills .ant-menu-item:hover { color: ${BRAND.violet}; }
        .victim-glass-pills .ant-menu-item:hover::before {
          background: rgba(255,255,255,0.40);
          box-shadow: 0 10px 22px rgba(122,90,248,0.10);
        }
        .victim-glass-pills .ant-menu-item-selected {
          color: ${BRAND.violet};
        }
        .victim-glass-pills .ant-menu-item-selected::before {
          background: rgba(255,255,255,0.55);
          box-shadow: 0 14px 28px rgba(122,90,248,0.14);
        }
        .victim-glass-pills .ant-menu-item::after { display: none !important; }
        .victim-glass-pills .ant-menu-item a,
        .victim-glass-pills .ant-menu-item a:focus,
        .victim-glass-pills .ant-menu-item:focus,
        .victim-glass-pills .ant-menu-item-selected:focus {
          outline: none !important;
          box-shadow: none !important;
        }

        /* === Drawer (mobile) glass menu === */
        .victim-drawer-glass .ant-menu-item {
          margin: 8px 0;
          height: 48px;
          line-height: 48px;
          border-radius: 16px;
          font-weight: 600;
          color: #4a4a4a;
          background: rgba(255,255,255,0.55);
          border: 1px solid ${BRAND.soft};
          backdrop-filter: blur(8px) saturate(140%);
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .victim-drawer-glass .ant-menu-item:hover {
          transform: translateY(-1px);
          color: ${BRAND.violet};
          background: rgba(255,255,255,0.7);
          box-shadow: 0 10px 20px rgba(122,90,248,0.10);
        }
        .victim-drawer-glass .ant-menu-item-selected {
          color: ${BRAND.violet};
          background: rgba(255,255,255,0.85);
          box-shadow: 0 12px 24px rgba(122,90,248,0.12);
          border-color: ${BRAND.soft};
        }
        .victim-drawer-glass .ant-menu-item::after { display: none; }

        /* Uniform label visuals inside items */
        .drawer-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 48px;
        }
        .drawer-pill.emergency-pill {
          color: ${BRAND.pink};
          font-weight: 700;
        }
        .drawer-pill.emergency-pill .anticon { font-size: 18px; }
      `}</style>
    </>
  );
}
