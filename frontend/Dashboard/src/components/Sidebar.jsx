// src/components/Sidebar.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Layout,
  Button,
  Typography,
  Avatar,
  Badge,
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
    const handler = () => setCollapsed((c) => !c);
    window.addEventListener("toggle-sider", handler);
    return () => window.removeEventListener("toggle-sider", handler);
  }, [setCollapsed]);

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

  // Scroll indicator for nav-wrap
  const navWrapRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hiddenItems, setHiddenItems] = useState([]);

  useEffect(() => {
    const el = navWrapRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasScroll = el.scrollHeight > el.clientHeight;
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
      const shouldShow = hasScroll && !isAtBottom;
      setShowScrollHint(shouldShow);

      // Detect which items are cut off (not fully visible)
      // Check whenever there's scroll, not just when shouldShow is true
      if (hasScroll) {
        const railEl = el.querySelector('.rail');
        if (railEl) {
          const containerRect = el.getBoundingClientRect();
          const buttons = Array.from(railEl.querySelectorAll('.rail-btn, .sub-btn'));
          const hidden = [];

          buttons.forEach((btn) => {
            const rect = btn.getBoundingClientRect();
            const itemKey = btn.getAttribute('data-key');
            const itemLabel = btn.getAttribute('data-label');
            const itemType = btn.getAttribute('data-type');
            
            // Check if button is partially or fully below the visible area
            // Account for footer height (86px) + logout section (~60px) + buffer (20px)
            const footerAndLogoutHeight = 166;
            if (rect.bottom > containerRect.bottom - footerAndLogoutHeight || rect.top > containerRect.bottom) {
              if (itemKey && itemLabel) {
                hidden.push({ key: itemKey, label: itemLabel, type: itemType });
              }
            }
          });

          setHiddenItems(hidden);
        }
      } else {
        setHiddenItems([]);
      }
    };

    // Add a small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(checkScroll, 100);
    checkScroll();
    
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    const observer = new MutationObserver(() => {
      // Delay the check to ensure DOM updates are complete
      setTimeout(checkScroll, 100);
    });
    observer.observe(el, { childList: true, subtree: true, attributes: true });

    return () => {
      clearTimeout(timeoutId);
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, [collapsed, openGroups]);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [key]));
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

  // Truncated label with explicit 'more' control
  const TruncatedLabel = ({ text, popContent, onMoreClick, className, style }) => {
    const ref = useRef(null);
    const [overflow, setOverflow] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
      check();
      let ro;
      try {
        ro = new ResizeObserver(check);
        ro.observe(el);
      } catch {
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
              …
            </button>
          </Popover>
        )}
      </>
    );
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {isMobile && !collapsed && (
        <div
          className="sider-backdrop"
          onClick={() => setCollapsed(true)}
          onTouchStart={() => setCollapsed(true)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,17,26,0.6)",
            zIndex: 1100,
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            animation: "fadeIn 0.3s ease",
          }}
        />
      )}

      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={isMobile ? Math.min(280, window.innerWidth - 40) : 240}
        collapsedWidth={isMobile ? 0 : 80}
        style={{
          background: BRAND.panel,
          borderRight: `1px solid ${BRAND.border}`,
          display: "flex",
          flexDirection: "column",
          height: isMobile ? "calc(100vh - 24px)" : "100vh",
          maxHeight: isMobile ? "calc(100vh - 24px)" : "100vh",
          overflow: "hidden",
          position: isMobile ? "fixed" : "sticky",
          top: isMobile ? 12 : 0,
          left: isMobile ? (collapsed ? -320 : 12) : 0,
          zIndex: isMobile ? 1101 : 2,
          transition: "left .3s cubic-bezier(0.4, 0, 0.2, 1), opacity .3s ease",
          opacity: isMobile ? (collapsed ? 0 : 1) : 1,
          boxShadow: isMobile && !collapsed ? "0 30px 80px rgba(16,24,40,0.35)" : undefined,
          borderRadius: isMobile ? 18 : undefined,
          pointerEvents: isMobile && collapsed ? "none" : "auto",
        }}
        className={`sider-modern ${isMobile ? "sider-mobile-card" : ""}`}
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
            maxHeight: isMobile ? "calc(100vh - 300px)" : "calc(100vh - 240px)",
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
              padding: isMobile ? "12px" : "8px 6px",
              display: "grid",
              gap: isMobile ? 10 : 6,
              boxShadow: isMobile ? "0 18px 48px rgba(122,90,248,0.08)" : "0 10px 26px rgba(122,90,248,0.08)",
              width: isMobile ? "92%" : "auto",
              margin: isMobile ? "8px auto" : undefined,
            }}
          >
            {menu.map((node) => {
              if (node.type === "item") {
                const active = isActive(node.key);
                return (
                  <button
                    key={node.key}
                    className={`rail-btn ${active ? "active" : ""}`}
                    onClick={() => navigate(node.key)}
                    title={collapsed ? node.label : undefined}
                    style={railBtnStyle(BRAND, active, isMobile)}
                    data-key={node.key}
                    data-label={node.label}
                    data-type="item"
                  >
                    <span className="rail-icon" style={railIconStyle(BRAND, isMobile)}>
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
                  data-key={node.key}
                  data-label={node.label}
                  data-type="group"
                >
                  <span className="rail-icon" style={railIconStyle(BRAND, isMobile)}>
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
                            className={`sub-btn ${active ? "active" : ""}`}
                            onClick={() => navigate(child.key)}
                            style={subBtnStyle(BRAND, active, isMobile)}
                            data-key={child.key}
                            data-label={child.label}
                            data-type="subitem"
                            data-parent={node.key}
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
        <div style={{ 
          padding: "8px 10px", 
          background: BRAND.panel,
          position: "sticky",
          bottom: 86,
          zIndex: 1,
          marginTop: "auto"
        }}>
          <div
            style={{
              background: BRAND.rail,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 18,
              padding: isMobile ? "12px" : "8px 6px",
              boxShadow: isMobile ? "0 18px 48px rgba(122,90,248,0.08)" : "0 10px 26px rgba(122,90,248,0.08)",
              width: isMobile ? "92%" : "auto",
              margin: isMobile ? "0 auto" : undefined,
            }}
          >
            <button
              className="rail-btn danger"
              onClick={handleLogout}
              title={collapsed ? "Logout" : undefined}
              style={{ ...railBtnStyle(BRAND, false, isMobile), color: BRAND.primaryAlt }}
            >
              <span className="rail-icon" style={{ ...railIconStyle(BRAND, isMobile), color: BRAND.primaryAlt }}>
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

      {/* Popover & effects CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateX(-20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Mobile optimizations */
        @media (max-width: 767px) {
          .sider-mobile-card {
            max-width: calc(100vw - 24px) !important;
            touch-action: pan-y;
          }
          
          .sider-mobile-card .rail-btn,
          .sider-mobile-card .sub-btn {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          .sider-mobile-card .nav-wrap {
            -webkit-overflow-scrolling: touch;
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
          transition: background .15s ease, box-shadow .15s ease, transform .15s ease, color .15s ease;
        }
        .sider-flyout .flyout-item:hover {
          background: #f7f4ff; box-shadow: 0 10px 20px rgba(122,90,248,0.14); transform: translateY(-1px);
        }
        .sider-flyout .flyout-item.active {
          background: #f2edff; color: #7A5AF8; border-color: rgba(122,90,248,0.35);
        }
        .sider-flyout .flyout-icon { width: 18px; display: grid; place-items: center; font-size: 16px; color: #7A5AF8; }
        .sider-backdrop { 
          position: fixed; 
          inset: 0; 
          background: rgba(17,17,26,0.6); 
          z-index: 1100; 
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        /* Profile popover with hidden items */
        .sider-profile-more .ant-popover-inner {
          background: #ffffff !important;
          border: 1px solid rgba(122,90,248,0.22) !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 60px rgba(16,24,40,0.22) !important;
          padding: 0 !important;
        }
        .sider-profile-more .ant-popover-arrow {
          display: block !important;
        }

        /* Custom scrollbar for profile popover */
        .sider-profile-more .ant-popover-inner-content::-webkit-scrollbar {
          width: 5px;
        }
        .sider-profile-more .ant-popover-inner-content::-webkit-scrollbar-track {
          background: rgba(122, 90, 248, 0.08);
          border-radius: 5px;
        }
        .sider-profile-more .ant-popover-inner-content::-webkit-scrollbar-thumb {
          background: rgba(122, 90, 248, 0.3);
          border-radius: 5px;
        }

        /* Custom scrollbar for nav-wrap */
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

        /* Smooth transitions for buttons */
        .rail-btn, .sub-btn {
          transition: all .15s ease !important;
        }

        /* User chip hover animation */
        .user-chip {
          transition: all .2s ease !important;
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
      background: active ? "#fff" : "#ffffff",
      boxShadow: active ? "0 18px 40px rgba(122,90,248,0.14)" : "0 8px 22px rgba(0,0,0,0.06)",
      border: active ? `1px solid rgba(122,90,248,0.12)` : "1px solid rgba(0,0,0,0.04)",
      cursor: "pointer",
      transition: "transform .15s ease, box-shadow .18s ease, background .15s ease, color .15s ease",
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
      background: active ? "#fff" : "#ffffff",
      color: active ? BRAND.primary : "#5a4eb1",
      fontWeight: 700,
      padding: "0 14px",
      textAlign: "left",
      boxShadow: active ? "0 14px 30px rgba(122,90,248,0.14)" : "0 6px 16px rgba(0,0,0,0.04)",
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
function flyItemStyle(active, BRAND, isChild = false) {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: isChild ? "6px 12px 6px 24px" : "8px 12px",
    border: "none",
    background: active ? "#f7f4ff" : "transparent",
    color: active ? BRAND.primary : "#666",
    cursor: "pointer",
    fontSize: 12,
    textAlign: "left",
  };
}
