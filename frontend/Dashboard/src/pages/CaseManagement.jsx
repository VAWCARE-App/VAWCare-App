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
  Row,
  Col,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { api } from "../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
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
  const [form] = Form.useForm();

  const fetchAllCases = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/cases");
      if (data) {
        const formatted = data.data.map((c) => ({
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
      console.error('Error fetching cases', err);
      message.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllCases(); }, []);

  const handleViewCase = (rec) => { setEditingCase(rec); form.setFieldsValue(rec); setIsViewMode(true); setEditModalVisible(true); };
  const handleEditCase = (rec) => { const patched = { ...rec, perpetrator: rec.perpetrator || '' }; setEditingCase(patched); form.setFieldsValue(patched); setIsViewMode(false); setEditModalVisible(true); };

  const handleDeleteCase = async (rec) => {
    try { setLoading(true); const res = await api.delete(`/api/cases/${rec.caseID}`); if (res?.data) message.success('Case deleted'); fetchAllCases(); } catch (err) { console.error(err); message.error('Delete failed'); } finally { setLoading(false); }
  };

  const handleUpdateCase = async (vals) => {
    try { setLoading(true); const res = await api.put(`/api/cases/${editingCase.caseID}`, vals); if (res?.data) { message.success('Case updated'); setEditModalVisible(false); setEditingCase(null); } else message.error('Failed to update'); fetchAllCases(); } catch (err) { console.error(err); message.error('Update failed'); } finally { setLoading(false); }
  };

  useEffect(() => {
    let f = allCases;
    if (filterType !== 'all') f = f.filter((c) => c.status === filterType);
    if (searchText) {
      f = f.filter((c) => c.caseID.toLowerCase().includes(searchText.toLowerCase()) || c.incidentType.toLowerCase().includes(searchText.toLowerCase()));
    }
    setFilteredCases(f);
  }, [allCases, searchText, filterType]);

  const columns = [
    { title: 'Case ID', dataIndex: 'caseID', key: 'caseID' },
    { title: 'Report ID', dataIndex: 'reportID', key: 'reportID' },
    { title: 'Incident Type', dataIndex: 'incidentType', key: 'incidentType' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Assigned Officer', dataIndex: 'assignedOfficer', key: 'assignedOfficer' },
    { title: 'Risk Level', dataIndex: 'riskLevel', key: 'riskLevel' },
    { title: 'Date', dataIndex: 'dateReported', key: 'dateReported', render: (d) => d ? new Date(d).toLocaleString() : '' },
    { title: 'Actions', key: 'actions', render: (_, rec) => (
      <Space>
        <Tooltip title="View"><Button type="link" icon={<EyeOutlined />} onClick={() => handleViewCase(rec)} /></Tooltip>
        <Tooltip title="Edit"><Button type="link" icon={<EditOutlined />} onClick={() => handleEditCase(rec)} /></Tooltip>
        <Tooltip title="Delete"><Button type="link" icon={<DeleteOutlined />} danger onClick={() => handleDeleteCase(rec)} /></Tooltip>
      </Space>
    ) }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #ffd1dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, color: '#e91e63' }}>Case Management</Typography.Title>
        <Button onClick={fetchAllCases} icon={<ReloadOutlined />} style={{ borderColor: '#e91e63', color: '#e91e63' }}>Refresh</Button>
      </Header>
      <Content style={{ padding: 16 }}>
        <Card title="All Cases" extra={<Space><Search placeholder="Search cases..." style={{ width: 240 }} onChange={(e) => setSearchText(e.target.value)} /><Select value={filterType} onChange={setFilterType}><Option value="all">All</Option><Option value="Open">Open</Option><Option value="Under Investigation">In-Progress</Option><Option value="Resolved">Resolved</Option><Option value="Closed">Closed</Option></Select></Space>}>
          <Table columns={columns} dataSource={filteredCases} loading={loading} pagination={{ pageSize: 8 }} scroll={{ y: 480 }} />

          <Modal title={editingCase ? `${isViewMode ? 'View' : 'Edit'} Case - ${editingCase?.caseID}` : 'Case'} open={editModalVisible} onCancel={() => { setEditModalVisible(false); setEditingCase(null); setIsViewMode(false); }} okText="Save" onOk={() => { form.validateFields().then((v) => handleUpdateCase(v)); }}>
            <Form form={form} layout="vertical">
              <Form.Item name="incidentType" label="Incident Type" rules={[{ required: true }]}><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="location" label="Location"><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="description" label="Description"><Input.TextArea rows={3} disabled={isViewMode} /></Form.Item>
              <Form.Item name="assignedOfficer" label="Assigned Officer"><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="riskLevel" label="Risk Level"><Select disabled={isViewMode}><Option value="Low">Low</Option><Option value="Medium">Medium</Option><Option value="High">High</Option></Select></Form.Item>
              <Form.Item name="status" label="Status"><Select disabled={isViewMode}><Option value="Open">Open</Option><Option value="Pending">Pending</Option><Option value="Under Investigation">In-Progress</Option><Option value="Resolved">Resolved</Option><Option value="Closed">Closed</Option></Select></Form.Item>
            </Form>
          </Modal>
        </Card>
      </Content>
    </Layout>
  );
}
