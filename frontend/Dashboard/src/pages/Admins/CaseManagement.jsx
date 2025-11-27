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
  Grid,
  Row,
  Col,
  Divider,
  DatePicker,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  FormOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, getUserType } from "../../lib/api";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function CaseManagement() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;
  const isMdUp = !!screens.md;
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
  
  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  
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
        // Sort by createdAt in descending order (most recent first)
        formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
      const raw = data?.data ?? data ?? [];
      const arr = Array.isArray(raw) ? raw : (raw || []);
      if (arr.length) {
        const formatted = arr.map((r) => {
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
      } else {
        setReportsList([]);
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
      
      // Convert dateReported from dayjs to ISO string if it exists
      const dateReportedValue = vals.dateReported 
        ? vals.dateReported.toISOString() 
        : new Date().toISOString();
      
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
          dateReported: selectedReport.dateReported || dateReportedValue,
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
          dateReported: dateReportedValue,
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
    if (!rec) return;
    try {
      setLoading(true);
      const id = rec.caseID || rec._id;
      const res = await api.delete(`/api/cases/${id}`);
      if (res?.data?.success) {
        message.success("Case deleted");
        setDeleteModalOpen(false);
        setCaseToDelete(null);
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

  const showDeleteConfirm = (rec) => {
    setCaseToDelete(rec);
    setDeleteModalOpen(true);
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
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => handleViewCase(rec)}
              className="row-action"
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Edit Case">
            <Button
              type="text"
              icon={<FormOutlined />}
              onClick={() => handleEditCase(rec)}
              className="row-action"
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Delete Case">
            <Button
              type="text"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => showDeleteConfirm(rec)}
              className="row-action"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Simplified mobile columns for small screens
  const columnsMobile = [
    {
      title: "Case",
      dataIndex: "caseID",
      key: "caseID",
      render: (v) => <Text strong style={{ fontSize: 14 }}>{v}</Text>,
    },
    {
      title: "Type",
      dataIndex: "incidentType",
      key: "incidentType",
      render: (t) => <span style={{ fontSize: 13 }}>{t}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={statusColor(s)} style={{ borderRadius: 999 }}>{s}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, rec) => (
        <Space size={6}>
          <Tooltip title="View Details">
            <Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => handleViewCase(rec)} style={{ color: '#1890ff' }} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<FormOutlined />} onClick={() => handleEditCase(rec)} style={{ color: '#52c41a' }} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" size="small" danger icon={<CloseCircleOutlined />} onClick={() => showDeleteConfirm(rec)} />
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
          zIndex: 60,
          background: BRAND.bg,
          borderBottom: `1px solid ${BRAND.soft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: isMdUp ? 20 : 12,
          paddingBlock: isXs ? 8 : 12,
          height: isXs ? 64 : "auto",
          lineHeight: 1.2,
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {/* sidebar toggle (visible on small screens) */}
          {!isMdUp && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: isXs ? 36 : 40,
                height: isXs ? 36 : 40,
                minWidth: isXs ? 36 : 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "#ffffffcc",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                padding: 0,
                fontSize: 18,
              }}
            />
          )}

          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Case Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Review, create, and update cases
              </Text>
            )}
          </Space>
        </div>

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
            icon={!isMdUp ? undefined : undefined}
          >
            {isMdUp ? "Add Case" : "Add"}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAllCases}
            style={{ borderColor: BRAND.violet, color: BRAND.violet, borderRadius: 12, fontWeight: 700 }}
            title="Refresh"
          >
            {isMdUp ? "Refresh" : null}
          </Button>
        </Space>
      </Header>

      <Content
        style={{
          padding: screens.xs ? 8 : screens.sm ? 10 : 16,
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
            borderRadius: screens.xs ? 12 : 18,
            borderColor: BRAND.soft,
            boxShadow: "0 20px 46px rgba(122,90,248,0.06)",
          }}
          bodyStyle={{ padding: screens.xs ? 8 : screens.sm ? 12 : 16 }}
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
            <Space wrap size={screens.xs ? 4 : 8}>
              <Input
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={screens.xs ? "Search…" : "Search cases…"}
                prefix={<SearchOutlined />}
                style={{ 
                  width: screens.xs ? 140 : screens.sm ? 180 : 260, 
                  borderRadius: 999 
                }}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: screens.xs ? 120 : screens.sm ? 160 : 200 }}
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
            columns={screens.xs ? columnsMobile : columns}
            dataSource={filteredCases}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{
              x: screens.xs ? 'max-content' : 980,
              y: screens.xs ? 420 : screens.sm ? 460 : 520,
            }}
            tableLayout={screens.xs ? 'auto' : 'fixed'}
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
            width={screens.md ? 600 : "95%"}
            centered
            styles={{
              body: { 
                maxHeight: screens.xs ? "60vh" : "70vh", 
                overflowY: "auto", 
                padding: screens.xs ? "12px 16px" : "16px 24px" 
              }
            }}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="victimName"
                label="Victim Name"
                rules={[{ required: true, message: "Victim Name is required" }]}
              >
                <Input 
                  disabled={isViewMode}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
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
                <Input 
                  disabled={isViewMode}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item name="assignedOfficer" label="Assigned Officer">
                <Input 
                  disabled={isViewMode}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
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
            title={
              <div style={{ 
                padding: "8px 0", 
                borderBottom: `1px solid ${BRAND.soft}`,
                marginBottom: 16
              }}>
                <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
                  Create New Case
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Add a new case by selecting a report or entering details manually
                </Text>
              </div>
            }
            open={addModalVisible}
            onCancel={() => {
              setAddModalVisible(false);
              setSelectedReport(null);
              addForm.resetFields();
            }}
            footer={[
              <Button
                key="cancel"
                onClick={() => {
                  setAddModalVisible(false);
                  setSelectedReport(null);
                  addForm.resetFields();
                }}
              >
                Cancel
              </Button>,
              <Button
                key="submit"
                type="primary"
                onClick={() => {
                  addForm.validateFields().then((v) => handleCreateCase(v));
                }}
                style={{ background: BRAND.violet, borderColor: BRAND.violet }}
              >
                Create Case
              </Button>,
            ]}
            width={screens.md ? 800 : "95%"}
            centered
            styles={{
              body: { 
                maxHeight: screens.xs ? "60vh" : "70vh", 
                overflowY: "auto", 
                padding: screens.xs ? "12px 16px" : "16px 24px" 
              }
            }}
          >
            <Form form={addForm} layout="vertical">
              {/* Report Selection Section */}
              <Card 
                size="small" 
                style={{ 
                  background: "#f9f7ff", 
                  border: `1px solid ${BRAND.soft}`,
                  marginBottom: screens.xs ? 12 : 16,
                  borderRadius: 8,
                  padding: screens.xs ? "8px 12px" : undefined
                }}
                bodyStyle={{ 
                  padding: screens.xs ? 8 : undefined 
                }}
              >
                <Form.Item
                  name="reportID"
                  label={<Text strong>Link to Existing Report (Optional)</Text>}
                  help={<Text type="secondary" style={{ fontSize: 12 }}>Select a report to auto-fill case details, or leave blank for manual entry</Text>}
                >
                  <Select
                    showSearch
                    placeholder="Search and select a report..."
                    onChange={handleReportSelect}
                    // search against the label (string) so users can type reportID, incident type, or victim name
                    optionFilterProp="label"
                    optionLabelProp="label"
                    allowClear
                    size="large"
                    filterOption={(input, option) => {
                      if (!option?.label) return false;
                      return String(option.label).toLowerCase().includes(String(input).toLowerCase());
                    }}
                  >
                    {reportsList.map((r) => {
                      const victimName = r.victim ? `${r.victim.firstName || ""} ${r.victim.lastName || ""}`.trim() : "";
                      const label = `${r.reportID} ${r.incidentType || ""} ${victimName}`.trim();
                      return (
                        <Option key={r.reportID} value={r.reportID} label={label}>
                          <Space direction="vertical" size={0}>
                            <Text strong>{r.reportID}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {r.incidentType} • {r.victim?.firstName || ""} {r.victim?.lastName || ""}
                            </Text>
                          </Space>
                        </Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </Card>

              <Divider orientation="left" style={{ 
                color: BRAND.violet,
                margin: screens.xs ? "12px 0" : "24px 0"
              }}>
                Case Information
              </Divider>

              {/* Case ID and Status Row */}
              <Row gutter={screens.xs ? 8 : 16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="caseID" 
                    label={<Text strong>Case ID</Text>}
                    rules={[{ required: true, message: "Case ID is required" }]}
                  >
                    <Input 
                      placeholder="e.g., CASE001" 
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="riskLevel" 
                    label={<Text strong>Risk Level</Text>}
                  >
                    <Select placeholder="Select risk level" size="large">
                      <Option value="Low">
                        <Tag color="green">Low</Tag>
                      </Option>
                      <Option value="Medium">
                        <Tag color="orange">Medium</Tag>
                      </Option>
                      <Option value="High">
                        <Tag color="red">High</Tag>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ color: BRAND.violet }}>
                Victim Details
              </Divider>

              {/* Victim Information Row */}
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="victimName"
                    label={<Text strong>Victim Name</Text>}
                    rules={[{ required: true, message: "Victim name is required" }]}
                  >
                    <Input 
                      placeholder="Enter victim's full name" 
                      size="large"
                      onKeyPress={(e) => {
                        if (/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item 
                    name="victimType" 
                    label={<Text strong>Victim Type</Text>}
                  >
                    <Select placeholder="Select type" size="large" allowClear>
                      <Option value="child">Child</Option>
                      <Option value="woman">Woman</Option>
                      <Option value="anonymous">Anonymous</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ color: BRAND.violet }}>
                Incident Details
              </Divider>

              {/* Incident Type and Location Row */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="incidentType"
                    label={<Text strong>Incident Type</Text>}
                    rules={[{ required: true, message: "Incident type is required" }]}
                  >
                    <Select placeholder="Select incident type" size="large">
                      <Option value="Economic">Economic Abuse</Option>
                      <Option value="Psychological">Psychological Abuse</Option>
                      <Option value="Physical">Physical Abuse</Option>
                      <Option value="Sexual">Sexual Abuse</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="location" 
                    label={<Text strong>Location</Text>}
                  >
                    <Input placeholder="Enter incident location" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Date Reported */}
              <Form.Item 
                name="dateReported" 
                label={<Text strong>Date & Time Reported</Text>}
              >
                <DatePicker 
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  size="large"
                  placeholder="Select date and time"
                />
              </Form.Item>

              {/* Description */}
              <Form.Item
                name="description"
                label={<Text strong>Description</Text>}
                rules={[{ required: true, message: "Description is required" }]}
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Provide detailed description of the incident..."
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              {/* Perpetrator and Assigned Officer Row */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="perpetrator" 
                    label={<Text strong>Perpetrator</Text>}
                  >
                    <Input placeholder="Enter perpetrator's name (if known)" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="assignedOfficer"
                    label={<Text strong>Assigned Officer</Text>}
                    rules={[{ required: true, message: "Assigned officer is required" }]}
                  >
                    <Input placeholder="Enter officer's name" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="status" hidden>
                <Input type="hidden" />
              </Form.Item>
            </Form>
          </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <span>Confirm Delete</span>
            </Space>
          }
          open={deleteModalOpen}
          onCancel={() => {
            setDeleteModalOpen(false);
            setCaseToDelete(null);
          }}
          onOk={() => handleDeleteCase(caseToDelete)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, loading }}
          centered
        >
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>
              Are you sure you want to delete this case?
            </p>
            {caseToDelete && (
              <div style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 8,
                marginTop: 12 
              }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Case ID: {caseToDelete.caseID}</Text>
                    <Tag color={
                      caseToDelete.status === 'Closed' ? 'green' :
                      caseToDelete.status === 'In Progress' ? 'blue' :
                      caseToDelete.status === 'Under Investigation' ? 'orange' :
                      'default'
                    }>
                      {caseToDelete.status}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Type: {caseToDelete.incidentType}
                  </Text>
                  {caseToDelete.location && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Location: {caseToDelete.location}
                    </Text>
                  )}
                  {caseToDelete.assignedOfficer && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Assigned Officer: {caseToDelete.assignedOfficer}
                    </Text>
                  )}
                  {caseToDelete.riskLevel && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color={
                        caseToDelete.riskLevel === 'High' ? 'red' :
                        caseToDelete.riskLevel === 'Medium' ? 'orange' :
                        'green'
                      }>
                        Risk: {caseToDelete.riskLevel}
                      </Tag>
                    </div>
                  )}
                </Space>
              </div>
            )}
            <p style={{ marginTop: 16, marginBottom: 0, color: '#666', fontSize: 13 }}>
              This action cannot be undone. The case will be permanently removed from the system.
            </p>
          </div>
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

        /* Mobile adjustments: tighter padding and allow wrapping */
        @media (max-width: 576px) {
          .pretty-table .ant-table-thead > tr > th {
            padding: 10px 12px !important;
            font-size: 13px;
          }
          .pretty-table .ant-table-tbody > tr > td {
            padding: 10px 12px !important;
            white-space: normal !important;
          }
          .pretty-table .ant-table-container { overflow: visible; }
          .pretty-table .ant-table-wrapper { overflow-x: auto; }
        }
        .row-action {
          border-radius: 10px;
        }
        .ant-input,
        .ant-input-affix-wrapper,
        .ant-select-selector,
        .ant-btn:not(.ant-btn-circle) {
          border-radius: 12px !important;
        }
        .ant-input:focus,
        .ant-input-affix-wrapper-focused,
        .ant-select-focused .ant-select-selector,
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        .ant-btn:focus-visible,
        button:focus,
        button:active {
          outline: none !important;
        }
        .ant-btn:focus-visible {
          border-color: ${BRAND.violet} !important;
          box-shadow: 0 0 0 2px rgba(122,90,248,0.15) !important;
        }
      `}</style>
    </Layout>
  );
}
