import React, { useState, useRef, useEffect } from "react";
import { message } from "antd";
import { api, getUserData } from "../../lib/api";
import { BellFilled } from "@ant-design/icons";

const CANCEL_WINDOW_MS = 5000; // 5 seconds to cancel before alert is sent

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [activeAlertStart, setActiveAlertStart] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const submittingRef = useRef(false); // synchronous guard to prevent double-submit
  // client-side auto-resolve removed to keep alert active on server when browser is backgrounded

  // Timer countdown effect
  useEffect(() => {
    if (!pulsing || !activeAlertStart) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(activeAlertStart).getTime();
      const remaining = Math.max(0, CANCEL_WINDOW_MS - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [pulsing, activeAlertStart]);

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
    if (pulsing && activeAlertId) {
      // Stop pulsing immediately
      setPulsing(false);
      setLoading(true);
      try {
        const durationMs = activeAlertStart ? (Date.now() - new Date(activeAlertStart).getTime()) : null;
        const { data } = await api.put(`/api/alerts/${activeAlertId}/resolve`, { durationMs });
        const serverDuration = data?.data?.durationMs;
        const effectiveDuration = (typeof serverDuration === 'number') ? serverDuration : durationMs;
        if (typeof effectiveDuration === 'number' && effectiveDuration < CANCEL_WINDOW_MS) {
          messageApi.success('Alert cancelled');
        } else {
          messageApi.success('Alert resolved');
        }
        setActiveAlertId(null);
        setActiveAlertStart(null);
        const duration = data?.data?.durationMs;
        if (typeof duration === 'number') {
          if (duration < CANCEL_WINDOW_MS) {
            messageApi.info(`Alert active for ${formatDuration(duration)} (cancelled)`);
          } else {
            messageApi.info(`Alert active for ${formatDuration(duration)} (resolved)`);
          }
        }
      } catch (err) {
        console.error('Failed to resolve alert', err);
        messageApi.error(err?.response?.data?.message || 'Failed to resolve alert');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!pulsing) {
      if (loading) return;

      setPulsing(true);
      setLoading(true);

      if (!navigator.geolocation) {
        messageApi.error("Geolocation is not supported by your browser.");
        setPulsing(false);
        setLoading(false);
        return;
      }

      const getBestPosition = (opts = {}) =>
        new Promise((resolve, reject) => {
          const maxSamples = opts.maxSamples || 10;
          const maxTime = opts.maxTime || 12000;
          const positions = [];
          let watchId = null;
          let finished = false;
          const ACCURACY_THRESHOLD = 20;

          function done() {
            if (finished) return;
            finished = true;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (positions.length === 0) return reject(new Error('No position samples collected'));
            const accuratePosition = positions.find(p => p.coords && p.coords.accuracy <= ACCURACY_THRESHOLD);
            if (accuratePosition) {
              resolve(accuratePosition);
              return;
            }
            positions.sort((a, b) => (a.coords?.accuracy ?? Infinity) - (b.coords?.accuracy ?? Infinity));
            resolve(positions[0]);
          }

          try {
            watchId = navigator.geolocation.watchPosition(
              (position) => {
                positions.push(position);
                if (position.coords.accuracy <= ACCURACY_THRESHOLD) done();
                if (positions.length >= maxSamples) done();
              },
              (err) => { if (positions.length > 0) done(); else reject(err); },
              { enableHighAccuracy: true, maximumAge: 0, timeout: opts.sampleTimeout || 4000 }
            );
          } catch (e) { return reject(e); }

          setTimeout(done, maxTime);
        });

      try {
        let pos = null;
        try {
          pos = await getBestPosition({ maxSamples: 6, maxTime: 8000 });
        } catch (err) {
          if (err && err.code === 3) {
            pos = await new Promise((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
            );
          } else throw err;
        }

        const { latitude, longitude, accuracy } = pos.coords;
        const timestamp = pos.timestamp || Date.now();
        const userData = await getUserData();
        const victimID = userData?._id || userData?.id;

        const payload = {
          location: { latitude, longitude, accuracy: Math.round(accuracy), timestamp },
          alertType: "Emergency",
          ...(victimID ? { victimID } : {})
        };

        const { data } = await api.post("/api/victims/anonymous/alert", payload);
        const alertId = data?.data?.alertId || data?.alertId || data?._id;
        const createdAt = data?.data?.createdAt || data?.createdAt || null;
        if (alertId) setActiveAlertId(alertId);
        if (createdAt) setActiveAlertStart(new Date(createdAt));

        try {
          if (alertId) {
            const sosResp = await api.post(`/api/alerts/${alertId}/sos`);
            if (sosResp?.data?.success) messageApi.success('🚨 Emergency alert sent!');
            else throw new Error(sosResp?.data?.message || 'Failed to send SOS emails');
          } else throw new Error('Missing alert id after creation');
        } catch (sosErr) {
          console.error('Failed to send SOS emails', sosErr);
          setPulsing(false);
          messageApi.error(sosErr?.response?.data?.message || sosErr?.message || 'Failed to deliver emergency email.');
        }
      } catch (err) {
        console.error(err);
        setPulsing(false);
        messageApi.error(err?.response?.data?.message || err?.message || "Emergency report failed. Try again.");
      } finally {
        setLoading(false);
      }

    }
  };


  return (
    <>
      {contextHolder}
      <div
        className="emergency-container"
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "fixed",
          top: 0,
          left: 0,
          overflow: "hidden",
          paddingTop: "65px",
        }}
      >
        {/* Animated gradient background */}
        <div className="animated-bg"></div>

        {/* Floating particles */}
        <div className="particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>

        {/* Content Wrapper for centering */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "50px",
          zIndex: 10,
        }}>
          {/* Ripple Loader Container */}
          <div
            className="emergency-loader"
            onClick={handleEmergencyClick}
            style={{
              cursor: "pointer",
            }}
            onMouseDown={(e) => {
              const logo = e.currentTarget.querySelector('.emergency-logo');
              if (logo) logo.style.transform = "scale(0.92)";
            }}
            onMouseUp={(e) => {
              const logo = e.currentTarget.querySelector('.emergency-logo');
              if (logo) logo.style.transform = "scale(1)";
            }}
          >
            {/* Outer glow ring */}
            <div className={`outer-ring ${!pulsing ? 'active' : ''}`}></div>

            {/* Static background circle */}
            <div className="emergency-static-circle"></div>

            {/* Ripple boxes - only animate when pulsing */}
            {pulsing && (
              <>
                <div className="emergency-box"></div>
                <div className="emergency-box"></div>
                <div className="emergency-box"></div>
                <div className="emergency-box"></div>
                <div className="emergency-box"></div>
              </>
            )}

            {/* Center button with logo/icon */}
            <div className={`emergency-logo ${pulsing ? 'active' : ''}`}>
              <div className="emergency-button">
                <div className="button-shine"></div>
                <BellFilled style={{ fontSize: 80, color: "#fff", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }} />
              </div>
            </div>
          </div>

          <div className="text-container">
            <p className={`emergency-text ${pulsing ? 'active' : ''}`}>
              {pulsing ? "ALERT ACTIVE" : "EMERGENCY ALERT"}
            </p>
            <p className="emergency-subtext">
              {pulsing ? "Tap to cancel alert" : "Tap button to send alert"}
            </p>
            {pulsing && (
              <p className="emergency-timer">
                Cancel in: {(timeRemaining / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        </div>
        {/* End Content Wrapper */}

        <style>
          {`
            .emergency-container {
              background: #0a0a0a;
            }

            .animated-bg {
              position: absolute;
              inset: 0;
              background: 
                radial-gradient(ellipse at top, #1a0a0f 0%, #0a0a0a 50%),
                linear-gradient(135deg, 
                  #ff1744 0%, 
                  #d32f2f 25%, 
                  #c62828 50%, 
                  #b71c1c 75%, 
                  #8b0000 100%
                );
              background-size: 100% 100%, 400% 400%;
              animation: bg-shift 20s ease infinite;
              opacity: 0.85;
            }

            .animated-bg::before {
              content: '';
              position: absolute;
              inset: 0;
              background: 
                radial-gradient(circle at 30% 40%, rgba(255, 23, 68, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(211, 47, 47, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 50% 80%, rgba(183, 28, 28, 0.1) 0%, transparent 50%);
              animation: float-bg 25s ease-in-out infinite;
            }

            .particles {
              position: absolute;
              inset: 0;
              overflow: hidden;
              z-index: 1;
              pointer-events: none;
            }

            .particle {
              position: absolute;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
              border-radius: 50%;
              pointer-events: none;
            }

            .particle:nth-child(1) {
              width: 4px;
              height: 4px;
              top: 20%;
              left: 10%;
              animation: float-particle 15s ease-in-out infinite;
            }

            .particle:nth-child(2) {
              width: 6px;
              height: 6px;
              top: 60%;
              left: 80%;
              animation: float-particle 18s ease-in-out infinite 2s;
            }

            .particle:nth-child(3) {
              width: 3px;
              height: 3px;
              top: 80%;
              left: 20%;
              animation: float-particle 20s ease-in-out infinite 4s;
            }

            .particle:nth-child(4) {
              width: 5px;
              height: 5px;
              top: 30%;
              left: 70%;
              animation: float-particle 17s ease-in-out infinite 1s;
            }

            .particle:nth-child(5) {
              width: 4px;
              height: 4px;
              top: 50%;
              left: 15%;
              animation: float-particle 22s ease-in-out infinite 3s;
            }

            .particle:nth-child(6) {
              width: 5px;
              height: 5px;
              top: 70%;
              left: 85%;
              animation: float-particle 19s ease-in-out infinite 5s;
            }

            .emergency-loader {
              --size: 320px;
              --duration: 2s;
              height: var(--size);
              width: var(--size);
              aspect-ratio: 1;
              position: relative;
              z-index: 10;
              margin: 0 auto;
            }

            .outer-ring {
              position: absolute;
              inset: -15%;
              background: radial-gradient(
                circle,
                transparent 68%,
                rgba(255, 23, 68, 0.1) 69%,
                rgba(255, 23, 68, 0.2) 70%,
                transparent 71%
              );
              border-radius: 50%;
              z-index: 85;
            }

            .outer-ring.active {
              animation: outer-ring-pulse 3s ease-in-out infinite;
            }

            .emergency-static-circle {
              position: absolute;
              inset: 0%;
              background: linear-gradient(
                135deg,
                rgba(255, 23, 68, 0.08) 0%,
                rgba(183, 28, 28, 0.05) 100%
              );
              border-radius: 50%;
              border: 2px solid rgba(255, 23, 68, 0.25);
              box-shadow: 
                inset 0 0 40px rgba(255, 23, 68, 0.15),
                0 0 60px rgba(255, 23, 68, 0.2),
                0 0 100px rgba(255, 23, 68, 0.1);
              z-index: 90;
            }

            .emergency-box {
              position: absolute;
              background: linear-gradient(
                0deg,
                rgba(255, 23, 68, 0.35) 0%,
                rgba(183, 28, 28, 0.2) 100%
              );
              border-radius: 50%;
              border-top: 2.5px solid rgba(255, 23, 68, 0.9);
              box-shadow: 
                0 0 40px rgba(255, 23, 68, 0.4),
                inset 0 0 25px rgba(255, 255, 255, 0.08);
              backdrop-filter: blur(10px);
              animation: emergency-ripple var(--duration) infinite ease-in-out;
            }

            .emergency-box:nth-child(3) {
              inset: 33%;
              z-index: 99;
            }

            .emergency-box:nth-child(4) {
              inset: 25%;
              z-index: 98;
              animation-delay: 0.2s;
            }

            .emergency-box:nth-child(5) {
              inset: 17%;
              z-index: 97;
              animation-delay: 0.4s;
            }

            .emergency-box:nth-child(6) {
              inset: 9%;
              z-index: 96;
              animation-delay: 0.6s;
            }

            .emergency-box:nth-child(7) {
              inset: 0%;
              z-index: 95;
              animation-delay: 0.8s;
            }

            .emergency-logo {
              position: absolute;
              inset: 0;
              display: grid;
              place-content: center;
              z-index: 100;
              transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .emergency-logo.active {
              animation: pulse-button 2s ease-in-out infinite;
            }

            .emergency-button {
              width: 200px;
              height: 200px;
              border-radius: 50%;
              background: linear-gradient(145deg, #ff1744, #c62828);
              display: flex;
              justify-content: center;
              align-items: center;
              box-shadow:
                inset -10px -10px 20px rgba(255, 255, 255, 0.15),
                inset 10px 10px 20px rgba(0, 0, 0, 0.5),
                0 20px 50px rgba(255, 23, 68, 0.4),
                0 10px 30px rgba(183, 28, 28, 0.3);
              position: relative;
              overflow: hidden;
              transition: all 0.3s ease;
            }

            .button-shine {
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: linear-gradient(
                45deg,
                transparent 30%,
                rgba(255, 255, 255, 0.1) 50%,
                transparent 70%
              );
              animation: shine 3s ease-in-out infinite;
            }

            .emergency-button::before {
              content: '';
              position: absolute;
              inset: -3px;
              border-radius: 50%;
              background: conic-gradient(
                from 0deg,
                rgba(255, 23, 68, 0.6),
                rgba(255, 255, 255, 0.3),
                rgba(255, 23, 68, 0.6)
              );
              animation: rotate-glow 4s linear infinite;
              z-index: -1;
            }

            .emergency-button::after {
              content: '';
              position: absolute;
              inset: 15%;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            }

            .emergency-logo.active .emergency-button {
              animation: pulse-button 1.2s ease-in-out infinite;
              box-shadow:
                inset -10px -10px 20px rgba(255, 255, 255, 0.2),
                inset 10px 10px 20px rgba(0, 0, 0, 0.6),
                0 25px 60px rgba(255, 23, 68, 0.6),
                0 15px 40px rgba(255, 23, 68, 0.5),
                0 0 80px rgba(255, 23, 68, 0.3);
            }

            .text-container {
              text-align: center;
              z-index: 10;
              position: relative;
            }

            .emergency-text {
              font-weight: 800;
              font-size: 28px;
              letter-spacing: 2px;
              background: linear-gradient(135deg, #fff 0%, #ffd1d1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              text-shadow: 0 4px 20px rgba(255, 23, 68, 0.5);
              margin: 0 0 10px 0;
              transition: all 0.3s ease;
            }

            .emergency-text.active {
              animation: text-pulse 1.5s ease-in-out infinite;
            }

            .emergency-subtext {
              font-weight: 500;
              font-size: 14px;
              color: rgba(255, 255, 255, 0.7);
              letter-spacing: 1px;
              margin: 0;
              text-transform: uppercase;
            }

            .emergency-timer {
              font-size: 18px;
              font-weight: 700;
              color: #ff1744;
              letter-spacing: 1px;
              margin: 15px 0 0 0;
              animation: timer-pulse 1s ease-in-out infinite;
            }

            @keyframes timer-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }

            @keyframes bg-shift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            @keyframes float-bg {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(20px, -30px) scale(1.05); }
              66% { transform: translate(-25px, 25px) scale(0.95); }
            }

            @keyframes float-particle {
              0%, 100% {
                transform: translate(0, 0);
                opacity: 0;
              }
              10%, 90% {
                opacity: 0.6;
              }
              50% {
                transform: translate(var(--tx, 100px), var(--ty, -100px));
                opacity: 1;
              }
            }

            @keyframes outer-ring-pulse {
              0%, 100% {
                transform: scale(1);
                opacity: 0.4;
              }
              50% {
                transform: scale(1.05);
                opacity: 0.7;
              }
            }

            @keyframes emergency-ripple {
              0% {
                transform: scale(1);
                opacity: 0.9;
              }
              50% {
                transform: scale(1.3);
                opacity: 0.5;
              }
              100% {
                transform: scale(1);
                opacity: 0.9;
              }
            }

            @keyframes rotate-glow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes shine {
              0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
              100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
            }

            @keyframes pulse-button {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
            }

            @keyframes text-pulse {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.8;
                transform: scale(1.05);
              }
            }
          `}
        </style>
      </div>
    </>
  );
}
