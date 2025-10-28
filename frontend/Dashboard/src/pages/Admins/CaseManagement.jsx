// src/pages/admin/CaseManagement.jsx (or your current path)
import React, { useEffect, useState } from "react";
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
  Tooltip,
  Modal,
  Form,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { api, getUserType } from "../../lib/api";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function CaseManagement() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [reportsList, setReportsList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [userType, setUserType] = useState(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const navigate = useNavigate();

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    bg: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    soft: "rgba(122,90,248,0.18)",
    chip: "#fff0f7",
  };

  const fetchAllCases = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/cases");
      if (data) {
        const formatted = (data.data || []).map((c) => ({
          key: c.caseID,
          caseID: c.caseID,
          reportID: c.reportID,
          victimID: c.victimID,
          incidentType: c.incidentType,
          description: c.description,
          perpetrator: c.perpetrator,
          location: c.location,
          dateReported: c.dateReported,
          status: c.status,
          assignedOfficer: c.assignedOfficer,
          riskLevel: c.riskLevel,
          createdAt: c.createdAt,
        }));
        setAllCases(formatted);
        setFilteredCases(formatted);
      }
    } catch (err) {
      console.error("Error fetching cases", err);
      message.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCases();
    
    const fetchUserType = async () => {
      try {
        const type = await getUserType();
        setUserType(type);
      } catch (err) {
        console.error("Failed to get user type", err);
        setUserType("user"); // fallback
      }
    };
    fetchUserType();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await api.get("/api/reports");
      if (data?.success) {
        const formatted = data.data.map((r) => {
          let victim = null;
          if (r.victimID) {
            const { location, ...victimNoLocation } = r.victimID;
            victim = victimNoLocation;
          }
          return {
            key: r.reportID,
            reportID: r.reportID,
            victim,
            incidentType: r.incidentType,
            description: r.description,
            perpetrator: r.perpetrator,
            location: r.location,
            dateReported: r.dateReported,
            status: r.status,
            createdAt: r.createdAt,
            raw: r,
          };
        });
        setReportsList(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    }
  };

  const handleViewCase = (rec) => {
    const base = userType === "official" ? "/admin/official-cases" : "/admin/cases";
    navigate(`${base}/${rec.caseID}`);
  };

  const handleEditCase = (rec) => {
    const base = userType === "official" ? "/admin/official-cases" : "/admin/cases";
    navigate(`${base}/${rec.caseID}?edit=true`);
  };

  const openAddModal = async () => {
    setAddModalVisible(true);
    setSelectedReport(null);
    addForm.resetFields();
    // ensure status defaults to Open for new cases
    addForm.setFieldsValue({ status: 'Open' });
    await fetchReports();
  };

  const handleReportSelect = (reportID) => {
    const rep = reportsList.find((r) => r.reportID === reportID);
    setSelectedReport(rep || null);
    if (rep) {
      const nameParts = [];
      if (rep.victim) {
        if (rep.victim.firstName) nameParts.push(rep.victim.firstName);
        if (rep.victim.middleInitial) nameParts.push(rep.victim.middleInitial);
        if (rep.victim.lastName) nameParts.push(rep.victim.lastName);
      }
      const composedName = nameParts.length
        ? nameParts.join(" ").trim()
        : rep.victim?.victimID || "";

      addForm.setFieldsValue({
        reportID: rep.reportID,
        incidentType: rep.incidentType,
        description: rep.description,
        perpetrator: rep.perpetrator || "",
        location: rep.location || "",
        victimName: composedName,
        victimType: rep.victim?.victimType || "anonymous",
        riskLevel: (function (it) {
          if (!it) return "Low";
          const l = String(it).toLowerCase();
          if (l.includes("emerg")) return undefined;
          if (l.includes("economic") || l.includes("financial")) return "Low";
          if (l.includes("psych")) return "Medium";
          if (l.includes("physical")) return "High";
          if (l.includes("sexual")) return "High";
          return "Low";
        })(rep.incidentType),
      });
    }
  };

  const handleCreateCase = async (vals) => {
    try {
      setLoading(true);
      let payload;
      if (selectedReport) {
        payload = {
          caseID: vals.caseID,
          reportID: selectedReport.reportID,
          victimID: selectedReport.raw.victimID?._id || selectedReport.raw.victimID || null,
          victimName:
            vals.victimName ||
            (selectedReport.victim
              ? `${selectedReport.victim.firstName || ""} ${selectedReport.victim.middleInitial ? selectedReport.victim.middleInitial + " " : ""
                }${selectedReport.victim.lastName || ""}`.trim()
              : selectedReport.raw.victimID || ""),
          incidentType: selectedReport.incidentType,
          description: selectedReport.description,
          perpetrator: selectedReport.perpetrator || "",
          location: selectedReport.location || "",
          dateReported: selectedReport.dateReported || new Date().toISOString(),
          status: vals.status || "Open",
          assignedOfficer: vals.assignedOfficer || "",
          riskLevel:
            typeof vals.riskLevel === "undefined" ? undefined : vals.riskLevel || "Low",
          victimType: vals.victimType || selectedReport.victim?.victimType || "anonymous",
        };
      } else {
        payload = {
          caseID: vals.caseID,
          reportID: vals.reportID || null,
          victimID: vals.victimID || null,
          victimName: vals.victimName,
          incidentType: vals.incidentType,
          description: vals.description,
          perpetrator: vals.perpetrator || "",
          location: vals.location || "",
          dateReported: vals.dateReported || new Date().toISOString(),
          status: vals.status || "Open",
          assignedOfficer: vals.assignedOfficer || "",
          riskLevel:
            typeof vals.riskLevel === "undefined" ? undefined : vals.riskLevel || "Low",
          victimType: vals.victimType || "anonymous",
        };
      }

      const res = await api.post("/api/cases", payload);
      if (res?.data?.success) {
        message.success("Case created");
        setAddModalVisible(false);
        addForm.resetFields();
        fetchAllCases();
      } else {
        message.error(res?.data?.message || "Failed to create case");
      }
    } catch (err) {
      console.error("Create case error", err.response || err);
      const resp = err?.response?.data;
      if (resp) {
        if (resp.message && String(resp.message).toLowerCase().includes("duplicate")) {
          addForm.setFields([
            { name: "caseID", errors: [resp.message || "Case ID already exists"] },
          ]);
          message.error(resp.message || "Duplicate Case ID");
        } else if (resp.errors && typeof resp.errors === "object") {
          const fields = Object.keys(resp.errors).map((k) => ({
            name: k,
            errors: [resp.errors[k]],
          }));
          try {
            addForm.setFields(fields);
          } catch { }
          message.error(resp.message || "Validation failed");
        } else {
          message.error(resp.message || "Failed to create case");
        }
      } else {
        message.error("Failed to create case");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCase = async (rec) => {
    try {
      setLoading(true);
      const id = rec.caseID || rec._id;
      const res = await api.delete(`/api/cases/${id}`);
      if (res?.data?.success) {
        message.success("Case deleted");
      } else {
        message.error(res?.data?.message || "Delete failed");
      }
      fetchAllCases();
    } catch (err) {
      console.error("Delete failed", err.response || err);
      message.error(err.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCase = async (vals) => {
    if (!editingCase) {
      message.error("No case selected for update");
      return;
    }
    try {
      setLoading(true);
      const id = editingCase.caseID || editingCase._id;
      const payload = {
        ...vals,
        perpetrator: vals.perpetrator || "",
        victimName: vals.victimName || editingCase.victimName || "",
      };
      const res = await api.put(`/api/cases/${id}`, payload);
      if (res?.data?.success) {
        message.success("Case updated");
        setEditModalVisible(false);
        setEditingCase(null);
      } else {
        message.error(res?.data?.message || "Failed to update case");
      }
      fetchAllCases();
    } catch (err) {
      console.error("Update failed", err.response || err);
      message.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let f = allCases;
    if (filterType !== "all") f = f.filter((c) => c.status === filterType);
    if (searchText) {
      const s = searchText.toLowerCase();
      f = f.filter(
        (c) =>
          c.caseID?.toLowerCase().includes(s) ||
          c.incidentType?.toLowerCase().includes(s) ||
          c.assignedOfficer?.toLowerCase().includes(s)
      );
    }
    setFilteredCases(f);
  }, [allCases, searchText, filterType]);

  const statusColor = (s) => {
    const v = String(s || "").toLowerCase();
    if (v.includes("open")) return "orange";
    if (v.includes("investigation") || v.includes("progress")) return "geekblue";
    if (v.includes("resolved")) return "green";
    if (v.includes("cancel")) return "default";
    return "default";
  };
  const riskColor = (r) => {
    const v = String(r || "").toLowerCase();
    if (v.includes("high")) return "magenta";
    if (v.includes("medium")) return "volcano";
    if (v.includes("low")) return "gold";
    return "default";
  };

  const columns = [
    {
      title: "Case ID",
      dataIndex: "caseID",
      key: "caseID",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Report ID",
      dataIndex: "reportID",
      key: "reportID",
      render: (r) => r || <Text type="secondary">N/A</Text>,
    },
    { title: "Incident Type", dataIndex: "incidentType", key: "incidentType" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={statusColor(s)} style={{ borderRadius: 999 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: "Assigned Officer",
      dataIndex: "assignedOfficer",
      key: "assignedOfficer",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Risk",
      dataIndex: "riskLevel",
      key: "riskLevel",
      render: (r) => (
        <Tag color={riskColor(r)} style={{ borderRadius: 999 }}>
          {r || "—"}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "dateReported",
      key: "dateReported",
      render: (d) => (d ? new Date(d).toLocaleString() : ""),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, rec) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewCase(rec)}
              className="row-action"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditCase(rec)}
              className="row-action"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteCase(rec)}
              className="row-action"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: BRAND.bg }}>
      {/* Sticky header (matches dashboard look) */}
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
            Case Management
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Review, create, and update cases
          </Text>
        </Space>

        <Space wrap>
          <Button
            type="primary"
            onClick={openAddModal}
            style={{
              background: BRAND.violet,
              borderColor: BRAND.violet,
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            Add Case
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAllCases}
            style={{ borderColor: BRAND.violet, color: BRAND.violet, borderRadius: 12, fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Space>
      </Header>

      <Content
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "center",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <Card
          bordered
          style={{
            width: "100%",
            maxWidth: 1320,
            borderRadius: 18,
            borderColor: BRAND.soft,
            boxShadow: "0 20px 46px rgba(122,90,248,0.06)",
          }}
          bodyStyle={{ padding: 16 }}
          title={
            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Space direction="vertical" size={10}>
                <Text strong style={{ color: "#000000ff" }}>
                  All Cases
                </Text>
              </Space>
            </div>
          }
          extra={
            <Space wrap>
              <Input
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search cases…"
                prefix={<SearchOutlined />}
                style={{ width: 260, borderRadius: 999 }}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 200 }}
                dropdownMatchSelectWidth={220}
              >
                <Option value="all">All Cases</Option>
                <Option value="Open">Open</Option>
                <Option value="Under Investigation">In-Progress</Option>
                <Option value="Resolved">Resolved</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Space>
          }
        >
          <Table
            rowKey="caseID"
            columns={columns}
            dataSource={filteredCases}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 980, y: 520 }}
            className="pretty-table"
          />

          {/* Edit / View Modal (kept functional behavior) */}
          <Modal
            title={
              editingCase
                ? `${isViewMode ? "View" : "Edit"} Case • ${editingCase?.caseID}`
                : "Case"
            }
            open={editModalVisible}
            onCancel={() => {
              setEditModalVisible(false);
              setEditingCase(null);
              setIsViewMode(false);
            }}
            okText="Save"
            onOk={() => {
              form.validateFields().then((v) => handleUpdateCase(v));
            }}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="victimName"
                label="Victim Name"
                rules={[{ required: true, message: "Victim Name is required" }]}
              >
                <Input disabled={isViewMode} />
              </Form.Item>
              <Form.Item
                name="incidentType"
                label="Incident Type"
                rules={[{ required: true }]}
              >
                <Input disabled={isViewMode} />
              </Form.Item>
              <Form.Item name="location" label="Location">
                <Input disabled={isViewMode} />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} disabled={isViewMode} />
              </Form.Item>
              <Form.Item name="perpetrator" label="Perpetrator">
                <Input disabled={isViewMode} />
              </Form.Item>
              <Form.Item name="assignedOfficer" label="Assigned Officer">
                <Input disabled={isViewMode} />
              </Form.Item>
              <Form.Item name="riskLevel" label="Risk Level">
                <Select disabled={isViewMode}>
                  <Option value="Low">Low</Option>
                  <Option value="Medium">Medium</Option>
                  <Option value="High">High</Option>
                </Select>
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Select disabled={isViewMode}>
                  <Option value="Open">Open</Option>
                  <Option value="Under Investigation">In-Progress</Option>
                  <Option value="Resolved">Resolved</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Form>
          </Modal>

          {/* Add Case Modal */}
          <Modal
            title="Create Case"
            open={addModalVisible}
            onCancel={() => {
              setAddModalVisible(false);
              setSelectedReport(null);
            }}
            okText="Create"
            onOk={() => {
              addForm.validateFields().then((v) => handleCreateCase(v));
            }}
          >
            <Form form={addForm} layout="vertical">
              <Form.Item
                name="reportID"
                label="Select Report (optional)"
                help="Pick a report to prefill fields, or leave blank to add a manual/walk-in case"
              >
                <Select
                  showSearch
                  placeholder="Optional: select a report to base case on"
                  onChange={handleReportSelect}
                  optionFilterProp="children"
                  allowClear
                >
                  {reportsList.map((r) => (
                    <Option key={r.reportID} value={r.reportID}>
                      {r.reportID} — {r.incidentType} — {r.victim?.firstName || ""}{" "}
                      {r.victim?.lastName || ""}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="victimName"
                label="Victim Name"
                rules={[{ required: true, message: "Victim Name is required" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item name="victimType" label="Victim Type">
                <Select placeholder="" allowClear>
                  <Option value="child">Child</Option>
                  <Option value="woman">Woman</Option>
                  <Option value="anonymous">Anonymous</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="incidentType"
                label="Incident Type"
                rules={[{ required: true, message: "Incident Type is required" }]}
              >
                <Select>
                  <Option value="Economic">Economic</Option>
                  <Option value="Psychological">Psychological</Option>
                  <Option value="Physical">Physical</Option>
                  <Option value="Sexual">Sexual</Option>
                </Select>
              </Form.Item>

              <Form.Item name="location" label="Location">
                <Input />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: "Description is required" }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item name="perpetrator" label="Perpetrator">
                <Input />
              </Form.Item>

              <Form.Item name="caseID" label="Case ID" rules={[{ required: true }]}>
                <Input placeholder="Enter Case ID (e.g. CASE001)" />
              </Form.Item>

              <Form.Item
                name="assignedOfficer"
                label="Assigned Officer"
                rules={[{ required: true }]}
              >
                <Input placeholder="Officer assigned to this case" />
              </Form.Item>

              <Form.Item name="riskLevel" label="Risk Level">
                <Select>
                  <Option value="Low">Low</Option>
                  <Option value="Medium">Medium</Option>
                  <Option value="High">High</Option>
                </Select>
              </Form.Item>

              <Form.Item name="status" hidden>
                <Input type="hidden" />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </Content>

      {/* Polish (rounded controls, violet focus, glassy table) */}
      <style>{`
        .pretty-table .ant-table {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid ${BRAND.soft};
          background: #fff;
        }
        .pretty-table .ant-table-thead > tr > th {
          background: #faf7ff;
          color: #5a4ae6;
          font-weight: 700;
        }
        .pretty-table .ant-table-tbody > tr:hover > td {
          background: #fbf8ff !important;
        }
        .row-action {
          border-radius: 10px;
        }
        .ant-input,
        .ant-input-affix-wrapper,
        .ant-select-selector,
        .ant-btn {
          border-radius: 12px !important;
        }
        .ant-input:focus,
        .ant-input-affix-wrapper-focused,
        .ant-select-focused .ant-select-selector,
        .ant-btn:focus-visible {
          border-color: ${BRAND.violet} !important;
          box-shadow: 0 0 0 2px rgba(122,90,248,0.15) !important;
          outline: none !important;
        }
      `}</style>
    </Layout>
  );
}
