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
  Radio,
  Row,
  Col,
  Tabs,
} from "antd";
import { api, saveToken } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

const { Option } = Select;

export default function Signup() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("anonymous");
  const screens = Grid.useBreakpoint();

  const maxWidth = screens.xl ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 20 : 16;
  const formRef = React.useRef();
  const [activeTab, setActiveTab] = useState("1");

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const { confirmPassword, ...payload } = values;

      const victimData = {
        victimUsername: payload.username,
        victimPassword: payload.password,
        victimAccount: payload.victimAccount || "anonymous",
      };

      if (payload.victimAccount === "regular") {
        victimData.victimType = payload.victimType;
        victimData.victimEmail = payload.email;
        victimData.firstName = payload.firstName;
        victimData.lastName = payload.lastName;
        if (payload.address) victimData.address = payload.address;
        if (payload.contactNumber) victimData.contactNumber = payload.contactNumber;
      }

      const { data } = await api.post("/api/victims/register", victimData);

      if (data.success) {
        if (data.data.token) {
          saveToken(data.data.token);
        }
        localStorage.setItem("user", JSON.stringify(data.data.victim));
        message.success("Account created successfully!");
        navigate("/victim-test");
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    formRef.current
      .validateFields()
      .then(values => {
        onFinish(values);
      })
      .catch(errorInfo => {
        const firstErrorField = errorInfo.errorFields[0].name[0];

        // Map fields to tabs
        const tabMapping = {
          "1": ["username", "victimAccount", "victimType", "email"],
          "2": ["firstName", "lastName", "address", "contactNumber", "password", "confirmPassword"]
        };

        // If anonymous account, ignore password errors
        if (accountType === "anonymous" && ["password", "confirmPassword"].includes(firstErrorField)) {
          formRef.current.setFields([
            { name: "password", errors: [] },
            { name: "confirmPassword", errors: [] }
          ]);
          return; // Don't block submission
        }

        // Switch to the tab containing the first error
        for (const [tabKey, fields] of Object.entries(tabMapping)) {
          if (fields.includes(firstErrorField)) {
            setActiveTab(tabKey);
            break;
          }
        }

        // Optional: scroll to the first error field
        const errorFieldElement = document.querySelector(
          `[name="${firstErrorField}"] input, [name="${firstErrorField}"] textarea`
        );
        if (errorFieldElement) {
          errorFieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
          errorFieldElement.focus();
        }

        message.error("Please fill all required fields in the highlighted tab.");
      });
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

          <Form
            layout="vertical"
            onFinish={onFinish}
            ref={formRef}
            initialValues={{ victimAccount: "anonymous" }}
            onValuesChange={(changedValues) => {
              if (changedValues.victimAccount) {
                setAccountType(changedValues.victimAccount);
              }
            }}
          >
            <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
              {/* Tab 1: Account Setup */}
              <Tabs.TabPane tab="Account Setup" key="1">
                <Form.Item name="victimAccount" label="Account Type">
                  <Radio.Group>
                    <Radio value="anonymous">Anonymous Account</Radio>
                    <Radio value="regular">Regular Account</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  name="username"
                  label="Username"
                  rules={[
                    { required: true, message: "Please enter a username" },
                    { min: 4, message: "Username must be at least 4 characters" },
                  ]}
                >
                  <Input
                    placeholder="Enter username"
                    size={screens.md ? "large" : "middle"}
                  />
                </Form.Item>

                {accountType === "regular" && (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="victimType"
                          label="Victim Category"
                          rules={[
                            { required: true, message: "Please select victim type" },
                          ]}
                        >
                          <Select
                            placeholder="Select type"
                            size={screens.md ? "large" : "middle"}
                          >
                            <Option value="Child">Child</Option>
                            <Option value="Woman">Woman</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="email"
                          label="Email"
                          rules={[
                            { required: true, message: "Please enter your email" },
                            { type: "email", message: "Please enter a valid email" },
                          ]}
                        >
                          <Input
                            placeholder="you@example.com"
                            size={screens.md ? "large" : "middle"}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="password"
                      label="Password"
                      rules={[
                        { required: true, message: "Please enter a password" },
                        { min: 8, message: "Password must be at least 8 characters" },
                      ]}
                    >
                      <Input.Password
                        placeholder="At least 8 characters"
                        size={screens.md ? "large" : "middle"}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="confirmPassword"
                      label="Confirm password"
                      dependencies={["password"]}
                      rules={[
                        { required: true, message: "Please confirm your password" },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue("password") === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error("Passwords do not match")
                            );
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        placeholder="Re-enter your password"
                        size={screens.md ? "large" : "middle"}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Tabs.TabPane>

              {/* Tab 2: Personal Info */}
              {accountType === "regular" && (
                <Tabs.TabPane tab="Personal Info" key="2">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="firstName"
                        label="First Name"
                        rules={[
                          { required: true, message: "Please enter your first name" },
                        ]}
                      >
                        <Input
                          placeholder="First name"
                          size={screens.md ? "large" : "middle"}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="lastName"
                        label="Last Name"
                        rules={[
                          { required: true, message: "Please enter your last name" },
                        ]}
                      >
                        <Input
                          placeholder="Last name"
                          size={screens.md ? "large" : "middle"}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="address" label="Address">
                    <Input
                      placeholder="Your address"
                      size={screens.md ? "large" : "middle"}
                    />
                  </Form.Item>

                  <Form.Item
                    name="contactNumber"
                    label="Contact Number"
                    rules={[
                      {
                        pattern: /^(\+63|0)[0-9]{10}$/,
                        message: "Please enter a valid Philippine phone number",
                      },
                    ]}
                  >
                    <Input
                      placeholder="+639123456789 or 09123456789"
                      size={screens.md ? "large" : "middle"}
                    />
                  </Form.Item>
                </Tabs.TabPane>
              )}

            </Tabs>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              onClick={handleSubmit}
              size={screens.md ? "large" : "middle"}
              style={{
                backgroundColor: "#e91e63",
                borderColor: "#e91e63",
                borderRadius: 10,
                fontWeight: 600,
                marginTop: 16,
              }}
            >
              Create Account
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
