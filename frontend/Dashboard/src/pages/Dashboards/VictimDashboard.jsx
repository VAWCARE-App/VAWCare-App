// src/pages/victim/VictimDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Grid,
  Tag,
  List,
  Skeleton,
  Empty,
  Input,
  Avatar,
  Tabs,
} from "antd";
import {
  FileAddOutlined,
  SearchOutlined,
  FileTextOutlined,
  CheckCircleTwoTone,
  ExclamationCircleTwoTone,
  HistoryOutlined,
  PhoneOutlined,
  LinkOutlined,
  BookOutlined,
  ReadOutlined,
  MessageOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Chatbot from "../../components/Chatbot";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function VictimDashboard() {
  const screens = Grid.useBreakpoint();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    totalReports: 0,
    openCases: 0,
    recentActivities: [],
  });

  const [myReports, setMyReports] = useState([]);

  // --- VAWC Hub data (safe defaults; swap to API when ready) ---
  const [hotlines, setHotlines] = useState([]);
  const [news, setNews] = useState([]);
  const [laws, setLaws] = useState([]);
  const [tips, setTips] = useState([]); // Tips & Resources

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#FF6EA9",
    soft: "rgba(122,90,248,0.18)",
    bg: "linear-gradient(180deg, #ffffff 0%, #fbf8ff 60%, #f7f4ff 100%)",
  };

  const resolvedCount = useMemo(
    () => Math.max(metrics.totalReports - metrics.openCases, 0),
    [metrics]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: mRes }, { data: rRes }] = await Promise.all([
          api.get("/api/victims/metrics").catch(() => ({ data: { data: {} } })),
          api.get("/api/victims/reports").catch(() => ({ data: { data: [] } })),
        ]);

        const m = mRes?.data || {};
        setMetrics({
          totalReports: m.totalReports ?? 0,
          openCases: m.openCases ?? 0,
          recentActivities: Array.isArray(m.recentActivities)
            ? m.recentActivities
            : [],
        });

        const reports = Array.isArray(rRes?.data) ? rRes.data : [];
        setMyReports(reports);
      } finally {
        setLoading(false);
        setReportsLoading(false);
      }
    })();

    // Hub defaults (PH) - Updated with legitimate hotlines
    setHotlines([
      {
        name: "Emergency (PH)",
        desc: "Immediate police/medical/fire assistance.",
        number: "911",
        cta: { href: "tel:911", text: "Call 911" },
      },
      {
        name: "NCMH Crisis Hotline",
        desc: "National Center for Mental Health - 24/7 Crisis Intervention.",
        number: "1553 / 0917-899-8727",
        cta: { href: "tel:1553", text: "Call 1553" },
      },
      {
        name: "PNP Women & Children Protection Center",
        desc: "Philippine National Police - WCPC Hotline for VAWC cases.",
        number: "(02) 8723-0401 to 20",
        cta: { href: "tel:0287230401", text: "Call WCPC" },
      },
      {
        name: "DSWD Crisis Intervention Unit",
        desc: "Department of Social Welfare & Development 24/7 hotline.",
        number: "1343 (Toll-free)",
        cta: { href: "tel:1343", text: "Call 1343" },
      },
      {
        name: "Commission on Human Rights",
        desc: "CHR Gender and Development Division for VAWC assistance.",
        number: "(02) 8294-0942",
        cta: { href: "tel:0282940942", text: "Call CHR" },
      },
      {
        name: "Barangay VAW Desk",
        desc: "Nearest barangay desk for VAWC assistance and protection orders.",
        cta: {
          onClick: () => navigate("/victim/victim-barangay"),
          text: "Find Barangay",
        },
      },
    ]);

    setNews([
      {
        title: "How to File a VAWC Case: Step-by-Step Guide",
        source: "Philippine Commission on Women (PCW)",
        href: "https://pcw.gov.ph",
      },
      {
        title: "Barangay Protection Order (BPO) Requirements and Process",
        source: "Department of the Interior and Local Government",
        href: "https://dilg.gov.ph",
      },
      {
        title: "Available Services at Women and Children Protection Units",
        source: "Department of Health",
        href: "https://doh.gov.ph",
      },
      {
        title: "Legal Aid Services for VAWC Survivors",
        source: "Public Attorney's Office (PAO)",
        href: "https://pao.gov.ph",
      },
      {
        title: "DSWD Crisis Intervention and Temporary Shelters",
        source: "Department of Social Welfare and Development",
        href: "https://dswd.gov.ph",
      },
    ]);

    setLaws([
      {
        code: "RA 9262",
        name: "Anti-Violence Against Women and Their Children Act of 2004",
      },
      { 
        code: "RA 9710", 
        name: "Magna Carta of Women (2009)" 
      },
      { 
        code: "RA 11313", 
        name: "Safe Spaces Act (Bawal Bastos Law) - 2019" 
      },
      {
        code: "RA 9208",
        name: "Anti-Trafficking in Persons Act of 2003 (Expanded by RA 10364)",
      },
      {
        code: "RA 7877",
        name: "Anti-Sexual Harassment Act of 1995",
      },
      {
        code: "RA 8505",
        name: "Rape Victim Assistance and Protection Act of 1998",
      },
      {
        code: "RA 11648",
        name: "Act Providing Stronger Protection Against Rape and Sexual Exploitation (2022)",
      },
    ]);

    setTips([
      {
        title: "If you’re in immediate danger",
        desc: "Use the Emergency button or call your local hotline.",
        btn: {
          text: "Emergency",
          icon: <WarningOutlined />,
          onClick: () => navigate("/victim/emergency"),
          primary: true,
        },
      },
      {
        title: "Document safely",
        desc: "Write what happened, where and when—only if it’s safe.",
        btn: {
          text: "File a Report",
          icon: <FileAddOutlined />,
          onClick: () => navigate("/victim/report"),
        },
      },
      {
        title: "Reach your barangay",
        desc: "Your barangay desk can support and guide you.",
        btn: {
          text: "Find Barangay",
          icon: <InfoCircleOutlined />,
          onClick: () => navigate("/victim/victim-barangay"),
        },
      },
      {
        title: "Chat with the assistant",
        desc: "Ask how to track cases and find resources.",
        btn: {
          text: "Open Chat",
          icon: <MessageOutlined />,
          onClick: () => navigate("/victim-chatbot"),
        },
      },
    ]);
  }, [navigate]);

  // ---------- UI helpers ----------
  const GlassCard = ({ children, style, bodyStyle, ...rest }) => (
    <Card
      {...rest}
      style={{
        borderRadius: 18,
        borderColor: BRAND.soft,
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 24px 48px rgba(122,90,248,0.08)",
        ...style,
      }}
      bodyStyle={{ padding: 20, ...bodyStyle }}
    >
      {children}
    </Card>
  );

  const StatPill = ({ label, value, icon, color = BRAND.violet }) => (
    <div
      style={{
        borderRadius: 16,
        padding: "16px 20px",
        background: "linear-gradient(180deg, #ffffff, #f8f5ff)",
        border: `1px solid ${BRAND.soft}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "#fff",
          display: "grid",
          placeItems: "center",
          border: `1px solid ${BRAND.soft}`,
        }}
      >
        {icon}
      </div>
      <div>
        <Text style={{ color: "#888", fontSize: 13 }}>{label}</Text>
        <div style={{ fontSize: 24, color, fontWeight: 800, lineHeight: 1 }}>
          {value}
        </div>
      </div>
    </div>
  );

  const Hero = () => (
    <GlassCard
      style={{
        background:
          "linear-gradient(180deg, #fff1f7 0%, #ffe5f1 40%, #f4eaff 100%)",
      }}
      bodyStyle={{ padding: 20 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.lg ? "1fr auto" : "1fr",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: "#6B49F6" }}>
            Safety & Support
          </Title>
          <Text style={{ color: "#6f6f6f" }}>
            File reports, track case status, and access VAWC resources.
          </Text>
          <div style={{ marginTop: 12 }}>
            <Space wrap>
              <Button
                type="primary"
                icon={<FileAddOutlined />}
                onClick={() => navigate("/victim/report")}
                style={{
                  background: BRAND.violet,
                  borderColor: BRAND.violet,
                  borderRadius: 12,
                  height: 40,
                  fontWeight: 700,
                }}
              >
                File New Report
              </Button>
              <Button
                onClick={() => navigate("/victim/victim-cases")}
                style={{
                  borderColor: BRAND.violet,
                  color: BRAND.violet,
                  borderRadius: 12,
                  height: 40,
                  fontWeight: 700,
                }}
              >
                View My Cases
              </Button>
            </Space>
          </div>
        </div>

        <Input
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Search anything…"
          style={{
            borderRadius: 14,
            borderColor: BRAND.soft,
            background: "#fff",
            width: screens.lg ? 380 : "100%", // was 320
            justifySelf: screens.lg ? "end" : "stretch",
            height: 44,
          }}
        />
      </div>
    </GlassCard>
  );

  // ---- VAWC Hub sections (used below Latest Report) ----
  const HubHotlines = () => (
    <List
      dataSource={hotlines}
      locale={{ emptyText: <Empty description="No hotlines yet" /> }}
      renderItem={(h) => (
        <List.Item style={{ padding: "10px 0" }}>
          <Space
            align="start"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space>
              <Avatar
                style={{ background: "#fff0f6", color: BRAND.pink }}
                icon={<PhoneOutlined />}
              />
              <div>
                <div style={{ fontWeight: 700 }}>{h.name}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{h.desc}</div>
                {h.number && (
                  <Tag color="purple" style={{ marginTop: 6 }}>
                    {h.number}
                  </Tag>
                )}
              </div>
            </Space>
            {h.cta?.href ? (
              <Button
                type="primary"
                href={h.cta.href}
                style={{
                  borderRadius: 12,
                  background: BRAND.violet,
                  borderColor: BRAND.violet,
                }}
              >
                {h.cta.text}
              </Button>
            ) : h.cta?.onClick ? (
              <Button
                onClick={h.cta.onClick}
                style={{
                  borderRadius: 12,
                  borderColor: BRAND.violet,
                  color: BRAND.violet,
                }}
              >
                {h.cta.text}
              </Button>
            ) : null}
          </Space>
        </List.Item>
      )}
    />
  );

  const HubNews = () => (
    <List
      dataSource={news}
      locale={{ emptyText: <Empty description="No news yet" /> }}
      renderItem={(n) => (
        <List.Item style={{ padding: "10px 0" }}>
          <List.Item.Meta
            avatar={
              <Avatar
                style={{ background: "#efeaff", color: BRAND.violet }}
                icon={<LinkOutlined />}
              />
            }
            title={<a href={n.href || "#"}>{n.title}</a>}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {n.source}
              </Text>
            }
          />
        </List.Item>
      )}
    />
  );

  const HubLaws = () => (
    <List
      dataSource={laws}
      locale={{ emptyText: <Empty description="No law entries yet" /> }}
      renderItem={(l) => (
        <List.Item style={{ padding: "10px 0" }}>
          <Space align="start">
            <Avatar
              style={{ background: "#fff0f6", color: BRAND.pink }}
              icon={<BookOutlined />}
            />
            <div>
              <div style={{ fontWeight: 700 }}>
                <Tag color="purple" style={{ marginRight: 8 }}>
                  {l.code}
                </Tag>
                {l.name}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                For guidance only. Contact your LGU/Barangay VAW Desk for help.
              </Text>
            </div>
          </Space>
        </List.Item>
      )}
    />
  );

  // Utility: sort reports by date (desc)
  const sortedReports = useMemo(() => {
    const list = Array.isArray(myReports) ? [...myReports] : [];
    return list.sort(
      (a, b) =>
        new Date(b.dateReported || b.createdAt || 0) -
        new Date(a.dateReported || a.createdAt || 0)
    );
  }, [myReports]);

  // Wider container sizes by breakpoint
  const CONTAINER_MAX = screens.xxl ? 1440 : screens.xl ? 1320 : 1180;

  return (
    <Layout style={{ minHeight: "100vh", background: BRAND.bg }}>
      <Content
        style={{
          padding: screens.md ? 16 : 12,
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: CONTAINER_MAX }}>
          {/* Hero */}
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Hero />
            </Col>
          </Row>

          {/* Main layout */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {/* LEFT column */}
            <Col xs={24} xl={16}>
              {/* Overview */}
              <GlassCard>
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                  <Text strong style={{ color: BRAND.violet, fontSize: 16 }}>
                    Overview
                  </Text>

                  {loading ? (
                    <Skeleton active />
                  ) : (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={8}>
                        <StatPill
                          label="Total Reports"
                          value={metrics.totalReports}
                          icon={
                            <FileTextOutlined style={{ color: BRAND.violet }} />
                          }
                          color={BRAND.violet}
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <StatPill
                          label="Open Cases"
                          value={metrics.openCases}
                          icon={
                            <ExclamationCircleTwoTone
                              twoToneColor={["#FA8C16", "#FFE58F"]}
                            />
                          }
                          color="#FA8C16"
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <StatPill
                          label="Resolved"
                          value={resolvedCount}
                          icon={
                            <CheckCircleTwoTone
                              twoToneColor={["#52C41A", "#D9F7BE"]}
                            />
                          }
                          color="#52C41A"
                        />
                      </Col>
                    </Row>
                  )}
                </Space>
              </GlassCard>

              {/* Latest Report */}
              <GlassCard style={{ marginTop: 16 }}>
                <Text strong style={{ color: BRAND.violet, fontSize: 16 }}>Latest Report</Text>
                {reportsLoading ? (
                  <Skeleton active style={{ marginTop: 16 }} />
                ) : sortedReports.length ? (
                  <div
                    style={{
                      marginTop: 16,
                      borderRadius: 16,
                      padding: 16,
                      background: "#fff",
                      border: `1px solid ${BRAND.soft}`,
                    }}
                  >
                    <Space
                      style={{ width: "100%", justifyContent: "space-between" }}
                    >
                      <Space size={16}>
                        <Avatar
                          size={40}
                          style={{ background: BRAND.violet }}
                          icon={<HistoryOutlined />}
                        />
                        <div>
                          <Text strong>
                            {sortedReports[0]?.reportID || "Report"}
                          </Text>
                          <div style={{ color: "#888", fontSize: 13 }}>
                            {sortedReports[0]?.incidentType || "—"}
                          </div>
                        </div>
                      </Space>
                      <Tag
                        color={
                          ["Open", "Under Investigation"].includes(
                            sortedReports[0]?.status
                          )
                            ? "orange"
                            : "green"
                        }
                      >
                        {sortedReports[0]?.status || "—"}
                      </Tag>
                    </Space>
                    <Button
                      type="link"
                      onClick={() => navigate("/victim/victim-cases")}
                      style={{ padding: 0, marginTop: 8 }}
                    >
                      See details
                    </Button>
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No reports yet"
                    style={{ marginTop: 16 }}
                  />
                )}
              </GlassCard>

              {/* VAWC Hub — directly BELOW Latest Report */}
              <GlassCard
                style={{ marginTop: 16 }}
                title={
                  <Space>
                    <ReadOutlined style={{ color: BRAND.violet, fontSize: 16 }} />
                    <span
                      style={{ color: BRAND.violet, fontWeight: 700, fontSize: 16 }}
                    >{`VAWC Hub (PH)`}</span>
                  </Space>
                }
              >
                <Tabs
                  defaultActiveKey="news"
                  items={[
                    { key: "news", label: "News", children: <HubNews /> },
                    { key: "hotlines", label: "Hotlines", children: <HubHotlines /> },
                    { key: "laws", label: "Laws", children: <HubLaws /> },
                  ]}
                />
              </GlassCard>
            </Col>

            {/* RIGHT column — Report History & Tips & Resources */}
            <Col xs={24} xl={8}>
              {/* Report History */}
              <GlassCard
                title={<span style={{ color: BRAND.violet, fontSize: 16 }}>Report History</span>}
              >
                {loading ? (
                  <Skeleton active />
                ) : sortedReports.length ? (
                  <List
                    dataSource={sortedReports.slice(0, 6)}
                    renderItem={(r) => (
                      <List.Item style={{ padding: "12px 0" }}>
                        <Space
                          style={{ width: "100%", justifyContent: "space-between" }}
                          align="start"
                        >
                          <Space size={12}>
                            <Avatar
                              size={40}
                              style={{ background: "#efeaff", color: BRAND.violet }}
                              icon={<FileTextOutlined />}
                            />
                            <div>
                              <Text strong>{r.reportID || "Report"}</Text>
                              <div style={{ color: "#888", fontSize: 13 }}>
                                {r.incidentType || "—"} •{" "}
                                {r.dateReported
                                  ? new Date(r.dateReported).toLocaleString()
                                  : r.createdAt
                                  ? new Date(r.createdAt).toLocaleString()
                                  : ""}
                              </div>
                            </div>
                          </Space>
                          <Tag
                            color={
                              ["Open", "Under Investigation"].includes(r.status)
                                ? "orange"
                                : "green"
                            }
                          >
                            {r.status || "—"}
                          </Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No history yet" />
                )}
              </GlassCard>

              {/* Tips & Resources */}
              <GlassCard
                style={{ marginTop: 16 }}
                title={
                  <span style={{ color: BRAND.violet, fontSize: 16 }}>Tips & Resources</span>
                }
              >
                {!tips.length ? (
                  <Empty description="No tips yet" />
                ) : (
                  <List
                    itemLayout="vertical"
                    dataSource={tips}
                    renderItem={(t) => (
                      <List.Item style={{ padding: "12px 0" }}>
                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                          <Text strong>{t.title}</Text>
                          <Text type="secondary" style={{ fontSize: 13 }}>{t.desc}</Text>
                          <div>
                            <Button
                              size="small"
                              icon={t.btn.icon}
                              onClick={t.btn.onClick}
                              style={{
                                marginTop: 8,
                                borderRadius: 999,
                                ...(t.btn.primary
                                  ? {
                                      background: BRAND.violet,
                                      borderColor: BRAND.violet,
                                      color: "#fff",
                                    }
                                  : {
                                      borderColor: BRAND.violet,
                                      color: BRAND.violet,
                                    }),
                              }}
                            >
                              {t.btn.text}
                            </Button>
                          </div>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </GlassCard>
            </Col>
          </Row>
        </div>
      </Content>

      <style>{`
        /* Remove button and icon outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        .ant-btn-icon-only:focus,
        .ant-btn-icon-only:active,
        button:focus,
        button:active,
        .anticon:focus,
        .anticon:active {
          outline: none !important;
          box-shadow: none !important;
        }

        .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
        .ant-card:hover { transform: translateY(-3px); box-shadow: 0 28px 56px rgba(122,90,248,.10); }
      `}</style>
    </Layout>
  );
}
