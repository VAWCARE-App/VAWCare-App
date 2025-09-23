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
  Modal,
} from "antd";
import { api, saveToken } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

const { Option } = Select;

/* ---------- Background Carousel Layer ---------- */
function BackgroundCarouselLayer({ slides, speed = 30, top = "20vh", opacity = 0.5, reverse = false }) {
  return (
    <div
      className="bg-carousel-layer"
      style={{
        top,
        transform: `rotate(-10deg) perspective(800px) rotateX(8deg)`,
        opacity,
      }}
    >
      <div
        className="bg-carousel-track"
        style={{
          animation: `${reverse ? "slideLoopReverse" : "slideLoop"} ${speed}s linear infinite`,
        }}
      >
        {[...slides, ...slides].map((s, i) => (
          <div key={i} className="bg-slide" style={{ background: s.color }}>
            <span className="bg-slide__text">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Multi-Layer Background Carousel ---------- */
function MultiBackgroundCarousel() {
  const slides = [
    { color: "#ffd1dc", label: "Support" },
    { color: "#ff9bb5", label: "Safety" },
    { color: "#ffc4d3", label: "Care" },
    { color: "#ffb3c4", label: "Hope" },
    { color: "#ff8fa8", label: "Trust" },
  ];

  return (
    <>
      <div className="bg-carousel">
        <BackgroundCarouselLayer slides={slides} speed={28} top="12vh" opacity={0.55} />
        <BackgroundCarouselLayer slides={slides} speed={34} top="28vh" opacity={0.5} reverse />
        <BackgroundCarouselLayer slides={slides} speed={40} top="44vh" opacity={0.45} />
        <BackgroundCarouselLayer slides={slides} speed={48} top="60vh" opacity={0.4} reverse />
        <BackgroundCarouselLayer slides={slides} speed={56} top="76vh" opacity={0.35} />
      </div>

      <style>{`
        .bg-carousel {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .bg-carousel-layer {
          position: absolute;
          left: -15vw;
          right: -15vw;
          height: clamp(160px, 24vh, 220px);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
        }
        .bg-carousel-track {
          display: flex;
          gap: 18px;
          will-change: transform;
        }
        .bg-slide {
          width: clamp(160px, 26vw, 300px);
          height: 100%;
          border-radius: 16px;
          box-shadow:
            inset 0 6px 12px rgba(255,255,255,0.35),
            inset 0 -8px 16px rgba(0,0,0,0.08),
            0 18px 28px rgba(233,30,99,0.12);
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.4s ease;
        }
        .bg-slide:hover { transform: scale(1.05); }
        .bg-slide__text {
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
          font-size: clamp(16px, 2.5vw, 24px);
          opacity: 0.45;
          user-select: none;
        }
        .bg-slide::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.18), transparent 60%);
        }
        @keyframes slideLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideLoopReverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @media (max-width: 576px) {
          .bg-carousel-layer { opacity: 0.3; height: 120px; }
        }
        @media (max-width: 380px) {
          .bg-carousel { display: none; }
        }
        .signup-card { animation: fadeInUp 0.8s ease both; }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

/* ---------- Signup Component ---------- */
export default function Signup() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("anonymous");
  const screens = Grid.useBreakpoint();
  const formRef = React.useRef();
  const [activeTab, setActiveTab] = useState("1");

  const maxWidth = screens.xl ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 20 : 16;

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
        if (data.data.token) saveToken(data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.victim));
        message.success("Account created successfully!");
        // If this was an anonymous signup, go directly to the report page
        const redirect = data.data.victim?.victimAccount === "anonymous" ? "/report" : "/victim-test";
        navigate(redirect);
      } else throw new Error(data.message || "Registration failed");
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // Create anonymous account (one-tap flow) and auto-login
  const createAnonymousTicket = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/api/victims/register", { victimAccount: "anonymous" });
      if (!data || !data.success) throw new Error(data?.message || "Failed to create account");
      const resp = data.data || {};
      if (resp.token) saveToken(resp.token);
      if (resp.victim) localStorage.setItem("user", JSON.stringify(resp.victim));
  message.success("Account created successfully!");
  // anonymous creation should go straight to filing a report
  navigate("/report");
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    formRef.current
      .validateFields()
      .then(values => onFinish(values))
      .catch(errorInfo => {
        const firstErrorField = errorInfo.errorFields[0].name[0];
        const tabMapping = {
          "1": ["username", "victimAccount", "victimType", "email"],
          "2": ["firstName", "lastName", "address", "contactNumber", "password", "confirmPassword"]
        };
        for (const [tabKey, fields] of Object.entries(tabMapping)) {
          if (fields.includes(firstErrorField)) setActiveTab(tabKey);
        }
        message.error("Please fill all required fields in the highlighted tab.");
      });
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#fff0f5" }}>
      <MultiBackgroundCarousel />
      <Flex align="center" justify="center" style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
        <Card
          className="signup-card"
          style={{
            width: "100%",
            maxWidth,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.25)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            padding: cardPadding,
            backdropFilter: "blur(10px) saturate(150%)",
            background: "rgba(255,255,255,0.65)",
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: cardPadding }}>
            <Typography.Title level={3} style={{ marginBottom: 8, textAlign: "center", color: "#e91e63" }}>
              Create your account
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 24, textAlign: "center", color: "#666" }}>
              Fill in your details to get started.
            </Typography.Paragraph>
            <Form
              layout="vertical"
              onFinish={onFinish}
              ref={formRef}
              initialValues={{ victimAccount: "anonymous" }}
              onValuesChange={(changedValues) => {
                if (changedValues.victimAccount) setAccountType(changedValues.victimAccount);
              }}
            >
              <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" style={{ marginBottom: 16 }}>
                <Tabs.TabPane tab="Account Setup" key="1">
                  <Form.Item name="victimAccount" label="Account Type">
                    <Radio.Group>
                      <Radio value="anonymous">Anonymous Account</Radio>
                      <Radio value="regular">Regular Account</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {accountType === 'regular' && (
                    <Form.Item
                      name="username"
                      label="Username"
                      rules={[
                        { required: true, message: "Please enter a username" },
                        { min: 4, message: "Username must be at least 4 characters" },
                      ]}
                    >
                      <Input placeholder="Enter username" size={screens.md ? "large" : "middle"} />
                    </Form.Item>
                  )}
                  {accountType === "regular" && (
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="victimType" label="Victim Category" rules={[{ required: true, message: "Please select victim type" }]}>
                          <Select placeholder="Select type" size={screens.md ? "large" : "middle"}>
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
                          <Input placeholder="you@example.com" size={screens.md ? "large" : "middle"} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  {accountType === 'regular' && (
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
                          <Input.Password placeholder="At least 8 characters" size={screens.md ? "large" : "middle"} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="confirmPassword"
                          label="Confirm Password"
                          dependencies={["password"]}
                          rules={[
                            { required: true, message: "Please confirm your password" },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue("password") === value) return Promise.resolve();
                                return Promise.reject(new Error("Passwords do not match"));
                              },
                            }),
                          ]}
                        >
                          <Input.Password placeholder="Re-enter password" size={screens.md ? "large" : "middle"} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                </Tabs.TabPane>
                {accountType === "regular" && (
                  <Tabs.TabPane tab="Personal Info" key="2">
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: "Please enter your first name" }]}>
                          <Input placeholder="First name" size={screens.md ? "large" : "middle"} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: "Please enter your last name" }]}>
                          <Input placeholder="Last name" size={screens.md ? "large" : "middle"} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="address" label="Address">
                      <Input placeholder="Your address" size={screens.md ? "large" : "middle"} />
                    </Form.Item>
                    <Form.Item
                      name="contactNumber"
                      label="Contact Number"
                      rules={[{ pattern: /^(\+63|0)[0-9]{10}$/, message: "Enter a valid Philippine phone number" }]}
                    >
                      <Input placeholder="+639123456789 or 09123456789" size={screens.md ? "large" : "middle"} />
                    </Form.Item>
                  </Tabs.TabPane>
                )}
              </Tabs>
              {accountType === 'regular' ? (
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
                    marginTop: 12,
                  }}
                >
                  Create Account
                </Button>
              ) : (
                <Button
                  type="default"
                  block
                  onClick={createAnonymousTicket}
                  loading={loading}
                  size={screens.md ? "large" : "middle"}
                  style={{
                    marginTop: 12,
                    borderRadius: 10,
                  }}
                >
                  Create Anonymous Account
                </Button>
              )}
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Typography.Text style={{ color: "#666" }}>
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

      {/* Ticket modal removed: anonymous creation now auto-logs-in and redirects */}
    </div>
  );
}
