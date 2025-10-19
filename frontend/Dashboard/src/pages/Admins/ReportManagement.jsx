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
  Descriptions,
  Modal,
  Form,
  Row,
  Col,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { Option } = Select;

export default function ReportManagement() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [form] = Form.useForm();

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/reports");

      if (data.success) {
        const formattedReports = data.data.map((r) => {
          // Remove the victim's location (latitude/longitude) for privacy
          let victim = null;
          if (r.victimID) {
            // keep all victim fields except location
            const { location, ...victimNoLocation } = r.victimID;
            victim = victimNoLocation;
          }

          return {
            key: r.reportID,
            reportID: r.reportID,
            victimID: victim,
            incidentType: r.incidentType,
            description: r.description,
            perpetrator: r.perpetrator,
            location: r.location,
            dateReported: r.dateReported,
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        });

        setAllReports(formattedReports);
        setFilteredReports(formattedReports);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      message.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, []);

  const handleViewReport = (record) => {
    setEditingReport(record);
    form.setFieldsValue(record);
    setIsViewMode(true);
    setEditModalVisible(true);
  };

  const handleEditReport = (record) => {
    // Make sure the perpetrator field exists (use empty string if missing)
    const patchedRecord = { ...record, perpetrator: record.perpetrator || '' };
    setEditingReport(patchedRecord);
    form.setFieldsValue(patchedRecord);
    setIsViewMode(false);
    setEditModalVisible(true);
  };

  const handleDeleteReport = async (record) => {
    try {
      setLoading(true);
      const res = await api.delete(`/api/reports/${record.reportID}`);
      if (res?.data?.success) {
        message.success("Report deleted");
      } else {
        message.error("Failed to delete report");
      }
      fetchAllReports();
    } catch (err) {
      console.error("Delete failed", err.response || err);
      message.error("Failed to delete report");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (values) => {
    try {
      setLoading(true);
      // Include the perpetrator field in the update (empty string if not set)
      const payload = { ...values, perpetrator: values.perpetrator || '' };
      const res = await api.put(`/api/reports/${editingReport.reportID}`, payload);
      if (res?.data?.success) {
        message.success("Report updated");
        setEditModalVisible(false);
        setEditingReport(null);
      } else {
        message.error("Failed to update report");
      }
      fetchAllReports();
    } catch (err) {
      console.error("Update failed", err.response || err);
      message.error("Failed to update report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = allReports;

    if (filterType !== "all") {
      filtered = filtered.filter((r) => r.status === filterType);
    }

    if (searchText) {
      filtered = filtered.filter(
        (r) =>
          r.reportID.toLowerCase().includes(searchText.toLowerCase()) ||
          r.incidentType.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  }, [allReports, searchText, filterType]);

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'open':
        return 'orange';
      case 'under investigation':
        return 'blue';
      case 'closed':
        return 'green';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRiskColor = (level) => {
    const l = (level || '').toLowerCase();
    switch (l) {
      case 'low':
        return 'green';
      case 'medium':
        return 'orange';
      case 'high':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: "Victim ID",
      dataIndex: "victimID",
      key: "victimID",
      render: (victim) => {
        if (!victim) return <Tag color="default">N/A</Tag>;
        // victim can be an object or a string; pick the ID to show
        const id = typeof victim === 'string' ? victim : victim.victimID || victim._id || 'N/A';
        return <Tag color="magenta">{id}</Tag>;
      },
      width: 160,
    },
    {
      title: "Report ID",
      dataIndex: "reportID",
      key: "reportID",
      render: (text) => <Tag icon={<AlertOutlined />} color="blue">{text}</Tag>,
    },
    {
      title: "Incident Type",
      dataIndex: "incidentType",
      key: "incidentType",
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (loc) => <Tag icon={<EnvironmentOutlined />} color="geekblue">{loc}</Tag>
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag icon={<ExclamationCircleOutlined />} color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },

    {
      title: "Date Reported",
      dataIndex: "dateReported",
      key: "dateReported",
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => handleViewReport(record)} />
          </Tooltip>
          <Tooltip title="Edit Report">
            <Button type="link" icon={<EditOutlined />} size="small" onClick={() => handleEditReport(record)} />
          </Tooltip>
          <Tooltip title="Delete Report">
            <Button type="link" icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteReport(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const PINK = "#e91e63";
  const LIGHT_PINK = "#fff0f5";
  const SOFT_PINK = "#ffd1dc";

  const reportCounts = {
    total: allReports.length,
    open: allReports.filter((r) => (r.status || '').toLowerCase() === "open").length,
    inProgress: allReports.filter((r) => {
      const s = (r.status || '').toLowerCase();
      return s === 'under investigation' || s === 'in-progress';
    }).length,
    closed: allReports.filter((r) => (r.status || '').toLowerCase() === "closed").length,
  };

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: LIGHT_PINK }}>
      <Header
        style={{
          background: "#fff",
          borderBottom: `1px solid ${SOFT_PINK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0, color: PINK }}>
          Report Management
        </Typography.Title>
        <Button
          onClick={fetchAllReports}
          icon={<ReloadOutlined />}
          style={{ borderColor: PINK, color: PINK }}
        >
          Refresh
        </Button>
      </Header>

      <Content style={{ padding: 16, overflowX: "hidden" }}>
        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
              <Typography.Text type="secondary">Total Reports</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                {reportCounts.total}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
              <Typography.Text type="secondary">Open</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: "orange" }}>
                {reportCounts.open}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
              <Typography.Text type="secondary">Under Investigation</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: "blue" }}>
                {reportCounts.inProgress}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
              <Typography.Text type="secondary">Closed</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: "green" }}>
                {reportCounts.closed}
              </Typography.Title>
            </Card>
          </Col>
        </Row>

        {/* Reports Table */}
        <Card
          title="All Reports"
          style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
          extra={
            <Space>
              <Search
                placeholder="Search reports..."
                allowClear
                enterButton={<SearchOutlined />}
                style={{ width: 250 }}
                onSearch={setSearchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 150 }}
              >
                <Option value="all">All Status</Option>
                <Option value="Open">Open</Option>
                <Option value="Under Investigation">In-Progress</Option>
                <Option value="Closed">Closed</Option>
              </Select>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredReports}
            loading={loading}
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} reports`,
            }}
            scroll={{ x: "max-content", y: 480 }}
          />

          {/* VIEW MODAL */}
          <Modal
            title={`Report Details - ${editingReport?.reportID}`}
            open={isViewMode && editModalVisible}
            onCancel={() => {
              setEditModalVisible(false);
              setEditingReport(null);
              setIsViewMode(false);
            }}
            footer={[
              <Button key="close" onClick={() => setEditModalVisible(false)}>
                Close
              </Button>,
            ]}
            width={600}
          >
            {editingReport && (
              <Descriptions
                bordered
                column={1}
                size="middle"
                labelStyle={{ fontWeight: 600, width: 160 }}
              >
                <Descriptions.Item label="Report ID">
                  <Tag color="blue">{editingReport.reportID}</Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Victim ID">
                  {editingReport.victimID?.victimID ? (
                    <Tag color="magenta">{editingReport.victimID.victimID}</Tag>
                  ) : (
                    "N/A"
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Incident Type">
                  {editingReport.incidentType}
                </Descriptions.Item>

                <Descriptions.Item label="Location">
                  <Tag icon={<EnvironmentOutlined />} color="geekblue">
                    {editingReport.location}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Description">
                  <Typography.Paragraph
                    style={{ whiteSpace: "pre-line", marginBottom: 0 }}
                  >
                    {editingReport.description || "No description provided."}
                  </Typography.Paragraph>
                </Descriptions.Item>

                <Descriptions.Item label="Perpetrator">
                  {editingReport.perpetrator || "N/A"}
                </Descriptions.Item>

                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(editingReport.status)}>
                    {editingReport.status}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Date Reported">
                  {new Date(editingReport.dateReported).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Modal>

          {/* EDIT MODAL */}
          <Modal
            title={`Edit Report - ${editingReport?.reportID}`}
            open={!isViewMode && editModalVisible}
            onCancel={() => {
              setEditModalVisible(false);
              setEditingReport(null);
              setIsViewMode(false);
            }}
            okText="Save"
            onOk={() => form.validateFields().then((vals) => handleUpdateReport(vals))}
          >
            <Form
              form={form}
              layout="horizontal"
              labelCol={{ flex: "120px" }}
              wrapperCol={{ flex: 1 }}
              labelAlign="left"
            >
              <Form.Item
                name="incidentType"
                label="Incident Type"
                rules={[{ required: true, message: "Please select the type of incident" }]}
                style={{ marginBottom: 12, marginTop: 20 }}
              >
                <Select placeholder="Select type">
                  <Option value="Physical">Physical</Option>
                  <Option value="Sexual">Sexual</Option>
                  <Option value="Psychological">Psychological</Option>
                  <Option value="Economic">Economic</Option>
                  <Option value="Emergency">Emergency</Option>
                </Select>
              </Form.Item>

              <Form.Item name="location" label="Location" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="Description" style={{ marginBottom: 12 }}>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="perpetrator" label="Perpetrator" style={{ marginBottom: 12 }}>
                <Input />
              </Form.Item>
              <Form.Item name="status" label="Status" style={{ marginBottom: 12 }}>
                <Select>
                  <Option value="Pending">Pending</Option>
                  <Option value="Open">Open</Option>
                  <Option value="Under Investigation">In-Progress</Option>
                  <Option value="Closed">Closed</Option>
                </Select>
              </Form.Item>
            </Form>
          </Modal>

        </Card>
      </Content>
    </Layout>
  );
}
