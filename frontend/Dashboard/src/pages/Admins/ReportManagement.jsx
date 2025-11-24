// src/pages/admin/ReportManagement.jsx
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
  Avatar,
  Modal,
  Form,
  Row,
  Col,
  Grid,
  DatePicker,
  Descriptions,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DownloadOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  AlertOutlined,
  MenuOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

export default function ReportManagement() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm; // very small phones
  const isSm = !!screens.sm && !screens.md; // small
  const isMdUp = !!screens.md; // tablet and up
  const HEADER_H = isXs ? 56 : isMdUp ? 72 : 64;

  // === Brand & glass style ===
  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    green: "#52c41a",
    blue: "#1890ff",
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

  // === Layout sizing ===
  const TOP_PAD = 12;
  const [tableY, setTableY] = useState(520);
  const pageRef = useRef(null);

  useEffect(() => {
    const calc = () => {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.top - TOP_PAD;
      const y = Math.max(220, available - 180);
      setTableY(y);
      pageRef.current.style.width = "100%";
      pageRef.current.style.minWidth = "0";
    };
    calc();
    window.addEventListener("resize", calc);
    const ro = new ResizeObserver(calc);
    ro.observe(document.body);
    const t = setTimeout(calc, 50);
    return () => {
      window.removeEventListener("resize", calc);
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  // === State ===
  const [loading, setLoading] = useState(true);
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  // Pagination
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Right-side modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("view"); // view | edit
  const [activeReport, setActiveReport] = useState(null);
  const [form] = Form.useForm();

  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // quick status editor state
  const [quickStatus, setQuickStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // === Data ===
  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/reports");
      if (data?.success) {
        const formatted = (data.data || []).map((r) => {
          let victim = null;
          if (r.victimID) {
            const { location, ...safeVictim } = r.victimID; // privacy scrub
            victim = safeVictim;
          }
          return {
            key: r.reportID,
            reportID: r.reportID,
            victimID: victim, // object or null
            incidentType: r.incidentType,
            description: r.description,
            perpetrator: r.perpetrator,
            location: r.location,
            status: r.status,
            dateReported: r.dateReported || r.createdAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        });
        setAllReports(formatted);
        setFilteredReports(formatted);
        setCurrentPage(1);
      } else {
        message.error("Failed to load reports");
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAllReports();
  }, []);

  // === Helpers ===
  const normalizeStatus = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "under investigation" || v === "in-progress")
      return "Under Investigation";
    if (v === "open") return "Open";
    if (v === "pending") return "Pending";
    if (v === "closed") return "Closed";
    return s || "Pending";
  };
  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "open":
        return "orange";
      case "under investigation":
      case "in-progress":
        return "blue";
      case "closed":
        return "green";
      case "pending":
      default:
        return "default";
    }
  };
  const typePillBg = "#ffe9f0";

  // === Modal open ===
  const openModalFor = (record, m = "view") => {
    setActiveReport(record);
    setMode(m);
    form.setFieldsValue({
      incidentType: record.incidentType || "",
      location: record.location || "",
      description: record.description || "",
      perpetrator: record.perpetrator || "",
      status: normalizeStatus(record.status),
    });
    setQuickStatus(normalizeStatus(record.status));
    setModalOpen(true);
  };

  // Quick update status API call
  const handleUpdateStatus = async (newStatus) => {
    if (!activeReport) return;
    try {
      setStatusUpdating(true);
      const payload = { status: newStatus };
      const res = await api.put(
        `/api/reports/${activeReport.reportID}`,
        payload
      );
      if (res?.data?.success) {
        message.success("Status updated");
        await fetchAllReports();
        const refreshed = (await api.get(`/api/reports/${activeReport.reportID}`))
          .data;
        if (refreshed?.data) {
          const updated = {
            ...activeReport,
            ...refreshed.data,
          };
          setActiveReport(updated);
          form.setFieldsValue({ status: normalizeStatus(updated.status) });
          setQuickStatus(normalizeStatus(updated.status));
        }
      } else {
        message.error(res?.data?.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      message.error(
        err?.response?.data?.message || err.message || "Failed to update status"
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  // === Update/Delete ===
  const handleUpdateReport = async (values) => {
    if (!activeReport) return;
    try {
      setLoading(true);
      const payload = {
        incidentType: values.incidentType,
        location: values.location,
        description: values.description,
        perpetrator: values.perpetrator || "",
        status: values.status,
      };
      const res = await api.put(
        `/api/reports/${activeReport.reportID}`,
        payload
      );
      if (res?.data?.success) {
        message.success("Report updated");
        setMode("view");
        await fetchAllReports();
        const refreshed = (await api.get(`/api/reports/${activeReport.reportID}`))
          .data;
        if (refreshed?.data) {
          const updated = {
            ...activeReport,
            ...refreshed.data,
          };
          setActiveReport(updated);
          form.setFieldsValue({ status: normalizeStatus(updated.status) });
          setQuickStatus(normalizeStatus(updated.status));
        }
      } else {
        message.error(res?.data?.message || "Failed to update report");
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || err.message || "Failed to update report"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!activeReport) return;
    try {
      setLoading(true);
      const res = await api.delete(`/api/reports/${activeReport.reportID}`);
      if (res?.data?.success) {
        message.success("Report deleted");
        setDeleteModalOpen(false);
        setModalOpen(false);
        fetchAllReports();
      } else {
        message.error(res?.data?.message || "Failed to delete report");
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || err.message || "Failed to delete report"
      );
    } finally {
      setLoading(false);
    }
  };

  const showDeleteConfirm = () => {
    setDeleteModalOpen(true);
  };

  // === Filtering ===
  useEffect(() => {
    let filtered = [...allReports];

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (r) => normalizeStatus(r.status) === statusFilter
      );
    }

    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter((r) => {
        const t = new Date(r.dateReported || r.createdAt).getTime();
        return (
          t >= start.startOf("day").valueOf() && t <= end.endOf("day").valueOf()
        );
      });
    }

    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          String(r.reportID).toLowerCase().includes(q) ||
          String(r.incidentType).toLowerCase().includes(q) ||
          String(r.location).toLowerCase().includes(q) ||
          String(r.status).toLowerCase().includes(q)
      );
    }

    setFilteredReports(filtered);
    setCurrentPage(1);
  }, [allReports, searchText, statusFilter, dateRange]);

  // === Columns ===
  const columns = useMemo(
    () => [
      {
        title: "Report",
        key: "report",
        fixed: "left",
        width: isXs ? 180 : isSm ? 220 : 280,
        render: (_, record) => (
          <Space>
            <Avatar
              style={{
                background: typePillBg,
                color: "#444",
                width: isXs ? 36 : 44,
                height: isXs ? 36 : 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              icon={<AlertOutlined />}
            />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: isXs ? 13 : 15,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isXs ? 110 : 180,
                }}
              >
                {record.reportID}
              </div>
              <div
                style={{
                  fontSize: isXs ? 11 : 12,
                  color: "#999",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isXs ? 110 : 180,
                }}
              >
                {record.incidentType}
              </div>
            </div>
          </Space>
        ),
        onCell: (record) => ({
          onClick: () => openModalFor(record, "view"),
          style: { cursor: "pointer" },
        }),
      },
      {
        title: "Victim",
        dataIndex: "victimID",
        key: "victimID",
        width: 220,
        render: (victim) => {
          if (!victim) return <Tag>N/A</Tag>;
          const id =
            typeof victim === "string"
              ? victim
              : victim.victimID || victim._id || "N/A";
          return <Tag color="magenta">{id}</Tag>;
        },
        responsive: ["sm"],
      },
      {
        title: "Location",
        dataIndex: "location",
        key: "location",
        width: 220,
        ellipsis: true,
        render: (loc) =>
          loc ? (
            <Tag icon={<EnvironmentOutlined />} color="geekblue">
              {loc}
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
        width: 160,
        render: (s) => (
          <Tag color={getStatusColor(s)} style={{ borderRadius: 999 }}>
            {normalizeStatus(s)}
          </Tag>
        ),
      },
      {
        title: "Date Reported",
        dataIndex: "dateReported",
        key: "dateReported",
        width: 200,
        render: (d) => (d ? new Date(d).toLocaleString() : "-"),
        responsive: ["lg"],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screens.xs, screens.sm, screens.md, screens.lg, screens.xl]
  );

  // === KPIs ===
  const reportCounts = useMemo(
    () => ({
      total: allReports.length,
      open: allReports.filter((r) => normalizeStatus(r.status) === "Open")
        .length,
      inProgress: allReports.filter(
        (r) => normalizeStatus(r.status) === "Under Investigation"
      ).length,
      closed: allReports.filter((r) => normalizeStatus(r.status) === "Closed")
        .length,
    }),
    [allReports]
  );

  // === Export CSV (filtered view) ===
  const exportCsv = () => {
    const rows = filteredReports.map((r) => ({
      ReportID: r.reportID,
      VictimID: r.victimID
        ? typeof r.victimID === "string"
          ? r.victimID
          : r.victimID.victimID || r.victimID._id || ""
        : "",
      IncidentType: r.incidentType || "",
      Location: r.location || "",
      Status: normalizeStatus(r.status) || "",
      DateReported: r.dateReported ? new Date(r.dateReported).toISOString() : "",
      CreatedAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      UpdatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
      Perpetrator: r.perpetrator || "",
      Description: (r.description || "").replaceAll("\n", " ").trim(),
    }));
    const header =
      "ReportID,VictimID,IncidentType,Location,Status,DateReported,CreatedAt,UpdatedAt,Perpetrator,Description";
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
    a.download = "reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalWidth = isXs
    ? "100%"
    : screens.xl
    ? 720
    : screens.lg
    ? 680
    : screens.md
    ? "92vw"
    : "96vw";

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
      {/* Sticky responsive header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(250, 249, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BRAND.softBorder}`,
          boxShadow: "0 2px 12px rgba(16,24,40,0.06)",
          display: "flex",
          alignItems: "center",
          paddingInline: isXs ? 10 : isSm ? 12 : isMdUp ? 20 : 12,
          height: HEADER_H,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isXs ? 8 : 12,
            flex: 1,
          }}
        >
          {!isMdUp && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: isXs ? 34 : 38,
                height: isXs ? 34 : 38,
                minWidth: isXs ? 34 : 38,
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              flex: 1,
            }}
          >
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Report Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Review, manage, and monitor reports submitted by victims.
              </Text>
            )}
          </div>
        </div>
      </Header>

      <Content
        ref={pageRef}
        style={{
          width: "100%",
          minWidth: 0,
          overflow: "auto",
          flex: 1,
          boxSizing: "border-box",
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
            {[
              ["Total Reports", reportCounts.total, BRAND.violet],
              ["Open", reportCounts.open, "orange"],
              ["Under Investigation", reportCounts.inProgress, BRAND.blue],
              ["Closed", reportCounts.closed, BRAND.green],
            ].map(([label, value, color], i) => (
              <Col xs={12} sm={12} md={6} key={i}>
                <Card
                  style={{
                    ...glassCard,
                    padding: isXs ? "8px 10px" : "10px 12px",
                    textAlign: isXs ? "center" : "left",
                  }}
                >
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: isXs ? 11 : 13,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {isXs && label.includes("Under Investigation")
                      ? "Investigating"
                      : label}
                  </Typography.Text>
                  <Typography.Title
                    level={isXs ? 4 : 3}
                    style={{
                      margin: 0,
                      color,
                      fontSize: isXs ? 20 : isSm ? 22 : 24,
                      fontWeight: 700,
                    }}
                  >
                    {value}
                  </Typography.Title>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Toolbar */}
          <Card
            style={{
              ...glassCard,
              padding: isXs ? "12px 8px" : isSm ? "12px 10px" : "14px 16px",
              top: 0,
              zIndex: 99,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              background: "rgba(250, 249, 255, 0.98)",
              boxShadow: "0 4px 20px rgba(16,24,40,0.12)",
              marginBottom: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: isXs ? 10 : 12,
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isXs
                    ? "1fr"
                    : isSm
                    ? "1fr 1fr"
                    : isMdUp
                    ? "minmax(240px, 320px) repeat(auto-fit, minmax(140px, 1fr))"
                    : "1fr 1fr",
                  gap: isXs ? 8 : 10,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Search
                  placeholder={
                    isXs
                      ? "Search reports..."
                      : "Search report ID, type, location…"
                  }
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
                  value={searchText}
                  onSearch={setSearchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />

                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  size={isXs ? "middle" : "large"}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "Open", label: "Open" },
                    {
                      value: "Under Investigation",
                      label: isXs ? "Investigating" : "Under Investigation",
                    },
                    { value: "Closed", label: "Closed" },
                    { value: "Pending", label: "Pending" },
                  ]}
                />

                <RangePicker
                  onChange={setDateRange}
                  allowEmpty={[true, true]}
                  placeholder={["Start", "End"]}
                  suffixIcon={<CalendarOutlined />}
                  size={isXs ? "middle" : "large"}
                  style={{
                    width: "100%",
                    gridColumn: isXs ? "span 1" : "auto",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: isXs ? "stretch" : "flex-end",
                  width: "100%",
                }}
              >
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchAllReports}
                  size={isXs ? "middle" : "large"}
                  style={{
                    flex: isXs ? 1 : "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {!isXs && "Refresh"}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={exportCsv}
                  size={isXs ? "middle" : "large"}
                  type="primary"
                  style={{
                    flex: isXs ? 1 : "0 0 auto",
                    background: BRAND.violet,
                    borderColor: BRAND.violet,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card style={{ ...glassCard, padding: 0 }}>
            <Table
              className="pretty-table"
              columns={columns}
              dataSource={filteredReports}
              loading={loading}
              size="middle"
              sticky
              rowKey="key"
              pagination={{
                current: currentPage,
                pageSize: PAGE_SIZE,
                total: filteredReports.length,
                showSizeChanger: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} reports`,
                onChange: (page) => setCurrentPage(page),
              }}
              tableLayout={isMdUp ? "fixed" : "auto"}
              scroll={{ y: tableY, x: "max-content" }}
              onRow={(record) => ({
                onClick: () => openModalFor(record, "view"),
                style: { cursor: "pointer" },
              })}
              rowClassName={(record) =>
                activeReport?.key === record.key ? "is-active" : ""
              }
            />
          </Card>
        </div>

        {/* RIGHT-SIDE FLOATING MODAL */}
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          centered={!isXs}
          width={modalWidth}
          wrapClassName="floating-side"
          className="floating-modal"
          maskStyle={{
            backdropFilter: "blur(2px)",
            background: "rgba(17,17,26,0.24)",
          }}
          getContainer={() => document.body}
          style={isXs ? { top: 8, paddingBottom: 0 } : {}}
          title={
            activeReport ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: isXs ? "column" : "row",
                  alignItems: isXs ? "flex-start" : "center",
                  justifyContent: isXs ? "flex-start" : "space-between",
                  gap: isXs ? 8 : 12,
                }}
              >
                <Space
                  align="start"
                  size={8}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Avatar
                    style={{ background: typePillBg, color: "#444" }}
                    icon={<AlertOutlined />}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: isXs ? 15 : 16,
                        lineHeight: 1.2,
                      }}
                    >
                      {activeReport.reportID}{" "}
                      <Tag style={{ marginLeft: 6 }}>
                        {activeReport.incidentType}
                      </Tag>
                    </div>
                    <Typography.Text type="secondary">
                      {activeReport.location ? (
                        <span>
                          <EnvironmentOutlined /> {activeReport.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Typography.Text>
                  </div>
                </Space>

                <Space
                  size={8}
                  style={{
                    marginTop: isXs ? 4 : 0,
                    width: isXs ? "100%" : "auto",
                    justifyContent: isXs ? "flex-end" : "flex-start",
                    flexWrap: isXs ? "wrap" : "nowrap",
                    rowGap: 6,
                  }}
                >
                  {mode === "view" ? (
                    <Button
                      type="primary"
                      size={isXs ? "small" : "middle"}
                      onClick={() => setMode("edit")}
                      icon={<EditOutlined />}
                      style={{
                        background: BRAND.violet,
                        borderColor: BRAND.violet,
                      }}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      size={isXs ? "small" : "middle"}
                      onClick={() => setMode("view")}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    danger
                    size={isXs ? "small" : "middle"}
                    onClick={showDeleteConfirm}
                    icon={<DeleteOutlined />}
                  >
                    Delete
                  </Button>
                </Space>
              </div>
            ) : (
              "Report"
            )
          }
        >
          {/* Quick status editor box */}
          <Card style={{ marginBottom: 12, borderRadius: 12 }}>
            <div className="quick-status-layout">
              <div className="quick-status-main">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Quick Status
                </div>
                <div
                  style={{ color: "#666", fontSize: 13, marginBottom: 8 }}
                >
                  Update case status quickly without editing the whole report.
                </div>
                <Select
                  value={quickStatus}
                  onChange={setQuickStatus}
                  options={[
                    { label: "Pending", value: "Pending" },
                    { label: "Open", value: "Open" },
                    {
                      label: "Under Investigation",
                      value: "Under Investigation",
                    },
                    { label: "Closed", value: "Closed" },
                  ]}
                  style={{ width: "100%", maxWidth: 280 }}
                />
              </div>
              <div className="quick-status-actions">
                <Button
                  type="primary"
                  loading={statusUpdating}
                  onClick={() => handleUpdateStatus(quickStatus)}
                  style={{
                    background: BRAND.violet,
                    borderColor: BRAND.violet,
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>

          {activeReport && (
            <div className="modal-inner-animate">
              {/* Details */}
              <Card
                style={{ ...glassCard, borderRadius: 16, marginBottom: 10 }}
              >
                <Descriptions
                  bordered
                  size="small"
                  column={1}
                  labelStyle={{ width: 160, background: "#fafafa" }}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                >
                  <Descriptions.Item label="Report ID">
                    <Tag color="blue">{activeReport.reportID}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Victim">
                    {activeReport.victimID ? (
                      <Tag color="magenta">
                        {typeof activeReport.victimID === "string"
                          ? activeReport.victimID
                          : activeReport.victimID.victimID ||
                            activeReport.victimID._id ||
                            "N/A"}
                      </Tag>
                    ) : (
                      "N/A"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Current Status">
                    <Tag
                      color={getStatusColor(activeReport.status)}
                      style={{ borderRadius: 999 }}
                    >
                      {normalizeStatus(activeReport.status)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Incident Type">
                    {activeReport.incidentType || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Location">
                    {activeReport.location ? (
                      <Tag icon={<EnvironmentOutlined />} color="geekblue">
                        {activeReport.location}
                      </Tag>
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date Reported">
                    {activeReport.dateReported
                      ? new Date(activeReport.dateReported).toLocaleString()
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Perpetrator">
                    {activeReport.perpetrator || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Description">
                    <Typography.Paragraph
                      style={{ whiteSpace: "pre-line", marginBottom: 0 }}
                    >
                      {activeReport.description || "No description provided."}
                    </Typography.Paragraph>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Edit */}
              <Card style={{ ...glassCard, borderRadius: 16 }}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleUpdateReport}
                  disabled={mode === "view"}
                >
                  <Row gutter={[10, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="incidentType"
                        label="Incident Type"
                        rules={[
                          {
                            required: true,
                            message: "Please select the incident type",
                          },
                        ]}
                      >
                        <Select
                          options={[
                            { value: "Physical", label: "Physical" },
                            { value: "Sexual", label: "Sexual" },
                            {
                              value: "Psychological",
                              label: "Psychological",
                            },
                            { value: "Economic", label: "Economic" },
                            { value: "Emergency", label: "Emergency" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="status" label="Status">
                        <Select
                          options={[
                            { value: "Pending", label: "Pending" },
                            { value: "Open", label: "Open" },
                            {
                              value: "Under Investigation",
                              label: "Under Investigation",
                            },
                            { value: "Closed", label: "Closed" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item
                        name="location"
                        label="Location"
                        rules={[{ required: true }]}
                      >
                        <Input prefix={<EnvironmentOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="perpetrator" label="Perpetrator">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="description" label="Description">
                        <Input.TextArea rows={4} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {mode === "edit" && (
                    <div className="edit-footer-bar">
                      <Button onClick={() => setMode("view")}>Cancel</Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        style={{
                          background: BRAND.violet,
                          borderColor: BRAND.violet,
                        }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </Form>
              </Card>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title={
            <Space>
              <ExclamationCircleOutlined
                style={{ color: "#ff4d4f", fontSize: 20 }}
              />
              <span>Confirm Delete</span>
            </Space>
          }
          open={deleteModalOpen}
          onCancel={() => setDeleteModalOpen(false)}
          onOk={handleDeleteReport}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, loading }}
          centered
        >
          <div style={{ padding: "12px 0" }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>
              Are you sure you want to delete this report?
            </p>
            {activeReport && (
              <div
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 12,
                }}
              >
                <Space
                  direction="vertical"
                  size={4}
                  style={{ width: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text strong>Report ID: {activeReport.reportID}</Text>
                    <Tag
                      color={
                        activeReport.status === "Closed"
                          ? "green"
                          : activeReport.status === "Open"
                          ? "blue"
                          : activeReport.status === "Under Investigation"
                          ? "orange"
                          : "default"
                      }
                    >
                      {activeReport.status}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <AlertOutlined /> {activeReport.incidentType}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <EnvironmentOutlined /> {activeReport.location}
                  </Text>
                  {activeReport.victimID && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Victim: {activeReport.victimID.firstName}{" "}
                      {activeReport.victimID.lastName}
                    </Text>
                  )}
                </Space>
              </div>
            )}
            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                color: "#666",
                fontSize: 13,
              }}
            >
              This action cannot be undone. The report will be permanently
              removed from the system.
            </p>
          </div>
        </Modal>
      </Content>

      {/* === Styles === */}
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

        html, body, #root { height: 100%; }
        .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
        .ant-card:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(16,24,40,0.08); }
        .ant-table-thead > tr > th { background: #fff !important; }

        .ant-layout-header {
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }

        @media (max-width: 576px) {
          .ant-input-search .ant-input-group .ant-input {
            font-size: 14px !important;
          }
          .ant-select-selector {
            font-size: 14px !important;
          }
          .ant-picker {
            font-size: 14px !important;
          }
          .ant-btn {
            font-size: 14px !important;
          }
        }

        @media (max-width: 576px) {
          .ant-picker-dropdown {
            width: 100vw !important;
            max-width: 320px !important;
          }
        }

        .pretty-table .ant-table { width: 100%; }
        .pretty-table .ant-table-thead > tr > th { background: #fff !important; }
        @media (max-width: 576px) {
          .pretty-table .ant-table-thead > tr > th {
            padding: 8px 10px !important;
            font-size: 13px;
          }
          .pretty-table .ant-table-tbody > tr > td {
            padding: 8px 10px !important;
            white-space: normal !important;
            font-size: 13px;
          }
          .pretty-table .ant-table-container { overflow: visible; }
          .pretty-table .ant-table-wrapper { overflow-x: auto; }
          .pretty-table .ant-table-cell-fix-left {
            position: sticky;
            left: 0;
            z-index: 12 !important;
            background: #fff !important;
          }
          .pretty-table .ant-table-tbody > tr > td:first-child,
          .pretty-table .ant-table-thead > tr > th:first-child {
            padding-left: 8px !important;
            padding-right: 8px !important;
            max-width: 140px !important;
          }
          .ant-table.pretty-table .ant-table-tbody > tr > td {
            white-space: normal !important;
          }
        }

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
        .ant-table .ant-table-tbody > tr:hover > .ant-table-cell-fix-left,
        .ant-table .ant-table-tbody > tr.is-active > .ant-table-cell-fix-left {
          background: ${BRAND.rowHover} !important;
          z-index: 11 !important;
        }

        .floating-side { 
          display: flex; 
          justify-content: flex-end; 
          align-items: center; 
          padding: 12px; 
        }

        .floating-modal .ant-modal-content {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid ${BRAND.softBorder};
          background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.86));
          box-shadow: 0 24px 72px rgba(16,24,40,0.22);
        }

        .floating-modal .ant-modal-header {
          background: rgba(245,245,255,0.7);
          border-bottom: 1px solid ${BRAND.softBorder};
          border-radius: 18px 18px 0 0;
          padding: 10px 16px;
        }

        .floating-modal .ant-modal-body {
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px 12px 30px;
          max-height: calc(100vh - 140px);
          box-sizing: border-box;
        }

        @media (max-width: 576px) {
          .floating-side { 
            align-items: flex-start; 
            padding: 8px; 
          }
          .floating-side .ant-modal {
            margin: 0;
            width: 100% !important;
            max-width: 100% !important;
          }
          .floating-modal .ant-modal-content {
            border-radius: 16px;
            max-height: calc(100vh - 16px);
            display: flex;
            flex-direction: column;
          }
          .floating-modal .ant-modal-body {
            flex: 1;
            max-height: none;
            padding-bottom: 80px;
          }
          .ant-table { font-size: 12px; }
        }

        @media (max-width: 760px) {
          .floating-side { padding: 10px; }
        }

        /* Quick status layout */
        .quick-status-layout {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
        }
        .quick-status-main {
          flex: 1 1 220px;
          min-width: 0;
        }
        .quick-status-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        @media (max-width: 576px) {
          .quick-status-layout {
            flex-direction: column;
            align-items: stretch;
          }
          .quick-status-actions {
            justify-content: flex-end;
          }
        }

        /* Edit footer buttons – always inside card */
        .edit-footer-bar {
          margin-top: 16px;
          padding: 12px 8px 4px;
          box-sizing: border-box;
          border-top: 1px dashed rgba(148, 163, 184, 0.6);
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 480px) {
          .edit-footer-bar {
            flex-direction: column-reverse;
            align-items: stretch;
            padding: 12px 10px 4px;
          }
          .edit-footer-bar .ant-btn {
            width: 100%;
          }
        }

        .modal-inner-animate { animation: slideIn .28s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes slideIn {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </Layout>
  );
}
