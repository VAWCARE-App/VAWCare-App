import React, { useState } from "react";
import { Layout, Tabs, Typography, Space, Input, Button, Grid } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  BellOutlined,
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

  // Use a slightly smaller header on phones
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
          paddingBlock: isMdUp ? 12 : 10,
          height: HEADER_H,
          lineHeight: 1.2,
          boxSizing: "border-box",
        }}
      >
        <Space
          direction="vertical"
          size={0}
          style={{ minWidth: 0 }} // allow shrink
        >
          <Title
            level={isMdUp ? 4 : 5}
            style={{
              margin: 0,
              color: BRAND.violet,
              fontSize: isMdUp ? "clamp(18px,2.2vw,22px)" : "18px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Admin Dashboard
          </Title>
          {!isXs && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Overview • Users • Reports • Cases • Alerts
            </Text>
          )}
        </Space>

        <Space size={isMdUp ? 12 : 8} wrap={false}>
          <Input
            allowClear
            placeholder="Search…"
            suffix={<SearchOutlined />}
            style={{
              borderRadius: 999,
              width: isMdUp ? 240 : isSm ? 180 : 120,
            }}
            size={isMdUp ? "middle" : "small"}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            style={{
              borderColor: BRAND.violet,
              color: BRAND.violet,
              borderRadius: 999,
            }}
            size={isMdUp ? "middle" : "small"}
          >
            {isMdUp ? "Refresh" : null}
          </Button>
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
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            // On phones, align left and allow horizontal scroll; center on md+
            centered={isMdUp}
            tabPosition="top"
            tabBarGutter={isMdUp ? 24 : 8}
            items={tabs.map((t) => ({
              key: t.key,
              label: (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: isMdUp ? 14 : 12,
                  }}
                >
                  {t.icon}
                  <span style={{ display: "inline-block" }}>{t.label}</span>
                </span>
              ),
              children: (
                <div
                  style={{
                    marginTop: isMdUp ? 16 : 10,
                    background: "#F8F4FF",
                    minHeight: isMdUp ? "60vh" : "52vh",
                    borderRadius: 12,
                    boxShadow: "inset 0 0 8px rgba(0,0,0,0.05)",
                    padding: isMdUp ? 16 : 10,
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
              padding: isMdUp ? "6px 12px" : "4px 8px",
              marginBottom: isMdUp ? 12 : 8,
            }}
            // Make sure tab bar doesn’t wrap weirdly on mobile
            moreIcon={null}
          />
        </div>
      </Content>

      {/* Inline CSS overrides for mobile responsiveness */}
      <style>
        {`
          /* Make tabs horizontally scrollable on small screens */
          .custom-tabs .ant-tabs-nav {
            margin: 0 !important;
          }
          .custom-tabs .ant-tabs-nav .ant-tabs-nav-wrap {
            overflow-x: auto !important;
            overflow-y: hidden;
            scrollbar-width: thin;
          }
          .custom-tabs .ant-tabs-nav-list {
            display: flex;
            gap: 8px;
            flex-wrap: nowrap;
            min-width: max-content; /* prevent squish */
          }
          .custom-tabs .ant-tabs-tab {
            background: transparent;
            border-radius: 999px;
            padding: 8px 14px !important; /* touch target */
            font-weight: 500;
            transition: all 0.25s ease;
            white-space: nowrap; /* keep labels on one line */
          }
          @media (max-width: 575.98px) {
            .custom-tabs .ant-tabs-tab {
              padding: 8px 12px !important;
            }
          }
          .custom-tabs .ant-tabs-tab:hover {
            background: ${BRAND.soft};
            color: ${BRAND.violet};
          }
          .custom-tabs .ant-tabs-tab-active {
            background: ${BRAND.soft};
            color: ${BRAND.violet} !important;
            font-weight: 600;
          }
          .custom-tabs .ant-tabs-ink-bar {
            display: none !important;
          }
        `}
      </style>
    </Layout>
  );
}
