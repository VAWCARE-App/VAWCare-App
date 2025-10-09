import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Typography,
  Skeleton,
  Tag,
  Layout,
  Grid,
  Button,
  Empty,
  Space,
  Statistic,
  List,
} from "antd";
import {
  FileTextOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  MessageOutlined,
  FileAddOutlined,
  WarningOutlined,
  LogoutOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
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
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    totalReports: 0,
    openCases: 0,
    recentActivities: [],
  });

  const [resources, setResources] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const BRAND = {
    pink: "#e91e63",
    light: "#fff5f8",
    soft: "#ffd1dc",
  };

  // Open Case Ratio (donut) removed per request

  const fetchMetrics = async (withSpinner = true) => {
    try {
      if (withSpinner) setLoading(true);
      const { data } = await api.get("/api/victims/metrics");
      setMetrics({
        totalReports: data?.data?.totalReports ?? 0,
        openCases: data?.data?.openCases ?? 0,
        recentActivities: Array.isArray(data?.data?.recentActivities) ? data.data.recentActivities : [],
      });
    } catch {
      // optional toast
    } finally {
      if (withSpinner) setLoading(false);
    }
  };

  const fetchMyReports = async () => {
    setReportsLoading(true);
    try {
      const { data } = await api.get('/api/victims/reports');
      if (data?.success) {
        setMyReports(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      // ignore silently - optional toast
    } finally {
      setReportsLoading(false);
    }
  };

  // Optional: fetch safety tips/resources from backend; fall back to defaults
  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const { data } = await api.get("/api/resources"); // if your backend has this
      const list = Array.isArray(data?.data) ? data.data : [];
      if (list.length) {
        setResources(
          list.map((r, i) => ({
            key: r.id || i,
            title: r.title || "Resource",
            desc: r.description || "",
            action: r.action || null,
          }))
        );
      } else {
        setResources(defaultResources());
      }
    } catch {
      setResources(defaultResources());
    } finally {
      setResourcesLoading(false);
    }
  };

  const defaultResources = () => [
    {
      key: "r1",
      title: "If you’re in immediate danger",
      desc: "Use the Emergency Button or call your local hotline immediately.",
      action: { label: "Open Emergency Button", onClick: () => navigate("/emergency"), icon: <PhoneOutlined /> },
    },
    {
      key: "r2",
      title: "Document safely",
      desc: "Write what happened, where and when. Only if it’s safe to do so.",
      action: { label: "File a Report", onClick: () => navigate("/report"), icon: <FileAddOutlined /> },
    },
    {
      key: "r3",
      title: "Reach out",
      desc: "Consider a trusted person or barangay desk for support and guidance.",
      action: { label: "Barangay Details", onClick: () => navigate("/victim-barangay"), icon: <InfoCircleOutlined /> },
    },
    {
      key: "r4",
      title: "Chat with the assistant",
      desc: "Ask how to file reports, track cases, or where to get support.",
      action: { label: "Open AI Chatbot", onClick: () => navigate("/victim-chatbot"), icon: <MessageOutlined /> },
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMetrics(false), fetchResources()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMetrics(true);
    fetchResources();
    fetchMyReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    try { api.post('/api/auth/logout').catch(() => {}); } catch(e) {}
    clearToken();
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    localStorage.removeItem('actorId');
    localStorage.removeItem('actorType');
    localStorage.removeItem('actorBusinessId');
    navigate('/');
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
        <Text type="secondary" style={{ fontSize: 13 }}>
          {label}
        </Text>
      </Space>
      {loading ? (
        <Skeleton.Input active size="small" style={{ width: 90 }} />
      ) : (
        <Statistic
          value={value}
          valueStyle={{ color: BRAND.pink, fontSize: "clamp(20px,3.4vw,28px)" }}
        />
      )}
    </Card>
  );

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: BRAND.light }}>
      {/* Header with Refresh + Logout */}
      {/* <Header
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
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            size={screens.md ? "middle" : "small"}
            style={{ borderColor: BRAND.pink, color: BRAND.pink }}
          >
            Logout
          </Button>
        </Space>
      </Header> */}

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

            {/* My Reports - moved into donut position */}
            <Col xs={24} md={12} lg={8}>
              <Card
                title={<span style={{ color: BRAND.pink }}>My Reports</span>}
                bordered
                style={{ borderRadius: 14, borderColor: BRAND.soft, height: "100%" }}
              >
                {reportsLoading ? (
                  <Skeleton active />
                ) : myReports.length ? (
                  <List
                    dataSource={myReports.slice(0, 3)}
                    renderItem={(r) => (
                      <List.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                            <Text strong>{r.reportID || 'Report'}</Text>
                            <Tag color={r.status === 'Open' || r.status === 'Under Investigation' ? 'orange' : 'green'}>
                              {r.status}
                            </Tag>
                          </Space>
                          <Text type="secondary">{r.incidentType} • {new Date(r.dateReported).toLocaleString()}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No reports found" />
                )}
              </Card>
            </Col>

            {/* Quick Actions */}
            <Col xs={24} md={12}>
              <Card
                title={<span style={{ color: BRAND.pink }}>Quick Actions</span>}
                bordered
                style={{ borderRadius: 14, borderColor: BRAND.soft, height: "100%" }}
                bodyStyle={{ display: "flex", gap: 12, flexWrap: "wrap" }}
              >
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  onClick={() => navigate("/victim/report")}
                >
                  File a New Report
                </Button> 
                <Button
                  danger
                  icon={<WarningOutlined />}
                  onClick={() => navigate("/victim/emergency")}
                >
                  Emergency Button
                </Button>
                <Button onClick={() => navigate("/victim-chatbot")} icon={<MessageOutlined />}>
                  Chat with AI
                </Button>
              </Card>
            </Col>

            {/* Recent Activity */}
            <Col xs={24} md={12}>
              <Card
                title={<span style={{ color: BRAND.pink }}>Recent Activity</span>}
                bordered
                style={{ borderRadius: 14, borderColor: BRAND.soft, height: "100%" }}
                bodyStyle={{ padding: 0 }}
              >
                {loading ? (
                  <div style={{ padding: 16 }}>
                    <Skeleton active />
                  </div>
                ) : metrics.recentActivities?.length ? (
                  <List
                    dataSource={metrics.recentActivities}
                    renderItem={(item, idx) => {
                      // item may be a string or an object; show a clear title and time
                      const title =
                        typeof item === 'string'
                          ? item
                          : item.title || (item.reportID ? `Report ${item.reportID}${item.incidentType ? ` — ${item.incidentType}` : ''}` : 'Activity');

                      const timeVal =
                        item?.time || item?.updatedAt || item?.dateReported || null;

                      const timeText = timeVal ? new Date(timeVal).toLocaleString() : 'Just now';

                      const note = typeof item === 'string' ? null : item.note || item.status ? `Status: ${item.status}` : null;

                      return (
                        <List.Item key={item?.reportID || idx} style={{ paddingInline: 16 }}>
                          <Space direction="vertical" size={0} style={{ width: '100%' }}>
                            <Text strong>{title}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {timeText}
                            </Text>
                            {/* note intentionally removed - we only show action and time */}
                          </Space>
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty description="No recent activity" style={{ margin: "24px 0" }} />
                )}
              </Card>
            </Col>

            {/* Open Case Ratio removed */}

            {/* Safety Tips & Resources — ADDED */}
            <Col xs={24}>
              <Card
                title={<span style={{ color: BRAND.pink }}>Safety Tips & Resources</span>}
                bordered
                style={{ borderRadius: 14, borderColor: BRAND.soft }}
                bodyStyle={{ paddingTop: 0 }}
              >
                {resourcesLoading ? (
                  <Skeleton active />
                ) : (
                  <List
                    itemLayout="vertical"
                    dataSource={resources}
                    renderItem={(r) => (
                      <List.Item key={r.key}>
                        <Space direction="vertical" size={2}>
                          <Text strong>{r.title}</Text>
                          {r.desc && <Text type="secondary">{r.desc}</Text>}
                          {r.action && (
                            <Button
                              size="small"
                              icon={r.action.icon || <InfoCircleOutlined />}
                              onClick={r.action.onClick}
                              style={{ marginTop: 6, borderColor: BRAND.pink, color: BRAND.pink }}
                            >
                              {r.action.label}
                            </Button>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}
