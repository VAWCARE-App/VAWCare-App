import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  List,
  Tag,
  Divider,
  Grid,
  Space,
  Badge,
  ConfigProvider,
  theme as antdTheme,
  message,
} from "antd";
import {
  SafetyCertificateOutlined,
  HeartOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import ColorBends from "../components/ColorBends"; // GLSL bg
import { exchangeCustomTokenForIdToken } from "../lib/firebase";
import { api } from "../lib/api";

/** React Bits (from your bits/index.jsx) */
import { Container, Section, GlassCard, KPI, CTAButton, BrandPill } from "../components/bits";

const { Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const prefersReduced = useReducedMotion();

  // ── Stats
  const [reportCount, setReportCount] = useState(0);
  const [caseCount, setCaseCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [reportsRes, casesRes] = await Promise.all([api.get("/api/reports"), api.get("/api/cases")]);
        const reportList = reportsRes?.data?.data || [];
        const caseList = casesRes?.data?.data || [];
        setReportCount(reportList.length);
        setCaseCount(caseList.filter((c) => c.status === "Open").length);
      } catch {/* keep zeros */}
    })();
  }, []);

  // ── Theme (light/dark) – keep your saved choice
  const [dark, setDark] = useState(() => sessionStorage.getItem("vawc_theme") === "dark");
  useEffect(() => {
    sessionStorage.setItem("vawc_theme", dark ? "dark" : "light");
  }, [dark]);

  // ── Brand and surfaces (same brand, darker surface mixes)
  const BRAND = {
    pink: "#e91e63",
    violet: "#7A5AF8",
    purple: "#6C3CF0",
  };

  // LIGHT: gentle pastel nebula (less white, more peach/rose glow)
  const LIGHT_BG = {
    // used for base radial gradient (under shader)
    g1: "#fff0f6", // soft rose
    g2: "#ffe6ef",
    g3: "#fde7d8", // peachy
    // card, borders, text
    card: "rgba(255,255,255,0.86)",
    border: "#ffd4e2",
    ink: "#0f172a",
    muted: "#6b7280",
  };

  // DARK: deep midnight with magenta/violet/blue neon bands
  const DARK_BG = {
    g1: "#0b0d12",
    g2: "#101225",
    g3: "#171a33",
    card: "rgba(17,17,17,0.82)",
    border: "rgba(255,255,255,0.12)",
    ink: "#e5e7eb",
    muted: "#a3a3a3",
  };

  // Shader color bands (tuned to look like your screenshots)
  const shaderColorsLight = [
    "#ffd7e6", // rose glow
    "#ffc4d9", // softer rose
    "#e91e63", // brand pink band
    "#ffd9b2", // peach
    "#e5f0ff", // pale blue
    "#bff7d2", // mint
  ];
  const shaderColorsDark = [
    "#12152a", // deep blue-violet base
    "#16299fff",
    "#7A5AF8", // neon violet band
    "#e91e63", // neon magenta band
    "#00b2ff", // electric blue band
    "#28121f", // subtle maroon shadow
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const newsItems = useMemo(
    () => [
      { title: "What is VAWC and how to report?", source: "Philippine Commission on Women (PCW)", url: "https://pcw.gov.ph/", date: "2025-08-20", tag: "Guides" },
      { title: "VAWC response & services — DSWD resources", source: "DSWD", url: "https://dswd.gov.ph/", date: "2025-07-15", tag: "Services" },
      { title: "PNP Women and Children Protection resources", source: "PNP Women and Children Protection Center", url: "https://www.pnp.gov.ph/", date: "2025-06-05", tag: "Safety" },
    ],
    []
  );

  const SURFACE = dark ? DARK_BG : LIGHT_BG;

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: BRAND.pink,      // keep brand pink
          borderRadius: 16,
          colorText: SURFACE.ink,
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        {/* Page variables + subtle base gradient (under shader) */}
        <style>{`
          :root {
            --brand: ${BRAND.pink};
            --accent: ${BRAND.violet};
            --text-muted: ${SURFACE.muted};
            --card: ${SURFACE.card};
            --border: ${SURFACE.border};
            --ink: ${SURFACE.ink};
            --bg-g1: ${SURFACE.g1};
            --bg-g2: ${SURFACE.g2};
            --bg-g3: ${SURFACE.g3};
            /* drawer hover gradient (hex + alpha appended) */
            --drawer-hover: ${BRAND.pink}22, ${BRAND.violet}22;
          }

          /* page base (behind shader) */
          .page-bg {
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            background:
              radial-gradient(1200px 600px at 50% 0%, var(--bg-g1) 0%, var(--bg-g2) 45%, var(--bg-g3) 100%);
            box-shadow: inset 0 120px 220px rgba(0,0,0,${dark ? 0.64 : 0.12});
          }

          /* CTA */
          .btn-primary {
            background: var(--brand) !important;
            border-color: var(--brand) !important;
            box-shadow: 0 10px 20px rgba(233,30,99,.15);
            color: #fff;
          }
          .btn-dark { background:#111; border-color:#111; color:#fff; }
          .btn-dark:hover { filter: brightness(1.05); }

          .hero-title { line-height: 1.08; font-weight: 900; letter-spacing: -0.02em; font-size: clamp(28px, 6vw, 44px); }
          .muted { color: var(--text-muted); }

          .bits-grid { display: grid; gap: 16px; }
          @media (min-width: 768px) { .bits-grid.cols-3 { grid-template-columns: repeat(3, 1fr); } }

          /* Drawer mask + content: translucent + blurred for both themes */
          .ant-drawer-mask {
            background: rgba(6,6,8,0.52) !important;
            backdrop-filter: blur(6px) saturate(120%);
          }
          .ant-drawer .ant-drawer-content {
            background: ${dark ? "linear-gradient(180deg, rgba(10,10,12,0.96), rgba(18,16,24,0.96))" : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,247,255,0.98))"};
            border-radius: 10px;
            box-shadow: 0 40px 120px rgba(2,6,23,0.6);
            color: var(--ink);
            overflow: hidden;
          }

          /* Menu items inside drawer: pill style, unified neon-hover behavior */
          .ant-drawer .ant-menu-inline .ant-menu-item {
            margin: 8px 12px;
            padding: 10px 14px;
            border-radius: 14px;
            transition: transform .12s ease, background .15s ease, box-shadow .15s ease, color .12s;
            background: transparent;
            color: ${dark ? "#f3efff" : "#111"};
            font-weight: 700;
          }
          .ant-drawer .ant-menu-inline .ant-menu-item .anticon { margin-right: 10px; color: ${dark ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.56)"}; font-size:16px; }

          /* Hover uses the same gradient/soft glow as the dark shader — works in both themes */
          .ant-drawer .ant-menu-inline .ant-menu-item:hover {
            background: linear-gradient(90deg, ${BRAND.pink}22, ${BRAND.violet}22);
            transform: translateY(-3px);
            box-shadow: 0 14px 32px rgba(122,90,248,0.14), 0 6px 18px rgba(0,0,0,0.42);
            color: #fff;
          }

          /* Selected: deeper neon pill with subtle inset rim */
          .ant-drawer .ant-menu-inline .ant-menu-item-selected {
            background: linear-gradient(90deg, rgba(122,90,248,0.18), rgba(233,30,99,0.12));
            color: #fff;
            box-shadow: 0 16px 36px rgba(122,90,248,0.16), inset 0 0 0 1px rgba(255,255,255,0.04);
            transform: none;
          }

          /* Buttons inside drawer (logout / admin) */
          .ant-drawer .ant-btn { border-radius: 12px; font-weight: 700; width: calc(100% - 32px); margin: 8px 16px; }
          .ant-drawer .ant-btn-primary {
            background: linear-gradient(90deg, ${BRAND.pink}, ${BRAND.violet});
            border: none;
            box-shadow: 0 12px 36px rgba(122,90,248,0.18);
            color: #fff;
          }
        `}</style>

        {/* Base gradient and animated shader background */}
        <div className="page-bg" />
        <ColorBends
          rotation={dark ? 25 : 35}
          autoRotate={dark ? 2.4 : 1.8}
          speed={dark ? 0.28 : 0.22}
          scale={dark ? 1.1 : 1.2}
          frequency={dark ? 1.25 : 1.1}
          warpStrength={dark ? 1.25 : 1.1}
          mouseInfluence={0.85}
          parallax={0.35}
          noise={dark ? 0.08 : 0.05}
          transparent
          colors={dark ? shaderColorsDark : shaderColorsLight}
          style={{ width: "120%", height: "120%" }}
        />

        <div className={`shell`} style={{ position: "relative", zIndex: 1 }}>
          <Navbar dark={dark} onToggleTheme={() => setDark((v) => !v)} />

          <Content>
            {/* HERO */}
            <Section style={{ minHeight: screens.md ? "72vh" : "64vh", display: "grid", placeItems: "center", textAlign: "center" }}>
              <Container>
                <motion.div variants={prefersReduced ? undefined : fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }}>
                  <BrandPill />

                  <Title level={1} style={{ color: "var(--ink)", marginTop: 16, marginBottom: 8 }} className="hero-title">
                    <span style={{ display: "block", opacity: 0.9 }}>VAWCare helps you speak up—</span>
                    <span style={{ display: "block", color: BRAND.pink }}>and get the right help, fast.</span>
                  </Title>

                  <Paragraph className="muted" style={{ fontSize: 16, maxWidth: 760, margin: "0 auto" }}>
                    Report violence safely, coordinate with barangay officials, and track support—on phone or desktop, powered by VAWCare.
                  </Paragraph>

                  <Space style={{ marginTop: 20 }} wrap>
                    <CTAButton
                      primary
                      icon={<SafetyCertificateOutlined />}
                      onClick={async () => {
                        try {
                          message.loading({ content: "Preparing anonymous report...", key: "anon" });
                          const { data } = await api.post("/api/victims/register", { victimAccount: "anonymous" });
                          if (!data || !data.success) throw new Error(data?.message || "Failed to create anonymous account");
                          const resp = data.data || {};
                          const customToken = resp.token;
                          if (!customToken) throw new Error("No token received from server");
                          const idToken = await exchangeCustomTokenForIdToken(customToken);
                          await api.post("/api/auth/set-token", { idToken, userData: { ...resp.victim, userType: "victim" } });
                          sessionStorage.setItem("userType", "victim");
                          if (resp?.victim?.id) sessionStorage.setItem("actorId", String(resp.victim.id));
                          if (resp?.victim?.victimID) sessionStorage.setItem("actorBusinessId", String(resp.victim.victimID));
                          message.success({ content: "Anonymous session ready", key: "anon", duration: 1.2 });
                          navigate("/victim/report");
                        } catch (err) {
                          message.error(err?.response?.data?.message || err.message || "Unable to create anonymous account");
                          navigate("/login");
                        }
                      }}
                    >
                      Report
                    </CTAButton>

                    <CTAButton icon={<UserSwitchOutlined />} onClick={() => navigate("/admin/login")}>
                      Admin Login
                    </CTAButton>
                  </Space>

                  {/* KPIs */}
                  <Row gutter={[16, 16]} style={{ marginTop: 28, maxWidth: 820, marginInline: "auto" }}>
                    {[{ label: "Reports Filed (All-time)", value: reportCount }, { label: "Open Cases", value: caseCount }, { label: "Avg. Response (hrs)", value: 2.4 }].map(
                      (k) => (
                        <Col xs={24} sm={8} key={k.label}>
                          <KPI title={k.label} value={k.value} />
                        </Col>
                      )
                    )}
                  </Row>
                </motion.div>
              </Container>
            </Section>

            {/* WHY VAWCARE */}
            <Section style={{ paddingTop: 0 }}>
              <Container>
                <div className="bits-grid cols-3">
                  <GlassCard>
                    <HeartOutlined style={{ fontSize: 32, color: BRAND.pink }} />
                    <Title level={4} style={{ margin: 0, color: "var(--ink)" }}>VAWCare Privacy</Title>
                    <Text className="muted">End-to-end safe reporting, visible only to authorized officials.</Text>
                  </GlassCard>
                  <GlassCard>
                    <SafetyCertificateOutlined style={{ fontSize: 32, color: "#2196f3" }} />
                    <Title level={4} style={{ margin: 0, color: "var(--ink)" }}>VAWCare Alerts</Title>
                    <Text className="muted">One-tap emergency notifications to your barangay and contacts.</Text>
                  </GlassCard>
                  <GlassCard>
                    <TeamOutlined style={{ fontSize: 32, color: "#4caf50" }} />
                    <Title level={4} style={{ margin: 0, color: "var(--ink)" }}>VAWCare Support</Title>
                    <Text className="muted">Helplines, chatbot, resources—organized in one trusted place.</Text>
                  </GlassCard>
                </div>
              </Container>
            </Section>

            <Divider />

            {/* ABOUT */}
            <Section id="about" style={{ paddingTop: 8 }}>
              <Container>
                <Row gutter={[24, 24]} align="stretch">
                  <Col xs={24} md={14}>
                    <GlassCard style={{ height: "100%" }} bodyStyle={{ padding: screens.md ? 28 : 20 }}>
                      <Title level={3} style={{ marginBottom: 8, color: "var(--ink)" }}>What is VAWCare?</Title>
                      <Paragraph className="muted" style={{ marginBottom: 12 }}>
                        <b>VAWCare</b> is a community-first reporting and coordination system for barangays. It centralizes incident intake,
                        secure case tracking, and rapid response—so survivors get help and officials work from the same, up-to-date picture.
                      </Paragraph>
                      <Space size={[8, 8]} wrap>
                        <Tag color="magenta">VAWCare Privacy</Tag>
                        <Tag color="blue">VAWCare Alerts</Tag>
                        <Tag color="green">VAWCare Support</Tag>
                        <Tag color="geekblue">Accessible</Tag>
                      </Space>
                      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                        <Col span={24}><Text>• Role-based dashboards: <b>Survivor</b>, <b>Official</b>, <b>Admin</b>.</Text></Col>
                        <Col span={24}><Text>• Evidence uploads with audit logs and status history.</Text></Col>
                        <Col span={24}><Text>• Notifications and case timelines powered by VAWCare.</Text></Col>
                      </Row>
                    </GlassCard>
                  </Col>
                  <Col xs={24} md={10}>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      <GlassCard style={{ minHeight: 140 }}>
                        <Title level={4} style={{ marginBottom: 6, color: "var(--ink)" }}>For Survivors</Title>
                        <Text className="muted">Create a safe VAWCare report, track your case, and control who can see details.</Text>
                      </GlassCard>
                      <GlassCard style={{ minHeight: 140 }}>
                        <Title level={4} style={{ marginBottom: 6, color: "var(--ink)" }}>For Officials</Title>
                        <Text className="muted">Standardized intake and triage, assignment, and inter-office coordination with VAWCare tools.</Text>
                      </GlassCard>
                    </Space>
                  </Col>
                </Row>
              </Container>
            </Section>

            {/* HOW IT WORKS */}
            <Section style={{ paddingBottom: 56 }}>
              <Container>
                <Title level={3} style={{ textAlign: "center", marginBottom: 24, color: "var(--ink)" }}>
                  How VAWCare Works
                </Title>
                <div className="bits-grid cols-3" style={{ maxWidth: 1100, margin: "0 auto" }}>
                  {[
                    { t: "Report in VAWCare", d: "Create a secure report with optional evidence—only authorized officials can view." },
                    { t: "Coordinate via VAWCare", d: "Barangay officials triage and update case status with audit trails." },
                    { t: "Track with VAWCare", d: "Receive notifications, access resources, and view your case timeline." },
                  ].map((s, i) => (
                    <GlassCard key={s.t}>
                      <Space align="start" size={12}>
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: 999,
                            display: "grid", placeItems: "center",
                            fontWeight: 700, background: "var(--brand)", color: "#fff",
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <Title level={4} style={{ margin: 0, color: "var(--ink)" }}>{s.t}</Title>
                          <Text className="muted">{s.d}</Text>
                        </div>
                      </Space>
                    </GlassCard>
                  ))}
                </div>
              </Container>
            </Section>

            {/* NEWS */}
            <Section id="news" style={{ paddingTop: 0, paddingBottom: 48 }}>
              <Container>
                <Row justify="center" gutter={[24, 24]}>
                  <Col xs={24} md={20} lg={16}>
                    <Title level={3} style={{ marginBottom: 12, color: "var(--ink)" }}>
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
                              <a key="read" href={item.url} target="_blank" rel="noreferrer" style={{ color: BRAND.pink }}>
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
              </Container>
            </Section>
          </Content>

          <Footer style={{ background: "transparent", padding: 24, textAlign: "center", color: "var(--ink)", borderTop: `1px solid var(--border)` }}>
            <Text style={{ fontSize: 16 }}>
              💡 Need immediate help? Call <b>1553 (VAWC Hotline)</b> • PNP: <b>117</b> • DSWD: <b>1343</b>
            </Text>
            <div style={{ marginTop: 8 }}>
              <Text className="muted">For emergencies, contact your nearest barangay or the numbers above.</Text>
            </div>
          </Footer>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
