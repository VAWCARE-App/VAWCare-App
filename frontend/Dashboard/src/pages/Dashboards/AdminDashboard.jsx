import React, { useEffect, useState } from "react";
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
  Grid,
  Button,
} from "antd";
import { api } from "../../lib/api";
import Sidebar from "../../components/Sidebar";

const { Header, Content } = Layout;
    
export default function AdminDashboard() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const screens = Grid.useBreakpoint();

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalCases: 0,
    openCases: 0,
    recentActivities: [],
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/metrics");
      setMetrics({
        totalUsers: data?.totalUsers ?? 0,
        totalCases: data?.totalCases ?? 0,
        openCases: data?.openCases ?? 0,
        recentActivities: Array.isArray(data?.recentActivities) ? data.recentActivities : [],
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const PINK = "#e91e63";
  const LIGHT_PINK = "#fff0f5";
  const SOFT_PINK = "#ffd1dc";

  return (
    <Layout style={{ minHeight: "100vh", width: "100vw", background: LIGHT_PINK }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout>
        <Header
          style={{
            background: "#fff",
            borderBottom: `1px solid ${SOFT_PINK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 16,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, color: PINK }}>
            Dashboard
          </Typography.Title>
          <Button
            onClick={fetchMetrics}
            style={{ borderColor: PINK, color: PINK }}
          >
            Refresh
          </Button>
        </Header>
        <Content style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card
                style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
                bodyStyle={{ padding: 16 }}
              >
                <Typography.Text type="secondary">Total Users</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                  {loading ? (
                    <Skeleton.Input active size="small" style={{ width: 80 }} />
                  ) : (
                    metrics.totalUsers
                  )}
                </Typography.Title>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
                bodyStyle={{ padding: 16 }}
              >
                <Typography.Text type="secondary">Total Cases</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                  {loading ? (
                    <Skeleton.Input active size="small" style={{ width: 80 }} />
                  ) : (
                    metrics.totalCases
                  )}
                </Typography.Title>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
                bodyStyle={{ padding: 16 }}
              >
                <Typography.Text type="secondary">Open Cases</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                  {loading ? (
                    <Skeleton.Input active size="small" style={{ width: 80 }} />
                  ) : (
                    metrics.openCases
                  )}
                </Typography.Title>
              </Card>
            </Col>
            <Col span={24}>
              <Card
                title={<span style={{ color: PINK }}>Recent Activity</span>}
                style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
                bodyStyle={{ padding: 0 }}
              >
                {loading ? (
                  <div style={{ padding: 16 }}>
                    <Skeleton active />
                  </div>
                ) : (
                  <List
                    style={{ padding: 8 }}
                    dataSource={metrics.recentActivities}
                    renderItem={(item) => (
                      <List.Item key={item.id} style={{ paddingInline: 12 }}>
                        <List.Item.Meta
                          title={
                            <span>
                              {item.title}{" "}
                              {item.type && (
                                <Tag color={PINK} style={{ color: "#fff" }}>
                                  {item.type}
                                </Tag>
                              )}
                            </span>
                          }
                          description={new Date(item.createdAt).toLocaleString()}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}