// src/components/Sidebar.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  Layout,
  Button,
  Typography,
  Avatar,
  Badge,
  Grid,
  Popover,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AlertOutlined,
  HomeOutlined,
  FileAddOutlined,
  UserSwitchOutlined,
  MessageOutlined,
  InfoCircleOutlined,
  DownOutlined,
  UserAddOutlined,
  UnorderedListOutlined,
  FileSearchOutlined,
  BellOutlined,
  FolderOpenOutlined,
  BankOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { clearAllStorage, api, getUserData } from "../lib/api";
import logo from "../assets/logo1.png";

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const BRAND = {
    primary: "#7A5AF8",
    primaryAlt: "#e91e63",
    panel: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    rail: "linear-gradient(180deg, #f6f0ff 0%, #ffe9f3 100%)",
    border: "rgba(122,90,248,0.18)",
  };

  // Toggle via global event from header
  useEffect(() => {
    const handler = () => {
      flushSync(() => {
        setCollapsed((c) => !c);
      });
    };
    window.addEventListener("toggle-sider", handler);
    return () => window.removeEventListener("toggle-sider", handler);
  }, [setCollapsed]);

  // Navigation handler for instant navigation
  const handleNavigate = (path) => {
    if (location.pathname !== path) {
      navigate(path);
    }
    if (isMobile) {
      setCollapsed(true);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await Promise.race([
        api.post("/api/auth/logout"),
        new Promise((r) => setTimeout(r, 1500)),
      ]).catch(() => {});
    } catch {}
    clearAllStorage();
    navigate("/");
  };

  // User
  const [currentUser, setCurrentUser] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const userData = await getUserData();
        if (userData) setCurrentUser(userData);
      } catch (err) {
        console.warn("Failed to fetch user data:", err);
      }
    })();
  }, []);

  const userType = sessionStorage.getItem("userType") || "victim";
  const initials = useMemo(() => {
    const a = (currentUser.firstName || "").charAt(0);
    const b = (currentUser.lastName || "").charAt(0);
    return (a + b || "U").toUpperCase();
  }, [currentUser]);

  // Menus
  const adminMenu = useMemo(
    () => [
      { type: "item", key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
      {
        type: "group",
        key: "management",
        icon: <TeamOutlined />,
        label: "Users",
        base: "/admin/users",
        children: [
          { key: "/admin/create-official", label: "Add Official", icon: <UserAddOutlined /> },
          { key: "/admin/users", label: "View Users", icon: <UnorderedListOutlined /> },
        ],
      },
      {
        type: "group",
        key: "reports",
        icon: <FileTextOutlined />,
        label: "Case & Reports",
        base: "/admin/reports",
        labelClass: "pink",
        children: [
          { key: "/admin/reports", label: "View Reports", icon: <FileSearchOutlined /> },
          { key: "/admin/alerts", label: "View Alerts", icon: <BellOutlined /> },
          { key: "/admin/cases", label: "View Cases", icon: <FolderOpenOutlined /> },
          { key: "/admin/bpo-management", label: "View BPO", icon: <BankOutlined /> },
        ],
      },
      { type: "item", key: "/admin/logs", icon: <IdcardOutlined />, label: "System Logs" },
      { type: "item", key: "/admin/settings", icon: <SettingOutlined />, label: "Settings" },
      { type: "item", key: "/landing", icon: <HomeOutlined />, label: "Home" },
    ],
    []
  );

  const officialMenu = useMemo(
    () => [
      { type: "item", key: "/admin/official-dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
      { type: "item", key: "/admin/create-official", icon: <UserSwitchOutlined />, label: "Create Official" },
      {
        type: "group",
        key: "official-cases",
        icon: <TeamOutlined />,
        label: "Cases",
        base: "/admin/official-cases",
        children: [{ key: "/admin/official-cases", label: "View Cases", icon: <FolderOpenOutlined /> }],
      },
      {
        type: "group",
        key: "official-reports",
        icon: <FileTextOutlined />,
        label: "Reports",
        base: "/admin/reports",
        children: [
          { key: "/admin/reports", label: "View Reports", icon: <FileSearchOutlined /> },
          { key: "/admin/alerts", label: "View Alerts", icon: <AlertOutlined /> },
          { key: "/admin/bpo-management", label: "View BPO", icon: <BankOutlined /> },
        ],
      },
      { type: "item", key: "/admin/official-settings", icon: <SettingOutlined />, label: "Settings" },
      { type: "item", key: "/landing", icon: <HomeOutlined />, label: "Home" },
    ],
    []
  );

  const victimMenu = useMemo(
    () => [
      { type: "item", key: "/victim/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
      { type: "item", key: "/victim/report", icon: <FileAddOutlined />, label: "Report" },
      { type: "item", key: "/victim/messages", icon: <MessageOutlined />, label: "Messages" },
      { type: "item", key: "/victim/help", icon: <InfoCircleOutlined />, label: "Help" },
    ],
    []
  );

  const menu = useMemo(() => {
    if (userType === "official") return officialMenu;
    if (userType === "victim") return victimMenu;
    return adminMenu;
  }, [userType, adminMenu, officialMenu, victimMenu]);

  // Default open groups
  const defaultOpen = (pathname) => {
    const open = [];
    if (
      pathname.startsWith("/admin/reports") ||
      pathname.startsWith("/admin/alerts") ||
      pathname.startsWith("/admin/cases") ||
      pathname.startsWith("/admin/bpo-management")
    )
      open.push("reports", "official-reports");
    if (
      pathname.startsWith("/admin/create-official") ||
      pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/official-cases")
    )
      open.push("management", "official-cases");
    return open;
  };

  const [openGroups, setOpenGroups] = useState(() => defaultOpen(location.pathname));

  useEffect(() => {
    if (!collapsed) {
      const mustOpen = defaultOpen(location.pathname);
      setOpenGroups((prev) => Array.from(new Set([...prev, ...mustOpen])));
    }
  }, [location.pathname, collapsed]);

  const navWrapRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // LIGHT scroll listener only (heavy MutationObserver removed)
  useEffect(() => {
    const el = navWrapRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasScroll = el.scrollHeight > el.clientHeight + 2;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      setShowScrollHint(hasScroll && !atBottom);
    };

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [collapsed]);

  const toggleGroup = (key) => {
    setOpenGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [key]
    );
  };

  const isActive = (key) =>
    location.pathname === key || location.pathname.startsWith(key + "/");

  // Mobile behavior
  useEffect(() => {
    if (isMobile && !collapsed) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Collapsed-mode flyout
  const SubmenuFlyout = ({ node }) => (
    <div className="flyout">
      <div className="flyout-title">
        <span className="flyout-title-icon">{node.icon}</span>
        <span className="flyout-title-text">{node.label}</span>
      </div>
      <div className="flyout-list">
        {node.children?.map((child) => (
          <button
            key={child.key}
            type="button"
            className={`flyout-item ${isActive(child.key) ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate(child.key);
            }}
          >
            <span className="flyout-icon">{child.icon}</span>
            <span className="flyout-label">{child.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Truncated label with explicit 'more' control
  const TruncatedLabel = ({ text, popContent, onMoreClick, className, style }) => {
    const ref = useRef(null);
    const [overflow, setOverflow] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      let rafId = null;
      const check = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setOverflow(el.scrollWidth > el.clientWidth + 1);
        });
      };

      check();

      let ro;
      if (typeof ResizeObserver !== "undefined") {
        try {
          ro = new ResizeObserver(check);
          ro.observe(el);
        } catch (error) {
          console.warn("ResizeObserver failed:", error);
        }
      }

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (ro) ro.disconnect();
      };
    }, [text, collapsed]);

    return (
      <>
        <span
          ref={ref}
          className={className}
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 140,
            ...style,
          }}
        >
          {text}
        </span>
        {overflow && (
          <Popover
            placement="right"
            trigger={["hover"]}
            overlayClassName="sider-more-pop"
            content={popContent || <div style={{ padding: 8 }}>{text}</div>}
            mouseEnterDelay={0.05}
            destroyTooltipOnHide
          >
            <button
              className="more-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onMoreClick) onMoreClick();
              }}
              aria-label={`More for ${text}`}
              type="button"
            >
              …
            </button>
          </Popover>
        )}
      </>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={80}
          style={{
            background: BRAND.panel,
            borderRight: `1px solid ${BRAND.border}`,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
          className="sider-modern"
        >
          {/* Brand header */}
          <div
            className="brand"
            style={{
              height: 70,
              padding: 10,
              borderBottom: `1px solid ${BRAND.border}`,
              display: "grid",
              gridTemplateColumns: collapsed ? "40px 1fr auto" : "44px 1fr auto",
              alignItems: "center",
              gap: 8,
              background: BRAND.panel,
              position: "sticky",
              top: 0,
              zIndex: 2,
            }}
          >
            <Avatar
              src={!collapsed ? logo : undefined}
              size={40}
              style={{ background: "#efeafd", color: BRAND.primary, fontWeight: 700 }}
            >
              <img alt="VAWCare" src={logo} style={{ width: 22, height: 22 }} />
            </Avatar>

            {!collapsed && (
              <div className="brand-text" style={{ lineHeight: 1.1 }}>
                <Text style={{ color: BRAND.primary, fontWeight: 800 }}>VAWCare</Text>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Badge color={BRAND.primary} dot />
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
              style={{ color: BRAND.primary, borderRadius: 8 }}
            />
          </div>

          {/* NAV */}
          <div
            ref={navWrapRef}
            className="nav-wrap"
            style={{
              flex: "1 1 0",
              minHeight: 0,
              maxHeight: "calc(100vh - 240px)",
              display: "flex",
              flexDirection: "column",
              padding: 10,
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}
          >
            <div
              className={`rail ${collapsed ? "collapsed" : ""}`}
              style={{
                background: BRAND.rail,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 18,
                padding: "8px 6px",
                display: "grid",
                gap: 6,
                boxShadow: "0 10px 26px rgba(122,90,248,0.08)",
              }}
            >
              {menu.map((node) => {
                if (node.type === "item") {
                  const active = isActive(node.key);
                  return (
                    <button
                      key={node.key}
                      type="button"
                      className={`rail-btn ${active ? "active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigate(node.key);
                      }}
                      title={collapsed ? node.label : undefined}
                      style={railBtnStyle(BRAND, active, false)}
                    >
                      <span className="rail-icon" style={railIconStyle(BRAND, false)}>
                        {node.icon}
                      </span>
                      {!collapsed && (
                        <TruncatedLabel
                          text={node.label}
                          className="rail-label"
                          style={{ whiteSpace: "nowrap" }}
                          onMoreClick={() => handleNavigate(node.key)}
                          popContent={<div style={{ padding: 8 }}>{node.label}</div>}
                        />
                      )}
                    </button>
                  );
                }

                const isOpen = openGroups.includes(node.key);
                const parentActive =
                  (node.base && location.pathname.startsWith(node.base)) ||
                  node.children?.some((c) => isActive(c.key));

                const GroupButton = (
                  <button
                    type="button"
                    className={`rail-btn ${parentActive ? "active" : ""}`}
                    onClick={(e) => {
                      if (!collapsed) {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGroup(node.key);
                      }
                    }}
                    title={collapsed ? node.label : undefined}
                    style={railBtnStyle(BRAND, parentActive, false)}
                  >
                    <span className="rail-icon" style={railIconStyle(BRAND, false)}>
                      {node.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <TruncatedLabel
                          text={node.label}
                          className={`rail-label ${node.labelClass || ""}`}
                          style={{
                            whiteSpace: "nowrap",
                            color: node.labelClass === "pink" ? BRAND.primaryAlt : undefined,
                          }}
                          onMoreClick={() => toggleGroup(node.key)}
                          popContent={<SubmenuFlyout node={node} />}
                        />
                        <DownOutlined
                          className={`chev ${isOpen ? "open" : ""}`}
                          style={{
                            marginLeft: "auto",
                            fontSize: 10,
                            color: "#8a7ef2",
                            transform: isOpen ? "rotate(180deg)" : "none",
                            transition: "transform .2s ease",
                          }}
                        />
                      </>
                    )}
                  </button>
                );

                return (
                  <div key={node.key} className="group">
                    {collapsed ? (
                      <Popover
                        overlayClassName="sider-flyout"
                        placement="right"
                        trigger={["hover", "click"]}
                        mouseEnterDelay={0.05}
                        destroyTooltipOnHide
                        overlayStyle={{ padding: 0, zIndex: 1300, marginLeft: 4 }}
                        content={<SubmenuFlyout node={node} />}
                      >
                        {GroupButton}
                      </Popover>
                    ) : (
                      GroupButton
                    )}

                    {!collapsed && isOpen && (
                      <div className="sub-flat" style={{ display: "grid", gap: 8, marginTop: 6 }}>
                        {node.children?.map((child) => {
                          const active = isActive(child.key);
                          return (
                            <button
                              key={child.key}
                              type="button"
                              className={`sub-btn ${active ? "active" : ""}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNavigate(child.key);
                              }}
                              style={subBtnStyle(BRAND, active, false)}
                            >
                              <span
                                className="sub-icon"
                                style={{
                                  width: 20,
                                  display: "grid",
                                  placeItems: "center",
                                  color: BRAND.primary,
                                  fontSize: 16,
                                }}
                              >
                                {child.icon}
                              </span>
                              <TruncatedLabel
                                text={child.label}
                                className="sub-label"
                                popContent={<div style={{ padding: 8 }}>{child.label}</div>}
                                onMoreClick={() => handleNavigate(child.key)}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logout */}
          <div
            style={{
              padding: "8px 10px",
              background: BRAND.panel,
              position: "sticky",
              bottom: 86,
              zIndex: 1,
              marginTop: "auto",
            }}
          >
            <div
              style={{
                background: BRAND.rail,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 18,
                padding: "8px 6px",
                boxShadow: "0 10px 26px rgba(122,90,248,0.08)",
              }}
            >
              <button
                type="button"
                className="rail-btn danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout();
                }}
                title={collapsed ? "Logout" : undefined}
                style={{ ...railBtnStyle(BRAND, false, false), color: BRAND.primaryAlt }}
              >
                <span
                  className="rail-icon"
                  style={{ ...railIconStyle(BRAND, false), color: BRAND.primaryAlt }}
                >
                  <LogoutOutlined />
                </span>
                {!collapsed && <span className="rail-label">Logout</span>}
              </button>
            </div>
          </div>

          {/* Footer user chip */}
          <div
            className="footer"
            style={{
              height: 86,
              padding: 12,
              borderTop: `1px solid ${BRAND.border}`,
              background: BRAND.panel,
              position: "sticky",
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <div
              className="user-chip"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: collapsed ? "center" : "flex-start",
                width: "100%",
              }}
            >
              <Avatar style={{ background: BRAND.primary, fontWeight: 700 }} size={30}>
                {initials}
              </Avatar>

              {!collapsed && (
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
              )}
            </div>
          </div>
        </Sider>
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setCollapsed(true)}
          open={!collapsed}
          width={Math.min(280, window.innerWidth - 40)}
          bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
          styles={{
            header: { display: "none" },
            body: { background: BRAND.panel },
          }}
        >
          {/* Brand header */}
          <div
            className="brand"
            style={{
              height: 70,
              padding: 10,
              borderBottom: `1px solid ${BRAND.border}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: BRAND.panel,
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

          {/* Scrollable nav */}
          <div
            ref={navWrapRef}
            className="nav-wrap"
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
                background: BRAND.rail,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 18,
                padding: 16,
                display: "grid",
                gap: 10,
                boxShadow: "0 18px 48px rgba(122,90,248,0.08)",
                width: "100%",
              }}
            >
              {menu.map((node) => {
                if (node.type === "item") {
                  const active = isActive(node.key);
                  return (
                    <button
                      key={node.key}
                      type="button"
                      className={`rail-btn ${active ? "active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigate(node.key);
                      }}
                      style={railBtnStyle(BRAND, active, true)}
                    >
                      <span className="rail-icon" style={railIconStyle(BRAND, true)}>
                        {node.icon}
                      </span>
                      <TruncatedLabel
                        text={node.label}
                        className="rail-label"
                        style={{ whiteSpace: "nowrap" }}
                        onMoreClick={() => handleNavigate(node.key)}
                        popContent={<div style={{ padding: 8 }}>{node.label}</div>}
                      />
                    </button>
                  );
                }

                const isOpen = openGroups.includes(node.key);
                const parentActive =
                  (node.base && location.pathname.startsWith(node.base)) ||
                  node.children?.some((c) => isActive(c.key));

                return (
                  <div key={node.key} className="group">
                    <button
                      type="button"
                      className={`rail-btn ${parentActive ? "active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGroup(node.key);
                      }}
                      style={railBtnStyle(BRAND, parentActive, true)}
                    >
                      <span className="rail-icon" style={railIconStyle(BRAND, true)}>
                        {node.icon}
                      </span>
                      <TruncatedLabel
                        text={node.label}
                        className={`rail-label ${node.labelClass || ""}`}
                        style={{
                          whiteSpace: "nowrap",
                          color: node.labelClass === "pink" ? BRAND.primaryAlt : undefined,
                        }}
                        onMoreClick={() => toggleGroup(node.key)}
                        popContent={<SubmenuFlyout node={node} />}
                      />
                      <DownOutlined
                        className={`chev ${isOpen ? "open" : ""}`}
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          color: "#8a7ef2",
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform .2s ease",
                        }}
                      />
                    </button>

                    {isOpen && (
                      <div className="sub-flat" style={{ display: "grid", gap: 8, marginTop: 6 }}>
                        {node.children?.map((child) => {
                          const active = isActive(child.key);
                          return (
                            <button
                              key={child.key}
                              type="button"
                              className={`sub-btn ${active ? "active" : ""}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNavigate(child.key);
                              }}
                              style={subBtnStyle(BRAND, active, true)}
                            >
                              <span
                                className="sub-icon"
                                style={{
                                  width: 20,
                                  display: "grid",
                                  placeItems: "center",
                                  color: BRAND.primary,
                                  fontSize: 16,
                                }}
                              >
                                {child.icon}
                              </span>
                              <TruncatedLabel
                                text={child.label}
                                className="sub-label"
                                popContent={<div style={{ padding: 8 }}>{child.label}</div>}
                                onMoreClick={() => handleNavigate(child.key)}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Logout */}
          <div
            style={{
              padding: "8px 10px",
              background: BRAND.panel,
              marginTop: "auto",
            }}
          >
            <div
              style={{
                background: BRAND.rail,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 18,
                padding: 16,
                boxShadow: "0 18px 48px rgba(122,90,248,0.08)",
              }}
            >
              <button
                type="button"
                className="rail-btn danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout();
                }}
                style={railBtnStyle(BRAND, false, true)}
              >
                <span className="rail-icon" style={railIconStyle(BRAND, true)}>
                  <LogoutOutlined />
                </span>
                <TruncatedLabel
                  text="Logout"
                  className="rail-label pink"
                  style={{ color: BRAND.primaryAlt, whiteSpace: "nowrap" }}
                  popContent={<div style={{ padding: 8 }}>Logout</div>}
                />
              </button>
            </div>

            {/* User info (mobile) */}
            <div
              className="user-chip"
              style={{
                marginTop: 10,
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(122,90,248,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Avatar
                style={{
                  background: BRAND.primary,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
                size={32}
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
          </div>
        </Drawer>
      )}

      {/* styles (unchanged from your version except for removed hidden-items stuff) */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateZ(0); }
          to { opacity: 1; transform: translateZ(0); }
        }

        @media (max-width: 767px) {
          .sider-mobile-card {
            max-width: calc(100vw - 24px) !important;
            touch-action: pan-y;
            will-change: left, opacity;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
          .sider-mobile-card .rail-btn,
          .sider-mobile-card .sub-btn {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            will-change: auto;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
          .sider-mobile-card .nav-wrap {
            -webkit-overflow-scrolling: touch;
            will-change: scroll-position;
          }
        }

        .sider-flyout .ant-popover-inner {
          padding: 10px !important;
          background: #ffffff !important;
          border: 1px solid rgba(122,90,248,0.18) !important;
          border-radius: 14px !important;
          box-shadow: 0 18px 48px rgba(16,24,40,0.18) !important;
        }
        .sider-flyout .ant-popover-inner-content { padding: 0 !important; }
        .sider-flyout .flyout { min-width: 200px; max-width: 260px; display: grid; gap: 8px; }
        .sider-flyout .flyout-title {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          border-radius: 10px; background: #f7f4ff; color: #7A5AF8; font-weight: 700;
        }
        .sider-flyout .flyout-list { display: flex; flex-direction: column; gap: 6px; }
        .sider-flyout .flyout-item {
          display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 10px;
          border: 1px solid rgba(122,90,248,0.15); border-radius: 10px; background: #fff;
          color: #5a4eb1; font-weight: 600; text-align: left; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: background .12s ease, box-shadow .12s ease, transform .12s ease, color .12s ease;
          will-change: background, box-shadow, transform;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        .sider-flyout .flyout-item:hover {
          background: #f7f4ff; box-shadow: 0 10px 20px rgba(122,90,248,0.14); transform: translateY(-1px) translateZ(0);
        }
        .sider-flyout .flyout-item.active {
          background: #f2edff; color: #7A5AF8; border-color: rgba(122,90,248,0.35);
        }
        .sider-flyout .flyout-icon { width: 18px; display: grid; place-items: "center"; font-size: 16px; color: #7A5AF8; }

        .sider-backdrop { 
          position: fixed; 
          inset: 0; 
          background: rgba(17,17,26,0.6); 
          z-index: 1100; 
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          will-change: opacity;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        .nav-wrap::-webkit-scrollbar {
          width: 6px;
        }
        .nav-wrap::-webkit-scrollbar-track {
          background: rgba(122, 90, 248, 0.08);
          border-radius: 10px;
        }
        .nav-wrap::-webkit-scrollbar-thumb {
          background: rgba(122, 90, 248, 0.3);
          border-radius: 10px;
        }
        .nav-wrap::-webkit-scrollbar-thumb:hover {
          background: rgba(122, 90, 248, 0.5);
        }

        .rail-btn, .sub-btn {
          transition: all .12s ease !important;
          will-change: transform, box-shadow, background;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        .user-chip {
          transition: all .15s ease !important;
          will-change: auto;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        /* Override Ant Design Sider transitions for mobile */
        @media (max-width: 767px) {
          .ant-layout-sider.sider-modern {
            transition: left 0.15s ease-out !important, opacity 0.15s ease-out !important, width 0.15s ease-out !important, margin-left 0.15s ease-out !important, margin-right 0.15s ease-out !important !important;
            will-change: left, opacity !important;
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
          }
          .ant-layout-sider.sider-modern .ant-layout-sider-children {
            will-change: auto;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
        }
      `}</style>
    </>
  );
}

/* helpers */
function railBtnStyle(BRAND, active, isMobile) {
  if (isMobile) {
    return {
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
      background: "#fff",
      boxShadow: active ? "0 18px 40px rgba(122,90,248,0.14)" : "0 8px 22px rgba(0,0,0,0.06)",
      border: active ? `1px solid rgba(122,90,248,0.12)` : "1px solid rgba(0,0,0,0.04)",
      cursor: "pointer",
      transition: "transform .12s ease-out, box-shadow .12s ease-out, background .12s ease-out, color .12s ease-out",
      willChange: "transform, box-shadow, background, color",
      transform: "translateZ(0)",
      WebkitTransform: "translateZ(0)",
    };
  }
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 44,
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 600,
    color: active ? BRAND.primary : "#5a4eb1",
    border: "none",
    borderRadius: 12,
    background: active ? "#f2edff" : "#fff",
    boxShadow: active ? "0 14px 28px rgba(122,90,248,0.18)" : "0 6px 18px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform .15s ease, box-shadow .15s ease, background .15s ease, color .15s ease",
  };
}

function railIconStyle(BRAND, isMobile) {
  return {
    fontSize: isMobile ? 18 : 18,
    width: isMobile ? 36 : 24,
    height: isMobile ? 36 : "auto",
    display: "grid",
    placeItems: "center",
    color: BRAND.primary,
    borderRadius: isMobile ? 10 : undefined,
    background: isMobile ? "#fff" : undefined,
  };
}

function subBtnStyle(BRAND, active, isMobile) {
  if (isMobile) {
    return {
      height: 48,
      display: "flex",
      alignItems: "center",
      gap: 12,
      border: "none",
      borderRadius: 14,
      background: "#fff",
      color: active ? BRAND.primary : "#5a4eb1",
      fontWeight: 700,
      padding: "0 14px",
      textAlign: "left",
      boxShadow: active ? "0 14px 30px rgba(122,90,248,0.14)" : "0 6px 16px rgba(0,0,0,0.04)",
      transition: "transform .12s ease-out, box-shadow .12s ease-out, background .12s ease-out, color .12s ease-out",
      willChange: "transform, box-shadow, background, color",
      transform: "translateZ(0)",
      WebkitTransform: "translateZ(0)",
    };
  }
  return {
    height: 44,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    borderRadius: 12,
    background: active ? "#f2edff" : "#fff",
    color: active ? BRAND.primary : "#5a4eb1",
    fontWeight: 600,
    padding: "0 14px",
    textAlign: "left",
    boxShadow: active ? "0 12px 24px rgba(122,90,248,0.16)" : "0 4px 10px rgba(0,0,0,0.04)",
  };
}
