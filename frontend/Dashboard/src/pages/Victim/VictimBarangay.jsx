import React, { useEffect, useState } from "react";
import {
  Layout, Card, Typography, Space, Button, Descriptions, Skeleton, Grid
} from "antd";
import { PhoneOutlined, EnvironmentOutlined, MessageOutlined } from "@ant-design/icons";
import { api } from "../../lib/api";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function VictimBarangay() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    soft: "rgba(122,90,248,0.18)",
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Replace with your endpoint; this is just a friendly fallback:
        const { data } = await api.get("/api/victim/barangay").catch(() => ({ data: {} }));
        setInfo(
          data?.data || {
            name: "Your Barangay VAWC Desk",
            captain: "—",
            hotline: "117",
            address: "Nearest barangay hall",
            email: "—",
            officeHours: "8:00 AM – 5:00 PM (Mon–Fri)",
          }
        );
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#faf7ff,#fff)" }}>
      <Content style={{ padding: 16, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1000 }}>
          <Title level={screens.md ? 4 : 5} style={{ color: BRAND.violet, marginBottom: 12 }}>
            Barangay Assistance
          </Title>

          <Card
            bordered
            style={{
              borderRadius: 16,
              borderColor: BRAND.soft,
              background: "linear-gradient(180deg, #8a7cf9 0%, #7a5af8 100%)",
              color: "#fff",
              marginBottom: 16,
            }}
            bodyStyle={{ padding: 16, color: "#fff" }}
          >
            <Space direction="vertical" size={4}>
              <Text style={{ color: "#fff", opacity: 0.9 }}>Nearest Help</Text>
              <Title level={4} style={{ color: "#fff", margin: 0 }}>{info?.name}</Title>
              <Text style={{ color: "#fff" }}>
                <EnvironmentOutlined /> {info?.address}
              </Text>
              <Space wrap style={{ marginTop: 6 }}>
                <Button type="primary" icon={<PhoneOutlined />} href={`tel:${info?.hotline || "117"}`}>
                  Call Hotline
                </Button>
                <Button icon={<MessageOutlined />}>Message Desk</Button>
              </Space>
            </Space>
          </Card>

          <Card bordered style={{ borderRadius: 16, borderColor: BRAND.soft }}>
            {loading ? (
              <Skeleton active />
            ) : (
              <Descriptions column={1} labelStyle={{ fontWeight: 600 }}>
                <Descriptions.Item label="Barangay">{info?.name}</Descriptions.Item>
                <Descriptions.Item label="Captain / Officer">{info?.captain}</Descriptions.Item>
                <Descriptions.Item label="VAWC Hotline">{info?.hotline}</Descriptions.Item>
                <Descriptions.Item label="Office Hours">{info?.officeHours}</Descriptions.Item>
                <Descriptions.Item label="Address">{info?.address}</Descriptions.Item>
                <Descriptions.Item label="Email">{info?.email}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
