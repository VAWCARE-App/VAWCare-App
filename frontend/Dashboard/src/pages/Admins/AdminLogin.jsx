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
    notification,
    Space,
} from "antd";
import { 
    UserOutlined, 
    SafetyOutlined, 
    TeamOutlined, 
    CloseOutlined,
    ExclamationCircleOutlined,
    LockOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
    CloseCircleFilled,
} from "@ant-design/icons";
import { api, saveToken } from "../../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { isAuthed, getUserType, getUserData } from "../../lib/api";
// Firebase client SDK (used to exchange server custom token for an ID token)
import { exchangeCustomTokenForIdToken } from '../../lib/firebase';

// Initialize Firebase client using Vite env vars
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Use shared helper from src/lib/firebase.js
import Logo from "../../assets/logo1.svg?react";

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
function MultiBackgroundCarousel({ userType }) {
    const slidesByType = {
        admin: [
            { color: "#bae7ff", label: "Manage" },
            { color: "#91d5ff", label: "Control" },
            { color: "#69c0ff", label: "Secure" },
        ],
        official: [
            { color: "#d9f7be", label: "Serve" },
            { color: "#b7eb8f", label: "Support" },
            { color: "#95de64", label: "Protect" },
        ],
        victim: [
            { color: "#ffd6e7", label: "Care" },
            { color: "#ffadd2", label: "Hope" },
            { color: "#ff85c0", label: "Help" },
        ],
    };

    const slides = slidesByType[userType] || slidesByType["official"];

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
        /* Remove button outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        button:focus,
        button:active {
          outline: none !important;
          box-shadow: none !important;
        }

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
    
    // Configure notification API at component level
    const [notificationApi, contextHolder] = notification.useNotification();
    
    // Redirect away if already authed
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (isAuthed()) {
                    const ut = await getUserType();
                    if (!mounted) return;
                    if (ut === "official") return navigate("/admin/official-dashboard");
                    return navigate("/admin");
                }

                const userData = await getUserData();
                if (!mounted) return;
                if (userData) {
                    const role = userData.userType || userData.role || null;
                    if (role === 'official') return navigate('/admin/official-dashboard');
                    return navigate('/admin');
                }
            } catch (e) {
                console.debug('[AdminLogin] session restore failed', e && e.message);
            }
        })();
        return () => { mounted = false; };
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
            case "admin":
                return {
                    icon: <SafetyOutlined />,
                    label: "Administrator",
                    color: "#1890ff",
                    bg: "linear-gradient(135deg, #e6f7ff, #bae7ff)",
                };
            case "official":
                return {
                    icon: <TeamOutlined />,
                    label: "Barangay Official",
                    color: "#52c41a",
                    bg: "linear-gradient(135deg, #f6ffed, #d9f7be)",
                };
            default:
                return {
                    icon: <UserOutlined />,
                    label: "User",
                    color: "#e91e63",
                    bg: "linear-gradient(135deg, #fff0f5, #ffd6e7)",
                };
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
                // Exchange custom token for ID token
                const customToken = data.data.token;
                console.log('Received custom token, exchanging for ID token...');
                
                // Prepare user data to send to backend for secure storage
                let userInfo = {};
                if (userType === "victim") userInfo = { ...data.data.victim, userType: "victim" };
                else if (userType === "admin") userInfo = { ...data.data.admin, userType: "admin" };
                else if (userType === "official") userInfo = { ...data.data.official, userType: "official" };
                
                try {
                  const idToken = await exchangeCustomTokenForIdToken(customToken);
                  console.log('Successfully exchanged for ID token');
                  
                  // Send ID token AND user data to backend for secure HTTP-only cookie storage
                  // User data will be stored in a secure HTTP-only cookie (NOT accessible to JS)
                  await api.post('/api/auth/set-token', { idToken, userData: userInfo });
                  console.log('ID token and user data set in HTTP-only cookies');
                } catch (exchangeError) {
                  console.error('Token exchange failed:', exchangeError);
                  throw new Error('Authentication token exchange failed');
                }
                
                // Only store userType in sessionStorage (not sensitive data)
                // User data is now in secure HTTP-only cookie, inaccessible to JavaScript
                sessionStorage.setItem("userType", userType);
                try {
                    if (userInfo && userInfo.id) {
                        sessionStorage.setItem('actorId', String(userInfo.id));
                        sessionStorage.setItem('actorType', userType);
                    }
                } catch (e) {
                    console.warn('Unable to persist actorId to sessionStorage', e && e.message);
                }
                try {
                    const businessId = userInfo?.adminID || userInfo?.officialID || userInfo?.victimID || null;
                    if (businessId) sessionStorage.setItem('actorBusinessId', String(businessId));
                } catch (e) {
                    console.warn('Unable to persist actorBusinessId to sessionStorage', e && e.message);
                }

                const userName =
                    userInfo.firstName || userInfo.victimUsername || userInfo.adminEmail || userInfo.officialEmail || "User";
                
                notificationApi.success({
                    message: (
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
                            Welcome back, {userName}!
                        </span>
                    ),
                    description: (
                        <span style={{ fontSize: 13, color: '#666' }}>
                            You've successfully logged in. Redirecting to your dashboard...
                        </span>
                    ),
                    icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />,
                    placement: 'top',
                    duration: 3,
                    style: {
                        borderRadius: 16,
                        padding: '16px 20px',
                        boxShadow: '0 12px 32px rgba(82, 196, 26, 0.2), 0 4px 12px rgba(82, 196, 26, 0.12)',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f6ffed 100%)',
                        border: '1px solid rgba(82, 196, 26, 0.15)',
                    },
                    className: 'custom-notification-success',
                });

                if (userType === "official") navigate("/admin/official-dashboard");
                else navigate("/admin");
            } else {
                throw new Error(data.message || "Login failed");
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "Invalid credentials";
            
            // Determine if it's a credential error
            const isCredentialError = 
                String(msg).toLowerCase().includes('password') || 
                String(msg).toLowerCase().includes('invalid') ||
                String(msg).toLowerCase().includes('credential') ||
                String(msg).toLowerCase().includes('incorrect');
            
            notificationApi.error({
                message: (
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>
                        {isCredentialError ? '🔒 Authentication Failed' : '⚠️ Login Error'}
                    </span>
                ),
                description: (
                    <div style={{ fontSize: 13, color: '#666' }}>
                        <p style={{ margin: '4px 0', fontWeight: 500, color: '#ff4d4f' }}>{msg}</p>
                        {isCredentialError && (
                            <div style={{ marginTop: 12, padding: 10, background: '#fff1f0', borderRadius: 8, border: '1px solid #ffccc7' }}>
                                <div style={{ fontSize: 12, color: '#666', lineHeight: '1.6' }}>
                                    <strong>Tip:</strong> Make sure you're using the correct email and password.
                                </div>
                            </div>
                        )}
                    </div>
                ),
                icon: <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 24 }} />,
                placement: 'top',
                duration: 6,
                style: {
                    borderRadius: 16,
                    padding: '16px 20px',
                    boxShadow: '0 12px 32px rgba(255, 77, 79, 0.25), 0 4px 12px rgba(255, 77, 79, 0.15)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fff1f0 100%)',
                    border: '1px solid rgba(255, 77, 79, 0.2)',
                    backdropFilter: 'blur(10px)',
                },
                className: 'custom-notification-error',
            });
            
            // Update modal state but don't show it
            setErrorModalMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    const currentUserType = getUserTypeInfo(userType);

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                width: "100%",
                background: currentUserType.bg,
                transition: "background 0.5s ease",
            }}
        >
            {contextHolder}
            <MultiBackgroundCarousel userType={userType} />

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
                                    <Option value="official">
                                        <TeamOutlined style={{ marginRight: 8, color: "#52c41a" }} /> Barangay Official
                                    </Option>
                                    <Option value="admin">
                                        <SafetyOutlined style={{ marginRight: 8, color: "#1890ff" }} /> Administrator
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

                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => navigate("/")}
                        style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            fontSize: 18,
                            color: "#888",
                            background: "transparent",
                        }}
                    />

                </Card>
            </Flex>

            {/* Custom Notification Styles */}
            <style>{`
                @keyframes slideInDown {
                    from {
                        transform: translate3d(0, -100%, 0);
                        opacity: 0;
                    }
                    to {
                        transform: translate3d(0, 0, 0);
                        opacity: 1;
                    }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }

                .custom-notification-error,
                .custom-notification-success,
                .custom-notification-info {
                    animation: slideInDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards !important;
                }

                .custom-notification-error {
                    animation: slideInDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards,
                               shake 0.5s ease 0.3s !important;
                }

                .custom-notification-error .ant-notification-notice-message,
                .custom-notification-success .ant-notification-notice-message,
                .custom-notification-info .ant-notification-notice-message {
                    margin-bottom: 8px !important;
                }

                .custom-notification-error .ant-notification-notice-description,
                .custom-notification-success .ant-notification-notice-description,
                .custom-notification-info .ant-notification-notice-description {
                    margin-left: 0 !important;
                }

                .custom-notification-error .ant-notification-notice-icon,
                .custom-notification-success .ant-notification-notice-icon,
                .custom-notification-info .ant-notification-notice-icon {
                    margin-top: 2px !important;
                }

                /* Hover effect */
                .custom-notification-error:hover,
                .custom-notification-success:hover,
                .custom-notification-info:hover {
                    transform: translateY(-2px);
                    transition: transform 0.2s ease;
                }

                .custom-notification-error:hover {
                    box-shadow: 0 16px 40px rgba(255, 77, 79, 0.3), 0 6px 16px rgba(255, 77, 79, 0.2) !important;
                }

                .custom-notification-success:hover {
                    box-shadow: 0 16px 40px rgba(82, 196, 26, 0.25), 0 6px 16px rgba(82, 196, 26, 0.15) !important;
                }

                .custom-notification-info:hover {
                    box-shadow: 0 16px 40px rgba(24, 144, 255, 0.25), 0 6px 16px rgba(24, 144, 255, 0.15) !important;
                }
            `}</style>
        </div>
    );
}
