import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Layout,
  Input,
  Space,
  Tooltip,
  Row,
  Col,
  Typography,
  Card,
  Modal,
  Grid,
  Select,
} from "antd";
import {
  ReloadOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  bg: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
  soft: "rgba(122,90,248,0.18)",
  chip: "#fff0f7",
};

export default function AlertsManagement() {
  const screens = Grid.useBreakpoint();
  const [alerts, setAlerts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);
  const [iframeCoords, setIframeCoords] = useState({ lat: 0, lng: 0 });

  // --- dynamic table height ---
  const tableWrapRef = useRef(null);
  const [tableY, setTableY] = useState(420);

  const recalcTableY = () => {
    if (!tableWrapRef.current) return;
    const rect = tableWrapRef.current.getBoundingClientRect();
    const bottomGap = 16;
    const available = window.innerHeight - rect.top - bottomGap;
    const buffer = 24;
    setTableY(Math.max(240, available - buffer));
  };

  useEffect(() => {
    recalcTableY();
    const ro = new ResizeObserver(recalcTableY);
    ro.observe(document.body);
    window.addEventListener("resize", recalcTableY);
    const t = setTimeout(recalcTableY, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalcTableY);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    recalcTableY();
  }, [screens.md, screens.lg, filtered.length, showMapModal]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/alerts");
      const items = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
      setAlerts(items);
      setFiltered(items);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail && e.detail.lat !== undefined && e.detail.lng !== undefined) {
        setIframeCoords({ lat: Number(e.detail.lat), lng: Number(e.detail.lng) });
        setShowMapModal(true);
      }
    };
    window.addEventListener("alert-map-open", handler);
    return () => window.removeEventListener("alert-map-open", handler);
  }, []);

  const onSearch = (val) => {
    const q = String(val || "").trim().toLowerCase();
    if (!q) return setFiltered(alerts);
    setFiltered(
      alerts.filter((a) => {
        const victim =
          a.victimID && (a.victimID.victimID || `${a.victimID.firstName || ""} ${a.victimID.lastName || ""}`);
        return (
          String(a.alertID || "").toLowerCase().includes(q) ||
          String(a.type || "").toLowerCase().includes(q) ||
          String(victim || "").toLowerCase().includes(q) ||
          String(a.location?.address || `${a.location?.latitude},${a.location?.longitude}`).toLowerCase().includes(q)
        );
      })
    );
  };

  const onFilterStatus = (v) => {
    if (!v || v === "all") return setFiltered(alerts);
    setFiltered(alerts.filter((a) => String(a.status || "").toLowerCase() === String(v).toLowerCase()));
  };

  const stats = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter((a) => String(a.status || "").toLowerCase() === "active").length;
    const cancelled = alerts.filter((a) => String(a.status || "").toLowerCase() === "cancelled").length;
    const resolved = total - active - cancelled;
    return { total, active, cancelled, resolved };
  }, [alerts]);

  const openMap = (lat, lng) => {
    try {
      const ev = new CustomEvent("alert-map-open", { detail: { lat, lng } });
      window.dispatchEvent(ev);
    } catch {
      setIframeCoords({ lat, lng });
      setShowMapModal(true);
    }
  };

  // ✅ Updated columns (with map icon only)
  const columns = [
    {
      title: "Alert ID",
      dataIndex: "alertID",
      key: "alertID",
      width: 120,
      ellipsis: true,
      render: (t) => <Text strong>{t}</Text>,
    },
    { title: "Type", dataIndex: "type", key: "type", width: 140, ellipsis: true },
    {
      title: "Victim",
      dataIndex: ["victimID", "victimID"],
      key: "victim",
      width: 90,
      ellipsis: true,
      render: (_, r) =>
        r.victimID
          ? r.victimID.victimID ||
            `${r.victimID.firstName || ""} ${r.victimID.lastName || ""}`.trim()
          : "—",
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      align: "center",
      width: 100,
      render: (loc) => {
        if (!loc) return "—";
        const lat = loc?.latitude ?? loc?.lat;
        const lng = loc?.longitude ?? loc?.lng;
        return (
          <Tooltip title="View on map">
            <Button
              type="text"
              shape="circle"
              icon={<EnvironmentOutlined style={{ color: BRAND.violet, fontSize: 18 }} />}
              onClick={() => openMap(lat ?? loc.latitude, lng ?? loc.longitude)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      ellipsis: true,
      render: (s) => {
        const st = String(s || "").toLowerCase();
        if (st === "active") return <Tag color="red">Active</Tag>;
        if (st === "cancelled") return <Tag color="default">Cancelled</Tag>;
        return <Tag color="green">Resolved</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      ellipsis: true,
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Resolved",
      dataIndex: "resolvedAt",
      key: "resolvedAt",
      width: 180,
      ellipsis: true,
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
  ];

  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.bg,
        overflowX: "hidden",
      }}
    >
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
          paddingBlock: 12,
          height: "auto",
          lineHeight: 1.2,
        }}
      >
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
            Alert Management
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Review, manage, and monitor emergency alerts submitted by victims.
          </Text>
        </Space>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={load}
            style={{ borderColor: BRAND.violet, color: BRAND.violet }}
          >
            Refresh
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: screens.md ? 20 : 12, overflowX: "hidden" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gap: 12,
            width: "100%",
            overflowX: "hidden",
          }}
        >
          {/* Top Stats */}
          <Row gutter={[12, 12]}>
            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 12, textAlign: "center" }}>
                <Text type="secondary">Total</Text>
                <Title level={3} style={{ margin: 0, color: BRAND.pink }}>
                  {stats.total}
                </Title>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 12, textAlign: "center" }}>
                <Text type="secondary">Active</Text>
                <Title level={3} style={{ margin: 0, color: "#f50" }}>
                  {stats.active}
                </Title>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 12, textAlign: "center" }}>
                <Text type="secondary">Under/Resolved</Text>
                <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
                  {stats.resolved}
                </Title>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 12, textAlign: "center" }}>
                <Text type="secondary">Cancelled</Text>
                <Title level={3} style={{ margin: 0, color: BRAND.muted }}>
                  {stats.cancelled}
                </Title>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Card style={{ borderRadius: 12 }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Space>
                <Search
                  placeholder="Search alerts…"
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={onSearch}
                  style={{ width: screens.xs ? 220 : 360 }}
                />
                <Select defaultValue="all" onChange={onFilterStatus} style={{ width: 180 }}>
                  <Option value="all">All Status</Option>
                  <Option value="Active">Active</Option>
                  <Option value="Resolved">Resolved</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </Space>

              <Space>
                <Tooltip title="Reload alerts">
                  <Button icon={<ReloadOutlined />} onClick={load} />
                </Tooltip>
              </Space>
            </Space>
          </Card>

          {/* Table */}
          <Card style={{ borderRadius: 12, padding: 8, overflowX: "hidden" }} ref={tableWrapRef}>
            <Table
              dataSource={filtered}
              columns={columns}
              rowKey={(r) => r._id}
              loading={loading}
              pagination={false}
              sticky
              tableLayout="fixed"
              scroll={{ y: tableY }}
              onRow={(record) => ({
                style: { cursor: "pointer" },
                onClick: () => {
                  const loc = record.location;
                  if (loc && (loc.latitude || loc.lat))
                    openMap(loc.latitude ?? loc.lat, loc.longitude ?? loc.lng);
                },
              })}
            />
          </Card>
        </div>

        {/* Map Modal */}
        <Modal
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ExclamationCircleOutlined style={{ color: BRAND.pink }} />
              <div>
                <div style={{ fontWeight: 800 }}>Location</div>
                <Text type="secondary">Alert coordinates</Text>
              </div>
            </div>
          }
          open={showMapModal}
          onCancel={() => setShowMapModal(false)}
          footer={null}
          width={820}
        >
          <Card bodyStyle={{ padding: 8 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input value={iframeCoords.lat?.toFixed?.(6) ?? ""} readOnly style={{ textAlign: "center" }} />
              <Input value={iframeCoords.lng?.toFixed?.(6) ?? ""} readOnly style={{ textAlign: "center" }} />
            </div>
            <div style={{ width: "100%", height: 420, borderRadius: 8, overflow: "hidden" }}>
              <iframe
                title="Alert location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${iframeCoords.lat},${iframeCoords.lng}&z=15&output=embed`}
                allowFullScreen
              />
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button
                  type="link"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${iframeCoords.lat},${iframeCoords.lng}`
                      )}`,
                      "_blank",
                      "noopener"
                    )
                  }
                >
                  Open in Google Maps
                </Button>
              </div>
            </div>
          </Card>
        </Modal>
      </Content>

      <style>{`
        html, body, #root { overflow-x: hidden; }
        .ant-layout, .ant-layout-content { overflow-x: hidden; }
        .ant-card { transition: transform .15s ease, box-shadow .15s ease; }
        .ant-card:hover { transform: translateY(-4px); box-shadow: 0 16px 28px rgba(16,24,40,0.06); }
      `}</style>
    </Layout>
  );
}
