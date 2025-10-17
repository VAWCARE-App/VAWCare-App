// src/pages/barangay/CaseDetail.js
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Descriptions,
  Button,
  Tag,
  Form,
  Input,
  Select,
  message,
  Typography,
  Space,
  Divider,
  Layout,
} from "antd";
import {
  PrinterOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { api, getUserType } from "../../lib/api";
import DssSuggestion from "../../components/DssSuggestion";
import { useReactToPrint } from "react-to-print";

const { Content } = Layout;
const { Title } = Typography;

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const printRef = useRef();
  const userType = getUserType();
  const location = useLocation();

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await api.get(`/api/cases/${id}`);
        setCaseData(res.data.data);
        form.setFieldsValue(res.data.data);
      } catch {
        message.error("Failed to load case data");
      }
    };
    fetchCase();
    // If URL contains ?edit=true, enable edit mode automatically
    try {
      const qp = new URLSearchParams(location.search);
      if (qp.get('edit') === 'true') setEditing(true);
    } catch (e) {
      // ignore
    }
  }, [id, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const res = await api.put(`/api/cases/${id}`, values);
      setCaseData(res.data.data);
      setEditing(false);
      message.success("Case updated successfully");
    } catch {
      message.error("Update failed");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  if (!caseData)
    return <p style={{ textAlign: "center", marginTop: 50 }}>Loading...</p>;

  return (
    <Layout style={{ width: "100%", background: "#FFF5F8", minHeight: "100vh" }}>
      <Content style={{ maxWidth: "100%", paddingTop: 32, paddingBottom: 32, paddingLeft: 16, paddingRight: 16 }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderColor: "#e91e63", color: "#e91e63" }}
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0, color: "#e91e63" }}>
            Case Details
          </Title>
        </Space>

        <Divider />

        <Space style={{ marginBottom: 24 }}>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          {editing ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              style={{ background: "#e91e63", borderColor: "#e91e63" }}
              onClick={handleSave}
            >
              Save
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<EditOutlined />}
              style={{ background: "#e91e63", borderColor: "#e91e63" }}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
        </Space>

        {editing ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 800,
                background: "#fff",
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 6px 16px rgba(233, 30, 99, 0.1)",
                border: "1px solid #f9c4d2",
              }}
            >
              <Typography.Title
                level={4}
                style={{
                  color: "#e91e63",
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                Edit Case Information
              </Typography.Title>

              <Form
                form={form}
                layout="vertical"
                style={{ width: "100%" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20,
                  }}
                >
                  <Form.Item name="victimType" label="Victim Type">
                    <Select>
                      <Select.Option value="child">Child</Select.Option>
                      <Select.Option value="woman">Woman</Select.Option>
                      <Select.Option value="anonymous">Anonymous</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="victimName" label="Victim Name">
                    <Input />
                  </Form.Item>

                  <Form.Item name="incidentType" label="Incident Type">
                    <Select
                      options={[
                        { value: "Physical", label: "Physical" },
                        { value: "Verbal", label: "Verbal" },
                        { value: "Other", label: "Other" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="perpetrator" label="Perpetrator">
                    <Input />
                  </Form.Item>

                  <Form.Item name="location" label="Location">
                    <Input />
                  </Form.Item>

                  <Form.Item name="status" label="Status">
                    <Select
                      options={[
                        { value: "Open", label: "Open" },
                        { value: "In Progress", label: "In Progress" },
                        {value:"Cancelled", label:"Cancelled"},
                        { value: "Closed", label: "Closed" },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="assignedOfficer" label="Assigned Officer">
                    <Input />
                  </Form.Item>

                  <Form.Item name="riskLevel" label="Risk Level">
                    <Select
                      options={[
                        { value: "Low", label: "Low" },
                        { value: "Medium", label: "Medium" },
                        { value: "High", label: "High" },
                      ]}
                    />
                  </Form.Item>
                </div>

                <Form.Item name="description" label="Description">
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Form>
            </div>
          </div>
        ) : (
          <div ref={printRef} style={{ marginTop: 16 }}>
            <Descriptions
              bordered
              size="middle"
              column={1}
              labelStyle={{ width: 220, background: "#fafafa" }}
            >
              <Descriptions.Item label="Victim Type">
                {caseData.victimType ? (caseData.victimType.charAt(0).toUpperCase() + caseData.victimType.slice(1)) : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Case ID">
                {caseData.caseID}
              </Descriptions.Item>
              <Descriptions.Item label="Victim">
                {caseData.victimName}
              </Descriptions.Item>
              <Descriptions.Item label="Incident Type">
                {caseData.incidentType}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {caseData.description}
              </Descriptions.Item>
              <Descriptions.Item label="Perpetrator">
                {caseData.perpetrator}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {caseData.location}
              </Descriptions.Item>
              <Descriptions.Item label="Date Reported">
                {new Date(caseData.dateReported).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    caseData.status === "Open"
                      ? "red"
                      : caseData.status === "Closed"
                        ? "green"
                        : "blue"
                  }
                >
                  {caseData.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Officer">
                {caseData.assignedOfficer}
              </Descriptions.Item>
              <Descriptions.Item label="Risk Level">
                <Tag
                  color={
                    caseData.riskLevel === "High"
                      ? "red"
                      : caseData.riskLevel === "Medium"
                        ? "orange"
                        : "green"
                  }
                >
                  {caseData.riskLevel}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {!editing && (userType === "admin" || userType === "official") && (
          <div style={{ marginTop: 32 }}>
            <Divider />
            <DssSuggestion caseData={caseData} />
          </div>
        )}
      </Content>
    </Layout>
  );
}
