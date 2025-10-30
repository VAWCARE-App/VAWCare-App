import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Layout,
  Button,
  Typography,
  Avatar,
  Badge,
  Divider,
  Grid,
  Popover,
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
  MenuOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { clearAllStorage, api, getUserData } from "../lib/api";
import logo from "../assets/logo1.png";

const { Sider } = Layout;
const { Text } = Typography;

/** Keep in sync with header height */
const HEADER_HEIGHT = 64;

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

  // ---- Global toggle hook (called from AdminDashboard header) ----
  useEffect(() => {
    const handler = () => setCollapsed((c) => !c);
    window.addEventListener("toggle-sider", handler);
    return () => window.removeEventListener("toggle-sider", handler);
  }, [setCollapsed]);

  // ---- Logout ----
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

  // ---- User ----
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

  // ---- Menus ----
  const adminMenu = [
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
  ];

  const officialMenu = [
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
  ];

  const victimMenu = [
    { type: "item", key: "/victim/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { type: "item", key: "/victim/report", icon: <FileAddOutlined />, label: "Report" },
    { type: "item", key: "/victim/messages", icon: <MessageOutlined />, label: "Messages" },
    { type: "item", key: "/victim/help", icon: <InfoCircleOutlined />, label: "Help" },
  ];

  let menu = adminMenu;
  if (userType === "official") menu = officialMenu;
  else if (userType === "victim") menu = victimMenu;

  // ---- Default open groups ----
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

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      // If already open, close it. If opening, make it the only open group
      // to avoid multiple expanded groups that can change sidebar length
      // and cause overlapping selection areas.
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [key];
    });
  };

  const isActive = (key) =>
    location.pathname === key || location.pathname.startsWith(key + "/");

  // ---- Mobile behavior ----
  useEffect(() => {
    if (isMobile && !collapsed) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ---- Collapsed-mode flyout ----
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
            className={`flyout-item ${isActive(child.key) ? "active" : ""}`}
            onClick={() => navigate(child.key)}
          >
            <span className="flyout-icon">{child.icon}</span>
            <span className="flyout-label">{child.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ---- Truncated label with explicit 'more' control ----
  const TruncatedLabel = ({ text, popContent, onMoreClick, className, style }) => {
    const ref = useRef(null);
    const [overflow, setOverflow] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
      check();
      // keep responsive
      let ro;
      try {
        ro = new ResizeObserver(check);
        ro.observe(el);
      } catch (e) {
        // ResizeObserver may not exist in some envs — fallback to window resize
        window.addEventListener("resize", check);
      }
      return () => {
        if (ro) ro.disconnect();
        else window.removeEventListener("resize", check);
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
            trigger={["hover", "click"]}
            overlayClassName="sider-more-pop"
            content={popContent || <div style={{ padding: 8 }}>{text}</div>}
            mouseEnterDelay={0.05}
            destroyTooltipOnHide
          >
            <button
              className="more-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onMoreClick) onMoreClick();
              }}
              aria-label={`More for ${text}`}
              type="button"
            >
              ...
            </button>
          </Popover>
        )}
      </>
    );
  };

  // ---- Render ----
  return (
    <>
      {/* Backdrop (mobile) – cover ENTIRE screen incl. header */}
      {isMobile && !collapsed && (
        <div
          className="sider-backdrop"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,17,26,0.44)",
            zIndex: 1090,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile opener removed — header menu icon should toggle the sidebar (use window event 'toggle-sider' or setCollapsed from parent) */}

      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        /* Mobile: left overlay covering header */
        width={isMobile ? "50%" : 240}
        collapsedWidth={isMobile ? 0 : 80}
        style={{
          background: BRAND.panel,
          borderRight: `1px solid ${BRAND.border}`,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflow: "hidden",
          position: isMobile ? "fixed" : "sticky",
          /* On mobile render as inset rounded card starting at the top (no spacing) */
          top: isMobile ? 0 : 0,
          left: isMobile ? 12 : 0,
          right: isMobile ? 12 : undefined,
          zIndex: isMobile ? 1101 : 2,
          transform: isMobile ? (collapsed ? "translateX(-110%)" : "translateX(0)") : "translateX(0)",
          transition: "transform .26s ease, top .18s ease",
          boxShadow: isMobile && !collapsed ? "0 30px 80px rgba(16,24,40,0.28)" : undefined,
          borderRadius: isMobile ? 18 : undefined,
        }}
        className={`sider-modern ${isMobile ? "sider-mobile-card" : ""}`}
      >
        {/* BRAND */}
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
            className="nav-wrap"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
                padding: 10,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <div
              className={`rail ${collapsed ? "collapsed" : ""}`}
                style={{
                background: BRAND.rail,
                border: `1px solid ${BRAND.border}`,
                borderRadius: 18,
                padding: isMobile ? "12px" : "8px 6px",
                display: "grid",
                gap: isMobile ? 10 : 6,
                boxShadow: isMobile ? "0 18px 48px rgba(122,90,248,0.08)" : "0 10px 26px rgba(122,90,248,0.08)",
                /* on mobile keep the inner rail narrow and centered like a card */
                width: isMobile ? "92%" : "auto",
                margin: isMobile ? "8px auto" : undefined,
              }}
            >
              {menu.map((node) => {
                if (node.type === "item") {
                  return (
                    <button
                      key={node.key}
                      className={`rail-btn ${isActive(node.key) ? "active" : ""}`}
                      onClick={() => navigate(node.key)}
                      title={collapsed ? node.label : undefined}
                      style={railBtnStyle(BRAND, isActive(node.key), isMobile)}
                    >
                    <span className="rail-icon" style={railIconStyle(BRAND)}>
                      {node.icon}
                    </span>
                    {!collapsed && (
                      <TruncatedLabel
                        text={node.label}
                        className="rail-label"
                        style={{ whiteSpace: "nowrap" }}
                        onMoreClick={() => navigate(node.key)}
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
                    className={`rail-btn ${parentActive ? "active" : ""}`}
                    onClick={() => (collapsed ? null : toggleGroup(node.key))}
                    title={collapsed ? node.label : undefined}
                    style={railBtnStyle(BRAND, parentActive, isMobile)}
                  >
                  <span className="rail-icon" style={railIconStyle(BRAND)}>
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
                      {node.children?.map((child) => (
                        <button
                          key={child.key}
                          className={`sub-btn ${isActive(child.key) ? "active" : ""}`}
                          onClick={() => navigate(child.key)}
                          style={subBtnStyle(BRAND, isActive(child.key), isMobile)}
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
                            onMoreClick={() => navigate(child.key)}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Divider style={{ margin: 10 }} />

            <button
              className="rail-btn danger"
              onClick={handleLogout}
              title={collapsed ? "Logout" : undefined}
              style={{ ...railBtnStyle(BRAND, false), color: BRAND.primaryAlt }}
            >
              <span className="rail-icon" style={{ ...railIconStyle(BRAND), color: BRAND.primaryAlt }}>
                <LogoutOutlined />
              </span>
              {!collapsed && <span className="rail-label">Logout</span>}
            </button>
          </div>
        </div>

        {/* FOOTER */}
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

      {/* --- FLYOUT STYLE FIXES --- */}
      <style>{`
        .sider-flyout .ant-popover-inner {
          padding: 10px !important;
          background: #ffffff !important;
          border: 1px solid rgba(122,90,248,0.18) !important;
          border-radius: 14px !important;
          box-shadow: 0 18px 48px rgba(16,24,40,0.18) !important;
        }
        .sider-flyout .ant-popover-inner-content {
          padding: 0 !important;
        }
        .sider-flyout .flyout {
          min-width: 200px;
          max-width: 260px;
          display: grid;
          gap: 8px;
        }
        .sider-flyout .flyout-title {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          background: #f7f4ff;
          color: #7A5AF8;
          font-weight: 700;
        }
        .sider-flyout .flyout-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 6px !important;
        }
        .sider-flyout .flyout-item {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 10px;
          border: 1px solid rgba(122,90,248,0.15);
          border-radius: 10px;
          background: #fff !important;
          color: #5a4eb1 !important;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: background .15s ease, box-shadow .15s ease, transform .15s ease, color .15s ease;
        }
        .sider-flyout .flyout-item:hover {
          background: #f7f4ff !important;
          box-shadow: 0 10px 20px rgba(122,90,248,0.14);
          transform: translateY(-1px);
        }
        .sider-flyout .flyout-item.active {
          background: #f2edff !important;
          color: #7A5AF8 !important;
          border-color: rgba(122,90,248,0.35);
        }
        .sider-flyout .flyout-icon {
          width: 18px;
          display: grid;
          place-items: center;
          font-size: 16px;
          color: #7A5AF8 !important;
        }
        .sider-flyout .flyout-item *,
        .sider-flyout .flyout-title * {
          filter: none !important;
        }
        .sider-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(17,17,26,0.44);
          z-index: 1090;
          backdrop-filter: blur(2px);
        }
      `}</style>
    </>
  );
}

/* helpers for button styles */
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
      background: active ? "#fff" : "#ffffff",
      /* active uses stronger shadow and subtle violet border */
      boxShadow: active
        ? "0 18px 40px rgba(122,90,248,0.14)"
        : "0 8px 22px rgba(0,0,0,0.06)",
      border: active ? `1px solid rgba(122,90,248,0.12)` : "1px solid rgba(0,0,0,0.04)",
      cursor: "pointer",
      transition:
        "transform .15s ease, box-shadow .18s ease, background .15s ease, color .15s ease",
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
    boxShadow: active
      ? "0 14px 28px rgba(122,90,248,0.18)"
      : "0 6px 18px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition:
      "transform .15s ease, box-shadow .15s ease, background .15s ease, color .15s ease",
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
      background: active ? "#fff" : "#ffffff",
      color: active ? BRAND.primary : "#5a4eb1",
      fontWeight: 700,
      padding: "0 14px",
      textAlign: "left",
      boxShadow: active
        ? "0 14px 30px rgba(122,90,248,0.14)"
        : "0 6px 16px rgba(0,0,0,0.04)",
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
    boxShadow: active
      ? "0 12px 24px rgba(122,90,248,0.16)"
      : "0 4px 10px rgba(0,0,0,0.04)",
  };
}
