import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Switch, Typography, message, Row, Col } from 'antd';
import { api } from '../../lib/api';

export default function VictimSettings() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/victims/profile');
        if (data && data.success && data.data) {
          const profile = data.data;
          // Map first emergency contact into flat form fields
          if (profile.emergencyContacts && profile.emergencyContacts.length > 0) {
            const ec = profile.emergencyContacts[0];
            profile.emergencyContactName = ec.name;
            profile.emergencyContactRelationship = ec.relationship;
            profile.emergencyContactNumber = ec.contactNumber;
            profile.emergencyContactEmail = ec.email;
            profile.emergencyContactAddress = ec.address;
          }
          form.setFieldsValue(profile);
        }
      } catch (e) {
        // ignore load errors
      }
    })();
  }, [form]);

  const onSave = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      if (
        values.emergencyContactName ||
        values.emergencyContactNumber ||
        values.emergencyContactRelationship ||
        values.emergencyContactEmail ||
        values.emergencyContactAddress
      ) {
        payload.emergencyContacts = [
          {
            name: values.emergencyContactName || '',
            relationship: values.emergencyContactRelationship || '',
            contactNumber: values.emergencyContactNumber || '',
            email: values.emergencyContactEmail || '',
            address: values.emergencyContactAddress || '',
          },
        ];
      }

      await api.put('/api/victims/profile', payload);
      message.success('Profile updated');
    } catch (e) {
      message.error('Unable to update profile');
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
          Account Settings
        </Typography.Title>

        <Form layout="vertical" form={form} onFinish={onSave}>
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
              <Form.Item name="contactNumber" label="Contact Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Title level={5} style={{ marginTop: 8 }}>Emergency Contact</Typography.Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Name" name="emergencyContactName">
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Relationship" name="emergencyContactRelationship">
                <Input placeholder="e.g. Mother, Friend" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Contact Number" name="emergencyContactNumber">
                <Input placeholder="+639123456789 or 09123456789" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Email" name="emergencyContactEmail">
                <Input placeholder="contact@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col xs={24}>
              <Form.Item label="Address" name="emergencyContactAddress">
                <Input.TextArea rows={2} placeholder="Address (optional)" />
              </Form.Item>
            </Col>
          </Row>

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
