// src/pages/barangay/CaseDetail.js
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  Descriptions,
  Button,
  Tag,
  Form,
  Input,
  Select,
  message,
} from "antd";
import { PrinterOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
import { api, getUserType } from "../../lib/api";
import DssSuggestion from "../../components/DssSuggestion";
import { useReactToPrint } from "react-to-print";

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const printRef = useRef();
  const userType = getUserType();

  // Fetch case
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await api.get(`/api/cases/${id}`);
        console.log(res.data.data);
        setCaseData(res.data.data);
        form.setFieldsValue(res.data.data);
      } catch (err) {
        message.error("Failed to load case data");
      }
    };
    fetchCase();
  }, [id, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const res = await api.put(`/api/cases/${id}`, values);
      setCaseData(res.data.data);
      setEditing(false);
      message.success("Case updated successfully");
    } catch (err) {
      message.error("Update failed");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  if (!caseData) return <p>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={`Case: ${caseData.caseID}`}
        extra={
          <>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              style={{ marginRight: 8 }}
            >
              Print
            </Button>
            {editing ? (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
              >
                Save
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
          </>
        }
      >
        {editing ? (
          <Form form={form} layout="vertical">
            <Form.Item name="victimName" label="Victim">
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
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
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
          </Form>
        ) : (
          <div ref={printRef}>
            <Descriptions bordered column={1} size="middle">
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
      </Card>
      {/* DSS suggestion card for admin/official users */}
      {!editing && (userType === "admin" || userType === "official") && (
        <DssSuggestion caseData={caseData} />
      )}
    </div>
  );
}
