import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Layout, Input, Space, Tooltip, Row, Col, Modal, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';

const { Header, Content } = Layout;
const { Search } = Input;
const { Title } = Typography;

export default function AlertsManagement() {
  const [alerts, setAlerts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const PINK = "#e91e63";
  const SOFT_PINK = "#ffd1dc";
  const LIGHT_PINK = "#fff5f8";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/alerts');
      const items = data?.data || [];
      setAlerts(items);
      setFiltered(items);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleResolve = (record) => {
    Modal.confirm({
      title: `Resolve alert ${record.alertID || record._id}?`,
      okText: 'Resolve',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.put(`/api/alerts/${record._id}/resolve`);
          load();
        } catch (err) {
          console.error('Resolve failed', err);
        }
      }
    });
  };

  const onSearch = (val) => {
    if (!val) return setFiltered(alerts);
    const lower = val.toLowerCase();
    setFiltered(alerts.filter((a) => (a.alertID || '').toLowerCase().includes(lower) || (a.type || '').toLowerCase().includes(lower) || (a.victimID && ((a.victimID.firstName || '') + ' ' + (a.victimID.lastName || '')).toLowerCase().includes(lower))));
  };

  const columns = [
    { title: 'Alert ID', dataIndex: 'alertID', key: 'alertID' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Victim', dataIndex: ['victimID','victimID'], key: 'victimID', render: (_, r) => r.victimID?.victimID || (r.victimID?.firstName ? `${r.victimID.firstName} ${r.victimID.lastName || ''}` : r.victimID?._id) || '—' },
    { title: 'Location', dataIndex: 'location', key: 'location', render: (loc) => loc ? `${loc.latitude?.toFixed?.(6) || loc.latitude}, ${loc.longitude?.toFixed?.(6) || loc.longitude}` : '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => s === 'Active' ? <Tag color="red">Active</Tag> : <Tag color="green">Resolved</Tag> },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Resolved', dataIndex: 'resolvedAt', key: 'resolvedAt', render: (d) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Duration', dataIndex: 'durationStr', key: 'durationStr', render: (s, r) => s || (r.durationMs ? `${Math.round(r.durationMs/1000)}s` : '—') },
    { title: 'Actions', key: 'actions', render: (_, r) => r.status === 'Active' ? <Button danger onClick={() => handleResolve(r)}>Resolve</Button> : null }
  ];

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: LIGHT_PINK }}>
      <Header style={{ background: '#fff', borderBottom: `1px solid ${SOFT_PINK}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 16 }}>
        <Title level={4} style={{ margin: 0, color: PINK }}>Alerts Management</Title>
        <Button onClick={load} icon={<ReloadOutlined />} style={{ borderColor: PINK, color: PINK }}>Refresh</Button>
      </Header>

      <Content style={{ padding: 16, overflowX: 'hidden' }}>
        <Row style={{ marginBottom: 12 }}>
          <Col xs={24}>
            <div style={{ padding: 12, border: `1px solid ${SOFT_PINK}`, borderRadius: 12, background: '#fff' }}>
              <Space>
                <Tooltip title="Search alerts">
                  <Search placeholder="Search by ID, type, victim" allowClear onSearch={onSearch} style={{ width: 320 }} />
                </Tooltip>
              </Space>
            </div>
          </Col>
        </Row>

        <div style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12, background: '#fff', padding: 8 }}>
          <Table dataSource={filtered} columns={columns} rowKey={r => r._id} loading={loading} />
        </div>
      </Content>
    </Layout>
  );
}
