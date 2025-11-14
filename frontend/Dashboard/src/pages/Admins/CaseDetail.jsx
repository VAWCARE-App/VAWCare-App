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
  Layout,
  Modal,
  Grid,
  Card,
  Tooltip,
  Segmented,
} from "antd";
import {
  PrinterOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  SafetyCertificateTwoTone,
} from "@ant-design/icons";
import { api, getUserType } from "../../lib/api";
import DssSuggestion from "../../components/DssSuggestion";
import { useReactToPrint } from "react-to-print";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const BRAND = {
  violet: "#7A5AF8",
  pink: "#e91e63",
  pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
  soft: "rgba(122,90,248,0.18)",
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null);
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  // PRINT TARGET
  const printRef = useRef(null);

  // Primary print path
  const reactToPrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle:
      caseData && caseData.caseID ? `Case-${caseData.caseID}` : "Case",
    copyStyles: true,
    removeAfterPrint: true,
    pageStyle: `
      @page { size: A4; margin: 16mm; }
      .no-print { display: none !important; }
      .print-area { display: block !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .ant-layout-header { position: static !important; }
      .ant-descriptions-bordered .ant-descriptions-view > table { border-collapse: collapse !important; width: 100% !important; }
      .ant-descriptions-bordered .ant-descriptions-row > th,
      .ant-descriptions-bordered .ant-descriptions-row > td {
        border: 1px solid #bfbfbf !important;
        padding: 8px !important;
        vertical-align: top !important;
        background: #fff !important;
        color: #000 !important;
      }
    `,
  });

  // Fallback print: open a new window with only the print area HTML
  const fallbackPrint = () => {
    if (!printRef.current) {
      message.error("Nothing to print: content isn't ready.");
      return;
    }
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${caseData?.caseID ? `Case-${caseData.caseID}` : "Case"}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @page { size: A4; margin: 16mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, "Noto Sans", "Helvetica Neue", sans-serif; color:#000; }
    .card {
      border: 1px solid #d9d9d9; border-radius: 12px; padding: 0; background:#fff;
    }
    .desc table { border-collapse: collapse; width: 100%; }
    .desc th, .desc td {
      border: 1px solid #bfbfbf; padding: 8px; vertical-align: top; text-align: left;
    }
    .desc th { background: #f7f7f7; width: 220px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .meta { margin: 0 0 12px; font-size: 12px; color:#555; }
  </style>
</head>
<body>
  <h1>Case Details</h1>
  <p class="meta">${caseData?.caseID ? `Case ID: ${caseData.caseID}` : ""}</p>
  <div class="card">
    <div class="desc">
      ${printRef.current.innerHTML}
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
        window.close();
      }, 30);
    });
  </script>
</body>
</html>`;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      message.error("Please allow pop-ups for this site to print.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // Wrapper: prefer react-to-print, fallback if it fails or returns immediately without opening dialog
  const onPrintClick = async () => {
    try {
      if (!caseData) {
        message.error("Case data not loaded yet.");
        return;
      }
      if (!printRef.current) {
        message.error("Print target is not ready.");
        return;
      }
      if (editOpen) {
        setEditOpen(false);
        // Give the DOM a brief tick to settle after closing modal
        setTimeout(async () => {
          try {
            const res = await reactToPrint();
            // react-to-print doesn't always throw on failure,
            // so as a safety net, also trigger fallback if no dialog opened in some browsers.
            // (We can't detect dialog reliably, so we just rely on the try/catch path.)
          } catch {
            fallbackPrint();
          }
        }, 80);
      } else {
        try {
          await reactToPrint();
        } catch {
          fallbackPrint();
        }
      }
    } catch {
      fallbackPrint();
    }
  };

  // --- load case ---
  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const type = await getUserType();
        setUserType(type);
      } catch (err) {
        console.error("Failed to get user type", err);
        setUserType("user"); // fallback
      }
    };
    fetchUserType();

    const fetchCase = async () => {
      try {
        const res = await api.get(`/api/cases/${id}`);
        const data = res?.data?.data || null;
        setCaseData(data);
        form.setFieldsValue(data || {});
      } catch {
        message.error("Failed to load case data");
      }
    };
    fetchCase();

    // URL ?edit=true opens the modal
    try {
      const qp = new URLSearchParams(location.search);
      if (qp.get("edit") === "true") setEditOpen(true);
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- save case ---
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await api.put(`/api/cases/${id}`, values);
      const updated = res?.data?.data;
      setCaseData(updated);
      setEditOpen(false);
      message.success("Case updated successfully");
    } catch {
      message.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  // pills
  const StatusPill = ({ value }) => {
    const map = {
      Open: { color: "pink", text: "Open" },
      "Under Investigation": { color: "blue", text: "Under Inv." },
      Cancelled: { color: "default", text: "Cancelled" },
      Resolved: { color: "green", text: "Resolved" },
    };
    const m = map[value] || { color: "default", text: value || "—" };
    return (
      <Tag color={m.color} style={{ borderRadius: 999, paddingInline: 10 }}>
        {m.text}
      </Tag>
    );
  };
  const RiskPill = ({ value }) => {
    const map = {
      Low: { color: "green", text: "Low" },
      Medium: { color: "orange", text: "Medium" },
      High: { color: "red", text: "High" },
    };
    const m = map[value] || { color: "default", text: value || "—" };
    return (
      <Tag color={m.color} style={{ borderRadius: 999, paddingInline: 10 }}>
        {m.text}
      </Tag>
    );
  };

  if (!caseData)
    return <p style={{ textAlign: "center", marginTop: 50 }}>Loading...</p>;

  return (
    <Layout
      style={{ minHeight: "100vh", width: "100%", background: BRAND.pageBg }}
    >
      {/* Sticky header — excluded from print */}
      <Header
        className="no-print fade-in"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: BRAND.pageBg,
          borderBottom: `1px solid ${BRAND.soft}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderColor: BRAND.violet, color: BRAND.violet }}
          >
            {screens.md ? "Back" : null}
          </Button>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Case Details
            </Title>
            {screens.md && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                View, edit, and print case information.
              </Text>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button 
            icon={<PrinterOutlined />} 
            onClick={onPrintClick}
          >
            {screens.md ? "Print" : null}
          </Button>
          {(userType === "admin" || userType === "official") && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                form.setFieldsValue(caseData);
                setEditOpen(true);
              }}
              style={{ background: BRAND.violet, borderColor: BRAND.violet }}
            >
              {screens.md ? "Edit" : null}
            </Button>
          )}
        </div>
      </Header>

      <Content
        className="fade-in-up"
        style={{
          padding: screens.md ? 20 : 12,
          display: "grid",
          gap: 14,
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Summary band */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.md ? "1fr 1fr 1fr 1.4fr" : "1fr",
            gap: 12,
          }}
        >
          <Card
            className="hover-lift"
            style={{
              borderRadius: 14,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.92), rgba(255,255,255,.84))",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Text type="secondary">Case ID</Text>
            <div style={{ fontSize: 22, fontWeight: 900, color: BRAND.violet }}>
              {caseData.caseID}
            </div>
          </Card>
          <Card
            className="hover-lift"
            style={{
              borderRadius: 14,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.92), rgba(255,255,255,.84))",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Text type="secondary">Status</Text>
            <div style={{ marginTop: 8 }}>
              <StatusPill value={caseData.status} />
            </div>
          </Card>
          <Card
            className="hover-lift"
            style={{
              borderRadius: 14,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.92), rgba(255,255,255,.84))",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Text type="secondary">Risk</Text>
            <div style={{ marginTop: 8 }}>
              <RiskPill value={caseData.riskLevel} />
            </div>
          </Card>
          <Card
            className="hover-lift"
            style={{
              borderRadius: 14,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.92), rgba(255,255,255,.84))",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <Text type="secondary">Reported</Text>
            <div style={{ marginTop: 6, fontWeight: 700 }}>
              {caseData.dateReported
                ? new Date(caseData.dateReported).toLocaleString()
                : "—"}
            </div>
          </Card>
        </div>

        {/* PRINT AREA — only this renders in print */}
        <div ref={printRef} className="print-area">
          <Card
            style={{
              borderRadius: 16,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.94))",
            }}
            bodyStyle={{ padding: 0 }}
          >
            <Descriptions
              bordered
              size="middle"
              column={1}
              labelStyle={{ width: 220, background: "#fafafa" }}
            >
              <Descriptions.Item label="Victim Type">
                {caseData.victimType
                  ? caseData.victimType.charAt(0).toUpperCase() +
                  caseData.victimType.slice(1)
                  : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Victim">
                {caseData.victimName}
              </Descriptions.Item>
              <Descriptions.Item label="Incident Type">
                {caseData.incidentType}
              </Descriptions.Item>
              <Descriptions.Item label="Perpetrator">
                {caseData.perpetrator}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {caseData.location}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {caseData.description}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusPill value={caseData.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Officer">
                {caseData.assignedOfficer}
              </Descriptions.Item>
              <Descriptions.Item label="Risk Level">
                <RiskPill value={caseData.riskLevel} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        {/* DSS Suggestion — hidden in print */}
        {(userType === "admin" || userType === "official") && (
          <Card
            className="no-print hover-lift"
            style={{
              borderRadius: 16,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.94))",
            }}
            bodyStyle={{ padding: 12 }}
          >
            <DssSuggestion caseData={caseData} />
          </Card>
        )}
      </Content>

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              style={{ background: BRAND.violet, borderColor: BRAND.violet }}
            >
              Save
            </Button>
          </Space>
        }
        width={screens.lg ? 720 : "96vw"}
        centered
        destroyOnClose
        maskStyle={{ backdropFilter: "blur(2px)" }}
        wrapClassName="case-edit-modal"
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", padding: "16px 24px" }
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SafetyCertificateTwoTone
              twoToneColor={BRAND.violet}
              style={{ fontSize: 22 }}
            />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 800 }}>Edit Case</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Update fields below, then click Save.
              </Text>
            </div>
          </div>
        }
        getContainer={false}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 4 }}
          initialValues={{
            status: caseData?.status,
            riskLevel: caseData?.riskLevel,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: screens.md ? "1fr 1fr" : "1fr",
              gap: 12,
            }}
          >
            <Form.Item name="victimType" label="Victim Type">
              <Select
                options={[
                  { value: "child", label: "Child" },
                  { value: "woman", label: "Woman" },
                  { value: "anonymous", label: "Anonymous" },
                ]}
              />
            </Form.Item>

            <Form.Item name="victimName" label="Victim Name">
              <Input />
            </Form.Item>

            <Form.Item name="incidentType" label="Incident Type">
              <Select
                options={[
                  { value: "Physical", label: "Physical" },
                  { value: "Verbal", label: "Verbal" },
                  { value: "Economic", label: "Economic" },
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

            {/* Status with full text + hover color */}
            <Form.Item name="status" label="Status">
              <Segmented
                className="seg-full"
                block
                options={[
                  { label: <span>Open</span>, value: "Open" },
                  { label: <span>Under Investigation</span>, value: "Under Investigation" },
                  { label: <span>Cancelled</span>, value: "Cancelled" },
                  { label: <span>Resolved</span>, value: "Resolved" },
                ]}
                onChange={(v) => form.setFieldsValue({ status: v })}
              />
            </Form.Item>

            {/* Risk with full text + hover color */}
            <Form.Item name="riskLevel" label="Risk Level">
              <Segmented
                className="seg-full"
                block
                options={[
                  { label: <span>Low</span>, value: "Low" },
                  { label: <span>Medium</span>, value: "Medium" },
                  { label: <span>High</span>, value: "High" },
                ]}
                onChange={(v) => form.setFieldsValue({ riskLevel: v })}
              />
            </Form.Item>

            <Form.Item name="assignedOfficer" label="Assigned Officer">
              <Input />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              style={{ gridColumn: "1 / -1" }}
            >
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Styles */}
      <style>{`
        /* Remove button outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        button:focus,
        button:active {
          outline: none !important;
          box-shadow: none !important;
        }

        .hover-lift { transition: transform .18s ease, box-shadow .18s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(16,24,40,.12); }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .fade-in { animation: fadeIn .24s ease both; }
        .fade-in-up { animation: fadeInUp .28s ease both; }

        .case-edit-modal .ant-modal-content {
          border-radius: 18px;
          border: 1px solid ${BRAND.soft};
          background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(255,255,255,.90));
          box-shadow: 0 22px 60px rgba(16,24,40,.18);
          overflow: hidden;
        }
        .case-edit-modal .ant-modal-header {
          border-bottom: 1px solid ${BRAND.soft};
          background: rgba(248,248,255,.8);
          padding: 12px 16px;
        }
        .case-edit-modal .ant-modal-title { line-height: 1; }
        .case-edit-modal .ant-modal-body { padding: 14px; }
        .case-edit-modal .ant-modal-footer {
          border-top: 1px solid ${BRAND.soft};
          padding: 10px 16px;
        }

        .case-edit-modal .seg-full .ant-segmented { width: 100%; }
        .case-edit-modal .seg-full .ant-segmented-group { display: flex; flex-wrap: wrap; gap: 6px; }
        .case-edit-modal .seg-full .ant-segmented-item { flex: 0 0 auto; border-radius: 999px; transition: background .15s ease, box-shadow .15s ease, color .15s ease; }
        .case-edit-modal .seg-full .ant-segmented-item-label { white-space: normal; line-height: 1.1; padding: 8px 12px; }
        .case-edit-modal .seg-full .ant-segmented-item:hover { background: rgba(122,90,248,.10); }
        .case-edit-modal .seg-full .ant-segmented-item-selected { box-shadow: 0 6px 14px rgba(122,90,248,.18); }

        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; position: static !important; }
          .ant-layout-header { position: static !important; }
        }
      `}</style>
    </Layout>
  );
}
