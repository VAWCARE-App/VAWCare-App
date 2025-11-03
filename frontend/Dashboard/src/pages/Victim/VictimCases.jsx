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
    soft: "rgba(122,90,248,0.18)",
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
    <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#faf7ff,#fff)" }}>
      <Content style={{ padding: isMobile ? 12 : 16, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1100 }}>
          <style>{`
            .toolbar {
              width:100%;
              display:flex; gap:12px; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap;
            }
            .toolbar-col { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
            .counts { display:flex; gap:8px; flex-wrap:wrap; }
            .count-pill {
              background: linear-gradient(180deg, ${BRAND.soft}, rgba(122,90,248,0.10));
              color: #3b2e7e;
              border: 1px solid ${BRAND.soft};
              border-radius: 999px;
              padding: 6px 12px;
              font-weight: 600;
              display:inline-flex; align-items:center; gap:8px;
            }
            .list-item { transition: background 0.2s ease, transform 0.12s ease; }
            .list-item:hover { background: #fff; transform: translateY(-1px); }
            @media (max-width: 767px) {
              .toolbar { flex-direction: column; align-items: stretch; gap:10px; }
              .toolbar-col { width:100%; justify-content: space-between; }
              .filters-stack { display:grid; grid-template-columns: 1fr; gap:8px; }
              .actions-row { display:flex; gap:8px; justify-content: flex-end; }
            }
          `}</style>

          {/* Header + Counts */}
          <div className="toolbar">
            <div className="toolbar-col" style={{ gap: 6 }}>
              <Title level={screens.md ? 4 : 5} style={{ margin: 0, color: BRAND.violet }}>
                My Cases & Reports
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
          <div className="toolbar">
            <div className={isMobile ? "filters-stack" : "toolbar-col"}>
              <Input
                allowClear
                placeholder="Search cases/reports…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                suffix={<SearchOutlined />}
                style={{
                  borderRadius: 999,
                  width: isMobile ? "100%" : 280,
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
            <div className={isMobile ? "actions-row" : "toolbar-col"}>
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined />} onClick={load} size={isMobile ? "large" : "middle"} />
              </Tooltip>
              <Tooltip title="Export CSV (filtered)">
                <Button icon={<ExportOutlined />} onClick={exportCsv} size={isMobile ? "large" : "middle"} />
              </Tooltip>
            </div>
          </div>

          {/* List */}
          <Card bordered style={{ borderRadius: 16, borderColor: BRAND.soft }} bodyStyle={{ padding: 0 }}>
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
                        paddingInline: isMobile ? 12 : 16,
                        paddingBlock: isMobile ? 10 : 14,
                        cursor: "pointer",
                      }}
                      onClick={() => setDrawer({ open: true, item: r })}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <Space size={8} wrap>
                            <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>{idDisplay}</Text>
                            {sourceTag}
                            <Tooltip title={r._source === 'case' ? (r.caseID ? "Copy Case ID" : r._id ? "Copy ID" : "Copy ID") : (r.reportID ? "Copy Report ID" : r._id ? "Copy ID" : "Copy ID")}>
                              <Button
                                size="small"
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={(e) => { e.stopPropagation(); copy(r._source === 'case' ? (r.caseID || r._id || r.reportID || "") : (r.reportID || r._id || r.caseID || "")); }}
                              />
                            </Tooltip>
                          </Space>
                          <div style={{ flexShrink: 0 }}>{statusTag(r.status)}</div>
                        </div>
                        <Text type="secondary" style={{ display: "block", marginTop: 2 }}>
                          {(r.incidentType || "Incident")} • {when}
                        </Text>
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
