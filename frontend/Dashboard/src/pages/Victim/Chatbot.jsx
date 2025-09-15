import React, { useEffect, useRef, useState } from "react";
import { Layout, Card, Typography, Input, Button, List, Avatar, Space, Tag } from "antd";
import { SendOutlined, RobotOutlined, UserOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I’m your VAWCare demo assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listBottomRef = useRef(null);
  const navigate = useNavigate();

  const BRAND = { pink: "#e91e63", soft: "#ffd1dc", light: "#fff5f8" };

  const reply = (userText) => {
    const t = userText.toLowerCase();
    if (t.includes("help") || t.includes("emergency")) {
      return "If you’re in immediate danger, use the Emergency Button or call your local hotline. I can also help file a report.";
    }
    if (t.includes("report")) {
      return "You can file a report from the Victim Dashboard → “File a New Report.” What incident type is it?";
    }
    if (t.includes("hi") || t.includes("hello")) {
      return "Hello! What would you like to do today?";
    }
    return `I hear you: “${userText}”. (This is a demo bot—hook this up to your backend/LLM later.)`;
  };

  const send = async () => {
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
    <Layout style={{ minHeight: "100vh", background: BRAND.light }}>
      <Header
        style={{
          background: `linear-gradient(180deg, ${BRAND.light} 0%, #ffffff 60%)`,
          borderBottom: `1px solid ${BRAND.soft}`,
          paddingInline: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Space align="center">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginRight: 8, color: BRAND.pink }}
          />
          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0, color: BRAND.pink }}>AI Chatbot</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>This is a mock chatbot for UI testing</Text>
          </Space>
        </Space>
      </Header>

      <Content style={{ padding: 16, display: "grid", placeItems: "center" }}>
        <Card
          style={{ width: "100%", maxWidth: 900, borderRadius: 14, borderColor: BRAND.soft }}
          bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "70vh" }}
        >
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fff" }}>
            <List
              dataSource={messages}
              renderItem={(m, idx) => (
                <List.Item key={idx} style={{ border: "none", padding: "8px 0" }}>
                  <Space align="start">
                    <Avatar
                      icon={m.role === "assistant" ? <RobotOutlined /> : <UserOutlined />}
                      style={{
                        background: m.role === "assistant" ? BRAND.pink : "#999",
                        color: "#fff"
                      }}
                      size="small"
                    />
                    <div
                      style={{
                        maxWidth: 640,
                        background: m.role === "assistant" ? BRAND.light : "#f5f5f5",
                        border: `1px solid ${BRAND.soft}`,
                        borderRadius: 10,
                        padding: "8px 10px"
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
        </Card>
      </Content>
    </Layout>
  );
}
