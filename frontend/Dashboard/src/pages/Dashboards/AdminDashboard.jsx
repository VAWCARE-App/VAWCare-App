import React, { useState } from "react";
import { Layout, Tabs, Typography, Space, Input, Button, Grid, Badge, Avatar } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  BellOutlined,
  MenuOutlined,
} from "@ant-design/icons";

import OverviewInsights from "../Insights/OverviewInsights";
import UserInsights from "../Insights/UserInsights";
import ReportsInsights from "../Insights/ReportsInsights";
import CasesInsights from "../Insights/CasesInsights";
import AlertsInsights from "../Insights/AlertsInsights";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const screens = Grid.useBreakpoint();

  const isXs = !screens.sm;           // < 576px
  const isSm = screens.sm && !screens.md;
  const isMdUp = screens.md;

  // Slightly smaller header on phones
  const HEADER_H = isMdUp ? 72 : 64;

  const BRAND = {
    violet: "#7A5AF8",
    soft: "rgba(122,90,248,0.18)",
    bg: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    light: "#f6f3ff",
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: <FolderOpenOutlined /> },
    { key: "users", label: "Users", icon: <UserOutlined /> },
    { key: "reports", label: "Reports", icon: <FileTextOutlined /> },
    { key: "cases", label: "Cases", icon: <FolderOpenOutlined /> },
    { key: "alerts", label: "Alerts", icon: <BellOutlined /> },
  ];

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setLoading(false), 800);
  };

  const handleToggleSidebar = () => {
    // Broadcast a simple event that Sidebar listens to
    window.dispatchEvent(new Event("toggle-sider"));
  };

  return (
    <Layout
      style={{
        minHeight: "100dvh",
        background: "#fff",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          background: BRAND.bg,
          borderBottom: `1px solid ${BRAND.soft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: isMdUp ? 20 : 12,
          paddingBlock: isMdUp ? 12 : 8,
          height: HEADER_H,
          lineHeight: 1.2,
          boxSizing: "border-box",
        }}
      >
        {/* LEFT – sidebar button (only on small screens) + title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMdUp ? 12 : 8,
            minWidth: 0,
          }}
        >
          {/* Sidebar icon: show only on devices smaller than md */}
          {!isMdUp && (
            <Button
              type="text"
              aria-label="Toggle sidebar"
              icon={<MenuOutlined />}
              onClick={handleToggleSidebar}
              style={{
                width: isMdUp ? 40 : 36,
                height: isMdUp ? 40 : 36,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#ffffffaa",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            />
          )}

          <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
            <Title
              level={isMdUp ? 4 : 5}
              style={{
                margin: 0,
                color: BRAND.violet,
                fontSize: isMdUp ? "clamp(18px,2.2vw,22px)" : "18px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Admin Dashboard
            </Title>
            {/* subtitle hidden on the smallest screens */}
            {!isXs && (
              <Text type="secondary" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>
                Overview • Users • Reports • Cases • Alerts
              </Text>
            )}
          </Space>
        </div>

        {/* RIGHT – search + refresh + (optional) bell */}
        <Space size={isMdUp ? 12 : 8} wrap={false} style={{ alignItems: "center" }}>
          {/* show full input on sm+; on xs show compact icon button */}
          {screens.sm ? (
            <Input
              allowClear
              placeholder="Search…"
              suffix={<SearchOutlined />}
              style={{
                borderRadius: 999,
                width: isMdUp ? 240 : 180,
                minWidth: 120,
              }}
              size={isMdUp ? "middle" : "small"}
            />
          ) : (
            <Button
              type="text"
              icon={<SearchOutlined />}
              aria-label="Search"
              onClick={() => {
                // optionally open a search modal/drawer
                console.log("open search");
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#ffffffaa",
                boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
              }}
              size="small"
            />
          )}

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            style={{
              borderColor: BRAND.violet,
              color: BRAND.violet,
              borderRadius: 999,
              paddingInline: isMdUp ? 12 : 8,
            }}
            size={isMdUp ? "middle" : "small"}
          >
            {/* only show text on md+ */}
            {isMdUp ? "Refresh" : null}
          </Button>

          {!isXs && (
            <Badge overflowCount={99}>
              <Avatar
                shape="square"
                style={{ background: BRAND.light, color: BRAND.violet }}
                icon={<BellOutlined />}
              />
            </Badge>
          )}
        </Space>
      </Header>

      {/* Tabs + Content */}
      <Content
        style={{
          paddingTop: 12,
          paddingLeft: isMdUp ? 52 : isSm ? 24 : 12,
          paddingRight: isMdUp ? 52 : isSm ? 24 : 12,
          paddingBottom: 16,
        }}
      >
        <div
          className="custom-tabs"
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: isMdUp ? 12 : 8,
          }}
        >
          {isMdUp ? (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              centered
              tabPosition="top"
              tabBarGutter={24}
              items={tabs.map((t) => ({
                key: t.key,
                label: (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    {t.icon}
                    <span>{t.label}</span>
                  </span>
                ),
                children: (
                  <div
                    style={{
                      marginTop: 16,
                      background: "#F8F4FF",
                      minHeight: "60vh",
                      borderRadius: 12,
                      boxShadow: "inset 0 0 8px rgba(0,0,0,0.05)",
                      padding: 16,
                    }}
                  >
                    {t.key === "overview" && <OverviewInsights key={refreshKey} />}
                    {t.key === "users" && <UserInsights key={refreshKey} />}
                    {t.key === "reports" && <ReportsInsights key={refreshKey} />}
                    {t.key === "cases" && <CasesInsights key={refreshKey} />}
                    {t.key === "alerts" && <AlertsInsights key={refreshKey} />}
                  </div>
                ),
              }))}
              tabBarStyle={{
                background: BRAND.light,
                borderRadius: 10,
                padding: "6px 12px",
                marginBottom: 12,
              }}
              moreIcon={null}
            />
          ) : (
            <>
              {/* Responsive grid: 3 cols by default, drop to 2 cols on very small screens */}
              <div className="mobile-tabs-grid" style={{ marginBottom: 12 }}>
                {tabs.map((t) => (
                  <Button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    type={activeTab === t.key ? "primary" : "default"}
                    ghost={activeTab !== t.key}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 12,
                      justifyContent: "flex-start",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                    icon={t.icon}
                  >
                    <span style={{ fontSize: 14 }}>{t.label}</span>
                  </Button>
                ))}
              </div>

              <div className="mobile-tab-content" style={{ background: "#F8F4FF", minHeight: "52vh", borderRadius: 12, padding: 10 }}>
                {activeTab === "overview" && <OverviewInsights key={refreshKey} />}
                {activeTab === "users" && <UserInsights key={refreshKey} />}
                {activeTab === "reports" && <ReportsInsights key={refreshKey} />}
                {activeTab === "cases" && <CasesInsights key={refreshKey} />}
                {activeTab === "alerts" && <AlertsInsights key={refreshKey} />}
              </div>
            </>
          )}
        </div>
      </Content>

      {/* Inline CSS overrides for mobile responsiveness */}
      <style>{`
        /* prevent accidental horizontal overflow from tabs area */
        .custom-tabs { overflow-x: hidden; box-sizing: border-box; }

        /* Mobile tabs grid: 3 columns on typical phones, 2 columns on very small screens */
        .mobile-tabs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (max-width: 420px) {
          .mobile-tabs-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Buttons full-width and consistent */
        .mobile-tabs-grid .ant-btn {
          width: 100% !important;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-start;
          padding: 10px 12px !important;
          border-radius: 12px !important;
          border: 1px solid rgba(122,90,248,0.06) !important;
          background: #fff !important;
          color: rgba(0,0,0,0.85) !important;
          font-weight: 600;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* default icon color */
        .mobile-tabs-grid .ant-btn .anticon { color: rgba(0,0,0,0.56); font-size: 16px; }

        /* Active/selected tab: high contrast, white text/icons and soft glow */
        .mobile-tabs-grid .ant-btn-primary {
          background: linear-gradient(90deg, ${BRAND.violet}, ${BRAND.violet}cc) !important;
          color: #fff !important;
          border: none !important;
          box-shadow: 0 10px 30px rgba(122,90,248,0.18) !important;
          transform: translateY(-2px);
        }
        .mobile-tabs-grid .ant-btn-primary .anticon { color: #fff !important; }

        /* Hover effect for non-active */
        .mobile-tabs-grid .ant-btn:not(.ant-btn-primary):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }

        /* Make sure the pill has clear spacing from header/content */
        .mobile-tabs-grid { margin-top: 6px; margin-bottom: 12px; }

        /* ensure mobile content area doesn't get overlapped */
        .mobile-tab-content { z-index: 0; }

        /* ----------------------------------------------------------
           When the same navbar selection is shown inside a Modal,
           force a single-line horizontal layout so items appear neat
           and don't wrap. This converts the grid into a horizontal
           scroller and makes each button inline and truncated.
           ---------------------------------------------------------- */
        .ant-modal .mobile-tabs-grid {
          display: flex;
          flex-direction: row;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 4px;
          -webkit-overflow-scrolling: touch;
          margin-top: 0; /* keep it tight in modal */
        }
        .ant-modal .mobile-tabs-grid .ant-btn {
          width: auto !important;
          flex: 0 0 auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ant-modal .mobile-tabs-grid .ant-btn .anticon {
          margin-right: 8px;
        }
        .ant-modal .mobile-tabs-grid .ant-btn-primary {
          transform: none; /* avoid translateY inside modal for alignment */
        }
      `}</style>
    </Layout>
  );
}
