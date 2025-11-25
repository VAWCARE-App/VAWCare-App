// src/pages/admin/LogManagement.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Modal,
  Descriptions,
} from "antd";
import {
  ReloadOutlined,
  CopyOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  MenuOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UserOutlined,
  GlobalOutlined,
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
  const isMdUp = !!screens.md;
  const isXs = !!screens.xs && !screens.sm;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal for showing log details
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

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

      // Date range -> whole-day bounds in UTC
      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startVal, endVal] = filters.dateRange;
        let startDate, endDate;
        
        // Handle Dayjs objects
        if (startVal && typeof startVal.startOf === "function" && typeof startVal.toISOString === "function") {
          // Dayjs approach: get start of day and convert to ISO string
          startDate = startVal.hour(0).minute(0).second(0).millisecond(0).toISOString();
        } else if (startVal instanceof Date) {
          const sd = new Date(startVal);
          sd.setHours(0, 0, 0, 0);
          startDate = sd.toISOString();
        } else if (startVal) {
          const sd = new Date(startVal);
          sd.setHours(0, 0, 0, 0);
          startDate = sd.toISOString();
        }
        
        // Handle Dayjs objects
        if (endVal && typeof endVal.endOf === "function" && typeof endVal.toISOString === "function") {
          // Dayjs approach: get end of day and convert to ISO string
          endDate = endVal.hour(23).minute(59).second(59).millisecond(999).toISOString();
        } else if (endVal instanceof Date) {
          const ed = new Date(endVal);
          ed.setHours(23, 59, 59, 999);
          endDate = ed.toISOString();
        } else if (endVal) {
          const ed = new Date(endVal);
          ed.setHours(23, 59, 59, 999);
          endDate = ed.toISOString();
        }
        
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await api.get("/api/logs", { params });

      const payload = res?.data;
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

  // Reset to page 1 when limit changes
  const prevLimitRef = useRef(limit);
  useEffect(() => {
    if (prevLimitRef.current !== limit) {
      setPage(1);
      prevLimitRef.current = limit;
    }
  }, [limit]);

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
    // Authentication
    if (a.includes("login") || a.includes("signin")) return "geekblue";
    if (a.includes("logout")) return "default";
    // Creation and additions
    if (a.includes("create") || a.includes("add") || a.includes("issued")) return "green";
    // Updates and edits
    if (a.includes("update") || a.includes("edit") || a.includes("changed")) return "blue";
    // Deletions and removals
    if (a.includes("delete") || a.includes("remove") || a.includes("deactivated")) return "red";
    // Export and downloads
    if (a.includes("export") || a.includes("download")) return "purple";
    // Status and assignments
    if (a.includes("assign") || a.includes("status")) return "gold";
    // Emergency and alerts
    if (a.includes("emergency") || a.includes("sos") || a.includes("alert")) return "magenta";
    // Reports and cases
    if (a.includes("report") || a.includes("case")) return "orange";
    // Notifications and communications
    if (a.includes("notification") || a.includes("chatbot")) return "cyan";
    // BPO operations
    if (a.includes("bpo")) return "lime";
    // Page views and general actions
    if (a.includes("page_view") || a.includes("view")) return "default";
    // Default
    return "processing";
  };

  const actorBadge = (r) => {
    const { victimID, adminID, officialID } = r || {};
    if (adminID) return <Tag color="magenta">Admin • {adminID.adminID}</Tag>;
    if (officialID) return <Tag color="geekblue">Official • {officialID.officialID}</Tag>;
    if (victimID) return <Tag color="green">Victim • {victimID.victimID}</Tag>;
    return <Tag>System</Tag>;
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
    } catch {
      messageApi.warning("Copy failed");
      return;
    }
    messageApi.success("Copied to clipboard");
  };

  // Extract key details from the full details object/string
  const extractKeyDetails = (details) => {
    if (!details) return "—";
    
    try {
      // If details is a string, try to parse it as JSON
      let obj = typeof details === "string" ? JSON.parse(details) : details;
      
      // Build a summary with key fields
      const keyFields = [];
      
      // Add action-specific key info
      if (obj.victimName) keyFields.push(`Victim: ${obj.victimName}`);
      if (obj.victimID) keyFields.push(`VictimID: ${obj.victimID}`);
      if (obj.caseID) keyFields.push(`CaseID: ${obj.caseID}`);
      if (obj.caseName) keyFields.push(`Case: ${obj.caseName}`);
      if (obj.officialName) keyFields.push(`Official: ${obj.officialName}`);
      if (obj.title) keyFields.push(`Title: ${obj.title}`);
      if (obj.status) keyFields.push(`Status: ${obj.status}`);
      
      // If we found key fields, return them; otherwise return first 100 chars
      if (keyFields.length > 0) {
        return keyFields.join(" | ");
      }
      
      // Fallback: if it's the "Opened page" format, just return as-is
      if (typeof details === "string") {
        return details.length > 100 ? details.slice(0, 100) + "..." : details;
      }
      
      return JSON.stringify(obj).slice(0, 100) + "...";
    } catch (e) {
      // If parsing fails, return first 100 chars
      const str = String(details);
      return str.length > 100 ? str.slice(0, 100) + "..." : str;
    }
  };

  // Format details with line breaks at commas for better readability
  const formatDetailsWithLineBreaks = (details) => {
    if (!details) return "—";
    
    try {
      const str = typeof details === "string" ? details : JSON.stringify(details);
      
      // Split by comma and join with newline, but preserve structure
      // This regex splits on ", " boundaries
      const formatted = str.replace(/,\s+/g, ',\n');
      return formatted;
    } catch (e) {
      return String(details);
    }
  };

  const handleRowClick = (record) => {
    setSelectedLog(record);
    setDetailModalOpen(true);
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
              {extractKeyDetails(text)}
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
    []
  );

  const columnsMobile = useMemo(() => {
    return [
      {
        title: "Action",
        dataIndex: "action",
        key: "action",
        render: (v) => (
          <Tag color={actionColor(v)} style={{ borderRadius: 999, paddingInline: 10 }}>
            {v || "—"}
          </Tag>
        ),
        width: 120,
        ellipsis: true,
      },
      {
        title: "Actor",
        key: "actor",
        render: (_, r) => actorBadge(r),
        width: 140,
      },
      {
        title: "Details",
        dataIndex: "details",
        key: "details",
        render: (text) => (
          <Tooltip title={typeof text === "string" ? text : JSON.stringify(text, null, 2)}>
            <span style={{ color: "#334155" }}>
              {extractKeyDetails(text)}
            </span>
          </Tooltip>
        ),
      },
      {
        title: "Time",
        dataIndex: "timestamp",
        key: "timestamp",
        width: 160,
        render: (t) => (
          <div>
            <div style={{ fontSize: 13 }}>{t ? new Date(t).toLocaleString() : "—"}</div>
            <div style={{ color: "#8b8b8b", fontSize: 11 }}>{t ? new Date(t).toISOString() : ""}</div>
          </div>
        ),
      },
    ];
  }, []);

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
      ActorBusinessId: r.actorBusinessId || "",
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

    const header = "LogID,Action,Actor,ActorBusinessId,IP,TimestampLocal,TimestampISO,Details";
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
        height: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {contextHolder}

      {/* Header with mobile sidebar toggle */}
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
          paddingInline: isXs ? 10 : screens.sm && !screens.md ? 12 : isMdUp ? 20 : 12,
          height: isXs ? 56 : isMdUp ? 72 : 64,
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
                width: 38,
                height: 38,
                minWidth: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.9)",
                border: `1px solid ${BRAND.softBorder}`,
                boxShadow: "0 4px 12px rgba(122,90,248,0.08)",
                padding: 0,
                fontSize: 18,
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
              Log Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Audit trail of actions across the system. Filter, review, and export logs.
              </Text>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            style={{ borderColor: BRAND.violet, color: BRAND.violet }}
          >
            {isMdUp ? "Refresh" : null}
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={exportCsv}
            type="primary"
            style={{ background: BRAND.violet, borderColor: BRAND.violet }}
          >
            {isMdUp ? "Export" : null}
          </Button>
        </div>
      </Header>

      <Content style={{ 
        width: "100%",
        minWidth: 0,
        overflow: "auto",
        boxSizing: "border-box",
        flex: 1,
      }}>
        <div style={{
          padding: isMdUp ? 20 : 12,
          width: "100%",
          minHeight: "100%",
        }}>
        {/* Filters */}
        <Card
          className="hover-lift"
          style={{
            borderRadius: 14,
            border: `1px solid ${BRAND.soft}`,
            background:
              "linear-gradient(145deg, rgba(255,255,255,.96), rgba(255,255,255,.90))",
            marginBottom: 12,
            padding: isXs ? "12px 8px" : "14px 16px",
          }}
          bodyStyle={{ padding: 0 }}
        >
          {/* First Row: Main Search and Actor Filters */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isXs 
              ? "1fr 1fr" 
              : screens.sm && !screens.md
              ? "1fr 1fr" 
              : isMdUp 
              ? "minmax(240px, 320px) 1fr 1fr" 
              : "1fr 1fr",
            gap: isXs ? 8 : 10,
            width: "100%",
            alignItems: "center",
            marginBottom: isXs ? 8 : 12,
          }}>
            <Input
              allowClear
              placeholder={isXs ? "Search..." : "Search action/details…"}
              prefix={<SearchOutlined />}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              size={isXs ? "middle" : "large"}
              style={{ width: "100%", gridColumn: isXs ? "span 2" : "auto" }}
            />

            <Select
              allowClear
              placeholder="Actor Type"
              value={filters.actorType}
              onChange={(v) => setFilters((f) => ({ ...f, actorType: v }))}
              style={{ width: "100%" }}
              size={isXs ? "middle" : "large"}
              options={[
                { value: "victim", label: "Victim" },
                { value: "official", label: "Official" },
                { value: "admin", label: "Admin" },
              ]}
            />

            <Input
              allowClear
              placeholder={
                filters.actorType === "official"
                  ? (isXs ? "Official ID" : "Official ID")
                  : filters.actorType === "admin"
                  ? (isXs ? "Admin ID" : "Admin ID")
                  : (isXs ? "Actor ID" : "Actor ID")
              }
              value={filters.actorId}
              onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
              size={isXs ? "middle" : "large"}
              style={{ width: "100%" }}
            />
          </div>

          {/* Second Row: IP, Date, Action, and Clear */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isXs 
              ? "1fr 1fr" 
              : screens.sm && !screens.md
              ? "1fr 1fr" 
              : isMdUp 
              ? "1fr 1fr 1fr auto" 
              : "1fr 1fr",
            gap: isXs ? 8 : 10,
            width: "100%",
            alignItems: "center",
          }}>
            <Input
              allowClear
              placeholder={isXs ? "IP" : "IP Address"}
              value={filters.ipAddress}
              onChange={(e) => setFilters((f) => ({ ...f, ipAddress: e.target.value }))}
              size={isXs ? "middle" : "large"}
              style={{ width: "100%" }}
            />

            <RangePicker
              style={{ width: "100%" }}
              onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))}
              allowEmpty={[true, true]}
              size={isXs ? "middle" : "large"}
              placeholder={isXs ? ["Start", "End"] : ["Start Date", "End Date"]}
            />

            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={isXs ? "Action" : "Filter Action"}
              suffixIcon={<FilterOutlined />}
              value={filters.action}
              onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
              size={isXs ? "middle" : "large"}
              options={[
                { value: "login", label: "Login" },
                { value: "logout", label: "Logout" },
                { value: "page_view", label: "Page View" },
                { value: "emergency_button", label: "Emergency Button" },
                { value: "report_submission", label: "Report Submission" },
                { value: "chatbot_interaction", label: "Chatbot Interaction" },
                { value: "bpo_issued", label: "BPO Issued" },
                { value: "bpo_saved", label: "BPO Saved" },
                { value: "bpo_edited", label: "BPO Edited" },
                { value: "bpo_deleted", label: "BPO Deleted" },
                { value: "view_bpo", label: "View BPO" },
                { value: "alert_created", label: "Alert Created" },
                { value: "alert_resolved", label: "Alert Resolved" },
                { value: "send_sos", label: "Send SOS" },
                { value: "sos_email_sent", label: "SOS Email Sent" },
                { value: "sos_email_failed", label: "SOS Email Failed" },
                { value: "notification_sent", label: "Notification Sent" },
                { value: "notification_failed", label: "Notification Failed" },
                { value: "profile_updated", label: "Profile Updated" },
                { value: "admin_profile_updated", label: "Admin Profile Updated" },
                { value: "official_profile_updated", label: "Official Profile Updated" },
                { value: "victim_profile_updated", label: "Victim Profile Updated" },
                { value: "settings_updated", label: "Settings Updated" },
                { value: "password_changed", label: "Password Changed" },
                { value: "account_created", label: "Account Created" },
                { value: "account_deactivated", label: "Account Deactivated" },
                { value: "create_official", label: "Create Official" },
                { value: "view_report", label: "View Report" },
                { value: "edit_report", label: "Edit Report" },
                { value: "delete_report", label: "Delete Report" },
                { value: "view_case", label: "View Case" },
                { value: "edit_case", label: "Edit Case" },
                { value: "delete_case", label: "Delete Case" },
                { value: "edit_user", label: "Edit User" },
                { value: "view_user", label: "View User" },
                { value: "delete_user", label: "Delete User" },
                { value: "emergency_contact_added", label: "Emergency Contact Added" },
                { value: "emergency_contact_updated", label: "Emergency Contact Updated" },
                { value: "emergency_contact_removed", label: "Emergency Contact Removed" },
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
              size={isXs ? "middle" : "large"}
              style={{ width: "100%" }}
            >
              Clear Filters
            </Button>
          </div>
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
            columns={isXs ? columnsMobile : columns}
            rowKey={(r) => r._id || r.id || r.logID}
            loading={loading}
            size={isXs ? "small" : "middle"}
            tableLayout={isXs ? "auto" : "fixed"}
            scroll={isXs ? { x: "max-content" } : undefined}
            bordered={false}
            sticky
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No logs found" />
              ),
            }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
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
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                    }}
                  >
                    {formatDetailsWithLineBreaks(record?.details ?? record)}
                  </pre>
                </div>
              ),
              rowExpandable: (record) => !!record?.details && typeof record.details === "object",
            }}
            pagination={{
              current: page,
              pageSize: limit,
              total: total || undefined,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (t, range) => `${range[0]}–${range[1]} of ${t || logs.length}`,
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

        {/* Log Details Modal */}
        <Modal
          title={
            <Space>
              <FileTextOutlined style={{ color: BRAND.violet }} />
              <span>Log Details</span>
            </Space>
          }
          open={detailModalOpen}
          onCancel={() => {
            setDetailModalOpen(false);
            setSelectedLog(null);
          }}
          footer={[
            <Button key="close" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>,
          ]}
          width={screens.lg ? 800 : screens.md ? 700 : '95vw'}
          centered
        >
          {selectedLog && (
            <div style={{ padding: '12px 0' }}>
              <Descriptions
                bordered
                size="small"
                column={1}
                labelStyle={{ width: 160, background: '#fafafa', fontWeight: 600 }}
                style={{ marginBottom: 16 }}
              >
                <Descriptions.Item label={<Space><FileTextOutlined /> Log ID</Space>}>
                  <Text code>{selectedLog.logID || selectedLog._id || selectedLog.id || '—'}</Text>
                </Descriptions.Item>
                
                <Descriptions.Item label={<Space><ClockCircleOutlined /> Timestamp</Space>}>
                  <Space direction="vertical" size={2}>
                    <Text>{selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : '—'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedLog.timestamp ? new Date(selectedLog.timestamp).toISOString() : ''}
                    </Text>
                  </Space>
                </Descriptions.Item>

                <Descriptions.Item label="Action">
                  <Tag color={actionColor(selectedLog.action)} style={{ borderRadius: 999, paddingInline: 10 }}>
                    {selectedLog.action || '—'}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label={<Space><UserOutlined /> Actor</Space>}>
                  {actorBadge(selectedLog)}
                </Descriptions.Item>

                <Descriptions.Item label={<Space><GlobalOutlined /> IP Address</Space>}>
                  <Space>
                    <Text code>{selectedLog.ipAddress || '—'}</Text>
                    {selectedLog.ipAddress && (
                      <Button
                        size="small"
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => copy(selectedLog.ipAddress)}
                        style={{ color: BRAND.violet }}
                      />
                    )}
                  </Space>
                </Descriptions.Item>

                {selectedLog.actorType && (
                  <Descriptions.Item label="Actor Type">
                    <Tag>{selectedLog.actorType}</Tag>
                  </Descriptions.Item>
                )}

                {selectedLog.targetResourceType && (
                  <Descriptions.Item label="Resource Type">
                    <Tag color="cyan">{selectedLog.targetResourceType}</Tag>
                  </Descriptions.Item>
                )}

                {selectedLog.targetResourceID && (
                  <Descriptions.Item label="Resource ID">
                    <Text code>{selectedLog.targetResourceID}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Full Details Section */}
              <Card 
                size="small" 
                title={<Text strong>Full Details</Text>}
                style={{ 
                  borderRadius: 8,
                  background: '#fafafa'
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    background: "rgba(0,0,0,.03)",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    padding: 12,
                    maxHeight: 300,
                    overflow: "auto",
                    fontSize: 12.5,
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}
                >
                  {formatDetailsWithLineBreaks(selectedLog.details ?? selectedLog)}
                </pre>
              </Card>
            </div>
          )}
        </Modal>
        </div>
      </Content>

      {/* Styles */}
      <style>{`
        /* Remove button outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        button:focus,
        button:active {
          outline: none !important;
          box-shadow: none !important;
        }

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
        @media (max-width: 576px) {
          .ant-table .ant-table-tbody > tr > td {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            word-break: break-word !important;
            padding: 8px 10px !important;
          }
          .ant-table .ant-table-thead > tr > th {
            white-space: nowrap !important;
            padding: 8px 10px !important;
            font-size: 13px;
          }
          /* allow the table to horizontally scroll when content is wide */
          .ant-table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </Layout>
  );
}
