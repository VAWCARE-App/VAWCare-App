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
} from "antd";
import { SendOutlined } from "@ant-design/icons";
import { api } from "../../lib/api";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

export default function Report() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [siderWidth, setSiderWidth] = useState(0);

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
      primarySoft: "#ffe6ef",
      surface: "#ffffff",
      bg: "#fff7fb",
      textMuted: "#6b7280",
      border: "#f8cfe0",
    }),
    []
  );

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const victimID = user && (user._id || user.id);
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
        background: `linear-gradient(180deg, ${BRAND.primarySoft}, ${BRAND.bg})`,
      }}
    >
      <div style={{ padding: "32px 16px 8px", textAlign: "center" }}>
        <Title level={2} style={{ color: BRAND.primary, marginBottom: 8 }}>
          File an Incident Report
        </Title>
        <Paragraph style={{ color: BRAND.textMuted, margin: 0 }}>
          Your information helps us respond quickly and keep you safe.
        </Paragraph>
      </div>

      <Row justify="center" style={{ margin: 0 }}>
        <Col xs={24} sm={22} md={20} lg={16} xl={12} style={{ padding: 16 }}>
          <Card
            style={{
              border: `1px solid ${BRAND.border}`,
              borderRadius: 16,
              background: BRAND.surface,
              boxShadow: "0 18px 40px rgba(0,0,0,0.05)",
            }}
            bodyStyle={{ padding: 20, paddingBottom: 80 }}
          >
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
                    <Select placeholder="Select type">
                      <Option value="Physical">Physical</Option>
                      <Option value="Sexual">Sexual</Option>
                      <Option value="Psychological">Psychological</Option>
                      <Option value="Economic">Economic</Option>
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
                    <Input placeholder="Where did it happen?" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="dateReported"
                    label={<Text strong>Date</Text>}
                    rules={[{ required: true, message: "Please select the date" }]}
                  >
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="perpetrator" label={<Text strong>Perpetrator (optional)</Text>}>
                <Input placeholder="Name or description (if known)" allowClear />
              </Form.Item>

              <Form.Item
                name="description"
                label={<Text strong>Description</Text>}
                rules={[{ required: true, message: "Please describe the incident" }]}
              >
                <Input.TextArea rows={5} placeholder="Describe what happened..." showCount maxLength={1200} />
              </Form.Item>

              <Divider style={{ marginTop: 8, marginBottom: 12 }} />

              <Paragraph style={{ color: BRAND.textMuted, marginBottom: 0 }}>
                By submitting, you agree that the information provided is accurate to the best of your knowledge.
              </Paragraph>

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
                        background: BRAND.primary,
                        borderColor: BRAND.primary,
                        height: 44,
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      Submit Report
                    </Button>
                  </Col>
                </Row>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
