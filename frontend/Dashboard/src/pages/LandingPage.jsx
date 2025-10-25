// src/pages/LandingPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Card,
  Button,
  List,
  Tag,
  Statistic,
  Divider,
  Grid,
  Space,
  Badge,
  Switch,
  ConfigProvider,
  theme as antdTheme,
} from "antd";
import {
  SafetyCertificateOutlined,
  HeartOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  BulbOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { message } from "antd";

const { Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const prefersReduced = useReducedMotion();
  // --- Dashboard data ---
  const [reportCount, setReportCount] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        // Fetch full lists (or whatever your backend returns)
        const [reportsRes, casesRes] = await Promise.all([
          api.get("/api/reports"), // e.g., returns an array of reports
          api.get("/api/cases"),   // e.g., returns an array of cases
        ]);
        console.log("Fetched reports and cases:", reportsRes.data, casesRes.data);
        // Count manually in frontend
        // 👇 Correctly access the nested array
        const reportList = reportsRes?.data?.data || [];
        const caseList = casesRes?.data?.data || [];

        // Count manually
        const reports = reportList.length;
        const openCases = caseList.filter((c) => c.status === "Open").length;

        setReportCount(reports);
        setCaseCount(openCases);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);



  // --- Dark mode state (persists)
  const [dark, setDark] = useState(() => {
    const saved = sessionStorage.getItem("vawc_theme");
    return saved ? saved === "dark" : false;
  });
  useEffect(() => {
    sessionStorage.setItem("vawc_theme", dark ? "dark" : "light");
  }, [dark]);

  // ---- Replace with real data later ----
  const newsItems = useMemo(
    () => [
      {
        title: "What is VAWC and how to report?",
        source: "Philippine Commission on Women (PCW)",
        url: "https://pcw.gov.ph/",
        date: "2025-08-20",
        tag: "Guides",
      },
      {
        title: "VAWC response & services — DSWD resources",
        source: "DSWD",
        url: "https://dswd.gov.ph/",
        date: "2025-07-15",
        tag: "Services",
      },
      {
        title: "PNP Women and Children Protection resources",
        source: "PNP Women and Children Protection Center",
        url: "https://www.pnp.gov.ph/",
        date: "2025-06-05",
        tag: "Safety",
      },
    ],
    []
  );

  const kpis = [
    { label: "Reports Filed (All-time)", value: reportCount },
    { label: "Open Cases", value: caseCount },
    { label: "Avg. Response (hrs)", value: 2.4 },
  ];

  // Brand tokens
  const pastel = {
    primary: "#e91e63", // VAWCare pink
    textMut: "#6b7280",
  };

  // Motion presets
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: pastel.primary, borderRadius: 16 },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        {/* ——— THEME + LAYOUT CSS ——— */}
        <style>{`
          :root {
            --brand: ${pastel.primary};
            --text-muted: ${pastel.textMut};
            --card: #ffffff;
            --border: #ffe1ea;
            --ink: #0f172a;
          }
          .theme-dark {
            --card: rgba(17,17,17,0.9);
            --border: rgba(255,255,255,0.12);
            --ink: #e5e7eb;
            --text-muted: #a3a3a3;
          }

          /* Backgrounds */
          .bg-scene {
            position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
            background: radial-gradient(1200px 600px at 50% 0%, #fff 0%, #ffe6ef 100%);
          }
          .bg-scene.dark {
            background: radial-gradient(1200px 600px at 50% 0%, #0e0e10 0%, #1a1a1f 100%);
          }
          .bubble {
            position: absolute; width: 220px; height: 220px; border-radius: 9999px;
            filter: blur(40px); opacity: 0.28; animation: float 18s ease-in-out infinite; will-change: transform;
          }
          .b1 { background: #ffd1e0; left: 6%; top: 12%; animation-delay: 0s; }
          .b2 { background: #e1f0ff; right: 8%; top: 22%; animation-delay: 3s; }
          .b3 { background: #e5ffe9; left: 12%; bottom: 12%; animation-delay: 6s; }
          .b4 { background: #fff3d6; right: 14%; bottom: 10%; animation-delay: 9s; }
          .bg-scene.dark .b1 { background: #4a2a36; opacity: .22; }
          .bg-scene.dark .b2 { background: #213043; opacity: .22; }
          .bg-scene.dark .b3 { background: #1d3b2a; opacity: .22; }
          .bg-scene.dark .b4 { background: #3f3521; opacity: .22; }

          @keyframes float { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-24px) translateX(8px)} }

          /* gradient orbs */
          .orb {
            position: absolute; width: 420px; height: 420px; border-radius: 50%;
            opacity: 0.22; filter: blur(30px);
            background: conic-gradient(from 0deg, #ff7aa2, #9ad0ff, #b8ffcb, #ffe59a, #ff7aa2);
            animation: drift 28s linear infinite, spin 40s linear infinite;
            mix-blend-mode: multiply;
          }
          .bg-scene.dark .orb { mix-blend-mode: screen; opacity: 0.18; }
          .orb.small { width: 300px; height: 300px; opacity: 0.18; }
          .o1 { left: -80px; top: -60px; }
          .o2 { right: -120px; top: 30%; animation-delay: 4s; }
          .o3 { left: 10%; bottom: -120px; animation-delay: 8s; }

          @keyframes drift {
            0%{transform:translate(0,0)}25%{transform:translate(30px,-20px)}50%{transform:translate(60px,0)}
            75%{transform:translate(30px,20px)}100%{transform:translate(0,0)}
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) { .bubble, .orb { animation: none; } }

          /* layout helpers */
          .shell { position: relative; z-index: 1; }
          .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px; }
          @media (min-width: 576px) { .container { padding: 0 20px; } }
          @media (min-width: 992px) { .container { padding: 0 24px; } }

          /* Equal-height utilities (flex lock) */
          .equal-row { display: flex; flex-wrap: wrap; align-items: stretch; }
          .equal-col { display: flex; }
          .equal-card { flex: 1; height: 100%; border-radius: 16px; border-color: var(--border); background: var(--card); }
          .equal-card .ant-card-body { display: flex; flex-direction: column; gap: 8px; height: 100%; }

          /* Specific size anchors so boxes match */
          .kpi-min { min-height: 120px; }
          .feature-h { min-height: 200px; }
          .audience-h { min-height: 140px; }
          .howit-h { min-height: 160px; }

          @media (max-width: 767px){
            .feature-h { min-height: 180px; }
            .kpi-min { min-height: 100px; }
          }

          /* Glass for KPIs */
          .glass {
            background: rgba(255,255,255,0.75);
            backdrop-filter: saturate(160%) blur(8px);
            border: 1px solid var(--border);
          }
          .theme-dark .glass {
            background: rgba(17,17,17,0.7);
            border: 1px solid var(--border);
          }

          /* Buttons */
          .btn-primary { background: var(--brand) !important; border-color: var(--brand) !important; box-shadow: 0 10px 20px rgba(233,30,99,.15); }
          .btn-dark { background:#111; border-color:#111; color:#fff; }
          .btn-dark:hover { filter: brightness(1.05); }
          .cta-group { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
          @media (max-width: 575px){
            .cta-group .ant-btn { width: 100%; }
          }

          /* Hero eyebrow & brand tag */
          .eyebrow {
            display:inline-block; padding:6px 12px; border-radius:999px; background:#111; color:#fff; font-size:12px; letter-spacing:.06em;
          }
          .theme-dark .eyebrow { background:#fff; color:#111; }

          .brand-chip {
            display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px;
            border:1px solid var(--border); background: var(--card);
          }
          .brand-dot { width:10px; height:10px; border-radius:999px; background: var(--brand); }

          /* Section headings */
          .section-title { color: var(--ink); }

          /* Numbered step circle */
          .stepball {
            width: 36px; height: 36px; border-radius: 999px; display: grid; place-items:center; font-weight: 700;
            background: var(--brand); color: #fff;
          }

          /* Muted text */
          .muted { color: var(--text-muted); }

          /* Responsive hero title */
          .hero-title {
            line-height: 1.08;
            font-weight: 900;
            letter-spacing: -0.02em;
            font-size: clamp(28px, 6vw, 44px);
          }

          /* Theme switch placement */
          .theme-toggle {
            position: fixed; right: 16px; top: 16px; z-index: 5;
          }
          @media (max-width: 575px){
            .theme-toggle { right: 12px; bottom: 12px; top: auto; }
          }

          /* Reduce visual load on tiny screens */
          @media (max-width: 575px){
            .orb, .bubble { opacity: 0.16; filter: blur(36px); }
          }
        `}</style>

        {/* BACKGROUND */}
        <div className={`bg-scene ${dark ? "dark" : ""}`}>
          <div className="bubble b1" />
          <div className="bubble b2" />
          <div className="bubble b3" />
          <div className="bubble b4" />
          <div className="orb o1" />
          <div className="orb small o2" />
          <div className="orb o3" />
        </div>

        <div className={`shell ${dark ? "theme-dark" : ""}`}>
          {/* Topbar + Theme Switch */}
          <Navbar dark={dark} onToggleTheme={() => setDark((v) => !v)} />
          {/* <div className="theme-toggle">
            <Space>
              <BulbOutlined />
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<BulbOutlined />}
                checked={dark}
                onChange={(v) => setDark(Boolean(v))}
              />
            </Space>
          </div> */}

          <Content id="home">
            {/* HERO */}
            <section
              style={{
                minHeight: screens.md ? "72vh" : "62vh",
                display: "grid",
                placeItems: "center",
                padding: screens.md ? "88px 24px 56px" : "56px 12px",
                textAlign: "center",
              }}
            >
              <div className="container">
                <motion.div
                  variants={prefersReduced ? undefined : fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.5 }}
                >
                  <div className="brand-chip" style={{ margin: "0 auto" }}>
                    <span className="brand-dot" />
                    <Text strong>VAWCare</Text>
                    <Text type="secondary" className="muted">Community Safety Platform</Text>
                  </div>

                  <Title level={1} className="section-title hero-title" style={{ marginTop: 16, marginBottom: 8 }}>
                    <span style={{ display: "block", opacity: 0.9 }}>VAWCare helps you speak up—</span>
                    <span style={{ display: "block", color: pastel.primary }}>and get the right help, fast.</span>
                  </Title>

                  <Paragraph className="muted" style={{ fontSize: 16, maxWidth: 760, margin: "0 auto" }}>
                    Report violence safely, coordinate with barangay officials, and track support—on phone or desktop, powered by VAWCare.
                  </Paragraph>

                  <div className="cta-group" style={{ marginTop: 20 }}>
                    <Button
                      size="large"
                      className="btn-primary"
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      onClick={async () => {
                        // Create an anonymous account then route to report page
                        try {
                          message.loading({ content: 'Preparing anonymous report...', key: 'anon' });
                          const { data } = await api.post('/api/victims/register', { victimAccount: 'anonymous' });
                          if (!data || !data.success) throw new Error(data?.message || 'Failed to create anonymous account');
                          const resp = data.data || {};
                          if (resp && resp.victim) sessionStorage.setItem('user', JSON.stringify(resp.victim));
                          try { if (resp && resp.victim && resp.victim.id) { sessionStorage.setItem('actorId', String(resp.victim.id)); sessionStorage.setItem('actorType', 'victim'); } } catch (e) { /* ignore */ }
                          try { const businessId = resp?.victim?.victimID || null; if (businessId) sessionStorage.setItem('actorBusinessId', String(businessId)); } catch (e) { /* ignore */ }
                          message.success({ content: 'Anonymous session ready', key: 'anon', duration: 1.2 });
                          navigate('/victim/report');
                        } catch (err) {
                          console.error('Anonymous creation failed', err);
                          message.error(err?.response?.data?.message || err.message || 'Unable to create anonymous account');
                          // fallback to login page
                          navigate('/login');
                        }
                      }}
                    >
                      Report
                    </Button>
                    <Button
                      size="large"
                      className="btn-dark"
                      icon={<UserSwitchOutlined />}
                      onClick={() => navigate("/admin/login")}
                    >
                      Admin Login
                    </Button>
                  </div>

                  {/* KPIs — stack on phones */}
                  <Row
                    gutter={[16, 16]}
                    style={{ marginTop: 28, maxWidth: 820, marginInline: "auto" }}
                  >
                    {kpis.map((k) => (
                      <Col xs={24} sm={8} key={k.label}>
                        <motion.div
                          variants={prefersReduced ? undefined : fadeUp}
                          initial="hidden"
                          whileInView="show"
                          viewport={{ once: true }}
                        >
                          <Card bordered className="glass kpi-min equal-card" bodyStyle={{ padding: 16 }}>
                            <Statistic title={k.label} value={k.value} />
                          </Card>
                        </motion.div>
                      </Col>
                    ))}
                  </Row>
                </motion.div>
              </div>
            </section>

            {/* WHY VAWCARE — 3 equal feature boxes */}
            <section style={{ padding: "0 12px 48px" }}>
              <div className="container">
                <Row gutter={[16, 16]} className="equal-row">
                  <Col xs={24} md={8} className="equal-col">
                    <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Card hoverable className="equal-card feature-h" bodyStyle={{ padding: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <HeartOutlined style={{ fontSize: 32, color: pastel.primary }} />
                          <Title level={4} className="section-title" style={{ margin: 0 }}>VAWCare Privacy</Title>
                          <Text className="muted">End-to-end safe reporting, visible only to authorized officials.</Text>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col xs={24} md={8} className="equal-col">
                    <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Card hoverable className="equal-card feature-h" bodyStyle={{ padding: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <SafetyCertificateOutlined style={{ fontSize: 32, color: "#2196f3" }} />
                          <Title level={4} className="section-title" style={{ margin: 0 }}>VAWCare Alerts</Title>
                          <Text className="muted">One-tap emergency notifications to your barangay and contacts.</Text>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col xs={24} md={8} className="equal-col">
                    <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Card hoverable className="equal-card feature-h" bodyStyle={{ padding: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <TeamOutlined style={{ fontSize: 32, color: "#4caf50" }} />
                          <Title level={4} className="section-title" style={{ margin: 0 }}>VAWCare Support</Title>
                          <Text className="muted">Helplines, chatbot, resources—organized in one trusted place.</Text>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                </Row>
              </div>
            </section>

            <Divider />

            {/* ABOUT */}
            <section id="about" style={{ padding: "8px 12px 48px" }}>
              <div className="container">
                <Row gutter={[24, 24]} align="stretch">
                  {/* Left: mission & bullets */}
                  <Col xs={24} md={14}>
                    <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
                      <Card className="equal-card" bodyStyle={{ padding: screens.md ? 28 : 20 }}>
                        <Title level={3} className="section-title" style={{ marginBottom: 8 }}>
                          What is VAWCare?
                        </Title>
                        <Paragraph className="muted" style={{ marginBottom: 12 }}>
                          <b>VAWCare</b> is a community-first reporting and coordination system for barangays.
                          It centralizes incident intake, secure case tracking, and rapid response—so survivors get help
                          and officials work from the same, up-to-date picture.
                        </Paragraph>
                        <Space size={[8, 8]} wrap>
                          <Tag color="magenta">VAWCare Privacy</Tag>
                          <Tag color="blue">VAWCare Alerts</Tag>
                          <Tag color="green">VAWCare Support</Tag>
                          <Tag color="geekblue">Accessible</Tag>
                        </Space>

                        {/* bullets */}
                        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                          <Col span={24}><Text>• Role-based dashboards: <b>Survivor</b>, <b>Official</b>, <b>Admin</b>.</Text></Col>
                          <Col span={24}><Text>• Evidence uploads with audit logs and status history.</Text></Col>
                          <Col span={24}><Text>• Notifications and case timelines powered by VAWCare.</Text></Col>
                        </Row>
                      </Card>
                    </motion.div>
                  </Col>

                  {/* Right: audience cards */}
                  <Col xs={24} md={10}>
                    <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
                      <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        <Card className="equal-card audience-h" bodyStyle={{ padding: 20 }}>
                          <Title level={4} className="section-title" style={{ marginBottom: 6 }}>For Survivors</Title>
                          <Text className="muted">Create a safe VAWCare report, track your case, and control who can see details.</Text>
                        </Card>
                        <Card className="equal-card audience-h" bodyStyle={{ padding: 20 }}>
                          <Title level={4} className="section-title" style={{ marginBottom: 6 }}>For Officials</Title>
                          <Text className="muted">Standardized intake and triage, assignment, and inter-office coordination with VAWCare tools.</Text>
                        </Card>
                      </Space>
                    </motion.div>
                  </Col>
                </Row>
              </div>
            </section>

            {/* HOW IT WORKS */}
            <section style={{ padding: "0 12px 56px" }}>
              <div className="container">
                <Title level={3} className="section-title" style={{ textAlign: "center", marginBottom: 24 }}>
                  How VAWCare Works
                </Title>
                <Row gutter={[16, 16]} justify="center">
                  {[
                    { t: "Report in VAWCare", d: "Create a secure report with optional evidence—only authorized officials can view." },
                    { t: "Coordinate via VAWCare", d: "Barangay officials triage and update case status with audit trails." },
                    { t: "Track with VAWCare", d: "Receive notifications, access resources, and view your case timeline." },
                  ].map((s, i) => (
                    <Col xs={24} md={8} key={s.t} className="equal-col">
                      <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                        <Card className="equal-card howit-h" bodyStyle={{ padding: 20 }}>
                          <Space align="start">
                            <div className="stepball">{i + 1}</div>
                            <div>
                              <Title level={4} className="section-title" style={{ margin: 0 }}>{s.t}</Title>
                              <Text className="muted">{s.d}</Text>
                            </div>
                          </Space>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </div>
            </section>

            {/* NEWS */}
            <section id="news" style={{ padding: "0 12px 48px" }}>
              <div className="container">
                <Row justify="center" gutter={[24, 24]}>
                  <Col xs={24} md={20} lg={16}>
                    <Title level={3} className="section-title" style={{ marginBottom: 12 }}>
                      VAWCare News & Updates (Philippines)
                    </Title>
                    <Text className="muted">
                      Curated resources about VAWC policies, services, and guidance. Replace links with your latest updates or connect to your backend feed.
                    </Text>

                    <List
                      itemLayout="vertical"
                      style={{ marginTop: 16 }}
                      dataSource={newsItems}
                      renderItem={(item, idx) => (
                        <motion.div
                          key={item.title}
                          variants={prefersReduced ? undefined : fadeUp}
                          initial="hidden"
                          whileInView="show"
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <List.Item
                            extra={
                              <Badge
                                color={item.tag === "Services" ? "blue" : item.tag === "Safety" ? "green" : "magenta"}
                                text={item.tag}
                              />
                            }
                            actions={[
                              <a key="read" href={item.url} target="_blank" rel="noreferrer" style={{ color: pastel.primary }}>
                                Read source
                              </a>,
                            ]}
                          >
                            <List.Item.Meta
                              title={<a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>}
                              description={
                                <Space split={<span>•</span>} wrap>
                                  <Text className="muted">{item.source}</Text>
                                  <Text className="muted">{new Date(item.date).toLocaleDateString()}</Text>
                                </Space>
                              }
                            />
                          </List.Item>
                        </motion.div>
                      )}
                    />
                  </Col>
                </Row>
              </div>
            </section>
          </Content>

          {/* CTA FOOTER */}
          <Footer
            style={{
              background: "transparent",
              padding: 24,
              textAlign: "center",
              color: "var(--ink)",
              borderTop: `1px solid var(--border)`,
            }}
          >
            <Text style={{ fontSize: 16 }}>
              💡 Need immediate help? Call <b>1553 (VAWC Hotline)</b> • PNP: <b>117</b> • DSWD: <b>1343</b>
            </Text>
            <div style={{ marginTop: 8 }}>
              <Text className="muted">
                For emergencies, contact your nearest barangay or the numbers above.
              </Text>
            </div>
          </Footer>
        </div>
      </Layout>
    </ConfigProvider>
  );
}