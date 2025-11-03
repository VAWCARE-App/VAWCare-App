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
      // Fetch victim profile (to identify the current victim)
      const profileResp = await api.get('/api/victims/profile').catch(() => null);
      const victim = profileResp?.data?.data || null;

      // Fetch victim reports
      const reportsResp = await api.get('/api/victims/reports').catch(() => ({ data: { data: [] } }));
      const reportsRaw = Array.isArray(reportsResp?.data?.data) ? reportsResp.data.data : [];

      // Fetch all cases and then filter those that belong to this victim
      const casesResp = await api.get('/api/cases').catch(() => ({ data: { data: [] } }));
      const casesRaw = Array.isArray(casesResp?.data?.data) ? casesResp.data.data : [];

      // Build set of victim identifiers we can match against case.victimID
      const victimIds = new Set();
      if (victim) {
        if (victim.id) victimIds.add(String(victim.id));
        if (victim._id) victimIds.add(String(victim._id));
        if (victim.victimID) victimIds.add(String(victim.victimID));
      }

      const mappedReports = (reportsRaw || []).map((r) => ({
        key: r.reportID || r._id || Math.random().toString(36).slice(2),
        reportID: r.reportID || r._id,
        incidentType: r.incidentType,
        description: r.description,
        status: r.status,
        dateReported: r.dateReported || r.createdAt,
        raw: r,
        _source: 'report',
      }));

      const mappedCases = (casesRaw || [])
        .filter((c) => {
          if (!victimIds.size) return false;
          const vid = c.victimID || c.victimId || c.victim || null;
          if (!vid) return false;
          return victimIds.has(String(vid));
        })
        .map((c) => ({
          key: c.caseID || c._id || Math.random().toString(36).slice(2),
          reportID: c.reportID || null,
          caseID: c.caseID,
          incidentType: c.incidentType,
          description: c.description,
          status: c.status,
          dateReported: c.dateReported || c.createdAt,
          raw: c,
          _source: 'case',
        }));

      const combined = [...mappedReports, ...mappedCases].sort((a, b) => {
        const ta = a.dateReported ? new Date(a.dateReported).getTime() : 0;
        const tb = b.dateReported ? new Date(b.dateReported).getTime() : 0;
        return tb - ta;
      });

      setCases(combined);
    } catch (e) {
      setError("Unable to load cases.");
      message.error("Unable to load cases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const openish = (s) => {
      if (!s) return false;
      const ss = String(s).toLowerCase();
      return ss.includes('open') || ss.includes('investigat') || ss.includes('under investigation') || ss.includes('pending') || ss.includes('in progress');
    };
    const closedish = (s) => {
      if (!s) return false;
      const ss = String(s).toLowerCase();
      return ss.includes('closed') || ss.includes('resolved') || ss.includes('completed') || ss.includes('done') || ss.includes('dismiss');
    };
    const all = cases.length;
    const open = cases.filter((c) => openish(c.status)).length;
    const closed = cases.filter((c) => closedish(c.status)).length;
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
    const openish = (s) => {
      if (!s) return false;
      const ss = String(s).toLowerCase();
      return ss.includes('open') || ss.includes('investigat') || ss.includes('under investigation') || ss.includes('pending') || ss.includes('in progress');
    };
    const closedish = (s) => {
      if (!s) return false;
      const ss = String(s).toLowerCase();
      return ss.includes('closed') || ss.includes('resolved') || ss.includes('completed') || ss.includes('done') || ss.includes('dismiss');
    };
    const byFilter = (c) =>
      filter === "All" ? true :
      filter === "Open" ? openish(c.status) :
      filter === "Closed" ? closedish(c.status) :
      true;

    const byQ = (c) => {
      if (!qDebounced) return true;
      const text = `${c.reportID || ''} ${c.caseID || ''} ${c._source || ''} ${c.incidentType || ''} ${c.status || ''} ${c.description || ""}`.toLowerCase();
      return text.includes(qDebounced);
    };

    const arr = cases.filter((c) => byFilter(c) && byQ(c));
    const getDate = (c) => (c.dateReported ? new Date(c.dateReported).getTime() : 0);

    const list = [...arr];
    list.sort((a, b) => {
      const src = (it) => (it && it._source === 'case' ? 0 : 1);
      const sa = src(a);
      const sb = src(b);
      if (sa !== sb) return sa - sb; 

      if (sort === "Newest") return getDate(b) - getDate(a);
      if (sort === "Oldest") return getDate(a) - getDate(b);
      if (sort === "Status") return (a.status || "").localeCompare(b.status || "");
      return 0;
    });

    return list;
  }, [cases, filter, qDebounced, sort]);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); message.success("Copied"); }
    catch { message.error("Copy failed"); }
  };

  const exportCsv = () => {
    const rows = [
      ["Source", "Report ID", "Case ID", "Incident Type", "Status", "Date Reported"],
      ...filtered.map((c) => [
        c._source || "",
        c.reportID || "",
        c.caseID || "",
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
              background: linear-gradient(180deg, #fff1f7 0%, #ffe5f1 40%, #f4eaff 100%);
              border: 1px solid rgba(122,90,248,0.12);
              border-radius: 20px;
              padding: ${isMobile ? "20px" : "28px"};
              margin-bottom: 20px;
              box-shadow: 0 20px 40px rgba(122,90,248,0.25);
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

          {/* Header + Counts */}
          <div className="toolbar">
            <div className="toolbar-col" style={{ gap: 6 }}>
              <Title level={screens.md ? 4 : 5} style={{ margin: 0, color: BRAND.violet }}>
                My Cases
              </Title>
              <Text type="secondary">Track status and updates</Text>
            </div>
            <div className="counts">
              <span className="count-pill">All <Tag style={{ marginInlineStart: 4 }}>{counts.all}</Tag></span>
              <span className="count-pill">Open <Tag color="orange" style={{ marginInlineStart: 4 }}>{counts.open}</Tag></span>
              <span className="count-pill">Closed <Tag color="green" style={{ marginInlineStart: 4 }}>{counts.closed}</Tag></span>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="filters-card">
            <div className={isMobile ? "filters-stack" : "toolbar-col"} style={{ marginBottom: isMobile ? 12 : 0 }}>
              <Input
                allowClear
                placeholder="Search cases…"
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
                  const idDisplay = r._source === 'case' ? (r.caseID || r._id || r.reportID || "—") : (r.reportID || r._id || r.caseID || "—");
                  const sourceTag = r._source === 'case' ? <Tag color="blue">Case</Tag> : <Tag color="purple">Report</Tag>;
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
                            <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>{r.reportID || "—"}</Text>
                            <Tooltip title="Copy Report ID">
                              <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={(e) => { e.stopPropagation(); copy(r.reportID || ""); }}
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
              <Empty description={error || "No cases or reports match your filters"} style={{ margin: "24px 0" }} />
            )}
          </Card>

          {/* Drawer: Case details (fullscreen on mobile) */}
          <Drawer
            title="Case Details"
            width={isMobile ? "100%" : 520}
            open={drawer.open}
            onClose={() => setDrawer({ open: false, item: null })}
            destroyOnClose
            styles={{
              body: { padding: isMobile ? 12 : 24 },
              header: { padding: isMobile ? "8px 12px" : "16px 24px" },
            }}
          >
            {drawer.item ? (
              <>
                <Descriptions
                  column={1}
                  size={isMobile ? "small" : "middle"}
                  labelStyle={{ fontWeight: 600 }}
                  colon={false}
                >
                  <Descriptions.Item label={drawer.item._source === 'case' ? 'Case ID' : 'Report ID'}>
                    <Space wrap>
                      {drawer.item._source === 'case' ? (drawer.item.caseID || drawer.item._id || drawer.item.reportID) : (drawer.item.reportID || drawer.item._id || drawer.item.caseID) || "—"}
                      <Tooltip title={drawer.item._source === 'case' ? (drawer.item.caseID ? "Copy Case ID" : drawer.item._id ? "Copy ID" : "Copy ID") : (drawer.item.reportID ? "Copy Report ID" : drawer.item._id ? "Copy ID" : "Copy ID")}>
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copy(drawer.item._source === 'case' ? (drawer.item.caseID || drawer.item._id || drawer.item.reportID || "") : (drawer.item.reportID || drawer.item._id || drawer.item.caseID || ""))}
                        />
                      </Tooltip>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">{statusTag(drawer.item.status)}</Descriptions.Item>
                  <Descriptions.Item label="Incident Type">{drawer.item.incidentType || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Date Reported">
                    {drawer.item.dateReported ? new Date(drawer.item.dateReported).toLocaleString() : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Location">{drawer.item.location || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Perpetrator">{drawer.item.perpetrator || "—"}</Descriptions.Item>
                </Descriptions>
                <Divider />
                <Typography>
                  <Text strong>Description</Text>
                  <Card size="small" style={{ marginTop: 8 }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{drawer.item.description || "—"}</div>
                  </Card>
                </Typography>
              </>
            ) : (
              <Skeleton active />
            )}
          </Drawer>
        </div>
      </Content>
    </Layout>
  );
}
