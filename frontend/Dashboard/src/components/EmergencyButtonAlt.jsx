// src/components/EmergencyButton.js
import React from "react";
import { Button } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export default function EmergencyButtonAlt({ compact = false }) {
  const navigate = useNavigate();

  const handleEmergencyClick = () => {
    if (compact) {
      // Compact mode → just navigate to emergency page
      navigate("/victim/emergency");
    } else {
      // Full mode → show big red panic page
      navigate("/victim/emergency");
    }
  };

  if (compact) {
    // ✅ Compact version (for navbar)
    return (
      <Button
        type="primary"
        danger
        shape="round"
        size="middle"
        icon={<ExclamationCircleOutlined />}
        onClick={handleEmergencyClick}
        style={{
          backgroundColor: "#e53935",
          borderColor: "#e53935",
          fontWeight: 600,
        }}
      >
        Emergency
      </Button>
    );
  }

  // ✅ Full-page fallback (your current red screen)
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        backgroundColor: "#e53935",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Emergency</h1>
      <Button
        type="primary"
        size="large"
        danger
        onClick={handleEmergencyClick}
        style={{
          backgroundColor: "#fff",
          color: "#e53935",
          fontWeight: 700,
          border: "none",
        }}
      >
        Trigger Alert
      </Button>
    </div>
  );
}
