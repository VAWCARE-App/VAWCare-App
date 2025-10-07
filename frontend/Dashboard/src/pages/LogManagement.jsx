import React, { useEffect, useState } from 'react';
import { Table, Card, Space, Select, DatePicker, Input, Button, Typography, Layout, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
const { Title } = Typography;

export default function LogManagement(){
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ action: '', actorType: '', actorId: '', date: null, ipAddress: '' });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.action) params.action = filters.action;
      if (filters.actorType) params.actorType = filters.actorType;
      if (filters.actorId) params.actorId = filters.actorId;
      if (filters.ipAddress) params.ipAddress = filters.ipAddress;
      // If a single date is selected, query for the whole day (00:00:00 - 23:59:59)
      if (filters.date) {
        const d = filters.date;
        // Support moment/dayjs objects with startOf/endOf, else fallback to Date
        if (typeof d.startOf === 'function' && typeof d.endOf === 'function') {
          params.startDate = d.startOf('day').toISOString();
          params.endDate = d.endOf('day').toISOString();
        } else {
          const dt = new Date(d);
          const start = new Date(dt);
          start.setHours(0,0,0,0);
          const end = new Date(dt);
          end.setHours(23,59,59,999);
          params.startDate = start.toISOString();
          params.endDate = end.toISOString();
        }
      }
      params.page = 1;
      params.limit = 50;
      const res = await api.get('/api/logs', { params });
      console.debug('logs fetch response', res);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setLogs(data);
    } catch (e) {
      console.error('Failed to load logs', e, e.response?.data || e.message);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchLogs(); }, []);

  // Whenever filters change, re-fetch logs (debounced) so selecting items updates results immediately
  useEffect(() => {
    const t = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.action, filters.actorType, filters.actorId, filters.ipAddress, filters.date]);

  const columns = [
    { title: 'Log ID', dataIndex: 'logID', key: 'logID' },
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'Actor', key: 'actor', render: (_, r) => r.victimID?.victimID || r.adminID?.adminID || r.officialID?.officialID || 'System' },
    { title: 'Details', dataIndex: 'details', key: 'details', ellipsis: true },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress' },
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', render: t => new Date(t).toLocaleString() }
  ];

  const PINK = "#e91e63";
  const LIGHT_PINK = "#fff0f5";
  const SOFT_PINK = "#ffd1dc";

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', background: LIGHT_PINK }}>
      <Layout.Header style={{ background: '#fff', borderBottom: `1px solid ${SOFT_PINK}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 16 }}>
        <Title level={4} style={{ margin: 0, color: PINK }}>System Logs</Title>
        <Button onClick={fetchLogs} icon={<ReloadOutlined />} style={{ borderColor: PINK, color: PINK }}>Refresh</Button>
      </Layout.Header>

      <Layout.Content style={{ padding: 16, overflowX: 'hidden' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
          <Col xs={24}>
            <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
              <Space wrap>
                <Select placeholder="Actor Type" style={{ width: 160 }} value={filters.actorType} onChange={(v)=>setFilters(f=>({...f, actorType: v}))} allowClear>
                  <Select.Option value="victim">Victim</Select.Option>
                  <Select.Option value="admin">Admin</Select.Option>
                  <Select.Option value="official">Official</Select.Option>
                </Select>
                {/* Actor id input (placeholder changes based on actorType) */}
                <Input
                  placeholder={(() => {
                    const t = filters.actorType;
                    if (t === 'official') return 'e.g. 0FB000';
                    if (t === 'admin') return 'e.g. ADM000';
                    return 'e.g. ANONYMOUS000 or VIC000';
                  })()}
                  style={{ width: 220 }}
                  value={filters.actorId}
                  onChange={(e)=>setFilters(f=>({...f, actorId: e.target.value}))}
                />
                <DatePicker onChange={(date)=>setFilters(f=>({...f, date}))} />
              </Space>
            </Card>
          </Col>
        </Row>

        <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
          <Table dataSource={logs} columns={columns} rowKey={r => r._id || r.id} loading={loading} />
        </Card>
      </Layout.Content>
    </Layout>
  );
}
