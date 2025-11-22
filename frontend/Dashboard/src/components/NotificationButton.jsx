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
  Avatar,
  Space,
  Empty,
  Tag,
} from "antd";
import { 
  BellOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  AlertOutlined,
  CloseOutlined,
  BellFilled,
} from "@ant-design/icons";
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

  // Calculate unread count whenever notifications change
  useEffect(() => {
    if (!drawerVisible) {
      const unreadCount = notifications.filter(n => n.read === false).length;
      setUnread(unreadCount);
    }
  }, [notifications, drawerVisible]);

  const getNotificationIcon = (type, typeRef) => {
    if (typeRef === 'Alert' || type === 'alert') return <AlertOutlined />;
    if (typeRef === 'Report') return <FileTextOutlined />;
    return <BellFilled />;
  };

  const showToast = (notif) => {
    const isAlert = notif.typeRef === 'Alert' || notif.type === 'alert';
    
    notifApi.open({
      message: (
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {notif.title || `New ${notif.typeRef || 'Notification'}`}
        </span>
      ),
      description: (
        <div style={{ fontSize: 13, color: '#595959' }}>
          {notif.message || 'You have a new notification'}
        </div>
      ),
      placement: "topRight",
      duration: 5,
      icon: getNotificationIcon(notif.type, notif.typeRef),
      style: {
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        background: '#fff',
      },
    });
  };

  // --- SSE listener ---
  useEffect(() => {
    const url = `${api}/api/sse/stream`;
    const es = new EventSourcePolyfill(url, { withCredentials: true, headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY } });

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
      if (payload.read === undefined) payload.read = false; // New SSE notifications are unread

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

    try {
      const res = await fetch(`${api}/api/notifications`, { credentials: "include", headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY } });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n._id || n.notificationID || n.alertID));
          const newNotifs = data.data
            .filter((n) => !existingIds.has(n._id || n.notificationID || n.alertID))
            .map(n => ({
              ...n,
              read: n.read !== undefined ? n.read : false // Preserve read status from API
            }));
          return [...prev, ...newNotifs];
        });
      }
      
      // Mark all as read when opening drawer
      await fetch(`${api}/api/notifications/mark-all-read`, { 
        method: "PUT", 
        credentials: "include",
        headers: {
          "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY
        }
      });
      
      // Update local state to mark all as read
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const closeDrawer = () => setDrawerVisible(false);

  const deleteNotification = async (id) => {
    try {
      await fetch(`${api}/api/notifications/${id}`, { method: "DELETE", credentials: "include", headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY } });
      setNotifications((prev) => prev.filter((n) => (n._id || n.notificationID) !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${api}/api/notifications/mark-all-read`, { 
        method: "PUT", 
        credentials: "include",
        headers: {
          "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY
        }
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const clearAll = async () => {
    try {
      await fetch(`${api}/api/notifications/clear-all`, { 
        method: "DELETE", 
        credentials: "include",
        headers: {
          "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY
        }
      });
      setNotifications([]);
      setUnread(0);
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  };

  const handleNotifClick = async (id) => {
    try {
      await fetch(`${api}/api/notifications/${id}/read`, { 
        method: "PUT", 
        credentials: "include",
        headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_API_KEY }
      });
      setNotifications((prev) => 
        prev.map((n) => 
          (n._id || n.notificationID || n.alertID) === id 
            ? { ...n, read: true } 
            : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  return (
    <>
      {contextHolder}
      
      {/* Modern Floating Notification Button */}
      {!drawerVisible && (
        <div style={{ 
          position: "fixed", 
          bottom: 24, 
          right: 24, 
          zIndex: 9999,
        }}>
          <Badge 
            count={unread} 
            overflowCount={99} 
            showZero={false}
            style={{
              animation: unread > 0 ? 'pulse 2s infinite' : 'none',
            }}
            styles={{
              indicator: {
                zIndex: 10,
                boxShadow: '0 0 0 2px #fff, 0 2px 8px rgba(255, 77, 79, 0.4)',
              }
            }}
          >
            <div style={{
              position: 'relative',
              width: 64,
              height: 64,
            }}>
              {/* Animated ring effect */}
              {unread > 0 && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    left: -4,
                    right: -4,
                    bottom: -4,
                    borderRadius: '50%',
                    background: '#7A5AF8',
                    opacity: 0.3,
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: '50%',
                    background: '#7A5AF8',
                    opacity: 0.5,
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s',
                  }} />
                </>
              )}
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={
                  unread > 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <BellFilled style={{ fontSize: 18, marginBottom: 2 }} />
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    </div>
                  ) : (
                    <BellFilled style={{ fontSize: 22 }} />
                  )
                }
                onClick={openDrawer}
                style={{
                  width: 64,
                  height: 64,
                  background: '#7A5AF8',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(122, 90, 248, 0.4), 0 4px 12px rgba(122, 90, 248, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  zIndex: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(122, 90, 248, 0.5), 0 6px 16px rgba(122, 90, 248, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(122, 90, 248, 0.4), 0 4px 12px rgba(122, 90, 248, 0.3)';
                }}
              />
            </div>
          </Badge>
        </div>
      )}

      {/* Modern Drawer */}
      <Drawer
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
          }}>
            <Space size={12}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7A5AF8 0%, #E91E63 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(122, 90, 248, 0.25)',
              }}>
                <BellFilled style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div>
                <Typography.Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>
                  Notifications
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {notifications.length} {notifications.length === 1 ? 'item' : 'items'}
                </Typography.Text>
              </div>
            </Space>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={closeDrawer}
              style={{ 
                borderRadius: 8,
                color: '#8c8c8c',
              }}
            />
          </div>
        }
        placement="right"
        width={440}
        onClose={closeDrawer}
        visible={drawerVisible}
        closable={false}
        bodyStyle={{
          padding: '20px',
          background: '#f5f5f5',
        }}
        headerStyle={{
          borderBottom: '1px solid #e8e8e8',
          background: '#fff',
          padding: '24px',
        }}
      >
        {/* Connection Status Badge */}
        <div style={{ 
          marginBottom: 16, 
          padding: '12px 16px', 
          background: '#fff',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connectionStatus === 'Connected' ? '#52c41a' : '#ff4d4f',
            boxShadow: connectionStatus === 'Connected' 
              ? '0 0 0 3px rgba(82, 196, 26, 0.12)' 
              : '0 0 0 3px rgba(255, 77, 79, 0.12)',
          }} />
          <Typography.Text style={{ fontSize: 13, fontWeight: 500, color: '#595959' }}>
            {connectionStatus}
          </Typography.Text>
        </div>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
            <Button
              size="middle"
              icon={<CheckCircleOutlined />}
              onClick={markAllRead}
              disabled={unread === 0}
              style={{
                flex: 1,
                borderRadius: 10,
                height: 40,
                fontWeight: 500,
                border: '1px solid #d9d9d9',
                background: '#fff',
              }}
            >
              Mark Read
            </Button>
            <Button
              danger
              size="middle"
              icon={<DeleteOutlined />}
              onClick={clearAll}
              style={{
                flex: 1,
                borderRadius: 10,
                height: 40,
                fontWeight: 500,
              }}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ padding: '40px 0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                  No notifications yet
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  You're all caught up! ✨
                </Typography.Text>
              </div>
            }
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(notif) => {
              const id = notif._id || notif.notificationID || notif.alertID;
              const notifIcon = getNotificationIcon(notif.type, notif.typeRef);
              const isUnread = !notif.read;

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
                  style={{
                    padding: '18px',
                    marginBottom: 12,
                    borderRadius: 12,
                    background: '#fff',
                    border: isUnread ? '2px solid #E91E63' : '1px solid #e8e8e8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => {
                    handleNotifClick(id);
                    window.location.href = link;
                  }}
                  actions={[
                    <Popconfirm
                      key="delete"
                      title="Delete this notification?"
                      onConfirm={(e) => {
                        e.stopPropagation();
                        deleteNotification(id);
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button 
                        type="text" 
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        style={{
                          color: '#bfbfbf',
                          borderRadius: 8,
                        }}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                      }}>
                        {notifIcon}
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography.Text 
                          strong 
                          style={{ 
                            fontSize: 14,
                            color: '#262626',
                          }}
                        >
                          {notif.typeRef || 'Notification'}
                        </Typography.Text>
                        {isUnread && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: '#1890ff',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            NEW
                          </span>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        <Typography.Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            margin: '6px 0',
                            fontSize: 13,
                            color: '#595959',
                            lineHeight: 1.6,
                          }}
                        >
                          {notif.message || `Type: ${notif.type}`}
                        </Typography.Paragraph>
                        <Typography.Text style={{ fontSize: 11, color: '#bfbfbf' }}>
                          {notif.timestamp || notif.createdAt
                            ? new Date(notif.timestamp || notif.createdAt).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })
                            : new Date().toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })
                          }
                        </Typography.Text>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Drawer>

      {/* Custom CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.8), 0 0 40px rgba(118, 75, 162, 0.6);
          }
        }
      `}</style>
    </>
  );
}
