import React, { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Button, Drawer, Grid, Space, Tooltip, Badge } from "antd";
import { Link, useLocation } from "react-router-dom";
import {
  MenuOutlined,
  LoginOutlined,
  UserSwitchOutlined,
  MoonOutlined,
  BulbOutlined,
  LogoutOutlined
} from "@ant-design/icons";
import { clearAllStorage, getUserData } from "../lib/api";

const { Header } = Layout;

export default function Navbar({
  // OPTIONAL: parent can drive the theme
  dark = false,
  onToggleTheme, // () => void
}) {
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  // Active key from hash or path
  const activeKey = useMemo(() => {
    if (location.hash) return location.hash.replace("#", "");
    if (location.pathname === "/login") return "login";
    if (location.pathname === "/admin/login") return "admin";
    return "home";
  }, [location]);

  const handleLogout = () => {
    clearAllStorage();
    setUser(null);
    window.location.reload(); // optional
  }

  useEffect(() => {
    // Fetch user data from secure backend endpoint
    const fetchUser = async () => {
      try {
        // First check if user is authenticated by checking sessionStorage
        const userType = sessionStorage.getItem("userType");
        if (!userType) {
          // Not authenticated
          setUser(null);
          return;
        }
        
        const userData = await getUserData();
        if (userData) {
          setUser(userData);
        } else {
          // Backend returned no user data, clear state
          setUser(null);
        }
      } catch (err) {
        console.warn('Failed to fetch user data:', err);
        setUser(null);
      }
    };
    
    fetchUser();
    
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { key: "home", label: <a href="#home">Home</a> },
    { key: "about", label: <a href="#about">About</a> },
    { key: "news", label: <a href="#news">News</a> },
    { key: "location", label: <a href="#location">Location</a> },
  ];

  return (
    <>
      {/* Styles that use your CSS variables so dark mode “just works” */}
      <style>{`
        .nav-wrap {
          width: 100%;
          margin: 8px auto;
          padding: 8px 12px;
          max-width: 1200px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in oklab, var(--card) 90%, transparent);
          backdrop-filter: saturate(160%) blur(10px);
          transition: box-shadow .25s ease, border-color .25s ease, background .25s ease;
        }
        @media (min-width: 768px) {
          .nav-wrap { padding: 10px 16px; }
        }
        .nav-shadow-none { box-shadow: none; }
        .nav-shadow-lite { box-shadow: 0 6px 24px rgba(233,30,99,0.08); }
        .nav-shadow-dark { box-shadow: 0 6px 24px rgba(0,0,0,0.35); }

        .brand-dot {
          width: 12px; height: 12px; border-radius: 999px; display: inline-block; background: var(--brand);
        }
        .brand-title {
          font-weight: 900; letter-spacing: .2px; color: var(--ink); font-size: 18px;
        }

        .ant-menu-horizontal {
          border-bottom: none !important;
          background: transparent !important;
        }

        /* Button tweaks that respect tokens/vars */
        .btn-outline {
          border-radius: 999px;
          border-color: color-mix(in oklab, var(--ink) 10%, transparent);
        }
        .btn-primary {
          border-radius: 999px;
          background: var(--brand) !important;
          border-color: var(--brand) !important;
        }
      `}</style>

      <Header
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          paddingInline: 0,
        }}
      >
        {/* Glass bar container */}
        <div
          className={`nav-wrap ${scrolled ? (dark ? "nav-shadow-dark" : "nav-shadow-lite") : "nav-shadow-none"
            }`}
        >
          {/* Brand */}
          <Link to="/landing" style={{ textDecoration: "none" }}>
            <Space align="center" size={10}>
              <span className="brand-dot" />
              <span className="brand-title">VAWCare</span>
              <Badge
                count="beta"
                style={{
                  backgroundColor: dark ? "rgba(255,255,255,0.12)" : "#111",
                  color: "#fff",
                  fontSize: 10,
                }}
              />
            </Space>
          </Link>

          {/* Desktop menu */}
          {screens.md ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Menu
                mode="horizontal"
                selectedKeys={[activeKey]}
                items={navItems}
                style={{ display: "flex", gap: 4 }}
                overflowedIndicator={<MenuOutlined />}
              />
              <Space size={8}>
                {typeof onToggleTheme === "function" && (
                  <Tooltip title={dark ? "Switch to light mode" : "Switch to dark mode"}>
                    <Button
                      type="text"
                      aria-label="Toggle theme"
                      icon={dark ? <BulbOutlined /> : <MoonOutlined />}
                      onClick={onToggleTheme}
                    />
                  </Tooltip>
                )}
                {user ? (
                  <>
                    <Tooltip title={`Logged in as ${user.firstName}`}>
                      <Button
                        size="middle"
                        icon={<UserSwitchOutlined />}
                        className="btn-outline"
                        onClick={() => {
                          if (user.userType === "admin") {
                            window.location.href = "/admin";
                          } else if (user.userType === "official") {
                            window.location.href = "/admin/official-dashboard";
                          } else {
                            window.location.href = "/victim";
                          }
                        }}
                      >
                        {user.userType === "admin"
                          ? "Admin Panel"
                          : user.userType === "official"
                            ? "Official Panel"
                            : "Dashboard"}
                      </Button>
                    </Tooltip>
                    <Button
                      type="primary"
                      danger
                      onClick={handleLogout}
                      icon={<LogoutOutlined />}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/admin/login">
                      <Button size="middle" icon={<UserSwitchOutlined />} className="btn-outline">
                        Admin
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button type="primary" icon={<LoginOutlined />} className="btn-primary">
                        Login
                      </Button>
                    </Link>
                  </>
                )}
              </Space>
            </div>
          ) : (
            // Mobile: burger + drawer
            <Space>
              {typeof onToggleTheme === "function" && (
                <Button
                  type="text"
                  aria-label="Toggle theme"
                  icon={dark ? <BulbOutlined /> : <MoonOutlined />}
                  onClick={onToggleTheme}
                />
              )}
              <Button
                type="text"
                icon={<MenuOutlined />}
                aria-label="Open menu"
                onClick={() => setOpen(true)}
              />
              <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title={
                  <Space align="center">
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: "var(--brand)",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontWeight: 800, color: "var(--ink)" }}>VAWCare</span>
                  </Space>
                }
                placement="right"
              >
                <Menu
                  mode="inline"
                  selectedKeys={[activeKey]}
                  items={[
                    ...navItems,
                    { type: "divider" },
                  ]}
                  onClick={() => setOpen(false)}
                />

                <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 12 }}>
                  {user ? (
                    <>
                      <Button
                        block
                        icon={<UserSwitchOutlined />}
                        className="btn-outline"
                        onClick={() => {
                          setOpen(false);
                          if (user.userType === "admin") {
                            window.location.href = "/admin";
                          } else if (user.userType === "official") {
                            window.location.href = "/admin/official-dashboard";
                          } else {
                            window.location.href = "/victim";
                          }
                        }}
                      >
                        {user.userType === "admin"
                          ? "Admin Panel"
                          : user.userType === "official"
                            ? "Official Panel"
                            : "Dashboard"}
                      </Button>

                      <Button
                        block
                        danger
                        type="primary"
                        icon={<LogoutOutlined />}
                        onClick={() => {
                          setOpen(false);
                          handleLogout();
                        }}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/admin/login" onClick={() => setOpen(false)}>
                        <Button block icon={<UserSwitchOutlined />} className="btn-outline">
                          Admin
                        </Button>
                      </Link>
                      <Link to="/login" onClick={() => setOpen(false)}>
                        <Button block type="primary" icon={<LoginOutlined />} className="btn-primary">
                          Login
                        </Button>
                      </Link>
                    </>
                  )}
                </Space>
              </Drawer>
            </Space>
          )}
        </div>
      </Header>

      {/* Offset for fixed header (matches the outer container + inner padding) */}
      <div style={{ height: 76 }} />
    </>
  );
}
