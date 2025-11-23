import React, { useEffect, useMemo, useState, useRef } from "react";
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
  EnvironmentOutlined,
} from "@ant-design/icons";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import ColorBends from "../components/ColorBends"; // GLSL bg
import CardSwap, { Card } from "../components/CardSwap";
import InstallButton from "../components/InstallButton";
import { exchangeCustomTokenForIdToken } from "../lib/firebase";
import { api, getUserData } from "../lib/api";

import ApiBanner from "../components/ApiBanner";
import { checkHealth } from "../utils/checkHealth";

/** React Bits (from your bits/index.jsx) */
import { Container, Section, GlassCard, KPI, CTAButton, BrandPill } from "../components/bits";

const { Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const prefersReduced = useReducedMotion();
  const installButtonRef = useRef(null);

  // ── Stats
  const [reportCount, setReportCount] = useState(0);
  const [caseCount, setCaseCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  const [backendStatus, setBackendStatus] = useState("online");

  // Event listener for install modal trigger from Navbar
  useEffect(() => {
    const handleOpenInstallModal = () => {
      if (installButtonRef.current) {
        installButtonRef.current.openModal();
      }
    };

    window.addEventListener('openInstallModal', handleOpenInstallModal);
    return () => window.removeEventListener('openInstallModal', handleOpenInstallModal);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const status = await checkHealth(); // your existing utility
        if (mounted) setBackendStatus(status);
      } catch (err) {
        if (mounted) setBackendStatus("offline");
        console.error(err);
      }
    };

    checkStatus(); // initial check
    const interval = setInterval(checkStatus, 5000); // check every 5s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [reportsRes, casesRes, usersRes] = await Promise.all([
          api.get("/api/reports"),
          api.get("/api/cases"),
          api.get("/api/admin/users")
        ]);
        const reportList = reportsRes?.data?.data || [];
        const caseList = casesRes?.data?.data || [];
        setReportCount(reportList.length);
        setCaseCount(caseList.filter((c) => c.status === "Open").length);
        // Calculate total users (admins + victims + officials)
        const admins = usersRes?.data?.data?.admins?.length || 0;
        const victims = (usersRes?.data?.data?.victims || []).filter(u => u.victimAccount !== "anonymous").length || 0;
        const officials = usersRes?.data?.data?.officials?.length || 0;
        setUserCount(admins + victims + officials);
      } catch {/* keep zeros */ }
    })();
  }, []);

  // ── Theme (light/dark) – keep your saved choice
  const [dark, setDark] = useState(() => sessionStorage.getItem("vawc_theme") === "dark");
  useEffect(() => {
    // Persist theme selection
    sessionStorage.setItem("vawc_theme", dark ? "dark" : "light");

    try {
      const root = document.documentElement;
      // Keep a data attribute so CSS that targets [data-theme="dark"] works
      root.setAttribute("data-theme", dark ? "dark" : "light");

      // Also toggle legacy class name (some components may check for it)
      if (dark) root.classList.add("dark"); else root.classList.remove("dark");

      // Notify other parts of the app that theme changed (InstallButton listens for this)
      window.dispatchEvent(new Event("themechange"));
    } catch (e) {
      // ignore
    }
  }, [dark]);

  // --- Session / cookie restore for landing CTA (from friend)
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = sessionStorage.getItem("authToken"); // or whatever you use
      if (!token) {
        setHasSession(false);
        return; // don’t call getUserData()
      }

      try {
        const userData = await getUserData();
        if (!mounted) return;
        const role = userData?.userType || userData?.role || null;
        if (role === "admin" || role === "official") setHasSession(true);
        else setHasSession(false);
      } catch (e) {
        if (mounted) setHasSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  // ── Legit PH sources for VAWC news / guidance (with locations)
  const newsItems = useMemo(
    () => [
      {
        title: "Violence Against Women (VAW): overview, laws & helplines",
        source: "Philippine Commission on Women (PCW)",
        url: "https://pcw.gov.ph/violence-against-women/",
        tag: "National Policy",
        location: "🏛️ San Miguel, Manila • Serving 7,641 islands nationwide",
      },
      {
        title: "Inter-Agency Council on VAWC: campaigns & survivor stories",
        source: "Inter-Agency Council on VAWC (IACVAWC)",
        url: "https://iacvawc.gov.ph/",
        tag: "Campaigns",
        location: "🇵🇭 Capitol Hills • Empowering 110M+ Filipinos",
      },
      {
        title: "DSWD services for VAWC victim-survivors",
        source: "Department of Social Welfare and Development (DSWD)",
        url: "https://old.dswd.gov.ph/dswd-ensures-continuous-implementation-of-services-for-victim-survivors-of-vawc/",
        tag: "Services",
        location: "🏢 Batasan Complex, QC • 17 regions, 24/7 support",
      },
      {
        title: "PNP Women & Children Protection Center (WCPC) & hotlines",
        source: "Philippine National Police – WCPC",
        url: "https://iacvawc.gov.ph/report-abuse/",
        tag: "Report Abuse",
        location: "🚔 Camp Crame, QC • Connected to 1,700+ police stations",
      },
      {
        title: "Directory of Women & Children Protection Units and VAWC Desks",
        source: "Child Protection Network Foundation",
        url: "https://www.childprotectionnetwork.org/wcpu-directory/",
        tag: "Directory",
        location: "🗺️ Philippines • 300+ protection units mapped",
      },
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
      <ApiBanner status={backendStatus} />
      <Layout style={{ minHeight: "100vh", background: "transparent", position: "relative", overflow: "hidden" }}>
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
            transition: all 0.15s ease;
          }
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px rgba(233,30,99,.25) !important;
          }
          .btn-dark { 
            background:#111; 
            border-color:#111; 
            color:#fff;
            transition: all 0.15s ease;
          }
          .btn-dark:hover { 
            filter: brightness(1.15);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,.3);
          }

          .hero-title { 
            line-height: 1.08; 
            font-weight: 900; 
            letter-spacing: -0.02em; 
            font-size: clamp(24px, 5vw, 44px);
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .muted { color: var(--text-muted); }

          .bits-grid { 
            display: grid; 
            gap: 16px; 
            grid-template-columns: 1fr;
            width: 100%;
          }
          @media (min-width: 768px) { 
            .bits-grid.cols-3 { 
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            } 
          }
          @media (min-width: 1024px) { 
            .bits-grid.cols-3 { 
              grid-template-columns: repeat(3, 1fr); 
            } 
          }

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
          .ant-drawer .ant-btn {
            border-radius: 12px;
            font-weight: 700;
            width: calc(100% - 32px);
            margin: 8px 16px;
          }
          .ant-drawer .ant-btn-primary {
            background: linear-gradient(90deg, ${BRAND.pink}, ${BRAND.violet});
            border: none;
            box-shadow: 0 12px 36px rgba(122,90,248,0.18);
            color: #fff;
          }

          /* News cards */
          .news-card {
            position: relative;
            border-radius: 18px;
            background: var(--card);
            border: 1px solid var(--border);
            padding: 14px 16px;
            overflow: hidden;
            box-shadow: 0 16px 40px rgba(15,23,42,${dark ? 0.7 : 0.06});
          }
          .news-card::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: 0.6;
            background: linear-gradient(
              120deg,
              ${BRAND.violet}14,
              transparent 35%,
              ${BRAND.pink}10
            );
            pointer-events: none;
          }
          .news-card-inner {
            position: relative;
            z-index: 1;
          }
          .news-location-pill {
            border-radius: 999px;
            padding: 2px 10px;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: linear-gradient(
              120deg,
              ${BRAND.violet}20,
              ${BRAND.pink}15
            );
            color: ${dark ? "#e5e7eb" : "#111827"};
          }
        `}</style>

        {/* Base gradient and animated shader background - only for hero section */}
        <div className="page-bg" />

        <div className={`shell`} style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
          {/* ColorBends background covering top half including navbar */}
          <ColorBends
            rotation={dark ? 25 : 35}
            autoRotate={prefersReduced ? 0 : (dark ? 2.4 : 1.8)}
            speed={dark ? 0.28 : 0.22}
            scale={dark ? 1.1 : 1.2}
            frequency={dark ? 1.25 : 1.1}
            warpStrength={dark ? 1.25 : 1.1}
            mouseInfluence={prefersReduced ? 0 : 0.85}
            parallax={0.35}
            noise={dark ? 0.08 : 0.05}
            transparent
            colors={dark ? shaderColorsDark : shaderColorsLight}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: "118vh", pointerEvents: "none", zIndex: 0 }}
          />

          <Navbar dark={dark} onToggleTheme={() => setDark((v) => !v)} />

          <Content>
            {/* HERO - with animated background */}
            <Section style={{ minHeight: screens.md ? "72vh" : "64vh", display: "grid", placeItems: "center", textAlign: "center", position: "relative" }}>
              <Container style={{ position: "relative", zIndex: 1 }}>
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



                    <CTAButton icon={<UserSwitchOutlined />} onClick={() => navigate("/login")}>
                      Login
                    </CTAButton>
                  </Space>

                  {/* KPIs */}
                  <Row gutter={[16, 16]} style={{ marginTop: 28, maxWidth: 820, marginInline: "auto" }}>
                    {[{ label: "Reports Filed (All-time)", value: reportCount }, { label: "Open Cases", value: caseCount }, { label: "Registered Users", value: userCount }].map(
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
                  {[
                    { icon: <HeartOutlined style={{ fontSize: 32, color: BRAND.pink }} />, title: "VAWCare Privacy", desc: "End-to-end safe reporting, visible only to authorized officials." },
                    { icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: "#2196f3" }} />, title: "VAWCare Alerts", desc: "One-tap emergency notifications to your barangay and contacts." },
                    { icon: <TeamOutlined style={{ fontSize: 32, color: "#4caf50" }} />, title: "VAWCare Support", desc: "Helplines, chatbot, resources—organized in one trusted place." }
                  ].map((item, idx) => (
                    <motion.div
                      key={item.title}
                      variants={prefersReduced ? undefined : fadeUp}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <GlassCard
                        hoverable={false}
                        style={{
                          background: `linear-gradient(135deg, ${BRAND.pink}08, ${BRAND.violet}10)`,
                          border: `1px solid ${SURFACE.border}`,
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div style={{
                          position: "absolute",
                          top: -30,
                          right: -30,
                          width: 150,
                          height: 150,
                          background: `radial-gradient(circle, ${BRAND.violet}12, transparent 70%)`,
                          pointerEvents: "none",
                        }} />
                        <div style={{
                          position: "absolute",
                          bottom: -40,
                          left: -40,
                          width: 180,
                          height: 180,
                          background: `radial-gradient(circle, ${BRAND.pink}10, transparent 70%)`,
                          pointerEvents: "none",
                        }} />
                        <div style={{ position: "relative", zIndex: 1 }}>
                          {item.icon}
                          <Title level={4} style={{ margin: "12px 0 8px", color: "var(--ink)" }}>{item.title}</Title>
                          <Text className="muted">{item.desc}</Text>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </Container>
            </Section>

            <Divider />

            {/* ABOUT */}
            <Section id="about" style={{ paddingTop: 100, paddingBottom: 20 }}>
              <Container>
                <Row gutter={[40, 40]} align="middle">
                  <Col xs={24} lg={12}>
                    <motion.div
                      variants={prefersReduced ? undefined : fadeUp}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.4 }}
                    >
                      <Title level={2} style={{ marginBottom: 20, color: "var(--ink)", fontSize: screens.md ? 42 : 32 }}>
                        What is VAWCare?
                      </Title>
                      <Paragraph className="muted" style={{ fontSize: 17, lineHeight: 1.7, marginBottom: 28 }}>
                        <b>VAWCare</b> is a community-first reporting and coordination system for barangays. It centralizes incident intake,
                        secure case tracking, and rapid response—so survivors get help and officials work from the same, up-to-date picture.
                      </Paragraph>
                      <Space size={[8, 8]} wrap style={{ marginBottom: 24 }}>
                        <Tag color="magenta" style={{ borderRadius: 8, padding: "4px 12px" }}>VAWCare Privacy</Tag>
                        <Tag color="blue" style={{ borderRadius: 8, padding: "4px 12px" }}>VAWCare Alerts</Tag>
                        <Tag color="green" style={{ borderRadius: 8, padding: "4px 12px" }}>VAWCare Support</Tag>
                        <Tag color="geekblue" style={{ borderRadius: 8, padding: "4px 12px" }}>Accessible</Tag>
                      </Space>
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <Text style={{ fontSize: 15 }}>• Role-based dashboards: <b>Survivor</b>, <b>Official</b>, <b>Admin</b>.</Text>
                        <Text style={{ fontSize: 15 }}>• Evidence uploads with audit logs and status history.</Text>
                        <Text style={{ fontSize: 15 }}>• Notifications and case timelines powered by VAWCare.</Text>
                      </Space>
                    </motion.div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div style={{ height: screens.md ? "480px" : "420px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: screens.md ? 0 : 120, paddingRight: screens.md ? 0 : 40 }}>
                      <CardSwap
                        width={screens.md ? 360 : 300}
                        height={screens.md ? 400 : 360}
                        cardDistance={screens.md ? 45 : 35}
                        verticalDistance={screens.md ? 55 : 45}
                        delay={4500}
                        pauseOnHover={true}
                        skewAmount={4}
                        easing="elastic"
                      >
                        <Card
                          style={{
                            background: `linear-gradient(135deg, ${BRAND.pink}15, ${BRAND.violet}20)`,
                            backdropFilter: "blur(20px)",
                            border: `1px solid ${SURFACE.border}`,
                            borderRadius: 24,
                            padding: screens.md ? 28 : 20,
                            boxShadow: `0 24px 60px ${dark ? "rgba(122,90,248,0.3)" : "rgba(233,30,99,0.2)"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div style={{
                            width: 100,
                            height: 100,
                            marginBottom: 24,
                            borderRadius: 24,
                            background: "#fff",
                            display: "grid",
                            placeItems: "center",
                            padding: 16,
                            boxShadow: `0 12px 32px ${dark ? "rgba(122,90,248,0.2)" : "rgba(233,30,99,0.15)"}`,
                          }}>
                            <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
                              <defs>
                                <linearGradient id="vawcare-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" style={{ stopColor: BRAND.pink }} />
                                  <stop offset="100%" style={{ stopColor: BRAND.violet }} />
                                </linearGradient>
                              </defs>
                              <circle cx="100" cy="100" r="80" fill="url(#vawcare-gradient)" opacity="0.2" />
                              <path d="M100 50 L120 90 L160 90 L130 115 L145 155 L100 130 L55 155 L70 115 L40 90 L80 90 Z" fill="url(#vawcare-gradient)" />
                            </svg>
                          </div>
                          <Title level={4} style={{ margin: "0 0 12px", color: "var(--ink)", textAlign: "center" }}>
                            For Survivors
                          </Title>
                          <Text className="muted" style={{ textAlign: "center" }}>Create a safe VAWCare report, track your case, and control who can see details.</Text>
                        </Card>

                        <Card
                          style={{
                            background: `linear-gradient(135deg, ${BRAND.violet}15, ${BRAND.pink}20)`,
                            backdropFilter: "blur(20px)",
                            border: `1px solid ${SURFACE.border}`,
                            borderRadius: 24,
                            padding: screens.md ? 28 : 20,
                            boxShadow: `0 24px 60px ${dark ? "rgba(233,30,99,0.3)" : "rgba(122,90,248,0.2)"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div style={{
                            width: 100,
                            height: 100,
                            marginBottom: 24,
                            borderRadius: 24,
                            background: "#fff",
                            display: "grid",
                            placeItems: "center",
                            padding: 16,
                            boxShadow: `0 12px 32px ${dark ? "rgba(233,30,99,0.2)" : "rgba(122,90,248,0.15)"}`,
                          }}>
                            <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
                              <defs>
                                <linearGradient id="vawcare-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" style={{ stopColor: BRAND.violet }} />
                                  <stop offset="100%" style={{ stopColor: BRAND.pink }} />
                                </linearGradient>
                              </defs>
                              <circle cx="100" cy="100" r="80" fill="url(#vawcare-gradient-2)" opacity="0.2" />
                              <path d="M100 50 L120 90 L160 90 L130 115 L145 155 L100 130 L55 155 L70 115 L40 90 L80 90 Z" fill="url(#vawcare-gradient-2)" />
                            </svg>
                          </div>
                          <Title level={4} style={{ margin: "0 0 12px", color: "var(--ink)", textAlign: "center" }}>
                            For Officials
                          </Title>
                          <Text className="muted" style={{ textAlign: "center" }}>Standardized intake and triage, assignment, and inter-office coordination with VAWCare tools.</Text>
                        </Card>

                        <Card
                          style={{
                            background: `linear-gradient(135deg, ${BRAND.pink}20, ${BRAND.violet}15)`,
                            backdropFilter: "blur(20px)",
                            border: `1px solid ${SURFACE.border}`,
                            borderRadius: 24,
                            padding: screens.md ? 28 : 20,
                            boxShadow: `0 24px 60px ${dark ? "rgba(122,90,248,0.3)" : "rgba(233,30,99,0.2)"}`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div style={{
                            width: 100,
                            height: 100,
                            marginBottom: 24,
                            borderRadius: 24,
                            background: "#fff",
                            display: "grid",
                            placeItems: "center",
                            padding: 16,
                            boxShadow: `0 12px 32px ${dark ? "rgba(122,90,248,0.2)" : "rgba(233,30,99,0.15)"}`,
                          }}>
                            <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
                              <defs>
                                <linearGradient id="vawcare-gradient-3" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" style={{ stopColor: BRAND.pink }} />
                                  <stop offset="100%" style={{ stopColor: BRAND.violet }} />
                                </linearGradient>
                              </defs>
                              <circle cx="100" cy="100" r="80" fill="url(#vawcare-gradient-3)" opacity="0.2" />
                              <path d="M100 50 L120 90 L160 90 L130 115 L145 155 L100 130 L55 155 L70 115 L40 90 L80 90 Z" fill="url(#vawcare-gradient-3)" />
                            </svg>
                          </div>
                          <Title level={4} style={{ margin: "0 0 12px", color: "var(--ink)", textAlign: "center" }}>
                            Community First
                          </Title>
                          <Text className="muted" style={{ textAlign: "center" }}>Built for barangays to protect and support survivors with coordinated, efficient response.</Text>
                        </Card>
                      </CardSwap>
                    </div>
                  </Col>
                </Row>

                {/* Install App Section */}
                <motion.div
                  variants={prefersReduced ? undefined : fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.4 }}
                  style={{
                    marginTop: screens.md ? 24 : 60,
                    padding: screens.md ? "48px 40px" : "32px 24px",
                    textAlign: "center",
                    maxWidth: 640,
                    marginInline: "auto",
                    borderRadius: 24,
                    paddingTop: "50px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* soft accent strip */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,

                      opacity: dark ? 0.55 : 0.35,
                      pointerEvents: "none",
                    }}
                  />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    {/* small pill label */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        marginBottom: 10,
                      }}
                    >

                    </div>

                    <Title
                      level={screens.md ? 3 : 4}
                      style={{
                        marginBottom: 10,
                        color: "var(--ink)",
                        fontWeight: 700,
                      }}
                    >
                      Install the VAWCare App
                    </Title>

                    <Paragraph
                      className="muted"
                      style={{
                        fontSize: 15,
                        marginBottom: 24,
                        maxWidth: 560,
                        marginInline: "auto",
                      }}
                    >
                      Save VAWCare to your home screen so help, reports, and hotlines are just
                      one tap away. Choose{" "}
                      <b>original</b> or <b>disguise mode</b> for extra privacy.
                    </Paragraph>

                    <InstallButton ref={installButtonRef} />
                  </div>
                </motion.div>

              </Container>
            </Section>

            {/* HOW IT WORKS */}
            <Section style={{ paddingBottom: 56, }}>
              <Container>
                <Title level={3} style={{ textAlign: "center", marginBottom: 24, color: "var(--ink)" }}>
                  How VAWCare Works
                </Title>
                <motion.div
                  className="bits-grid cols-3"
                  style={{ maxWidth: 1100, margin: "0 auto" }}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={{
                    hidden: {},
                    show: {
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                >
                  {[
                    { t: "Report in VAWCare", d: "Create a secure report with optional evidence—only authorized officials can view." },
                    { t: "Coordinate via VAWCare", d: "Barangay officials triage and update case status with audit trails." },
                    { t: "Track with VAWCare", d: "Receive notifications, access resources, and view your case timeline." },
                  ].map((s, i) => (
                    <motion.div
                      key={s.t}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } }
                      }}
                      style={{ height: "100%" }}
                    >
                      <GlassCard style={{ minHeight: "180px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Space align="start" size={12} style={{ width: "100%" }}>
                          <motion.div
                            style={{
                              width: 36, height: 36, borderRadius: 999,
                              display: "grid", placeItems: "center",
                              fontWeight: 700, background: "var(--brand)", color: "#fff",
                              flexShrink: 0,
                            }}
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {i + 1}
                          </motion.div>
                          <div style={{ flex: 1 }}>
                            <Title level={4} style={{ margin: 0, color: "var(--ink)" }}>{s.t}</Title>
                            <Text className="muted">{s.d}</Text>
                          </div>
                        </Space>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
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

            {/* LOCATION / WHERE TO FIND US */}
            <Section id="location" style={{ paddingTop: 20, paddingBottom: 56 }}>
              <Container>
                <motion.div
                  variants={prefersReduced ? undefined : fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <motion.div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: `linear-gradient(120deg, ${BRAND.pink}18, ${BRAND.violet}18)`,
                        padding: "8px 18px",
                        borderRadius: 999,
                        border: `1px solid ${SURFACE.border}`,
                        marginBottom: 16,
                      }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <EnvironmentOutlined style={{ fontSize: 20, color: BRAND.pink }} />
                      <Text style={{ fontWeight: 700, color: "var(--ink)" }}>Find Us</Text>
                    </motion.div>
                    <Title level={2} style={{ marginBottom: 12, color: "var(--ink)" }}>
                      We're Here to Help
                    </Title>
                    <Paragraph className="muted" style={{ fontSize: 16, maxWidth: 680, margin: "0 auto" }}>
                      VAWCare is proudly serving Barangay Bonfal Proper, bringing comprehensive support
                      and protection services directly to our community.
                    </Paragraph>
                  </div>

                  <Row style={{ paddingTop: 40, paddingBottom: 40 }} gutter={[32, 32]} align="middle">
                    <Col xs={24} lg={12}>
                      <GlassCard
                        style={{
                          background: `linear-gradient(135deg, ${BRAND.pink}08, ${BRAND.violet}10)`,
                          border: `1px solid ${SURFACE.border}`,
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div style={{
                          position: "absolute",
                          top: -40,
                          right: -40,
                          width: 200,
                          height: 200,
                          background: `radial-gradient(circle, ${BRAND.violet}12, transparent 70%)`,
                          pointerEvents: "none",
                        }} />
                        <div style={{
                          position: "absolute",
                          bottom: -60,
                          left: -60,
                          width: 250,
                          height: 250,
                          background: `radial-gradient(circle, ${BRAND.pink}10, transparent 70%)`,
                          pointerEvents: "none",
                        }} />

                        <div style={{ position: "relative", zIndex: 1 }}>
                          <motion.div
                            style={{
                              width: 100,
                              height: 100,
                              marginBottom: 24,
                              borderRadius: 28,
                              background: `linear-gradient(135deg, ${BRAND.pink}20, ${BRAND.violet}20)`,
                              border: `2px solid ${SURFACE.border}`,
                              display: "grid",
                              placeItems: "center",
                              fontSize: 56,
                              boxShadow: `0 20px 60px ${dark ? "rgba(122,90,248,0.25)" : "rgba(233,30,99,0.15)"}`,
                            }}
                            whileHover={{ scale: 1.08, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            🗺️
                          </motion.div>

                          <Title level={3} style={{ margin: "0 0 24px", color: "var(--ink)" }}>
                            Visit Our Office
                          </Title>

                          <Space direction="vertical" size={20} style={{ width: "100%" }}>
                            <div>
                              <Text style={{ fontSize: 13, color: BRAND.pink, fontWeight: 700, letterSpacing: "0.5px" }}>
                                ADDRESS
                              </Text>
                              <Title level={4} style={{ margin: "4px 0", color: "var(--ink)" }}>
                                Barangay Bonfal Proper
                              </Title>
                              <Text className="muted">Nueva Vizcaya, Philippines</Text>
                            </div>

                            <div>
                              <Text style={{ fontSize: 13, color: BRAND.violet, fontWeight: 700, letterSpacing: "0.5px" }}>
                                HOW TO GET THERE
                              </Text>
                              <Paragraph className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>
                                Located in the heart of Barangay Bonfal Proper, accessible via local transport
                                and major thoroughfares in Nueva Vizcaya.
                              </Paragraph>
                            </div>

                            <motion.a
                              href="https://www.google.com/maps?q=16.4990,121.1771"
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "14px 28px",
                                background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.violet})`,
                                color: "#fff",
                                borderRadius: 14,
                                fontWeight: 700,
                                textDecoration: "none",
                                boxShadow: `0 12px 32px ${dark ? "rgba(122,90,248,0.3)" : "rgba(233,30,99,0.25)"}`,
                                border: "none",
                              }}
                              whileHover={{
                                scale: 1.03,
                                y: -3,
                                boxShadow: `0 16px 40px ${dark ? "rgba(122,90,248,0.4)" : "rgba(233,30,99,0.35)"}`,
                              }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <EnvironmentOutlined style={{ fontSize: 18 }} />
                              Open in Google Maps
                            </motion.a>
                          </Space>
                        </div>
                      </GlassCard>
                    </Col>

                    <Col xs={24} lg={12}>
                      <div style={{ height: screens.md ? "500px" : "450px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: screens.md ? 0 : 120, paddingRight: screens.md ? 0 : 40 }}>
                        <CardSwap
                          width={screens.md ? 380 : 320}
                          height={screens.md ? 420 : 380}
                          cardDistance={screens.md ? 50 : 40}
                          verticalDistance={screens.md ? 60 : 50}
                          delay={4000}
                          pauseOnHover={true}
                          skewAmount={0}
                          easing="elastic"
                        >
                          <Card
                            style={{
                              background: `linear-gradient(135deg, ${BRAND.pink}12, ${BRAND.violet}18)`,
                              backdropFilter: "blur(20px)",
                              border: `1px solid ${SURFACE.border}`,
                              borderRadius: 24,
                              padding: screens.md ? 32 : 24,
                              boxShadow: `0 24px 60px ${dark ? "rgba(122,90,248,0.3)" : "rgba(233,30,99,0.2)"}`,
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <div style={{
                                width: 80,
                                height: 80,
                                margin: "0 auto 20px",
                                borderRadius: 24,
                                background: `linear-gradient(135deg, ${BRAND.pink}20, ${BRAND.violet}20)`,
                                display: "grid",
                                placeItems: "center",
                                fontSize: 40,
                                border: `2px solid ${SURFACE.border}`,
                              }}>
                                🏘️
                              </div>
                              <Title level={3} style={{ margin: "0 0 12px", color: "var(--ink)" }}>
                                Barangay Office
                              </Title>
                              <Text className="muted" style={{ display: "block", marginBottom: 16, fontSize: 15 }}>
                                Bonfal Proper, Nueva Vizcaya
                              </Text>
                              <Divider style={{ margin: "20px 0", borderColor: SURFACE.border }} />
                              <Space direction="vertical" size={10} style={{ width: "100%", marginTop: 16 }}>
                                <div style={{ textAlign: "left" }}>
                                  <Text style={{ fontSize: 12, color: BRAND.pink, fontWeight: 700, letterSpacing: "0.5px" }}>
                                    OFFICE HOURS
                                  </Text>
                                  <div style={{ marginTop: 6 }}>
                                    <Tag color="magenta" style={{ borderRadius: 8, fontSize: 13 }}>Mon–Fri: 8AM – 5PM</Tag>
                                  </div>
                                </div>
                              </Space>
                            </div>
                          </Card>

                          <Card
                            style={{
                              background: `linear-gradient(135deg, ${BRAND.violet}12, ${BRAND.pink}18)`,
                              backdropFilter: "blur(20px)",
                              border: `1px solid ${SURFACE.border}`,
                              borderRadius: 24,
                              padding: screens.md ? 32 : 24,
                              boxShadow: `0 24px 60px ${dark ? "rgba(233,30,99,0.3)" : "rgba(122,90,248,0.2)"}`,
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <div style={{
                                width: 80,
                                height: 80,
                                margin: "0 auto 20px",
                                borderRadius: 24,
                                background: `linear-gradient(135deg, ${BRAND.violet}20, ${BRAND.pink}20)`,
                                display: "grid",
                                placeItems: "center",
                                fontSize: 40,
                                border: `2px solid ${SURFACE.border}`,
                              }}>
                                📧
                              </div>
                              <Title level={3} style={{ margin: "0 0 12px", color: "var(--ink)" }}>
                                Contact Us
                              </Title>
                              <Text className="muted" style={{ display: "block", marginBottom: 16, fontSize: 15 }}>
                                Get in touch anytime
                              </Text>
                              <Divider style={{ margin: "20px 0", borderColor: SURFACE.border }} />
                              <Space direction="vertical" size={12} style={{ width: "100%", marginTop: 16 }}>
                                <div>
                                  <Text style={{ fontSize: 12, color: BRAND.violet, fontWeight: 700, letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                    EMAIL ADDRESS
                                  </Text>
                                  <a
                                    href="mailto:barangayvawcdesk@email.com"
                                    style={{
                                      color: BRAND.pink,
                                      fontWeight: 600,
                                      textDecoration: "none",
                                      fontSize: 14,
                                    }}
                                  >
                                    barangayvawcdesk@email.com
                                  </a>
                                </div>
                              </Space>
                            </div>
                          </Card>

                          <Card
                            style={{
                              background: `linear-gradient(135deg, ${BRAND.pink}18, ${BRAND.violet}12)`,
                              backdropFilter: "blur(20px)",
                              border: `1px solid ${SURFACE.border}`,
                              borderRadius: 24,
                              padding: screens.md ? 32 : 24,
                              boxShadow: `0 24px 60px ${dark ? "rgba(122,90,248,0.3)" : "rgba(233,30,99,0.2)"}`,
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <div style={{
                                width: 80,
                                height: 80,
                                margin: "0 auto 20px",
                                borderRadius: 24,
                                background: `linear-gradient(135deg, ${BRAND.pink}20, ${BRAND.violet}20)`,
                                display: "grid",
                                placeItems: "center",
                                fontSize: 40,
                                border: `2px solid ${SURFACE.border}`,
                              }}>
                                🛡️
                              </div>
                              <Title level={3} style={{ margin: "0 0 12px", color: "var(--ink)" }}>
                                Our Services
                              </Title>
                              <Text className="muted" style={{ display: "block", marginBottom: 16, fontSize: 15 }}>
                                Confidential & secure
                              </Text>
                              <Divider style={{ margin: "20px 0", borderColor: SURFACE.border }} />
                              <Space direction="vertical" size={10} style={{ width: "100%", marginTop: 16 }}>
                                <div style={{ textAlign: "left" }}>
                                  <Text style={{ fontSize: 12, color: BRAND.pink, fontWeight: 700, letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                                    AVAILABLE SUPPORT
                                  </Text>
                                  <Space size={6} wrap>
                                    <Tag color="green" style={{ borderRadius: 8, fontSize: 12 }}>Reporting</Tag>
                                    <Tag color="purple" style={{ borderRadius: 8, fontSize: 12 }}>Emergency</Tag>
                                    <Tag color="blue" style={{ borderRadius: 8, fontSize: 12 }}>Counseling</Tag>
                                  </Space>
                                </div>
                              </Space>
                            </div>
                          </Card>
                        </CardSwap>
                      </div>
                    </Col>
                  </Row>
                </motion.div>
              </Container>
            </Section>
          </Content>

          <Footer style={{ background: "transparent", padding: 24, textAlign: "center", color: "var(--ink)", borderTop: `1px solid var(--border)` }}>
            <Text style={{ fontSize: 16 }}>
              💡 Need immediate help? Call <b>1553 (NCMH Crisis Hotline)</b> • PNP: <b>911</b> • DSWD: <b>1343</b>
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
