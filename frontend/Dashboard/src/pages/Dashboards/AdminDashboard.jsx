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
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
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
          zIndex: 10,
          background: BRAND.bg,
          borderBottom: `1px solid ${BRAND.soft}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        {/* LEFT – sidebar button (only on small screens) + title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
          }}
        >
          {/* Sidebar icon: show only on devices smaller than md */}
          {!screens.md && (
            <Button
              type="text"
              aria-label="Toggle sidebar"
              icon={<MenuOutlined />}
              onClick={handleToggleSidebar}
              style={{
                width: screens.md ? 40 : 36,
                height: screens.md ? 40 : 36,
                display: "grid",
                placeItems: "center",
                borderRadius: 10,
                background: "#ffffffaa",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Admin Dashboard
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Monitor system insights, users, reports, cases, and alerts.
              </Text>
            )}
          </div>
        </div>

        {/* RIGHT – search + refresh buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {searchVisible ? (
            <Input
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onBlur={() => {
                if (!searchText) setSearchVisible(false);
              }}
              onPressEnter={() => {
                console.log("Search for:", searchText);
                // Add your search logic here
              }}
              autoFocus
              style={{ width: screens.md ? 200 : 150 }}
            />
          ) : (
            <Button
              icon={<SearchOutlined />}
              onClick={() => setSearchVisible(true)}
            >
              {screens.md ? "Search" : null}
            </Button>
          )}

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            style={{
              borderColor: BRAND.violet,
              color: BRAND.violet,
            }}
          >
            {screens.md ? "Refresh" : null}
          </Button>
        </div>
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
              {/* Single row horizontal scrollable tabs */}
              <div className="mobile-tabs-horizontal" style={{ marginBottom: 12 }}>
                <div className="tabs-scroll-container">
                  {tabs.map((t) => (
                    <Button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      type={activeTab === t.key ? "primary" : "default"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 20px",
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        background: activeTab === t.key ? BRAND.violet : "#fff",
                        color: activeTab === t.key ? "#fff" : "rgba(0,0,0,0.75)",
                        border: activeTab === t.key ? "none" : `1px solid ${BRAND.soft}`,
                        boxShadow: activeTab === t.key 
                          ? "0 4px 12px rgba(122,90,248,0.25)" 
                          : "0 2px 6px rgba(0,0,0,0.04)",
                        transition: "all .2s ease",
                      }}
                      icon={t.icon}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
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
        /* Remove button and icon outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        .ant-btn-icon-only:focus,
        .ant-btn-icon-only:active,
        button:focus,
        button:active,
        .anticon:focus,
        .anticon:active {
          outline: none !important;
          box-shadow: none !important;
        }

        /* prevent accidental horizontal overflow from tabs area */
        .custom-tabs { overflow-x: hidden; box-sizing: border-box; }

        /* Horizontal scrollable tabs - single row, centered */
        .mobile-tabs-horizontal {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        
        .mobile-tabs-horizontal::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        .tabs-scroll-container {
          display: flex;
          gap: 10px;
          padding: 8px 4px;
          justify-content: flex-start;
          min-width: min-content;
        }

        /* Center tabs if they fit in viewport */
        @media (min-width: 576px) {
          .tabs-scroll-container {
            justify-content: center;
          }
        }

        /* Button hover effects */
        .mobile-tabs-horizontal .ant-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(122,90,248,0.2) !important;
        }

        .mobile-tabs-horizontal .ant-btn:active {
          transform: translateY(0);
        }

        /* Smooth scroll behavior */
        .mobile-tabs-horizontal {
          scroll-behavior: smooth;
        }

        /* Active tab animation */
        .mobile-tabs-horizontal .ant-btn {
          transition: all .25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* ensure mobile content area doesn't get overlapped */
        .mobile-tab-content { z-index: 0; }
      `}</style>
    </Layout>
  );
}
