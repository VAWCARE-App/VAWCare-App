import React, { useEffect, useState } from 'react';
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
} from 'antd';
import { ReloadOutlined, EyeOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, getUserType } from '../lib/api';

const { Title } = Typography;

export default function BPOManagement() {
  const userType = getUserType();
  const navigate = useNavigate();
  // Redirect unauthorized users away from this page
  React.useEffect(() => {
    if (userType !== 'admin' && userType !== 'official') {
      navigate('/', { replace: true });
    }
  }, [userType, navigate]);
  const { message } = AntApp.useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  // editing disabled: this view only page does not allow edit/delete
  const [statusCardVisible, setStatusCardVisible] = useState(false);
  const [statusEditing, setStatusEditing] = useState(null);
  const [statusNew, setStatusNew] = useState('Active');

  const fetchBPOs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/bpo', { headers: { 'Cache-Control': 'no-cache' } });
      const data = res?.data?.data || [];
      setList(data.map((d) => ({ key: d._id || d.bpoID || Math.random(), ...d })));
    } catch (err) {
      console.error('Failed to fetch BPOs', err);
      message.error('Failed to load BPOs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBPOs(); }, []);

  // derived filtered list
  const filtered = list.filter((r) => {
    let ok = true;
    if (filterType !== 'all') ok = r.status === filterType;
    if (ok && searchText) {
      const txt = searchText.toLowerCase();
      ok = (r.bpoID || '').toString().toLowerCase().includes(txt) || (r.controlNO || '').toString().toLowerCase().includes(txt) || (r.applicationName || '').toString().toLowerCase().includes(txt);
    }
    return ok;
  });

  const columns = [
    {
      title: 'BPO ID',
      dataIndex: 'bpoID',
      key: 'bpoID',
      render: (t, r) => t || r._id,
      width: '16.66%',
      ellipsis: true,
    },
    {
      title: 'Control No',
      dataIndex: 'controlNO',
      key: 'controlNO',
      width: '16.66%',
      ellipsis: true,
    },
    {
      title: 'Applicant',
      dataIndex: 'applicationName',
      key: 'applicationName',
      width: '16.66%',
      ellipsis: true,
    },
    {
      title: 'Served By',
      dataIndex: 'servedBy',
      key: 'servedBy',
      width: '16.66%',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const color = s === 'Active' ? 'green' : s === 'Expired' ? 'volcano' : s === 'Revoked' ? 'magenta' : 'default';
        return <Tag color={color}>{s}</Tag>;
      },
      width: '16.66%',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="View">
            <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/admin/bpo/${r.bpoID || r._id}`)} />
          </Tooltip>
          <Tooltip title="Edit status">
            <Button type="link" icon={<EditOutlined />} onClick={() => {
              setStatusEditing(r);
              setStatusNew(r.status || 'Active');
              setStatusCardVisible(true);
            }} />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm title="Confirm deletion?" okText="Delete" cancelText="Cancel" onConfirm={() => handleDelete(r)}>
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
          {/* Edit/Delete disabled — view-only */}
        </Space>
      ),
      width: '16.66%',
    }
  ];

  // editing disabled: no edit handler in view-only page
  const handleStatusSave = async () => {
    if (!statusEditing) return;
    setLoading(true);
    try {
      const id = statusEditing.bpoID || statusEditing._id;
      const res = await api.put(`/api/bpo/${id}`, { data: { status: statusNew } });
      if (res?.data?.success) {
        message.success('Status updated');
        setStatusCardVisible(false);
        setStatusEditing(null);
        fetchBPOs();
      } else {
        message.error(res?.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Status update error', err);
      message.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!row) return;
    setLoading(true);
    try {
      const id = row.bpoID || row._id;
      const res = await api.delete(`/api/bpo/${id}`);
      if (res?.data?.success) {
        message.success('BPO soft-deleted');
        fetchBPOs();
      } else {
        message.error(res?.data?.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error', err);
      message.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ background: '#fff', borderBottom: '1px solid #ffd1dc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0, color: '#e91e63' }}>BPO Management</Typography.Title>
        <Space>
          <Button type="primary" onClick={() => navigate('/admin/bpo')} style={{ background: '#e91e63', borderColor: '#e91e63' }}>Add BPO</Button>
          <Button onClick={fetchBPOs} icon={<ReloadOutlined />} style={{ borderColor: '#e91e63', color: '#e91e63' }} loading={loading}>Refresh</Button>
        </Space>
      </Layout.Header>

      <Layout.Content style={{ padding: 16 }}>
        <Card title="All BPOs" extra={<Space>
          <Input placeholder="Search BPOs..." style={{ width: 240 }} onChange={(e) => setSearchText(e.target.value)} />
          <Select value={filterType} onChange={setFilterType} style={{ width: 160 }}>
            <Select.Option value="all">All BPOs</Select.Option>
            <Select.Option value="Active">Active</Select.Option>
            <Select.Option value="Expired">Expired</Select.Option>
            <Select.Option value="Revoked">Revoked</Select.Option>
          </Select>
        </Space>}>
          <Table columns={columns} dataSource={filtered} loading={loading} pagination={{ pageSize: 8 }} style={{ width: '100%' }} rowKey={(r) => r.key} />

        </Card>
      </Layout.Content>

      {/* Floating overlay for status edit (backdrop + centered card) */}
      {statusCardVisible && statusEditing && (
        <>
          {/* Backdrop - clicking dismisses the editor */}
          <div
            onClick={() => { setStatusCardVisible(false); setStatusEditing(null); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }}
          />

          {/* Centered floating card */}
          <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 720, maxWidth: '92vw' }}>
            <Card
              title={`Edit Status - ${statusEditing?.bpoID || statusEditing?._id}`}
              extra={(
                <Space>
                  <Button type="primary" onClick={handleStatusSave} loading={loading}>Save</Button>
                  <Button onClick={() => { setStatusCardVisible(false); setStatusEditing(null); }}>Cancel</Button>
                </Space>
              )}
            >
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Status</label>
                <Select value={statusNew} onChange={(v) => setStatusNew(v)} style={{ width: '100%' }}>
                  <Select.Option value="Active">Active</Select.Option>
                  <Select.Option value="Revoked">Revoked</Select.Option>
                </Select>
              </div>
            </Card>
          </div>
        </>
      )}
 
  </Layout>
  );
}
