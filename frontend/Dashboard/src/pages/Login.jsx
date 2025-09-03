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
} from "antd";
import { api, saveToken } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const screens = Grid.useBreakpoint(); 

  const maxWidth = screens.x2 ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 24 : 16;

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log('Login attempt with:', values);
      
      const { data } = await api.post("/api/victims/login", values);
      console.log('Login response:', data);
      
      if (data.success) {
        // Save token if available (Firebase token)
        if (data.data.token) {
          saveToken(data.data.token);
        }
        // Store user info for the app
        localStorage.setItem('user', JSON.stringify(data.data.victim));
        
        message.success(`Welcome back, ${data.data.victim.firstName}!`);
        navigate("/dashboard");
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (err) {
      console.error('Login error:', err);
      message.error(err?.response?.data?.message || err.message || "Login failed");
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
            Sign in
          </Typography.Title>

          <Typography.Paragraph
            style={{
              marginBottom: 24,
              textAlign: "center",
              color: "#666",
            }}
          >
            Enter your credentials to continue.
          </Typography.Paragraph>

          <Form layout="vertical" onFinish={onFinish} initialValues={{ identifier: "", password: "" }}>
            <Form.Item 
              name="identifier" 
              label="Username or Email" 
              rules={[{ required: true, message: "Please enter your username or email" }]}
            >
              <Input placeholder="Username or email" size={screens.md ? "large" : "middle"} />
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
                backgroundColor: "#e91e63",
                borderColor: "#e91e63",
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Sign in
            </Button>

            <div style={{ marginTop: 12, textAlign: "center" }}>
              <Typography.Text style={{ color: "#888" }}>
                No account?{" "}
                <Link style={{ color: "#e91e63" }} to="/signup">
                  Create one
                </Link>
              </Typography.Text>
            </div>
          </Form>
        </div>
      </Card>
    </Flex>
  );
}