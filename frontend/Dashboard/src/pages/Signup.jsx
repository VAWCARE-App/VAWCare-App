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

export default function Signup() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const screens = Grid.useBreakpoint();

  // copy same sizing logic as Login
  const maxWidth = screens.xl ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 24 : 16;

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const { confirmPassword, ...payload } = values;
      const { data } = await api.post("/api/auth/signup", payload);
      const token = data?.token;
      if (token) {
        saveToken(token);
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
            <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
              <Input placeholder="Juan Dela Cruz" size={screens.md ? "large" : "middle"} />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: "email" }]}
            >
              <Input placeholder="you@example.com" size={screens.md ? "large" : "middle"} />
            </Form.Item>

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
