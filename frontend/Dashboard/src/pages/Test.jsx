// src/pages/LandingPage.js
import React from "react";
import { Button, Typography, Row, Col, Card } from "antd";
import { useNavigate } from "react-router-dom";
import {
  HeartOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  LoginOutlined,
  UserAddOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function Test() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff 0%, #ffe6ef 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Hero Section */}
      <div
        style={{
          flex: "1 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px 16px",
        }}
      >
        <Title level={1} style={{ color: "#e91e63", marginBottom: 16 }}>
          Welcome to VAWCare 💖
        </Title>
        <Paragraph style={{ fontSize: 18, maxWidth: 700, margin: "0 auto" }}>
          A safe space where victims of violence can easily report incidents,
          get help from barangay officials, and connect to support services.
          You are not alone — we are here to help.
        </Paragraph>

        {/* Call to Actions */}
        <div style={{ marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={() => navigate("/login")}
            style={{
              background: "#e91e63",
              borderColor: "#e91e63",
              borderRadius: 8,
              padding: "0 32px",
            }}
          >
            Victim Login
          </Button>
          <Button
            size="large"
            icon={<UserAddOutlined />}
            onClick={() => navigate("/register")}
            style={{
              borderColor: "#e91e63",
              color: "#e91e63",
              borderRadius: 8,
              padding: "0 32px",
            }}
          >
            Register
          </Button>
          <Button
            size="large"
            onClick={() => navigate("/admin/login")}
            style={{
              borderColor: "#555",
              color: "#555",
              borderRadius: 8,
              padding: "0 32px",
            }}
          >
            Admin / Barangay
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: "48px 16px", background: "#fff" }}>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={12} md={8}>
            <Card hoverable bordered={false} style={{ borderRadius: 12 }}>
              <HeartOutlined style={{ fontSize: 40, color: "#e91e63" }} />
              <Title level={4} style={{ marginTop: 12 }}>
                Safe & Confidential
              </Title>
              <Text>All reports are handled privately with barangay officials.</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card hoverable bordered={false} style={{ borderRadius: 12 }}>
              <SafetyCertificateOutlined style={{ fontSize: 40, color: "#2196f3" }} />
              <Title level={4} style={{ marginTop: 12 }}>
                One-Tap Emergency
              </Title>
              <Text>Send an emergency alert instantly to your barangay.</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card hoverable bordered={false} style={{ borderRadius: 12 }}>
              <TeamOutlined style={{ fontSize: 40, color: "#4caf50" }} />
              <Title level={4} style={{ marginTop: 12 }}>
                Connected Support
              </Title>
              <Text>Access barangay contacts, chatbot, and help lines easily.</Text>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Hotline Footer */}
      <footer
        style={{
          background: "#e91e63",
          padding: 20,
          textAlign: "center",
          color: "#fff",
          marginTop: "auto",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>
          💡 Need immediate help? Call <b>1553 (VAWC Hotline)</b>
        </Text>
      </footer>
    </div>
  );
}
