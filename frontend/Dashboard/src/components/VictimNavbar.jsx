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
import { clearToken, api, clearAllStorage, getUserData } from "../lib/api";
import logo from "../assets/logo1.png";
import EmergencyButton from "./EmergencyButtonAlt";

const { Header } = Layout;
const { Text } = Typography;

export default function VictimNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const BRAND = {
    primary: "#7A5AF8",
    primaryAlt: "#e91e63",
    violet: "#7A5AF8",
    pink: "#e91e63",
    border: "rgba(122,90,248,0.18)",
    panel: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    rail: "linear-gradient(180deg, #f6f0ff 0%, #ffe9f3 100%)",
    headerBg: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    shadow: "0 2px 12px rgba(0,0,0,0.04)",
  };

  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({});

  // Fetch user data from secure backend endpoint
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUserData();
        if (userData) {
          setCurrentUser(userData);
        }
      } catch (err) {
        console.warn('Failed to fetch user data:', err);
      }
    };
    
    fetchUser();
  }, []);

  const currentUserMemo = useMemo(
    () => currentUser,
    [currentUser]
  );
  const initials =
    (currentUserMemo.firstName || "U").charAt(0) +
    (currentUserMemo.lastName || "").charAt(0);

  const handleLogout = async () => {
    try {
      // Token is now in HTTP-only cookie, always attempt logout
      // The API call will use the cookie automatically via withCredentials
      await Promise.race([
        api.post("/api/auth/logout"),
        new Promise((r) => setTimeout(r, 1500)),
      ]).catch(() => { });
    } catch { }
    clearAllStorage();
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
      label: <span className="drawer-pill">Cases & Reports</span>,
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
          borderBottom: `1px solid ${BRAND.border}`,
          backdropFilter: "blur(10px) saturate(140%)",
          boxShadow: BRAND.shadow,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Hamburger Menu Button for Mobile */}
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              style={{ 
                fontSize: 20, 
                color: BRAND.primary, 
                borderRadius: 10,
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          )}
          <Avatar src={logo} size={36} />
          <div style={{ lineHeight: 1 }}>
            <Text strong style={{ fontSize: 18, color: BRAND.primary, fontWeight: 600 }}>
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
                  <Avatar style={{ background: BRAND.primary, fontWeight: 600 }} size={28}>
                    {initials}
                  </Avatar>
                </Badge>
                <div style={{ lineHeight: 1, textAlign: "left" }}>
                  <Text strong style={{ fontSize: 12, fontWeight: 600 }}>
                    {currentUser.firstName
                      ? `${currentUser.firstName} ${currentUser.lastName || ""}`
                      : "Anonymous"}
                  </Text>
                </div>
              </Button>
            </Dropdown>
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
            height: 70,
            background: BRAND.panel,
            borderBottom: `1px solid ${BRAND.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar src={logo} size={40} style={{ background: "#efeafd" }} />
          <div style={{ lineHeight: 1.1 }}>
            <Text style={{ color: BRAND.primary, fontWeight: 800, fontSize: 16 }}>VAWCare</Text>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge color={BRAND.primary} dot />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentUser.firstName ? `Hi, ${currentUser.firstName}` : "Welcome"}
              </Text>
            </div>
          </div>
        </div>

        {/* Scrollable nav with rail */}
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            padding: 10,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #f6f0ff 0%, #ffe9f3 100%)",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 18,
              padding: 12,
              display: "grid",
              gap: 10,
              boxShadow: "0 18px 48px rgba(122,90,248,0.08)",
              width: "92%",
              margin: "8px auto",
            }}
          >
            {desktopLinks.map(({ key, icon, text }) => {
              const active = location.pathname === key;
              return (
                <button
                  key={key}
                  onClick={() => onNav(key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    height: 52,
                    padding: "0 16px",
                    fontSize: 15,
                    fontWeight: 700,
                    color: active ? BRAND.primary : "#5a4eb1",
                    borderRadius: 16,
                    background: active ? "#fff" : "#ffffff",
                    boxShadow: active
                      ? "0 18px 40px rgba(122,90,248,0.14)"
                      : "0 8px 22px rgba(0,0,0,0.06)",
                    border: active
                      ? `1px solid rgba(122,90,248,0.12)`
                      : "1px solid rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "transform .15s ease, box-shadow .18s ease, background .15s ease, color .15s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      width: 36,
                      height: 36,
                      display: "grid",
                      placeItems: "center",
                      color: BRAND.primary,
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    {icon}
                  </span>
                  <span>{text}</span>
                </button>
              );
            })}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(122,90,248,0.2), transparent)",
                margin: "4px 0",
              }}
            />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                height: 52,
                padding: "0 16px",
                fontSize: 15,
                fontWeight: 700,
                color: BRAND.primaryAlt,
                borderRadius: 16,
                background: "#ffffff",
                boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
                border: "1px solid rgba(233,30,99,0.12)",
                cursor: "pointer",
                transition: "transform .15s ease, box-shadow .18s ease, background .15s ease, color .15s ease",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  color: BRAND.primaryAlt,
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <LogoutOutlined />
              </span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Footer: User Profile Card */}
        <div
          style={{
            padding: 12,
            borderTop: `1px solid ${BRAND.border}`,
            background: BRAND.panel,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              padding: 14,
              background: "rgba(255,255,255,0.95)",
              border: `1px solid ${BRAND.border}`,
              boxShadow: "0 4px 12px rgba(122,90,248,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Badge dot color={BRAND.primary}>
              <Avatar style={{ background: BRAND.primary, fontWeight: 700 }} size={40}>
                {initials}
              </Avatar>
            </Badge>
            <div style={{ flex: 1, lineHeight: 1.3 }}>
              <Text strong style={{ fontSize: 14, fontWeight: 700, display: "block" }}>
                {currentUser.firstName
                  ? `${currentUser.firstName} ${currentUser.lastName || ""}`
                  : "Anonymous"}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Victim Portal
              </Text>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Styles */}
      <style>{`
        /* Reset AntD item box so the pill inside controls the shape */
        .victim-glass-pills .ant-menu,
        .victim-glass-pills { background: transparent !important; border-bottom: 0 !important; }

        .victim-glass-pills .ant-menu-overflow-item { padding-inline: 0 !important; }

        .victim-glass-pills .ant-menu-item {
          padding: 0 !important;
          margin: 0 8px;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          line-height: 1;          /* let the inner pill define height */
        }
        .victim-glass-pills .ant-menu-item::after { display: none !important; }

        /* The actual rounded pill */
        .victim-glass-pills .ant-menu-item .nav-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 40px;
          padding: 0 18px;
          border-radius: 999px; /* <- TRUE pill */
          background: #fff;
          color: #5a4eb1;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
        }

        /* Hover state */
        .victim-glass-pills .ant-menu-item:hover .nav-pill {
          color: ${BRAND.primary};
          background: #fff;
          box-shadow: 0 10px 20px rgba(122,90,248,0.14);
          transform: translateY(-1px);
        }

        /* Selected/active item */
        .victim-glass-pills .ant-menu-item.is-active .nav-pill,
        .victim-glass-pills .ant-menu-item-selected .nav-pill {
          color: ${BRAND.primary};
          background: #f2edff;
          border-color: rgba(122,90,248,0.12);
          box-shadow: 0 14px 28px rgba(122,90,248,0.18);
        }

        .victim-glass-pills .ant-menu-item a,
        .victim-glass-pills .ant-menu-item a:focus,
        .victim-glass-pills .ant-menu-item:focus,
        .victim-glass-pills .ant-menu-item-selected:focus {
          outline: none !important;
          box-shadow: none !important;
          
        }

        /* === Drawer (mobile) glass menu === */
        .victim-drawer-glass .ant-menu-item {
          margin: 10px 0;
          height: 52px;
          line-height: 52px;
          border-radius: 26px;
          font-weight: 700;
          font-size: 15px;
          color: #5a4eb1;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 8px 22px rgba(0,0,0,0.06);
          transition: transform .15s ease, box-shadow .18s ease, background .15s ease, color .15s ease;
        }
        .victim-drawer-glass .ant-menu-item:hover {
          transform: translateY(-1px);
          color: ${BRAND.primary};
          background: #fff;
          box-shadow: 0 10px 24px rgba(122,90,248,0.14);
        }
        .victim-drawer-glass .ant-menu-item-selected {
          color: ${BRAND.primary};
          background: #fff;
          box-shadow: 0 18px 40px rgba(122,90,248,0.14);
          border-color: rgba(122,90,248,0.12);
        }
        .victim-drawer-glass .ant-menu-item::after { display: none; }

        /* Uniform label visuals inside items */
        .drawer-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 52px;
        }
        .drawer-pill.emergency-pill {
          color: ${BRAND.primaryAlt};
          font-weight: 700;
        }
        .drawer-pill.emergency-pill .anticon { font-size: 18px; }
      `}</style>
    </>
  );
}
