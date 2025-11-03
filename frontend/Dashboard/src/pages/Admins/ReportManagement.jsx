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
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { RangePicker } = DatePicker;

export default function ReportManagement() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();

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
  const HEADER_H = 0; // sticky header is in normal flow (matching AlertsManagement)
  const TOP_PAD = 12;
  const [tableY, setTableY] = useState(520);
  const pageRef = useRef(null);

  // Compute available table height responsively
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

  // Right-side modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("view"); // view | edit
  const [activeReport, setActiveReport] = useState(null);
  const [form] = Form.useForm();

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
        fetchAllReports();
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
  }, [allReports, searchText, statusFilter, dateRange]);

  // === Columns ===
  const columns = useMemo(
    () => [
      {
        title: "Report",
        key: "report",
        fixed: "left",
        width: 280,
        render: (_, record) => (
          <Space>
            <Avatar
              style={{ background: typePillBg, color: "#444" }}
              icon={<AlertOutlined />}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{record.reportID}</div>
              <div style={{ fontSize: 12, color: "#999" }}>
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

  const modalWidth = screens.xl ? 720 : screens.lg ? 680 : screens.md ? "92vw" : "96vw";

  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "hidden",
      }}
    >
      {/* Alerts-style sticky header with mobile sidebar toggle */}
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
          {/* sidebar toggle only on small screens */}
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
            <Typography.Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Report Management
            </Typography.Title>
            {screens.md && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Review, manage, and monitor reports submitted by victims.
              </Typography.Text>
            )}
          </div>
        </div>
      </Header>

      <Content
        ref={pageRef}
        style={{
          padding: TOP_PAD,
          paddingTop: TOP_PAD, // no fixed header offset needed
          width: "100%",
          minWidth: 0,
          marginLeft: 0,
          overflow: "hidden",
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
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingInline: screens.xs ? 6 : 12,
            transition: "width .25s ease",
            boxSizing: "border-box",
          }}
        >
          {/* KPIs */}
          <Row gutter={[10, 10]}>
            {[
              ["Total Reports", reportCounts.total, BRAND.violet],
              ["Open", reportCounts.open, "orange"],
              ["Under Investigation", reportCounts.inProgress, BRAND.blue],
              ["Closed", reportCounts.closed, BRAND.green],
            ].map(([label, value, color], i) => (
              <Col xs={12} md={6} key={i}>
                <Card style={{ ...glassCard, padding: 10 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {label}
                  </Typography.Text>
                  <Typography.Title
                    level={3}
                    style={{ margin: 0, color, fontSize: 24 }}
                  >
                    {value}
                  </Typography.Title>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Toolbar */}
          <Card style={{ ...glassCard, padding: 10 }}>
            <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Space wrap>
                <Search
                  placeholder="Search report ID, type, location…"
                  allowClear
                  enterButton={<SearchOutlined />}
                  style={{ width: 220 }}
                  value={searchText}
                  onSearch={setSearchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 220 }}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "Open", label: "Open" },
                    { value: "Under Investigation", label: "Under Investigation" },
                    { value: "Closed", label: "Closed" },
                    { value: "Pending", label: "Pending" },
                  ]}
                />
                <RangePicker
                  onChange={setDateRange}
                  allowEmpty={[true, true]}
                  placeholder={["Start", "End"]}
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: screens.xs ? 220 : 260 }}
                />
              </Space>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchAllReports}
                  title="Refresh"
                >
                  {screens.md ? "Refresh" : null}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={exportCsv}
                  title="Export"
                >
                  {screens.md ? "Export" : null}
                </Button>
              </Space>
            </Space>
          </Card>

          {/* Table */}
          <Card style={{ ...glassCard, padding: 0 }}>
            <Table
              columns={columns}
              dataSource={filteredReports}
              loading={loading}
              size="middle"
              sticky
              rowKey="key"
              pagination={false}
              tableLayout="fixed"
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
          centered={false}
          width={modalWidth}
          wrapClassName="floating-side"
          className="floating-modal"
          maskStyle={{
            backdropFilter: "blur(2px)",
            background: "rgba(17,17,26,0.24)",
          }}
          getContainer={false}
          title={
            activeReport ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Space>
                  <Avatar
                    style={{ background: typePillBg, color: "#444" }}
                    icon={<AlertOutlined />}
                  />
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {activeReport.reportID}{" "}
                      <Tag style={{ marginLeft: 6 }}>{activeReport.incidentType}</Tag>
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
                <Space>
                  {mode === "view" ? (
                    <Button
                      type="primary"
                      onClick={() => setMode("edit")}
                      icon={<EditOutlined />}
                      style={{ background: BRAND.violet, borderColor: BRAND.violet }}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button onClick={() => setMode("view")}>Cancel</Button>
                  )}
                  <Button danger onClick={handleDeleteReport}>
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
            <Row gutter={12} align="middle">
              <Col flex="1">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Quick Status</div>
                <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>
                  Update case status quickly without editing the whole report.
                </div>
                <Select
                  value={quickStatus}
                  onChange={setQuickStatus}
                  options={[
                    { label: "Pending", value: "Pending" },
                    { label: "Open", value: "Open" },
                    { label: "Under Investigation", value: "Under Investigation" },
                    { label: "Closed", value: "Closed" },
                  ]}
                  style={{ width: 260 }}
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  loading={statusUpdating}
                  onClick={() => handleUpdateStatus(quickStatus)}
                  style={{
                    background: BRAND.violet,
                    borderColor: BRAND.violet,
                    marginLeft: 8,
                  }}
                >
                  Save
                </Button>
              </Col>
            </Row>
          </Card>

          {activeReport && (
            <div className="modal-inner-animate">
              {/* Details */}
              <Card style={{ ...glassCard, borderRadius: 16, marginBottom: 10 }}>
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
                          { required: true, message: "Please select the incident type" },
                        ]}
                      >
                        <Select
                          options={[
                            { value: "Physical", label: "Physical" },
                            { value: "Sexual", label: "Sexual" },
                            { value: "Psychological", label: "Psychological" },
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
                            { value: "Under Investigation", label: "Under Investigation" },
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
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <Button onClick={() => setMode("view")}>Cancel</Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        style={{ background: BRAND.violet, borderColor: BRAND.violet }}
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
      </Content>

      {/* === Styles === */}
      <style>{`
        html, body, #root { height: 100%; }
        .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
        .ant-card:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(16,24,40,0.08); }
        .ant-table-thead > tr > th { background: #fff !important; }

        /* Row hover */
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

        /* SIDE + VERTICAL CENTER (sticky header is in flow; HEADER_H = 0) */
        .floating-side
          flex-direction: column;
        }

        .floating-modal .ant-modal-header {
          background: rgba(250,250,255,0.9);
          border-bottom: 1px solid ${BRAND.softBorder};
          border-radius: 14px 14px 0 0;
          padding: 8px 14px;
        }

        /* Body scrolls independently; keeps outside gaps equal */
        .floating-modal .ant-modal-body {
          overflow: auto;
          padding: 12px;
          max-height: calc(100vh - ${HEADER_H}px - 24px - 56px);
        }

        @media (max-width: 768px) {
          .floating-side { padding: 10px; }
          .floating-side .ant-modal,
          .floating-modal .ant-modal-content {
            max-height: calc(100vh - ${HEADER_H}px - 20px);
          }
          .ant-table { font-size: 12px; }
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
