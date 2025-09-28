import React, { useState, useRef, useEffect } from "react";
import { FloatButton, Drawer, Input, Button, List, Avatar, Space, Typography, Tag } from "antd";
import { MessageOutlined, RobotOutlined, UserOutlined, SendOutlined } from "@ant-design/icons";

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

  const reply = (userText) => {
    const t = userText.toLowerCase();
    if (t.includes("help") || t.includes("emergency")) {
      return "If you’re in immediate danger, use the Emergency Button or call your local hotline.";
    }
    if (t.includes("report")) {
      return "You can file a report from the Victim Dashboard → 'File a New Report.'";
    }
    if (t.includes("hi") || t.includes("hello")) {
      return "Hello! What would you like to do today?";
    }
    return `I hear you: “${userText}”. (This is a demo bot—hook this up to your backend/LLM later.)`;
  };

  const send = () => {
    const userText = input.trim();
    if (!userText) return;

    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const bot = reply(userText);
      setMessages((m) => [...m, { role: "assistant", text: bot }]);
      setThinking(false);
    }, 600);
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
            gap: 8,
            padding: 12,
            borderTop: `1px solid ${BRAND.soft}`,
            background: "#fff",
          }}
        >
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
      </Drawer>
    </>
  );
}
