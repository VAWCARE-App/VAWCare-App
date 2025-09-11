import React, { useState } from "react";
import { message } from "antd";
import { api } from "../../lib/api";
import { BellFilled } from "@ant-design/icons";

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  const handleEmergencyClick = async () => {
    // Toggle pulsing on/off
    setPulsing((prev) => !prev);

    // Only send emergency report when toggling ON
    if (!pulsing) {
      try {
        setLoading(true);

        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const victimID = user && (user._id || user.id);
        if (!victimID) {
          message.error("Victim ID not found. Please log in again.");
          setLoading(false);
          return;
        }

        const payload = {
          incidentType: "Emergency",
          description: "Urgent emergency report triggered via one-click button.",
          location: "Unknown",
          riskLevel: "High",
          victimID,
        };

        await api.post("/api/reports", payload);
        message.success("🚨 Emergency report sent!");
      } catch (err) {
        message.error(
          err?.response?.data?.message || "Emergency report failed. Try again."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(circle at center, #ff4d4f 20%, #ffd1dc 100%)", // red → pink gradient
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        onClick={handleEmergencyClick}
        style={{
          position: "relative",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #ff3333, #b91c1c)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          boxShadow:
            "inset -6px -6px 12px rgba(255,255,255,0.25), inset 6px 6px 12px rgba(0,0,0,0.4), 0 12px 28px rgba(0,0,0,0.4)",
          transition: "transform 0.1s ease",
          zIndex: 2,
          overflow: "visible",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {/* Continuous pulses when active */}
        {pulsing && (
          <>
            <span className="pulse-ring" />
            <span className="pulse-ring delay1" />
            <span className="pulse-ring delay2" />
          </>
        )}

        <BellFilled style={{ fontSize: 72, color: "#fff", zIndex: 3 }} />
      </div>

      <p
        style={{
          marginTop: 32,
          fontWeight: "700",
          color: pulsing ? "#ff3333" : "#b91c1c",
          fontSize: 20,
          textAlign: "center",
        }}
      >
        {pulsing ? "ALERT ACTIVE - TAP TO STOP" : "TAP TO SEND EMERGENCY ALERT"}
      </p>

      <style>
        {`
          .pulse-ring {
            position: absolute;
            border-radius: 50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,77,79,0.5) 30%, rgba(255,209,220,0.3) 100%);
            animation: pulse 2.4s infinite;
            z-index: 1;
          }
          .pulse-ring.delay1 {
            animation-delay: 0.8s;
          }
          .pulse-ring.delay2 {
            animation-delay: 1.6s;
          }
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 0.6;
            }
            100% {
              transform: scale(3);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
}
