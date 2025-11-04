// src/pages/Test.jsx
import { useEffect, useState } from "react";
import { Button, Drawer, List, Typography, Badge, Popconfirm } from "antd";
import { BellOutlined, DeleteOutlined } from "@ant-design/icons";

export default function NotificationButton() {
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [drawerVisible, setDrawerVisible] = useState(false);

  const api = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const url = `${api}/api/sse/stream`;
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onopen = () => setConnectionStatus("Connected");
    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setConnectionStatus("Disconnected");
      eventSource.close();
    };

    eventSource.addEventListener("alert-active", (event) => {
      try {
        const data = JSON.parse(event.data);
        setAlerts((prev) => [data, ...prev]);
      } catch (e) {
        console.error("Failed to parse SSE data", e);
      }
    });

    return () => eventSource.close();
  }, []);

  const openDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const deleteAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => (a.alertID || a._id) !== id));
  };

  return (
    <>
      {/* Floating button only shows when drawer is closed */}
      {!drawerVisible && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
          <Badge count={alerts.length} overflowCount={99} showZero={false} offset={[0, 0]}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<BellOutlined />}
              onClick={openDrawer}
            />
          </Badge>
        </div>
      )}

      <Drawer
        title={`Active Alerts (${alerts.length})`}
        placement="right"
        width={360}
        onClose={closeDrawer}
        visible={drawerVisible}
      >
        <p>Status: <b>{connectionStatus}</b></p>

        {alerts.length === 0 ? (
          <Typography.Text>No active alerts.</Typography.Text>
        ) : (
          <List
            dataSource={alerts}
            renderItem={(alert) => {
              const id = alert.alertID || alert._id;
              return (
                <List.Item
                  key={id}
                  actions={[
                    <Popconfirm
                      title="Delete this alert?"
                      onConfirm={() => deleteAlert(id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<b>{id}</b>}
                    description={`Type: ${alert.type || "Unknown"} — Status: ${alert.status}`}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Drawer>
    </>
  );
}
