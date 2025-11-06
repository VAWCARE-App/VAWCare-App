// src/pages/NotificationButton.jsx
import { useEffect, useState, useRef } from "react";
import {
  Button,
  Drawer,
  List,
  Typography,
  Badge,
  Popconfirm,
  notification as antdNotification,
} from "antd";
import { BellOutlined, DeleteOutlined } from "@ant-design/icons";
import { EventSourcePolyfill } from "event-source-polyfill";

export default function NotificationButton() {
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [unread, setUnread] = useState(0);

  const drawerVisibleRef = useRef(drawerVisible);
  drawerVisibleRef.current = drawerVisible;

  const api = import.meta.env.VITE_API_URL || "";

  // --- AntD notification hook ---
  const [notifApi, contextHolder] = antdNotification.useNotification();

  const showToast = (notif) => {
    notifApi.open({
      message: notif.title || `${notif.type} received`,
      description: notif.message || "",
      placement: "topRight",
      duration: 5,
      icon: <BellOutlined style={{ color: "#108ee9" }} />,
    });
  };

  // --- SSE listener ---
  useEffect(() => {
    const url = `${api}/api/sse/stream`;
    const es = new EventSourcePolyfill(url, { withCredentials: true });

    es.onopen = () => setConnectionStatus("Connected");
    es.onerror = (err) => {
      console.error("[SSE] error", err);
      setConnectionStatus("Disconnected");
      try { es.close(); } catch (_) { }
    };

    const handleEvent = (event) => {
      let payload;

      try {
        payload = JSON.parse(event.data); // parse JSON payload
      } catch {
        // fallback for string messages
        payload = {
          _id: `temp-${Date.now()}`,
          type: "Notification",
          title: event.data,
          message: "",
        };
      }

      // ensure required fields exist
      if (!payload._id) payload._id = payload.notificationID || payload.alertID || `temp-${Date.now()}`;
      if (!payload.type) payload.type = "Notification";

      // prepend notification if not a duplicate
      setNotifications((prev) => {
        if (prev.some((n) => (n._id || n.notificationID || n.alertID) === payload._id)) return prev;
        return [payload, ...prev];
      });

      // show toast if drawer is closed
      if (!drawerVisibleRef.current) {
        setUnread((u) => u + 1);
        showToast(payload);
      }
    };

    // register events from backend
    ["new-notif", "alert-active", "report-created", "message"].forEach((evt) =>
      es.addEventListener(evt, handleEvent)
    );
    es.onmessage = handleEvent;

    return () => {
      ["new-notif", "alert-active", "report-created", "message"].forEach((evt) =>
        es.removeEventListener(evt, handleEvent)
      );
      try { es.close(); } catch (_) { }
    };
  }, [api]);

  // --- Drawer functions ---
  const openDrawer = async () => {
    setDrawerVisible(true);
    setUnread(0);

    try {
      const res = await fetch(`${api}/api/notifications`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n._id || n.notificationID || n.alertID));
          const newNotifs = data.data.filter((n) => !existingIds.has(n._id || n.notificationID || n.alertID));
          return [...prev, ...newNotifs];
        });
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const closeDrawer = () => setDrawerVisible(false);

  const deleteNotification = async (id) => {
    try {
      await fetch(`${api}/api/notifications/${id}`, { method: "DELETE", credentials: "include" });
      setNotifications((prev) => prev.filter((n) => (n._id || n.notificationID) !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  return (
    <>
      {contextHolder} {/* must include hook's context holder */}
      {!drawerVisible && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
          <Badge count={unread} overflowCount={99} showZero={false}>
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
        title={`Notifications (${notifications.length})`}
        placement="right"
        width={360}
        onClose={closeDrawer}
        visible={drawerVisible}
      >
        <p>Status: <b>{connectionStatus}</b></p>

        {notifications.length === 0 ? (
          <Typography.Text>No notifications.</Typography.Text>
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notif) => {
              const id = notif._id || notif.notificationID || notif.alertID;

              // Determine link based on typeRef or type
              let link = "/";
              switch (notif.typeRef) {
                case "Report":
                  link = `/admin/reports`;
                  break;
                case "Alert":
                  link = `/admin/alerts`;
                  break;
                // add more types here
                default:
                  link = `/admin`;
                  break;
              }

              return (
                <List.Item
                  key={id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    window.location.href = link; // or use react-router navigate(link)
                  }}
                  actions={[
                    <Popconfirm
                      title="Delete this notification?"
                      onConfirm={(e) => {
                        e.stopPropagation(); // prevent navigation
                        deleteNotification(id);
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<b>New {notif.typeRef || id}</b>}
                    description={`${notif.message || ""} — Type: ${notif.type}`}
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
