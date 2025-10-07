import React, { useState } from "react";
import {
    App as AntApp,
    Button,
    Card,
    Form,
    Input,
    Typography,
    Flex,
    Grid,
    Select,
    Divider,
    Modal,
} from "antd";
import { UserOutlined, SafetyOutlined, TeamOutlined, CloseOutlined } from "@ant-design/icons";
import { api, saveToken } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { isAuthed, getUserType } from "../lib/api";
// Firebase client SDK (used to exchange server custom token for an ID token)
import { exchangeCustomTokenForIdToken } from '../lib/firebase';

// Initialize Firebase client using Vite env vars
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Use shared helper from src/lib/firebase.js
import Logo from "../assets/logo1.svg?react";

const { Option } = Select;

/* ---------- Background Carousel Layer ---------- */
function BackgroundCarouselLayer({
    slides,
    speed = 30,
    top = "20vh",
    opacity = 0.5,
    reverse = false,
}) {
    return (
        <div
            className="bg-carousel-layer"
            style={{
                top,
                transform: `rotate(-10deg) perspective(800px) rotateX(8deg)`,
                opacity,
            }}
        >
            <div
                className="bg-carousel-track"
                style={{
                    animation: `${reverse ? "slideLoopReverse" : "slideLoop"} ${speed}s linear infinite`,
                }}
            >
                {[...slides, ...slides].map((s, i) => (
                    <div key={i} className="bg-slide" style={{ background: s.color }}>
                        <span className="bg-slide__text">{s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---------- Multi-Layer Background Carousel ---------- */
function MultiBackgroundCarousel() {
    const slides = [
        { color: "#ffd1dc", label: "Support" },
        { color: "#ff9bb5", label: "Safety" },
        { color: "#ffc4d3", label: "Care" },
        { color: "#ffb3c4", label: "Hope" },
        { color: "#ff8fa8", label: "Trust" },
    ];

    return (
        <>
            <div className="bg-carousel">
                <BackgroundCarouselLayer slides={slides} speed={28} top="12vh" opacity={0.55} />
                <BackgroundCarouselLayer slides={slides} speed={34} top="28vh" opacity={0.5} reverse />
                <BackgroundCarouselLayer slides={slides} speed={40} top="44vh" opacity={0.45} />
                <BackgroundCarouselLayer slides={slides} speed={48} top="60vh" opacity={0.4} reverse />
                <BackgroundCarouselLayer slides={slides} speed={56} top="76vh" opacity={0.35} />
            </div>

            <style>{`
        .bg-carousel {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .bg-carousel-layer {
          position: absolute;
          left: -15vw;
          right: -15vw;
          height: clamp(160px, 24vh, 220px);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
        }

        .bg-carousel-track {
          display: flex;
          gap: 18px;
          will-change: transform;
        }

        .bg-slide {
          width: clamp(160px, 26vw, 300px);
          height: 100%;
          border-radius: 16px;
          box-shadow:
            inset 0 6px 12px rgba(255,255,255,0.35),
            inset 0 -8px 16px rgba(0,0,0,0.08),
            0 18px 28px rgba(233,30,99,0.12);
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.4s ease;
        }
        .bg-slide:hover { transform: scale(1.05); }

        .bg-slide__text {
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
          font-size: clamp(16px, 2.5vw, 24px);
          opacity: 0.45;
          user-select: none;
        }

        .bg-slide::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.18), transparent 60%);
        }

        @keyframes slideLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideLoopReverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        @media (max-width: 576px) {
          .bg-carousel-layer { opacity: 0.3; height: 120px; }
        }
        @media (max-width: 380px) {
          .bg-carousel { display: none; }
        }

        /* Login card animations */
        .login-card {
          animation: fadeInUp 0.8s ease both;
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
        </>
    );
}

/* ---------- Login Component ---------- */
export default function AdminLogin() {
    const { message } = AntApp.useApp();
    const navigate = useNavigate();
    // Redirect away if already authed
    React.useEffect(() => {
        if (isAuthed()) {
            const ut = getUserType();
            if (ut === "official") navigate("/admin/official-dashboard");
            else navigate("/admin");
        }
    }, []);
    const [loading, setLoading] = useState(false);
    const [userType, setUserType] = useState("official");
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState("");
    const screens = Grid.useBreakpoint();

    const maxWidth = screens.x2 ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
    const cardPadding = screens.md ? 24 : 16;

    const getUserTypeInfo = (type) => {
        switch (type) {
            case "admin": return { icon: <SafetyOutlined />, label: "Administrator", color: "#1890ff" };
            case "official": return { icon: <TeamOutlined />, label: "Barangay Official", color: "#52c41a" };
            default: return { icon: <UserOutlined />, label: "User", color: "#e91e63" };
        }
    };

    const getApiEndpoint = (type) => {
        switch (type) {
            case "admin": return "/api/admin/login";
            case "official": return "/api/officials/login";
            default: return "/api/victims/login";
        }
    };

    const formatLoginData = (values, type) => {
        switch (type) {
            case "admin": return { adminEmail: values.identifier, adminPassword: values.password };
            case "official": return { officialEmail: values.identifier, password: values.password };
            default: return values;
        }
    };

    const onFinish = async (values) => {
        try {
            setLoading(true);
            const endpoint = getApiEndpoint(userType);
            const loginData = formatLoginData(values, userType);
            const { data } = await api.post(endpoint, loginData);
            if (data.success) {
                if (data.data?.token) {
                    // Backend issues a Firebase custom token. Exchange it for an ID token so backend.verifyIdToken accepts it.
                    try {
                        const idToken = await exchangeCustomTokenForIdToken(data.data.token);
                        saveToken(idToken);
                    } catch (ex) {
                        // Exchange failed (likely missing/invalid Firebase client config). Fall back to saving the server token
                        // to avoid completely blocking login for non-protected flows, but note this may cause 401s on protected routes.
                        console.warn('Failed to exchange custom token for ID token:', ex);
                        saveToken(data.data.token);
                        message.warning('Logged in but Firebase client exchange failed. If protected requests fail, ensure VITE_FIREBASE_* are set and restart the dev server.');
                    }
                } else if (userType === "victim") {
                    saveToken("victim-test-token");
                }
                let userInfo = {};
                if (userType === "victim") userInfo = { ...data.data.victim, userType: "victim" };
                else if (userType === "admin") userInfo = { ...data.data.admin, userType: "admin" };
                else if (userType === "official") userInfo = { ...data.data.official, userType: "official" };

                localStorage.setItem("user", JSON.stringify(userInfo));
                localStorage.setItem("userType", userType);
                    try {
                        if (userInfo && userInfo.id) {
                            localStorage.setItem('actorId', String(userInfo.id));
                            localStorage.setItem('actorType', userType);
                        }
                    } catch (e) {
                        console.warn('Unable to persist actorId to localStorage', e && e.message);
                    }
                    try {
                        const businessId = userInfo?.adminID || userInfo?.officialID || userInfo?.victimID || null;
                        if (businessId) localStorage.setItem('actorBusinessId', String(businessId));
                    } catch (e) {
                        console.warn('Unable to persist actorBusinessId to localStorage', e && e.message);
                    }

                const userName =
                    userInfo.firstName || userInfo.victimUsername || userInfo.adminEmail || userInfo.officialEmail || "User";
                message.success(`Welcome back, ${userName}!`);

                if (userType === "official") navigate("/admin/official-dashboard");
                else navigate("/admin");
            } else {
                throw new Error(data.message || "Login failed");
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "Invalid username or password";
            message.error(msg);
            setErrorModalMessage(msg);
            setErrorModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const currentUserType = getUserTypeInfo(userType);

    return (
        <div style={{ position: "relative", minHeight: "100vh", width: "100%", backgroundColor: "#fff0f5" }}>
            <MultiBackgroundCarousel />

            <Flex align="center" justify="center" style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
                <Card
                    className="login-card"
                    style={{
                        width: "100%",
                        maxWidth,
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.25)",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                        padding: cardPadding,
                        backdropFilter: "blur(10px) saturate(150%)",
                        background: "rgba(255,255,255,0.65)",
                    }}
                    bodyStyle={{ padding: 0 }}
                >
                    <div style={{ padding: cardPadding }}>
                        <div style={{ textAlign: "center", marginBottom: -10, animation: "fadeInUp 1s ease both" }}>
                            <Logo style={{ width: "80px", color: currentUserType.color }} />
                        </div>
                        <Typography.Title
                            level={3}
                            style={{
                                marginBottom: 8,
                                textAlign: "center",
                                color: currentUserType.color,
                                lineHeight: 1.2,
                                animation: "fadeInUp 1.2s ease both",
                            }}
                        >
                            VAWCare Sign In
                        </Typography.Title>

                        <Typography.Paragraph
                            style={{
                                marginBottom: 24,
                                textAlign: "center",
                                color: "#555",
                                animation: "fadeInUp 1.4s ease both",
                            }}
                        >
                            Choose your account type and sign in to continue.
                        </Typography.Paragraph>

                        <Form layout="vertical" onFinish={onFinish} initialValues={{ identifier: "", password: "" }}>
                            <Form.Item name="userType" label="Account Type" initialValue="official">
                                <Select value={userType} onChange={setUserType} size={screens.md ? "large" : "middle</Option>"} style={{ width: "100%" }}>
                                    <Option value="admin">
                                        <SafetyOutlined style={{ marginRight: 8, color: "#1890ff" }} /> Administrator
                                    </Option>
                                    <Option value="official">
                                        <TeamOutlined style={{ marginRight: 8, color: "#52c41a" }} /> Barangay Official
                                    </Option>
                                </Select>
                            </Form.Item>

                            <Divider style={{ margin: "16px 0" }} />

                            <Form.Item
                                name="identifier"
                                label={userType === "victim" ? "Username or Email" : "Email Address"}
                                rules={[{ required: true, message: `Please enter your ${userType === "victim" ? "username or email" : "email address"}` }]}
                            >
                                <Input
                                    autoComplete={userType === 'victim' ? 'username' : 'email'}
                                    placeholder={userType === "victim" ? "Username or email" : "Email address"}
                                    size={screens.md ? "large" : "middle"}
                                />
                            </Form.Item>

                            <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please enter your password" }]}>
                                <Input.Password autoComplete="current-password" placeholder="••••••••" size={screens.md ? "large" : "middle"} />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                loading={loading}
                                size={screens.md ? "large" : "middle"}
                                style={{
                                    backgroundColor: currentUserType.color,
                                    borderColor: currentUserType.color,
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    transition: "all 0.3s ease",
                                }}
                                className="login-btn"
                            >
                                Sign in as {currentUserType.label}
                            </Button>

                            {userType === "victim" && (
                                <div style={{ marginTop: 12, textAlign: "center", animation: "fadeInUp 1.6s ease both" }}>
                                    <Typography.Text style={{ color: "#666" }}>
                                        No account?{" "}
                                        <Link style={{ color: "#e91e63" }} to="/signup">
                                            Create one
                                        </Link>
                                    </Typography.Text>
                                </div>
                            )}
                        </Form>
                    </div>

                    <Modal
                        title="Login Error"
                        open={errorModalVisible}
                        onOk={() => setErrorModalVisible(false)}
                        onCancel={() => setErrorModalVisible(false)}
                        okText="OK"
                    >
                        <Typography.Paragraph>{errorModalMessage}</Typography.Paragraph>
                    </Modal>
                </Card>
            </Flex>

            <Button
                onClick={() => navigate("/")}
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    color: "#555",
                    border: "1px solid #ddd",
                    width: 40,
                    height: 40,
                    zIndex: 9999, // ensures it's clickable above everything
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                    borderRadius: 6, // square with slightly rounded corners
                }}
            >
                <CloseOutlined style={{ fontSize: 20 }} />
            </Button>

        </div>
    );
}
