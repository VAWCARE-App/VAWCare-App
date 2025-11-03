import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Layout,
  Card,
  Typography,
  Space,
  Segmented,
  Tag,
  List,
  Skeleton,
  Empty,
  Grid,
  Input,
  Button,
  Tooltip,
  message,
  Drawer,
  Descriptions,
  Divider,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  CopyOutlined,
  ExportOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function VictimCases() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [sort, setSort] = useState("Newest");
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState({ open: false, item: null });
  const [pageSize, setPageSize] = useState(8);

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    soft: "rgba(122,90,248,0.18)",
    pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
    cardBg: "rgba(255,255,255,0.95)",
  };

  // Debounce search
  const tRef = useRef(null);
  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setQDebounced(q.trim().toLowerCase()), 300);
    return () => tRef.current && clearTimeout(tRef.current);
  }, [q]);

  // Adaptive page size (and density)
  useEffect(() => {
    setPageSize(screens.xl ? 12 : screens.lg ? 10 : screens.md ? 8 : 6);
  }, [screens]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      let profile = null;
      try {
        const profRes = await api.get("/api/victims/profile");
        profile = profRes?.data?.data || null;
      } catch (e) {
        profile = null;
      }

      const reportsPromise = api.get("/api/victims/reports");
      const casesPromise = api.get("/api/cases", { params: { victimID: profile?._id || profile?.id || profile?.victimID || undefined } });

      const [reportsRes, casesRes] = await Promise.all([reportsPromise, casesPromise]);

      const reports = Array.isArray(reportsRes?.data?.data) ? reportsRes.data.data : [];
      const casesList = Array.isArray(casesRes?.data) ? casesRes.data : Array.isArray(casesRes?.data?.data) ? casesRes.data.data : [];

      const mappedReports = reports.map((r) => ({
        _source: "report",
        reportID: r.reportID || r._id || r.id,
        incidentType: r.incidentType,
        status: r.status,
        dateReported: r.dateReported || r.createdAt,
        description: r.description,
        location: r.location,
        perpetrator: r.perpetrator,
        raw: r,
      }));

      const mappedCases = casesList
        .filter((c) => {
          if (!profile) return true; 
          const vid = profile._id || profile.id || profile.victimID || profile.victimId;
          return String(c.victimID || c.victimId || c.victim || c.victimID) === String(vid);
        })
        .map((c) => ({
          _source: "case",
          reportID: c.caseID || c.caseId || c._id || c.id,
          incidentType: c.incidentType || c.title || "Case",
          status: c.status,
          dateReported: c.dateReported || c.createdAt,
          description: c.description,
          location: c.location,
          perpetrator: c.perpetrator,
          raw: c,
        }));

      const merged = [...mappedReports, ...mappedCases];
      setCases(merged);
    } catch (e) {
      setError("Unable to load cases.");
      message.error("Unable to load cases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const openish = (s) => s === "Open" || s === "Under Investigation";
    const all = cases.length;
    const open = cases.filter((c) => openish(c.status)).length;
    const closed = cases.filter((c) => c.status && !openish(c.status) && c.status !== "Pending").length;
    return { all, open, closed };
  }, [cases]);

  const statusTag = (s) => {
    const label = s || "—";
    if (s === "Open") return <Tag color="red">{label}</Tag>;
    if (s === "Under Investigation") return <Tag color="orange">{label}</Tag>;
    if (s === "Closed") return <Tag color="green">{label}</Tag>;
    return <Tag>{label}</Tag>;
  };

  const filtered = useMemo(() => {
    const openish = (s) => s === "Open" || s === "Under Investigation";
    const byFilter = (c) =>
      filter === "All" ? true :
      filter === "Open" ? openish(c.status) :
      c.status && !openish(c.status) && c.status !== "Pending";

    const byQ = (c) => {
      if (!qDebounced) return true;
      const text = `${c.reportID} ${c.incidentType} ${c.status} ${c.description || ""}`.toLowerCase();
      return text.includes(qDebounced);
    };

    const arr = cases.filter((c) => byFilter(c) && byQ(c));
    const getDate = (c) => (c.dateReported ? new Date(c.dateReported).getTime() : 0);
    const sourceWeight = (c) => (c._source === "case" ? 0 : 1);
    const compareBySourceThen = (a, b, tieBreaker) => {
      const sa = sourceWeight(a);
      const sb = sourceWeight(b);
      if (sa !== sb) return sa - sb; 
      return tieBreaker(a, b);
    };

    if (sort === "Newest")
      return arr.sort((a, b) => compareBySourceThen(a, b, (x, y) => getDate(y) - getDate(x)));

    if (sort === "Oldest")
      return arr.sort((a, b) => compareBySourceThen(a, b, (x, y) => getDate(x) - getDate(y)));

    if (sort === "Status")
      return arr.sort((a, b) => compareBySourceThen(a, b, (x, y) => (x.status || "").localeCompare(y.status || "")));

    return arr.sort((a, b) => sourceWeight(a) - sourceWeight(b));
  }, [cases, filter, qDebounced, sort]);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); message.success("Copied"); }
    catch { message.error("Copy failed"); }
  };

  const exportCsv = () => {
    const rows = [
      ["Report ID", "Incident Type", "Status", "Date Reported"],
      ...filtered.map((c) => [
        c.reportID || "",
        c.incidentType || "",
        c.status || "",
        c.dateReported ? new Date(c.dateReported).toLocaleString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-cases.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout style={{ minHeight: "100vh", background: BRAND.pageBg }}>
      <Content style={{ padding: isMobile ? 16 : 24, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1100 }}>
          <style>{`
            .page-header {
              background: ${BRAND.cardBg};
              border: 1px solid rgba(122,90,248,0.12);
              border-radius: 20px;
              padding: ${isMobile ? "20px" : "28px"};
              margin-bottom: 20px;
              box-shadow: 0 2px 12px rgba(122,90,248,0.08);
            }
            
            .toolbar {
              width:100%;
              display:flex; gap:12px; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap;
            }
            .toolbar-col { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
            .counts { display:flex; gap:10px; flex-wrap:wrap; }
            .count-pill {
              background: linear-gradient(135deg, rgba(122,90,248,0.08), rgba(233,30,99,0.06));
              border: 1px solid rgba(122,90,248,0.15);
              border-radius: 12px;
              padding: 10px 16px;
              font-weight: 600;
              display:inline-flex; 
              align-items:center; 
              gap:8px;
              box-shadow: 0 2px 8px rgba(122,90,248,0.06);
              transition: transform 0.2s ease;
            }
            .count-pill:hover {
              transform: translateY(-2px);
            }
            .count-pill .label {
              color: ${BRAND.violet};
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .filters-card {
              background: ${BRAND.cardBg};
              border: 1px solid rgba(122,90,248,0.12);
              border-radius: 16px;
              padding: ${isMobile ? "16px" : "20px"};
              margin-bottom: 20px;
              box-shadow: 0 2px 12px rgba(122,90,248,0.08);
            }
            
            .list-item { 
              transition: all 0.2s ease;
              border-bottom: 1px solid rgba(122,90,248,0.08);
            }
            .list-item:hover { 
              background: linear-gradient(135deg, rgba(122,90,248,0.03), rgba(233,30,99,0.02));
              transform: translateX(4px);
            }
            .list-item:last-child {
              border-bottom: none;
            }
            
            /* Enhanced input styles */
            .ant-input-affix-wrapper {
              border-radius: 12px !important;
              border-color: rgba(122,90,248,0.2) !important;
            }
            .ant-input-affix-wrapper:hover,
            .ant-input-affix-wrapper:focus,
            .ant-input-affix-wrapper-focused {
              border-color: ${BRAND.violet} !important;
              box-shadow: 0 0 0 2px rgba(122,90,248,0.1) !important;
            }
            
            /* Segmented styles */
            .ant-segmented {
              background: rgba(122,90,248,0.05) !important;
              border-radius: 12px !important;
              padding: 3px !important;
            }
            .ant-segmented-item-selected {
              background: ${BRAND.violet} !important;
              color: white !important;
              border-radius: 10px !important;
            }
            
            @media (max-width: 767px) {
              .toolbar { flex-direction: column; align-items: stretch; gap:12px; }
              .toolbar-col { width:100%; justify-content: space-between; }
              .filters-stack { display:grid; grid-template-columns: 1fr; gap:10px; }
              .actions-row { display:flex; gap:8px; justify-content: flex-end; }
            }
          `}</style>

          {/* Header */}
          <div className="page-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: BRAND.violet, marginBottom: 4 }}>
                  My Cases & Reports
                </Title>
                <Text type="secondary" style={{ fontSize: isMobile ? 13 : 14 }}>
                  Track your incident reports and their status
                </Text>
              </div>
              
              {/* Count Pills */}
              <div className="counts">
                <div className="count-pill">
                  <span className="label">All</span>
                  <Tag style={{ margin: 0, borderRadius: 8 }}>{counts.all}</Tag>
                </div>
                <div className="count-pill">
                  <span className="label">Open</span>
                  <Tag color="orange" style={{ margin: 0, borderRadius: 8 }}>{counts.open}</Tag>
                </div>
                <div className="count-pill">
                  <span className="label">Closed</span>
                  <Tag color="green" style={{ margin: 0, borderRadius: 8 }}>{counts.closed}</Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="filters-card">
            <div className={isMobile ? "filters-stack" : "toolbar-col"} style={{ marginBottom: isMobile ? 12 : 0 }}>
              <Input
                allowClear
                placeholder="Search cases by ID, type, or status..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                suffix={<SearchOutlined style={{ color: BRAND.violet }} />}
                style={{
                  width: isMobile ? "100%" : 300,
                }}
                size={isMobile ? "large" : "middle"}
              />
              <Segmented
                options={["All", "Open", "Closed"]}
                value={filter}
                onChange={setFilter}
                block={isMobile}
                size={isMobile ? "large" : "middle"}
              />
              <Segmented
                options={[
                  { label: "Newest", value: "Newest", icon: <SortDescendingOutlined /> },
                  { label: "Oldest", value: "Oldest", icon: <SortAscendingOutlined /> },
                  { label: "Status", value: "Status", icon: <InfoCircleOutlined /> },
                ]}
                value={sort}
                onChange={setSort}
                block={isMobile}
                size={isMobile ? "large" : "middle"}
              />
            </div>
            
            <div className={isMobile ? "actions-row" : "toolbar-col"} style={{ marginTop: isMobile ? 12 : 0, justifyContent: "flex-end" }}>
              <Tooltip title="Refresh">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={load} 
                  size={isMobile ? "large" : "middle"}
                  style={{ borderRadius: 10 }}
                />
              </Tooltip>
              <Tooltip title="Export CSV (filtered)">
                <Button 
                  icon={<ExportOutlined />} 
                  onClick={exportCsv} 
                  size={isMobile ? "large" : "middle"}
                  style={{ borderRadius: 10 }}
                />
              </Tooltip>
            </div>
          </div>

          {/* List */}
          <Card 
            bordered 
            style={{ 
              borderRadius: 20, 
              borderColor: "rgba(122,90,248,0.12)",
              background: BRAND.cardBg,
              boxShadow: "0 8px 24px rgba(122,90,248,0.12), 0 2px 8px rgba(233,30,99,0.08)",
            }} 
            bodyStyle={{ padding: 0 }}
          >
            {loading ? (
              <div style={{ padding: isMobile ? 12 : 16 }}><Skeleton active /></div>
            ) : filtered.length ? (
              <List
                dataSource={filtered}
                pagination={{
                  pageSize,
                  showSizeChanger: false,
                  size: isMobile ? "small" : "default",
                }}
                renderItem={(r) => {
                  const when = r.dateReported ? new Date(r.dateReported).toLocaleString() : "—";
                  return (
                    <List.Item
                      className="list-item"
                      style={{
                        paddingInline: isMobile ? 16 : 24,
                        paddingBlock: isMobile ? 14 : 18,
                        cursor: "pointer",
                      }}
                      onClick={() => setDrawer({ open: true, item: r })}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
                          <Space size={8} wrap>
                            <Text strong style={{ fontSize: isMobile ? 15 : 16, color: BRAND.violet }}>
                              {r.reportID || "—"}
                            </Text>
                            <Tooltip title="Copy Report ID">
                              <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={(e) => { e.stopPropagation(); copy(r.reportID || ""); }}
                                style={{ color: BRAND.violet }}
                              />
                            </Tooltip>
                          </Space>
                          <div style={{ flexShrink: 0 }}>{statusTag(r.status)}</div>
                        </div>
                        <Space size={8} wrap style={{ fontSize: isMobile ? 13 : 14 }}>
                          <Text type="secondary">
                            <Text strong style={{ color: "#555" }}>{r.incidentType || "Incident"}</Text>
                          </Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{when}</Text>
                        </Space>
                      </div>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description={error || "No cases match your filters"} style={{ margin: "24px 0" }} />
            )}
          </Card>

          {/* Drawer: Case details (fullscreen on mobile) */}
          <Drawer
            title={
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                padding: '8px 0'
              }}>
                <div style={{
                  width: 4,
                  height: 32,
                  background: `linear-gradient(180deg, ${BRAND.violet}, ${BRAND.pink})`,
                  borderRadius: 2
                }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.violet }}>
                    Case Details
                  </div>
                  <div style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>
                    Complete case information
                  </div>
                </div>
              </div>
            }
            width={isMobile ? "100%" : 580}
            open={drawer.open}
            onClose={() => setDrawer({ open: false, item: null })}
            destroyOnClose
            styles={{
              body: { 
                padding: isMobile ? 16 : 24,
                background: '#fafafa'
              },
              header: { 
                padding: isMobile ? "12px 16px" : "20px 24px",
                borderBottom: '2px solid rgba(122,90,248,0.1)',
                background: 'white'
              },
            }}
          >
            {drawer.item ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Report ID Card */}
                <Card 
                  size="small"
                  style={{ 
                    borderRadius: 12,
                    border: '1px solid rgba(122,90,248,0.15)',
                    background: 'linear-gradient(135deg, rgba(122,90,248,0.05), rgba(233,30,99,0.05))',
                    boxShadow: '0 2px 8px rgba(122,90,248,0.08)'
                  }}
                  bodyStyle={{ padding: isMobile ? 12 : 16 }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      REPORT ID
                    </Text>
                    <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text 
                        strong 
                        style={{ 
                          fontSize: 16, 
                          fontFamily: 'monospace',
                          color: BRAND.violet
                        }}
                      >
                        {drawer.item.reportID || "—"}
                      </Text>
                      <Tooltip title="Copy Report ID">
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copy(drawer.item.reportID || "")}
                          style={{ 
                            borderRadius: 8,
                            borderColor: BRAND.violet,
                            color: BRAND.violet
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </Space>
                </Card>

                {/* Status and Type */}
                <Card 
                  size="small"
                  style={{ 
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  bodyStyle={{ padding: isMobile ? 12 : 16 }}
                >
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                        STATUS
                      </Text>
                      {statusTag(drawer.item.status)}
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                        INCIDENT TYPE
                      </Text>
                      <Text strong style={{ fontSize: 14 }}>
                        {drawer.item.incidentType || "—"}
                      </Text>
                    </div>
                  </Space>
                </Card>

                {/* Details Grid */}
                <Card 
                  size="small"
                  title={
                    <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.violet }}>
                      📋 Case Information
                    </span>
                  }
                  style={{ 
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  bodyStyle={{ padding: isMobile ? 12 : 16 }}
                >
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                        📅 DATE REPORTED
                      </Text>
                      <Text strong style={{ fontSize: 14 }}>
                        {drawer.item.dateReported ? new Date(drawer.item.dateReported).toLocaleString() : "—"}
                      </Text>
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                        📍 LOCATION
                      </Text>
                      <Text strong style={{ fontSize: 14 }}>
                        {drawer.item.location || "—"}
                      </Text>
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                        👤 PERPETRATOR
                      </Text>
                      <Text strong style={{ fontSize: 14 }}>
                        {drawer.item.perpetrator || "—"}
                      </Text>
                    </div>
                  </Space>
                </Card>

                {/* Description */}
                <Card 
                  size="small"
                  title={
                    <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.violet }}>
                      📝 Incident Description
                    </span>
                  }
                  style={{ 
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  bodyStyle={{ 
                    padding: isMobile ? 12 : 16,
                    background: '#fafafa',
                    minHeight: 120
                  }}
                >
                  <div style={{ 
                    whiteSpace: "pre-wrap", 
                    fontSize: 14, 
                    lineHeight: 1.8,
                    color: '#333'
                  }}>
                    {drawer.item.description || "—"}
                  </div>
                </Card>
              </div>
            ) : (
              <Skeleton active />
            )}
          </Drawer>
        </div>
      </Content>
    </Layout>
  );
}
