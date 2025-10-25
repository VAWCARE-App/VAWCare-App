import React, { useMemo, useState, useEffect } from "react";
import { Layout, Button, Typography, Avatar, Badge, Divider, Grid, Popover } from "antd";
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
import { clearToken, api, isTokenProbablyJwt } from "../lib/api";
import logo from "../assets/logo1.png";

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const BRAND = {
    primary: "#7A5AF8",
    primaryAlt: "#e91e63",
    panel: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    rail: "linear-gradient(180deg, #f6f0ff 0%, #ffe9f3 100%)",
    border: "rgba(122,90,248,0.18)",
  };

  // ---- Logout ----
  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (token && isTokenProbablyJwt(token)) {
        await Promise.race([
          api.post("/api/auth/logout"),
          new Promise((r) => setTimeout(r, 1500)),
        ]).catch(() => {});
      }
    } catch {}
    clearToken();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  // ---- User ----
  const currentUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    []
  );
  const userType = sessionStorage.getItem("userType") || "victim";
  const initials = useMemo(() => {
    const a = (currentUser.firstName || "").charAt(0);
    const b = (currentUser.lastName || "").charAt(0);
    return (a + b || "U").toUpperCase();
  }, [currentUser]);

  // ---- Menus with grouped children (now with icons) ----
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

  // ---- Default open groups (for expanded state) ----
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
    setOpenGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (key) =>
    location.pathname === key || location.pathname.startsWith(key + "/");

  // ---- Auto-collapse for phones / small tablets ----
  useEffect(() => {
    if (!screens.md && !collapsed) setCollapsed(true);
  }, [screens.md, collapsed, setCollapsed]);

  // ---- Submenu panel used in collapsed mode (hover/tap fly-out) ----
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

  // ---- Render ----
  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={280}
      collapsedWidth={screens.xs ? 0 : 98}
      style={{
        background: BRAND.panel,
        borderRight: `1px solid ${BRAND.border}`,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        overflow: "hidden",
      }}
      className="sider-modern"
    >
      {/* BRAND */}
      <div className="brand">
        <Avatar
          src={!collapsed ? logo : undefined}
          size={44}
          style={{ background: "#efeafd", color: BRAND.primary, fontWeight: 700 }}
        >
          <img alt="VAWCare" src={logo} style={{ width: 26, height: 26 }} />
        </Avatar>

        {!collapsed && (
          <div className="brand-text">
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
      <div className="nav-wrap">
        <div className={`rail ${collapsed ? "collapsed" : ""}`}>
          {menu.map((node) => {
            if (node.type === "item") {
              return (
                <button
                  key={node.key}
                  className={`rail-btn ${isActive(node.key) ? "active" : ""}`}
                  onClick={() => navigate(node.key)}
                  title={collapsed ? node.label : undefined}
                >
                  <span className="rail-icon">{node.icon}</span>
                  {!collapsed && <span className="rail-label">{node.label}</span>}
                </button>
              );
            }

            const isOpen = openGroups.includes(node.key);
            const parentActive =
              (node.base && location.pathname.startsWith(node.base)) ||
              node.children?.some((c) => isActive(c.key));

            // When collapsed: show fly-out popover so users can access children
            const GroupButton = (
              <button
                className={`rail-btn ${parentActive ? "active" : ""}`}
                onClick={() => (collapsed ? null : toggleGroup(node.key))}
                title={collapsed ? node.label : undefined}
              >
                <span className="rail-icon">{node.icon}</span>
                {!collapsed && (
                  <>
                    <span className={`rail-label ${node.labelClass || ""}`}>{node.label}</span>
                    <DownOutlined className={`chev ${isOpen ? "open" : ""}`} />
                  </>
                )}
              </button>
            );

            return (
              <div key={node.key} className="group">
                {collapsed ? (
                  <Popover
                    overlayClassName="sider-flyout"
                    placement="rightTop"
                    trigger={["hover", "click"]}
                    content={<SubmenuFlyout node={node} />}
                  >
                    {GroupButton}
                  </Popover>
                ) : (
                  GroupButton
                )}

                {/* Expanded subitems */}
                {!collapsed && isOpen && (
                  <div className="sub-flat">
                    {node.children?.map((child) => (
                      <button
                        key={child.key}
                        className={`sub-btn ${isActive(child.key) ? "active" : ""}`}
                        onClick={() => navigate(child.key)}
                      >
                        <span className="sub-icon">{child.icon}</span>
                        <span className="sub-label">{child.label}</span>
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
          >
            <span className="rail-icon"><LogoutOutlined /></span>
            {!collapsed && <span className="rail-label">Logout</span>}
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div
        className="footer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: "8px 12px",
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

      {/* STYLES */}
      <style>{`
        /* Layout */
        .sider-modern .brand{
          height: 72px;
          padding: 12px;
          border-bottom: 1px solid ${BRAND.border};
          display: grid;
          grid-template-columns: ${collapsed ? "40px 1fr auto" : "48px 1fr auto"};
          align-items: center;
          gap: 10px;
          background: ${BRAND.panel};
          position: sticky; top: 0; z-index: 2;
        }
        .sider-modern .brand-text{ line-height: 1.1; }

        .sider-modern .nav-wrap{
          flex: 1;
          display: flex; flex-direction: column;
          padding: 12px;
          overflow-y: auto; overflow-x: hidden;
        }

        .sider-modern .footer{
          height: 86px; padding: 12px;
          border-top: 1px solid ${BRAND.border};
          background: ${BRAND.panel};
          position: sticky; bottom: 0;
        }

        /* Rail base */
        .sider-modern .rail{
          background: ${BRAND.rail};
          border: 1px solid ${BRAND.border};
          border-radius: 18px;
          padding: 10px 8px;
          display: grid;
          gap: 8px;
          box-shadow: 0 10px 26px rgba(122,90,248,0.08);
        }

        .sider-modern .rail-btn{
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          height: 44px; padding: 0 14px;
          font-size: 14px; font-weight: 600; color: #5a4eb1;
          border: none; border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .sider-modern .rail-btn .rail-icon{
          font-size: 18px; width: 24px; display: grid; place-items: center;
          color: ${BRAND.primary};
        }
        .sider-modern .rail-btn:hover{
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(122,90,248,0.15);
          background: #f7f4ff; color: ${BRAND.primary};
        }
        .sider-modern .rail-btn.active{
          background: #f2edff;
          box-shadow: 0 14px 28px rgba(122,90,248,0.18);
          color: ${BRAND.primary};
        }
        .sider-modern .rail-btn.danger{ color: ${BRAND.primaryAlt}; }
        .sider-modern .rail-btn.danger .rail-icon{ color: ${BRAND.primaryAlt}; }
        .sider-modern .rail-btn.danger:hover{ background: #ffe9f1; }
        .sider-modern .rail-label{ white-space: nowrap; }
        .sider-modern .rail-label.pink{ color: ${BRAND.primaryAlt}; }

        /* Collapsed (overflow-safe) */
        .sider-modern .rail.collapsed{ padding: 8px 6px; }
        .sider-modern .rail.collapsed .rail-btn{ width: 58px; padding: 0; justify-content: center; }
        .sider-modern .rail.collapsed .rail-icon{ width: 22px; font-size: 18px; }
        .sider-modern .rail.collapsed .rail-label{ display: none !important; }
        .sider-modern .rail.collapsed .chev{ display: none; }

        /* Group chevron */
        .sider-modern .group .chev{
          margin-left: auto;
          font-size: 10px;
          transition: transform .2s ease;
          color: #8a7ef2;
        }
        .sider-modern .group .chev.open{ transform: rotate(180deg); }

        /* Expanded children list */
        .sider-modern .sub-flat{
          display: grid;
          gap: 8px;
          margin-top: 6px;
        }
        .sider-modern .sub-btn{
          height: 44px;
          display: flex; align-items: center; gap: 10px;
          border: none; border-radius: 12px;
          background: #fff;
          color: #5a4eb1; font-weight: 600;
          padding: 0 14px;
          text-align: left;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .sider-modern .sub-btn:hover{
          transform: translateY(-1px);
          background: #f7f4ff;
          box-shadow: 0 8px 18px rgba(122,90,248,0.12);
        }
        .sider-modern .sub-btn.active{
          background: #f2edff;
          box-shadow: 0 12px 24px rgba(122,90,248,0.16);
          color: ${BRAND.primary};
        }
        .sider-modern .sub-icon{
          width: 20px; display: grid; place-items: center;
          color: ${BRAND.primary};
          font-size: 16px;
        }

        /* Fly-out (collapsed) */
        .sider-flyout .ant-popover-inner{
          padding: 10px;
          border-radius: 14px;
          border: 1px solid ${BRAND.border};
          background: #ffffffee;
          backdrop-filter: blur(8px) saturate(140%);
        }
        .flyout{
          min-width: 220px;
          max-width: 260px;
          display: grid; gap: 10px;
        }
        .flyout-title{
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px; border-radius: 10px;
          background: #f7f4ff;
          color: ${BRAND.primary};
          font-weight: 700;
        }
        .flyout-title-icon{ font-size: 16px; display: grid; place-items: center; }
        .flyout-list{ display: grid; gap: 6px; }
        .flyout-item{
          height: 40px; border: none; border-radius: 10px;
          display: flex; align-items: center; gap: 10px;
          background: #fff; color: #5a4eb1; font-weight: 600;
          padding: 0 10px; text-align: left;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
          cursor: pointer;
          transition: background .15s ease, transform .15s ease, box-shadow .15s ease;
        }
        .flyout-item:hover{
          background: #f7f4ff;
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(122,90,248,0.12);
        }
        .flyout-item.active{
          background: #f2edff;
          color: ${BRAND.primary};
          box-shadow: 0 12px 24px rgba(122,90,248,0.16);
        }
        .flyout-icon{ width: 18px; display: grid; place-items: center; font-size: 16px; color: ${BRAND.primary}; }

        /* Mobile tweaks */
        @media (max-width: 576px) {
          .sider-modern .rail.collapsed .rail-btn{ width: 60px; }
        }
      `}</style>
    </Sider>
  );
}
