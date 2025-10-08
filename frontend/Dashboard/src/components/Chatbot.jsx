import React, { useState, useRef, useEffect } from "react";
import { FloatButton, Drawer, Input, Button, List, Avatar, Space, Typography, Tag } from "antd";
import { MessageOutlined, RobotOutlined, UserOutlined, SendOutlined, WarningOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I’m your VAWCare assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listBottomRef = useRef(null);

  const BRAND = { pink: "#e91e63", soft: "#ffd1dc", light: "#fff5f8" };

  // --- Replace the current reply() with this ---
  const reply = async (userText) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ message: userText }),
      });

      // ✅ If response is not OK, log it
      if (!res.ok) {
        const text = await res.text();
        console.error("Chatbot backend error:", res.status, text);
        return "Sorry, I couldn't reach the chatbot service right now.";
      }

      // ✅ Safely parse JSON
      const data = await res.json().catch(() => null);
      if (!data || !data.reply) return "Sorry, I didn’t get a proper response from the assistant.";

      return data.reply;
    } catch (err) {
      console.error("Chatbot error:", err);
      return "Sorry, something went wrong with the chatbot connection.";
    }
  };



  const send = async () => {
    const userText = input.trim();
    if (!userText) return;

    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setThinking(true);

    const bot = await reply(userText); // <--- now async call to backend
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
      {/* Floating button */}
      <FloatButton
        icon={<MessageOutlined />}
        shape="circle"
        type="primary"
        style={{
          right: 24,
          bottom: 24,
          background: BRAND.pink,
        }}
        onClick={() => setOpen(true)}
      />

      {/* Drawer for chat */}
      <Drawer
        title="VAWCare Chatbot"
        placement="right"
        width={Math.min(window.innerWidth * 0.9, 380)} // responsive
        onClose={() => setOpen(false)}
        open={open}
        bodyStyle={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12, background: "#fff" }}>
          <List
            dataSource={messages}
            renderItem={(m, idx) => (
              <List.Item key={idx} style={{ border: "none", padding: "6px 0" }}>
                <Space align="start">
                  <Avatar
                    icon={m.role === "assistant" ? <RobotOutlined /> : <UserOutlined />}
                    style={{
                      background: m.role === "assistant" ? BRAND.pink : "#999",
                      color: "#fff",
                    }}
                    size="small"
                  />
                  <div
                    style={{
                      maxWidth: 260,
                      background: m.role === "assistant" ? BRAND.light : "#f5f5f5",
                      border: `1px solid ${BRAND.soft}`,
                      borderRadius: 10,
                      padding: "6px 10px",
                    }}
                  >
                    <Text>{m.text}</Text>
                  </div>
                </Space>
              </List.Item>
            )}
          />
          {thinking && (
            <div style={{ padding: 8 }}>
              <Tag color="magenta">Assistant is typing…</Tag>
            </div>
          )}
          <div ref={listBottomRef} />
        </div>

        {/* Composer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            borderTop: `1px solid ${BRAND.soft}`,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {["What is VAWC?", "How to report?", "Barangay help desk", "Safe Spaces Act", "Emergency"].map((q) => (
              <Button
                key={q}
                size="small"
                onClick={() => {
                  setInput(q);
                  setTimeout(() => send(), 200);
                }}
              >
                {q}
              </Button>
            ))}
          </div>

          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoSize={{ minRows: 1, maxRows: 4 }}
            placeholder="Type a message..."
          />
          <Button type="primary" icon={<SendOutlined />} onClick={send}>
            Send
          </Button>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "#888", paddingBottom: 8 }}>
          <WarningOutlined /> This chatbot gives general information only. For urgent help, contact your barangay VAWC desk or 911.
        </div>
      </Drawer>
    </>
  );
}
