import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  Row,
  Col,
  message,
  DatePicker,
  Divider,
  Space,
  Result,
  Progress,
  Badge,
} from "antd";
import { 
  SendOutlined,
  SafetyOutlined,
  LockOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { api, getUserData } from "../../lib/api";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

export default function Report() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [siderWidth, setSiderWidth] = useState(0);
  const [formProgress, setFormProgress] = useState(0);

  // Calculate form completion progress
  const updateProgress = () => {
    const values = form.getFieldsValue();
    const fields = ['incidentType', 'location', 'dateReported', 'description'];
    const filled = fields.filter(field => values[field]).length;
    setFormProgress((filled / fields.length) * 100);
  };

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(".ant-layout-sider");
      setSiderWidth(el ? el.getBoundingClientRect().width : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    document.addEventListener("transitionend", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("transitionend", measure, true);
    };
  }, []);

  const BRAND = useMemo(
    () => ({
      primary: "#e91e63",
      violet: "#7A5AF8",
      primarySoft: "#ffe6ef",
      violetSoft: "rgba(122,90,248,0.05)",
      surface: "#ffffff",
      bg: "linear-gradient(135deg, #faf5ff 0%, #fff0f6 50%, #fef3f9 100%)",
      textMuted: "#6b7280",
      border: "#f8cfe0",
    }),
    []
  );

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const userData = await getUserData();
      const victimID = userData && (userData._id || userData.id);
      if (!victimID) {
        message.error("Victim ID not found. Please log in again.");
        setLoading(false);
        return;
      }

      const dateReported =
        values.dateReported && typeof values.dateReported.toDate === "function"
          ? values.dateReported.toDate()
          : undefined;

      const payload = {
        incidentType: values.incidentType,
        description: values.description,
        perpetrator: values.perpetrator,
        location: values.location,
        dateReported,
        victimID,
      };

      await api.post("/api/reports", payload);
      setSubmitted(true);
      form.resetFields();
    } catch (err) {
      message.error(
        err?.response?.data?.message ||
          "Failed to submit report. Please check your input and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Row justify="center" style={{ minHeight: "100vh", background: BRAND.bg, margin: 0 }}>
        <Col xs={24} sm={22} md={20} lg={14} xl={12} style={{ padding: 16 }}>
          <Result
            status="success"
            title="Report Submitted"
            subTitle="Thank you. Your report has been safely recorded. You can track updates in your dashboard."
            extra={
              <Space wrap>
                <Button type="primary" onClick={() => setSubmitted(false)}>
                  File another report
                </Button>
              </Space>
            }
          />
        </Col>
      </Row>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.bg,
        position: "relative",
      }}
    >
      {/* Decorative floating elements */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: "10%",
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(122,90,248,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "float 6s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 200,
          right: "15%",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,30,99,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "float 8s ease-in-out infinite",
        }}
      />

      {/* Custom CSS for enhanced form styling */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }

          /* Enhanced input focus effects */
          .ant-input:focus,
          .ant-input-focused,
          .ant-picker:hover,
          .ant-picker-focused,
          .ant-select:hover .ant-select-selector,
          .ant-select-focused .ant-select-selector {
            border-color: #7A5AF8 !important;
            box-shadow: 0 0 0 2px rgba(122,90,248,0.1) !important;
          }

          .ant-input:hover,
          .ant-select:not(.ant-select-disabled):not(.ant-select-customize-input):not(.ant-pagination-size-changer):hover .ant-select-selector {
            border-color: #7A5AF8 !important;
          }

          /* Smooth transitions for all inputs */
          .ant-input,
          .ant-input-textarea textarea,
          .ant-select-selector,
          .ant-picker {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }

          /* Enhanced select dropdown */
          .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
            background-color: rgba(122,90,248,0.08) !important;
            color: #7A5AF8 !important;
            font-weight: 600;
          }

          .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
            background-color: rgba(122,90,248,0.05) !important;
          }

          /* Enhanced form labels */
          .ant-form-item-label > label {
            font-weight: 600 !important;
          }

          /* Textarea character count styling */
          .ant-input-textarea-show-count::after {
            color: #7A5AF8 !important;
            font-weight: 500;
          }
        `}
      </style>

      <div style={{ padding: "32px 16px 16px", textAlign: "center", position: "relative" }}>
        <Badge.Ribbon 
          text={
            <Space size={4}>
              <LockOutlined />
              <span>Confidential</span>
            </Space>
          } 
          color={BRAND.violet}
        >
          <SafetyOutlined 
            style={{ 
              fontSize: 56, 
              color: BRAND.primary,
              filter: "drop-shadow(0 4px 8px rgba(233,30,99,0.2))",
            }} 
          />
        </Badge.Ribbon>
        <Title level={2} style={{ color: BRAND.primary, marginBottom: 8, marginTop: 20 }}>
          File an Incident Report
        </Title>
        <Paragraph style={{ color: BRAND.textMuted, margin: "0 0 16px", fontSize: 15 }}>
          Your information helps us respond quickly and keep you safe.
        </Paragraph>
        
        {/* Security badges */}
        <Space size={20} style={{ marginTop: 8 }}>
          <Space size={6}>
            <LockOutlined style={{ color: BRAND.violet, fontSize: 16 }} />
            <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: 500 }}>Encrypted</Text>
          </Space>
          <Space size={6}>
            <SafetyOutlined style={{ color: BRAND.primary, fontSize: 16 }} />
            <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: 500 }}>Private</Text>
          </Space>
          <Space size={6}>
            <CheckCircleOutlined style={{ color: BRAND.violet, fontSize: 16 }} />
            <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: 500 }}>Verified</Text>
          </Space>
        </Space>
      </div>

      <Row justify="center" style={{ margin: 0, position: "relative" }}>
        <Col xs={24} sm={22} md={20} lg={16} xl={12} style={{ padding: 16 }}>
          {/* Progress indicator */}
          {formProgress > 0 && (
            <Card
              style={{
                marginBottom: 16,
                borderRadius: 16,
                border: "1px solid rgba(122,90,248,0.15)",
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 16px rgba(122,90,248,0.08)",
              }}
              bodyStyle={{ padding: "16px 20px" }}
            >
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 14 }}>Form Progress</Text>
                  <Text style={{ fontSize: 13, color: BRAND.violet, fontWeight: 600 }}>
                    {Math.round(formProgress)}%
                  </Text>
                </div>
                <Progress 
                  percent={Math.round(formProgress)} 
                  strokeColor={{
                    '0%': '#7A5AF8',
                    '50%': '#e91e63',
                    '100%': '#ff6ea9',
                  }}
                  showInfo={false}
                  strokeWidth={8}
                  style={{ marginBottom: 0 }}
                />
              </Space>
            </Card>
          )}

          <Card
            style={{
              border: "1px solid rgba(233,30,99,0.12)",
              borderRadius: 24,
              background: "linear-gradient(145deg, #ffffff 0%, #fff5f8 50%, #ffe9f0 100%)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(233,30,99,0.08), 0 4px 16px rgba(255,110,169,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
              position: "relative",
              overflow: "hidden",
            }}
            bodyStyle={{ padding: 32, paddingBottom: 80, position: "relative", zIndex: 1 }}
          >
            {/* Card decorative elements - pink theme */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(233,30,99,0.04) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -40,
                left: -40,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,110,169,0.035) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "40%",
                right: "20%",
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(233,30,99,0.02) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFinish}
              requiredMark="optional"
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="incidentType"
                    label={<Text strong>Type of Incident</Text>}
                    rules={[{ required: true, message: "Please select the type of incident" }]}
                  >
                    <Select 
                      placeholder="Select type" 
                      size="large"
                      style={{ borderRadius: 12 }}
                    >
                      <Option value="Physical">🤕 Physical</Option>
                      <Option value="Sexual">💔 Sexual</Option>
                      <Option value="Psychological">🧠 Psychological</Option>
                      <Option value="Economic">💰 Economic</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="location"
                    label={<Text strong>Location</Text>}
                    rules={[{ required: true, message: "Please enter the location" }]}
                  >
                    <Input 
                      placeholder="Where did it happen?" 
                      allowClear 
                      size="large"
                      prefix={<EnvironmentOutlined style={{ color: BRAND.textMuted }} />}
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="dateReported"
                    label={<Text strong>Date</Text>}
                    rules={[{ required: true, message: "Please select the date" }]}
                  >
                    <DatePicker 
                      style={{ width: "100%", borderRadius: 12 }} 
                      size="large"
                      suffixIcon={<CalendarOutlined style={{ color: BRAND.violet }} />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item 
                name="perpetrator" 
                label={<Text strong>Perpetrator (optional)</Text>}
              >
                <Input 
                  placeholder="Name or description (if known)" 
                  allowClear 
                  size="large"
                  prefix={<UserOutlined style={{ color: BRAND.textMuted }} />}
                  style={{ borderRadius: 12 }}
                />
              </Form.Item>

              <Form.Item
                name="description"
                label={<Text strong>Description</Text>}
                rules={[{ required: true, message: "Please describe the incident" }]}
              >
                <Input.TextArea 
                  rows={5} 
                  placeholder="Describe what happened..." 
                  showCount 
                  maxLength={1200}
                  style={{ 
                    borderRadius: 12,
                    fontSize: 15,
                  }}
                />
              </Form.Item>

              <Divider style={{ 
                marginTop: 16, 
                marginBottom: 20,
                borderColor: "rgba(0,0,0,0.15)",
              }} />

              <div style={{
                background: "linear-gradient(135deg, rgba(233,30,99,0.05) 0%, rgba(255,110,169,0.03) 100%)",
                padding: 20,
                borderRadius: 8,
                border: `1px solid rgba(233,30,99,0.2)`,
                boxShadow: "0 2px 8px rgba(233,30,99,0.08)",
              }}>
                <Space size={10} align="start">
                  <SafetyOutlined style={{ color: BRAND.primary, fontSize: 20, marginTop: 3 }} />
                  <div>
                    <Title level={5} style={{ marginBottom: 8, color: BRAND.primary, fontSize: 15 }}>
                      Legal Agreement & Confidentiality Notice
                    </Title>
                    <Paragraph style={{ marginBottom: 0, fontSize: 14, lineHeight: 1.6, color: "#262626" }}>
                      By submitting this report, you declare under penalty of law that the information provided is 
                      <Text strong> accurate and truthful </Text>
                      to the best of your knowledge. You understand that this report will be used for official 
                      documentation and may be subject to legal proceedings. All reports are 
                      <Text strong style={{ color: BRAND.primary }}> strictly confidential</Text>, 
                      encrypted, and protected under data privacy laws.
                    </Paragraph>
                  </div>
                </Space>
              </div>
            </Form>
          </Card>

          {/* Fixed Bottom Submit Button - Outside Card */}
          <div
            style={{
              position: "fixed",
              left: siderWidth,
              right: 0,
              bottom: 0,
              width: `calc(100% - ${siderWidth}px)`,
              padding: 12,
              background: BRAND.surface,
              borderTop: `1px solid ${BRAND.border}`,
              boxShadow: "0 -6px 20px rgba(0,0,0,0.06)",
              zIndex: 9,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            <Row gutter={12} justify="center">
              <Col xs={24} sm={20} md={12}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SendOutlined />}
                  block
                  style={{
                    background: "linear-gradient(135deg, #e91e63 0%, #ff6ea9 50%, #e56ea9ff 100%)",
                    border: "none",
                    height: 50,
                    borderRadius: 16,
                    fontWeight: 600,
                    fontSize: 16,
                    boxShadow: "0 8px 24px rgba(233,30,99,0.35), 0 4px 12px rgba(255,110,169,0.25)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(233,30,99,0.45), 0 6px 16px rgba(255,110,169,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(233,30,99,0.35), 0 4px 12px rgba(255,110,169,0.25)";
                  }}
                  onClick={() => form.submit()}
                >
                  Submit Report
                </Button>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  );
}
