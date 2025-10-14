import React, { useState, useRef, useEffect } from "react";
import {
  FloatButton, Drawer, Input, Button, List, Avatar, Space, Typography, Tag,
} from "antd";
import {
  MessageOutlined, RobotOutlined, UserOutlined, SendOutlined, WarningOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I’m your VAWCare assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listBottomRef = useRef(null);

  const BRAND = { pink: "#e91e63", soft: "#ffd1dc", light: "#fff5f8" };
  const API = import.meta.env.VITE_API_URL;

  // ✅ DEV fallback (no auth) – requires /api/chatbot/open-message on backend
  async function replyViaOpenRoute(userText) {
    const res = await fetch(`${API}/api/chatbot/open-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });
    if (!res.ok) return `Chatbot error (HTTP ${res.status}).`;
    const data = await res.json();
    return data?.reply ?? "No response";
  }

  const reply = async (userText) => {
    try {
      const token = localStorage.getItem("token");

      // If no token, try open route immediately (dev convenience)
      if (!token) {
        console.warn("No auth token found. Using open route (dev).");
        return await replyViaOpenRoute(userText);
      }

      // Try the protected route first
      const res = await fetch(`${API}/api/chatbot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("Chatbot backend error:", res.status, body);

        // If unauthorized/forbidden, retry with open route (dev)
        if (res.status === 401 || res.status === 403) {
          console.warn("Unauthorized; retrying open route (dev).");
          return await replyViaOpenRoute(userText);
        }
        return `Chatbot error (HTTP ${res.status}). Try again later.`;
      }

      const data = await res.json().catch(() => null);
      if (!data || !data.reply) return "Sorry, I didn’t get a proper response from the assistant.";
      return data.reply;
    } catch (err) {
      console.error("Chatbot error:", err);
      // Final fallback to open route if fetch blew up (CORS/network/etc.)
      try {
        return await replyViaOpenRoute(userText);
      } catch {
        return "Sorry, something went wrong with the chatbot connection.";
      }
    }
  };

  const send = async () => {
    const userText = input.trim();
    if (!userText) return;
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setThinking(true);
    const bot = await reply(userText);
    setMessages((m) => [...m, { role: "assistant", text: bot }]);
    setThinking(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  useEffect(() => {
    listBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />} shape="circle" type="primary"
        style={{ right: 24, bottom: 24, background: BRAND.pink }}
        onClick={() => setOpen(true)}
      />

      <Drawer
        title="VAWCare Chatbot" placement="right" width={Math.min(window.innerWidth * 0.9, 380)}
        onClose={() => setOpen(false)} open={open}
        bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: 12, background: "#fff" }}>
          <List
            dataSource={messages}
            renderItem={(m, idx) => (
              <List.Item
                key={idx}
                style={{ border: "none", padding: "6px 0", display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
              >
                {m.role === "assistant" ? (
                  <Space align="start">
                    <Avatar icon={<RobotOutlined />} style={{ background: BRAND.pink, color: "#fff" }} size="small" />
                    <div style={{
                      maxWidth: 260, background: BRAND.light, border: `1px solid ${BRAND.soft}`,
                      borderRadius: 10, padding: "6px 10px", whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      <Text>{m.text}</Text>
                    </div>
                  </Space>
                ) : (
                  <Space align="start" style={{ flexDirection: "row-reverse" }}>
                    <Avatar icon={<UserOutlined />} style={{ background: "#999", color: "#fff" }} size="small" />
                    <div style={{
                      maxWidth: 260, background: "#F5F5F5", border: "1px solid darkgray",
                      borderRadius: 10, padding: "6px 10px", whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      <Text>{m.text}</Text>
                    </div>
                  </Space>
                )}
              </List.Item>
            )}
          />
          {thinking && <div style={{ padding: 8 }}><Tag color="magenta">Assistant is typing…</Tag></div>}
          <div ref={listBottomRef} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12,
          borderTop: `1px solid ${BRAND.soft}`, background: "#fff" }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {["What is VAWC?", "How to report?", "Barangay help desk", "Safe Spaces Act", "Emergency"].map((q) => (
              <Button key={q} size="small" onClick={() => { setInput(q); setTimeout(() => send(), 200); }}>
                {q}
              </Button>
            ))}
          </div>

          <Input.TextArea
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
            autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Type a message..."
          />
          <Button type="primary" icon={<SendOutlined />} onClick={send}
            style={{ background: BRAND.pink, borderColor: BRAND.pink }}>
            Send
          </Button>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#888", paddingBottom: 8 }}>
          <WarningOutlined /> This chatbot gives general information only. For urgent help, contact your barangay VAWC
          desk or 911.
        </div>
      </Drawer>
    </>
  );
}
