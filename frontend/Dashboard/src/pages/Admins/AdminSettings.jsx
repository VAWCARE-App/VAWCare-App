import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Row, Col } from 'antd';
import { api } from '../../lib/api';

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    // Load current admin profile (best-effort). Show an error if it fails so user knows why fields are empty.
    (async () => {
      setLoadingProfile(true);
      try {
        const { data } = await api.get('/api/admin/profile');
        if (data && data.success && data.data) {
          // Normalize server field names into the form fields
          const profile = { ...data.data };
          // Some server responses use 'email' or 'adminEmail' - ensure form uses 'email'
          if (profile.adminEmail && !profile.email) profile.email = profile.adminEmail;
          form.setFieldsValue(profile);
        } else {
          message.info('Unable to load admin profile. You may need to sign in.');
        }
      } catch (e) {
        console.debug('AdminSettings: failed to load profile', e && e.message);
        // Try to fall back to a locally cached user (from login flow) so UI can show something
        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const cached = JSON.parse(raw);
            const profile = { ...cached };
            if (profile.adminEmail && !profile.email) profile.email = profile.adminEmail;
            if (profile.adminID && !profile.adminID) profile.adminID = profile.adminID;
            form.setFieldsValue(profile);
            message.info('Showing cached account info (offline).');
          } else {
            // Show a non-blocking message so user knows why fields are empty
            message.error('Unable to load account information. Please ensure you are signed in.');
          }
        } catch (ex) {
          console.debug('AdminSettings: failed to load cached user', ex && ex.message);
          message.error('Unable to load account information. Please ensure you are signed in.');
        }
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [form]);

  const onSave = async (values) => {
    setLoading(true);
    try {
      // Best-effort save; backend endpoint may differ
      await api.put('/api/admin/profile', values);
      message.success('Settings saved');
    } catch (e) {
      message.error('Unable to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
      <Card
        style={{ width: '100%', maxWidth: 760, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        bodyStyle={{ padding: 20 }}
      >
        <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 12 }}>
          Admin Settings
        </Typography.Title>

        <Form layout="vertical" form={form} onFinish={onSave}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="adminID" label="Admin ID">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="adminRole" label="Role">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="firstName" label="First Name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="lastName" label="Last Name">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="middleInitial" label="Middle Initial">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginTop: 6 }}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ minWidth: 140 }}>
              Save
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
