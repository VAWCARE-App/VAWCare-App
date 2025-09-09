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
  Select,
  Divider,
  Modal,
} from "antd";
import { UserOutlined, SafetyOutlined, TeamOutlined } from "@ant-design/icons";
import { api, saveToken } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo1.svg";
import Logo from "../assets/logo1.svg?react";

const { Option } = Select;

export default function Login() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('victim');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const screens = Grid.useBreakpoint();

  const maxWidth = screens.x2 ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 24 : 16;

  const getUserTypeInfo = (type) => {
    switch (type) {
      case 'victim':
        return { icon: <UserOutlined />, label: "Victim", color: "#e91e63" };
      case 'admin':
        return { icon: <SafetyOutlined />, label: "Administrator", color: "#1890ff" };
      case 'official':
        return { icon: <TeamOutlined />, label: "Barangay Official", color: "#52c41a" };
      default:
        return { icon: <UserOutlined />, label: "User", color: "#e91e63" };
    }
  };

  const getApiEndpoint = (type) => {
    switch (type) {
      case 'victim':
        return '/api/victims/login';
      case 'admin':
        return '/api/admin/login';
      case 'official':
        return '/api/officials/login';
      default:
        return '/api/victims/login';
    }
  };

  const formatLoginData = (values, type) => {
    switch (type) {
      case 'victim':
        return {
          identifier: values.identifier,
          password: values.password
        };
      case 'admin':
        return {
          adminEmail: values.identifier,
          adminPassword: values.password
        };
      case 'official':
        return {
          officialEmail: values.identifier,
          password: values.password
        };
      default:
        return values;
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log('Login attempt:', { userType, identifier: values.identifier });

      const endpoint = getApiEndpoint(userType);
      const loginData = formatLoginData(values, userType);

      const { data } = await api.post(endpoint, loginData);
      console.log('Login response:', data);

      if (data.success) {
        // Save token if available, otherwise set a short-lived test token so Protected routes work for testing
        if (data.data?.token) {
          saveToken(data.data.token);
        } else if (userType === 'victim') {
          // set a dummy token for frontend-only testing; remove when real auth is enforced
          saveToken('victim-test-token');
        }

        // Store user info based on user type
        let userInfo = {};
        if (userType === 'victim') {
          userInfo = {
            ...data.data.victim,
            userType: 'victim',
            role: 'victim'
          };
        } else if (userType === 'admin') {
          userInfo = {
            ...data.data.admin,
            userType: 'admin',
            role: 'admin'
          };
        } else if (userType === 'official') {
          userInfo = {
            ...data.data.official,
            userType: 'official',
            role: 'official'
          };
        }

        localStorage.setItem('user', JSON.stringify(userInfo));
        localStorage.setItem('userType', userType);

        const userName = userInfo.firstName || userInfo.victimUsername || userInfo.adminEmail || userInfo.officialEmail || 'User';
        message.success(`Welcome back, ${userName}!`);
        // Redirect victims to a simple test page so we can confirm login works.
        if (userType === 'victim') {
          navigate('/victim-test');
        } else if (userType === 'official') {
          navigate('/official-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (err) {
      console.error('Login error:', err);
      // Show a modal with the server error (prevents page refresh and gives clearer prompt)
      const msg = err?.response?.data?.message || err.message || "Login failed";
      setErrorModalMessage(msg);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const currentUserType = getUserTypeInfo(userType);

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
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <Logo style={{ width: "80px", color: currentUserType.color }} />
          </div>
          <Typography.Title
            level={3}
            style={{
              marginBottom: 8,
              textAlign: "center",
              color: currentUserType.color,
              lineHeight: 1.2,
            }}
          >
            VAWCare Sign In
          </Typography.Title>

          <Typography.Paragraph
            style={{
              marginBottom: 24,
              textAlign: "center",
              color: "#666",
            }}
          >
            Choose your account type and sign in to continue.
          </Typography.Paragraph>

          <Form layout="vertical" onFinish={onFinish} initialValues={{ identifier: "", password: "" }}>
            <Form.Item
              name="userType"
              label="Account Type"
              initialValue="victim"
            >
              <Select
                value={userType}
                onChange={setUserType}
                size={screens.md ? "large" : "middle"}
                style={{ width: '100%' }}
              >
                <Option value="victim">
                  <UserOutlined style={{ marginRight: 8, color: "#e91e63" }} />
                  Victim
                </Option>
                <Option value="admin">
                  <SafetyOutlined style={{ marginRight: 8, color: "#1890ff" }} />
                  Administrator
                </Option>
                <Option value="official">
                  <TeamOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                  Barangay Official
                </Option>
              </Select>
            </Form.Item>

            <Divider style={{ margin: '16px 0' }} />

            <Form.Item
              name="identifier"
              label={userType === 'victim' ? "Username or Email" : "Email Address"}
              rules={[{
                required: true,
                message: `Please enter your ${userType === 'victim' ? 'username or email' : 'email address'}`
              }]}
            >
              <Input
                placeholder={userType === 'victim' ? "Username or email" : "Email address"}
                size={screens.md ? "large" : "middle"}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password placeholder="••••••••" size={screens.md ? "large" : "middle"} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size={screens.md ? "large" : "middle"}
              style={{
                backgroundColor: currentUserType.color,
                borderColor: currentUserType.color,
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Sign in as {currentUserType.label}
            </Button>

            {userType === 'victim' && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Typography.Text style={{ color: "#888" }}>
                  No account?{" "}
                  <Link style={{ color: "#e91e63" }} to="/signup">
                    Create one
                  </Link>
                </Typography.Text>
              </div>
            )}
          </Form>
        </div>
        <Modal
          title="Login Error"
          visible={errorModalVisible}
          onOk={() => setErrorModalVisible(false)}
          onCancel={() => setErrorModalVisible(false)}
          okText="OK"
        >
          <Typography.Paragraph>{errorModalMessage}</Typography.Paragraph>
        </Modal>
      </Card>
    </Flex>
  );
}