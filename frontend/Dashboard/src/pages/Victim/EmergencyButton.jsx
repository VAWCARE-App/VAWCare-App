import React, { useState, useRef } from "react";
import { message } from "antd";
import { api, getUserData } from "../../lib/api";
import { BellFilled } from "@ant-design/icons";

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [activeAlertStart, setActiveAlertStart] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const submittingRef = useRef(false); // synchronous guard to prevent double-submit
  // client-side auto-resolve removed to keep alert active on server when browser is backgrounded

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
    // Prevent re-entry (covers very fast double/tap events)
    if (submittingRef.current) return;
    // If already pulsing, this click should resolve the active alert
  if (pulsing && activeAlertId) {
      // mark submitting so resolve can't be re-triggered
      submittingRef.current = true;
      // Stop pulsing immediately in UI
      setPulsing(false);
      setLoading(true);
      try {
        // compute client-measured duration and send it to server
        const durationMs = activeAlertStart ? (Date.now() - new Date(activeAlertStart).getTime()) : null;
        const { data } = await api.put(`/api/alerts/${activeAlertId}/resolve`, { durationMs });
        // Prefer server-returned duration if present
        const serverDuration = data?.data?.durationMs;
        const effectiveDuration = (typeof serverDuration === 'number') ? serverDuration : durationMs;
        const CANCEL_WINDOW_MS = 3000; // keep in sync with server default
        if (typeof effectiveDuration === 'number' && effectiveDuration < CANCEL_WINDOW_MS) {
          messageApi.success('Alert cancelled');
        } else {
          messageApi.success('Alert resolved');
        }
        // clear stored active alert and start time
        setActiveAlertId(null);
        setActiveAlertStart(null);
        // optionally show duration if returned
        const duration = data?.data?.durationMs;
        if (typeof duration === 'number') {
          const CANCEL_WINDOW_MS = 3000;
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
        submittingRef.current = false;
      }
      return;
    }

    // Only send emergency report when toggling ON
    if (!pulsing) {

  // Immediately show pulsing feedback so user sees action and is unlikely to double-press
  setPulsing(true);
  submittingRef.current = true;

      //sends location to backend
      if (!navigator.geolocation) {
        messageApi.error("Geolocation is not supported by your browser.");
        return;
      }

  setLoading(true);

      // Try to collect multiple high-accuracy samples and pick the best one
      const getBestPosition = (opts = {}) =>
        new Promise((resolve, reject) => {
          const maxSamples = opts.maxSamples || 10; // Increased from 6 to 10 samples
          const maxTime = opts.maxTime || 12000; // Increased from 8000 to 12000ms
          const positions = [];
          let watchId = null;
          let finished = false;
          const ACCURACY_THRESHOLD = 20; // meters - consider this "good enough"

          function done() {
            if (finished) return;
            finished = true;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (positions.length === 0) return reject(new Error('No position samples collected'));
            
            // First try to find a position with accuracy better than threshold
            const accuratePosition = positions.find(p => 
              p.coords && typeof p.coords.accuracy === 'number' && p.coords.accuracy <= ACCURACY_THRESHOLD
            );
            
            if (accuratePosition) {
              resolve(accuratePosition);
              return;
            }

            // If no position meets threshold, pick the most accurate one as before
            positions.sort((a, b) => {
              const aa = (a.coords && typeof a.coords.accuracy === 'number') ? a.coords.accuracy : Infinity;
              const bb = (b.coords && typeof b.coords.accuracy === 'number') ? b.coords.accuracy : Infinity;
              return aa - bb;
            });
            resolve(positions[0]);
          }

          try {
              watchId = navigator.geolocation.watchPosition(
              (position) => {
                positions.push(position);
                // If we get a very accurate reading (under threshold), finish immediately
                if (position.coords && position.coords.accuracy <= ACCURACY_THRESHOLD) {
                  done();
                  return;
                }
                // if we have enough samples, finish
                if (positions.length >= maxSamples) done();
              },
              (err) => {
                // on errors, if we already have samples resolve, otherwise reject
                if (positions.length > 0) return done();
                reject(err);
              },
              { 
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: opts.sampleTimeout || 4000  // Increased from 2500 to 4000ms
              }
            );
          } catch (e) {
            return reject(e);
          }

          // also set an overall timeout
          const to = setTimeout(() => {
            clearTimeout(to);
            done();
          }, maxTime);
        });

      try {
        let pos = null;
        try {
          pos = await getBestPosition({ maxSamples: 6, maxTime: 8000 });
        } catch (err) {
          // If sampler timed out (code 3) try a single getCurrentPosition with cached option as a fallback
          if (err && err.code === 3) {
            try {
              pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { 
                  enableHighAccuracy: true, 
                  maximumAge: 0, // Don't use cached positions
                  timeout: 10000 // Increased timeout for better accuracy
                });
              });
            } catch (fallbackErr) {
              throw err; // rethrow original
            }
          } else {
            throw err;
          }
        }
        const { latitude, longitude, accuracy } = pos.coords;
        const timestamp = pos.timestamp || Date.now();
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${typeof accuracy === 'number' ? Math.round(accuracy) + 'm' : 'unknown'})`;
        console.log('Emergency alert sent (best sample):', { latitude, longitude, accuracy, timestamp });

        // For emergency one-click alerts we send an anonymous alert payload
        const userData = await getUserData();
        const victimID = userData && (userData._id || userData.id);

        const payload = {
          location: { latitude, longitude, accuracy: (typeof accuracy === 'number' ? Math.round(accuracy) : null), timestamp },
          alertType: "Emergency",
          // include victimID when available; the backend Alert model requires it
          ...(victimID ? { victimID } : {})
        };

        const { data } = await api.post("/api/victims/anonymous/alert", payload); // No change here
  // backend returns created alert id and createdAt in data.data
  const alertId = data?.data?.alertId || data?.alertId || (data && data._id);
  const createdAt = data?.data?.createdAt || data?.createdAt || null;
  if (alertId) setActiveAlertId(alertId);
  if (createdAt) setActiveAlertStart(new Date(createdAt));
  // Start pulsing only after backend confirms the alert was saved
  // Do NOT start a client-side auto-resolve timer — server should be authoritative so alerts remain active
        messageApi.success("🚨 Emergency alert sent!");
      } catch (err) {
        console.error(err);
        const errMsg = err?.response?.data?.message || err?.message || "Emergency report failed. Try again.";
        // revert optimistic pulsing on error
        setPulsing(false);
        messageApi.error(errMsg);
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    }
  };

  return (
    <>
      {contextHolder}
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
          pointerEvents: submittingRef.current ? 'none' : 'auto',
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
    </>
  );
}
