import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Layout, Input, Space, Tooltip, Row, Col, Typography, Card, Modal } from 'antd';
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

  // Map modal state (used when clicking coordinates)
  const [showMapModal, setShowMapModal] = useState(false);
  const [iframeCoords, setIframeCoords] = useState({ lat: 0, lng: 0 });

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

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail && e.detail.lat && e.detail.lng) {
        setIframeCoords({ lat: Number(e.detail.lat), lng: Number(e.detail.lng) });
        setShowMapModal(true);
      }
    };
    window.addEventListener('alert-map-open', handler);
    return () => window.removeEventListener('alert-map-open', handler);
  }, []);

  const onSearch = (val) => {
    if (!val) return setFiltered(alerts);
    const lower = val.toLowerCase();
    setFiltered(alerts.filter((a) => (a.alertID || '').toLowerCase().includes(lower) || (a.type || '').toLowerCase().includes(lower) || (a.victimID && ((a.victimID.firstName || '') + ' ' + (a.victimID.lastName || '')).toLowerCase().includes(lower))));
  };

  const columns = [
    { title: 'Alert ID', dataIndex: 'alertID', key: 'alertID' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Victim', dataIndex: ['victimID', 'victimID'], key: 'victimID', render: (_, r) => r.victimID?.victimID || (r.victimID?.firstName ? `${r.victimID.firstName} ${r.victimID.lastName || ''}` : r.victimID?._id) || '—' },
    { 
      title: 'Location', 
      dataIndex: 'location', 
      key: 'location', 
      render: (loc) => {
        if (!loc) return '—';
        const lat = loc.latitude?.toFixed?.(6) || loc.latitude;
        const lng = loc.longitude?.toFixed?.(6) || loc.longitude;
        // Open a modal card with embedded Google Maps when clicked
        return (
          <a onClick={() => {
            try {
              // programmatically set modal state via window event (handled below)
              const ev = new CustomEvent('alert-map-open', { detail: { lat, lng } });
              window.dispatchEvent(ev);
            } catch (e) {
              // fallback: open Google Maps in new tab
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`, '_blank', 'noopener');
            }
          }} style={{ cursor: 'pointer' }}> {`${lat}, ${lng}`}</a>
        );
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => {
      if (s === 'Active') return <Tag color="red">Active</Tag>;
      if (s === 'Cancelled') return <Tag color="default">Cancelled</Tag>;
      return <Tag color="green">Resolved</Tag>;
    } },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Resolved', dataIndex: 'resolvedAt', key: 'resolvedAt', render: (d) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Duration', dataIndex: 'durationStr', key: 'durationStr', render: (s, r) => s || (r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '—') }
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
        
        <Modal title="Location" open={showMapModal} onCancel={() => setShowMapModal(false)} footer={null} width={820}>
          <Card bodyStyle={{ padding: 8 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input value={iframeCoords.lat?.toFixed?.(6)} readOnly style={{ textAlign: 'center' }} />
              <Input value={iframeCoords.lng?.toFixed?.(6)} readOnly style={{ textAlign: 'center' }} />
            </div>
            <div style={{ width: '100%', height: 360, borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                title="Alert location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${iframeCoords.lat},${iframeCoords.lng}&z=15&output=embed`}
                allowFullScreen
              />
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button type="link" onClick={() => window.open(`https://www.google.com/maps/@${iframeCoords.lat},${iframeCoords.lng},15.64z?entry=ttu`, '_blank', 'noopener')}>Open in Google Maps</Button>
              </div>
            </div>
          </Card>
        </Modal>
      </Content>
    </Layout>
  );
}
