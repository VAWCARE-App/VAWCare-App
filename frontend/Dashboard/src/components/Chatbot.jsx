import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FloatButton,
  Drawer,
  Input,
  Button,
  List,
  Avatar,
  Space,
  Typography,
  Tag,
  Badge,
  Tooltip,
  Dropdown,
} from "antd";
import {
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  CopyOutlined,
  LikeOutlined,
  DislikeOutlined,
  DownOutlined,
} from "@ant-design/icons";
import logo from "../assets/logo1.png"; // ✅ your logo

const { Text } = Typography;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I’m your VAWCare assistant. How can I help you today?", id: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [unread, setUnread] = useState(0);
  const listBottomRef = useRef(null);
  const typewriterCancelRef = useRef({ cancel: false });

  const BRAND = useMemo(
    () => ({
      pink: "#e91e63",
      violet: "#7A5AF8",
      light: "#fff5f8",
      border: "rgba(122,90,248,0.18)",
    }),
    []
  );

  const API = import.meta.env.VITE_API_URL;

  const reply = async (userText) => {
    try {

      const res = await fetch(`${API}/api/chatbot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ send cookies automatically
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Chatbot backend error:", res.status, text);
        return "Sorry, I couldn't reach the chatbot service right now.";
      }

      const data = await res.json().catch(() => null);
      if (!data || !data.reply) return "Sorry, I didn’t get a proper response from the assistant.";
      return data.reply;
    } catch (err) {
      console.error("Chatbot error:", err);
      return "Sorry, something went wrong with the chatbot connection.";
    }
  };

  const typewriterReveal = async (fullText, onTick) => {
    typewriterCancelRef.current.cancel = false;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    let out = "";
    for (let i = 0; i < fullText.length; i++) {
      if (typewriterCancelRef.current.cancel) return;
      out += fullText[i];
      onTick(out);
      await delay(8 + Math.random() * 12);
    }
  };

  const handleCommand = async (cmd) => {
    if (cmd === "/clear") {
      setMessages([{ role: "assistant", text: "Chat cleared. How can I help next?", id: Date.now() }]);
      return true;
    }
    if (cmd === "/export") {
      const textBlob = new Blob(
        [
          messages
            .map((m) => (m.role === "user" ? "You: " : "Assistant: ") + m.text)
            .join("\n\n"),
        ],
        { type: "text/plain;charset=utf-8" }
      );
      const url = URL.createObjectURL(textBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vawcare-chat-${new Date().toISOString().slice(0, 19)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
    return false;
  };

  const send = async (prefill) => {
    const userText = (prefill ?? input).trim();
    if (!userText) return;

    if (userText.startsWith("/")) {
      const handled = await handleCommand(userText);
      if (handled) {
        setInput("");
        return;
      }
    }

    setMessages((m) => [...m, { role: "user", text: userText, id: Date.now() }]);
    setInput("");
    setThinking(true);

    const bot = await reply(userText);
    const msgId = Date.now() + 1;
    setMessages((m) => [...m, { role: "assistant", text: "", id: msgId, streaming: true }]);

    await typewriterReveal(bot, (partial) => {
      setMessages((m) => m.map((x) => (x.id === msgId ? { ...x, text: partial } : x)));
    });

    setMessages((m) => m.map((x) => (x.id === msgId ? { ...x, streaming: false } : x)));
    setThinking(false);

    if (!open) setUnread((u) => u + 1);
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

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // lock scroll behind drawer
  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPaddingRight = html.style.paddingRight;
    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      html.style.overflow = "hidden";
      if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      html.style.overflow = prevOverflow || "";
      html.style.paddingRight = prevPaddingRight || "";
    }
    return () => {
      html.style.overflow = prevOverflow || "";
      html.style.paddingRight = prevPaddingRight || "";
    };
  }, [open]);

  const suggestionItems = [
    { key: "vawc", icon: <QuestionCircleOutlined />, label: "What is VAWC?", onClick: () => send("What is VAWC?") },
    { key: "report", icon: <ThunderboltOutlined />, label: "How to report", onClick: () => send("How do I report a case?") },
    { key: "desk", icon: <InfoCircleOutlined />, label: "Barangay VAW Desk", onClick: () => send("Where is the Barangay VAW Desk?") },
    { key: "hotlines", icon: <PhoneOutlined />, label: "Hotlines", onClick: () => send("Emergency hotlines in the Philippines") },
    { key: "legal", icon: <BookOutlined />, label: "Legal resources (RA 9262)", onClick: () => send("Show resources for RA 9262") },

  ];

  const copyText = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch { }
  };

  return (
    <>
      <Badge count={unread} offset={[-6, 6]} color={BRAND.pink}>
        <FloatButton
          icon={<MessageOutlined />}
          shape="circle"
          type="primary"
          style={{
            right: 24,
            bottom: 24,
            background: BRAND.pink,
            boxShadow: "0 12px 28px rgba(233,30,99,.35)",
            animation: "vaw-pulse 1.8s infinite",
          }}
          onClick={() => setOpen(true)}
        />
      </Badge>

      <Drawer
        rootClassName="vaw-drawer"
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Avatar size={40} src={logo} alt="VAWCare" style={{ background: "#efeafd", boxShadow: "0 8px 20px rgba(122,90,248,0.15)" }} />
              <div>
                <div style={{ fontWeight: 800, color: BRAND.violet, fontSize: 17 }}>VAWCare Assistant</div>
                <div style={{ fontSize: 13, color: "#777" }}>
                  Helpful guidance • Not a substitute for emergency services
                </div>
              </div>
            </div>
            <Tag color="magenta" style={{ borderRadius: 12, fontWeight: 600 }}>
              Hotlines
            </Tag>
          </div>
        }
        placement="right"
        width={Math.min(window.innerWidth * 0.96, 460)} // ✅ wider drawer
        onClose={() => {
          setOpen(false);
          typewriterCancelRef.current.cancel = true;
        }}
        open={open}
        styles={{
          header: {
            background: "linear-gradient(90deg,#faf7ff,#fff)",
            borderBottom: `1px solid ${BRAND.border}`,
            padding: "12px 16px",
            position: "sticky",
            top: 0,
            zIndex: 2,
          },
          body: {
            padding: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="chat-scroll">
            <List
              dataSource={messages}
              renderItem={(m) => (
                <List.Item key={m.id} className={`row ${m.role}`}>
                  {m.role === "assistant" ? (
                    <Space align="start" size={8}>
                      <Avatar
                        icon={<RobotOutlined />}
                        style={{ background: BRAND.pink, color: "#fff", boxShadow: "0 10px 22px rgba(233,30,99,.25)" }}
                        size="small"
                      />
                      <div className={`bubble assistant ${m.streaming ? "streaming" : ""}`}>
                        <Text>{m.text}</Text>
                        <div className="actions">
                          <Tooltip title="Copy">
                            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyText(m.text)} />
                          </Tooltip>
                          <Tooltip title="Helpful">
                            <Button size="small" type="text" icon={<LikeOutlined />} />
                          </Tooltip>
                          <Tooltip title="Not helpful">
                            <Button size="small" type="text" icon={<DislikeOutlined />} />
                          </Tooltip>
                        </div>
                      </div>
                    </Space>
                  ) : (
                    <Space align="start" style={{ marginLeft: "auto" }} size={8}>
                      <div className="bubble user">
                        <Text>{m.text}</Text>
                      </div>
                      <Avatar icon={<UserOutlined />} style={{ background: "#9e9e9e", color: "#fff" }} size="small" />
                    </Space>
                  )}
                </List.Item>
              )}
            />

            {thinking && (
              <div className="typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
            <div ref={listBottomRef} />
          </div>

          <div className="composer">
            <div className="compose-toolbar">
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: suggestionItems.map(({ key, icon, label, onClick }) => ({ key, icon, label, onClick })),
                }}
              >
                <Button icon={<DownOutlined />}>Suggestions</Button>
              </Dropdown>
              <div className="hint">
                try <code>/clear</code> or <code>/export</code>
              </div>
            </div>

            <div className="compose-row">
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                autoSize={{ minRows: 1, maxRows: 4 }}
                placeholder="Type a message…"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => send()}
                style={{ background: BRAND.pink, borderColor: BRAND.pink }}
              >
                Send
              </Button>
            </div>

            <div className="disclaimer">
              <WarningOutlined /> This chatbot gives general information only. For urgent help, contact your barangay VAW Desk or dial <b>911</b>.
            </div>
          </div>
        </div>
      </Drawer>

      {/* Styles */}
      <style>{`
        @keyframes vaw-pulse {
          0% { transform: scale(1); box-shadow: 0 12px 28px rgba(233,30,99,.35); }
          70% { transform: scale(1.06); box-shadow: 0 18px 36px rgba(233,30,99,.45); }
          100% { transform: scale(1); box-shadow: 0 12px 28px rgba(233,30,99,.35); }
        }

        .vaw-drawer .ant-drawer-content,
        .vaw-drawer .ant-drawer-wrapper-body { overflow: hidden !important; }
        .vaw-drawer .ant-drawer-body { overflow: hidden !important; }

        .chat-scroll{
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 12px;
          background: #fff;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-gutter: stable;
        }

        .row{ border:none; padding: 6px 0; }
        .bubble{
          max-width: 88%;
          border-radius: 14px;
          padding: 10px 12px;
          box-shadow: 0 6px 16px rgba(0,0,0,.06);
          border: 1px solid ${BRAND.border};
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        .bubble.assistant{ background: ${BRAND.light}; }
        .bubble.user{ background: #f5f5f5; }
        .bubble.streaming{ outline: 1px dashed ${BRAND.pink}; outline-offset: 2px; }

        .typing{ display:flex; align-items:center; gap:6px; padding:6px 2px; margin-left:34px; }
        .typing .dot{ width:8px; height:8px; border-radius:50%; background:${BRAND.pink};
          animation: bounce 1s infinite ease-in-out; }
        .typing .dot:nth-child(2){ animation-delay:.15s; }
        .typing .dot:nth-child(3){ animation-delay:.3s; }
        @keyframes bounce{ 0%,80%,100%{transform:scale(.6);opacity:.5;}40%{transform:scale(1);opacity:1;} }

        .composer{ border-top:1px solid ${BRAND.border}; background:#fff; padding:10px 12px 12px; flex:0 0 auto; }
        .compose-toolbar{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
        .compose-toolbar .hint{ font-size:12px; color:#999; }
        .compose-row{ display:flex; gap:8px; align-items:flex-end; }
        .disclaimer{ text-align:center; font-size:12px; color:#777; padding-top:8px; }

        @media (max-width: 576px) {
          .bubble{ max-width: 92vw; }
        }
      `}</style>
    </>
  );
}