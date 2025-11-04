// src/pages/Test.jsx
import { useEffect, useState } from "react";

export default function Test() {
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  const api = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    // SSE endpoint (adjust if using environment variable)
    const url = `${api}/api/sse/stream`;
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onopen = () => setConnectionStatus("Connected");
    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setConnectionStatus("Disconnected");
      eventSource.close();
    };

    // Listen to default messages
    eventSource.onmessage = (event) => {
      console.log("SSE message:", event.data);
    };

    // Listen to "alert-resolved" events
    eventSource.addEventListener("alert-active", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("New alert:", data);
        setAlerts((prev) => [data, ...prev]); // prepend newest alert
      } catch (e) {
        console.error("Failed to parse SSE data", e);
      }
    });

    return () => eventSource.close(); // cleanup on unmount
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Test SSE Page</h1>
      <p>Status: <b>{connectionStatus}</b></p>

      {alerts.length === 0 ? (
        <p>No alerts yet.</p>
      ) : (
        <ul>
          {alerts.map((alert, idx) => (
            <li key={idx}>
              <b>{alert.alertID || alert._id || "Unknown ID"}</b> — Status: {alert.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
