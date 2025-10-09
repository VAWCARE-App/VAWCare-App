import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Row, Col } from 'antd';
import { api } from '../../lib/api';

export default function OfficialSettings() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    // Best-effort load of official profile. Fall back to cached user to avoid forcing sign-out in dev.
    (async () => {
      setLoadingProfile(true);
      try {
        const { data } = await api.get('/api/officials/profile');
        if (data && data.success && data.data) {
          const profile = { ...data.data };
          if (profile.officialEmail && !profile.email) profile.email = profile.officialEmail;
          form.setFieldsValue(profile);
        } else {
          message.info('Unable to load official profile. You may need to sign in.');
        }
      } catch (e) {
        console.debug('OfficialSettings: failed to load profile', e && e.message);
        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const cached = JSON.parse(raw);
            const profile = { ...cached };
            if (profile.officialEmail && !profile.email) profile.email = profile.officialEmail;
            form.setFieldsValue(profile);
            message.info('Showing cached profile info (offline or auth issue)');
          } else {
            message.error('Unable to load profile. Please sign in.');
          }
        } catch (ex) {
          console.debug('OfficialSettings: failed to use cached profile', ex && ex.message);
          message.error('Unable to load profile. Please sign in.');
        }
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [form]);

  const onSave = async (values) => {
    setLoading(true);
    try {
      await api.put('/api/officials/profile', values);
      message.success('Profile updated');
    } catch (e) {
      console.error('OfficialSettings save failed', e && e.message);
      message.error('Unable to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 760, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} bodyStyle={{ padding: 20 }}>
        <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 12 }}>
          Official Settings
        </Typography.Title>

        <Form layout="vertical" form={form} onFinish={onSave}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="officialID" label="Official ID">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="position" label="Position">
                <Input />
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
            <Col xs={24} md={12}>
              <Form.Item name="contactNumber" label="Contact Number">
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
