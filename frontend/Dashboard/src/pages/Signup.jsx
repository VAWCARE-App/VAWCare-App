import React, { useState } from "react";
import {
  App as AntApp,
  Button,
  Card,
  Form,
  Input,
  Typography,
  Flex,
  Grid,
  Radio,
  Select,
} from "antd";
import { api, saveToken } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const screens = Grid.useBreakpoint();

  // copy same sizing logic as Login
  const maxWidth = screens.xl ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 24 : 16;

  const [userType, setUserType] = useState('victim');
  const [form] = Form.useForm();

  // Admin roles for select input
  const adminRoles = [
    'backend',
    'fullstack',
    'frontend1',
    'frontend2',
    'documentation'
  ];

  // Official positions for select input
  const officialPositions = [
    'Barangay Captain',
    'Kagawad',
    'Secretary',
    'Treasurer',
    'SK Chairman',
    'Chief Tanod'
  ];

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const { confirmPassword, ...payload } = values;
      
      let endpoint;
      switch(userType) {
        case 'admin':
          endpoint = '/api/admin/register';
          break;
        case 'official':
          endpoint = '/api/officials/register';
          break;
        case 'victim':
          endpoint = '/api/victims/register';
          break;
        default:
          throw new Error('Invalid user type');
      }

      // Format the registration payload according to your backend expectations
      let registrationPayload;
      
      switch(userType) {
        case 'admin':
          registrationPayload = {
            adminEmail: payload.email,
            adminPassword: payload.password,
            adminRole: payload.role,
            firstName: payload.firstName,
            middleInitial: payload.middleInitial,
            lastName: payload.lastName
          };
          break;
          
        case 'official':
          registrationPayload = {
            officialEmail: payload.email,
            adminPassword: payload.password,
            firstName: payload.firstName,
            middleInitial: payload.middleInitial,
            lastName: payload.lastName,
            position: payload.position,
            contactNumber: payload.contactNumber
          };
          break;
          
        case 'victim':
          registrationPayload = {
            victimEmail: payload.email,
            password: payload.password,
            victimUsername: payload.username,
            victimAccount: payload.accountType,
            ...(payload.accountType === 'regular' && {
              firstName: payload.firstName,
              middleInitial: payload.middleInitial,
              lastName: payload.lastName,
              address: payload.address,
              contactNumber: payload.contactNumber
            })
          };
          break;
          
        default:
          throw new Error('Invalid user type');
      }

      // Make the API request
      const { data } = await api.post(endpoint, registrationPayload);
      const token = data?.token;
      
      if (token) {
        saveToken(token);
        localStorage.setItem('userType', userType);
        message.success("Account created!");
        navigate("/dashboard");
      } else {
        message.success("Account created! Please sign in.");
        navigate("/login");
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        maxWidth: "100%",
        width: "100vw",
        backgroundColor: "#fff0f5",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth,
          borderRadius: 14,
          border: "1px solid #ffc0cb",
          boxShadow: "0 20px 34px rgba(0,0,0,0.06)",
          padding: cardPadding,
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: cardPadding }}>
          <Typography.Title
            level={3}
            style={{
              marginBottom: 8,
              textAlign: "center",
              color: "#e91e63",
              lineHeight: 1.2,
            }}
          >
            Create your account
          </Typography.Title>

          <Typography.Paragraph
            style={{
              marginBottom: 24,
              textAlign: "center",
              color: "#666",
            }}
          >
            Fill in your details to get started.
          </Typography.Paragraph>

          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item label="User Type">
              <Radio.Group value={userType} onChange={e => setUserType(e.target.value)} size={screens.md ? "large" : "middle"}>
                <Radio.Button value="victim">Victim</Radio.Button>
                <Radio.Button value="official">Official</Radio.Button>
                <Radio.Button value="admin">Admin</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input placeholder="Juan" size={screens.md ? "large" : "middle"} />
            </Form.Item>

            <Form.Item name="middleInitial" label="Middle Initial" rules={[{ max: 1 }]}>
              <Input placeholder="M" maxLength={1} size={screens.md ? "large" : "middle"} />
            </Form.Item>

            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input placeholder="Dela Cruz" size={screens.md ? "large" : "middle"} />
            </Form.Item>

            {userType === 'admin' && (
              <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                <Select placeholder="Select role" size={screens.md ? "large" : "middle"}>
                  {adminRoles.map(role => (
                    <Select.Option key={role} value={role}>
                      {role}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {userType === 'official' && (
              <>
                <Form.Item name="position" label="Position" rules={[{ required: true }]}>
                  <Select placeholder="Select position" size={screens.md ? "large" : "middle"}>
                    {officialPositions.map(position => (
                      <Select.Option key={position} value={position}>
                        {position}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="contactNumber" label="Contact Number" rules={[{ required: true }]}>
                  <Input placeholder="09XX XXX XXXX" size={screens.md ? "large" : "middle"} />
                </Form.Item>
              </>
            )}

            {userType === 'victim' && (
              <>
                <Form.Item name="accountType" label="Account Type" rules={[{ required: true }]}>
                  <Radio.Group 
                    size={screens.md ? "large" : "middle"}
                    onChange={(e) => {
                      // Reset form when switching account types
                      form.resetFields();
                      // Set the account type after reset
                      form.setFieldsValue({ accountType: e.target.value });
                    }}
                  >
                    <Radio.Button value="regular">Regular User</Radio.Button>
                    <Radio.Button value="anonymous">Anonymous User</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item 
                  name="username" 
                  label="Username" 
                  rules={[{ required: true }]}
                  tooltip={Form.useWatch('accountType', form) === 'anonymous' ? 
                    "Only username and password are required for anonymous accounts" : 
                    "Your username will be visible to others. Choose wisely."}
                >
                  <Input placeholder="Choose a username" size={screens.md ? "large" : "middle"} />
                </Form.Item>

                {Form.useWatch('accountType', form) === 'regular' && (
                  <>
                    <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                      <Input placeholder="Juan" size={screens.md ? "large" : "middle"} />
                    </Form.Item>

                    <Form.Item name="middleInitial" label="Middle Initial" rules={[{ max: 1 }]}>
                      <Input placeholder="M" maxLength={1} size={screens.md ? "large" : "middle"} />
                    </Form.Item>

                    <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                      <Input placeholder="Dela Cruz" size={screens.md ? "large" : "middle"} />
                    </Form.Item>

                    <Form.Item name="address" label="Address" rules={[{ required: true }]}>
                      <Input.TextArea 
                        placeholder="Complete address" 
                        size={screens.md ? "large" : "middle"}
                        rows={2} 
                      />
                    </Form.Item>

                    <Form.Item name="contactNumber" label="Contact Number" rules={[{ required: true }]}>
                      <Input placeholder="09XX XXX XXXX" size={screens.md ? "large" : "middle"} />
                    </Form.Item>
                  </>
                )}
              </>
            )}

            {(userType !== 'victim' || Form.useWatch('accountType', form) === 'regular') && (
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input placeholder="you@example.com" size={screens.md ? "large" : "middle"} />
              </Form.Item>
            )}

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, min: 6 }]}
            >
              <Input.Password placeholder="At least 6 characters" size={screens.md ? "large" : "middle"} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm password"
              dependencies={["password"]}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Re-enter your password" size={screens.md ? "large" : "middle"} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size={screens.md ? "large" : "middle"}
              style={{
                backgroundColor: "#e91e63",
                borderColor: "#e91e63",
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Sign up
            </Button>

            <div style={{ marginTop: 12, textAlign: "center" }}>
              <Typography.Text style={{ color: "#888" }}>
                Already have an account?{" "}
                <Link style={{ color: "#e91e63" }} to="/login">
                  Sign in
                </Link>
              </Typography.Text>
            </div>
          </Form>
        </div>
      </Card>
    </Flex>
  );
}
