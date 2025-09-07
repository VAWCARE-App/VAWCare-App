import React, { useEffect, useState } from "react";
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
} from "antd";
import { api, clearToken } from "../../lib/api";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;

export default function VictimDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const screens = Grid.useBreakpoint();

  const [metrics, setMetrics] = useState({
    totalReports: 0,
    openCases: 0,
    recentActivities: [],
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // You may want to use a different endpoint for victims if needed
      const { data } = await api.get("/api/victims/metrics");
      setMetrics({
        totalReports: data?.totalReports ?? 0,
        openCases: data?.openCases ?? 0,
        recentActivities: Array.isArray(data?.recentActivities) ? data.recentActivities : [],
      });
    } catch (err) {
      // handle error
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

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    navigate("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh", width:"100vw", background: LIGHT_PINK }}>
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
            Victim Dashboard
          </Typography.Title>
          <Button
            onClick={handleLogout}
            style={{
              borderColor: PINK,
              color: PINK,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Logout
          </Button>
        </Header>
        <Content style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
                bodyStyle={{ padding: 16 }}
              >
                <Typography.Text type="secondary">My Reports</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                  {loading ? (
                    <Skeleton.Input active size="small" style={{ width: 80 }} />
                  ) : (
                    metrics.totalReports
                  )}
                </Typography.Title>
              </Card>
            </Col>
            <Col xs={24} md={12}>
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
