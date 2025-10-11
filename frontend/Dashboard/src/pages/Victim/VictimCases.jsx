import React, { useEffect, useState } from "react";
import {
  Layout, Card, Typography, Space, Segmented, Tag, List, Skeleton, Empty, Grid, Input
} from "antd";
import { api } from "../../lib/api";
import { SearchOutlined } from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function VictimCases() {
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const BRAND = {
    violet: "#7A5AF8",
    soft: "rgba(122,90,248,0.18)",
    chip: "#fff0f7",
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/victims/reports");
      const list = Array.isArray(data?.data) ? data.data : [];
      setCases(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = cases.filter((c) => {
    const okStatus =
      filter === "All" ? true :
      filter === "Open" ? (c.status === "Open" || c.status === "Under Investigation") :
      c.status && !["Open", "Under Investigation"].includes(c.status);
    const text = `${c.reportID} ${c.incidentType} ${c.status}`.toLowerCase();
    return okStatus && text.includes(q.toLowerCase());
  });

  return (
    <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#faf7ff,#fff)" }}>
      <Content style={{ padding: 16, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1100 }}>
          <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} align="center">
            <div>
              <Title level={screens.md ? 4 : 5} style={{ margin: 0, color: BRAND.violet }}>My Cases</Title>
              <Text type="secondary">Track status and updates</Text>
            </div>
            <Space>
              <Input
                allowClear
                placeholder="Search cases…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                suffix={<SearchOutlined />}
                style={{ borderRadius: 999, width: screens.md ? 240 : 180 }}
              />
              <Segmented
                options={["All", "Open", "Closed"]}
                value={filter}
                onChange={setFilter}
              />
            </Space>
          </Space>

          <Card
            bordered
            style={{ borderRadius: 16, borderColor: BRAND.soft }}
            bodyStyle={{ padding: 0 }}
          >
            {loading ? (
              <div style={{ padding: 16 }}><Skeleton active /></div>
            ) : filtered.length ? (
              <List
                dataSource={filtered}
                renderItem={(r) => (
                  <List.Item style={{ paddingInline: 16 }}>
                    <List.Item.Meta
                      title={<Text strong>{r.reportID}</Text>}
                      description={
                        <Text type="secondary">
                          {r.incidentType || "Incident"} • {r.dateReported ? new Date(r.dateReported).toLocaleString() : ""}
                        </Text>
                      }
                    />
                    <Tag color={(r.status === "Open" || r.status === "Under Investigation") ? "orange" : "green"}>
                      {r.status || "—"}
                    </Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No cases match your filters" style={{ margin: "24px 0" }} />
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
}
