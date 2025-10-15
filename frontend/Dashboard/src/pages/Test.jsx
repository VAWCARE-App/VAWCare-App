import React, { useState } from "react";
import {
  Layout,
  Tabs,
  Typography,
  Space,
  Input,
  Button,
  Grid,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  BellOutlined,
} from "@ant-design/icons";

import UserInsights from "./Insights/UserInsights";
import ReportsInsights from "./Insights/ReportsInsights";
import CasesInsights from "./Insights/CasesInsights";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function Test() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add this
  const screens = Grid.useBreakpoint();


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
    setRefreshKey((k) => k + 1); // Change key to trigger remount
    setTimeout(() => setLoading(false), 1000); // fake loading
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: BRAND.bg,
          borderBottom: `1px solid ${BRAND.soft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 16,
          paddingBlock: screens.md ? 12 : 10,
          height: "auto",
          lineHeight: 1.2,
        }}
      >
        <Space direction="vertical" size={0}>
          <Title
            level={screens.md ? 4 : 5}
            style={{
              margin: 0,
              color: BRAND.violet,
              fontSize: "clamp(18px,2.2vw,22px)",
              fontWeight: 700,
            }}
          >
            Primary Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Overview • Users • Cases • Activity
          </Text>
        </Space>

        <Space>
          <Input
            allowClear
            placeholder="Search…"
            suffix={<SearchOutlined />}
            style={{ borderRadius: 999, width: 220 }}
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
          >
            Refresh
          </Button>
        </Space>
      </Header>

      {/* Tabs */}
      <Content style={{ padding: 12, paddingLeft: 52, paddingRight: 52 }}>
        <div
          className="custom-tabs"
          style={{
            background: "#fff",
            borderRadius: 16,
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            tabBarGutter={24}
            items={tabs.map((t) => ({
              key: t.key,
              label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {t.icon} {t.label}
                </span>
              ),
              children: (
                <div
                  style={{
                    marginTop: 16,
                    background: "#F8F4FF",
                    minHeight: "60vh",
                    boxShadow: "inset 0 0 8px rgba(0,0,0,0.05)",
                  }}
                >
                  {t.key === "overview" && <UserInsights key={refreshKey} />}
                  {t.key === "users" && <UserInsights key={refreshKey} />}
                  {t.key === "reports" && <ReportsInsights key={refreshKey} />}
                  {t.key === "cases" && <CasesInsights key={refreshKey} />}
                  {t.key === "alerts" && <UserInsights key={refreshKey} />}
                </div>
              ),
            }))}
            tabBarStyle={{
              background: BRAND.light,
              borderRadius: 10,
              padding: "6px 12px",
              marginBottom: 12,
            }}
          />
        </div>
      </Content>

      {/* Inline Style Overrides for Tab Look */}
      <style>
        {`
          .ant-tabs-nav-list {
            display: flex;
            gap: 8px;
          }
          .ant-tabs-tab {
            background: transparent;
            border-radius: 999px;
            padding: 6px 14px !important;
            font-weight: 500;
            transition: all 0.25s ease;
          }
          .ant-tabs-tab:hover {
            background: ${BRAND.soft};
            color: ${BRAND.violet};
          }
          .ant-tabs-tab-active {
            background: ${BRAND.soft};
            color: white !important;
            font-weight: 600;
          }
          .ant-tabs-ink-bar {
            display: none !important;
          }
        `}
      </style>
    </Layout>
  );
}
