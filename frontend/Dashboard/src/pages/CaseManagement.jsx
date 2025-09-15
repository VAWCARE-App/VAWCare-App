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
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [reportsList, setReportsList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

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

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/api/reports');
      if (data?.success) {
        // mirror ReportManagement formatting: strip victim.location
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
      console.error('Failed to fetch reports', err);
    }
  };

  const handleViewCase = (rec) => { setEditingCase(rec); form.setFieldsValue(rec); setIsViewMode(true); setEditModalVisible(true); };
  const handleEditCase = async (rec) => {
    try {
      setLoading(true);
      // fetch latest version from server (by caseID or _id)
      const id = rec.caseID || rec._id;
      const res = await api.get(`/api/cases/${id}`);
      const serverCase = res?.data?.data || res?.data;
      const patched = { ...serverCase, perpetrator: serverCase.perpetrator || '' };
      setEditingCase(patched);
      form.setFieldsValue(patched);
      setIsViewMode(false);
      setEditModalVisible(true);
    } catch (err) {
      // Provide richer diagnostics for debugging
      const status = err.response?.status;
      const data = err.response?.data;
      console.error('Failed to load case for edit', { status, data, err });
      if (status) {
        message.error(`Failed to load case for editing (${status}): ${data?.message || JSON.stringify(data)}`);
      } else {
        message.error('Failed to load case for editing (no response)');
      }
      // Fallback: open the modal with the client record so user can still edit
      try {
        const patched = { ...rec, perpetrator: rec.perpetrator || '' };
        setEditingCase(patched);
        form.setFieldsValue(patched);
        setIsViewMode(false);
        setEditModalVisible(true);
      } catch (e) {
        console.error('Fallback to client record failed', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setAddModalVisible(true);
    setSelectedReport(null);
    addForm.resetFields();
    await fetchReports();
  };

  const handleReportSelect = (reportID) => {
    const rep = reportsList.find((r) => r.reportID === reportID);
    setSelectedReport(rep || null);
    if (rep) {
      // prefill fields on add form
      addForm.setFieldsValue({
        reportID: rep.reportID,
        incidentType: rep.incidentType,
        description: rep.description,
        perpetrator: rep.perpetrator || '',
        victimName: rep.victim ? `${rep.victim.firstName || ''} ${rep.victim.lastName || ''}`.trim() : '',
      });
    }
  };

  const handleCreateCase = async (vals) => {
    try {
      setLoading(true);
      if (!selectedReport) {
        message.error('Please select a report to base this case on');
        return;
      }
      // build payload: include reportID and fields from selected report
      const payload = {
        caseID: vals.caseID,
        reportID: selectedReport.reportID,
        victimID: selectedReport.raw.victimID?._id || selectedReport.raw.victimID || null,
        incidentType: selectedReport.incidentType,
        description: selectedReport.description,
        perpetrator: selectedReport.perpetrator || '',
        location: selectedReport.location || '',
        dateReported: selectedReport.dateReported || new Date().toISOString(),
        status: vals.status || 'Open',
        assignedOfficer: vals.assignedOfficer || '',
        riskLevel: vals.riskLevel || 'Low',
      };

      const res = await api.post('/api/cases', payload);
      if (res?.data?.success) {
        message.success('Case created');
        setAddModalVisible(false);
        addForm.resetFields();
        fetchAllCases();
      } else {
        console.error('Create case response', res?.data);
        message.error(res?.data?.message || 'Failed to create case');
      }
    } catch (err) {
      console.error('Create case error', err.response || err);
      message.error('Failed to create case');
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
        message.success('Case deleted');
      } else {
        message.error(res?.data?.message || 'Delete failed');
      }
      fetchAllCases();
    } catch (err) {
      console.error('Delete failed', err.response || err);
      message.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCase = async (vals) => {
    if (!editingCase) {
      message.error('No case selected for update');
      return;
    }
    try {
      setLoading(true);
      const id = editingCase.caseID || editingCase._id;
      // always include perpetrator field (keep parity with reports)
      const payload = { ...vals, perpetrator: vals.perpetrator || '' };
      const res = await api.put(`/api/cases/${id}`, payload);
      if (res?.data?.success) {
        message.success('Case updated');
        setEditModalVisible(false);
        setEditingCase(null);
      } else {
        message.error(res?.data?.message || 'Failed to update case');
      }
      fetchAllCases();
    } catch (err) {
      console.error('Update failed', err.response || err);
      message.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
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
        <Space>
          <Button type="primary" onClick={openAddModal} style={{ background: '#e91e63', borderColor: '#e91e63' }}>Add Case</Button>
          <Button onClick={fetchAllCases} icon={<ReloadOutlined />} style={{ borderColor: '#e91e63', color: '#e91e63' }}>Refresh</Button>
        </Space>
      </Header>
      <Content style={{ padding: 16 }}>
          <Card title="All Cases" extra={<Space><Search placeholder="Search cases..." style={{ width: 240 }} onChange={(e) => setSearchText(e.target.value)} /><Select value={filterType} onChange={setFilterType}><Option value="all">All</Option><Option value="Open">Open</Option><Option value="Under Investigation">In-Progress</Option><Option value="Resolved">Resolved</Option><Option value="Closed">Closed</Option></Select></Space>}>
          <Table columns={columns} dataSource={filteredCases} loading={loading} pagination={{ pageSize: 8 }} scroll={{ y: 480 }} />

          <Modal title={editingCase ? `${isViewMode ? 'View' : 'Edit'} Case - ${editingCase?.caseID}` : 'Case'} open={editModalVisible} onCancel={() => { setEditModalVisible(false); setEditingCase(null); setIsViewMode(false); }} okText="Save" onOk={() => { form.validateFields().then((v) => handleUpdateCase(v)); }}>
            <Form form={form} layout="vertical">
              <Form.Item name="incidentType" label="Incident Type" rules={[{ required: true }]}><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="location" label="Location"><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="description" label="Description"><Input.TextArea rows={3} disabled={isViewMode} /></Form.Item>
              <Form.Item name="perpetrator" label="Perpetrator"><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="assignedOfficer" label="Assigned Officer"><Input disabled={isViewMode} /></Form.Item>
              <Form.Item name="riskLevel" label="Risk Level"><Select disabled={isViewMode}><Option value="Low">Low</Option><Option value="Medium">Medium</Option><Option value="High">High</Option></Select></Form.Item>
              <Form.Item name="status" label="Status"><Select disabled={isViewMode}><Option value="Open">Open</Option><Option value="Under Investigation">In-Progress</Option><Option value="Resolved">Resolved</Option><Option value="Closed">Closed</Option></Select></Form.Item>
            </Form>
          </Modal>

          {/* Add Case Modal */}
          <Modal title="Create Case" open={addModalVisible} onCancel={() => { setAddModalVisible(false); setSelectedReport(null); }} okText="Create" onOk={() => { addForm.validateFields().then((v) => handleCreateCase(v)); }}>
            <Form form={addForm} layout="vertical">
              <Form.Item name="reportID" label="Select Report" rules={[{ required: true }]}> 
                <Select showSearch placeholder="Select a report to base case on" onChange={handleReportSelect} optionFilterProp="children">
                  {reportsList.map((r) => (
                    <Option key={r.reportID} value={r.reportID}>{r.reportID} — {r.incidentType} — {r.victim?.firstName || ''} {r.victim?.lastName || ''}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="victimName" label="Victim Name">
                <Input readOnly />
              </Form.Item>

              <Form.Item name="incidentType" label="Incident Type">
                <Input readOnly />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} readOnly />
              </Form.Item>

              <Form.Item name="perpetrator" label="Perpetrator">
                <Input readOnly />
              </Form.Item>

              <Form.Item name="caseID" label="Case ID" rules={[{ required: true }]}>
                <Input placeholder="Enter Case ID (e.g. CASE001)" />
              </Form.Item>

              <Form.Item name="assignedOfficer" label="Assigned Officer" rules={[{ required: true }]}>
                <Input placeholder="Officer assigned to this case" />
              </Form.Item>

              <Form.Item name="riskLevel" label="Risk Level">
                <Select>
                  <Option value="Low">Low</Option>
                  <Option value="Medium">Medium</Option>
                  <Option value="High">High</Option>
                </Select>
              </Form.Item>

              <Form.Item name="status" label="Status">
                <Select>
                  <Option value="Open">Open</Option>
                  <Option value="Under Investigation">In-Progress</Option>
                  <Option value="Resolved">Resolved</Option>
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