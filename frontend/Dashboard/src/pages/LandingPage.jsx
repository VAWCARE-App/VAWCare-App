import React, { useMemo } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Button,
  Card,
  Statistic,
  Tag,
  List,
  Grid,
  Space,
  BackTop,
  Divider,
} from "antd";
import { Link } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";
import Navbar from "../components/Navbar";

const { Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const screens = Grid.useBreakpoint();

  const stats = useMemo(
    () => [
      { label: "RA 9262 cases (PNP, 2023)", value: 8055 },
      { label: "VAC cases (PNP, 2024)", value: 18089 },
      { label: "Women 15–49 ever IPV (NDHS 2022)", value: 17.5, suffix: "%" },
    ],
    []
  );

  const news = [
    {
      title: "PNP recorded 8,055 Anti-VAWC (RA 9262) cases in 2023",
      source: "PCW / Inquirer (18-Day Campaign 2024)",
      href: "https://pcw.gov.ph/a-clarion-call-to-all-time-now-to-end-vaw/",
    },
    {
      title:
        "DOJ: 18-day drive highlights VAWC initiatives; cites 8,055 RA 9262 cases (2023)",
      source: "Inquirer.net",
      href: "https://newsinfo.inquirer.net/2009868/doj-highlights-vawc-initiatives-in-18-day-drive-to-end-violence-vs-women",
    },
    {
      title: "PCW: Only ~1 in 10 VAW cases get reported, per PNP",
      source: "Inquirer.net",
      href: "https://newsinfo.inquirer.net/2014640/pcw-pnp-only-1-in-10-cases-of-violence-vs-women-gets-reported",
    },
    {
      title: "PNP data: VAC cases dropped from 23,816 (2016) to 18,089 (2024)",
      source: "Manila Standard (CWC/DSWD)",
      href: "https://manilastandard.net/news/314594034/cases-of-violence-against-children-on-steady-decline-says-dswd.html",
    },
    {
      title: "What is VAW? Definitions and data snapshots",
      source: "PCW",
      href: "https://pcw.gov.ph/violence-against-women/",
    },
  ];

  return (
    <Layout>
      <Navbar />

      <Content>
        {/* HERO */}
        <section
          id="home"
          style={{
            position: "relative",
            minHeight: "86vh",
            padding: "72px 20px 40px",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, #fff5f7 0%, #ffffff 60%)",
          }}
        >
          {/* Animated pastel bubbles (parallax layers) */}
          <div className="bubble b1" />
          <div className="bubble b2" />
          <div className="bubble b3" />
          <div className="bubble b4" />
          <div className="bubble b5" />

          <Row
            justify="center"
            gutter={[32, 24]}
            style={{ width: "100%", position: "relative", zIndex: 1 }}
          >
            <Col xs={24} md={20} lg={14} style={{ textAlign: "center" }}>
              <Title
                style={{
                  color: "#e91e63",
                  marginBottom: 8,
                  animation: "rise 820ms ease both",
                  letterSpacing: 0.2,
                }}
              >
                VAWCare — Safe. Heard. Supported.
              </Title>
              <Paragraph
                style={{
                  color: "#5b5b5b",
                  maxWidth: 760,
                  margin: "0 auto 18px",
                  animation: "fade 1s ease 120ms both",
                }}
              >
                Report incidents safely, connect with officials, track cases, and
                access verified resources. Together we build a VAW-free
                community.
              </Paragraph>
              <Space wrap style={{ animation: "fade 1s ease 220ms both" }}>
                <a href="#about">
                  <Button size="large">Learn More</Button>
                </a>
                <Link to="/login">
                  <Button
                    size="large"
                    type="primary"
                    style={{ background: "#e91e63", borderColor: "#e91e63" }}
                  >
                    Go to Login <ArrowRightOutlined />
                  </Button>
                </Link>
              </Space>
            </Col>
          </Row>

          {/* Animations / Pastel palette */}
          <style>{`
            :root{
              --pastel-pink:#ffd1dc;
              --pastel-peach:#ffe5d9;
              --pastel-lilac:#e9dcf9;
              --pastel-mint:#d8f3dc;
              --pastel-sky:#d7ecff;
            }

            @keyframes drift {
              0%   { transform: translate3d(0,0,0) scale(1); }
              25%  { transform: translate3d(20px,-15px,0) scale(1.05); }
              50%  { transform: translate3d(-15px,10px,0) scale(0.97); }
              75%  { transform: translate3d(15px,15px,0) scale(1.03); }
              100% { transform: translate3d(0,0,0) scale(1); }
            }

            .bubble {
              position:absolute;
              border-radius:50%;
              filter: blur(30px);
              opacity:.5;
              pointer-events:none;
              mix-blend-mode:multiply;
              will-change: transform;
              animation: drift linear infinite;
            }

            .b1{ width:280px; height:280px; left:6%; top:16%; background:var(--pastel-pink); animation-duration: 18s; }
            .b2{ width:220px; height:220px; right:8%; top:10%; background:var(--pastel-lilac); animation-duration: 22s; animation-delay: -4s; }
            .b3{ width:180px; height:180px; left:18%; bottom:8%; background:var(--pastel-mint); animation-duration: 20s; animation-delay: -2s; }
            .b4{ width:240px; height:240px; right:14%; bottom:-40px; background:var(--pastel-peach); animation-duration: 26s; animation-delay: -6s; }
            .b5{ width:160px; height:160px; left:45%; top:30%; background:var(--pastel-sky); animation-duration: 30s; animation-delay: -8s; }

            /* Card hover */
            .lift:hover{ transform: translateY(-4px); transition: transform .25s ease; }
          `}</style>
        </section>

        {/* ABOUT */}
        <section id="about" style={{ padding: "64px 20px", background: "#fff" }}>
          <Row justify="center" gutter={[24, 24]}>
            <Col xs={24} md={20} lg={16} style={{ textAlign: "center" }}>
              <Title level={2} style={{ color: "#e91e63" }}>
                About VAWCare
              </Title>
              <Paragraph style={{ color: "#5b5b5b" }}>
                Role-based dashboards (Victim, Official, Admin), emergency
                reporting, case tracking, and a resource hub—built for
                real-world coordination with LGUs and response units.
              </Paragraph>
            </Col>
          </Row>
        </section>

        {/* STATS + NEWS */}
        <section style={{ padding: "64px 20px", background: "#fff5f7" }}>
          <Row justify="center" gutter={[24, 24]}>
            {/* Quick stats */}
            <Col xs={24} lg={10}>
              <Card
                title="Snapshot: Philippines VAW/VAWC Data"
                bordered={false}
                className="lift"
                style={{
                  borderRadius: 14,
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #fff8fb 100%)",
                }}
              >
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  {stats.map((s) => (
                    <Statistic
                      key={s.label}
                      title={<Text strong>{s.label}</Text>}
                      value={s.value}
                      suffix={s.suffix}
                      valueStyle={{ color: "#e91e63" }}
                    />
                  ))}
                  <Tag color="pink">Sources: PCW / PNP / PSA</Tag>
                </Space>
              </Card>
            </Col>

            {/* News list */}
            <Col xs={24} lg={14}>
              <Card
                title="News & Updates"
                bordered={false}
                className="lift"
                style={{
                  borderRadius: 14,
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f9f7ff 100%)",
                }}
              >
                <List
                  itemLayout={screens.xs ? "vertical" : "horizontal"}
                  dataSource={news}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <a key="read" href={item.href} target="_blank" rel="noreferrer">
                          Read <ArrowRightOutlined />
                        </a>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <a href={item.href} target="_blank" rel="noreferrer">
                            {item.title}
                          </a>
                        }
                        description={<Text type="secondary">{item.source}</Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </section>
      </Content>

      {/* FOOTER */}
      <Footer style={{ padding: 0, background: "#fff" }}>
        <section style={{ padding: "48px 20px" }}>
          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} md={8}>
              <Title level={4} style={{ marginBottom: 8, color: "#e91e63" }}>
                VAWCare
              </Title>
              <Paragraph style={{ marginBottom: 8, color: "#666" }}>
                A safe digital space where victims are heard, supported, and
                guided—built with LGU coordination and secure reporting.
              </Paragraph>
              <Tag color="pink" style={{ marginTop: 4 }}>
                #EndVAW
              </Tag>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Title level={5} style={{ color: "#e91e63" }}>
                Quick Links
              </Title>
              <Space direction="vertical">
                <a href="#home">Home</a>
                <a href="#about">About</a>
                <a href="#home">Media & News</a>
                <Link to="/login">Login</Link>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Title level={5} style={{ color: "#e91e63" }}>
                Emergency Hotlines (PH)
              </Title>
              <Space direction="vertical" style={{ color: "#444" }}>
                <span>📞 911 – National Emergency</span>
                <span>👮 PNP – 117 / local police</span>
                <span>👩‍⚖️ PCW – 1343 Actionline</span>
                <span>🧑‍🤝‍🧑 DSWD Field Office / LGU VAW Desk</span>
              </Space>
            </Col>
          </Row>

          <Divider style={{ margin: "24px 0" }} />

          <Row justify="center">
            <Col xs={24} style={{ textAlign: "center", paddingBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                This website does not replace emergency services. If you or
                someone is in danger, call 911 or contact your nearest police
                station immediately.
              </Text>
            </Col>
          </Row>

          <Row justify="center">
            <Col xs={24} style={{ textAlign: "center", color: "#888" }}>
              © {new Date().getFullYear()} VAWCare • All Rights Reserved
            </Col>
          </Row>
        </section>
      </Footer>

      {/* Back to top */}
      <BackTop />
    </Layout>
  );
}
