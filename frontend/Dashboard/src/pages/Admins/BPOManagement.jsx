// src/pages/admin/BPOManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntApp,
  Card,
  Table,
  Typography,
  Tag,
  Layout,
  Button,
  Input,
  Select,
  Space,
  Popconfirm,
  Tooltip,
  Modal,
  Row,
  Col,
  Grid,
  Dropdown,
  Menu,
  Empty,
  Avatar,
  Segmented,
} from "antd";
import {
  ReloadOutlined,
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  SettingOutlined,
  ColumnHeightOutlined,
  FilterOutlined,
  CheckSquareOutlined,
  AppstoreOutlined,
  ProfileOutlined,
  StopOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api, getUserType } from "../../lib/api";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

/** Brand + Glass */
const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
  softBorder: "rgba(122,90,248,0.18)",
  rowHover: "#F1EEFF",
};
const glassCard = {
  borderRadius: 14,
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: `1px solid ${BRAND.softBorder}`,
  boxShadow: "0 10px 26px rgba(16,24,40,0.06)",
};

export default function BPOManagement() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;
  const isMdUp = !!screens.md;

  // Gate: only admin/official
  React.useEffect(() => {
    const checkUser = async () => {
      const type = await getUserType(); // wait for the Promise
      if (type !== "admin" && type !== "official") {
        navigate("/", { replace: true });
      }
    };
    checkUser();
  }, [navigate]);

  // ---------- State ----------
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters / search
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [servedByFilter, setServedByFilter] = useState("all");
  const searchDebounceRef = useRef();

  // Table UX
  const [density, setDensity] = useState("middle"); // "middle" | "small"
  const [visibleCols, setVisibleCols] = useState({
    bpoID: true,
    controlNO: true,
    applicationName: true,
    servedBy: true,
    status: true,
    // actions removed
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Status editor
  const [statusCardVisible, setStatusCardVisible] = useState(false);
  const [statusEditing, setStatusEditing] = useState(null);
  const [statusNew, setStatusNew] = useState("Active");

  // Dynamic table height (fit to screen, avoid overlap)
  const tableWrapRef = useRef(null);
  const [tableY, setTableY] = useState(420);

  // ---------- Data ----------
  const fetchBPOs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/bpo", {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = res?.data?.data || [];
      setList(
        data.map((d) => ({
          key: d._id || d.bpoID || Math.random().toString(36).slice(2),
          ...d,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch BPOs", err);
      message.error("Failed to load BPOs");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchBPOs();
  }, []);

  // ServedBy options
  const servedByOptions = useMemo(() => {
    const s = new Set();
    list.forEach((r) => r?.servedBy && s.add(r.servedBy));
    return ["all", ...Array.from(s)];
  }, [list]);

  // Debounced search typing -> value
  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(
      () => setSearchText(searchInput.trim()),
      300
    );
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  // Filtered list
  const filtered = useMemo(() => {
    const txt = searchText.toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (servedByFilter !== "all" && r.servedBy !== servedByFilter)
        return false;
      if (!txt) return true;
      return (
        String(r.bpoID || r._id || "").toLowerCase().includes(txt) ||
        String(r.controlNO || "").toLowerCase().includes(txt) ||
        String(r.applicationName || "").toLowerCase().includes(txt) ||
        String(r.servedBy || "").toLowerCase().includes(txt)
      );
    });
  }, [list, searchText, statusFilter, servedByFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = list.length;
    const active = list.filter((r) => r.status === "Active").length;
    const expired = list.filter((r) => r.status === "Expired").length;
    const revoked = list.filter((r) => r.status === "Revoked").length;
    return { total, active, expired, revoked };
  }, [list]);

  // ---------- Bulk actions ----------
  const bulkUpdateStatus = async (newStatus) => {
    if (!selectedRowKeys.length) return;
    setLoading(true);
    try {
      for (const key of selectedRowKeys) {
        const row = list.find((x) => x.key === key);
        if (!row) continue;
        const id = row.bpoID || row._id;
        await api.put(`/api/bpo/${id}`, { data: { status: newStatus } });
      }
      message.success(`Updated ${selectedRowKeys.length} record(s)`);
      setSelectedRowKeys([]);
      await fetchBPOs();
    } catch (e) {
      console.error(e);
      message.error("Bulk update failed");
    } finally {
      setLoading(false);
    }
  };
  const bulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    setLoading(true);
    try {
      for (const key of selectedRowKeys) {
        const row = list.find((x) => x.key === key);
        if (!row) continue;
        const id = row.bpoID || row._id;
        await api.delete(`/api/bpo/${id}`);
      }
      message.success(`Deleted ${selectedRowKeys.length} record(s)`);
      setSelectedRowKeys([]);
      await fetchBPOs();
    } catch (e) {
      console.error(e);
      message.error("Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  // Single delete + status save
  const handleDelete = async (row) => {
    if (!row) return;
    setLoading(true);
    try {
      const id = row.bpoID || row._id;
      const res = await api.delete(`/api/bpo/${id}`);
      if (res?.data?.success) {
        message.success("BPO soft-deleted");
        fetchBPOs();
      } else {
        message.error(res?.data?.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error", err);
      message.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };
  const handleStatusSave = async () => {
    if (!statusEditing) return;
    setLoading(true);
    try {
      const id = statusEditing.bpoID || statusEditing._id;
      const res = await api.put(`/api/bpo/${id}`, {
        data: { status: statusNew },
      });
      if (res?.data?.success) {
        message.success("Status updated");
        setStatusCardVisible(false);
        setStatusEditing(null);
        fetchBPOs();
      } else {
        message.error(res?.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Status update error", err);
      message.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Columns ----------
  const baseColumns = [
    {
      title: "BPO ID",
      dataIndex: "bpoID",
      key: "bpoID",
      width: 220,
      ellipsis: true,
      render: (t, r) => t || r._id,
      sorter: (a, b) =>
        String(a.bpoID || a._id || "").localeCompare(
          String(b.bpoID || b._id || "")
        ),
      responsive: ["sm"],
    },
    {
      title: "Control No",
      dataIndex: "controlNO",
      key: "controlNO",
      width: 140,
      ellipsis: true,
      sorter: (a, b) =>
        String(a.controlNO || "").localeCompare(String(b.controlNO || "")),
    },
    {
      title: "Applicant",
      dataIndex: "applicationName",
      key: "applicationName",
      width: 220,
      ellipsis: true,
      sorter: (a, b) =>
        String(a.applicationName || "").localeCompare(
          String(b.applicationName || "")
        ),
      render: (t) => (t ? <Text strong>{t}</Text> : "—"),
    },
    {
      title: "Served By",
      dataIndex: "servedBy",
      key: "servedBy",
      width: 180,
      ellipsis: true,
      sorter: (a, b) =>
        String(a.servedBy || "").localeCompare(String(b.servedBy || "")),
      render: (t) =>
        t ? (
          <Tag color="geekblue" style={{ borderRadius: 999 }}>
            {t}
          </Tag>
        ) : (
          "—"
        ),
      responsive: ["md"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      ellipsis: true,
      filters: [
        { text: "Active", value: "Active" },
        { text: "Expired", value: "Expired" },
        { text: "Revoked", value: "Revoked" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (s, r) => {
        const color =
          s === "Active"
            ? "green"
            : s === "Expired"
              ? "volcano"
              : s === "Revoked"
                ? "magenta"
                : "default";
        return (
          <Space size={6}>
            <Tag color={color} style={{ borderRadius: 999 }}>
              {s || "Unknown"}
            </Tag>
            {/* quick edit — stop row navigation */}
            {screens.md && (
              <Tooltip title="Quick edit status">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusEditing(r);
                    setStatusNew(r.status || "Active");
                    setStatusCardVisible(true);
                  }}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    // Actions column REMOVED
  ];
  const columns = baseColumns.filter((c) => visibleCols[c.key ?? c.dataIndex]);

  // Column visibility dropdown (no actions item)
  const colMenu = (
    <Menu
      selectable
      multiple
      onClick={({ key }) =>
        setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }))
      }
      selectedKeys={Object.entries(visibleCols)
        .filter(([, v]) => v)
        .map(([k]) => k)}
      items={[
        { key: "bpoID", label: "BPO ID", icon: <ProfileOutlined /> },
        { key: "controlNO", label: "Control No" },
        { key: "applicationName", label: "Applicant" },
        { key: "servedBy", label: "Served By" },
        { key: "status", label: "Status" },
      ]}
    />
  );

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    preserveSelectedRowKeys: true,
  };

  // ---- Dynamic table height: compute y so the table fits screen ----
  useEffect(() => {
    const recalc = () => {
      if (!tableWrapRef.current) return;
      const rect = tableWrapRef.current.getBoundingClientRect();
      const bottomGap = 16;
      const available = window.innerHeight - rect.top - bottomGap;
      const y = Math.max(240, available - 130); // header/paddings buffer
      setTableY(y);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(document.body);
    window.addEventListener("resize", recalc);
    const t = setTimeout(recalc, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
      clearTimeout(t);
    };
  }, [screens.xs, screens.sm, screens.md, screens.lg, screens.xl, filtered.length]);

  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "visible",
      }}
    >
      {/* Sticky header (like Reports) */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: BRAND.pageBg,
          borderBottom: `1px solid ${BRAND.softBorder}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* sidebar toggle (visible only on small screens) */}
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: screens.md ? 40 : 36,
                height: screens.md ? 40 : 36,
                display: "grid",
                placeItems: "center",
                borderRadius: 10,
                background: "#ffffffcc",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              BPO Management
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Track and manage Barangay Protection Orders efficiently.
              </Text>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/admin/bpo")}
            style={{ background: BRAND.violet, borderColor: BRAND.violet }}
          >
            {screens.md ? "Add BPO" : null}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBPOs}
            style={{ borderColor: BRAND.violet, color: BRAND.violet }}
            loading={loading}
          >
            {screens.md ? "Refresh" : null}
          </Button>
        </div>
      </Header>

      <Content
        style={{
          padding: 12,
          paddingTop: 12,
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingInline: screens.xs ? 6 : 12,
            boxSizing: "border-box",
          }}
        >
          {/* KPIs */}
          <Row gutter={[10, 10]}>
            {[
              ["Total", kpis.total, BRAND.violet, <AppstoreOutlined key="i" />],
              ["Active", kpis.active, "green", <CheckSquareOutlined key="i" />],
              ["Expired", kpis.expired, "volcano", <StopOutlined key="i" />],
              ["Revoked", kpis.revoked, "magenta", <ExclamationCircleOutlined key="i" />],
            ].map(([label, value, color, icon], i) => (
              <Col xs={12} md={6} key={i}>
                <Card style={{ ...glassCard, padding: 10 }}>
                  <Space align="center">
                    <Avatar style={{ background: "#fff" }} icon={icon} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {label}
                      </Text>
                      <Title level={3} style={{ margin: 0, color, fontSize: 24 }}>
                        {value}
                      </Title>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Toolbar */}
          <Card style={{ ...glassCard, padding: isXs ? "12px 8px" : "14px 16px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isXs 
                ? "1fr" 
                : screens.sm && !screens.md
                ? "1fr 1fr" 
                : screens.md 
                ? "minmax(240px, 320px) repeat(auto-fit, minmax(140px, 1fr))" 
                : "1fr 1fr",
              gap: isXs ? 8 : 10,
              width: "100%",
              alignItems: "center",
            }}>
              <Input
                placeholder={isXs ? "Search BPO..." : "Search BPO ID, Control No, Applicant, Served By…"}
                allowClear
                prefix={<SearchOutlined />}
                style={{ width: "100%" }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size={isXs ? "middle" : "large"}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: "100%" }}
                suffixIcon={<FilterOutlined />}
                size={isXs ? "middle" : "large"}
              >
                <Option value="all">All Status</Option>
                <Option value="Active">Active</Option>
                <Option value="Expired">Expired</Option>
                <Option value="Revoked">Revoked</Option>
              </Select>
              <Select
                value={servedByFilter}
                onChange={setServedByFilter}
                style={{ width: "100%" }}
                suffixIcon={<FilterOutlined />}
                size={isXs ? "middle" : "large"}
              >
                {servedByOptions.map((v) => (
                  <Option key={v} value={v}>
                    {v === "all" ? "All Served By" : v}
                  </Option>
                ))}
              </Select>

              <div style={{
                display: "flex",
                gap: 8,
                width: "100%",
                gridColumn: isXs ? "span 1" : "auto",
              }}>
                <Dropdown overlay={colMenu} trigger={["click"]}>
                  <Button 
                    icon={<SettingOutlined />} 
                    style={{ flex: 1 }}
                    size={isXs ? "middle" : "large"}
                  >
                    {screens.md ? "Columns" : ""}
                  </Button>
                </Dropdown>

                <Button
                  icon={<ColumnHeightOutlined />}
                  onClick={() =>
                    setDensity((d) => (d === "middle" ? "small" : "middle"))
                  }
                  style={{ flex: 1 }}
                  size={isXs ? "middle" : "large"}
                >
                  {screens.md ? (density === "middle" ? "Compact" : "Comfortable") : ""}
                </Button>
              </div>
            </div>
          </Card>

          {/* Bulk actions */}
          <Card style={{ ...glassCard, padding: 10 }}>
            <Space wrap>
              <Text type="secondary">
                Selected: <strong>{selectedRowKeys.length}</strong>
              </Text>
              <Select
                placeholder="Bulk: Update Status"
                style={{ width: 220 }}
                onChange={(v) => bulkUpdateStatus(v)}
                value={null}
                disabled={!selectedRowKeys.length}
              >
                <Option value="Active">Set Active</Option>
                <Option value="Expired">Set Expired</Option>
                <Option value="Revoked">Set Revoked</Option>
              </Select>
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} record(s)?`}
                okText="Delete"
                cancelText="Cancel"
                onConfirm={bulkDelete}
                disabled={!selectedRowKeys.length}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selectedRowKeys.length}
                >
                  Bulk Delete
                </Button>
              </Popconfirm>
            </Space>
          </Card>

          {/* Table (auto-fits viewport; rows clickable) */}
          <Card style={{ ...glassCard, padding: 0 }} ref={tableWrapRef}>
            <Table
              columns={columns}
              dataSource={filtered}
              loading={loading}
              rowKey={(r) => r.key}
              pagination={false}
              size={density}
              rowSelection={screens.md ? {
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              } : undefined}
              tableLayout="fixed"
              sticky
              scroll={{ y: tableY, x: screens.xs ? 800 : "max-content" }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <span>
                        No BPOs found. Try adjusting filters or{" "}
                        <Button type="link" onClick={fetchBPOs}>
                          refresh
                        </Button>
                        .
                      </span>
                    }
                  />
                ),
              }}
              rowClassName={() => "clickable-row"}
              onRow={(record) => ({
                onClick: () =>
                  navigate(`/admin/bpo/${record.bpoID || record._id}`),
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        </div>

        {/* Status Editor Modal — polished */}
        <Modal
          open={statusCardVisible && !!statusEditing}
          onCancel={() => {
            setStatusCardVisible(false);
            setStatusEditing(null);
          }}
          footer={null}
          width={screens.lg ? 560 : "96vw"}
          wrapClassName="bpo-status-modal"
          title={
            statusEditing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar
                  style={{ background: "#fff", color: BRAND.violet }}
                  icon={<SafetyOutlined />}
                />
                <div>
                  <div style={{ fontWeight: 800, lineHeight: 1 }}>
                    Edit Status — {statusEditing?.bpoID || statusEditing?._id}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Choose the current state of this BPO.
                  </Text>
                </div>
              </div>
            ) : (
              "Edit Status"
            )
          }
        >
          <Card style={{ borderRadius: 14 }}>
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Status</div>
                <Segmented
                  block
                  value={statusNew}
                  onChange={(val) => setStatusNew(val)}
                  options={[
                    {
                      label: (
                        <Space>
                          <SafetyOutlined />
                          Active
                        </Space>
                      ),
                      value: "Active",
                    },
                    {
                      label: (
                        <Space>
                          <StopOutlined />
                          Expired
                        </Space>
                      ),
                      value: "Expired",
                    },
                    {
                      label: (
                        <Space>
                          <ExclamationCircleOutlined />
                          Revoked
                        </Space>
                      ),
                      value: "Revoked",
                    },
                  ]}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <Button
                  onClick={() => {
                    setStatusCardVisible(false);
                    setStatusEditing(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleStatusSave}
                  style={{ background: BRAND.violet, borderColor: BRAND.violet }}
                >
                  Save
                </Button>
              </div>
            </Space>
          </Card>
        </Modal>
      </Content>

      {/* Styles */}
      <style>{`
        .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
        .ant-card:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(16,24,40,0.08); }
        .ant-table-thead > tr > th { background: #fff !important; }
        .ant-table .ant-table-tbody > tr:hover > td { background: ${BRAND.rowHover} !important; }
        .clickable-row:hover { filter: none; }

        /* One-line toolbar with graceful horizontal scroll */
        .toolbar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;        /* force single row */
          overflow-x: auto;         /* scroll horizontally if needed */
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;      /* space for thin scrollbar */
          scrollbar-width: thin;
        }
        .toolbar-row::-webkit-scrollbar { height: 6px; }
        .toolbar-row::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 8px;
        }

        /* Polished glassy modal */
        .bpo-status-modal .ant-modal-content {
          border-radius: 16px;
          border: 1px solid ${BRAND.softBorder};
          background: linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,255,255,0.92));
          box-shadow: 0 20px 48px rgba(16,24,40,0.16);
        }
        .bpo-status-modal .ant-modal-header {
          border-bottom: 1px solid ${BRAND.softBorder};
          background: rgba(250,250,255,0.9);
          border-radius: 16px 16px 0 0;
          padding: 12px 16px;
        }
        .bpo-status-modal .ant-modal-body {
          padding: 12px;
        }
      `}</style>
    </Layout>
  );
}
