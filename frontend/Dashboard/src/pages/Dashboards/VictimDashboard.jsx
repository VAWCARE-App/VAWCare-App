import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
  Row,
  Typography,
  Skeleton,
  List,
  Tag,
  Layout,
  Grid,
  Button,
  Empty,
  Space,
  Statistic,
  Progress,
} from "antd";
import {
  WarningOutlined,
  FileAddOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { api, clearToken } from "../../lib/api";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function VictimDashboard() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalReports: 0,
    openCases: 0,
    recentActivities: [],
  });

  const BRAND = {
    pink: "#e91e63",
    light: "#fff5f8",
    soft: "#ffd1dc",
  };

  const donutSize = screens.xxl ? 220 : screens.xl ? 200 : screens.lg ? 180 : screens.md ? 160 : 140;

  const openPercent = useMemo(() => {
    const total = Math.max(metrics.totalReports, 1);
    return Math.round((metrics.openCases / total) * 100);
  }, [metrics]);

  const fetchMetrics = async (withSpinner = true) => {
    try {
      if (withSpinner) setLoading(true);
      const { data } = await api.get("/api/victims/metrics");
      setMetrics({
        totalReports: data?.totalReports ?? 0,
        openCases: data?.openCases ?? 0,
        recentActivities: Array.isArray(data?.recentActivities) ? data.recentActivities : [],
      });
    } catch {
      // optional: toast
    } finally {
      if (withSpinner) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMetrics(true);
  }, []);

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    navigate("/login");
  };

  const KpiCard = ({ icon, label, value, delay = 0 }) => (
    <Card
      bordered
      className="fade-in-card"
      style={{
        borderRadius: 14,
        borderColor: BRAND.soft,
        height: "100%",
        animationDelay: `${delay}ms`,
      }}
      bodyStyle={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        justifyContent: "center",
      }}
    >
      <Space align="center">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "#fff0f5",
            display: "grid",
            placeItems: "center",
            border: `1px solid ${BRAND.soft}`,
          }}
        >
          {icon}
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      </Space>
      {loading ? (
        <Skeleton.Input active size="small" style={{ width: 90 }} />
      ) : (
        <Statistic value={value} valueStyle={{ color: BRAND.pink, fontSize: "clamp(20px,3.4vw,28px)" }} />
      )}
    </Card>
  );

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: BRAND.light }}>
      {/* Sticky, compact header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "linear-gradient(180deg, #fff5f8 0%, #ffffff 60%)",
          borderBottom: "1px solid #ffd1dc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 16,
          height: "auto",
          lineHeight: 1.2,
          paddingBlock: 12,
        }}
      >
        <Space direction="vertical" size={0}>
          <Title level={screens.md ? 4 : 5} style={{ margin: 0, color: BRAND.pink }}>
            Victim Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Your reports, case status, and recent activity
          </Text>
        </Space>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            size={screens.md ? "middle" : "small"}
            style={{ borderColor: BRAND.pink, color: BRAND.pink }}
          >
            Refresh
          </Button>
          
        </Space>
      </Header>

      {/* Content */}
      <Content
        style={{
          padding: screens.md ? 16 : 12,
          display: "flex",
          justifyContent: "center",
          overflow: "auto",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1200 }}>
          <Row gutter={[16, 16]} align="stretch">
            {/* KPIs */}
            <Col xs={24} sm={12} lg={8}>
              <KpiCard
                icon={<FileTextOutlined style={{ color: BRAND.pink, fontSize: 18 }} />}
                label="My Reports"
                value={metrics.totalReports}
                delay={100}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <KpiCard
                icon={<SafetyCertificateOutlined style={{ color: BRAND.pink, fontSize: 18 }} />}
                label="Open Cases"
                value={metrics.openCases}
                delay={200}
              />
            </Col>

            {/* Status donut */}
            <Col xs={24} lg={8}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Open Case Ratio</span>}
                bordered
                style={{
                  borderRadius: 14,
                  borderColor: BRAND.soft,
                  height: "100%",
                  animationDelay: "300ms",
                }}
                bodyStyle={{ padding: 16, display: "grid", placeItems: "center" }}
              >
                {loading ? (
                  <Skeleton active />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <Progress
                      type="dashboard"
                      percent={openPercent}
                      strokeColor={BRAND.pink}
                      trailColor="#ffe6ef"
                      size={donutSize}
                      format={(p) => `${p}% Open`}
                    />
                    <Space style={{ marginTop: 10 }}>
                      <Tag color={BRAND.pink} style={{ color: "#fff", borderColor: BRAND.pink }}>
                        Open: {metrics.openCases}
                      </Tag>
                      <Tag color="#52c41a">
                        Closed: {Math.max(metrics.totalReports - metrics.openCases, 0)}
                      </Tag>
                    </Space>
                  </div>
                )}
              </Card>
            </Col>

            {/* Quick actions */}
            <Col xs={24} md={12}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Quick Actions</span>}
                style={{ borderRadius: 14, borderColor: BRAND.soft, animationDelay: "400ms" }}
                bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}
              >
                <Button
                  type="primary"
                  block
                  icon={<WarningOutlined />}
                  style={{ background: BRAND.pink, borderColor: BRAND.pink, height: 44, fontWeight: 600 }}
                  href="/emergency"
                >
                  Emergency Button
                </Button>
                <Button
                  block
                  icon={<FileAddOutlined />}
                  style={{ borderColor: BRAND.pink, color: BRAND.pink, height: 44, fontWeight: 600 }}
                  href="/report"
                >
                  File a New Report
                </Button>
              </Card>
            </Col>

            {/* Safety resources */}
            <Col xs={24} md={12}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Safety Tips & Resources</span>}
                style={{ borderRadius: 14, borderColor: BRAND.soft, animationDelay: "500ms" }}
                bodyStyle={{ padding: 16 }}
              >
                <ul style={{ margin: 0, paddingLeft: 18, color: "#666" }}>
                  <li>In immediate danger? Use the Emergency Button above.</li>
                  <li>Share your live location with a trusted contact when traveling.</li>
                  <li>Keep important numbers on speed dial.</li>
                </ul>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="magenta">Hotline</Tag>
                  <Tag color="geekblue">Shelter</Tag>
                  <Tag color="green">Legal Aid</Tag>
                </div>
              </Card>
            </Col>

            {/* Recent Activity */}
            <Col xs={24}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Recent Activity</span>}
                style={{ borderRadius: 14, borderColor: BRAND.soft, animationDelay: "600ms" }}
                bodyStyle={{ padding: 0, minHeight: 200 }}
              >
                {loading ? (
                  <div style={{ padding: 16 }}>
                    <Skeleton active />
                  </div>
                ) : metrics.recentActivities.length === 0 ? (
                  <Empty
                    description={<span style={{ color: "#999" }}>No recent activity yet</span>}
                    style={{ padding: 24 }}
                  />
                ) : (
                  <List
                    style={{ padding: 8, flex: 1, overflowY: "auto" }}
                    dataSource={metrics.recentActivities}
                    renderItem={(item) => (
                      <List.Item key={item.id} style={{ paddingInline: 12 }}>
                        <List.Item.Meta
                          title={
                            <span>
                              {item.title}{" "}
                              {item.type && (
                                <Tag color={BRAND.pink} style={{ color: "#fff", borderColor: BRAND.pink }}>
                                  {item.type}
                                </Tag>
                              )}
                            </span>
                          }
                          description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      {/* Animations */}
      <style>{`
        .fade-in-card {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.7s ease forwards;
        }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .ant-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .ant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.08);
        }
      `}</style>
    </Layout>
  );
}
