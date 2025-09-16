import React, { useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Card,
  Col,
  Row,
  Typography,
  Skeleton,
  List,
  Tag,
  Layout,
  Button,
  Statistic,
  Progress,
  Empty,
  Space,
  Grid,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  TeamOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminDashboard() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalCases: 0,
    openCases: 0,
    recentActivities: [],
  });

  const BRAND = {
    pink: "#e91e63",
    light: "#fff5f8",
    soft: "#ffd1dc",
  };

  const donutSize =
    screens.xxl ? 220 : screens.xl ? 200 : screens.lg ? 180 : screens.md ? 160 : 140;

  const resolvedCases = Math.max(metrics.totalCases - metrics.openCases, 0);
  const openPercent = useMemo(() => {
    const total = Math.max(metrics.totalCases, 1);
    return Math.round((metrics.openCases / total) * 100);
  }, [metrics]);
  const loadMetrics = async (withSpinner = true) => {
    try {
      if (withSpinner) setLoading(true);

      // Use existing endpoints and compute metrics client-side.
      // Some admin endpoints return arrays or objects with items; be defensive.
      const [reportsRes, casesRes, usersRes, logsRes] = await Promise.all([
        api.get('/api/reports').catch(() => ({ data: [] })),
        api.get('/api/cases').catch(() => ({ data: [] })),
        // Request admin users summary — returns admins, victims, officials or a total
        api.get('/api/admin/users').catch(() => ({ data: [] })),
        api.get('/api/logs').catch(() => ({ data: [] })),
      ]);

      // Backend typically returns { success: true, data: [...] }
      const reports = Array.isArray(reportsRes.data)
        ? reportsRes.data
        : Array.isArray(reportsRes.data?.data)
        ? reportsRes.data.data
        : (reportsRes.data?.items || []);

      const cases = Array.isArray(casesRes.data)
        ? casesRes.data
        : Array.isArray(casesRes.data?.data)
        ? casesRes.data.data
        : (casesRes.data?.items || []);

      // usersRes may be an array, or { success:true, data: { admins, victims, officials, total } }
      const usersPayload = usersRes.data;

      const logs = Array.isArray(logsRes.data)
        ? logsRes.data
        : Array.isArray(logsRes.data?.data)
        ? logsRes.data.data
        : (logsRes.data?.items || []);

      // Debug: log raw responses so developer can inspect the shapes
      console.debug('AdminDashboard API responses:', {
        reportsRaw: reportsRes.data,
        casesRaw: casesRes.data,
        usersRaw: usersRes.data,
        logsRaw: logsRes.data,
      });

      let totalUsers = 0;
      if (Array.isArray(usersPayload)) {
        totalUsers = usersPayload.length;
      } else if (usersPayload && typeof usersPayload === 'object') {
        // If backend returned { success: true, data: {...} }
        const d = usersPayload.data || usersPayload;
        if (typeof d.total === 'number') {
          totalUsers = d.total;
        } else {
          const adminsCount = Array.isArray(d.admins) ? d.admins.length : 0;
          const victimsCount = Array.isArray(d.victims) ? d.victims.length : 0;
          const officialsCount = Array.isArray(d.officials) ? d.officials.length : 0;
          // Fallback: if none of the arrays exist but d is an array-like 'items'
          if (!adminsCount && !victimsCount && !officialsCount && Array.isArray(d.items)) {
            totalUsers = d.items.length;
          } else {
            totalUsers = adminsCount + victimsCount + officialsCount;
          }
        }
      } else {
        totalUsers = 0;
      }
      const totalCases = Number(cases.length || 0);
      const openCases = Number(cases.filter((c) => (String(c.status || 'Open') === 'Open')).length || 0);

  const recentActivities = [];
  // prefer logs then reports for activity feed
  logs.slice(-10).reverse().forEach((l) => recentActivities.push({ id: `log-${l._id || l.id}`, title: l.action || 'System event', type: 'log', createdAt: l.createdAt || l.createdAt }));
  reports.slice(-10).reverse().forEach((r) => recentActivities.push({ id: `report-${r._id || r.reportID}`, title: r.title || `Report ${r.reportID || r._id}`, type: 'report', createdAt: r.createdAt || r.createdAt }));

      recentActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.debug('AdminDashboard parsed values:', { totalUsers, totalCases, openCases, recentCount: recentActivities.length });
      setMetrics({
        totalUsers: Number(totalUsers || 0),
        totalCases: Number(totalCases || 0),
        openCases: Number(openCases || 0),
        recentActivities: recentActivities.slice(0, 10),
      });
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to load metrics');
      setMetrics({ totalUsers: 0, totalCases: 0, openCases: 0, recentActivities: [] });
    } finally {
      if (withSpinner) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics(false);
    setRefreshing(false);
    message.success("Dashboard refreshed");
  };

  useEffect(() => {
    loadMetrics(true);
  }, []);

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
      bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
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
        <Text type="secondary" style={{ fontSize: 13 }}>
          {label}
        </Text>
      </Space>
      {loading ? (
        <Skeleton.Input active size="small" style={{ width: 100 }} />
      ) : (
        <Statistic
          value={typeof value === 'number' ? value : Number(value ?? 0)}
          valueStyle={{ color: BRAND.pink, fontSize: "clamp(20px,3.4vw,28px)" }}
        />
      )}
    </Card>
  );

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: BRAND.light }}>
      {/* Sticky header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: `linear-gradient(180deg, ${BRAND.light} 0%, #ffffff 60%)`,
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
              color: BRAND.pink,
              fontSize: "clamp(18px,2.2vw,22px)",
            }}
          >
            Admin Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Users, cases, and recent activity
          </Text>
        </Space>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
          style={{ borderColor: BRAND.pink, color: BRAND.pink }}
          size={screens.md ? "middle" : "small"}
        >
          Refresh
        </Button>
      </Header>

      <Content
        style={{
          padding: screens.md ? 16 : 12,
          display: "flex",
          justifyContent: "center",
          overflow: "auto",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1280 }}>
          <Row gutter={[16, 16]}>
            {/* KPIs with stagger animation */}
            <Col xs={24} sm={12} lg={8}>
              <KpiCard
                icon={<UserOutlined style={{ color: BRAND.pink, fontSize: 18 }} />}
                label="Total Users"
                value={metrics.totalUsers}
                delay={100}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <KpiCard
                icon={<FileTextOutlined style={{ color: BRAND.pink, fontSize: 18 }} />}
                label="Total Cases"
                value={metrics.totalCases}
                delay={200}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <KpiCard
                icon={<FolderOpenOutlined style={{ color: BRAND.pink, fontSize: 18 }} />}
                label="Open Cases"
                value={metrics.openCases}
                delay={300}
              />
            </Col>

            {/* Donut Chart */}
            <Col xs={24} md={12} lg={8}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Open vs Total</span>}
                bordered
                style={{
                  borderRadius: 14,
                  borderColor: BRAND.soft,
                  height: "100%",
                  animationDelay: "400ms",
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
                    <Space
                      style={{
                        marginTop: 12,
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      <Tag color={BRAND.pink} style={{ color: "#fff" }}>
                        Open: {metrics.openCases}
                      </Tag>
                      <Tag color="#52c41a">Total: {metrics.totalCases}</Tag>
                    </Space>
                  </div>
                )}
              </Card>
            </Col>

            {/* Quick Actions */}
            <Col xs={24} md={12} lg={8}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Quick Actions</span>}
                bordered
                style={{
                  borderRadius: 14,
                  borderColor: BRAND.soft,
                  height: "100%",
                  animationDelay: "500ms",
                }}
                bodyStyle={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  block
                  style={{
                    background: BRAND.pink,
                    borderColor: BRAND.pink,
                    height: 44,
                    fontWeight: 600,
                  }}
                  href="/users"
                >
                  Manage Users
                </Button>
                <Button
                  icon={<FileTextOutlined />}
                  block
                  style={{
                    borderColor: BRAND.pink,
                    color: BRAND.pink,
                    height: 44,
                    fontWeight: 600,
                  }}
                  href="/reports"
                >
                  Review Reports
                </Button>
                <Button
                  icon={<FolderOpenOutlined />}
                  block
                  style={{
                    borderColor: BRAND.pink,
                    color: BRAND.pink,
                    height: 44,
                    fontWeight: 600,
                  }}
                  href="/cases"
                >
                  Manage Cases
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  block
                  style={{
                    borderColor: BRAND.pink,
                    color: BRAND.pink,
                    height: 44,
                    fontWeight: 600,
                  }}
                  href="/settings"
                >
                  Settings
                </Button>
              </Card>
            </Col>

            {/* Recent Activity */}
            <Col xs={24} lg={8}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.pink }}>Recent Activity</span>}
                bordered
                style={{
                  borderRadius: 14,
                  borderColor: BRAND.soft,
                  height: "100%",
                  animationDelay: "600ms",
                }}
                bodyStyle={{
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 200,
                }}
              >
                {loading ? (
                  <div style={{ padding: 16 }}>
                    <Skeleton active />
                  </div>
                ) : metrics.recentActivities.length === 0 ? (
                  <Empty
                    description={
                      <span style={{ color: "#999" }}>No recent activity yet</span>
                    }
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
                                <Tag
                                  color={BRAND.pink}
                                  style={{ color: "#fff" }}
                                >
                                  {item.type}
                                </Tag>
                              )}
                            </span>
                          }
                          description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString()
                                : ""}
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
