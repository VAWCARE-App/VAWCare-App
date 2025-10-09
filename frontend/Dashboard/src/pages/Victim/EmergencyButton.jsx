import React, { useState } from "react";
import { message } from "antd";
import { api } from "../../lib/api";
import { BellFilled } from "@ant-design/icons";

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [activeAlertStart, setActiveAlertStart] = useState(null);

  // Format milliseconds to HH:MM:SS
  const formatDuration = (ms) => {
    if (ms == null || isNaN(ms)) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleEmergencyClick = async () => {
    // If already pulsing, this click should resolve the active alert
    if (pulsing && activeAlertId) {
      // Stop pulsing immediately in UI
      setPulsing(false);
      setLoading(true);
      try {
        const { data } = await api.put(`/api/alerts/${activeAlertId}/resolve`);
        message.success('Alert resolved');
        // clear stored active alert and start time
        setActiveAlertId(null);
        setActiveAlertStart(null);
        // optionally show duration if returned
        const duration = data?.data?.durationMs;
        if (typeof duration === 'number') {
          message.info(`Alert active for ${formatDuration(duration)}`);
        }
      } catch (err) {
        console.error('Failed to resolve alert', err);
        message.error(err?.response?.data?.message || 'Failed to resolve alert');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Only send emergency report when toggling ON
    if (!pulsing) {

      //sends location to backend
      if (!navigator.geolocation) {
        message.error("Geolocation is not supported by your browser.");
        return;
      }

      setLoading(true);

      // Wrap geolocation in a Promise so we can await coordinates
      const getPosition = () =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });

      try {
        const pos = await getPosition();
        const { latitude, longitude } = pos.coords;
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        console.log("Emergency alert sent:", { latitude, longitude });

        // For emergency one-click alerts we send an anonymous alert payload
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const victimID = user && (user._id || user.id);

        const payload = {
          location: { latitude, longitude },
          alertType: "Emergency",
          // include victimID when available; the backend Alert model requires it
          ...(victimID ? { victimID } : {})
        };

  const { data } = await api.post("/api/victims/anonymous/alert", payload);
  // backend returns created alert id and createdAt in data.data
  const alertId = data?.data?.alertId || data?.alertId || (data && data._id);
  const createdAt = data?.data?.createdAt || data?.createdAt || null;
  if (alertId) setActiveAlertId(alertId);
  if (createdAt) setActiveAlertStart(new Date(createdAt));
  // Start pulsing only after backend confirms the alert was saved
  setPulsing(true);
  message.success("🚨 Emergency alert sent!");
      } catch (err) {
        console.error(err);
        const errMsg = err?.response?.data?.message || err?.message || "Emergency report failed. Try again.";
        message.error(errMsg);
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
