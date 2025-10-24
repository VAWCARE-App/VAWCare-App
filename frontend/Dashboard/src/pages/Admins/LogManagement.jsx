// src/pages/admin/LogManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Card,
  Space,
  Select,
  DatePicker,
  Input,
  Button,
  Typography,
  Layout,
  Row,
  Col,
  Tag,
  Tooltip,
  Grid,
  Empty,
} from "antd";
import {
  ReloadOutlined,
  CopyOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { api, isAuthed, getUserType } from "../../lib/api";
import { message } from "antd";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Header, Content } = Layout;

const BRAND = {
  pink: "#e91e63",
  violet: "#7A5AF8",
  blue: "#1890ff",
  soft: "rgba(122,90,248,0.16)",
  pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
  rowHover: "#F1EEFF",
};

export default function LogManagement() {
  const screens = Grid.useBreakpoint();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // server-side paging (adjust if your API returns `total`)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    action: "",
    actorType: "",
    actorId: "",
    ipAddress: "",
    dateRange: null, // [start, end]
    q: "", // free text over details/action
  });

  const [messageApi, contextHolder] = message.useMessage();

  const fetchLogs = async () => {
    const userType = await getUserType();
    if (!isAuthed() || userType !== "admin") return;
    setLoading(true);
    try {
      const params = { page, limit };

      if (filters.action) params.action = filters.action;
      if (filters.actorType) params.actorType = filters.actorType;
      if (filters.actorId) params.actorId = filters.actorId;
      if (filters.ipAddress) params.ipAddress = filters.ipAddress;
      if (filters.q) params.q = filters.q;

      // Date range -> whole-day bounds
      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startVal, endVal] = filters.dateRange;
        const startISO =
          typeof startVal?.startOf === "function"
            ? startVal.startOf("day").toISOString()
            : new Date(
                new Date(startVal instanceof Date ? startVal : new Date(startVal)).setHours(0, 0, 0, 0)
              ).toISOString();
        const endISO =
          typeof endVal?.endOf === "function"
            ? endVal.endOf("day").toISOString()
            : new Date(
                new Date(endVal instanceof Date ? endVal : new Date(endVal)).setHours(23, 59, 59, 999)
              ).toISOString();
        params.startDate = startISO;
        params.endDate = endISO;
      }

      const res = await api.get("/api/logs", { params });

      const payload = res?.data;
      console.log("Fetched logs:", payload);
      const data = Array.isArray(payload) ? payload : payload?.data || [];
      const metaTotal = Array.isArray(payload) ? data.length : payload?.total ?? data.length;

      setLogs(data);
      setTotal(metaTotal);
    } catch (e) {
      console.error("Failed to load logs", e?.response?.data || e?.message);
      messageApi.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  // initial + on page/limit change
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Debounced fetch on filter changes
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.action, filters.actorType, filters.actorId, filters.ipAddress, filters.q, filters.dateRange]);

  // ------- UI helpers -------
  const actionColor = (action = "") => {
    const a = String(action).toLowerCase();
    if (a.includes("login") || a.includes("signin")) return "geekblue";
    if (a.includes("logout")) return "default";
    if (a.includes("create") || a.includes("add")) return "green";
    if (a.includes("update") || a.includes("edit")) return "blue";
    if (a.includes("delete") || a.includes("remove")) return "red";
    if (a.includes("export") || a.includes("download")) return "purple";
    if (a.includes("assign") || a.includes("status")) return "gold";
    return "processing";
  };

  const actorBadge = (r) => {
    const { victimID, adminID, officialID } = r || {};
    if (adminID?.adminID) return <Tag color="magenta">Admin • {adminID.adminID}</Tag>;
    if (officialID?.officialID) return <Tag color="geekblue">Official • {officialID.officialID}</Tag>;
    if (victimID?.victimID) return <Tag color="green">Victim • {victimID.victimID}</Tag>;
    return <Tag>System</Tag>;
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      messageApi.success("Copied to clipboard");
    } catch {
      messageApi.warning("Copy failed");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Action",
        dataIndex: "action",
        key: "action",
        render: (v) => (
          <Tag color={actionColor(v)} style={{ borderRadius: 999, paddingInline: 10 }}>
            {v || "—"}
          </Tag>
        ),
        width: 160,
        ellipsis: true,
      },
      {
        title: "Actor",
        key: "actor",
        render: (_, r) => actorBadge(r),
        width: 220,
      },
      {
        title: "Details",
        dataIndex: "details",
        key: "details",
        ellipsis: { showTitle: false },
        render: (text) => (
          <Tooltip title={typeof text === "string" ? text : JSON.stringify(text, null, 2)}>
            <span style={{ color: "#334155" }}>
              {typeof text === "string" ? text : text ? JSON.stringify(text) : "—"}
            </span>
          </Tooltip>
        ),
      },
      {
        title: "IP",
        dataIndex: "ipAddress",
        key: "ipAddress",
        width: 150,
        render: (ip) => (
          <Space size={6}>
            <Text code>{ip || "—"}</Text>
            {ip ? (
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => copy(ip)}
                style={{ color: BRAND.violet }}
              />
            ) : null}
          </Space>
        ),
      },
      {
        title: "Timestamp",
        dataIndex: "timestamp",
        key: "timestamp",
        width: 210,
        render: (t) => (
          <Space direction="vertical" size={0}>
            <Text>{t ? new Date(t).toLocaleString() : "—"}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t ? new Date(t).toISOString() : ""}
            </Text>
          </Space>
        ),
        sorter: (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0),
        defaultSortOrder: "descend",
      },
      {
        title: "Log ID",
        dataIndex: "logID",
        key: "logID",
        width: 160,
        render: (id) => <Text type="secondary">{id || "—"}</Text>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Export CSV for current table view
  const exportCsv = () => {
    const rows = logs.map((r) => ({
      LogID: r.logID || r._id || r.id || "",
      Action: r.action || "",
      Actor:
        (r.adminID && r.adminID.adminID) ||
        (r.officialID && r.officialID.officialID) ||
        (r.victimID && r.victimID.victimID) ||
        "System",
      IP: r.ipAddress || "",
      TimestampLocal: r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
      TimestampISO: r.timestamp ? new Date(r.timestamp).toISOString() : "",
      Details:
        typeof r.details === "string"
          ? r.details
          : r.details
          ? JSON.stringify(r.details)
          : "",
    }));

    const header =
      "LogID,Action,Actor,IP,TimestampLocal,TimestampISO,Details";
    const body = rows
      .map((row) =>
        Object.values(row)
          .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "hidden",
      }}
    >
      {contextHolder}

      {/* ReportManagement-style sticky header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: BRAND.pageBg,
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
            Log Management
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Audit trail of actions across the system. Filter, review, and export logs.
          </Text>
        </Space>

        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            style={{ borderColor: BRAND.violet, color: BRAND.violet }}
          >
            Refresh
          </Button>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>
            Export
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: screens.md ? 20 : 12 }}>
        {/* Filters */}
        <Card
          className="hover-lift"
          style={{
            borderRadius: 14,
            border: `1px solid ${BRAND.soft}`,
            background:
              "linear-gradient(145deg, rgba(255,255,255,.96), rgba(255,255,255,.90))",
            marginBottom: 12,
          }}
          bodyStyle={{ padding: 12 }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={6}>
              <Input
                allowClear
                placeholder="Search action/details…"
                prefix={<SearchOutlined />}
                value={filters.q}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, q: e.target.value }))
                }
              />
            </Col>

            <Col xs={12} md={4}>
              <Select
                allowClear
                placeholder="Actor Type"
                value={filters.actorType}
                onChange={(v) => setFilters((f) => ({ ...f, actorType: v }))}
                style={{ width: "100%" }}
                options={[
                  { value: "victim", label: "Victim" },
                  { value: "official", label: "Official" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </Col>

            <Col xs={12} md={5}>
              <Input
                allowClear
                placeholder={
                  filters.actorType === "official"
                    ? "Official ID (e.g. 0FB000)"
                    : filters.actorType === "admin"
                    ? "Admin ID (e.g. ADM000)"
                    : "Victim ID (e.g. VIC000)"
                }
                value={filters.actorId}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, actorId: e.target.value }))
                }
              />
            </Col>

            <Col xs={12} md={4}>
              <Input
                allowClear
                placeholder="IP Address"
                value={filters.ipAddress}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, ipAddress: e.target.value }))
                }
              />
            </Col>

            <Col xs={12} md={5}>
              <RangePicker
                style={{ width: "100%" }}
                onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))}
                allowEmpty={[true, true]}
              />
            </Col>

            <Col xs={24} md={24}>
              <Space size={8} wrap>
                <Select
                  allowClear
                  style={{ minWidth: 180 }}
                  placeholder={
                    <span>
                      <FilterOutlined /> Filter Action
                    </span>
                  }
                  value={filters.action}
                  onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
                  options={[
                    { value: "Login", label: "Login" },
                    { value: "Logout", label: "Logout" },
                    { value: "Create", label: "Create" },
                    { value: "Update", label: "Update" },
                    { value: "Delete", label: "Delete" },
                    { value: "Assign", label: "Assign" },
                    { value: "Status Change", label: "Status Change" },
                    { value: "Export", label: "Export" },
                  ]}
                />
                <Button
                  onClick={() => {
                    setFilters({
                      action: "",
                      actorType: "",
                      actorId: "",
                      ipAddress: "",
                      dateRange: null,
                      q: "",
                    });
                  }}
                >
                  Clear Filters
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Card
          className="hover-lift"
          style={{
            borderRadius: 14,
            border: `1px solid ${BRAND.soft}`,
            background:
              "linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.94))",
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={logs}
            columns={columns}
            rowKey={(r) => r._id || r.id || r.logID}
            loading={loading}
            size="middle"
            bordered={false}
            sticky
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No logs found"
                />
              ),
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: 12 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    Full Details
                  </Text>
                  <pre
                    style={{
                      margin: 0,
                      background: "rgba(0,0,0,.03)",
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 12,
                      maxHeight: 260,
                      overflow: "auto",
                      fontSize: 12.5,
                    }}
                  >
                    {JSON.stringify(record?.details ?? record, null, 2)}
                  </pre>
                </div>
              ),
              rowExpandable: (record) =>
                !!record?.details && typeof record.details === "object",
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: total || undefined,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (t, range) =>
                `${range[0]}–${range[1]} of ${t || logs.length}`,
              onChange: (p, ps) => {
                setPage(p);
                setLimit(ps);
              },
              style: { padding: 12 },
            }}
            onChange={(pagination, _filters, sorter) => {
              if (sorter?.field === "timestamp" && sorter?.order) {
                const sorted = [...logs].sort((a, b) => {
                  const av = new Date(a.timestamp || 0).getTime();
                  const bv = new Date(b.timestamp || 0).getTime();
                  return sorter.order === "ascend" ? av - bv : bv - av;
                });
                setLogs(sorted);
              }
            }}
          />
        </Card>
      </Content>

      {/* Styles */}
      <style>{`
        .hover-lift { transition: transform .18s ease, box-shadow .18s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(16,24,40,.12); }

        .ant-table-thead > tr > th { background: #fff !important; }
        .ant-table .ant-table-tbody > tr:hover > td {
          background: ${BRAND.rowHover} !important;
        }
        .ant-table .ant-table-tbody > tr > td {
          position: relative;
          z-index: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ant-table .ant-table-cell-fix-left {
          position: sticky;
          left: 0;
          z-index: 10 !important;
          background: #ffffff !important;
        }
        .ant-table .ant-table-cell-fix-left-last {
          box-shadow: 6px 0 6px -6px rgba(16,24,40,0.10);
        }
      `}</style>
    </Layout>
  );
}
