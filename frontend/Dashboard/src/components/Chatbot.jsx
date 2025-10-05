import React, { useState, useRef, useEffect} from "react";
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

  const reply = (userText) => {
    const t = userText.toLowerCase();

    // --- Emergency / Help ---
    if (t.includes("emergency") || t.includes("help") || t.includes("danger")) {
      return "If you are in immediate danger, please go to your nearest Barangay VAWC Desk or call the emergency hotline 911.";
    }

    // --- Reporting ---
    if (t.includes("report") || t.includes("complain")) {
      return "You can file a report by going to the Victim Dashboard and selecting 'File a New Report'. Barangay officials will review it and contact you.";
    }

    // --- Laws / Legal Info ---
    if (t.includes("law") || t.includes("9262") || t.includes("vawc")) {
      return "Republic Act 9262, or the Anti-Violence Against Women and Their Children Act, protects women and children from abuse—physical, emotional, sexual, or economic.";
    }

    if (t.includes("safe spaces") || t.includes("11313")) {
      return "Republic Act 11313, the Safe Spaces Act, ensures protection from gender-based harassment in public places and online.";
    }

    // --- Barangay / Help Desk ---
    if (t.includes("barangay") || t.includes("where") || t.includes("desk")) {
      return "Every barangay has a VAWC Desk where victims can seek help, counseling, and file protection orders. You can visit your barangay hall for assistance.";
    }

    // --- Greetings ---
    if (t.includes("hi") || t.includes("hello") || t.includes("good morning") || t.includes("good evening")) {
      return "Hello! I’m your VAWCare assistant. I can explain laws, help you understand your rights, or guide you on how to report a case.";
    }

    // --- Emotional Support ---
    if (t.includes("sad") || t.includes("scared") || t.includes("afraid") || t.includes("alone")) {
      return "I’m really sorry that you feel that way. Please remember — you are not alone, and help is available. You can reach out to your barangay VAWC desk anytime.";
    }

    // --- Default ---
    return `I understand: “${userText}”. I'm still learning — for now, please contact your barangay VAWC Desk if you need personal help.`;
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
