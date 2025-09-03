import React, { useEffect, useState } from "react";
import { App as AntApp, Card, Col, Row, Typography, Skeleton, List, Tag } from "antd";
import { api } from "../lib/api";

export default function Dashboard() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { fetchMetrics(); }, []);

  return (
    <div style={{ padding: 12 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text type="secondary">Total Users</Typography.Text>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {loading ? <Skeleton.Input active size="small" style={{ width: 80 }} /> : metrics.totalUsers}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text type="secondary">Total Cases</Typography.Text>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {loading ? <Skeleton.Input active size="small" style={{ width: 80 }} /> : metrics.totalCases}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Typography.Text type="secondary">Open Cases</Typography.Text>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {loading ? <Skeleton.Input active size="small" style={{ width: 80 }} /> : metrics.openCases}
            </Typography.Title>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="Recent Activity">
            {loading ? (
              <Skeleton active />
            ) : (
              <List
                dataSource={metrics.recentActivities}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={
                        <>
                          {item.title}{" "}
                          {item.type && <Tag>{item.type}</Tag>}
                        </>
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
    </div>
  );
}
