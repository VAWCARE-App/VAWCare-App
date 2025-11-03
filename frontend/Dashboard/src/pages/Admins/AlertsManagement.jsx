// src/pages/admin/AlertsManagement.jsx
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
  MenuOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  bg: "linear-gradient(180deg, #faf7ff 0%, #f6f3ff 60%, #ffffff 100%)",
  soft: "rgba(122,90,248,0.18)",
};

export default function AlertsManagement() {
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;
  const isSm = !!screens.sm && !screens.md;
  const isMdUp = !!screens.md;
  const isMobile = !isMdUp;
  const HEADER_H = isXs ? 56 : isMdUp ? 72 : 64;

  // Header is sticky and in-flow (like ReportManagement), so no marginTop math
  const TOP_PAD = 12;

  const [alerts, setAlerts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);
  const [iframeCoords, setIframeCoords] = useState({ lat: 0, lng: 0 });

  // --- dynamic table height (relative to where the card starts) ---
  const tableWrapRef = useRef(null);
  const [tableY, setTableY] = useState(420);

  const recalcTableY = () => {
    if (!tableWrapRef.current) return;
    const rect = tableWrapRef.current.getBoundingClientRect();
    const available = window.innerHeight - rect.top - 12; // bottom gap
    const buffer = isMobile ? 12 : 24;
    setTableY(Math.max(isMobile ? 180 : 240, available - buffer));
  };

  useEffect(() => {
    recalcTableY();
    const ro = new ResizeObserver(recalcTableY);
    ro.observe(document.body);
    window.addEventListener("resize", recalcTableY);
    const t = setTimeout(recalcTableY, 80);
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

  // Desktop columns
  const columnsDesktop = [
    {
      title: "Alert ID",
      dataIndex: "alertID",
      key: "alertID",
      width: 140,
      ellipsis: true,
      render: (t) => <Text strong>{t}</Text>,
    },
    { title: "Type", dataIndex: "type", key: "type", width: 140, ellipsis: true },
    {
      title: "Victim",
      dataIndex: ["victimID", "victimID"],
      key: "victim",
      width: 140,
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
      width: 110,
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
      width: 120,
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

  // Mobile columns
  const columnsMobile = [
    {
      title: "Alert",
      dataIndex: "alertID",
      key: "alertID",
      ellipsis: true,
      render: (t) => <Text strong style={{ fontSize: 13 }}>{t}</Text>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      ellipsis: true,
      render: (t) => <span style={{ fontSize: 13 }}>{t}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => {
        const st = String(s || "").toLowerCase();
        if (st === "active") return <Tag color="red">Active</Tag>;
        if (st === "cancelled") return <Tag>Cancelled</Tag>;
        return <Tag color="green">Resolved</Tag>;
      },
    },
    {
      title: "",
      dataIndex: "location",
      key: "loc",
      align: "right",
      render: (loc) => {
        if (!loc) return null;
        const lat = loc?.latitude ?? loc?.lat;
        const lng = loc?.longitude ?? loc?.lng;
        return (
          <Button
            size="small"
            type="text"
            icon={<EnvironmentOutlined style={{ color: BRAND.violet }} />}
            onClick={(e) => {
              e.stopPropagation();
              openMap(lat ?? loc.latitude, lng ?? loc.longitude);
            }}
          />
        );
      },
    },
  ];

  const columns = isMobile ? columnsMobile : columnsDesktop;

  return (
    <Layout
      style={{
        height: "100vh",
        width: "100%",
        background: BRAND.bg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* STICKY HEADER */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(250, 249, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BRAND.soft}`,
          boxShadow: "0 2px 12px rgba(16,24,40,0.06)",
          display: "flex",
          alignItems: "center",
          paddingInline: isXs ? 10 : isSm ? 12 : isMdUp ? 20 : 12,
          height: HEADER_H,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isXs ? 8 : 12, flex: 1 }}>
          {!isMdUp && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: isXs ? 34 : 38,
                height: isXs ? 34 : 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.9)",
                border: `1px solid ${BRAND.soft}`,
                boxShadow: "0 4px 12px rgba(122,90,248,0.08)",
              }}
            />
          )}

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            minWidth: 0,
            flex: 1,
          }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Alert Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Review, manage, and monitor emergency alerts submitted by victims.
              </Text>
            )}
          </div>
        </div>
      </Header>

      <Content
        style={{
          width: "100%",
          minWidth: 0,
          overflow: "auto",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        <div
          style={{
            padding: isXs ? 8 : isSm ? 10 : 12,
            width: "100%",
            maxWidth: "100%",
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: isXs ? 8 : 10,
            paddingInline: isXs ? 4 : isSm ? 8 : 12,
            transition: "width .25s ease",
            boxSizing: "border-box",
            minHeight: "100%",
          }}
        >
          {/* KPIs */}
          <Row gutter={[isXs ? 8 : 10, isXs ? 8 : 10]}>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ 
                borderRadius: 12, 
                textAlign: isXs ? "center" : "left",
                padding: isXs ? "8px 10px" : "10px 12px",
              }}>
                <Text type="secondary" style={{ fontSize: isXs ? 11 : 13, display: "block", marginBottom: 4 }}>
                  Total
                </Text>
                <Title level={isXs ? 4 : 3} style={{ margin: 0, color: BRAND.pink, fontSize: isXs ? 20 : 24, fontWeight: 700 }}>
                  {stats.total}
                </Title>
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ 
                borderRadius: 12, 
                textAlign: isXs ? "center" : "left",
                padding: isXs ? "8px 10px" : "10px 12px",
              }}>
                <Text type="secondary" style={{ fontSize: isXs ? 11 : 13, display: "block", marginBottom: 4 }}>
                  Active
                </Text>
                <Title level={isXs ? 4 : 3} style={{ margin: 0, color: "#f50", fontSize: isXs ? 20 : 24, fontWeight: 700 }}>
                  {stats.active}
                </Title>
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ 
                borderRadius: 12, 
                textAlign: isXs ? "center" : "left",
                padding: isXs ? "8px 10px" : "10px 12px",
              }}>
                <Text type="secondary" style={{ fontSize: isXs ? 11 : 13, display: "block", marginBottom: 4 }}>
                  {isXs ? "Resolved" : "Under/Resolved"}
                </Text>
                <Title level={isXs ? 4 : 3} style={{ margin: 0, color: "#52c41a", fontSize: isXs ? 20 : 24, fontWeight: 700 }}>
                  {stats.resolved}
                </Title>
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card style={{ 
                borderRadius: 12, 
                textAlign: isXs ? "center" : "left",
                padding: isXs ? "8px 10px" : "10px 12px",
              }}>
                <Text type="secondary" style={{ fontSize: isXs ? 11 : 13, display: "block", marginBottom: 4 }}>
                  Cancelled
                </Text>
                <Title level={isXs ? 4 : 3} style={{ margin: 0, fontSize: isXs ? 20 : 24, fontWeight: 700 }}>
                  {stats.cancelled}
                </Title>
              </Card>
            </Col>
          </Row>

          {/* Toolbar - Sticky */}
          <Card 
            style={{ 
              borderRadius: 14,
              padding: isXs ? "12px 8px" : isSm ? "12px 10px" : "14px 16px",
              position: "sticky",
              top: 0,
              zIndex: 99,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              background: "rgba(250, 249, 255, 0.98)",
              boxShadow: "0 4px 20px rgba(16,24,40,0.12)",
              marginBottom: 2,
            }}
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: isXs 
                ? "1fr" 
                : isSm 
                ? "1fr 1fr" 
                : isMdUp 
                ? "minmax(240px, 320px) 1fr auto" 
                : "1fr 1fr",
              gap: isXs ? 8 : 10,
              width: "100%",
              alignItems: "center",
            }}>
              <Search
                placeholder={isXs ? "Search alerts..." : "Search alerts…"}
                allowClear
                enterButton={
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    style={{
                      background: BRAND.violet,
                      borderColor: BRAND.violet,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {!isXs && "Search"}
                  </Button>
                }
                size={isXs ? "middle" : "large"}
                style={{ width: "100%" }}
                onSearch={onSearch}
              />

              <Select 
                defaultValue="all" 
                onChange={onFilterStatus} 
                size={isXs ? "middle" : "large"}
                style={{ width: "100%" }}
              >
                <Option value="all">All Status</Option>
                <Option value="Active">Active</Option>
                <Option value="Resolved">Resolved</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>

              <Button 
                icon={<ReloadOutlined />} 
                onClick={load} 
                size={isXs ? "middle" : "large"}
                style={{ 
                  width: isXs ? "100%" : "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  gridColumn: isXs ? "span 1" : "auto",
                }}
              >
                {!isXs && "Refresh"}
              </Button>
            </div>
          </Card>

          {/* Table */}
          <Card style={{ borderRadius: 12, padding: 8, overflow: "hidden" }} ref={tableWrapRef}>
            <Table
              dataSource={filtered}
              columns={isMobile ? columnsMobile : columns}
              rowKey={(r) => r._id}
              loading={loading}
              pagination={false}
              sticky
              tableLayout={isMobile ? "auto" : "fixed"}
              scroll={{ y: tableY, x: isMobile ? "max-content" : "max-content" }}
              size={isMobile ? "small" : "middle"}
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
          width={isMdUp ? 820 : Math.min(window.innerWidth * 0.96, 820)}
          style={{ top: isMobile ? 16 : 24 }}
          bodyStyle={{ padding: isMobile ? 12 : 24 }}
        >
          <Card bodyStyle={{ padding: isMobile ? 8 : 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input value={iframeCoords.lat?.toFixed?.(6) ?? ""} readOnly style={{ textAlign: "center" }} />
              <Input value={iframeCoords.lng?.toFixed?.(6) ?? ""} readOnly style={{ textAlign: "center" }} />
            </div>
            <div style={{ width: "100%", height: isMdUp ? 420 : 300, borderRadius: 8, overflow: "hidden" }}>
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
         html, body, #root { height: 100%; overflow-x: hidden; }
         .ant-layout, .ant-layout-content { overflow-x: hidden; }
         .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
         .ant-card:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(16,24,40,0.08); }

         /* Smooth sticky transitions */
         .ant-layout-header {
           transition: box-shadow 0.3s ease, background 0.3s ease;
         }

         /* Better mobile input sizing */
         @media (max-width: 576px) {
           .ant-input-search .ant-input-group .ant-input {
             font-size: 14px !important;
           }
           .ant-select-selector {
             font-size: 14px !important;
           }
           .ant-btn {
             font-size: 14px !important;
           }
         }

         .ant-table-thead > tr > th { background: #fff !important; }
         .ant-table .ant-table-tbody > tr:hover > td { background: #F1EEFF !important; }

         @media (max-width: 575.98px) {
           .ant-typography, .ant-card { font-size: 13px; }
           .ant-table { font-size: 12px; }
           .ant-space { row-gap: 6px; }
         }
      `}</style>
    </Layout>
  );
}
