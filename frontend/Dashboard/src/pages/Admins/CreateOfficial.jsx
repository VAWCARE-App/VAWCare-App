import React from "react";
import { Layout, Card, Form, Input, Button, Select, Typography, App as AntApp } from "antd";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

const { Content } = Layout;
const { Title } = Typography;

export default function CreateOfficial() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const onFinish = async (values) => {
    try {
      // Build payload that matches backend model and the /api/officials/register endpoint
      const payload = {
        officialID: values.officialID,
        officialEmail: values.email,
        officialPassword: values.password,
        firstName: values.firstName,
        middleInitial: values.middleInitial || undefined,
        lastName: values.lastName,
        position: values.position,
        contactNumber: values.contactNumber,
        barangay: values.barangay,
        city: values.city,
        province: values.province,
      };

  // Use the public officials register endpoint which creates the official and the Firebase account
  const res = await api.post("/api/officials/register", payload);
  // Debug: always log response so we can troubleshoot missing toasts
  console.debug('CreateOfficial response:', res);
  // Consider HTTP 201 as success even if server shape varies
  if (res?.status === 201 || res?.data?.success) {
        // Inform the admin in a concise way matching dashboard style
        const serverMsg = res?.data?.message || 'Official created successfully.';
        const key = 'create-official-success';
        // show primary success message briefly
  message.success({ content: serverMsg, key, duration: 2 });
  // then show info about approval
  message.info({ content: 'Account is pending approval. The official will be able to log in once approved.', duration: 4 });

        // Keep admin on the same page and clear the form so they can create another
        form.resetFields();
      } else {
        throw new Error(res?.data?.message || "Failed to create official");
      }
    } catch (err) {
        // Prefer server-provided message, but map some common causes to friendlier prompts
        const serverMsg = err.response?.data?.message || err.message || "Error creating official";
        let userMsg = serverMsg;

        const lower = String(serverMsg || '').toLowerCase();
        if (lower.includes('official already exists') || lower.includes('already exists') || lower.includes('duplicate')) {
          if (lower.includes('email')) userMsg = 'An account with that email already exists. Use a different email or contact support.';
          else if (lower.includes('id')) userMsg = 'An account with that official ID already exists. Choose a different official ID.';
          else userMsg = 'An account with those credentials already exists.';
        } else if (lower.includes('email already registered') || lower.includes('auth/email-already-exists')) {
          userMsg = 'That email is already registered. Please use a different email.';
        } else if (lower.includes('firebase') || lower.includes('createfirebase') || lower.includes('creating firebase')) {
          userMsg = 'Failed to provision Firebase account. Check server Firebase configuration or try again later.';
        } else if (lower.includes('pending')) {
          userMsg = serverMsg; // keep pending-related messages as-is
        }

    console.error('Create official error:', err);
    message.error(userMsg);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff5f8" }}>
      <Content style={{ padding: 16 }}>
        <Card style={{ borderRadius: 12, border: '1px solid #ffd1dc', maxWidth: 980, margin: '0 auto' }}>
          <Title level={3} style={{ color: '#e91e63' }}>Create Barangay Official</Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            style={{
              maxWidth: 900,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              alignItems: 'start'
            }}
          >
            {/* Email first as requested */}
            <Form.Item name="email" label="Email" rules={[{ type: 'email', required: true }]}> 
              <Input />
            </Form.Item>

            <Form.Item name="officialID" label="Official ID" rules={[{ required: true }]}>
              <Input placeholder="Unique ID / username for official (ex. OFB000)" />
            </Form.Item>

            <Form.Item name="position" label="Position" rules={[{ required: true }] }>
              <Select>
                <Select.Option value="Barangay Captain">Barangay Captain</Select.Option>
                <Select.Option value="Kagawad">Kagawad</Select.Option>
                <Select.Option value="Secretary">Secretary</Select.Option>
                <Select.Option value="Treasurer">Treasurer</Select.Option>
                <Select.Option value="SK Chairman">SK Chairman</Select.Option>
                <Select.Option value="Chief Tanod">Chief Tanod</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            <Form.Item name="middleInitial" label="Middle initial">
              <Input maxLength={1} />
            </Form.Item>

            <Form.Item name="lastName" label="Last name" rules={[{ required: true }] }>
              <Input />
            </Form.Item>

            <Form.Item name="contactNumber" label="Contact Number" rules={[{ required: true, message: 'Contact number is required' }, {
              validator: (_, value) => {
                if (!value) return Promise.reject();
                const phPattern = /^(\+63|0)[0-9]{10}$/;
                return phPattern.test(value) ? Promise.resolve() : Promise.reject('Please enter a valid Philippine phone number');
              }
            }]}>
              <Input placeholder="e.g. 09171234567 or +639171234567" />
            </Form.Item>

            <Form.Item name="barangay" label="Barangay / Unit" rules={[{ required: true }] }>
              <Input />
            </Form.Item>

            <Form.Item name="city" label="City / Municipality">
              <Input />
            </Form.Item>

            <Form.Item name="province" label="Province">
              <Input />
            </Form.Item>
 
            {/* Password first, then confirm password (confirm depends on password) */}
            <Form.Item name="password" label="Password" rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Password must be at least 8 characters' },
              {
                pattern: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/, 
                message: 'Password must contain uppercase, lowercase, number and special character'
              }
            ]}>
              <Input.Password />
            </Form.Item>

            <Form.Item name="confirmPassword" label="Confirm Password" dependencies={["password"]} rules={[
              { required: true, message: 'Please confirm the password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords that you entered do not match!'));
                }
              })
            ]}>
              <Input.Password />
            </Form.Item>

            <Form.Item style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <Button type="primary" htmlType="submit" style={{ background: '#e91e63', borderColor: '#e91e63', flex: 1 }}>
                Create Official
              </Button>
              <Button style={{ flex: 1 }} onClick={() => navigate('/admin/users')}>Cancel</Button>
            </Form.Item>
 
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
