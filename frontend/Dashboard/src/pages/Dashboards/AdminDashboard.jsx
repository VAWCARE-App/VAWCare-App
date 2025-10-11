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
  Avatar,
  Input,
  Segmented,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  TeamOutlined,
  SettingOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** Tiny inline sparkline (no extra deps) */
function Sparkline({ points = [], width = 420, height = 120, stroke = "#ff6ea9" }) {
  if (!points.length) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const px = (i) => (i / (points.length - 1)) * (width - 20) + 10;
  const py = (v) => {
    if (max === min) return height / 2;
    const t = (v - min) / (max - min);
    return height - 18 - t * (height - 36);
  };
  const d = points.map((v, i) => `${i ? "L" : "M"} ${px(i)} ${py(v)}`).join(" ");
  const lastX = px(points.length - 1);
  const lastY = py(points[points.length - 1]);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff6ea9" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff6ea9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${lastX} ${height-18} L 10 ${height-18} Z`} fill="url(#sparkFill)" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="5.5" fill="#fff" stroke={stroke} strokeWidth="3" />
    </svg>
  );
}

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
    violet: "#7A5AF8",
    pink: "#e91e63",
    bg: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    soft: "rgba(122,90,248,0.18)",
    chip: "#fff0f7",
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

      const [reportsRes, casesRes, usersRes, logsRes] = await Promise.all([
        api.get("/api/reports").catch(() => ({ data: [] })),
        api.get("/api/cases").catch(() => ({ data: [] })),
        api.get("/api/admin/users").catch(() => ({ data: [] })),
        api.get("/api/logs").catch(() => ({ data: [] })),
      ]);

      const reports = Array.isArray(reportsRes.data)
        ? reportsRes.data
        : Array.isArray(reportsRes.data?.data)
        ? reportsRes.data.data
        : reportsRes.data?.items || [];

      const cases = Array.isArray(casesRes.data)
        ? casesRes.data
        : Array.isArray(casesRes.data?.data)
        ? casesRes.data.data
        : casesRes.data?.items || [];

      const usersPayload = usersRes.data;
      const logs = Array.isArray(logsRes.data)
        ? logsRes.data
        : Array.isArray(logsRes.data?.data)
        ? logsRes.data.data
        : logsRes.data?.items || [];

      let totalUsers = 0;
      if (Array.isArray(usersPayload)) {
        totalUsers = usersPayload.length;
      } else if (usersPayload && typeof usersPayload === "object") {
        const d = usersPayload.data || usersPayload;
        if (typeof d.total === "number") totalUsers = d.total;
        else {
          const adminsCount = Array.isArray(d.admins) ? d.admins.length : 0;
          const victimsCount = Array.isArray(d.victims) ? d.victims.length : 0;
          const officialsCount = Array.isArray(d.officials) ? d.officials.length : 0;
          if (!adminsCount && !victimsCount && !officialsCount && Array.isArray(d.items)) {
            totalUsers = d.items.length;
          } else {
            totalUsers = adminsCount + victimsCount + officialsCount;
          }
        }
      }

      const totalCases = Number(cases.length || 0);
      const openCases = Number(
        cases.filter((c) => String(c.status || "Open") === "Open").length || 0
      );

      const recentActivities = [];
      logs
        .slice(-10)
        .reverse()
        .forEach((l) =>
          recentActivities.push({
            id: `log-${l._id || l.id}`,
            title: l.action || "System event",
            type: "log",
            createdAt: l.createdAt || l.createdAt,
          })
        );
      reports
        .slice(-10)
        .reverse()
        .forEach((r) =>
          recentActivities.push({
            id: `report-${r._id || r.reportID}`,
            title: r.title || `Report ${r.reportID || r._id}`,
            type: "report",
            createdAt: r.createdAt || r.createdAt,
          })
        );
      recentActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setMetrics({
        totalUsers: Number(totalUsers || 0),
        totalCases: Number(totalCases || 0),
        openCases: Number(openCases || 0),
        recentActivities: recentActivities.slice(0, 10),
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load metrics");
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

  const KpiChip = ({ icon, label, value, delay = 0 }) => (
    <Card
      bordered
      className="fade-in-card"
      style={{
        borderRadius: 16,
        borderColor: BRAND.soft,
        height: "100%",
        animationDelay: `${delay}ms`,
        background: "#fff",
        boxShadow: "0 10px 26px rgba(122,90,248,0.06)",
      }}
      bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <Space align="center">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: BRAND.chip,
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
          value={typeof value === "number" ? value : Number(value ?? 0)}
          valueStyle={{ color: BRAND.violet, fontSize: "clamp(20px,3.4vw,28px)" }}
        />
      )}
    </Card>
  );

  // fake sparkline data derived from metrics so it changes slightly
  const sparkData = useMemo(() => {
    const base = Math.max(metrics.totalCases, 5);
    const open = Math.max(metrics.openCases, 1);
    // 10 points
    return [4, 6, 5, 7, 9, 8, 10, 9, 12, 11].map((n, i) =>
      Math.round((n * base) / (8 + (i % 3))) - (i % 2 ? open : 0)
    );
  }, [metrics]);

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: BRAND.bg }}>
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
            style={{ margin: 0, color: BRAND.violet, fontSize: "clamp(18px,2.2vw,22px)" }}
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
            style={{ borderRadius: 999, width: screens.md ? 240 : 160 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            style={{ borderColor: BRAND.violet, color: BRAND.violet }}
            size={screens.md ? "middle" : "small"}
          >
            Refresh
          </Button>
        </Space>
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
        <div style={{ width: "100%", maxWidth: 1320 }}>
          <Row gutter={[16, 16]}>
            {/* Left main column */}
            <Col xs={24} xl={16}>
              <Row gutter={[16, 16]}>
                {/* Overview big card */}
                <Col xs={24}>
                  <Card
                    className="fade-in-card"
                    bordered
                    style={{
                      borderRadius: 18,
                      borderColor: BRAND.soft,
                      background:
                        "linear-gradient(180deg, #7960f6 0%, #8f6df6 40%, #ff6ea9 100%)",
                      color: "#fff",
                      boxShadow: "0 24px 48px rgba(121,96,246,0.25)",
                    }}
                    bodyStyle={{ padding: 18 }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: screens.md ? "1fr auto" : "1fr",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Text style={{ color: "#fff", opacity: 0.9 }}>Overview</Text>
                          <Segmented
                            size="small"
                            options={["Weekly", "Monthly"]}
                            defaultValue="Monthly"
                          />
                        </div>
                        <div style={{ marginTop: 10 }}>
                          {loading ? (
                            <Skeleton active />
                          ) : (
                            <Sparkline points={sparkData} />
                          )}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                            gap: 10,
                            marginTop: 6,
                          }}
                        >
                          <div className="mini-stat">
                            <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>
                              Total Users
                            </Text>
                            <div className="mini-value">{metrics.totalUsers}</div>
                          </div>
                          <div className="mini-stat">
                            <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>
                              Total Cases
                            </Text>
                            <div className="mini-value">{metrics.totalCases}</div>
                          </div>
                          <div className="mini-stat">
                            <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>
                              Open Cases
                            </Text>
                            <div className="mini-value">{metrics.openCases}</div>
                          </div>
                        </div>
                      </div>

                      {/* target / donut column */}
                      {/* donut column (centered) */}
<div
  style={{
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 16,
    backdropFilter: "blur(6px)",
    padding: 12,
    width: screens.md ? 260 : "100%",
    // 👇 center contents
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    // keep a stable height so the ring + labels sit dead-center
    minHeight: screens.md ? 260 : 220,
  }}
>
  {loading ? (
    <Skeleton active />
  ) : (
    <>
      <Progress
        type="dashboard"
        percent={openPercent}
        size={screens.md ? 180 : 160}
        strokeColor="#fff"
        trailColor="rgba(255,255,255,0.25)"
        format={(p) => (
          <span
            style={{
              fontSize: "clamp(14px, 2.6vw, 24px)",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {p}% Open
          </span>
        )}
      />
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Tag color="#ffffff33" style={{ color: "#fff", borderColor: "#fff3" }}>
          Open: {metrics.openCases}
        </Tag>
        <Tag color="#ffffff33" style={{ color: "#fff", borderColor: "#fff3" }}>
          Total: {metrics.totalCases}
        </Tag>
      </div>
    </>
  )}
</div>

                    </div>
                  </Card>
                </Col>

                {/* Two stacked action tiles */}
                <Col xs={24} md={12}>
                  <Card
                    className="fade-in-card"
                    bordered
                    style={{
                      borderRadius: 18,
                      borderColor: BRAND.soft,
                      background:
                        "linear-gradient(180deg, #8a7cf9 0%, #7a5af8 100%)",
                      color: "#fff",
                      minHeight: 128,
                    }}
                    bodyStyle={{ padding: 16, display: "grid", gap: 10 }}
                  >
                    <Title level={5} style={{ color: "#fff", margin: 0 }}>
                      Daily Tasks
                    </Title>
                    <Button
                      href="/admin/reports"
                      style={{
                        borderRadius: 12,
                        height: 40,
                        fontWeight: 600,
                      }}
                    >
                      Review Reports
                    </Button>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card
                    className="fade-in-card"
                    bordered
                    style={{
                      borderRadius: 18,
                      borderColor: BRAND.soft,
                      background:
                        "linear-gradient(180deg, #ff86b9 0%, #ff6ea9 100%)",
                      color: "#fff",
                      minHeight: 128,
                    }}
                    bodyStyle={{ padding: 16, display: "grid", gap: 10 }}
                  >
                    <Title level={5} style={{ color: "#fff", margin: 0 }}>
                      My Actions
                    </Title>
                    <Button
                      href="/admin/users"
                      style={{
                        borderRadius: 12,
                        height: 40,
                        fontWeight: 600,
                      }}
                    >
                      Manage Users
                    </Button>
                  </Card>
                </Col>

                {/* KPI chips row */}
                <Col xs={24} md={8}>
                  <KpiChip
                    icon={<UserOutlined style={{ color: BRAND.violet, fontSize: 18 }} />}
                    label="Total Users"
                    value={metrics.totalUsers}
                    delay={100}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <KpiChip
                    icon={<FileTextOutlined style={{ color: BRAND.violet, fontSize: 18 }} />}
                    label="Total Cases"
                    value={metrics.totalCases}
                    delay={200}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <KpiChip
                    icon={<FolderOpenOutlined style={{ color: BRAND.violet, fontSize: 18 }} />}
                    label="Open Cases"
                    value={metrics.openCases}
                    delay={300}
                  />
                </Col>
              </Row>
            </Col>

            {/* Right “Friends / Activity” column */}
            <Col xs={24} xl={8}>
              <Card
                className="fade-in-card"
                title={<span style={{ color: BRAND.violet }}>Recent Activity</span>}
                bordered
                style={{
                  borderRadius: 18,
                  borderColor: BRAND.soft,
                  height: "100%",
                }}
                bodyStyle={{
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 200,
                  maxHeight: 520,
                  overflowY: "auto",
                }}
              >
                {loading ? (
                  <div style={{ padding: 16 }}>
                    <Skeleton active />
                  </div>
                ) : metrics.recentActivities.length === 0 ? (
                  <Empty
                    description={<span style={{ color: "#999" }}>No recent activity</span>}
                    style={{ padding: 24 }}
                  />
                ) : (
                  <List
                    style={{ padding: 8, flex: 1, overflowY: "auto" }}
                    dataSource={metrics.recentActivities}
                    renderItem={(item) => (
                      <List.Item key={item.id} style={{ paddingInline: 12 }}>
                        <List.Item.Meta
                          avatar={<Avatar style={{ background: BRAND.chip }}>{item.type?.[0]?.toUpperCase()}</Avatar>}
                          title={
                            <span>
                              {item.title}{" "}
                              {item.type && (
                                <Tag color="#7A5AF8" style={{ color: "#fff" }}>
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

      {/* Animations & extras */}
      <style>{`
        .fade-in-card { opacity: 0; transform: translateY(30px); animation: fadeUp .7s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .ant-card { transition: transform .2s ease, box-shadow .2s ease; }
        .ant-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(0,0,0,.08); }

        .mini-stat .mini-value{
          font-weight: 800;
          font-size: clamp(16px,3vw,22px);
          color: #fff;
        }
      `}</style>
    </Layout>
  );
}
