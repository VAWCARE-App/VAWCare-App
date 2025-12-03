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
  Row,
  Col,
  Timeline,
  Empty,
  Spin,
} from "antd";
import {
  PrinterOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  SafetyCertificateTwoTone,
  HistoryOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  PlusOutlined,
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
  const [barangayOfficials, setBarangayOfficials] = useState([]);
  
  // History/Remarks state
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [addRemarkOpen, setAddRemarkOpen] = useState(false);
  const [viewAllRemarksOpen, setViewAllRemarksOpen] = useState(false);
  const [remarkForm] = Form.useForm();

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

  // --- fetch barangay officials ---
  const fetchBarangayOfficials = async () => {
    try {
      const { data } = await api.get("/api/admin/users");
      if (data.success && data.data.officials) {
        const officials = data.data.officials.map((o) => ({
          id: o._id,
          name: `${o.firstName} ${o.middleInitial ? o.middleInitial + " " : ""}${o.lastName}`,
          firstName: o.firstName,
          middleInitial: o.middleInitial,
          lastName: o.lastName,
          position: o.position,
          status: o.status,
        }));
        setBarangayOfficials(officials);
      }
    } catch (err) {
      console.error("Error fetching barangay officials", err);
    }
  };

  // --- fetch history ---
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      // Fetch both history logs and remarks
      const [historyRes, remarksRes] = await Promise.all([
        api.get(`/api/cases/${id}/history`),
        api.get(`/api/cases/${id}/remarks`)
      ]);
      
      const logs = historyRes?.data?.data || [];
      const remarks = remarksRes?.data?.data || [];
      
      // Filter out case_remark from logs (we'll use the Remark collection data instead)
      // This avoids duplicates since remarks are now stored only in Remark collection
      const filteredLogs = logs.filter(log => log.action !== 'case_remark');
      
      // Merge remarks into history logs for unified display
      const mergedHistory = [
        ...filteredLogs,
        ...remarks.map(remark => ({
          ...remark,
          action: 'case_remark',
          timestamp: remark.createdAt,
          details: remark.content // Use content as details for display
        }))
      ];
      
      // Sort all by timestamp, newest first
      mergedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setHistoryData(mergedHistory);
    } catch (err) {
      console.error("Failed to load case history", err);
    } finally {
      setHistoryLoading(false);
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
        
        // Parse location into purok and address components
        let locationPurok = "";
        const location = data?.location || "";
        if (location.startsWith("Purok")) {
          const parts = location.split(", ");
          locationPurok = parts[0]; // e.g., "Purok 1"
        }
        
        form.setFieldsValue({
          ...data,
          locationPurok: locationPurok,
          locationAddress: "Bonfal Proper, Bayombong, Nueva Vizcaya",
        });
      } catch {
        message.error("Failed to load case data");
      }
    };
    fetchCase();
    fetchHistory();
    fetchBarangayOfficials();

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
      // Combine location fields: if purok selected, prepend to default address
      const location = values.locationPurok
        ? `${values.locationPurok}, Bonfal Proper, Bayombong, Nueva Vizcaya`
        : "Bonfal Proper, Bayombong, Nueva Vizcaya";
      
      // Get officer name from ID - convert ID to name
      const assignedOfficerId = values.assignedOfficer;
      const selectedOfficer = barangayOfficials.find(o => o.id === assignedOfficerId);
      const assignedOfficerName = selectedOfficer ? selectedOfficer.name : values.assignedOfficer;
      
      const payload = {
        ...values,
        location: location,
        assignedOfficer: assignedOfficerName,
      };
      const res = await api.put(`/api/cases/${id}`, payload);
      const updated = res?.data?.data;
      setCaseData(updated);
      setEditOpen(false);
      message.success("Case updated successfully");
      fetchHistory(); // Refresh history after update
    } catch {
      message.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  // --- add remark ---
  const handleAddRemark = async () => {
    try {
      const values = await remarkForm.validateFields();
      setLoading(true);
      const res = await api.post(`/api/cases/${id}/remark`, {
        remark: values.remark
      });
      if (res?.data?.success) {
        message.success("Remark added successfully");
        setAddRemarkOpen(false);
        remarkForm.resetFields();
        fetchHistory(); // Refresh history
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to add remark");
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
          {/* <Button 
            icon={<PrinterOutlined />} 
            onClick={onPrintClick}
          >
            {screens.md ? "Print" : null}
          </Button> */}
          {(userType === "admin" || userType === "official") && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                // Parse location into purok and address components
                let locationPurok = "";
                const location = caseData.location || "";
                if (location.startsWith("Purok")) {
                  const parts = location.split(", ");
                  locationPurok = parts[0]; // e.g., "Purok 1"
                }
                
                form.setFieldsValue({
                  ...caseData,
                  locationPurok: locationPurok,
                  locationAddress: "Bonfal Proper, Bayombong, Nueva Vizcaya",
                });
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

        {/* Case Details and History Side by Side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.lg ? "1fr 1fr" : "1fr",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          {/* PRINT AREA — only this renders in print */}
          <div ref={printRef} className="print-area">
            <Card
              className="hover-lift"
              style={{
                borderRadius: 16,
                border: `1px solid ${BRAND.soft}`,
                background:
                  "linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.94))",
                height: "100%",
              }}
              bodyStyle={{ 
                padding: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <Descriptions
                bordered
                size={screens.xs ? "small" : "middle"}
                column={1}
                labelStyle={{ 
                  width: screens.xs ? 120 : 180, 
                  background: "#fafafa",
                  padding: screens.xs ? "8px" : "12px"
                }}
                contentStyle={{
                  padding: screens.xs ? "8px" : "12px"
                }}
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

          {/* History of Remarks — hidden in print */}
          {(userType === "admin" || userType === "official") && (
            <Card
              className="no-print hover-lift"
              style={{
                borderRadius: 16,
                border: `1px solid ${BRAND.soft}`,
                background:
                  "linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.94))",
                height: "100%",
              }}
              bodyStyle={{ 
                padding: screens.xs ? 12 : 16,
                height: "100%",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 16,
                flexShrink: 0
              }}>
                <Space>
                  <HistoryOutlined style={{ fontSize: 20, color: BRAND.violet }} />
                  <Title level={5} style={{ margin: 0, color: BRAND.violet }}>
                    Actions & Remarks Logs
                  </Title>
                </Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddRemarkOpen(true)}
                  style={{ 
                    background: BRAND.violet, 
                    borderColor: BRAND.violet,
                    borderRadius: 8
                  }}
                  size={screens.xs ? "small" : "middle"}
                >
                  {screens.md ? "Add Remark" : "Add"}
                </Button>
              </div>

              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: 40, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin tip="Loading history..." />
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Text type="secondary">No history records found for this case</Text>
                    }
                    style={{ padding: 20 }}
                  />
                </div>
              ) : (
                <div style={{ 
                  flex: 1,
                  maxHeight: screens.lg ? 490 : 400, 
                  overflowY: 'auto',
                  padding: '8px 4px',
                  borderRadius: 8,
                  background: '#fafafa'
                }}>
                  <Timeline
                    mode="right"
                    items={historyData.map((log, idx) => {
                      const actionColors = {
                        'edit_case': 'blue',
                        'view_case': 'green',
                        'delete_case': 'red',
                        'case_remark': 'purple',
                      };
                      
                      const actionLabels = {
                        'edit_case': 'Case Updated',
                        'view_case': 'Case Viewed',
                        'delete_case': 'Case Deleted',
                        'case_remark': 'Remark Added',
                      };

                      return {
                        color: actionColors[log.action] || 'gray',
                        dot: log.action === 'case_remark' ? (
                          <CommentOutlined style={{ fontSize: 16 }} />
                        ) : (
                          <ClockCircleOutlined style={{ fontSize: 16 }} />
                        ),
                        children: (
                          <Card
                            size="small"
                            style={{
                              background: '#fff',
                              borderRadius: 8,
                              border: `1px solid ${BRAND.soft}`,
                              marginBottom: idx < historyData.length - 1 ? 12 : 0
                            }}
                            bodyStyle={{ padding: screens.xs ? 10 : 12 }}
                          >
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: 8
                              }}>
                                <Tag 
                                  color={actionColors[log.action] || 'default'}
                                  style={{ 
                                    borderRadius: 999,
                                    fontWeight: 600,
                                    fontSize: screens.xs ? 11 : 12
                                  }}
                                >
                                  {actionLabels[log.action] || log.action}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: screens.xs ? 11 : 12 }}>
                                  {new Date(log.timestamp).toLocaleString()}
                                </Text>
                              </div>
                              
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6,
                                marginTop: 4
                              }}>
                                <UserOutlined style={{ color: BRAND.violet, fontSize: 14 }} />
                                <Text strong style={{ fontSize: screens.xs ? 12 : 13 }}>
                                  {log.actorName || log.actorBusinessId || 'Unknown User'}
                                </Text>
                              </div>

                              {log.details && (
                                <div style={{ 
                                  marginTop: 8,
                                  padding: 10,
                                  background: '#f9f9f9',
                                  borderRadius: 6,
                                  borderLeft: `3px solid ${actionColors[log.action] || '#d9d9d9'}`
                                }}>
                                  <Text style={{ fontSize: screens.xs ? 12 : 13 }}>
                                    {log.details}
                                  </Text>
                                </div>
                              )}
                            </Space>
                          </Card>
                        )
                      };
                    })}
                  />
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Remarks Section — Full Width and Presentable */}
        {historyData.length > 0 && historyData.filter(log => log.action === 'case_remark').length > 0 && (
          <Card
            className="no-print hover-lift"
            style={{
              borderRadius: 16,
              border: `1px solid ${BRAND.soft}`,
              background:
                "linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.94))",
            }}
            bodyStyle={{ padding: screens.xs ? 12 : 16 }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12
            }}>
              <Space>
                <CommentOutlined style={{ fontSize: 20, color: BRAND.violet }} />
                <Title level={5} style={{ margin: 0, color: BRAND.violet }}>
                  Recent Remarks
                </Title>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {historyData.filter(log => log.action === 'case_remark').length} remark{historyData.filter(log => log.action === 'case_remark').length !== 1 ? 's' : ''}
              </Text>
            </div>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: screens.lg ? 'repeat(3, 1fr)' : screens.md ? 'repeat(2, 1fr)' : '1fr',
              gap: 12
            }}>
              {historyData
                .filter(log => log.action === 'case_remark')
                .slice(0, 3)
                .map((remark, idx) => (
                  <Card
                    key={idx}
                    size="small"
                    style={{
                      background: '#fff',
                      borderRadius: 8,
                      border: `1px solid ${BRAND.soft}`,
                      height: '100%'
                    }}
                    bodyStyle={{ padding: screens.xs ? 10 : 12 }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <div>
                        <div style={{ 
                          fontWeight: 600, 
                          color: BRAND.violet, 
                          fontSize: screens.xs ? 12 : 13,
                          marginBottom: 2
                        }}>
                          {remark.actorName}
                        </div>
                        <div style={{ 
                          fontSize: 11, 
                          color: '#999',
                          marginBottom: 8
                        }}>
                          {new Date(remark.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ 
                        color: '#555', 
                        whiteSpace: 'pre-wrap',
                        fontSize: screens.xs ? 12 : 13,
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {remark.details}
                      </div>
                    </Space>
                  </Card>
                ))}
            </div>

            {historyData.filter(log => log.action === 'case_remark').length > 3 && (
              <div style={{ marginTop: 16, textAlign: 'center', paddingTop: 12, borderTop: `1px solid ${BRAND.soft}` }}>
                <Button 
                  type="link" 
                  onClick={() => setViewAllRemarksOpen(true)}
                  style={{ color: BRAND.violet, fontWeight: 600 }}
                >
                  View All Remarks ({historyData.filter(log => log.action === 'case_remark').length} total)
                </Button>
              </div>
            )}
          </Card>
        )}

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

      {/* ADD REMARK MODAL */}
      <Modal
        open={addRemarkOpen}
        onCancel={() => {
          setAddRemarkOpen(false);
          remarkForm.resetFields();
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setAddRemarkOpen(false);
              remarkForm.resetFields();
            }}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddRemark}
              loading={loading}
              style={{ background: BRAND.violet, borderColor: BRAND.violet }}
            >
              Add Remark
            </Button>
          </Space>
        }
        width={screens.md ? 600 : "96vw"}
        centered
        destroyOnClose
        maskStyle={{ backdropFilter: "blur(2px)" }}
        wrapClassName="case-edit-modal"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CommentOutlined style={{ fontSize: 22, color: BRAND.violet }} />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 800 }}>Add Remark</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Add a note or comment about this case
              </Text>
            </div>
          </div>
        }
      >
        <Form
          form={remarkForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="remark"
            label="Remark"
            rules={[
              { required: true, message: "Please enter a remark" },
              { min: 10, message: "Remark must be at least 10 characters" }
            ]}
          >
            <Input.TextArea
              rows={6}
              placeholder="Enter your remark or note about this case..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* VIEW ALL REMARKS MODAL */}
      <Modal
        open={viewAllRemarksOpen}
        onCancel={() => setViewAllRemarksOpen(false)}
        footer={
          <Button onClick={() => setViewAllRemarksOpen(false)}>
            Close
          </Button>
        }
        width={screens.md ? 700 : "96vw"}
        centered
        destroyOnClose
        maskStyle={{ backdropFilter: "blur(2px)" }}
        wrapClassName="case-edit-modal"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CommentOutlined style={{ fontSize: 22, color: BRAND.violet }} />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 800 }}>All Remarks</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                View all remarks and notes for this case
              </Text>
            </div>
          </div>
        }
      >
        <div style={{ 
          maxHeight: '70vh', 
          overflowY: 'auto',
          paddingRight: 8
        }}>
          {historyData
            .filter(log => log.action === 'case_remark')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .length === 0 ? (
              <Empty description="No remarks found" style={{ marginTop: 40 }} />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {historyData
                  .filter(log => log.action === 'case_remark')
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((remark, idx) => (
                    <Card
                      key={idx}
                      size="small"
                      style={{
                        background: '#f9f9f9',
                        borderRadius: 8,
                        border: `1px solid ${BRAND.soft}`,
                      }}
                      bodyStyle={{ padding: 12 }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8
                        }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: BRAND.violet, 
                            fontSize: 14
                          }}>
                            {remark.actorName}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(remark.timestamp).toLocaleString()}
                          </Text>
                        </div>
                        <div style={{ 
                          color: '#555', 
                          whiteSpace: 'pre-wrap',
                          fontSize: 13,
                          lineHeight: 1.6,
                          padding: '8px 0'
                        }}>
                          {remark.details}
                        </div>
                      </Space>
                    </Card>
                  ))}
              </Space>
            )}
        </div>
      </Modal>

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
          validateTrigger={['onChange', 'onBlur']}
          initialValues={{
            status: caseData?.status,
            riskLevel: caseData?.riskLevel,
            locationAddress: "Bonfal Proper, Bayombong, Nueva Vizcaya",
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

            <Form.Item 
              name="victimName" 
              label="Victim Name"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const strValue = String(value).trim();
                    if (/(.)\1{2}/.test(strValue)) {
                      return Promise.reject(new Error('Victim name cannot contain repeated characters'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input 
                onChange={() => form.validateFields(['victimName'])}
                onKeyPress={(e) => {
                  if (/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </Form.Item>

            <Form.Item name="incidentType" label="Incident Type">
              <Select
                options={[
                  { value: "Sexual", label: "Sexual" },
                  { value: "Physical", label: "Physical" },
                  { value: "Psychological", label: "Psychological" },
                  { value: "Economic", label: "Economic" },
                  { value: "Others", label: "Others" }
                ]}
              />
            </Form.Item>

            <Form.Item 
              name="perpetrator" 
              label="Perpetrator"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const strValue = String(value).trim();
                    if (/(.)\1{2}/.test(strValue)) {
                      return Promise.reject(new Error('Perpetrator name cannot contain repeated characters'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input 
                onChange={() => form.validateFields(['perpetrator'])}
                onKeyPress={(e) => {
                  if (/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </Form.Item>

            <Row gutter={12} style={{ width: "100%" }}>
              <Col xs={24} md={12}>
                <Form.Item 
                  name="locationPurok" 
                  label="Purok"
                  rules={[
                    {
                      required: true,
                      message: "Please select a purok",
                    },
                  ]}
                >
                  <Select 
                    placeholder="Select purok"
                    allowClear
                  >
                    <Select.Option value="Purok 1">Purok 1</Select.Option>
                    <Select.Option value="Purok 2">Purok 2</Select.Option>
                    <Select.Option value="Purok 3">Purok 3</Select.Option>
                    <Select.Option value="Purok 4">Purok 4</Select.Option>
                    <Select.Option value="Purok 5">Purok 5</Select.Option>
                    <Select.Option value="Purok 6">Purok 6</Select.Option>
                    <Select.Option value="Purok 7">Purok 7</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item 
                  name="locationAddress" 
                  label="Barangay/Municipality/Province"
                >
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="location" hidden><Input type="hidden" /></Form.Item>

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

            <Form.Item 
              name="assignedOfficer" 
              label="Assigned Officer"
              rules={[
                { required: true, message: "Assigned officer is required" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const selectedOfficer = barangayOfficials.find(o => o.id === value);
                    if (!selectedOfficer) return Promise.resolve();
                    const officerName = selectedOfficer.name;
                    if (!/^[a-zA-Z\s\-'\.]+$/.test(officerName)) {
                      return Promise.reject(new Error('Assigned officer name must contain only letters, spaces, hyphens, apostrophes, or periods'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Select 
                disabled={!editOpen}
                placeholder="Select assigned officer"
                size="large"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={barangayOfficials.map((officer) => ({
                  value: officer.id,
                  label: officer.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              style={{ gridColumn: "1 / -1" }}
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const strValue = String(value).trim();
                    if (/(.)\1{2}/.test(strValue)) {
                      return Promise.reject(new Error('Description cannot contain repeated characters'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.TextArea 
                rows={4}
                onChange={() => form.validateFields(['description'])}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Styles */}
      <style>{`
        /* Custom scrollbar styling */
        .ant-layout-content::-webkit-scrollbar,
        .ant-table-body::-webkit-scrollbar,
        .ant-modal-body::-webkit-scrollbar,
        .ant-card .ant-card-body > div[style*="overflowY: auto"]::-webkit-scrollbar {
          width: 6px;
        }
        .ant-layout-content::-webkit-scrollbar-track,
        .ant-table-body::-webkit-scrollbar-track,
        .ant-modal-body::-webkit-scrollbar-track,
        .ant-card .ant-card-body > div[style*="overflowY: auto"]::-webkit-scrollbar-track {
          background: #f1eeff;
          border-radius: 3px;
        }
        .ant-layout-content::-webkit-scrollbar-thumb,
        .ant-table-body::-webkit-scrollbar-thumb,
        .ant-modal-body::-webkit-scrollbar-thumb,
        .ant-card .ant-card-body > div[style*="overflowY: auto"]::-webkit-scrollbar-thumb {
          background: #a78bfa;
          border-radius: 3px;
        }
        .ant-layout-content::-webkit-scrollbar-thumb:hover,
        .ant-table-body::-webkit-scrollbar-thumb:hover,
        .ant-modal-body::-webkit-scrollbar-thumb:hover,
        .ant-card .ant-card-body > div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
        /* Firefox */
        .ant-layout-content,
        .ant-table-body,
        .ant-modal-body,
        .ant-card .ant-card-body > div[style*="overflowY: auto"] {
          scrollbar-width: thin;
          scrollbar-color: #a78bfa #f1eeff;
        }

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
